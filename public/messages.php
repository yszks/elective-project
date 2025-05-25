<?php
session_start();
header('Content-Type: application/json');

require_once '/home/seupbvvg4y2j/config/config.php';

// Ensure database connection is established (from config.php)
// Example: $conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);
// if ($conn->connect_error) {
//     http_response_code(500);
//     echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
//     exit();
// }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle POST request (saving new message)
    $input = json_decode(file_get_contents('php://input'), true);

    $roomId = $input['roomId'] ?? null;
    $username = $input['username'] ?? null;
    $message = $input['message'] ?? null;
    $timestamp = date('Y-m-d H:i:s'); // Current timestamp

    if (!$roomId || !$username || !$message) {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Missing roomId, username, or message']);
        exit();
    }

    // --- Database Insertion Logic ---
    // Example using MySQLi (adjust for PDO or your actual DB connection)
    $stmt = $conn->prepare("INSERT INTO messages (room_id, username, message, timestamp) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("isss", $roomId, $username, $message, $timestamp); // 'i' for int, 's' for string
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'messageId' => $conn->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save message: ' . $stmt->error]);
    }
    $stmt->close();
    // --- End Database Insertion Logic ---

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle GET request (fetching messages)
    $roomId = $_GET['roomId'] ?? null;

    if (!$roomId) {
        http_response_code(400); // Bad Request
        echo json_encode(['error' => 'Missing roomId for fetching messages']);
        exit();
    }

    // --- Database Fetching Logic ---
    // Example using MySQLi
    $stmt = $conn->prepare("SELECT username, message, timestamp FROM messages WHERE room_id = ? ORDER BY timestamp ASC");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare statement: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result();

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }

    echo json_encode($messages);
    $stmt->close();
    // --- End Database Fetching Logic ---

} else {
    // Method Not Allowed
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}

// Close database connection (if applicable, or handled by config.php)
// $conn->close();

?>