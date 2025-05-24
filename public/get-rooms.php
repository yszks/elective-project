<?php
header('Content-Type: application/json');

// Include the database configuration file
require_once '/home/seupbvvg4y2j/config/config.php';
// Query to fetch active rooms
$sql = "SELECT id, room_name FROM rooms";
$result = $conn->query($sql);

$rooms = [];

if ($result->num_rows > 0) {
    // Fetch all rooms
    while ($row = $result->fetch_assoc()) {
        $rooms[] = [
            'id' => $row['id'],
            'name' => $row['room_name']
        ];
    }
}

// Close the database connection
$conn->close();

// Return the rooms as a JSON response
echo json_encode($rooms);
?>
