document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login');
    const signupForm = document.getElementById('signup');
    const loginContainer = document.getElementById('login-form');
    const signupContainer = document.getElementById('signup-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');

    // --- Check URL Hash for Signup ---
    if (window.location.hash === '#signup') {
        loginContainer.classList.remove('active');
        signupContainer.classList.add('active');
    }

    // --- Toggle between Login & Signup ---
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.remove('active');
        signupContainer.classList.add('active');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.classList.remove('active');
        loginContainer.classList.add('active');
    });

    // --- Handle Login ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value;

        // Simple validation (You can add real password check logic here)
        if (username && pass.length >= 6) {
            // Save the session
            localStorage.setItem('currentUser', username);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            alert("Please enter a valid username and password (min 6 chars).");
        }
    });

    // --- Handle Signup ---
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;
        const confirmPass = document.getElementById('signup-confirm-password').value;

        if (pass !== confirmPass) {
            alert("Passwords do not match!");
            return;
        }

        // In a real app, you'd save this to a database. 
        // Here, we just log them in immediately as a new user.
        localStorage.setItem('currentUser', username);

        // Because script.js uses expenses_${username}, 
        // this new user starts with 0 data automatically.
        window.location.href = 'dashboard.html';
    });

    // --- Password Toggle Visibility ---
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            btn.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
        });
    });
});