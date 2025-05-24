<?php
session_start();

// --- DEBUGGING START ---
// Temporarily enable all error reporting for debugging.
// REMOVE OR COMMENT OUT THESE TWO LINES IN PRODUCTION!
error_reporting(E_ALL);
ini_set('display_errors', 1);
// --- DEBUGGING END ---


// IMPORTANT: Replace 'seupbvvg4y2j' with your actual cPanel username
$config_path = '/home/seupbvvg4y2j/config/config.php';

// Check if config.php exists and include it
if (file_exists($config_path)) {
    require_once $config_path;
} else {
    // If config.php is not found, log an error and display a generic message
    error_log("CRITICAL ERROR: config.php not found at " . $config_path);
    die("A critical configuration error occurred. Please try again later. (Error: Config file missing)");
}

// Check if the database connection ($conn) was successfully established
// This means config.php loaded, but the connection itself might have failed
if (!isset($conn) || !$conn->ping()) {
    error_log("CRITICAL ERROR: Database connection failed or \$conn not set after config.php inclusion.");
    die("A critical database connection error occurred. Please try again later. (Error: DB connection)");
}


// --- SESSION DEBUGGING START ---
// Check and display the session ID for debugging purposes
if (isset($_SESSION['id'])) {
    // echo "DEBUG: SESSION['id'] is set to: " . htmlspecialchars($_SESSION['id']) . "<br>";
} else {
    // echo "DEBUG: SESSION['id'] is NOT set. Redirecting to login page.<br>";
}
// --- SESSION DEBUGGING END ---


// Redirect to login page if user is not logged in (no 'id' in session)
if (!isset($_SESSION['id'])) {
    header("Location: login-page.php");
    exit();
}

$id = $_SESSION['id']; // Get user ID from session

// Prepare and execute statement to fetch user data
$stmt = $conn->prepare("SELECT username, email, password, user_img FROM users WHERE id = ?");
if ($stmt === false) {
    error_log("Database prepare error: " . $conn->error);
    die("Database error. Please try again later. (Error: Prepare)");
}
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

// Check if user was found
if ($result->num_rows !== 1) {
    // If no user found for the given ID, clear session and redirect to login
    session_unset();
    session_destroy();
    header("Location: login-page.php");
    exit();
}

$user = $result->fetch_assoc();
$stmt->close();

// Determine image path for display
$imagePath = 'assets/uploads/' . (!empty($user['user_img']) ? $user['user_img'] : 'default.png');


// Handle image upload POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['user_img'])) {
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];
    $imageTmpPath = $_FILES['user_img']['tmp_name'];
    $imageName = basename($_FILES['user_img']['name']);
    $imageExtension = strtolower(pathinfo($imageName, PATHINFO_EXTENSION));

    if (in_array($imageExtension, $allowed)) {
        $newFileName = uniqid('user_', true) . '.' . $imageExtension;
        // __DIR__ gives the directory of the current script (profile-page.php)
        // Assuming profile-page.php is in public_html/public/, then assets/uploads is sibling
        $uploadDir = __DIR__ . '/assets/uploads/';

        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) { // 0755 for directory permissions
                $_SESSION['profile_update'] = "Failed to create upload directory.";
                header("Location: profile-page.php");
                exit();
            }
        }
        $uploadPath = $uploadDir . $newFileName;

        if (move_uploaded_file($imageTmpPath, $uploadPath)) {
            // Update database with new image filename
            $stmt = $conn->prepare("UPDATE users SET user_img = ? WHERE id = ?");
            if ($stmt === false) {
                error_log("Database prepare error for image update: " . $conn->error);
                $_SESSION['profile_update'] = "Database update failed. (Error: Prepare Image)";
            } else {
                $stmt->bind_param("si", $newFileName, $id);
                if ($stmt->execute()) {
                    $_SESSION['profile_update'] = "Profile picture updated successfully!";
                    // Update the displayed image path immediately after successful upload
                    $imagePath = 'assets/uploads/' . $newFileName;
                } else {
                    error_log("Database execute error for image update: " . $stmt->error);
                    $_SESSION['profile_update'] = "Database update failed. (Error: Execute Image)";
                }
                $stmt->close();
            }
        } else {
            $_SESSION['profile_update'] = "Failed to move uploaded file. Check directory permissions.";
            error_log("Failed to move uploaded file from " . $imageTmpPath . " to " . $uploadPath);
        }
    } else {
        $_SESSION['profile_update'] = "Invalid file type. Allowed: JPG, JPEG, PNG, WEBP.";
    }

    header("Location: profile-page.php"); // Redirect to self to prevent form resubmission
    exit();
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($user['username']) ?>'s Profile</title>
    <link rel='stylesheet' type='text/css' media='screen' href='main.css'> 
    <style>
        /* Your existing CSS for upload-label and messages */
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
            display: flex; /* Changed from 'display:flex' to 'display: block' or adjust as needed for centering */
            text-align: center;
            color: #2ca428;
            background-color: #d8f8d7;
            font-family: 'zabal';
            margin-top: 16px;
            color: green;
            font-weight: bold;
            border-radius: 10px;
            margin-left: auto; /* For centering */
            margin-right: auto; /* For centering */
        }
        /* Added more specific styles for overall layout as your original CSS was not provided */
        body {
            font-family: sans-serif;
            margin: 0;
            background-color: #f4f4f4; /* Light background */
            color: #333;
        }
        .profile-container {
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            text-align: center;
        }
        #title-profile img {
            max-width: 100%;
            height: auto;
            margin-bottom: 20px;
        }
        h2 {
            color: #003297;
        }
        .info-cont {
            display: flex;
            flex-direction: column; /* Stack elements vertically */
            align-items: center; /* Center horizontally */
            margin-top: 30px;
        }
        #text-info p {
            margin: 10px 0;
            font-size: 1.1em;
            color: #555;
        }
        button {
            padding: 10px 15px;
            background-color: #003297;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            margin-top: 20px;
        }
        button:hover {
            opacity: 0.9;
        }
        #theme-toggle {
            /* Your theme toggle styles */
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #ccc; /* Placeholder */
        }
    </style>

</head>

<body>
    <div class="profile-container">
        <button id="theme-toggle"></button>

        <a href="index.php" target="_self"><button style="top: 10px; left:20px; display: grid; position: fixed;">← Return to Homepage</button></a>

        <div id="title-profile">
            <img id="theme-image" src="assets/images/roomzy-logo-dark.png" alt="iBulong" width="400px" height="auto">
        </div>

        <?php if (isset($_SESSION['profile_update'])): ?>
            <p class="upload-message"><?= htmlspecialchars($_SESSION['profile_update']) ?></p>
            <?php unset($_SESSION['profile_update']); // Clear message after displaying ?>
        <?php endif; ?>

        <h2>Welcome, <?= htmlspecialchars($user['username']) ?></h2>
        <div class="info-cont">
            <form method="POST" enctype="multipart/form-data" id="uploadForm">
                <input type="hidden" name="profile_update_trigger" value="1"> <label for="adj-img" class="upload-label"></label>
                <input type="file" name="user_img" id="adj-img" accept="image/*">
            </form>

            <div id="text-info">
                <p>Username: <?= htmlspecialchars($user['username']) ?></p>
                <p>Email: <?= htmlspecialchars($user['email']) ?></p>
                <p>Password: (hidden for security)</p> </div>
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
                    uploadForm.submit(); // Automatically submit form when file is selected
                }
            });
        });
    </script>


</body>

</html>