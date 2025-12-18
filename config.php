<?php
// Database configuration - Use environment variables in production
// Default to local MySQL (adjust DB_* env vars on the server if different)
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'bookmark_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

// Security configuration
define('ALLOWED_ORIGINS', ['http://169.239.251.102:341', 'http://localhost', 'http://127.0.0.1']);
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
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed. Please check your configuration.'
            ]);
            exit;
        }
    }
    return $pdo;
}

// Authenticate a user based on explicit headers (stateless)
function authenticateUserFromHeaders() {
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;
    $email = $_SERVER['HTTP_X_USER_EMAIL'] ?? $_GET['user_email'] ?? null;

    if (!$userId || !$email) {
        return null;
    }

    $userId = (int)$userId;
    if ($userId <= 0) {
        return null;
    }

    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND email = ? LIMIT 1");
        $stmt->execute([$userId, $email]);
        $row = $stmt->fetch();
        return $row ? $userId : null;
    } catch (Exception $e) {
        error_log('Header auth failed: ' . $e->getMessage());
        return null;
    }
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

