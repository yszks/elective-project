<?php

$host = getenv('DB_HOST') ?: 'www.i-bulong.com';
$user = getenv('DB_USER') ?: 'elective';
$password = getenv('DB_PASSWORD') ?: 'elective-project';
$database = getenv('DB_NAME') ?: 'chat';
$port = getenv('DB_PORT') ?: 3306;


// Establish the connection
$conn = new mysqli($host, $user, $password, $database, $port);

// Handle connection errors
if ($conn->connect_error){

    error_log("Database connection failed: ". $conn->connect_error); // Log to server error logs
    die("A database error occurred. Please try again later."); // Generic message for the user
}

// Recommendation 3: Set character set for proper UTF-8mb4 handling
$conn->set_charset("utf8mb4");


?>