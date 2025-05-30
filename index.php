<?php
session_start();
require_once '/home/seupbvvg4y2j/config/config.php';

if (!isset($_SESSION['id'])) {
    header("Location: public/login-page.php");
    exit();
}

$imagePath = 'public/assets/uploads/default.png';
if (isset($_SESSION['id'])) {
    $id = $_SESSION['id'];
    $stmt = $conn->prepare("SELECT user_img FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $row = $result->fetch_assoc();
        // Use null coalescing operator for cleaner default assignment
        $imagePath = 'public/assets/uploads/' . ($row['user_img'] ?? 'default.png');
    }
    $stmt->close();
}
?>


<!DOCTYPE html>
<html>

<head>
    <meta charset='utf-8'>
    <meta https-equiv='X-UA-Compatible' content='IE=edge'>
    <title>iBulong</title>
    <link rel="icon" type="image/x-icon" href="public/assets/images/ib.ico">
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <link rel='stylesheet' type='text/css' media='screen' href='public/main.css'>
</head>

<body>
    <div id="page-wrapper">
        <div id="main-content">

            <a href="public/profile-page.php" target="_self">
                <button id="user-profile" style="background-image: url('<?= htmlspecialchars($imagePath) ?>'); background-size: cover; background-position: center; background-repeat: no-repeat; border: 3px solid #003297; cursor: pointer;"></button>
            </a>

            <div id="container-chat-btn">
                <button id="chat-btn">
                    <img src="public/assets/images/chat-icon-dark.png" alt="chats"
                        style="width: 25px; height: auto; pointer-events: none; ">
                </button>
            </div>

            <div id="title">
                <a href="index.php" target="_self"><img id="theme-image" src="public/assets/images/roomzy-logo-dark.png" alt="iBulong" width="500px"
                        height="auto"></a>
            </div>

            <div id="logo-left">
                <a href="index.php" target="_self"><img id="logogogo" src="public/assets/images/roomzy-logo-dark.png" alt="iBulong" width="180px" height="auto"></a>
            </div>

            <button id="theme-toggle"></button>
            <div id="head-buttons">
                <button id="create-room-btn" onclick="createRoom()">Create Room</button>
                <a href="public/logout.php" onclick="return confirm('Are you sure you want to logout?')"><button id="logout-btn">Logout</button></a>
            </div>

            <div class="container-join-btn"></div>

            <div class="need-wrap">
                <div class="vid-main-cont">
                    <div id="stream-wrapper">
                        <div id="video-streams"></div>
                    </div>
                </div>

                <div id="chat-cont">
                    <div id="side-chat">
                        <div class="inputs-uu" aria-atomic="true">
                            <div id="chat-messages-container">
                                <div id="messages"></div>
                                <input type="text" id="chat-input" placeholder="Type a message..." />
                                <button id="send-btn">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="stream-controls">
                <button id="leave-btn">Leave Room</button>
                <button id="mic-btn" style="background-color: #FF8578;">
                    <img src="public/assets/images/mic-off.png" alt="Mic Off"
                        style="margin-left: -11px; margin-top: -2px; width: 23px; height: auto; pointer-events: none;">
                </button>
                <button id="camera-btn" style="background-color: #A1FF99;">
                    <img src="public/assets/images/camera-on.png" alt="Camera Off"
                        style="margin-left: -12px; margin-top: -6px; width: 26px; height: 31px; pointer-events: none;">
                </button>
            </div>
        </div>

        <footer style="text-align: left;">
            <p>&copy; 2025 iBulong. All rights reserved.</p>
        </footer>
    </div>

    <script>
        window.AGORA_APP_ID = "384b88429f6c4934bd13dae2a9c2a5ab";
        window.API_BASE_URL = "https://elective-project.onrender.com";
        window.PHP_API_BASE_URL = "https://www.i-bulong.com";
    </script>

    <script src="public/AgoraRTC_N-4.23.3.js" defer></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="public/main.js" defer></script>
    <script src="public/theme.js" defer></script>


</body>

</html>
