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

    document.title = `${currentItem.title} - MangaZen`;

    // 2. Llenar la UI
    
    // Fondo y Poster
    if (currentItem.backdrop) {
        document.getElementById('backdrop').style.backgroundImage = `url('${currentItem.backdrop}')`;
    }
    document.getElementById('poster-img').src = currentItem.poster;
    
    // Textos
    document.getElementById('title').innerText = currentItem.title;
    
    // ✅ MEJORA DE TEXTO: Color claro y sombra para legibilidad
    const overviewEl = document.getElementById('overview');
    overviewEl.innerText = currentItem.overview || "Sin descripción disponible.";
    overviewEl.className = "text-gray-300 text-sm leading-relaxed drop-shadow-md"; 

    document.getElementById('meta-info').innerText = `${currentItem.year || ''} • ${currentItem.rating || ''}`;

    // Géneros
    const genresDiv = document.getElementById('genres');
    if (currentItem.genres) {
        genresDiv.innerHTML = currentItem.genres.map(g => 
            `<span class="px-2 py-1 rounded-md bg-white/10 border border-white/5 text-xs font-medium backdrop-blur-sm text-gray-200">${g}</span>`
        ).join('');
    }

    // 3. BOTONES DE ACCIÓN (PLAY + TRAILER)
    const btnPlay = document.getElementById('btn-play-hero');
    btnPlay.className = "flex items-center gap-2 px-8 py-3 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(140,37,244,0.4)] hover:scale-105 active:scale-95";

    // Lógica Play
    if (currentItem.type === 'Series') {
        btnPlay.innerHTML = `<span class="material-symbols-outlined text-3xl">arrow_downward</span> Ver Episodios`;
        btnPlay.onclick = () => {
            const seasonsContainer = document.getElementById('seasons-container');
            seasonsContainer.classList.remove('hidden'); 
            seasonsContainer.scrollIntoView({ behavior: 'smooth' });
        };
        await loadSeasonsAndEpisodes(ID);
    } else {
        btnPlay.innerHTML = `<span class="material-symbols-outlined text-4xl">play_arrow</span> Reproducir`;
        btnPlay.onclick = () => window.location.href = `watch.html?id=${ID}`;
    }

    // 🎬 Lógica Trailer (Nuevo)
    const hasTrailer = currentItem.RemoteTrailers && currentItem.RemoteTrailers.length > 0;
    // Limpiar botón anterior si existe
    const oldTrailerBtn = document.getElementById('btn-trailer');
    if (oldTrailerBtn) oldTrailerBtn.remove();

    if (hasTrailer) {
        const trailerUrl = currentItem.RemoteTrailers[0].Url;
        const btnTrailer = document.createElement('button');
        btnTrailer.id = 'btn-trailer';
        btnTrailer.className = "flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition-all backdrop-blur-md hover:scale-105 active:scale-95";
        btnTrailer.innerHTML = `<span class="material-symbols-outlined">movie</span> Trailer`;
        btnTrailer.onclick = () => openTrailer(trailerUrl);
        
        // Insertar al lado del botón Play
        const actionsContainer = btnPlay.parentElement;
        if (actionsContainer) {
            actionsContainer.classList.add('flex', 'gap-4', 'flex-wrap'); 
            actionsContainer.insertBefore(btnTrailer, btnPlay.nextSibling);
        }
    }

    // 4. Activar Botón Guardar
    document.getElementById('btn-save').onclick = () => toggleLibrary();
}

// --- LÓGICA DEL TRAILER ---
window.openTrailer = (url) => {
    let embedUrl = url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1] || url.split('/').pop();
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`; 
    }
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('youtube-player-container');
    const content = document.getElementById('trailer-content');

    if(modal && container) {
        container.innerHTML = `<iframe width="100%" height="100%" src="${embedUrl}" title="Trailer" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            if(content) { content.classList.remove('scale-95'); content.classList.add('scale-100'); }
        }, 10);
    }
};

window.closeTrailer = () => {
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('youtube-player-container');
    const content = document.getElementById('trailer-content');

    if(modal) {
        modal.classList.add('opacity-0');
        if(content) { content.classList.remove('scale-100'); content.classList.add('scale-95'); }
        setTimeout(() => {
            modal.classList.add('hidden');
            if(container) container.innerHTML = ''; 
        }, 300);
    }
};

// --- GUARDAR EN BIBLIOTECA ---
async function toggleLibrary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Inicia sesión para guardar."); return; }

    const btnSave = document.getElementById('btn-save');
    const icon = btnSave.querySelector('span');
    const text = btnSave.querySelector('p');
    const isSaved = btnSave.classList.contains('bg-green-600');

    if (isSaved) {
        const { error } = await supabase.from('library').delete().eq('user_id', user.id).eq('manga_id', ID);
        if (!error) {
            btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all flex items-center justify-center gap-2 backdrop-blur-md text-white";
            icon.innerText = 'bookmark_border';
            text.innerText = 'Guardar';
        }
    } else {
        let typeToSave = 'anime';
        if (currentItem.type === 'Movie') typeToSave = 'movies';
        else if (currentItem.type === 'Series') typeToSave = currentItem.genres && currentItem.genres.includes('Anime') ? 'anime' : 'series';

        const { error } = await supabase.from('library').insert({
            user_id: user.id,
            manga_id: ID,
            manga_title: currentItem.title,
            cover_url: currentItem.poster,
            type: typeToSave
        });

        if (!error) {
            btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-green-600 border border-green-500 hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-white";
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
        btnSave.className = "w-full md:w-72 py-3 px-6 rounded-xl font-bold bg-green-600 border border-green-500 hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-white";
        icon.innerText = 'bookmark';
        text.innerText = 'Guardado';
    }
}

// --- LÓGICA DE SERIES ---
async function loadSeasonsAndEpisodes(seriesId) {
    const container = document.getElementById('seasons-container');
    const seasonsList = document.getElementById('seasons-list');
    container.classList.remove('hidden'); 
    
    const seasons = await getSeasons(seriesId);
    if (!seasons || seasons.length === 0) return;

    seasonsList.innerHTML = seasons.map((s, index) => {
        const seasonId = s.Id || s.id;
        const seasonName = s.Name || s.name || `Temporada ${index + 1}`;
        const activeClass = "bg-brand text-white border-brand shadow-[0_0_15px_rgba(140,37,244,0.4)]";
        const inactiveClass = "bg-surface text-gray-400 border-white/10 hover:text-white hover:bg-white/10";
        return `
            <button onclick="loadEpisodesForSeason('${seriesId}', '${seasonId}', this)" 
                    class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all border shrink-0 ${index === 0 ? activeClass : inactiveClass}">
                ${seasonName}
            </button>
        `;
    }).join('');

    if (seasons.length > 0) {
        const firstBtn = seasonsList.querySelector('button');
        const firstSeasonId = seasons[0].Id || seasons[0].id;
        loadEpisodesForSeason(seriesId, firstSeasonId, firstBtn);
    }
}

// ✅ Función Global para cargar episodios
window.loadEpisodesForSeason = async (seriesId, seasonId, btn) => {
    const buttons = document.querySelectorAll('#seasons-list button');
    buttons.forEach(b => {
        b.className = 'px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 shrink-0 bg-surface text-gray-400 hover:text-white hover:bg-white/10';
    });
    if(btn) {
        btn.className = 'px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-brand shrink-0 bg-brand text-white shadow-[0_0_15px_rgba(140,37,244,0.4)]';
    }

    const episodesList = document.getElementById('episodes-list');
    episodesList.innerHTML = `<div class="p-10 text-center"><span class="material-symbols-outlined animate-spin text-4xl text-brand">progress_activity</span></div>`;

    if (!seasonId || seasonId === 'undefined') {
        episodesList.innerHTML = `<div class="p-4 text-red-400 text-center bg-red-500/10 rounded-xl border border-red-500/20">Error: ID de temporada no válido.</div>`;
        return;
    }

    const episodes = await getEpisodes(seriesId, seasonId);

    if (!episodes || episodes.length === 0) {
        episodesList.innerHTML = `<div class="p-8 text-gray-500 text-center italic">No hay episodios disponibles para esta temporada.</div>`;
        return;
    }

    // 2. RENDERIZADO RESPONSIVO Y CORREGIDO
    episodesList.innerHTML = episodes.map((ep, i) => {
        // 🔥 FIX EP: Si index no existe, usa contador (1, 2, 3...)
        const episodeNumber = ep.index || (i + 1);

        return `
        <div onclick="window.location.href='watch.html?id=${ep.id}'" 
             class="flex gap-3 md:gap-5 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors group items-center border border-transparent hover:border-brand/30 overflow-hidden">
            
            <div class="w-32 h-20 md:w-48 md:h-28 rounded-xl overflow-hidden bg-surface relative shrink-0 shadow-md transition-all duration-300">
                <img src="${ep.img || 'https://via.placeholder.com/300x170?text=No+Image'}" 
                     class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                     loading="lazy">
                
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-[1px]">
                    <span class="material-symbols-outlined text-brand text-3xl md:text-4xl drop-shadow-md">play_circle</span>
                </div>
                
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                   <div class="h-full bg-brand w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                </div>
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] md:text-xs font-bold bg-brand/20 text-brand border border-brand/20 shrink-0">
                        EP ${episodeNumber}
                    </span>
                    <h4 class="text-gray-100 font-bold truncate group-hover:text-brand-light transition-colors text-sm md:text-base">
                        ${ep.title || 'Episodio ' + episodeNumber}
                    </h4>
                </div>
                <p class="text-xs md:text-sm text-gray-400 line-clamp-2 leading-relaxed md:line-clamp-3">
                    ${ep.overview || 'Sin descripción disponible.'}
                </p>
            </div>
        </div>
    `}).join('');
};