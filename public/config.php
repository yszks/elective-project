<?php

$host = "localhost";
$user = "elective";
$password = "elective-project";
$database = "chat";

$conn = new mysqli($host, $user, $password, $database, 3306);

if ($conn->connect_error){
    die("Connection failed: ". $conn->connect_error);
}

?>