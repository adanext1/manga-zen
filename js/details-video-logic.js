import { supabase } from './supabase-client.js';
import { getItemDetails, getSeasons, getEpisodes } from './jellyfin-client.js';

const params = new URLSearchParams(window.location.search);
const ID = params.get('id');
let currentItem = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!ID) { window.location.href = 'index.html'; return; }
    loadVideoDetails();
    checkIfSaved();
});

async function loadVideoDetails() {
    // 1. Obtener datos de Jellyfin
    currentItem = await getItemDetails(ID);

    if (!currentItem) {
        document.getElementById('title').innerText = "Video no encontrado";
        return;
    }

    document.title = `${currentItem.title} - AdaNext`;

    // 2. Llenar la UI (IDs exactos de tu HTML)
    
    // Fondo y Poster
    if (currentItem.backdrop) {
        document.getElementById('backdrop').style.backgroundImage = `url('${currentItem.backdrop}')`;
    }
    document.getElementById('poster-img').src = currentItem.poster;
    
    // Textos
    document.getElementById('title').innerText = currentItem.title;
    document.getElementById('overview').innerText = currentItem.overview || "Sin descripción disponible.";
    document.getElementById('meta-info').innerText = `${currentItem.year || ''} • ${currentItem.rating || ''}`;

    // Géneros
    const genresDiv = document.getElementById('genres');
    if (currentItem.genres) {
        genresDiv.innerHTML = currentItem.genres.map(g => 
            `<span class="px-2 py-1 rounded-md bg-white/10 text-xs font-medium backdrop-blur-sm">${g}</span>`
        ).join('');
    }

    // 3. Lógica Botón Play
    const btnPlay = document.getElementById('btn-play-hero');
    
    if (currentItem.type === 'Series') {
        // Si es Serie, el botón lleva a la lista de abajo
        btnPlay.innerHTML = `<span class="material-symbols-outlined text-3xl">arrow_downward</span> Ver Episodios`;
        btnPlay.onclick = () => {
            document.getElementById('seasons-container').scrollIntoView({ behavior: 'smooth' });
        };
        // Cargar las temporadas
        await loadSeasonsAndEpisodes(ID);
    } else {
        // Si es Película, Play directo
        btnPlay.onclick = () => window.location.href = `watch.html?id=${ID}`;
    }

    // 4. Activar Botón Guardar
    document.getElementById('btn-save').onclick = () => toggleLibrary();
}

// --- GUARDAR EN BIBLIOTECA ---
async function toggleLibrary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Inicia sesión para guardar."); return; }

    const btnSave = document.getElementById('btn-save');
    const icon = btnSave.querySelector('span'); // El icono
    const text = btnSave.querySelector('p');    // El texto <p>

    // Verificamos si está guardado por el color del botón
    const isSaved = btnSave.classList.contains('bg-green-600');

    if (isSaved) {
        // BORRAR
        const { error } = await supabase.from('library').delete().eq('user_id', user.id).eq('manga_id', ID);
        if (!error) {
            // Volver a estilo normal (gris transparente)
            btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2 backdrop-blur-md";
            icon.innerText = 'bookmark_border';
            text.innerText = 'Guardar';
        }
    } else {
        // GUARDAR
        let typeToSave = 'anime';
        if (currentItem.type === 'Movie') typeToSave = 'movies';
        else if (currentItem.type === 'Series') typeToSave = currentItem.genres.includes('Anime') ? 'anime' : 'series';

        const { error } = await supabase.from('library').insert({
            user_id: user.id,
            manga_id: ID,
            manga_title: currentItem.title,
            cover_url: currentItem.poster,
            type: typeToSave
        });

        if (!error) {
            // Cambiar a estilo guardado (Verde)
            btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-green-600 border border-green-500 hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20";
            icon.innerText = 'bookmark';
            text.innerText = 'Guardado';
        }
    }
}

// --- VERIFICAR ESTADO INICIAL ---
async function checkIfSaved() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('library').select('id').eq('user_id', user.id).eq('manga_id', ID).maybeSingle();

    if (data) {
        const btnSave = document.getElementById('btn-save');
        const icon = btnSave.querySelector('span');
        const text = btnSave.querySelector('p');
        
        // Aplicar estilo verde directo
        btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-green-600 border border-green-500 hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20";
        icon.innerText = 'bookmark';
        text.innerText = 'Guardado';
    }
}

// --- LÓGICA DE SERIES (Temporadas y Episodios) ---
async function loadSeasonsAndEpisodes(seriesId) {
    const container = document.getElementById('seasons-container');
    const seasonsList = document.getElementById('seasons-list');
    
    container.classList.remove('hidden'); 
    
    const seasons = await getSeasons(seriesId);
    if (seasons.length === 0) return;

    seasonsList.innerHTML = seasons.map((s, index) => `
        <button onclick="loadEpisodesForSeason('${seriesId}', '${s.Id}', this)" 
                class="px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/10 shrink-0 
                ${index === 0 ? 'bg-[#ff6740] text-white border-[#ff6740]' : 'bg-[#18181b] text-gray-400 hover:text-white'}">
            ${s.Name}
        </button>
    `).join('');

    // Cargar la primera temporada automáticamente
    if (seasons.length > 0) {
        const firstBtn = seasonsList.querySelector('button');
        loadEpisodesForSeason(seriesId, seasons[0].Id, firstBtn);
    }
}

// Función Global para los botones de temporada
window.loadEpisodesForSeason = async (seriesId, seasonId, btn) => {
    // Actualizar estilos de botones
    const buttons = document.querySelectorAll('#seasons-list button');
    buttons.forEach(b => {
        b.className = 'px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/10 shrink-0 bg-[#18181b] text-gray-400 hover:text-white';
    });
    btn.className = 'px-4 py-2 rounded-lg text-sm font-bold transition-all border border-[#ff6740] shrink-0 bg-[#ff6740] text-white';

    const episodesList = document.getElementById('episodes-list');
    episodesList.innerHTML = `<div class="p-10 text-center"><span class="material-symbols-outlined animate-spin text-3xl text-[#ff6740]">progress_activity</span></div>`;

    const episodes = await getEpisodes(seriesId, seasonId);

    episodesList.innerHTML = episodes.map(ep => `
        <div onclick="window.location.href='watch.html?id=${ep.id}'" 
             class="flex gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group items-center border border-transparent hover:border-white/5">
            
            <div class="w-32 aspect-video rounded-lg overflow-hidden bg-zinc-800 relative shrink-0">
                <img src="${ep.img || 'https://via.placeholder.com/160x90'}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <span class="material-symbols-outlined text-white text-3xl drop-shadow-lg">play_circle</span>
                </div>
            </div>

            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-[#ff6740]">EP ${ep.index || '?'}</span>
                    <h4 class="text-white font-bold truncate group-hover:text-[#ff6740] transition-colors">${ep.title}</h4>
                </div>
                <p class="text-xs text-gray-400 line-clamp-2">${ep.overview || 'Sin descripción.'}</p>
            </div>
        </div>
    `).join('');
};