<?php
session_start();
header('Content-Type: application/json');

require_once dirname(__DIR__, 2) . '/config/config.php';

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

    $stmt_user_id = $conn->prepare("SELECT id FROM users WHERE username = ?");
    if (!$stmt_user_id) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare user_id statement: ' . $conn->error]);
        exit();
    }
    $stmt_user_id->bind_param("s", $username);
    $stmt_user_id->execute();
    $result_user_id = $stmt_user_id->get_result();
    $user_data = $result_user_id->fetch_assoc();
    $stmt_user_id->close();

    if (!$user_data) {
        http_response_code(404); // User not found in database
        echo json_encode(['error' => 'User not found in database.']);
        exit();
    }
    $userId = $user_data['id']; 

    // --- Database Insertion Logic ---
     $stmt = $conn->prepare("INSERT INTO messages (room_id, user_id, message, timestamp) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare message insertion statement: ' . $conn->error]);
        exit();
    }
    // Change "isss" (int, string, string, string) to "iiss" (int, int, string, string)
    $stmt->bind_param("iiss", $roomId, $userId, $message, $timestamp);
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
    $stmt = $conn->prepare("
        SELECT m.message, m.timestamp, u.username
        FROM messages AS m
        INNER JOIN users AS u ON m.user_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.timestamp ASC
    ");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to prepare SELECT statement with JOIN: ' . $conn->error]);
        exit();
    }
    $stmt->bind_param("i", $roomId);
    if (!$stmt->execute()) { // Always good to check execute success
        http_response_code(500);
        echo json_encode(['error' => 'Failed to execute SELECT statement: ' . $stmt->error]);
        exit();
    }
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


?>