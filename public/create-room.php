<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: www.i-bulong.com'); // IMPORTANT: Change * to your frontend domain in production!
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No Content
    exit();
}

require_once '/home/seupbvvg4y2j/config/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$roomName = $input['roomName'] ?? '';

if (empty($roomName)) {
    http_response_code(400);
    echo json_encode(['error' => 'Room name is required.']);
    exit();
}

try {
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    $stmt = $conn->prepare("INSERT INTO rooms (room_name) VALUES (?)");
    if (!$stmt) {
        throw new Exception("Error preparing statement: " . $conn->error);
    }
    $stmt->bind_param("s", $roomName);

    if ($stmt->execute()) {
        $roomId = $conn->insert_id;
        echo json_encode(['roomId' => $roomId, 'roomName' => $roomName, 'message' => 'Room created successfully.']);
    } else {
        throw new Exception("Error creating room: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    error_log("Error creating room: " . $e->getMessage());
    echo json_encode(['error' => 'Failed to create room.', 'details' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>