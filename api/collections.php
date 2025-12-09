<?php
require_once '../config.php';

header('Content-Type: application/json');
setCORSHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check authentication - support both session (web) and token/header (extension)
$userId = null;
$isExtensionRequest = false;

// Try session first (web app)
if (isLoggedIn()) {
    $userId = getUserId();
    // Update last activity
    $_SESSION['last_activity'] = time();
} else {
    // Try extension authentication via headers
    $extensionUserId = $_SERVER['HTTP_X_USER_ID'] ?? $_GET['user_id'] ?? null;
    $extensionEmail = $_SERVER['HTTP_X_USER_EMAIL'] ?? $_GET['user_email'] ?? null;
    
    if ($extensionUserId && $extensionEmail) {
        // Verify user exists and email matches
        $db = getDB();
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND email = ?");
        $stmt->execute([$extensionUserId, $extensionEmail]);
        $user = $stmt->fetch();
        
        if ($user) {
            $userId = (int)$extensionUserId;
            $isExtensionRequest = true;
        }
    }
}

// Strict authentication check
if (!$userId) {
    http_response_code(401);
    jsonError('Authentication required. Please log in.', 401);
    exit;
}

// Additional security: Verify user ID is valid integer
if (!is_numeric($userId) || $userId <= 0) {
    http_response_code(401);
    jsonError('Invalid authentication', 401);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            handleGetCollections($db, $userId);
            break;
            
        case 'POST':
            handleCreateCollection($db, $userId);
            break;
            
        case 'PUT':
            handleUpdateCollection($db, $userId);
            break;
            
        case 'DELETE':
            handleDeleteCollection($db, $userId);
            break;
            
        default:
            jsonError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Collections API error: " . $e->getMessage());
    jsonError('Server error', 500);
}

function handleGetCollections($db, $userId) {
    $stmt = $db->prepare("SELECT c.*, 
                                 COUNT(b.id) as bookmark_count
                          FROM collections c
                          LEFT JOIN bookmarks b ON c.id = b.collection_id
                          WHERE c.user_id = ?
                          GROUP BY c.id
                          ORDER BY c.name");
    $stmt->execute([$userId]);
    $collections = $stmt->fetchAll();
    
    // Build tree structure
    $tree = [];
    $indexed = [];
    
    foreach ($collections as $collection) {
        $collection['bookmark_count'] = (int)$collection['bookmark_count'];
        $collection['children'] = [];
        $indexed[$collection['id']] = $collection;
    }
    
    foreach ($indexed as $collection) {
        if ($collection['parent_id']) {
            if (isset($indexed[$collection['parent_id']])) {
                $indexed[$collection['parent_id']]['children'][] = $collection;
            }
        } else {
            $tree[] = $collection;
        }
    }
    
    jsonSuccess($tree);
}

function handleCreateCollection($db, $userId) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($data['name'] ?? '');
    $parentId = $data['parent_id'] ?? null;
    
    if (empty($name)) {
        jsonError('Collection name is required');
    }
    
    if ($parentId) {
        $stmt = $db->prepare("SELECT id FROM collections WHERE id = ? AND user_id = ?");
        $stmt->execute([$parentId, $userId]);
        if (!$stmt->fetch()) {
            jsonError('Invalid parent collection');
        }
    }
    
    $stmt = $db->prepare("INSERT INTO collections (user_id, name, parent_id) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $name, $parentId]);
    
    $collectionId = $db->lastInsertId();
    
    $stmt = $db->prepare("SELECT c.*, COUNT(b.id) as bookmark_count
                          FROM collections c
                          LEFT JOIN bookmarks b ON c.id = b.collection_id
                          WHERE c.id = ?
                          GROUP BY c.id");
    $stmt->execute([$collectionId]);
    $collection = $stmt->fetch();
    $collection['bookmark_count'] = (int)$collection['bookmark_count'];
    
    jsonSuccess($collection, 'Collection created successfully');
}

function handleUpdateCollection($db, $userId) {
    $collectionId = $_GET['id'] ?? null;
    if (!$collectionId) {
        jsonError('Collection ID required');
    }
    
    // Verify ownership
    $stmt = $db->prepare("SELECT id FROM collections WHERE id = ? AND user_id = ?");
    $stmt->execute([$collectionId, $userId]);
    if (!$stmt->fetch()) {
        jsonError('Collection not found', 404);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $updates = [];
    $params = [];
    
    if (isset($data['name'])) {
        $updates[] = "name = ?";
        $params[] = trim($data['name']);
    }
    if (isset($data['parent_id'])) {
        $updates[] = "parent_id = ?";
        $params[] = $data['parent_id'];
    }
    
    if (empty($updates)) {
        jsonError('No fields to update');
    }
    
    $params[] = $collectionId;
    $params[] = $userId;
    
    $sql = "UPDATE collections SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    jsonSuccess(null, 'Collection updated successfully');
}

function handleDeleteCollection($db, $userId) {
    $collectionId = $_GET['id'] ?? null;
    if (!$collectionId) {
        jsonError('Collection ID required');
    }
    
    // Verify ownership and delete
    $stmt = $db->prepare("DELETE FROM collections WHERE id = ? AND user_id = ?");
    $stmt->execute([$collectionId, $userId]);
    
    if ($stmt->rowCount() === 0) {
        jsonError('Collection not found', 404);
    }
    
    jsonSuccess(null, 'Collection deleted successfully');
}

