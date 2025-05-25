<?php
session_start();
require_once '/home/seupbvvg4y2j/config/config.php';

if (!isset($_SESSION['id'])) {
    header("Location: login-page.php");
    exit();
}

$id = $_SESSION['id'];

$stmt = $conn->prepare("SELECT username, email, password, user_img FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo "User not found.";
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

$imagePath = 'assets/uploads/' . (!empty($user['user_img']) ? $user['user_img'] : 'default.png');


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['user_img'])) {
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];
    $imageTmpPath = $_FILES['user_img']['tmp_name'];
    $imageName = basename($_FILES['user_img']['name']);
    $imageExtension = strtolower(pathinfo($imageName, PATHINFO_EXTENSION));

    if (in_array($imageExtension, $allowed)) {
        $newFileName = uniqid('user_', true) . '.' . $imageExtension;
        $uploadDir = __DIR__ . '/assets/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        $uploadPath = $uploadDir . $newFileName;

        if (move_uploaded_file($imageTmpPath, $uploadPath)) {

            // Update database
            $stmt = $conn->prepare("UPDATE users SET user_img = ? WHERE id = ?");
            $stmt->bind_param("si", $newFileName, $id);
            if ($stmt->execute()) {
                $_SESSION['profile_update'] = "Profile picture updated successfully!";
            } else {
                $_SESSION['profile_update'] = "Database update failed.";
            }
            $stmt->close();
        } else {
            $_SESSION['profile_update'] = "Failed to move uploaded file.";
        }
    } else {
        $_SESSION['profile_update'] = "Invalid file type. Allowed: JPG, JPEG, PNG, WEBP.";
    }

    header("Location: profile-page.php");
    exit();
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($user['username']) ?></title>
    <link rel='stylesheet' type='text/css' media='screen' href='main.css'>

    <style>
        .upload-label {
            display: inline-block;
            width: 250px;
            height: 250px;
            background-image: url('<?= htmlspecialchars($imagePath) ?>');
            background-size: cover;
            background-position: center;
            border: 5px solid #003297;
            border-radius: 50%;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            top: 175px;
            padding: 10px;
            background-color: #003297;
        }

        .upload-label:hover::after {
            content: "Upload Image";
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px;
            background-color: rgba(0, 0, 0, 0.6);
            color: #fff;
            text-align: center;
            font-size: 14px;
        }

        #adj-img {
            display: none;
        }

        .upload-message {
            justify-content: center;
            text-align: center;
            width: 400px;
            padding: 12px;
            display: flex;
            text-align: center;
            color: #2ca428;
            background-color: #d8f8d7;
            font-family: 'zabal';
            margin-top: 16px;
            color: green;
            font-weight: bold;
            border-radius: 10px;
        }
    </style>

</head>

<body>
    <div class="profile-container">
        <button id="theme-toggle"></button>

        <a href="../index.php" target="_self"><button style="top: 10px; left:20px; display: grid; position: fixed;">← Return to Homepage</button></a>

        <div id="title-profile">
            <img id="theme-login" src="assets/images/roomzy-logo-dark.png" alt="iBulong" width="400px" height="auto">
        </div>

        <?php if (isset($_SESSION['profile_update'])): ?>
            <p class="upload-message"><?= htmlspecialchars($_SESSION['profile_update']) ?></p>
            <?php unset($_SESSION['profile_update']); ?>
        <?php endif; ?>

        <h2>Welcome, <?= htmlspecialchars($user['username']) ?></h2>
        
        <div class="info-cont">
            <div id="text-info">
                <p>&emsp;<br>&emsp;</p>
                <p>Username:</p>
                <p>&emsp;&emsp;<?= htmlspecialchars($user['username']) ?></p>
                <p>&emsp;<br>&emsp;</p>
                <p>Email:</p>
                <p>&emsp;&emsp;<?= htmlspecialchars($user['email']) ?></p>
                <p>&emsp;<br>&emsp;</p>
                <p>Password:</p>
                <p>&emsp;&emsp;<?= htmlspecialchars($user['password']) ?></p>
            </div>

            <form id="picture-change" method="POST" enctype="multipart/form-data" id="uploadForm">
                <input type="hidden" name="profile_update" value="1">
                <label for="adj-img" class="upload-label"></label>
                <input type="file" name="user_img" id="adj-img" accept="image/*">
            </form>
        </div>

    </div>
    <script src="main.js" defer></script>
    <script src="theme.js" defer></script>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const fileInput = document.getElementById('adj-img');
            const uploadForm = document.getElementById('uploadForm');

            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    uploadForm.submit();
                }
            });
        });
    </script>


</body>

</html>