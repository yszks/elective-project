<?php
session_start();
unset($_SESSION['email']);
unset($_SESSION['otp']);
$_SESSION['active_form'] = 'login';
header("Location: login-page.php");
exit();
