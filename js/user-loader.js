// js/user-loader.js
import { supabase } from './supabase-client.js';

// 1. EL DISEÑO HTML DEL COMPONENTE (Guardado como texto)
const USER_CARD_TEMPLATE = `
    <div class="mt-auto border-t border-white/5 p-4">
        <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer" onclick="window.location.href='profile.html'">
            
            <div id="user-avatar-container" class="h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
                <span id="user-initial">U</span>
            </div>

            <div class="min-w-0 flex-1">
                <p id="user-name-display" class="text-sm font-bold text-white truncate">Cargando...</p>
                <p id="user-email-display" class="text-[10px] text-gray-400 truncate">...</p>
            </div>
            
            <button id="logout-btn" title="Cerrar Sesión" class="p-1.5 rounded-full hover:bg-red-500/20 hover:text-red-400 text-gray-500 transition">
                <span class="material-symbols-outlined text-[18px]">logout</span>
            </button>
        </div>
    </div>
`;

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // A. Inyectar el diseño donde encuentre el "slot"
    injectUserComponent();
    
    // B. Llenar los datos reales
    await loadUserProfile();
    setupLogout();
});

// --- FUNCIÓN PARA INYECTAR EL HTML (LA MAGIA) ---
function injectUserComponent() {
    // Buscamos la "caja vacía" en el HTML por su ID
    const slot = document.getElementById('sidebar-user-slot');
    
    if (slot) {
        // Le metemos el HTML adentro
        slot.innerHTML = USER_CARD_TEMPLATE;
        // Opcional: Copiamos clases si queremos que ocupe espacio específico
        slot.classList.add('mt-auto'); 
    }
}

// --- FUNCIÓN DE DATOS (IGUAL QUE ANTES) ---
async function loadUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const email = user.email;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url;

    // Actualizamos los elementos que ACABAMOS de inyectar
    const nameEls = document.querySelectorAll('#user-name-display'); 
    nameEls.forEach(el => el.innerText = capitalize(fullName));

    const emailEls = document.querySelectorAll('#user-email-display');
    emailEls.forEach(el => el.innerText = email);

    const avatarContainers = document.querySelectorAll('#user-avatar-container');
    const initialEls = document.querySelectorAll('#user-initial');

    if (avatarUrl) {
        avatarContainers.forEach(container => {
            container.innerHTML = `<img src="${avatarUrl}" class="h-full w-full rounded-full object-cover" alt="Avatar">`;
        });
    } else {
        const initial = fullName.charAt(0).toUpperCase();
        initialEls.forEach(el => el.innerText = initial);
    }
}

function setupLogout() {
    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirm = window.confirm("¿Seguro que quieres cerrar sesión?");
            if (confirm) {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    });
}

function capitalize(str) {
    if(!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}