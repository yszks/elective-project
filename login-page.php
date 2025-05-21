<?php

session_start();

$errors = [
    'login' => $_SESSION['login_error'] ?? '',
    'register' => $_SESSION['register_error'] ?? ''
];
$activeForm = $_SESSION['active_form'] ?? 'login';

session_unset();

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
    <title>Register</title>
    <link rel='stylesheet' type='text/css' media='screen' href='main.css'>
</head>

<body>
    <div class="main-container">
        <div id="pic-logo">
            <img id="theme-image" src="assets/images/roomzy-logo-dark.png" alt="iBulong" width="700px" height="auto">
        </div>
        <button id="theme-toggle"></button>
        <div class="form-box <?= isActiveForm('register', $activeForm); ?>" id="regist-form">
            <form action="login_register.php" method="POST">
                <h2>Register</h2>
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
                <h2>Login</h2>
                <?= showError($errors['login']); ?>
                <input type="email" name="email" placeholder="Email" required><br>
                <input type="password" name="password" placeholder="Password" required><br>
                <button type="submit" name="login">Login</button>
                <p>Don't have an account? <a href="#" onclick="showForm('regist-form')">Register</a></p>
            </form>
        </div>
    </div>
    <script src="script.js" defer></script>
    <script src="theme.js" defer></script>
</body>

</html>