// js/search-logic.js
import { supabase } from './supabase-client.js';
import { toggleFavorite } from './db.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// --- VARIABLES GLOBALES PARA BÚSQUEDA INTELIGENTE ---
let debounceTimer;
const HISTORY_KEY = 'mangazen_search_history';
let myLibraryCache = []; // Aquí guardaremos tus favoritos en memoria

/// --- CONFIGURACIÓN DE TAGS ---
// --- LISTA MAESTRA DE TAGS DE MANGADEX ---
const TAGS_MAP = {
    // --- GÉNEROS PRINCIPALES ---
    'Acción': '391b0423-d6ea-4374-b3c3-90c674b46188',
    'Aventura': '87cc87cd-a395-47af-b27a-93258283bbc6',
    'Comedia': '4d32cc48-9f00-4cca-9b5a-a839f0764984',
    'Drama': 'b9af3a63-f058-46de-a9a0-e0c13906197a',
    'Fantasía': 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
    'Horror': 'cdad7e6d-8760-41e3-a675-b540d019f40e',
    'Misterio': 'ee968100-4191-4968-93d3-f82d72be7e46',
    'Romance': '423e2eae-3702-498e-a7f-7b2c1b4632de',
    'Ciencia Ficción': '256c8bd9-4904-4363-9530-f982a18df20b',
    'Slice of Life': 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9',
    'Deportes': '69964a64-2f90-4d33-beeb-f3ed2875bc4c',
    'Mecha': '50880a9d-5aee-4c94-8569-b888d30d30f4',
    'Psicológico': '3b60b75c-a2d7-4860-ab56-05f391bb889c',
    'Tragedia': '5ca48985-9a9d-4bd8-be29-80dc0d7dcc9c',
    'Histórico': '339811f0-0290-444b-954f-9e376c813b46',

    // --- TEMAS POPULARES ---
    'Isekai': 'ace04997-f6bd-436e-b261-779182193d3d',
    'Escolar': 'caaa44eb-cd40-4177-b930-79d3ef2afe87',
    'Magia': 'a1f53773-c69a-4ce5-8cab-fffcd90b1565',
    'Supernatural': 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75',
    'Militar': 'ac72833b-c4e9-4878-b9db-6c8a4a99444a',
    'Vampiros': 'd7d1730f-6eb0-4ba6-9437-602cac38664c',
    'Zombies': '631bb3c9-3013-4018-beeb-ea70d65a6f7d',
    'Superhéroes': '7064a261-a137-4d3a-8848-2d385de3a99c',
    'Supervivencia': '5fff9cde-849c-4d78-a8ac-0945845dd0d5',
    'Viaje en el Tiempo': '292e862b-2d17-4067-90a2-ea2ae15a85be',
    'Videojuegos': '9438db5a-7e3a-4ac0-b39e-e0d95a34b8a8',
    'Villana': 'd14322ac-4d6f-4e9b-afd9-629d5f4d8a41',
    'Reencarnación': '0bc90ac7-ccc3-48e9-84be-9e41e8293595',
    'Artes Marciales': '54271c65-6b5f-4d05-af8e-628855181e9b',
    'Post-Apocalíptico': '9467335a-1b83-4497-9231-765337a00b96',
    'Cyberpunk': '217dd724-546d-4bb2-9fbc-891466d31e32',
    'Animales': '3bb26d85-09d5-4d2e-8801-0db42e38b078',
    'Cocina': 'ea2bc92d-1c26-44c5-9cbd-43a5c19216d9',
    'Música': 'f42fbf9e-188a-447b-9fdc-f19dc1e4d67c',
    'Médico': 'c8cbe35b-1b2b-4a3f-9c37-db84c4514856',
    'Delincuentes': 'da2d50ca-3018-4cc0-ac7a-6b7d472a29ea',
    'Crimen': '5ca48985-9a9d-4bd8-be29-80dc0d7dcc9c', // Nota: Comparte ID con tragedia a veces, pero crimen puro es:
    'Mafia / Yakuza': '85daba54-a71c-4554-8a28-9901a8b0afad',
    'Ninja': '489dd85f-9b61-4c37-afc5-521a178fb7b4',
    'Samurai': '81c836c9-914a-4eca-981a-560dad663e73',
    'Realidad Virtual': '8c86611e-fab7-4986-9dec-d1a2f44acdd5',
    'Wuxia': 'acc803a4-c95a-4c22-b5de-fce6c388dc32',

    // --- ROMANCE Y RELACIONES ---
    'Harem': 'aafb99c1-7f60-43fa-b75f-fc9502ce29c7',
    'Harem Inverso': '65761a2a-415e-47f3-bef2-a9dababba7a6',
    'Boys Love (BL)': '5920b825-4181-4a17-beeb-9918b0ff7a30',
    'Girls Love (GL)': 'a3c67850-4684-404e-9b7f-c69850ee5da6',
    'Cambio de Sexo': '2bd2e8d0-f146-434a-9b51-fc9ff2c5fe6a',
    'Crossdressing': '9ab53f92-3a07-4606-9067-19ac6c29485e',
    'Romance de Oficina': '92d6d951-ca5e-429c-ac78-451071cbf064',

    // --- CONTENIDO ADULTO / INTENSO (Opcional) ---
    'Ecchi': '9ab53f92-3a07-4606-9067-19ac6c29485e',
    'Gore': 'b29d6a3d-1569-4e7a-8caf-7557bc92cd5d',
    'Violencia Sexual': '97893a4c-12af-4dac-b6be-0dffb353568e',
    'Erótico': '36fd93ea-e8b8-445e-b836-358f02b3d33d',

    // --- FORMATOS ---
    'A Todo Color': 'f5ba408b-0e7a-484d-8d49-4e9125ac96de',
    'Webtoon': 'e197df38-d0e7-43b5-9b09-2842d0c326dd',
    '4-Koma': 'b112662c-2462-44e8-8995-264325b9d33a',
    'Long Strip': '3e2b8dae-350e-4ab8-a8ce-016e844b9f0d',
    'Adaptación': 'f4122d1c-3b44-44d0-9936-ff7502c39ad3',
    'Antología': '51d83883-4103-437c-b4b1-731cb73d786c'
};


// ESTADO DE FILTROS
let filterState = {
    query: '',
    sort: 'followedCount',
    status: [],        
    demographic: [],   
    content: ['safe', 'suggestive'], 
    tags: [],
    langs: ['es', 'es-la'], 
    origLang: [], 
    offset: 0 
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    generateGenreButtons();
    loadLocalLibrary(); // 🔥 Cargar DB Local
    setupSearchInput(); // 🔥 Activar Autocompletado
    performSearch(true); // Búsqueda inicial
});

// --- 1. CARGA DE BIBLIOTECA LOCAL ---
async function loadLocalLibrary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Solo traemos ID y Título para búsqueda rápida
    const { data } = await supabase
        .from('library')
        .select('manga_id, manga_title')
        .eq('user_id', user.id);
    
    if (data) {
        myLibraryCache = data;
        // console.log("📚 Memoria de búsqueda cargada:", myLibraryCache.length);
    }
}

function generateGenreButtons() {
    const container = document.getElementById('genres-container');
    if(!container) return;
    for (const [name, id] of Object.entries(TAGS_MAP)) {
        const btn = document.createElement('button');
        btn.className = `filter-chip px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-gray-300 hover:bg-white/10 transition-all select-none`;
        btn.innerText = name;
        btn.onclick = () => toggleFilterChip(btn, 'tags', id);
        container.appendChild(btn);
    }
}

// --- 2. LÓGICA DEL INPUT INTELIGENTE (AUTOCOMPLETADO) ---
function setupSearchInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search'); // Asegúrate de tener este botón en HTML o quita estas líneas
    const dropdown = document.getElementById('search-dropdown'); // Asegúrate de tener este div en HTML

    // Al hacer foco
    input.addEventListener('focus', () => {
        if (input.value.trim() === '') showSearchHistory();
        else handleInput(input.value);
    });

    // Al escribir
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        handleInput(val);
    });

    // Al presionar Enter
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            commitSearch(input.value);
            if(dropdown) dropdown.classList.add('hidden');
            input.blur();
        }
    });

    // Clic fuera para cerrar
    document.addEventListener('click', (e) => {
        if (dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

// --- GESTOR DE ENTRADA HÍBRIDO ---
function handleInput(val) {
    const dropdown = document.getElementById('search-dropdown');
    if(!dropdown) return;

    clearTimeout(debounceTimer); // Resetear timer

    if (val.trim() === '') {
        showSearchHistory();
        return;
    }

    // PASO A: Búsqueda Local Instantánea
    const localMatches = myLibraryCache.filter(item => 
        item.manga_title.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 3); // Top 3 locales

    // Renderizar locales mientras esperamos
    renderDropdownResults(localMatches, true); 

    // PASO B: Búsqueda API (Debounce 500ms)
    debounceTimer = setTimeout(() => {
        liveSearchApi(val, localMatches);
    }, 1000);
}

// --- RENDERIZADO DEL DROPDOWN ---
function renderDropdownResults(localItems, isLoadingApi) {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.classList.remove('hidden');
    
    let html = '';

    // Sección Biblioteca
    if (localItems.length > 0) {
        html += `<div class="px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider bg-primary/5 border-b border-primary/10">En tu biblioteca</div>`;
        localItems.forEach(item => {
            html += `
                <div onclick="goToManga('${item.manga_id}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-white border-b border-white/5 group">
                    <span class="material-symbols-outlined text-primary text-[20px]">bookmark</span>
                    <span class="line-clamp-1 font-medium">${item.manga_title}</span>
                </div>
            `;
        });
    }

    // Indicador de Carga
    if (isLoadingApi) {
        html += `
            <div id="api-loading-indicator" class="p-3 text-center text-gray-500 flex items-center justify-center gap-2 text-xs">
                <span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Buscando en MangaDex...
            </div>
        `;
    }

    dropdown.innerHTML = html;
}

// --- BÚSQUEDA API EN VIVO ---
async function liveSearchApi(query, localMatches) {
    try {
        const url = new URL(`${BASE_URL}/manga`);
        url.searchParams.append('title', query);
        url.searchParams.append('limit', 5);
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        // Filtrar duplicados (si ya salió en local)
        const apiResults = json.data.map(m => ({
            manga_id: m.id,
            manga_title: m.attributes.title.en || m.attributes.title.es || Object.values(m.attributes.title)[0]
        })).filter(apiItem => {
            return !localMatches.some(local => local.manga_id === apiItem.manga_id);
        });

        // Actualizar UI
        const dropdown = document.getElementById('search-dropdown');
        if(!dropdown) return;
        
        // Quitar loading
        const loadingDiv = document.getElementById('api-loading-indicator');
        if(loadingDiv) loadingDiv.remove();

        if (apiResults.length > 0) {
            // Reconstruir HTML con lo nuevo
            let currentHtml = dropdown.innerHTML;
            const header = localMatches.length > 0 
                ? `<div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-t border-white/10 bg-[#1a1a1a]">MangaDex Global</div>`
                : `<div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Sugerencias</div>`;
            
            currentHtml += header;
            
            apiResults.forEach(item => {
                // Escapar comillas para el onclick
                const safeTitle = item.manga_title.replace(/'/g, "\\'"); 
                currentHtml += `
                    <div onclick="goToManga('${item.manga_id}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white border-b border-white/5 group">
                        <span class="material-symbols-outlined text-gray-600 group-hover:text-white text-[20px]">public</span>
                        <span class="line-clamp-1">${item.manga_title}</span>
                    </div>
                `;
            });
            dropdown.innerHTML = currentHtml;
        } else if (localMatches.length === 0) {
            dropdown.innerHTML = `<div class="p-4 text-center text-gray-500">No se encontraron resultados</div>`;
        }

    } catch (e) {
        console.error(e);
    }
}

// --- HISTORIAL ---
function showSearchHistory() {
    const dropdown = document.getElementById('search-dropdown');
    if(!dropdown) return;
    
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    let html = `
        <div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Recientes</span>
            <button onclick="clearHistory()" class="text-primary hover:text-white">Borrar</button>
        </div>
    `;

    history.forEach(term => {
        html += `
            <div onclick="commitSearch('${term}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white transition-colors border-b border-white/5 last:border-0">
                <span class="material-symbols-outlined text-gray-500 text-[20px]">history</span>
                <span>${term}</span>
            </div>
        `;
    });

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

// --- ACCIONES DE NAVEGACIÓN ---
window.commitSearch = function(term) {
    const input = document.getElementById('search-input');
    input.value = term;
    
    // Guardar historial
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = history.filter(h => h !== term);
    history.unshift(term);
    if (history.length > 5) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    filterState.query = term;
    filterState.offset = 0;
    performSearch(true);
    
    const dropdown = document.getElementById('search-dropdown');
    if(dropdown) dropdown.classList.add('hidden');
};

window.clearHistory = function() {
    localStorage.removeItem(HISTORY_KEY);
    const dropdown = document.getElementById('search-dropdown');
    if(dropdown) dropdown.classList.add('hidden');
};

window.goToManga = function(id) {
    window.location.href = `details.html?id=${id}`;
};

// --- FUNCIONES UI MODAL (FILTROS) ---
window.toggleFilters = function() {
    const overlay = document.getElementById('filter-overlay');
    const panel = document.getElementById('filter-panel');
    const isClosed = overlay.classList.contains('opacity-0');
    if (isClosed) { overlay.classList.remove('opacity-0', 'pointer-events-none'); panel.classList.remove('translate-y-full'); } 
    else { overlay.classList.add('opacity-0', 'pointer-events-none'); panel.classList.add('translate-y-full'); }
};

window.resetFilters = function() {
    filterState = {
        query: filterState.query,
        sort: 'relevance',
        status: [], demographic: [], content: ['safe'], 
        tags: [], langs: ['es', 'es-la'], origLang: [], offset: 0
    };
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        const txt = btn.innerText;
        if(txt.includes('Español')) {
            btn.classList.add('bg-primary/20', 'border-primary', 'text-white', 'active');
        } else {
            btn.classList.remove('bg-primary/20', 'border-primary', 'text-white', 'active');
            btn.classList.add('bg-white/5', 'text-gray-300');
        }
    });
    setSort('relevance');
};

window.setSort = function(value) {
    filterState.sort = value;
    document.querySelectorAll('.filter-sort-btn').forEach(btn => {
        if (btn.dataset.value === value) {
            btn.classList.add('bg-primary/20', 'border-primary', 'text-white');
            btn.classList.remove('bg-white/5', 'text-gray-300');
        } else {
            btn.classList.remove('bg-primary/20', 'border-primary', 'text-white');
            btn.classList.add('bg-white/5', 'text-gray-300');
        }
    });
};

window.toggleFilterChip = function(btn, category, value) {
    const isActive = btn.classList.contains('active');
    if (isActive) {
        btn.classList.remove('bg-primary/20', 'border-primary', 'text-white', 'active');
        btn.classList.add('bg-white/5', 'text-gray-300');
        filterState[category] = filterState[category].filter(item => item !== value);
    } else {
        btn.classList.add('bg-primary/20', 'border-primary', 'text-white', 'active');
        btn.classList.remove('bg-white/5', 'text-gray-300');
        filterState[category].push(value);
    }
};

window.applySearch = function() {
    filterState.offset = 0; 
    toggleFilters();
    performSearch(true);
};

window.quickSearch = function(genreName) {
    const id = TAGS_MAP[genreName];
    if(id) {
        filterState.tags = [id];
        filterState.offset = 0;
        performSearch(true);
    }
};

window.loadMore = function() {
    filterState.offset += 20;
    performSearch(false); 
}

// --- 🔥 GUARDADO RÁPIDO (Quick Save) ---
window.toggleQuickSave = async (event, id, titleEncoded, coverUrl, btn) => {
    event.stopPropagation();
    const title = decodeURIComponent(titleEncoded);
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span>';
    
    const isNowFav = await toggleFavorite(id, title, coverUrl);
    
    // Si lo guardamos, también lo añadimos a la caché local para el buscador
    if(isNowFav) {
        myLibraryCache.push({ manga_id: id, manga_title: title });
    } else {
        myLibraryCache = myLibraryCache.filter(i => i.manga_id !== id);
    }

    if (isNowFav) {
        btn.className = "absolute top-2 right-2 p-2 rounded-full z-20 transition-all bg-primary text-white shadow-lg shadow-primary/40";
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">bookmark</span>';
    } else {
        btn.className = "absolute top-2 right-2 p-2 rounded-full z-20 transition-all bg-black/60 text-white/70 hover:bg-primary hover:text-white border border-white/10";
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">bookmark_add</span>';
    }
};

// --- BÚSQUEDA PRINCIPAL (API) ---
async function performSearch(isNewSearch = true) {
    const grid = document.getElementById('manga-grid');
    const countLabel = document.getElementById('results-count');
    const loadMoreBtn = document.getElementById('load-more-container');

    const { data: { user } } = await supabase.auth.getUser();

    if (isNewSearch) {
        grid.innerHTML = Array(10).fill(0).map(() => `<div class="aspect-[2/3] rounded-xl bg-white/5 animate-pulse"></div>`).join('');
    }

    try {
        const url = new URL(`${BASE_URL}/manga`);
        if (filterState.query) url.searchParams.append('title', filterState.query);
        url.searchParams.append(`order[${filterState.sort}]`, 'desc');
        filterState.status.forEach(s => url.searchParams.append('status[]', s));
        filterState.demographic.forEach(d => url.searchParams.append('publicationDemographic[]', d));
        filterState.content.forEach(c => url.searchParams.append('contentRating[]', c));
        filterState.tags.forEach(t => url.searchParams.append('includedTags[]', t));
        filterState.langs.forEach(l => url.searchParams.append('availableTranslatedLanguage[]', l));
        filterState.origLang.forEach(l => url.searchParams.append('originalLanguage[]', l));
        url.searchParams.append('limit', 20);
        url.searchParams.append('offset', filterState.offset);
        url.searchParams.append('includes[]', 'cover_art');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();
        const mangas = json.data;

        if (isNewSearch) {
            countLabel.innerText = `${json.total} Títulos`;
            grid.innerHTML = '';
        }

        if (!mangas || mangas.length === 0) {
            if(isNewSearch) grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">No se encontraron resultados.</p>';
            loadMoreBtn.classList.add('hidden');
            return;
        }

        const mangaIds = mangas.map(m => m.id);
        const librarySet = new Set();
        
        if (user) {
            // Usamos la caché local si ya la tenemos, para no gastar peticiones a Supabase
            if(myLibraryCache.length > 0) {
                 myLibraryCache.forEach(item => {
                     if(mangaIds.includes(item.manga_id)) librarySet.add(item.manga_id);
                 });
            } else {
                 const { data: libData } = await supabase.from('library').select('manga_id').eq('user_id', user.id).in('manga_id', mangaIds);
                 if (libData) libData.forEach(item => librarySet.add(item.manga_id));
            }
        }

        mangas.forEach(manga => {
            const attr = manga.attributes;
            const title = attr.title.en || attr.title.es || Object.values(attr.title)[0] || 'Sin Título';
            const safeTitle = encodeURIComponent(title);

            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            const fileName = coverRel ? coverRel.attributes.fileName : '';
            const coverUrl = fileName 
                ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.512.jpg`)
                : 'https://via.placeholder.com/300x450?text=No+Cover';

            let flag = '';
            if(attr.originalLanguage === 'ja') flag = '🇯🇵';
            if(attr.originalLanguage === 'ko') flag = '🇰🇷';
            if(attr.originalLanguage === 'zh') flag = '🇨🇳';

            const isFav = librarySet.has(manga.id);
            const btnClass = isFav 
                ? "bg-primary text-white shadow-lg shadow-primary/40" 
                : "bg-black/60 text-white/70 hover:bg-primary hover:text-white border border-white/10";
            const btnIcon = isFav ? "bookmark" : "bookmark_add";

            const card = `
                <div class="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-transform hover:scale-[1.02] cursor-pointer"
                     onclick="window.location.href='details.html?id=${manga.id}'">
                    
                    <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                         src="${coverUrl}" loading="lazy" />
                    
                    <button onclick="toggleQuickSave(event, '${manga.id}', '${safeTitle}', '${coverUrl}', this)"
                            class="absolute top-2 right-2 p-2 rounded-full z-20 transition-all ${btnClass}">
                        <span class="material-symbols-outlined text-[20px]">${btnIcon}</span>
                    </button>

                    <div class="absolute inset-0 manga-card-gradient flex flex-col justify-end p-3">
                        <h4 class="text-sm font-bold line-clamp-2 leading-tight text-white group-hover:text-primary transition-colors text-shadow">${title}</h4>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs">${flag}</span>
                            <span class="text-[10px] text-gray-400 capitalize bg-black/50 px-1 rounded">${attr.status || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });

        if (filterState.offset + 20 < json.total) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }

    } catch (error) {
        console.error(error);
        if(isNewSearch) grid.innerHTML = '<p class="col-span-full text-center text-red-400">Error.</p>';
    }
}