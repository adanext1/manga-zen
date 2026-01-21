// js/history-logic.js
import { supabase } from './supabase-client.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

initHistory();

async function initHistory() {
    const container = document.getElementById('history-container');
    const emptyState = document.getElementById('empty-state');

    // 1. Usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // 2. Pedir Historial (Ordenado por más reciente)
    const { data: historyData, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false })
        .limit(50); // Traemos los últimos 50 para no saturar

    if (error) { console.error(error); return; }

    if (!historyData || historyData.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    // 3. Obtener Portadas (Batch Request para optimizar)
    // Recolectamos IDs únicos de manga
    const mangaIds = [...new Set(historyData.map(item => item.manga_id))];
    const coversMap = await fetchCoversBatch(mangaIds);

    // 4. Agrupar por Fechas
    const groups = {
        'Hoy': [],
        'Ayer': [],
        'Esta Semana': [],
        'Anterior': []
    };

    historyData.forEach(item => {
        const dateGroup = getDateLabel(item.last_read);
        groups[dateGroup].push(item);
    });

    // 5. Renderizar
    container.innerHTML = '';
    
    // Orden de renderizado fijo
    const order = ['Hoy', 'Ayer', 'Esta Semana', 'Anterior'];

    order.forEach(label => {
        const items = groups[label];
        if (items.length > 0) {
            // Título de la sección
            const section = document.createElement('div');
            section.className = 'mb-6 animate-fade-in';
            section.innerHTML = `
                <div class="flex items-center justify-between px-1 mb-3">
                    <h3 class="text-sm font-bold text-primary uppercase tracking-wider">${label}</h3>
                    <span class="text-xs font-medium text-gray-500">${items.length} Caps</span>
                </div>
            `;
            
            // Lista de tarjetas
            items.forEach(item => {
                const coverUrl = coversMap[item.manga_id] || 'https://via.placeholder.com/100x150?text=No+Cover';
                const timeStr = new Date(item.last_read).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Calcular un progreso falso visual (porque no sabemos el total de páginas real aquí, pero PageNum ayuda)
                // Usamos un valor random estético o basado en pagina > 1
                const progressWidth = item.page_number > 1 ? 'w-[40%]' : 'w-[5%]'; 

                const card = `
                    <div onclick="window.location.href='reader.html?chapter=${item.chapter_id}'" 
                         class="group relative flex items-center gap-4 p-3 mb-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 active:scale-[0.98] cursor-pointer">
                        
                        <div class="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-lg bg-gray-800 shadow-inner">
                            <img src="${coverUrl}" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                        </div>

                        <div class="flex flex-1 flex-col justify-center min-w-0 py-1">
                            <h4 class="truncate text-base font-bold text-white leading-tight mb-1">${item.manga_title || 'Manga Sin Título'}</h4>
                            <div class="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <span class="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">Cap. ${item.chapter_num}</span>
                                <span>•</span>
                                <span>${timeStr}</span>
                            </div>
                        </div>

                        <div class="flex shrink-0 flex-col items-end gap-1.5 justify-center pr-1">
                            <span class="text-xs font-bold text-primary">Pág ${item.page_number}</span>
                            <div class="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                                <div class="h-full bg-primary ${progressWidth} rounded-full shadow-[0_0_8px_rgba(140,37,244,0.3)]"></div>
                            </div>
                        </div>
                    </div>
                `;
                section.innerHTML += card;
            });
            container.appendChild(section);
        }
    });
}

// --- UTILIDADES ---

// Función para obtener portadas en lote (Evita hacer 50 peticiones)
async function fetchCoversBatch(mangaIds) {
    const map = {};
    if (mangaIds.length === 0) return map;

    try {
        const url = new URL(`${BASE_URL}/manga`);
        // Añadimos ?ids[]=...&ids[]=...
        mangaIds.forEach(id => url.searchParams.append('ids[]', id));
        url.searchParams.append('limit', mangaIds.length);
        url.searchParams.append('includes[]', 'cover_art');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        json.data.forEach(manga => {
            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            if (coverRel) {
                const fileName = coverRel.attributes.fileName;
                map[manga.id] = PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.256.jpg`);
            }
        });
    } catch (e) {
        console.error("Error cargando portadas:", e);
    }
    return map;
}

// Función para etiquetar fechas
function getDateLabel(isoDate) {
    const date = new Date(isoDate);
    const now = new Date();
    
    // Normalizar a medianoche para comparar días
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (checkDate.getTime() === today.getTime()) return 'Hoy';
    if (checkDate.getTime() === yesterday.getTime()) return 'Ayer';
    
    const diffTime = Math.abs(today - checkDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 7) return 'Esta Semana';
    return 'Anterior';
}

// Función global para borrar historial
window.clearAllHistory = async () => {
    if (!confirm("¿Seguro que quieres borrar TODO tu historial de lectura? Esta acción no se puede deshacer.")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        alert("Error al borrar historial");
    } else {
        // Recargar para ver vacío
        initHistory();
    }
};