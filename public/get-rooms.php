<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

$stmt = $conn->prepare("SELECT id, name FROM rooms WHERE active = 1");
$stmt->execute();
$result = $stmt->get_result();

$rooms = [];
while ($row = $result->fetch_assoc()) {
    $rooms[] = $row;
}

echo json_encode($rooms);
$stmt->close();
?>
