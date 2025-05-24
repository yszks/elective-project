<?php
header('Content-Type: application/json');

// Include the database configuration file
require_once '/home/seupbvvg4y2j/config/config.php';

$rooms = [];

try {
    // Check if the database connection was successful
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // Query to fetch active rooms
    $sql = "SELECT id, room_name FROM rooms";
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Error fetching rooms: " . $conn->error);
    }

    if ($result->num_rows > 0) {
        // Fetch all rooms
        while ($row = $result->fetch_assoc()) {
            $rooms[] = [
                'id' => $row['id'],
                'name' => $row['room_name']
            ];
        }
    }
} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => $e->getMessage()]);
    exit(); // Stop execution
} finally {
    // Close the database connection in a finally block to ensure it always closes
    if ($conn) {
        $conn->close();
    }
}

// Return the rooms as a JSON response
echo json_encode($rooms);
?>