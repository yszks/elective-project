<?php

header('Content-Type: application/json');


header('Access-Control-Allow-Origin: www.i-bulong.com'); // IMPORTANT: Change * to your frontend domain in production!
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No Content
    exit();
}

$agoraToken = "007eJxTYLDRWuK0VEKF2b1g+1LT+3vkUk5/dHXt3xDxwPSRgFjZ2VYFBmMLkyQLCxMjyzSzZBNLY5OkFEPjlMRUo0TLZKNE08SkX4JGGQ2BjAzLaxNZGRkgEMTnYEjNSU0uySxLZWAAAEhLH7k=";

if (empty($agoraToken)) {
    http_response_code(500);
    echo json_encode(['error' => 'Hardcoded Agora Token is missing.']);
    exit();
}

try {
    
    echo json_encode(['token' => $agoraToken]);

} catch (Exception $e) {
   
    http_response_code(500);
    error_log("Error serving hardcoded token: " . $e->getMessage());
    echo json_encode(['error' => 'Failed to serve Agora token.', 'details' => $e->getMessage()]);
}


?>