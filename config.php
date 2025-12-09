<?php
// Database configuration - Use environment variables in production
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'bookmark_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Session configuration
define('SESSION_LIFETIME', 3600 * 24 * 7); // 7 days
define('SESSION_TIMEOUT', 3600 * 2); // 2 hours of inactivity

// Security configuration
define('ALLOWED_ORIGINS', ['http://169.239.251.102:341', 'http://localhost', 'http://127.0.0.1']);
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/media/');
define('ALLOWED_MEDIA_TYPES', ['audio/mpeg', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime']);
define('ALLOWED_MEDIA_EXTENSIONS', ['mp3', 'wav', 'webm', 'mp4', 'mov', 'avi', 'm4a', 'flac']);
define('CSRF_TOKEN_LENGTH', 32);

// Set secure headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Function to set CORS headers securely
function setCORSHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    // Allow chrome extension origins (they start with chrome-extension://)
    if (in_array($origin, ALLOWED_ORIGINS) || strpos($origin, 'chrome-extension://') === 0) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-User-ID, X-User-Email, X-CSRF-Token');
    header('Access-Control-Max-Age: 86400');
}

// Start session with security settings
if (session_status() === PHP_SESSION_NONE) {
    // Configure session security
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
    ini_set('session.cookie_samesite', 'Strict');
    
    session_start();
    
    // Regenerate session ID periodically to prevent session fixation
    if (!isset($_SESSION['created'])) {
        $_SESSION['created'] = time();
    } else if (time() - $_SESSION['created'] > 1800) { // 30 minutes
        session_regenerate_id(true);
        $_SESSION['created'] = time();
    }
    
    // Check session timeout
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT)) {
        session_unset();
        session_destroy();
        session_start();
    }
    $_SESSION['last_activity'] = time();
}

// Database connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            die("Database connection failed. Please check your configuration.");
        }
    }
    return $pdo;
}

// Check if user is logged in
function isLoggedIn() {
    // Check session variables exist
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['username'])) {
        return false;
    }
    
    // Verify user still exists in database
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND username = ?");
        $stmt->execute([$_SESSION['user_id'], $_SESSION['username']]);
        if (!$stmt->fetch()) {
            // User doesn't exist, destroy session
            session_unset();
            session_destroy();
            return false;
        }
    } catch (Exception $e) {
        error_log("Error checking user: " . $e->getMessage());
        return false;
    }
    
    return true;
}

// Get current user ID
function getUserId() {
    return $_SESSION['user_id'] ?? null;
}

// JSON response helper
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Error response helper
function jsonError($message, $statusCode = 400) {
    jsonResponse(['error' => $message], $statusCode);
}

// Success response helper
function jsonSuccess($data = null, $message = null) {
    $response = ['success' => true];
    if ($message) $response['message'] = $message;
    if ($data !== null) $response['data'] = $data;
    jsonResponse($response);
}

// Generate CSRF token
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(CSRF_TOKEN_LENGTH / 2));
    }
    return $_SESSION['csrf_token'];
}

// Verify CSRF token
function verifyCSRFToken($token = null) {
    if (empty($_SESSION['csrf_token'])) {
        return false;
    }
    $token = $token ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '');
    return hash_equals($_SESSION['csrf_token'], $token);
}

// Sanitize file upload name
function sanitizeFileName($filename) {
    $filename = basename($filename);
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    return time() . '_' . substr(md5(uniqid()), 0, 8) . '.' . $ext;
}

// Validate media upload
function validateMediaUpload($file, $type) {
    if (!isset($file['tmp_name']) || !isset($file['type']) || !isset($file['size'])) {
        return ['valid' => false, 'error' => 'Invalid file upload'];
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        return ['valid' => false, 'error' => 'File too large (max ' . (MAX_FILE_SIZE / 1024 / 1024) . 'MB)'];
    }
    
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_MEDIA_EXTENSIONS)) {
        return ['valid' => false, 'error' => 'File type not allowed'];
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mime, ALLOWED_MEDIA_TYPES)) {
        return ['valid' => false, 'error' => 'Invalid file MIME type'];
    }
    
    if ($type === 'audio' && strpos($mime, 'audio') === false) {
        return ['valid' => false, 'error' => 'File is not audio'];
    }
    if ($type === 'video' && strpos($mime, 'video') === false) {
        return ['valid' => false, 'error' => 'File is not video'];
    }
    
    return ['valid' => true];
}

// Handle media file upload
function uploadMediaFile($file, $userId, $type) {
    $validation = validateMediaUpload($file, $type);
    if (!$validation['valid']) {
        return $validation;
    }
    
    if (!is_dir(UPLOAD_DIR)) {
        if (!mkdir(UPLOAD_DIR, 0755, true)) {
            return ['valid' => false, 'error' => 'Failed to create upload directory'];
        }
    }
    
    $filename = sanitizeFileName($file['name']);
    $filepath = UPLOAD_DIR . $userId . '_' . $filename;
    $relativePath = 'uploads/media/' . $userId . '_' . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        return ['valid' => false, 'error' => 'Failed to save file'];
    }
    
    return ['valid' => true, 'path' => $relativePath, 'url' => basename($relativePath)];
}

