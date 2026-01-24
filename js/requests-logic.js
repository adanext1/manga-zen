import { supabase } from './supabase-client.js';

// 🔥 CONFIGURACIÓN: TU EMAIL DE ADMIN
// Pon aquí el correo exacto con el que te logueas en tu app
const ADMIN_EMAIL = "darkfire319@gmail.com"; // <--- CAMBIA ESTO POR TU EMAIL REAL

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    setupForm();
});

// ... (La función setupForm se queda igual que antes) ...

// --- CARGAR LISTA CON MODERACIÓN ---
async function loadRequests() {
    const listContainer = document.getElementById('requests-list');
    const { data: { user } } = await supabase.auth.getUser();
    
    // Verificamos si TÚ eres el que está viendo la página
    const isAdmin = user && user.email === ADMIN_EMAIL;

    const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) return; // Manejar error visualmente si quieres

    let html = '';
    data.forEach(req => {
        // Lógica de colores (igual que antes)
        let statusColor = 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        let statusIcon = 'schedule';
        let statusText = req.status;

        if(req.status === 'listo') {
            statusColor = 'bg-green-500/20 text-green-500 border-green-500/30';
            statusIcon = 'check_circle';
        }

        // BOTÓN DE ACCIÓN (SOLO PARA ADMIN)
        let adminActions = '';
        if (isAdmin && req.status !== 'listo') {
            adminActions = `
                <button onclick="markAsDone('${req.id}', '${req.user_id}', '${req.title}')" 
                    class="ml-4 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-green-900/50 transition-all flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">done_all</span> Subido
                </button>
            `;
        }

        html += `
            <div class="bg-surface border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-all">
                <div class="flex items-center gap-4">
                    <div class="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                        <span class="material-symbols-outlined">movie</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-200">${req.title}</h3>
                        <div class="flex items-center gap-2 text-xs text-gray-500">
                            <span>${req.category}</span>
                            <span>•</span>
                            <span>De: ${req.username}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center">
                    <div class="px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusColor}">
                        <span class="material-symbols-outlined text-[14px]">${statusIcon}</span>
                        ${statusText}
                    </div>
                    ${adminActions} </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

// --- FUNCIÓN QUE SE EJECUTA CUANDO LE DAS "SUBIDO" ---
window.markAsDone = async (reqId, userId, title) => {
    if(!confirm(`¿Confirmar que ya subiste "${title}"?`)) return;

    // 1. Actualizar estado de la petición a 'listo'
    const { error: reqError } = await supabase
        .from('requests')
        .update({ status: 'listo' })
        .eq('id', reqId);

    if (reqError) { alert('Error actualizando'); return; }

    // 2. CREAR NOTIFICACIÓN PARA EL USUARIO
    const message = `¡Buenas noticias! Tu petición de "${title}" ya está disponible en la web.`;
    
    const { error: notifError } = await supabase
        .from('notifications')
        .insert([{ 
            user_id: userId, 
            message: message,
            link: 'index.html' // O el link directo al video si lo tuvieras
        }]);

    if (notifError) console.error("Error enviando notificación", notifError);

    // 3. Recargar para ver cambios
    loadRequests();
    alert("¡Usuario notificado!");
};