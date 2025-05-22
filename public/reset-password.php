<?php
session_start();
require_once 'config.php';

if (!isset($_SESSION['otp_verified']) || !isset($_SESSION['email'])) {
    header("Location: login-page.php");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['new_password'])) {
    $newPassword = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
    $email = $_SESSION['email'];

    $stmt = $conn->prepare("UPDATE users SET password = ?, reset_otp = NULL, otp_expiry = NULL WHERE email = ?");
    $stmt->bind_param("ss", $newPassword, $email);
    $stmt->execute();

    session_unset();
    session_destroy();

    header("Location: login-page.php?reset=success");
    exit();
}
?>

<form method="POST">
    <label>New Password:</label>
    <input type="password" name="new_password" required>
    <button type="submit">Reset Password</button>
</form>
