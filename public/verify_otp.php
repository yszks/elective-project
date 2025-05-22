<?php
session_start();
if ($_POST['otp'] == $_SESSION['otp']) {
    $_SESSION['active_form'] = 'reset';
    header("Location: login-page.php");
    exit();
} else {
    $_SESSION['otp_error'] = "Invalid OTP!";
    $_SESSION['active_form'] = 'otp';
    header("Location: login-page.php");
    exit();
}

?>
