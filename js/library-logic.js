// js/library-logic.js
import { supabase } from './supabase-client.js';

initLibrary();

async function initLibrary() {
    const container = document.getElementById('library-container');
    const emptyState = document.getElementById('empty-state');

    // 1. Verificar Usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Pedir Favoritos (Biblioteca)
    const { data: libraryData, error: libError } = await supabase
        .from('library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (libError) {
        console.error("Error biblioteca:", libError);
        return;
    }

    // 3. Pedir Progreso de Lectura (Para saber en qué cap vas)
    const { data: progressData } = await supabase
        .from('reading_progress')
        .select('manga_id, chapter_num')
        .eq('user_id', user.id);

    // 4. Renderizar
    container.innerHTML = ''; 

    if (!libraryData || libraryData.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        return;
    }

    // Convertir progreso en un mapa para búsqueda rápida: { 'manga-id': '5', ... }
    const progressMap = {};
    if (progressData) {
        progressData.forEach(p => {
            progressMap[p.manga_id] = p.chapter_num;
        });
    }

    libraryData.forEach(item => {
        // Buscamos si hay progreso para este manga
        const lastChapter = progressMap[item.manga_id];
        
        // Lógica visual: 
        // - Si hay capítulo leído -> Texto: "Cap. X", Barra: 30% (Visual)
        // - Si no hay nada -> Texto: "Sin empezar", Barra: 0%
        
        const statusText = lastChapter ? `Cap. ${lastChapter}` : 'Sin empezar';
        const barWidth = lastChapter ? '30%' : '0%'; 
        const barColor = lastChapter ? 'bg-primary' : 'bg-zinc-700';

        const card = `
            <div class="group relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-transform hover:scale-[1.02] cursor-pointer">
                
                <div onclick="window.location.href='details.html?id=${item.manga_id}'" class="w-full h-full">
                    <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                         src="${item.cover_url}" 
                         alt="${item.manga_title}" 
                         loading="lazy" />
                    
                    <div class="absolute inset-0 manga-card-gradient flex flex-col justify-end p-3">
                        <p class="text-sm font-bold line-clamp-2 leading-tight text-white shadow-black drop-shadow-md">
                            ${item.manga_title}
                        </p>
                        
                        <div class="flex items-center gap-2 mt-2">
                            <div class="h-1 flex-1 bg-zinc-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                                <div class="h-full ${barColor} transition-all duration-500" style="width: ${barWidth}"></div>
                            </div>
                            <span class="text-[10px] ${lastChapter ? 'text-primary font-bold' : 'text-zinc-400 font-medium'}">
                                ${statusText}
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

window.removeFromLibrary = async (rowId, event) => {
    event.stopPropagation();
    if(!confirm("¿Quitar de la biblioteca?")) return;

    const { error } = await supabase.from('library').delete().eq('id', rowId);
    if (!error) initLibrary();
};