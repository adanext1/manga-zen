import { supabase } from './supabase-client.js';

// HTML DEL COMPONENTE
const NOTIFICATION_HTML = `
    <div class="relative">
        <button id="notif-btn" class="relative p-2 text-gray-400 hover:text-white transition-colors outline-none">
            <span class="material-symbols-outlined text-[24px]">notifications</span>
            <span id="notif-badge" class="hidden absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#18181b]"></span>
        </button>

        <div id="notif-panel" class="hidden absolute right-0 mt-3 w-80 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5">
            <div class="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 class="text-xs font-bold text-gray-300 uppercase tracking-wider">Notificaciones</h3>
                <button id="mark-read-btn" class="text-[10px] text-primary hover:text-white transition-colors">Marcar leídas</button>
            </div>
            <div id="notif-list" class="max-h-64 overflow-y-auto custom-scrollbar">
                <div class="p-6 text-center">
                    <span class="material-symbols-outlined text-gray-600 text-3xl mb-2">notifications_off</span>
                    <p class="text-xs text-gray-500">Sin novedades por ahora.</p>
                </div>
            </div>
        </div>
    </div>
`;

// LÓGICA DE INICIALIZACIÓN
export async function initNotifications(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Inyectar HTML
    container.innerHTML = NOTIFICATION_HTML;

    // 2. Referencias al DOM
    const btn = container.querySelector('#notif-btn');
    const panel = container.querySelector('#notif-panel');
    const badge = container.querySelector('#notif-badge');
    const list = container.querySelector('#notif-list');
    const markBtn = container.querySelector('#mark-read-btn');

    // 3. Event Listeners
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
    });

    // Cerrar si clic fuera
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });

    markBtn.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(user) {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
            badge.classList.add('hidden');
            checkNotifs(); // Recargar visualmente
        }
    });

    // 4. Lógica de Supabase
    async function checkNotifs() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data && data.length > 0) {
            renderList(data);
            const hasUnread = data.some(n => !n.is_read);
            if(hasUnread) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
    }

    function renderList(notifs) {
        let html = '';
        notifs.forEach(n => {
            const bgClass = n.is_read ? 'bg-transparent opacity-70' : 'bg-primary/5 border-l-2 border-primary';
            const time = new Date(n.created_at).toLocaleDateString();
            
            html += `
                <div class="p-3 border-b border-white/5 ${bgClass} hover:bg-white/5 transition-colors cursor-pointer group">
                    <p class="text-sm text-gray-200 leading-tight group-hover:text-white">${n.message}</p>
                    <span class="text-[10px] text-gray-500 mt-1 block">${time}</span>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    // 5. Arrancar
    checkNotifs();
    // Chequear cada 60 segs
    setInterval(checkNotifs, 60000);
}

// Auto-iniciar si encuentra el contenedor específico
document.addEventListener('DOMContentLoaded', () => {
    initNotifications('header-actions-container');
});