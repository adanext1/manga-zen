// js/search-logic.js
import { supabase } from './supabase-client.js';
import { toggleFavorite } from './db.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// --- VARIABLES GLOBALES ---
let debounceTimer;
const HISTORY_KEY = 'mangazen_search_history';
let myLibraryCache = []; 

// ESTADO DE FILTROS
let filterState = {
    query: '',
    sort: 'followedCount',
    status: [], demographic: [], content: ['safe', 'suggestive'], 
    tags: [], langs: ['es', 'es-la'], origLang: [], offset: 0 
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargamos tags (si existe el contenedor)
    await loadTagsFromApi();
    
    // 2. Cargamos librería local
    loadLocalLibrary(); 
    
    // 3. Configuramos el buscador (SOLO si existe el input)
    setupSearchInput();
    
    // 4. Chequeamos URL
    checkUrlForTags();
    
    // 5. Búsqueda inicial automática (SOLO si existe la grilla de resultados)
    if (document.getElementById('manga-grid')) {
        performSearch(true); 
    }
});

// --- CARGAR TAGS DESDE API ---
async function loadTagsFromApi() {
    const container = document.getElementById('genres-container');
    if(!container) return; // Evita error si no hay contenedor de tags

    try {
        const res = await fetch(PROXY + encodeURIComponent(`${BASE_URL}/manga/tag`));
        const json = await res.json();
        const tags = json.data;

        container.innerHTML = '';
        const groups = { 'genre': [], 'theme': [], 'format': [] };
        tags.forEach(tag => {
            const group = tag.attributes.group;
            if(groups[group]) groups[group].push(tag);
        });

        const renderSection = (title, tagList) => {
            if(tagList.length === 0) return;
            tagList.sort((a, b) => a.attributes.name.en.localeCompare(b.attributes.name.en));

            tagList.forEach(tag => {
                const nameEn = tag.attributes.name.en;
                const id = tag.id;
                const nameEs = translateTag(nameEn);

                const btn = document.createElement('button');
                btn.className = `filter-chip px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-gray-300 hover:bg-white/10 transition-all select-none whitespace-nowrap`;
                btn.innerText = nameEs;
                btn.dataset.id = id;
                btn.onclick = () => toggleFilterChip(btn, 'tags', id);
                container.appendChild(btn);
            });
        };

        renderSection("Géneros", groups['genre']);
        renderSection("Temas", groups['theme']);
        renderSection("Formatos", groups['format']);

    } catch (e) { console.error("Error cargando tags:", e); }
}

function translateTag(name) {
    const map = {
        'Action': 'Acción', 'Adventure': 'Aventura', 'Comedy': 'Comedia',
        'Drama': 'Drama', 'Fantasy': 'Fantasía', 'Horror': 'Terror',
        'Mystery': 'Misterio', 'Romance': 'Romance', 'Sci-Fi': 'Ciencia Ficción',
        'Slice of Life': 'Recuentos de la vida', 'Sports': 'Deportes',
        'Psychological': 'Psicológico', 'Tragedy': 'Tragedia', 'Historical': 'Histórico',
        'School Life': 'Escolar', 'Magic': 'Magia', 'Supernatural': 'Sobrenatural',
        'Military': 'Militar', 'Vampires': 'Vampiros', 'Zombies': 'Zombies',
        'Boys\' Love': 'BL', 'Girls\' Love': 'GL', 'Web Comic': 'Webcomic',
        'Full Color': 'A Color', 'Long Strip': 'Formato Webtoon', 'Reincarnation': 'Reencarnación',
        'Time Travel': 'Viaje en el tiempo', 'Video Games': 'Videojuegos', 'Monsters': 'Monstruos',
        'Villainess': 'Villana', 'Martial Arts': 'Artes Marciales', 'Survival': 'Supervivencia',
        'Post-Apocalyptic': 'Post-Apocalíptico', 'Crime': 'Crimen', 'Traditional Games': 'Juegos Tradicionales',
        'Sexual Violence': 'Violencia Sexual', 'Gore': 'Gore', 'Award Winning': 'Premiado'
    };
    return map[name] || name;
}

function checkUrlForTags() {
    const params = new URLSearchParams(window.location.search);
    const tagFromUrl = params.get('tag');

    if (tagFromUrl) {
        filterState.tags = [tagFromUrl];
        filterState.query = ''; 
        setTimeout(() => {
            const btn = document.querySelector(`.filter-chip[data-id="${tagFromUrl}"]`);
            if(btn) {
                btn.classList.add('bg-primary/20', 'border-primary', 'text-white', 'active');
                btn.classList.remove('bg-white/5', 'text-gray-300');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 500);
    }
}

async function loadLocalLibrary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('library').select('manga_id, manga_title').eq('user_id', user.id);
    if (data) myLibraryCache = data;
}

// --- INPUT & SEARCH (ARREGLADO AQUÍ) ---
function setupSearchInput() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');

    // ARREGLO PRINCIPAL: Si no existe el input, detenemos la función aquí
    if (!input) return;

    input.addEventListener('focus', () => {
        if (input.value.trim() === '') showSearchHistory();
        else handleInput(input.value);
    });
    input.addEventListener('input', (e) => handleInput(e.target.value));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            commitSearch(input.value);
            input.blur();
        }
    });
    
    // Solo agregamos el listener global si el dropdown existe
    if (dropdown) {
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }
}

function handleInput(val) {
    const dropdown = document.getElementById('search-dropdown');
    if(!dropdown) return;
    clearTimeout(debounceTimer);

    if (val.trim() === '') { showSearchHistory(); return; }

    const localMatches = myLibraryCache.filter(item => 
        item.manga_title.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 3);
    renderDropdownResults(localMatches, true); 

    debounceTimer = setTimeout(() => { liveSearchApi(val, localMatches); }, 1000);
}

function renderDropdownResults(localItems, isLoadingApi) {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return; // Seguridad extra
    
    dropdown.classList.remove('hidden');
    let html = '';

    if (localItems.length > 0) {
        html += `<div class="px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider bg-primary/5 border-b border-primary/10">En tu biblioteca</div>`;
        localItems.forEach(item => {
            html += `<div onclick="goToManga('${item.manga_id}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-white border-b border-white/5 group"><span class="material-symbols-outlined text-primary text-[20px]">bookmark</span><span class="line-clamp-1 font-medium">${item.manga_title}</span></div>`;
        });
    }
    if (isLoadingApi) {
        html += `<div id="api-loading-indicator" class="p-3 text-center text-gray-500 flex items-center justify-center gap-2 text-xs"><span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Buscando en MangaDex...</div>`;
    }
    dropdown.innerHTML = html;
}

async function liveSearchApi(query, localMatches) {
    try {
        const url = new URL(`${BASE_URL}/manga`);
        url.searchParams.append('title', query);
        url.searchParams.append('limit', 5);
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const cleanUrl = decodeURIComponent(url.toString());
        const res = await fetch(PROXY + encodeURIComponent(cleanUrl));
        const json = await res.json();

        const apiResults = json.data.map(m => ({
            manga_id: m.id,
            manga_title: m.attributes.title.en || m.attributes.title.es || Object.values(m.attributes.title)[0]
        })).filter(apiItem => !localMatches.some(local => local.manga_id === apiItem.manga_id));

        const dropdown = document.getElementById('search-dropdown');
        if(!dropdown) return;
        const loadingDiv = document.getElementById('api-loading-indicator');
        if(loadingDiv) loadingDiv.remove();

        if (apiResults.length > 0) {
            let currentHtml = dropdown.innerHTML;
            currentHtml += `<div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 border-t border-white/10">Sugerencias</div>`;
            apiResults.forEach(item => {
                currentHtml += `<div onclick="goToManga('${item.manga_id}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white border-b border-white/5 group"><span class="material-symbols-outlined text-gray-600 group-hover:text-white text-[20px]">public</span><span class="line-clamp-1">${item.manga_title}</span></div>`;
            });
            dropdown.innerHTML = currentHtml;
        } else if (localMatches.length === 0) {
            dropdown.innerHTML = `<div class="p-4 text-center text-gray-500">No se encontraron resultados</div>`;
        }
    } catch (e) { console.error(e); }
}

function showSearchHistory() {
    const dropdown = document.getElementById('search-dropdown');
    if(!dropdown) return;
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length === 0) { dropdown.classList.add('hidden'); return; }
    let html = `<div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between"><span>Recientes</span><button onclick="clearHistory()" class="text-primary hover:text-white">Borrar</button></div>`;
    history.forEach(term => {
        html += `<div onclick="commitSearch('${term}')" class="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer text-gray-300 hover:text-white transition-colors border-b border-white/5 last:border-0"><span class="material-symbols-outlined text-gray-500 text-[20px]">history</span><span>${term}</span></div>`;
    });
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

window.commitSearch = function(term) {
    const input = document.getElementById('search-input');
    if(input) input.value = term; // Check de seguridad

    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = history.filter(h => h !== term);
    history.unshift(term);
    if (history.length > 5) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    filterState.query = term;
    filterState.tags = [];
    filterState.offset = 0;
    
    // Solo busca si existe la grilla
    if(document.getElementById('manga-grid')) {
        performSearch(true);
    } else {
        // Opcional: Redirigir al home con el query parameter si estás en details
        // window.location.href = `index.html?search=${term}`;
    }
    
    document.querySelectorAll('.filter-chip').forEach(b => {
        b.classList.remove('bg-primary/20', 'border-primary', 'text-white', 'active');
        b.classList.add('bg-white/5', 'text-gray-300');
    });
    
    const dropdown = document.getElementById('search-dropdown');
    if(dropdown) dropdown.classList.add('hidden');
};

window.clearHistory = function() {
    localStorage.removeItem(HISTORY_KEY);
    const dropdown = document.getElementById('search-dropdown');
    if(dropdown) dropdown.classList.add('hidden');
};

window.goToManga = function(id) { window.location.href = `details.html?id=${id}`; };

// --- LOGICA DE FILTROS ---

window.toggleFilterChip = function(btn, category, value) {
    const isActive = btn.classList.contains('active');
    
    const input = document.getElementById('search-input');
    if(input) input.value = '';

    filterState.query = ''; 
    
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

window.resetFilters = function() {
    filterState = {
        query: '', sort: 'followedCount',
        status: [], demographic: [], content: ['safe', 'suggestive'], 
        tags: [], langs: ['es', 'es-la'], origLang: [], offset: 0
    };
    const input = document.getElementById('search-input');
    if(input) input.value = '';
    
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('bg-primary/20', 'border-primary', 'text-white', 'active');
        btn.classList.add('bg-white/5', 'text-gray-300');
    });
    setSort('followedCount');
    
    if(document.getElementById('manga-grid')) performSearch(true);
};

window.applySearch = function() {
    filterState.offset = 0; 
    toggleFilters(); 
    if(document.getElementById('manga-grid')) performSearch(true);
};

window.toggleFilters = function() {
    const overlay = document.getElementById('filter-overlay');
    const panel = document.getElementById('filter-panel');
    // Chequeo por si el modal no existe en esta página
    if(!overlay || !panel) return;

    const isClosed = overlay.classList.contains('opacity-0');
    if (isClosed) { overlay.classList.remove('opacity-0', 'pointer-events-none'); panel.classList.remove('translate-y-full'); } 
    else { overlay.classList.add('opacity-0', 'pointer-events-none'); panel.classList.add('translate-y-full'); }
};

window.loadMore = function() {
    filterState.offset += 20;
    performSearch(false); 
}

window.toggleQuickSave = async (event, id, titleEncoded, coverUrl, btn) => {
    event.stopPropagation();
    const title = decodeURIComponent(titleEncoded);
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span>';
    const isNowFav = await toggleFavorite(id, title, coverUrl);
    if(isNowFav) myLibraryCache.push({ manga_id: id, manga_title: title });
    else myLibraryCache = myLibraryCache.filter(i => i.manga_id !== id);

    if (isNowFav) {
        btn.className = "absolute top-2 right-2 p-2 rounded-full z-20 transition-all bg-primary text-white shadow-lg shadow-primary/40";
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">bookmark</span>';
    } else {
        btn.className = "absolute top-2 right-2 p-2 rounded-full z-20 transition-all bg-black/60 text-white/70 hover:bg-primary hover:text-white border border-white/10";
        btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">bookmark_add</span>';
    }
};

// --- API FETCH PRINCIPAL ---
async function performSearch(isNewSearch = true) {
    const grid = document.getElementById('manga-grid');
    // ARREGLO EXTRA: Si no hay grid (estamos en details.html por ejemplo), salimos.
    if (!grid) return;

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

        const cleanUrl = decodeURIComponent(url.toString());
        const res = await fetch(PROXY + encodeURIComponent(cleanUrl));
        
        const json = await res.json();
        const mangas = json.data;

        if (isNewSearch && countLabel) {
            countLabel.innerText = `${json.total} Títulos`;
            grid.innerHTML = '';
        } else if (isNewSearch) {
             grid.innerHTML = ''; // Si countLabel no existe, al menos limpiamos el grid
        }

        if (!mangas || mangas.length === 0) {
            if(isNewSearch) grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">No se encontraron resultados.</p>';
            if(loadMoreBtn) loadMoreBtn.classList.add('hidden');
            return;
        }

        const mangaIds = mangas.map(m => m.id);
        const librarySet = new Set();
        if (user) {
            if(myLibraryCache.length > 0) {
                 myLibraryCache.forEach(item => { if(mangaIds.includes(item.manga_id)) librarySet.add(item.manga_id); });
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
            const coverUrl = fileName ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.512.jpg`) : 'https://via.placeholder.com/300x450?text=No+Cover';
            let flag = ''; if(attr.originalLanguage === 'ja') flag = '🇯🇵'; if(attr.originalLanguage === 'ko') flag = '🇰🇷'; if(attr.originalLanguage === 'zh') flag = '🇨🇳';
            const isFav = librarySet.has(manga.id);
            const btnClass = isFav ? "bg-primary text-white shadow-lg shadow-primary/40" : "bg-black/60 text-white/70 hover:bg-primary hover:text-white border border-white/10";
            const btnIcon = isFav ? "bookmark" : "bookmark_add";

            const card = `
                <div class="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-transform hover:scale-[1.02] cursor-pointer" onclick="window.location.href='details.html?id=${manga.id}'">
                    <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="${coverUrl}" loading="lazy" />
                    <button onclick="toggleQuickSave(event, '${manga.id}', '${safeTitle}', '${coverUrl}', this)" class="absolute top-2 right-2 p-2 rounded-full z-20 transition-all ${btnClass}">
                        <span class="material-symbols-outlined text-[20px]">${btnIcon}</span>
                    </button>
                    <div class="absolute inset-0 manga-card-gradient flex flex-col justify-end p-3">
                        <h4 class="text-sm font-bold line-clamp-2 leading-tight text-white group-hover:text-primary transition-colors text-shadow">${title}</h4>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs">${flag}</span>
                            <span class="text-[10px] text-gray-400 capitalize bg-black/50 px-1 rounded">${attr.status || 'Unknown'}</span>
                        </div>
                    </div>
                </div>`;
            grid.innerHTML += card;
        });

        if(loadMoreBtn) {
            if (filterState.offset + 20 < json.total) loadMoreBtn.classList.remove('hidden'); else loadMoreBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error(error);
        if(isNewSearch) grid.innerHTML = '<p class="col-span-full text-center text-red-400">Error.</p>';
    }
}