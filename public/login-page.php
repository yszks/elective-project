<?php
session_start();

$errors = [
    'login' => $_SESSION['login_error'] ?? '',
    'register' => $_SESSION['register_error'] ?? '',
    'forgot' => $_SESSION['forgot_error'] ?? '',
    'otp' => $_SESSION['otp_error'] ?? '',
    'reset' => $_SESSION['reset_error'] ?? ''
];

$activeForm = $_SESSION['active_form'] ?? 'login';

function showError($error)
{
    return !empty($error) ? "<p class='error-message'>$error</p>" : '';
}

function isActiveForm($formName, $activeForm)
{
    return $formName === $activeForm ? 'active' : '';
}


?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to iBulong</title>
    <link rel='stylesheet' type='text/css' media='screen' href='main.css'>
</head>

<body>
    <div class="main-container">
        <div id="pic-logo">
            <img id="theme-login" src="assets/images/roomzy-logo-dark.png" alt="iBulong" width="700px" height="auto">
        </div>
        <button id="theme-toggle"></button>


        <div class="form-box <?= isActiveForm('register', $activeForm); ?>" id="regist-form">
            <form action="login_register.php" method="POST">
                <input type="hidden" name="active_form" value="register">
                <h2>Register Form</h2>
                <?= showError($errors['register']); ?>
                <input type="text" name="username" placeholder="Username" required><br>
                <input type="email" name="email" placeholder="Email" required><br>
                <input type="password" name="password" placeholder="Password" required><br>
                <button type="submit" name="register">Register</button>
                <p>Already have an account? <a href="#" onclick="showForm('log-form')">Login</a></p>
            </form>
        </div>

        <div class="form-box <?= isActiveForm('login', $activeForm); ?>" id="log-form">

            <form action="login_register.php" method="POST">
                <input type="hidden" name="active_form" value="login">
                <h2>Login Form</h2>
                <?= showError($errors['login']); ?>
                <input type="email" name="email" placeholder="Email" required><br>
                <input type="password" name="password" placeholder="Password" required><br>
                <div class="forgor"><a href="#" onclick="showForm('forgot-form')">Forgot password?</a></div>
                <button type="submit" name="login">Login</button>
                <p>Don't have an account? <a href="#" onclick="showForm('regist-form')">Register</a></p>
            </form>
        </div>


        <!-- FORGOT PASSWORD FORM -->
        <div class="form-box <?= isActiveForm('forgot', $activeForm); ?>" id="forgot-form">
            <form method="POST" action="login_register.php">
                <input type="hidden" name="active_form" value="forgot">
                <h3>Forgot Password?</h3>
                <?= showError($errors['forgot']); ?>
                <input type="email" name="email" placeholder="Email" required>
                <button type="submit" name="forgot">Continue</button>
            </form>
            <p><a href="back_to_login.php">Back to Login</a></p>
        </div>

        <!-- OTP FORM -->
        <div class="form-box <?= isActiveForm('otp', $activeForm); ?>" id="otp-form">
            <form method="POST" action="verify_otp.php">
                <h2>Enter OTP</h2>
                <label>OTP sent to your email: <?= htmlspecialchars($_SESSION['email'] ?? '') ?></label>
                <?= showError($errors['otp']); ?>
                <input type="text" name="otp" required placeholder="Enter OTP">
                <button type="submit" name="verify_otp">Verify</button>
            </form>
            <p><a href="back_to_login.php">Back to Login</a></p>
        </div>

        <!-- RESET PASSWORD FORM -->
        <div class="form-box <?= isActiveForm('reset', $activeForm); ?>" id="reset-form">
            <form method="POST" action="reset_password.php">
                <h2>Reset Password</h2>
                <?= showError($errors['reset']); ?>
                <input type="password" name="new_password" placeholder="New Password" required>
                <input type="password" name="confirm_password" placeholder="Confirm Password" required>
                <button type="submit" name="reset_password">Reset</button>
            </form>
        </div>

    </div>
    <script src="script.js" defer></script>
    <script src="theme.js" defer></script>

    <?php
    // SAFELY unset individual session vars *after* the page has rendered
    unset($_SESSION['login_error']);
    unset($_SESSION['register_error']);
    unset($_SESSION['forgot_error']);
    unset($_SESSION['otp_error']);
    unset($_SESSION['reset_error']);
    unset($_SESSION['active_form']);
    ?>
</body>

</html>