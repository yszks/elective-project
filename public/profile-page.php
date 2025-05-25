<?php
session_start();
require_once '/home/seupbvvg4y2j/config/config.php';

if (!isset($_SESSION['id'])) {
    header("Location: login-page.php");
    exit();
}

$id = $_SESSION['id'];
$update_message = '';

$stmt = $conn->prepare("SELECT username, email, password, user_img FROM users WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo "User not found.";
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_changes'])) {
    $currentUsername = $user['username'];
    $currentEmail = $user['email'];
    $currentPasswordHash = $user['password'];

    $newUsername = trim($_POST['upd_username'] ?? '');
    $newEmail = trim($_POST['upd_email'] ?? '');
    $currentPasswordAttempt = $_POST['current_password'] ?? '';
    $newPassword = $_POST['upd_password'] ?? '';
    $confirmNewPassword = $_POST['confirm_upd_password'] ?? '';

    $updates = [];
    $params = [];
    $types = '';

    // Update Username
    if (!empty($newUsername) && $newUsername !== $currentUsername) {

        $stmt_check_username = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt_check_username->bind_param("si", $newUsername, $id);
        $stmt_check_username->execute();
        $res_check_username = $stmt_check_username->get_result();
        if ($res_check_username->num_rows > 0) {
            $update_message = "Error: Username is already taken.";
        } else {
            $updates[] = "username = ?";
            $params[] = $newUsername;
            $types .= 's';
        }
        $stmt_check_username->close();
    }

    // Update Email
    if (!empty($newEmail) && $newEmail !== $currentEmail) {
        if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            $update_message = "Error: Invalid email format.";
        } else {
            $stmt_check_email = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $stmt_check_email->bind_param("si", $newEmail, $id);
            $stmt_check_email->execute();
            $res_check_email = $stmt_check_email->get_result();
            if ($res_check_email->num_rows > 0) {
                $update_message = "Error: Email is already registered.";
            } else {
                $updates[] = "email = ?";
                $params[] = $newEmail;
                $types .= 's';
            }
            $stmt_check_email->close();
        }
    }

    // Update Password
    if (!empty($newPassword)) {
        if (empty($currentPasswordAttempt)) {
            $update_message = "Error: Please enter your current password to change it.";
        } elseif (!password_verify($currentPasswordAttempt, $currentPasswordHash)) {
            $update_message = "Error: Incorrect current password.";
        } elseif ($newPassword !== $confirmNewPassword) {
            $update_message = "Error: New password and confirmation do not match.";
        } elseif (strlen($newPassword) < 8) {
            $update_message = "Error: New password must be at least 8 characters long.";
        } else {
            $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $updates[] = "password_hash = ?"; // Update the correct column name
            $params[] = $hashedNewPassword;
            $types .= 's';
        }
    }

    if (!empty($updates) && empty($update_message)) {
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $params[] = $id;
        $types .= 'i';

        $stmt = $conn->prepare($sql);

        $bind_params = array_merge([$types], $params);
        $refs = [];
        foreach ($bind_params as $key => $value) {
            $refs[$key] = &$bind_params[$key];
        }
        call_user_func_array([$stmt, 'bind_param'], $refs);

        if ($stmt->execute()) {
            $update_message = "Profile updated successfully!";
        } else {
            $update_message = "Error updating profile: " . $stmt->error;
        }
        $stmt->close();
    } elseif (empty($updates) && empty($update_message)) {
        $update_message = "No changes submitted.";
    }


    if (!empty($update_message)) {
        $_SESSION['profile_update_status'] = $update_message;
        header("Location: profile-page.php");
        exit();
    }
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

if (isset($_SESSION['profile_update_status'])) {
    $update_message = $_SESSION['profile_update_status'];
    unset($_SESSION['profile_update_status']);
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
            position: absolute;
            justify-self: center;
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

        <h2>Welcome, <?= htmlspecialchars($user['username']) ?></h2>

        <?php if (isset($_SESSION['profile_update'])): ?>
            <p class="upload-message"><?= htmlspecialchars($_SESSION['profile_update']) ?></p>
            <?php unset($_SESSION['profile_update']); ?>
        <?php endif; ?>

        <div class="info-cont">
            <div id="text-info">
                <p><b>Username:</b></p>
                <p><i>&emsp;&emsp;<?= htmlspecialchars($user['username']) ?></i>&emsp;&emsp;&emsp;&emsp;
                    <input type="text" name="upd_username" placeholder="Change Username">
                </p>

                <p>&emsp;</p>
                <p><b>Email:</b></p>
                <p><i>&emsp;&emsp;<?= htmlspecialchars($user['email']) ?></i>&emsp;&emsp;&emsp;&emsp;
                    <input type="text" name="upd_email" placeholder="Change Email">
                </p>

                <p>&emsp;</p>
                <<p><b>Current Password:</b></p>
                    <p><i>&emsp;&emsp;********************</i></p>
                    <input type="password" name="current_password" placeholder="Enter Current Password">

                    <p><b>New Password:</b></p>
                    <input type="password" name="upd_password" placeholder="Enter New Password">

                    <p><b>Confirm New Password:</b></p>
                    <input type="password" name="confirm_upd_password" placeholder="Confirm New Password">
                    <div class="save-btn">
                        <button type="submit" name="save_changes">Save Changes</button>
                    </div>
            </div>

            <form id="picture-change" method="POST" enctype="multipart/form-data">
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
            const uploadForm = document.getElementById('picture-change');

            fileInput.addEventListener('change', function() {
                if (fileInput.files.length > 0) {
                    uploadForm.submit();
                }
            });

            const uploadMessage = document.querySelector('.upload-message');
            if (uploadMessage) {
                setTimeout(() => {
                    uploadMessage.style.display = 'none';
                }, 5000); // Hide after 5 seconds
            }
        });
    </script>


</body>

</html>