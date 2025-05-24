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
    <style>
        /* Basic styles for layout if main.css isn't loaded or comprehensive */
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f4f4f4; margin: 0; }
        .main-container { display: flex; flex-direction: column; align-items: center; width: 90%; max-width: 1000px; padding: 20px; box-shadow: 0 0 15px rgba(0,0,0,0.1); background-color: #fff; border-radius: 10px; position: relative;}
        #pic-logo img { max-width: 100%; height: auto; margin-bottom: 20px; }
        .form-box { display: none; margin-top: 20px; width: 100%; max-width: 400px; padding: 25px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
        .form-box.active { display: block; }
        .form-box h2, .form-box h3 { text-align: center; color: #333; margin-bottom: 20px; }
        .form-box input[type="text"], .form-box input[type="email"], .form-box input[type="password"] {
            width: calc(100% - 20px);
            padding: 10px;
            margin-bottom: 15px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .form-box button {
            width: 100%;
            padding: 10px;
            background-color: #003297;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1.1em;
        }
        .form-box button:hover { opacity: 0.9; }
        .form-box p { text-align: center; margin-top: 15px; }
        .form-box a { color: #003297; text-decoration: none; }
        .form-box a:hover { text-decoration: underline; }
        .error-message { color: red; text-align: center; margin-bottom: 10px; }
        .forgor { text-align: right; margin-bottom: 15px; }
        #theme-toggle { position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background-color: #ccc; cursor: pointer; }

        /* Specific for OTP form label */
        #otp-form label {
            display: block;
            text-align: center;
            margin-bottom: 15px;
            font-weight: bold;
            color: #555;
        }
    </style>
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


        <div class="form-box <?= isActiveForm('forgot', $activeForm); ?>" id="forgot-form">
            <form method="POST" action="login_register.php">
                <input type="hidden" name="active_form" value="forgot">
                <h3>Forgot Password?</h3>
                <?= showError($errors['forgot']); ?>
                <input type="email" name="email" placeholder="Email" required>
                <button type="submit" name="forgot">Continue</button>
            </form>
            <p><a href="#" onclick="showForm('log-form')">Back to Login</a></p>
        </div>

        <div class="form-box <?= isActiveForm('otp', $activeForm); ?>" id="otp-form">
            <form method="POST" action="verify_otp.php"> <h2>Enter OTP</h2>
                <label>OTP sent to your email: <?= htmlspecialchars($_SESSION['email'] ?? '') ?></label>
                <?= showError($errors['otp']); ?>
                <input type="text" name="otp" required placeholder="Enter OTP">
                <button type="submit" name="verify_otp">Verify</button>
            </form>
            <p><a href="#" onclick="showForm('log-form')">Back to Login</a></p>
        </div>

        <div class="form-box <?= isActiveForm('reset', $activeForm); ?>" id="reset-form">
            <form method="POST" action="reset_password.php"> <h2>Reset Password</h2>
                <?= showError($errors['reset']); ?>
                <input type="password" name="new_password" placeholder="New Password" required>
                <input type="password" name="confirm_password" placeholder="Confirm Password" required>
                <button type="submit" name="reset_password">Reset</button>
            </form>
        </div>

    </div>
    <script src="script.js" defer></script>
    <script src="theme.js" defer></script>

    <script>
        // JS function to toggle forms
        function showForm(formId) {
            const forms = document.querySelectorAll('.form-box');
            forms.forEach(form => form.classList.remove('active'));
            document.getElementById(formId).classList.add('active');
        }

        // Initialize form display based on PHP session
        document.addEventListener('DOMContentLoaded', function() {
            const activeFormId = '<?= htmlspecialchars($activeForm) ?>-form';
            const initialForm = document.getElementById(activeFormId);
            if (initialForm) {
                initialForm.classList.add('active');
            } else {
                // Default to login form if session doesn't specify or invalid
                document.getElementById('log-form').classList.add('active');
            }
        });
    </script>


    <?php
    // SAFELY unset individual session vars *after* the page has rendered
    // This clears messages so they don't reappear on subsequent visits
    unset($_SESSION['login_error']);
    unset($_SESSION['register_error']);
    unset($_SESSION['forgot_error']);
    unset($_SESSION['otp_error']);
    unset($_SESSION['reset_error']);
    // DO NOT unset $_SESSION['active_form'] here, as it's needed to remember which form to show
    ?>
</body>

</html>