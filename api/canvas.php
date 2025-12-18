<?php
require_once '../config.php';

header('Content-Type: application/json');
setCORSHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Stateless auth (consistent with other APIs)
$userId = authenticateUserFromHeaders();
if (!$userId) {
    http_response_code(401);
    jsonError('Authentication required. Please log in.', 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

try {
    switch ($method) {
        case 'GET':
            $collectionId = $_GET['collection_id'] ?? null;
            if (!$collectionId) {
                jsonError('Collection ID required', 400);
            }

            // Fetch positions
            $stmt = $db->prepare(
                "SELECT bcp.bookmark_id, bcp.x_position, bcp.y_position
                 FROM bookmark_canvas_positions bcp
                 INNER JOIN bookmarks b ON b.id = bcp.bookmark_id
                 WHERE bcp.collection_id = ? AND b.user_id = ?"
            );
            $stmt->execute([$collectionId, $userId]);
            $positions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch connections
            $stmt = $db->prepare(
                "SELECT bcc.from_bookmark_id, bcc.to_bookmark_id, bcc.label
                 FROM bookmark_canvas_connections bcc
                 INNER JOIN bookmarks b ON b.id = bcc.from_bookmark_id
                 WHERE bcc.collection_id = ? AND b.user_id = ?"
            );
            $stmt->execute([$collectionId, $userId]);
            $connections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonSuccess(['positions' => $positions, 'connections' => $connections]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                jsonError('Invalid JSON body', 400);
            }

            $collectionId = $input['collection_id'] ?? null;
            $positions = $input['positions'] ?? [];
            $connections = $input['connections'] ?? [];

            if (!$collectionId) {
                jsonError('Collection ID required', 400);
            }

            $db->beginTransaction();
        
        // Clear existing positions and connections for this collection
        $stmt = $db->prepare(
            "DELETE bcp FROM bookmark_canvas_positions bcp
             INNER JOIN bookmarks b ON b.id = bcp.bookmark_id
             WHERE bcp.collection_id = ? AND b.user_id = ?"
        );
        $stmt->execute([$collectionId, $userId]);
        
        $stmt = $db->prepare(
            "DELETE bcc FROM bookmark_canvas_connections bcc
             INNER JOIN bookmarks b ON b.id = bcc.from_bookmark_id
             WHERE bcc.collection_id = ? AND b.user_id = ?"
        );
        $stmt->execute([$collectionId, $userId]);
        
        // Insert new positions
        if (!empty($positions)) {
            $stmt = $db->prepare(
                "INSERT INTO bookmark_canvas_positions (bookmark_id, collection_id, x_position, y_position)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE x_position = VALUES(x_position), y_position = VALUES(y_position)"
            );
            
            foreach ($positions as $pos) {
                // Verify bookmark belongs to user
                $checkStmt = $db->prepare("SELECT id FROM bookmarks WHERE id = ? AND user_id = ?");
                $checkStmt->execute([$pos['bookmark_id'], $userId]);
                
                if ($checkStmt->fetch()) {
                    $stmt->execute([
                        $pos['bookmark_id'],
                        $collectionId,
                        $pos['x_position'],
                        $pos['y_position']
                    ]);
                }
            }
        }
        
        // Insert new connections
        if (!empty($connections)) {
            $stmt = $db->prepare(
                "INSERT INTO bookmark_canvas_connections (from_bookmark_id, to_bookmark_id, collection_id, label)
                 VALUES (?, ?, ?, ?)"
            );
            
            foreach ($connections as $conn) {
                // Verify both bookmarks belong to user
                $checkStmt = $db->prepare(
                    "SELECT COUNT(*) as count FROM bookmarks 
                     WHERE id IN (?, ?) AND user_id = ?"
                );
                $checkStmt->execute([
                    $conn['from_bookmark_id'],
                    $conn['to_bookmark_id'],
                    $userId
                ]);
                $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!empty($result) && (int)$result['count'] === 2) {
                    $stmt->execute([
                        $conn['from_bookmark_id'],
                        $conn['to_bookmark_id'],
                        $collectionId,
                        $conn['label'] ?? ''
                    ]);
                }
            }
        }
        
        $db->commit();
        jsonSuccess(null, 'Canvas data saved successfully');
            
        break;

        default:
            jsonError('Method not allowed', 405);
    }
} catch (Exception $e) {
    if ($db && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Canvas API error: ' . $e->getMessage());
    jsonError('Server error: ' . $e->getMessage(), 500);
}
