<?php
require_once '../config.php';

header('Content-Type: application/json');
setCORSHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// CSRF verification for state-changing requests (skip for signup/login with email)
// These endpoints don't need CSRF since they require valid email + password
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $action = $_GET['action'] ?? '';
    // Skip CSRF for signup and login (email/password is sufficient protection)
    if (!in_array($action, ['signup', 'login']) && !isset($_SERVER['HTTP_X_USER_ID'])) {
        if (!verifyCSRFToken()) {
            jsonError('Invalid CSRF token', 403);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'signup':
            if ($method !== 'POST') {
                jsonError('Method not allowed', 405);
            }
            handleSignup();
            break;
            
        case 'login':
            if ($method !== 'POST') {
                jsonError('Method not allowed', 405);
            }
            handleLogin();
            break;
            
        case 'logout':
            if ($method !== 'POST') {
                jsonError('Method not allowed', 405);
            }
            handleLogout();
            break;
            
        case 'check':
            handleCheckAuth();
            break;
            
        case 'csrf-token':
            // Return CSRF token for authenticated users
            if (!isLoggedIn()) {
                jsonError('Not authenticated', 401);
            }
            jsonSuccess(['token' => generateCSRFToken()]);
            break;
            
        default:
            jsonError('Invalid action', 400);
    }
} catch (Exception $e) {
    error_log("Auth error: " . $e->getMessage());
    jsonError('Server error', 500);
}

function handleSignup() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';
    
    // Validation
    if (empty($username) || empty($email) || empty($password)) {
        jsonError('All fields are required');
    }
    
    if (strlen($username) < 3 || strlen($username) > 50) {
        jsonError('Username must be between 3 and 50 characters');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Invalid email format');
    }
    
    if (strlen($password) < 8) {
        jsonError('Password must be at least 8 characters long');
    }
    
    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        jsonError('Password must contain at least one special character');
    }
    
    if ($password !== $confirmPassword) {
        jsonError('Passwords do not match');
    }
    
    $db = getDB();
    
    // Check if username or email already exists
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute([$username, $email]);
    if ($stmt->fetch()) {
        jsonError('Username or email already exists');
    }
    
    // Create user
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$username, $email, $passwordHash]);
    
    $userId = $db->lastInsertId();
    
    // Create default collections
    $defaultCollections = ['Unsorted'];
    foreach ($defaultCollections as $collectionName) {
        $stmt = $db->prepare("INSERT INTO collections (user_id, name) VALUES (?, ?)");
        $stmt->execute([$userId, $collectionName]);
    }
    
    // Set session
    $_SESSION['user_id'] = $userId;
    $_SESSION['username'] = $username;
    $_SESSION['email'] = $email;
    
    jsonSuccess([
        'user_id' => $userId,
        'username' => $username,
        'email' => $email
    ], 'Account created successfully');
}

function handleLogin() {
    // Prevent login if already logged in (for web app)
    if (isLoggedIn() && !isset($_SERVER['HTTP_X_USER_ID'])) {
        jsonError('Already logged in', 400);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonError('Email and password are required');
    }
    
    // Rate limiting: prevent brute force (simple check)
    $loginAttempts = $_SESSION['login_attempts'] ?? 0;
    $lastAttempt = $_SESSION['last_login_attempt'] ?? 0;
    
    if ($loginAttempts >= 5 && (time() - $lastAttempt) < 300) { // 5 attempts, 5 min lockout
        jsonError('Too many login attempts. Please try again in 5 minutes.', 429);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, username, email, password_hash FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        $_SESSION['login_attempts'] = $loginAttempts + 1;
        $_SESSION['last_login_attempt'] = time();
        jsonError('Invalid email or password', 401);
    }
    
    // Reset login attempts on successful login
    unset($_SESSION['login_attempts']);
    unset($_SESSION['last_login_attempt']);
    
    // Regenerate session ID on login for security
    session_regenerate_id(true);
    
    // Set session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['created'] = time();
    $_SESSION['last_activity'] = time();
    
    // Generate API token for extension (simple hash of user_id + email + timestamp)
    $token = hash('sha256', $user['id'] . $user['email'] . time() . 'bookmark_secret');
    
    jsonSuccess([
        'user_id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'token' => $token
    ], 'Login successful');
}

function handleLogout() {
    // Clear all session data
    $_SESSION = array();
    
    // Get the session cookie name
    $cookieName = session_name();
    
    // Destroy the session first
    session_destroy();
    
    // Then delete the session cookie with proper parameters to ensure it's removed on client side
    if (isset($_COOKIE[$cookieName])) {
        setcookie($cookieName, '', array(
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Strict'
        ));
    }
    
    // Add cache prevention headers
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    jsonSuccess(null, 'Logged out successfully');
}


function handleCheckAuth() {
    if (isLoggedIn()) {
        jsonSuccess([
            'user_id' => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'email' => $_SESSION['email']
        ]);
    } else {
        jsonError('Not authenticated', 401);
    }
}

