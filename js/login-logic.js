// js/login-logic.js
import { checkSession, loginUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si ya tiene sesión (para redirigir al dashboard)
    checkSession();

    setupLoginForm();
    setupPasswordToggle();
});

function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');

    // Función de Login
    const handleLogin = async () => {
        const email = emailInput.value;
        const pass = passInput.value;
        const btnText = loginBtn.querySelector('span'); // El primer span (texto)

        if (!email || !pass) {
            alert("Por favor ingresa usuario y contraseña");
            return;
        }

        // Efecto visual "Cargando..."
        const originalText = btnText.innerText;
        btnText.innerText = "Verificando...";
        loginBtn.classList.add('opacity-70', 'cursor-not-allowed');

        // Intentar Login
        const success = await loginUser(email, pass);

        if (!success) {
            // Si falla, restaurar botón
            btnText.innerText = originalText;
            loginBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    };

    // Click en botón
    loginBtn.addEventListener('click', handleLogin);

    // Enter en el teclado
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

function setupPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passInput = document.getElementById('password');
    const icon = toggleBtn.querySelector('span');

    toggleBtn.addEventListener('click', () => {
        if (passInput.type === "password") {
            passInput.type = "text";
            icon.innerText = "visibility_off";
            icon.classList.add('text-primary');
        } else {
            passInput.type = "password";
            icon.innerText = "visibility";
            icon.classList.remove('text-primary');
        }
    });
}