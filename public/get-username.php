<?php
header('Access-Control-Allow-Origin: https://www.i-bulong.com');
header('Access-Control-Allow-Credentials: true');
session_start();
header('Content-Type: application/json');

$appId = getenv('AGORA_APP_ID');
$appCertificate = getenv('AGORA_APP_CERTIFICATE');

if (isset($_SESSION['username'])) {
    echo json_encode(['username' => $_SESSION['username']]);
} else {
    http_response_code(401); // Unauthorized
    echo json_encode(['error' => 'User not logged in']);
}
?>
