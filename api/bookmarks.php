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
            handleGetBookmarks($db, $userId);
            break;
            
        case 'POST':
            handleCreateBookmark($db, $userId);
            break;
            
        case 'PUT':
            handleUpdateBookmark($db, $userId);
            break;
            
        case 'DELETE':
            handleDeleteBookmark($db, $userId);
            break;
            
        default:
            jsonError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("Bookmarks API error: " . $e->getMessage());
    jsonError('Server error: ' . $e->getMessage(), 500);
}

function handleGetBookmarks($db, $userId) {
    $collectionId = $_GET['collection_id'] ?? null;
    $search = trim($_GET['search'] ?? '');
    $tag = trim($_GET['tag'] ?? '');
    $favorite = $_GET['favorite'] ?? '';
    
    $sql = "SELECT b.*, 
                   GROUP_CONCAT(DISTINCT t.name) as tags,
                   c.name as collection_name
            FROM bookmarks b
            LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
            LEFT JOIN tags t ON bt.tag_id = t.id
            LEFT JOIN collections c ON b.collection_id = c.id
            WHERE b.user_id = ?";
    
    $params = [$userId];
    
    if ($collectionId !== null && $collectionId !== '') {
        $sql .= " AND b.collection_id = ?";
        $params[] = (int)$collectionId;
    }
    
    if ($favorite === 'true') {
        $sql .= " AND b.favorite = 1";
    }
    
    if (!empty($search)) {
        $sql .= " AND (b.title LIKE ? OR b.description LIKE ? OR b.content LIKE ?)";
        $searchParam = "%" . $search . "%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $sql .= " GROUP BY b.id ORDER BY b.created_at DESC";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $bookmarks = $stmt->fetchAll();
    
    // Process tags
    foreach ($bookmarks as &$bookmark) {
        $bookmark['tags'] = $bookmark['tags'] ? explode(',', $bookmark['tags']) : [];
        $bookmark['favorite'] = (bool)$bookmark['favorite'];
        
        // Filter by tag if specified
        if (!empty($tag) && !in_array($tag, $bookmark['tags'])) {
            continue;
        }
    }
    
    // Remove filtered items
    if (!empty($tag)) {
        $bookmarks = array_values(array_filter($bookmarks, function($b) use ($tag) {
            return in_array($tag, $b['tags']);
        }));
    }
    
    jsonSuccess($bookmarks);
}

function handleCreateBookmark($db, $userId) {
    // Handle multipart form data for file uploads
    if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false) {
        $title = trim($_POST['title'] ?? '');
        $url = trim($_POST['url'] ?? '');
        $type = $_POST['type'] ?? 'link';
        $content = $_POST['content'] ?? '';
        $description = trim($_POST['description'] ?? '');
        $collectionId = $_POST['collection_id'] ?? null;
        $tags = isset($_POST['tags']) ? (is_array($_POST['tags']) ? $_POST['tags'] : explode(',', $_POST['tags'])) : [];
        $favorite = isset($_POST['favorite']) ? (bool)$_POST['favorite'] : false;
        
        // Handle media file upload
        if (($type === 'audio' || $type === 'video') && isset($_FILES['media_file'])) {
            $upload = uploadMediaFile($_FILES['media_file'], $userId, $type);
            if (!$upload['valid']) {
                jsonError($upload['error']);
            }
            $content = $upload['path']; // Store server path instead of content
        }
    } else {
        // JSON request
        $data = json_decode(file_get_contents('php://input'), true);
        $title = trim($data['title'] ?? '');
        $url = trim($data['url'] ?? '');
        $type = $data['type'] ?? 'link';
        $content = $data['content'] ?? '';
        $description = trim($data['description'] ?? '');
        $collectionId = $data['collection_id'] ?? null;
        $tags = $data['tags'] ?? [];
        $favorite = isset($data['favorite']) ? (bool)$data['favorite'] : false;
    }
    
    if (empty($title)) {
        jsonError('Title is required');
    }
    
    // Validate type
    if (!in_array($type, ['link', 'text', 'image', 'audio', 'video'])) {
        jsonError('Invalid bookmark type');
    }
    
    // Validate collection belongs to user
    if ($collectionId) {
        $stmt = $db->prepare("SELECT id FROM collections WHERE id = ? AND user_id = ?");
        $stmt->execute([$collectionId, $userId]);
        if (!$stmt->fetch()) {
            jsonError('Invalid collection');
        }
    }
    
    // Insert bookmark
    $stmt = $db->prepare("INSERT INTO bookmarks (user_id, collection_id, title, url, type, content, description, favorite) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $collectionId, $title, $url, $type, $content, $description, $favorite ? 1 : 0]);
    
    $bookmarkId = $db->lastInsertId();
    
    // Handle tags
    if (!empty($tags) && is_array($tags)) {
        foreach ($tags as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;
            
            // Get or create tag
            $stmt = $db->prepare("SELECT id FROM tags WHERE user_id = ? AND name = ?");
            $stmt->execute([$userId, $tagName]);
            $tag = $stmt->fetch();
            
            if (!$tag) {
                $stmt = $db->prepare("INSERT INTO tags (user_id, name) VALUES (?, ?)");
                $stmt->execute([$userId, $tagName]);
                $tagId = $db->lastInsertId();
            } else {
                $tagId = $tag['id'];
            }
            
            // Link bookmark to tag
            $stmt = $db->prepare("INSERT IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)");
            $stmt->execute([$bookmarkId, $tagId]);
        }
    }
    
    // Fetch complete bookmark
    $stmt = $db->prepare("SELECT b.*, 
                                  GROUP_CONCAT(DISTINCT t.name) as tags,
                                  c.name as collection_name
                           FROM bookmarks b
                           LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
                           LEFT JOIN tags t ON bt.tag_id = t.id
                           LEFT JOIN collections c ON b.collection_id = c.id
                           WHERE b.id = ? AND b.user_id = ?
                           GROUP BY b.id");
    $stmt->execute([$bookmarkId, $userId]);
    $bookmark = $stmt->fetch();
    $bookmark['tags'] = $bookmark['tags'] ? explode(',', $bookmark['tags']) : [];
    $bookmark['favorite'] = (bool)$bookmark['favorite'];
    
    jsonSuccess($bookmark, 'Bookmark created successfully');
}

function handleUpdateBookmark($db, $userId) {
    $bookmarkId = $_GET['id'] ?? null;
    if (!$bookmarkId) {
        jsonError('Bookmark ID required');
    }
    
    // Verify ownership
    $stmt = $db->prepare("SELECT id FROM bookmarks WHERE id = ? AND user_id = ?");
    $stmt->execute([$bookmarkId, $userId]);
    if (!$stmt->fetch()) {
        jsonError('Bookmark not found', 404);
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $updates = [];
    $params = [];
    
    if (isset($data['title'])) {
        $updates[] = "title = ?";
        $params[] = trim($data['title']);
    }
    if (isset($data['url'])) {
        $updates[] = "url = ?";
        $params[] = trim($data['url']);
    }
    if (isset($data['type'])) {
        $updates[] = "type = ?";
        $params[] = $data['type'];
    }
    if (isset($data['content'])) {
        $updates[] = "content = ?";
        $params[] = $data['content'];
    }
    if (isset($data['description'])) {
        $updates[] = "description = ?";
        $params[] = trim($data['description']);
    }
    if (isset($data['collection_id'])) {
        $updates[] = "collection_id = ?";
        $params[] = $data['collection_id'];
    }
    if (isset($data['favorite'])) {
        $updates[] = "favorite = ?";
        $params[] = $data['favorite'] ? 1 : 0;
    }
    
    if (empty($updates)) {
        jsonError('No fields to update');
    }
    
    $params[] = $bookmarkId;
    $params[] = $userId;
    
    $sql = "UPDATE bookmarks SET " . implode(', ', $updates) . " WHERE id = ? AND user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    // Update tags if provided
    if (isset($data['tags']) && is_array($data['tags'])) {
        // Remove existing tags
        $stmt = $db->prepare("DELETE FROM bookmark_tags WHERE bookmark_id = ?");
        $stmt->execute([$bookmarkId]);
        
        // Add new tags
        foreach ($data['tags'] as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;
            
            $stmt = $db->prepare("SELECT id FROM tags WHERE user_id = ? AND name = ?");
            $stmt->execute([$userId, $tagName]);
            $tag = $stmt->fetch();
            
            if (!$tag) {
                $stmt = $db->prepare("INSERT INTO tags (user_id, name) VALUES (?, ?)");
                $stmt->execute([$userId, $tagName]);
                $tagId = $db->lastInsertId();
            } else {
                $tagId = $tag['id'];
            }
            
            $stmt = $db->prepare("INSERT IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)");
            $stmt->execute([$bookmarkId, $tagId]);
        }
    }
    
    jsonSuccess(null, 'Bookmark updated successfully');
}

function handleDeleteBookmark($db, $userId) {
    $bookmarkId = $_GET['id'] ?? null;
    if (!$bookmarkId) {
        jsonError('Bookmark ID required');
    }
    
    // Verify ownership and delete
    $stmt = $db->prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?");
    $stmt->execute([$bookmarkId, $userId]);
    
    if ($stmt->rowCount() === 0) {
        jsonError('Bookmark not found', 404);
    }
    
    jsonSuccess(null, 'Bookmark deleted successfully');
}

