<?php
session_start();
require_once '/home/seupbvvg4y2j/config/config.php';


if (isset($_POST['active_form'])) {
    $_SESSION['active_form'] = $_POST['active_form'];
}

if (isset($_POST['register'])) {
    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $user_img = 'default.png';


    $checkEmail = $conn->query("SELECT email FROM users WHERE email = '$email'");
    if ($checkEmail->num_rows > 0) {
        $_SESSION['register_error'] = 'Email is already registered!';
        $_SESSION['active_form'] = 'register';
    } else {
        $conn->query("INSERT INTO users (username, email, password, user_img) VALUES ('$username', '$email', '$password', 'default.png')");
    }

    header("Location: login-page.php");
    exit();
}

if (isset($_POST['login'])) {
    $email = $_POST['email'];
    $password = $_POST['password'];

    $result = $conn->query("SELECT * FROM users WHERE email = '$email'");
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['email'] = $user['email'];

            header("Location: ../index.php");
            exit();
        }
    }

    $_SESSION['login_error'] = 'Incorrect email or password';
    $_SESSION['active_form'] = 'login';
    header("Location: login-page.php");
    exit();
}

if (isset($_POST['forgot'])) {
    $email = $_POST['email'];

    $result = $conn->query("SELECT * FROM users WHERE email = '$email'");
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        $_SESSION['email'] = $email;
        $_SESSION['otp'] = rand(100000, 999999); // simple 6-digit OTP

        // TODO: Send OTP via email (you can use PHPMailer or mail())

        $_SESSION['forgot'] = "We've sent a password reset OTP to your email - " . $email;
        $_SESSION['active_form'] = 'otp';
    } else {
        $_SESSION['forgot_error'] = "Email address does not exist!";
        $_SESSION['active_form'] = 'forgot';
    }

    header("Location: login-page.php");
    exit();
}

