<?php

$host = "localhost";
$user = "root";
$password = "";
$database = "chat";

$conn = new mysqli($host, $user, $password, $database, 3308);

if ($conn->connect_error){
    die("Connection failed: ". $conn->connect_error);
}

?>