<?php
// Database setup script
$host = 'localhost';
$user = 'root';
$pass = '';

try {
    // Connect without database first
    $pdo = new PDO("mysql:host=$host", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected to MySQL successfully!\n\n";
    
    // Read and execute the SQL file
    $sql = file_get_contents(__DIR__ . '/database.sql');
    
    // Split by semicolon and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (empty($statement) || strpos($statement, '--') === 0) {
            continue;
        }
        try {
            $pdo->exec($statement);
            $firstLine = explode("\n", $statement)[0];
            echo "✓ Executed: " . substr($firstLine, 0, 60) . "...\n";
        } catch (PDOException $e) {
            // Skip errors for "already exists" since we use IF NOT EXISTS
            if (strpos($e->getMessage(), 'already exists') === false) {
                echo "✗ Error: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "\n✓ Database setup complete!\n";
    
    // Verify tables
    $pdo->exec("USE bookmark_db");
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "\nTables in bookmark_db:\n";
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
