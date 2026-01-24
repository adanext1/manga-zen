import { supabase } from './supabase-client.js';

// --- VARIABLES GLOBALES ---
let fullLibrary = []; // Cache para filtrar sin recargar

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initLibrary();
});

async function initLibrary() {
    const container = document.getElementById('library-container');
    const emptyState = document.getElementById('empty-state');
    const countLabel = document.getElementById('item-count');

    // 1. Verificar Usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = '<div class="text-center text-gray-500 py-20">Inicia sesión.</div>';
        return;
    }

    // 2. Pedir Biblioteca
    const { data: libraryData, error: libError } = await supabase
        .from('library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (libError) {
        console.error("Error biblioteca:", libError);
        return;
    }

    // 3. Pedir Progreso (Para saber si ya empezaste algo)
    const { data: progressData } = await supabase
        .from('reading_progress')
        .select('manga_id, chapter_num')
        .eq('user_id', user.id);

    // Mapear progreso para búsqueda rápida
    const progressMap = {};
    if (progressData) {
        progressData.forEach(p => {
            progressMap[p.manga_id] = p.chapter_num;
        });
    }

    // 4. Procesar Datos Reales
    fullLibrary = libraryData.map(item => {
        const hasProgress = progressMap[item.manga_id];
        
        // Determinar etiquetas y textos según el tipo
        let statusText = 'Sin empezar';
        let type = item.type || 'manga'; // Si la DB no tiene tipo, asumimos manga

        if (hasProgress) {
            if (type === 'manga') statusText = `Cap. ${hasProgress}`;
            else statusText = 'Viendo'; // Para videos ponemos genérico
        }

        return {
            id: item.id,            // ID de la fila (para borrar)
            contentId: item.manga_id, // ID del contenido (MangaDex/Jellyfin)
            title: item.manga_title,
            cover: item.cover_url || 'https://via.placeholder.com/200x300',
            type: type, 
            statusText: statusText,
            // Si hay progreso, pintamos la barra al 30% (visual), si no 0%
            barWidth: hasProgress ? '30%' : '0%', 
            barColor: hasProgress ? 'bg-primary' : 'bg-zinc-700'
        };
    });

    // 5. Renderizar Todo Inicialmente
    renderGrid(fullLibrary);
}

// --- FUNCIÓN DE RENDERIZADO ---
function renderGrid(items) {
    const container = document.getElementById('library-container');
    const emptyState = document.getElementById('empty-state');
    const countLabel = document.getElementById('item-count');

    container.innerHTML = '';
    
    // Actualizar contador
    if(countLabel) countLabel.innerText = items.length;

    // Estado Vacío
    if (!items || items.length === 0) {
        container.classList.add('hidden');
        if(emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
        }
        return;
    }

    // Mostrar Grid
    container.classList.remove('hidden');
    if(emptyState) {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
    }

    items.forEach(item => {
        // Lógica de Badges y Links
        let typeBadge = '';
        let linkUrl = '';

        if(item.type === 'manga') {
            typeBadge = `<span class="absolute top-2 left-2 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">MANGA</span>`;
            linkUrl = `details.html?id=${item.contentId}`;
        } else if(item.type === 'anime') {
            typeBadge = `<span class="absolute top-2 left-2 bg-[#ff6740] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">ANIME</span>`;
            linkUrl = `details-video.html?id=${item.contentId}`; // Vamos al detalle del video
        } else if(item.type === 'movies') {
            typeBadge = `<span class="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">PELI</span>`;
            linkUrl = `details-video.html?id=${item.contentId}`; // Vamos al detalle del video
        } else {
            typeBadge = `<span class="absolute top-2 left-2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">OTRO</span>`;
            linkUrl = `details-video.html?id=${item.contentId}`;
        }

        const card = `
            <div class="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-transform hover:scale-[1.02] cursor-pointer animate-fade-in">
                
                <div onclick="window.location.href='${linkUrl}'" class="w-full h-full">
                    <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                         src="${item.cover}" 
                         alt="${item.title}" 
                         loading="lazy" 
                         onerror="this.src='https://via.placeholder.com/200x300'" />
                    
                    ${typeBadge}

                    <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>

                    <div class="absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end">
                        <p class="text-sm font-bold line-clamp-2 leading-tight text-white shadow-black drop-shadow-md mb-2">
                            ${item.title}
                        </p>
                        
                        <div class="flex items-center gap-2">
                            <div class="h-1 flex-1 bg-zinc-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                                <div class="h-full ${item.barColor} transition-all duration-500" style="width: ${item.barWidth}"></div>
                            </div>
                            <span class="text-[10px] font-bold text-zinc-300">
                                ${item.statusText}
                            </span>
                        </div>
                    </div>
                </div>

                <button onclick="removeFromLibrary('${item.id}', event)" 
                        class="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur rounded-full text-white/50 hover:text-red-400 hover:bg-black/90 transition z-20 opacity-0 group-hover:opacity-100">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>
        `;
        container.innerHTML += card;
    });
}

// --- LÓGICA DE FILTRADO (TABS) ---
window.filterLibrary = function(type) {
    // 1. UI: Cambiar clase 'active' en botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if(btn.dataset.tab === type) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // 2. UI: Cambiar textos de cabecera (Opcional, si tienes estos IDs en el HTML)
    const titleLabel = document.getElementById('category-title');
    const iconLabel = document.getElementById('category-icon');
    
    const meta = {
        all: { text: 'Todo Guardado', icon: 'grid_view' },
        manga: { text: 'Mangas', icon: 'menu_book' },
        anime: { text: 'Animes', icon: 'smart_display' },
        movies: { text: 'Películas', icon: 'movie' },
        series: { text: 'Series', icon: 'tv' }
    };

    if(meta[type] && titleLabel && iconLabel) {
        titleLabel.innerText = meta[type].text;
        iconLabel.innerText = meta[type].icon;
    }

    // 3. Filtrar datos del cache local
    if (type === 'all') {
        renderGrid(fullLibrary);
    } else {
        const filtered = fullLibrary.filter(item => item.type === type);
        renderGrid(filtered);
    }
};

// --- ELIMINAR ---
window.removeFromLibrary = async (rowId, event) => {
    event.stopPropagation(); // Evitar entrar al detalle
    if(!confirm("¿Quitar de la biblioteca?")) return;

    // Borrar de DB
    const { error } = await supabase.from('library').delete().eq('id', rowId);
    
    if (!error) {
        // Actualizar cache local y repintar (más rápido que recargar la página)
        fullLibrary = fullLibrary.filter(item => item.id !== rowId);
        
        // Re-filtrar según la pestaña actual para mantener la vista
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'all';
        window.filterLibrary(activeTab);
    } else {
        alert("Error al eliminar");
    }
};