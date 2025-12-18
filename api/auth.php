<?php
require_once '../config.php';

header('Content-Type: application/json');
setCORSHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
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
        
        case 'user':
            // Get current user info
            handleGetUser();
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
    
    // Signup Validation
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
    
    jsonSuccess([
        'user_id' => $userId,
        'username' => $username,
        'email' => $email
    ], 'Account created successfully');
}

function handleLogin() {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonError('Email and password are required');
    }
    
    // Rate limiting: check cookies for login attempts (stored in persistent cookie)
    $loginAttempts = isset($_COOKIE['login_attempts']) ? (int)$_COOKIE['login_attempts'] : 0;
    $lastAttempt = isset($_COOKIE['last_login_attempt']) ? (int)$_COOKIE['last_login_attempt'] : 0;
    
    if ($loginAttempts >= 5 && (time() - $lastAttempt) < 300) { // 5 attempts, 5 min lockout
        jsonError('Too many login attempts. Please try again in 5 minutes.', 429);
    }
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id, username, email, password_hash FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Update login attempt cookie
        setcookie('login_attempts', $loginAttempts + 1, [
            'expires' => time() + 300,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        setcookie('last_login_attempt', time(), [
            'expires' => time() + 300,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        jsonError('Invalid email or password', 401);
    }
    
    // Reset login attempt cookies on successful login
    setcookie('login_attempts', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    setcookie('last_login_attempt', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    
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
    // Add cache prevention headers
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    jsonSuccess(null, 'Logged out successfully');
}


function handleCheckAuth() {
    $userId = authenticateUserFromHeaders();
    if (!$userId) {
        jsonError('Not authenticated', 401);
    }

    jsonSuccess([
        'authenticated' => true,
        'user_id' => $userId,
        'message' => 'Header authentication valid'
    ]);
}

function handleGetUser() {
    // Get user info from database or request headers
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
    
    if (!$userId) {
        jsonError('User information not available', 400);
    }
    
    $userId = (int)$userId;
    
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, username, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonError('User not found', 404);
        }
        
        jsonSuccess($user);
    } catch (Exception $e) {
        error_log("Error fetching user: " . $e->getMessage());
        jsonError('Failed to fetch user information', 500);
    }
}
