import { supabase } from './supabase-client.js';
// 🔥 IMPORTANTE: Importamos la configuración maestra
import { APP_MODULES } from './modules.js';

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

async function initProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if(!user) { window.location.href = 'index.html'; return; }

    // 1. CARGAR DATOS DE USUARIO (Visual)
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url;

    const nameEl = document.getElementById('profile-name-big');
    const emailEl = document.getElementById('profile-email-big');
    
    if(nameEl) nameEl.innerText = name.charAt(0).toUpperCase() + name.slice(1);
    if(emailEl) emailEl.innerText = user.email;

    if(avatarUrl) {
        const container = document.getElementById('profile-avatar-big');
        if(container) {
            container.innerHTML = `<img src="${avatarUrl}" class="h-full w-full object-cover">`;
            container.classList.remove('bg-[#1E1E1E]', 'flex', 'items-center', 'justify-center');
        }
    }

    // 2. 🔥 RENDERIZAR INTERRUPTORES (Dinámico desde modules.js)
    renderSettingsUI();

    // 3. CARGAR ESTADÍSTICAS Y CONFIGURACIÓN
    await loadStatsAndRank(user.id);
    await loadUserSettings(user.id);

    // 4. EVENTOS
    const btnSave = document.getElementById('btn-save-settings');
    if(btnSave) btnSave.onclick = () => saveUserSettings(user.id);
    
    const btnLogout = document.getElementById('logout-main-btn');
    if(btnLogout) btnLogout.onclick = async () => {
        if(confirm("¿Estás seguro de cerrar sesión?")) {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        }
    };

    // Preferencias Locales (Idioma, NSFW)
    setupLocalPreferences();
}

// ==========================================
// 1. GENERADOR DE UI (LA PARTE NUEVA)
// ==========================================
function renderSettingsUI() {
    const container = document.getElementById('settings-container');
    // Si no existe el contenedor (quizás no actualizaste el HTML del perfil), salimos para no dar error
    if (!container) return; 

    container.innerHTML = ''; // Limpiar

    APP_MODULES.forEach(mod => {
        // Creamos el HTML para cada módulo definido en modules.js
        const html = `
        <label class="flex items-center justify-between cursor-pointer group p-4 hover:bg-white/5 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${mod.color}">
                    <span class="material-symbols-outlined text-lg">${mod.icon}</span>
                </div>
                <span class="font-medium text-gray-200">Ver ${mod.name}</span>
            </div>
            <input type="checkbox" id="check-${mod.id}" class="sr-only peer setting-toggle" data-col="${mod.db_col}">
            <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary relative"></div>
        </label>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// 2. LÓGICA DE CONFIGURACIÓN (SUPABASE)
// ==========================================
async function loadUserSettings(userId) {
    let { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();

    if (!data) {
        // Configuración por defecto dinámica
        const defaultSettings = { user_id: userId };
        APP_MODULES.forEach(m => defaultSettings[m.db_col] = true);
        
        await supabase.from('user_settings').insert(defaultSettings);
        data = defaultSettings;
    }

    // Marcar los checkboxes dinámicamente
    APP_MODULES.forEach(mod => {
        const checkbox = document.getElementById(`check-${mod.id}`);
        // Solo intentamos marcarlo si el checkbox existe en el HTML
        if(checkbox) {
            checkbox.checked = data[mod.db_col];
        }
    });
}

async function saveUserSettings(userId) {
    const btn = document.getElementById('btn-save-settings');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> Guardando...`;
    btn.disabled = true;

    // 1. Construir objeto de configuración dinámicamente
    const newConfig = {};
    
    APP_MODULES.forEach(mod => {
        const checkbox = document.getElementById(`check-${mod.id}`);
        // 🔥 AQUÍ ESTABA EL ERROR: Verificamos que 'checkbox' exista antes de leer '.checked'
        if (checkbox) {
            newConfig[mod.db_col] = checkbox.checked;
        }
    });

    const { error } = await supabase.from('user_settings').update(newConfig).eq('user_id', userId);

    if (error) {
        alert("Error: " + error.message);
        btn.innerHTML = originalText;
    } else {
        btn.innerHTML = `<span class="material-symbols-outlined">check</span> ¡Guardado!`;
        btn.className = "w-full mt-3 py-3 rounded-xl bg-green-600 text-white text-sm font-bold transition-all border border-green-500 flex items-center justify-center gap-2";
        
        setTimeout(() => { 
            btn.innerHTML = originalText; 
            btn.className = "w-full mt-3 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2";
            btn.disabled = false;
        }, 2000);
    }
}

// ==========================================
// 3. ESTADÍSTICAS Y RANGOS
// ==========================================
async function loadStatsAndRank(userId) {
    const { count: libCount } = await supabase.from('library').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const libEl = document.getElementById('stat-library');
    if(libEl) libEl.innerText = libCount || 0;

    const { count: readCount } = await supabase.from('reading_progress').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    
    const totalConsumed = readCount || 0;
    const chapEl = document.getElementById('stat-chapters');
    if(chapEl) chapEl.innerText = totalConsumed;

    let rank = "Explorador";
    let icon = "hiking"; 
    let color = "text-gray-400";
    let border = "border-gray-500";

    if (totalConsumed > 10) { rank = "Fan Dedicado"; icon = "favorite"; color = "text-pink-400"; border = "border-pink-500/50"; }
    if (totalConsumed > 50) { rank = "Maratoneador"; icon = "local_fire_department"; color = "text-orange-400"; border = "border-orange-500/50"; }
    if (totalConsumed > 100) { rank = "Otaku Supremo"; icon = "military_tech"; color = "text-primary"; border = "border-primary/50"; }
    if (totalConsumed > 500) { rank = "Dios del Server"; icon = "crown"; color = "text-yellow-400"; border = "border-yellow-500/50"; }

    const badge = document.getElementById('rank-badge');
    if(badge) {
        badge.innerHTML = `<span class="material-symbols-outlined text-[16px]">${icon}</span><span>${rank}</span>`;
        badge.className = `inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-bold mt-3 border ${border} ${color}`;
    }
}

// ==========================================
// 4. PREFERENCIAS LOCALES
// ==========================================
function setupLocalPreferences() {
    const nsfwToggle = document.getElementById('nsfw-toggle');
    const langSelect = document.getElementById('pref-lang');

    if(nsfwToggle) {
        nsfwToggle.checked = localStorage.getItem('mangazen_nsfw') === 'true';
        nsfwToggle.addEventListener('change', (e) => localStorage.setItem('mangazen_nsfw', e.target.checked));
    }
    
    if(langSelect) {
        langSelect.value = localStorage.getItem('mangazen_lang') || 'es';
        langSelect.addEventListener('change', (e) => localStorage.setItem('mangazen_lang', e.target.value));
    }
}