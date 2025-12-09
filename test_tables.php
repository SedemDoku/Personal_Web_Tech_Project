<?php
require_once 'config.php';

try {
    $db = getDB();
    
    // Check if collections table exists
    echo "Checking collections table:\n";
    $stmt = $db->query("DESCRIBE collections");
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    // Check collections data
    echo "\nCollections in database:\n";
    $stmt = $db->query("SELECT * FROM collections");
    $collections = $stmt->fetchAll();
    echo "Count: " . count($collections) . "\n";
    foreach ($collections as $col) {
        echo "  ID: {$col['id']}, Name: {$col['name']}, User: {$col['user_id']}\n";
    }
    
    // Check if bookmarks table exists
    echo "\nChecking bookmarks table:\n";
    $stmt = $db->query("DESCRIBE bookmarks");
    $columns = $stmt->fetchAll();
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    // Check bookmarks data
    echo "\nBookmarks in database:\n";
    $stmt = $db->query("SELECT id, title, type, user_id FROM bookmarks");
    $bookmarks = $stmt->fetchAll();
    echo "Count: " . count($bookmarks) . "\n";
    foreach ($bookmarks as $bm) {
        echo "  ID: {$bm['id']}, Title: {$bm['title']}, Type: {$bm['type']}, User: {$bm['user_id']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
