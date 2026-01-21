// js/auth.js
import { supabase } from './supabase-client.js';

// Función principal de seguridad
export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();

    // Obtenemos el nombre del archivo actual (ej: "dashboard.html")
    const currentPage = window.location.pathname.split('/').pop();

    // REGLA 1: Si NO hay sesión y NO estamos en el login -> Expulsar
    if (!session && currentPage !== 'index.html') {
        window.location.href = 'index.html';
    }

    // REGLA 2: Si SÍ hay sesión y estamos en el login -> Mandar adentro
    if (session && currentPage === 'index.html') {
        window.location.href = 'dashboard.html';
    }
}

// Función para Iniciar Sesión (La usará el botón de Login)
export async function loginUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert("Error: " + error.message); // O algo más bonito después
        return false;
    } else {
        window.location.href = 'dashboard.html';
        return true;
    }
}

// Función para Cerrar Sesión
export async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'index.html';
    }
}