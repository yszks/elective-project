<?php
session_start();

error_reporting(E_ALL);
ini_set('display_errors', 1);
// --- DEBUGGING END ---

// IMPORTANT: Replace 'seupbvvg4y2j' with your actual cPanel username
$config_path = '/home/seupbvvg4y2j/config/config.php';

// Check if config.php exists and include it
if (file_exists($config_path)) {
    require_once $config_path;
} else {
    error_log("CRITICAL ERROR: config.php not found at " . $config_path);
    $_SESSION['login_error'] = "A critical configuration error occurred. Please try again later.";
    $_SESSION['active_form'] = 'login'; // Keep on login form
    header("Location: login-page.php");
    exit();
}

// Check if the database connection ($conn) was successfully established
if (!isset($conn) || !$conn->ping()) {
    error_log("CRITICAL ERROR: Database connection failed or \$conn not set after config.php inclusion.");
    $_SESSION['login_error'] = "A critical database connection error occurred. Please try again later.";
    $_SESSION['active_form'] = 'login'; // Keep on login form
    header("Location: login-page.php");
    exit();
}

// Store which form was submitted in session for redirection
if (isset($_POST['active_form'])) {
    $_SESSION['active_form'] = $_POST['active_form'];
}


// --- REGISTER LOGIC ---
if (isset($_POST['register'])) {
    $username = trim($_POST['username']);
    $email = trim($_POST['email']);
    $password = $_POST['password']; // Raw password for hashing
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $user_img = 'default.png';

    // Validate inputs
    if (empty($username) || empty($email) || empty($password)) {
        $_SESSION['register_error'] = 'All fields are required.';
        $_SESSION['active_form'] = 'register';
        header("Location: login-page.php");
        exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $_SESSION['register_error'] = 'Invalid email format.';
        $_SESSION['active_form'] = 'register';
        header("Location: login-page.php");
        exit();
    }
    if (strlen($password) < 6) { // Example password length
        $_SESSION['register_error'] = 'Password must be at least 6 characters.';
        $_SESSION['active_form'] = 'register';
        header("Location: login-page.php");
        exit();
    }


    // Check if email already exists using prepared statement
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    if ($stmt === false) {
        error_log("Register email check prepare error: " . $conn->error);
        $_SESSION['register_error'] = "Database error during registration check.";
        $_SESSION['active_form'] = 'register';
        header("Location: login-page.php");
        exit();
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result(); // Store result for num_rows
    if ($stmt->num_rows > 0) {
        $_SESSION['register_error'] = 'Email is already registered!';
        $_SESSION['active_form'] = 'register';
        $stmt->close(); // Close statement
        header("Location: login-page.php");
        exit();
    }
    $stmt->close(); // Close statement


    // Insert new user using prepared statement
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, user_img) VALUES (?, ?, ?, ?)");
    if ($stmt === false) {
        error_log("Register insert prepare error: " . $conn->error);
        $_SESSION['register_error'] = "Database error during registration.";
        $_SESSION['active_form'] = 'register';
        header("Location: login-page.php");
        exit();
    }
    $stmt->bind_param("ssss", $username, $email, $hashed_password, $user_img);
    if ($stmt->execute()) {
        $_SESSION['login_success'] = 'Registration successful! You can now log in.'; // Set a success message for login page
        $_SESSION['active_form'] = 'login'; // Go back to login form after successful registration
    } else {
        error_log("Register insert execute error: " . $stmt->error);
        $_SESSION['register_error'] = 'Registration failed. Please try again.';
        $_SESSION['active_form'] = 'register';
    }
    $stmt->close(); // Close statement

    header("Location: login-page.php");
    exit();
}


// --- LOGIN LOGIC ---
if (isset($_POST['login'])) {
    $email = trim($_POST['email']);
    $password = $_POST['password'];

    // Use prepared statement for login
    $stmt = $conn->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    if ($stmt === false) {
        error_log("Login prepare error: " . $conn->error);
        $_SESSION['login_error'] = "Database error during login process.";
        $_SESSION['active_form'] = 'login';
        header("Location: login-page.php");
        exit();
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        if (password_verify($password, $user['password'])) {
            // SUCCESSFUL LOGIN: Set the session 'id'
            $_SESSION['id'] = $user['id']; // THIS IS THE FIX!
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];

            $stmt->close(); // Close statement before redirect

            // Redirect to index.php (or profile-page.php directly if preferred)
            header("Location: ../index.php"); // Assuming index.php is one level up from login_register.php
            exit();
        }
    }

    // If we reach here, login failed (email not found or password incorrect)
    $_SESSION['login_error'] = 'Incorrect email or password';
    $_SESSION['active_form'] = 'login';
    $stmt->close(); // Close statement
    header("Location: login-page.php");
    exit();
}


// --- FORGOT PASSWORD LOGIC ---
if (isset($_POST['forgot'])) {
    $email = trim($_POST['email']);

    // Use prepared statement to check if email exists
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE email = ?");
    if ($stmt === false) {
        error_log("Forgot password prepare error: " . $conn->error);
        $_SESSION['forgot_error'] = "Database error during password reset request.";
        $_SESSION['active_form'] = 'forgot';
        header("Location: login-page.php");
        exit();
    }
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        $_SESSION['email'] = $email; // Store email for OTP page
        $_SESSION['user_id_for_reset'] = $user['id']; // Store user ID for reset process
        $_SESSION['otp'] = rand(100000, 999999); // Simple 6-digit OTP

        // TODO: Implement actual email sending with the OTP here!
        // This is crucial for a real forgot password flow.
        // You'll need PHPMailer or similar.
        error_log("OTP generated for " . $email . ": " . $_SESSION['otp']); // Log OTP for debugging

        $_SESSION['forgot'] = "We've sent a password reset OTP to your email - " . htmlspecialchars($email);
        $_SESSION['active_form'] = 'otp'; // Move to OTP form
    } else {
        $_SESSION['forgot_error'] = "Email address does not exist!";
        $_SESSION['active_form'] = 'forgot';
    }
    $stmt->close(); // Close statement

    header("Location: login-page.php");
    exit();
}

// If none of the POST actions are set, redirect back to login page
header("Location: login-page.php");
exit();