<?php
// Test API endpoints
session_start();

// Simulate logged in user (use the test user we created)
$_SESSION['user_id'] = 1;
$_SESSION['username'] = 'testuser';
$_SESSION['email'] = 'test@example.com';
$_SESSION['created'] = time();
$_SESSION['last_activity'] = time();

echo "Session set. Testing API endpoints...\n\n";

// Test collections endpoint
echo "Testing collections.php:\n";
$ch = curl_init('http://localhost/Personal_Web_Tech_Project/api/collections.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Test bookmarks endpoint
echo "Testing bookmarks.php:\n";
$ch = curl_init('http://localhost/Personal_Web_Tech_Project/api/bookmarks.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";
