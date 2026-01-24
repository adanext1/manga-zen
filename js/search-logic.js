import { supabase } from './supabase-client.js';
import { toggleFavorite } from './db.js';
// 🔥 IMPORTAMOS LA NUEVA FUNCIÓN getJellyfinCatalog
import { getJellyfinSearch, getJellyfinLatest, getJellyfinCatalog } from './jellyfin-client.js'; 

// --- CONFIGURACIÓN ---
const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// --- ESTADO GLOBAL ---
let currentTab = 'all'; 
let searchTimeout = null;
let USER_PERMISSIONS = { show_anime: true, show_manga: true, show_movies: true };
let myLibraryCache = []; 

// --- ESTADO DE FILTROS ---
let filterState = {
    query: '', sort: 'followedCount',
    status: [], demographic: [], content: ['safe', 'suggestive'], 
    tags: [], langs: ['es', 'es-la'], origLang: [], 
    offset: 0, 
    jellyfinOffset: 0 // Nuevo offset independiente para Jellyfin
};

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadPermissions(), loadLocalLibrary(), loadTagsFromApi()]);
    setupTabs();
    setupSearchInput();
    
    // Carga inicial (Descubrimiento)
    if (!filterState.query) loadInitialDiscovery();
    
    checkUrlForTags();
});

// ... (loadPermissions y loadLocalLibrary IGUAL QUE ANTES) ...
async function loadPermissions() {
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
        if(data) USER_PERMISSIONS = data;
    }
    if(!USER_PERMISSIONS.show_manga) document.querySelector('[data-cat="manga"]')?.classList.add('hidden');
    if(!USER_PERMISSIONS.show_anime) document.querySelector('[data-cat="anime"]')?.classList.add('hidden');
    if(!USER_PERMISSIONS.show_movies) document.querySelector('[data-cat="movies"]')?.classList.add('hidden');
}

async function loadLocalLibrary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('library').select('manga_id');
    if (data) myLibraryCache = data.map(i => i.manga_id);
}

// ==========================================
// 2. MODO DESCUBRIMIENTO (Inicio)
// ==========================================
async function loadInitialDiscovery() {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('results-dashboard').classList.remove('hidden');
    document.getElementById('full-grid').classList.add('hidden');
    document.getElementById('load-more-container').classList.add('hidden'); // Ocultar cargar más en Dashboard

    const promises = [];
    if (USER_PERMISSIONS.show_anime) {
        document.getElementById('sec-anime').classList.remove('hidden');
        promises.push(getJellyfinLatest('Series').then(items => renderDiscoveryItems(items, 'list-anime', 'details-video.html')));
    }
    if (USER_PERMISSIONS.show_movies) {
        document.getElementById('sec-movies').classList.remove('hidden');
        promises.push(getJellyfinLatest('movies').then(items => renderDiscoveryItems(items, 'list-movies', 'details-video.html')));
    }
    if (USER_PERMISSIONS.show_manga) {
        document.getElementById('sec-manga').classList.remove('hidden');
        promises.push(getMangaDexLatest().then(items => renderDiscoveryItems(items, 'list-manga', 'details.html')));
    }
    await Promise.all(promises);
}

// ... (renderDiscoveryItems y getMangaDexLatest IGUAL QUE ANTES) ...
function renderDiscoveryItems(items, containerId, baseUrl) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const id = item.id || item.Id; const title = item.title || item.Name; const img = item.cover || item.img; const tag = item.tag || '';
        const isFav = myLibraryCache.includes(id);
        const btnClass = isFav ? "bg-primary text-white" : "bg-black/60 text-white/70 hover:bg-primary hover:text-white";
        const btnIcon = isFav ? "bookmark" : "bookmark_add";
        const html = `
        <div class="group relative aspect-[2/3] w-32 md:w-40 snap-start shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer" onclick="window.location.href='${baseUrl}?id=${id}'">
            <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="${img}" loading="lazy" />
            <button onclick="toggleQuickSave(event, '${id}', '${encodeURIComponent(title)}', '${img}', this)" class="absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all ${btnClass}">
                <span class="material-symbols-outlined text-[16px]">${btnIcon}</span>
            </button>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-2">
                <h4 class="text-xs font-bold text-white line-clamp-2 leading-tight text-shadow">${title}</h4>
                ${tag ? `<span class="text-[9px] text-gray-400">${tag}</span>` : ''}
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

async function getMangaDexLatest() {
    try {
        const url = `${BASE_URL}/manga?limit=10&includes[]=cover_art&order[latestUploadedChapter]=desc&contentRating[]=safe&contentRating[]=suggestive`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        return json.data.map(m => {
            const attr = m.attributes;
            const rel = m.relationships.find(r => r.type === 'cover_art');
            const fname = rel ? rel.attributes.fileName : '';
            return {
                id: m.id, title: attr.title.en || Object.values(attr.title)[0],
                cover: fname ? PROXY + encodeURIComponent(`${COVER_BASE}/${m.id}/${fname}.256.jpg`) : '', tag: 'Nuevo'
            };
        });
    } catch { return []; }
}

// ==========================================
// 3. LÓGICA DE PESTAÑAS (Aquí está el cambio clave)
// ==========================================
function setupTabs() {
    document.querySelectorAll('.chip').forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            document.querySelectorAll('.chip').forEach(c => {
                c.classList.remove('bg-white', 'text-black');
                c.classList.add('bg-white/5', 'text-gray-400');
            });
            btn.classList.remove('bg-white/5', 'text-gray-400');
            btn.classList.add('bg-white', 'text-black');

            currentTab = btn.dataset.cat;
            
            // Mostrar/Ocultar botón filtros
            const filterBtn = document.getElementById('btn-filters');
            if(filterBtn) filterBtn.classList.toggle('hidden', currentTab !== 'manga');

            const query = document.getElementById('search-input').value.trim();
            
            // RESETEAR OFFSETS AL CAMBIAR PESTAÑA
            filterState.offset = 0;
            filterState.jellyfinOffset = 0;
            document.getElementById('full-grid').innerHTML = ''; // Limpiar grid

            if(query.length >= 3) {
                // Si hay búsqueda, buscamos
                performMasterSearch(query, true);
            } else {
                // 🔥 SI NO HAY BÚSQUEDA, CARGAMOS CATÁLOGO
                if(currentTab === 'all') loadInitialDiscovery();
                else loadCategoryCatalog(currentTab);
            }
        });
    });
}

// 🔥 NUEVA FUNCIÓN: Cargar Catálogo (Sin buscar)
async function loadCategoryCatalog(category) {
    document.getElementById('results-dashboard').classList.add('hidden');
    document.getElementById('full-grid').classList.remove('hidden');
    document.getElementById('load-more-container').classList.remove('hidden'); // Mostrar botón cargar más
    
    showLoader(true);

    if (category === 'manga') {
        // Para catálogo manga, forzamos orden por popularidad si no hay query
        if(!filterState.query) filterState.sort = 'followedCount';
        await searchMangaDexWrapper('', 20, 'grid'); 
    } else if (category === 'anime') {
        await loadJellyfinCatalogWrapper('Series', 'grid');
    } else if (category === 'movies') {
        await loadJellyfinCatalogWrapper('movies', 'grid');
    }
    
    showLoader(false);
}

// ==========================================
// 4. BÚSQUEDA Y CARGAR MÁS
// ==========================================
function setupSearchInput() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        filterState.query = query; 
        clearTimeout(searchTimeout);
        
        if(query.length === 0) {
            // Si borra, volvemos al estado inicial de la pestaña actual
            if(currentTab === 'all') loadInitialDiscovery();
            else loadCategoryCatalog(currentTab);
            return;
        }

        if(query.length < 3) return; 
        // Reset offsets para nueva búsqueda
        filterState.offset = 0;
        filterState.jellyfinOffset = 0;
        searchTimeout = setTimeout(() => performMasterSearch(query, true), 500);
    });
}

async function performMasterSearch(query, isNewSearch = false) {
    showLoader(true);
    const containerAll = document.getElementById('results-dashboard');
    const containerGrid = document.getElementById('full-grid');
    
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('results-container').classList.remove('hidden');

    if(isNewSearch) containerGrid.innerHTML = '';

    try {
        if (currentTab === 'all') {
            containerAll.classList.remove('hidden');
            containerGrid.classList.add('hidden');
            document.getElementById('load-more-container').classList.add('hidden'); // Sin cargar más en "Todo"
            
            const promises = [];
            if (USER_PERMISSIONS.show_anime) promises.push(searchJellyfinWrapper(query, 'Series', 'anime'));
            if (USER_PERMISSIONS.show_movies) promises.push(searchJellyfinWrapper(query, 'movies', 'movies'));
            if (USER_PERMISSIONS.show_manga) promises.push(searchMangaDexWrapper(query, 5, 'manga'));
            await Promise.all(promises);
        } else {
            containerAll.classList.add('hidden');
            containerGrid.classList.remove('hidden');
            document.getElementById('load-more-container').classList.remove('hidden');

            if (currentTab === 'manga') await searchMangaDexWrapper(query, 20, 'grid'); 
            else if (currentTab === 'anime') await searchJellyfinWrapper(query, 'Series', 'grid');
            else if (currentTab === 'movies') await searchJellyfinWrapper(query, 'movies', 'grid');
        }
    } catch (e) { console.error(e); } finally { showLoader(false); }
}

// 🔥 FUNCIÓN CARGAR MÁS ACTUALIZADA
window.loadMore = function() {
    // Si hay texto, usamos la búsqueda. Si no, usamos el catálogo.
    if (filterState.query) {
        // Aumentamos offset
        if (currentTab === 'manga') filterState.offset += 20;
        if (currentTab === 'anime' || currentTab === 'movies') filterState.jellyfinOffset += 20;
        
        performMasterSearch(filterState.query, false); // false = append (no borrar)
    } else {
        // Modo Catálogo
        if (currentTab === 'manga') {
            filterState.offset += 20;
            searchMangaDexWrapper('', 20, 'grid');
        } else {
            filterState.jellyfinOffset += 20;
            const type = currentTab === 'anime' ? 'Series' : 'movies';
            loadJellyfinCatalogWrapper(type, 'grid');
        }
    }
}

// ==========================================
// 5. WRAPPERS (Conexión APIs)
// ==========================================

// Wrapper para BÚSQUEDA Jellyfin (Por nombre)
async function searchJellyfinWrapper(query, type, renderMode) {
    const targetId = renderMode === 'grid' ? 'full-grid' : (type === 'Series' ? 'list-anime' : 'list-movies');
    const container = document.getElementById(targetId);
    if(!container) return;

    if(renderMode !== 'grid') {
        if(type === 'Series') document.getElementById('sec-anime').classList.remove('hidden');
        if(type === 'movies') document.getElementById('sec-movies').classList.remove('hidden');
    }

    // Nota: Jellyfin Search no soporta paginación fácil en este endpoint wrapper simple, 
    // pero para búsqueda está bien.
    const jellyItems = await getJellyfinSearch(query, type === 'movies' ? 'Movie' : 'Series'); 
    
    const items = jellyItems.map(j => ({
        id: j.Id, title: j.Name, cover: j.Image, type: 'video', 
        status: j.ProductionYear || '', flag: '' 
    }));

    renderCards(items, container, renderMode === 'grid');
}

// 🔥 NUEVO WRAPPER: Para CATÁLOGO Jellyfin (Sin nombre, solo lista)
async function loadJellyfinCatalogWrapper(type, renderMode) {
    const container = document.getElementById('full-grid');
    if(!container) return;

    // Usamos el offset nuevo de Jellyfin
    const jellyItems = await getJellyfinCatalog(type, 20, filterState.jellyfinOffset);

    const items = jellyItems.map(j => ({
        id: j.Id, title: j.Name, cover: j.Image, type: 'video', 
        status: j.ProductionYear || '', flag: '' 
    }));
    
    // Si no hay más items, ocultar botón cargar más
    if(items.length < 20) document.getElementById('load-more-container').classList.add('hidden');

    renderCards(items, container, true); // true = grid
}

async function searchMangaDexWrapper(query, limit, renderMode) {
    const targetId = renderMode === 'grid' ? 'full-grid' : 'list-manga';
    const container = document.getElementById(targetId);
    if(!container) return;
    
    if(renderMode === 'manga') document.getElementById('sec-manga').classList.remove('hidden');

    const url = new URL(`${BASE_URL}/manga`);
    if (query) url.searchParams.append('title', query);
    
    // Filtros
    if (currentTab === 'manga') { 
        url.searchParams.append(`order[${filterState.sort}]`, 'desc');
        filterState.status.forEach(s => url.searchParams.append('status[]', s));
        filterState.demographic.forEach(d => url.searchParams.append('publicationDemographic[]', d));
        filterState.tags.forEach(t => url.searchParams.append('includedTags[]', t));
    } else { url.searchParams.append('order[relevance]', 'desc'); }

    url.searchParams.append('limit', limit);
    url.searchParams.append('offset', filterState.offset); // Offset MangaDex
    url.searchParams.append('contentRating[]', 'safe');
    url.searchParams.append('contentRating[]', 'suggestive');
    url.searchParams.append('includes[]', 'cover_art');
    url.searchParams.append('availableTranslatedLanguage[]', 'es'); 

    const res = await fetch(PROXY + encodeURIComponent(decodeURIComponent(url.toString())));
    const json = await res.json();
    
    const items = json.data.map(m => {
        const attr = m.attributes;
        const rel = m.relationships.find(r => r.type === 'cover_art');
        const fname = rel ? rel.attributes.fileName : '';
        return {
            id: m.id,
            title: attr.title.en || Object.values(attr.title)[0],
            cover: fname ? PROXY + encodeURIComponent(`${COVER_BASE}/${m.id}/${fname}.512.jpg`) : '',
            type: 'manga',
            status: attr.status,
            flag: attr.originalLanguage === 'ja' ? '🇯🇵' : (attr.originalLanguage === 'ko' ? '🇰🇷' : '')
        };
    });

    renderCards(items, container, renderMode === 'grid');
}

// ==========================================
// 6. RENDERIZADO COMÚN & UTILS
// ==========================================
function renderCards(items, container, isGrid) {
    // Si es grid Y offset es 0 (primera carga), limpiar. 
    // Si estamos en "cargar más" (offset > 0), NO limpiar.
    if(isGrid && filterState.offset === 0 && filterState.jellyfinOffset === 0 && !document.getElementById('load-more-container').classList.contains('loading')) {
         // Ojo: Esta lógica es delicada. Mejor: performMasterSearch borra grid si isNewSearch=true.
         // Aquí solo borramos si no estamos en modo append.
         // Simplificación: Si el contenedor tiene hijos y items > 0, es append.
    } 
    // Corrección para simplicidad: performMasterSearch ya limpia el grid si es nueva búsqueda.
    // loadCategoryCatalog también. Así que aquí solo agregamos HTML.
    
    // OJO: Si es la fila horizontal (no grid), siempre limpiamos
    if(!isGrid) container.innerHTML = '';

    if (items.length === 0 && isGrid && container.children.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">No hay más resultados.</p>';
        return;
    }

    items.forEach(item => {
        const isFav = myLibraryCache.includes(item.id);
        const btnClass = isFav ? "bg-primary text-white" : "bg-black/60 text-white/70 hover:bg-primary hover:text-white";
        const btnIcon = isFav ? "bookmark" : "bookmark_add";
        const link = item.type === 'manga' ? `details.html?id=${item.id}` : `details-video.html?id=${item.id}`;
        const layoutClass = isGrid ? '' : 'snap-start shrink-0 w-32 md:w-40';

        const card = `
        <div class="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer ${layoutClass}" onclick="window.location.href='${link}'">
            <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src="${item.cover}" loading="lazy" />
            <button onclick="toggleQuickSave(event, '${item.id}', '${encodeURIComponent(item.title)}', '${item.cover}', this)" class="absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all ${btnClass}">
                <span class="material-symbols-outlined text-[18px]">${btnIcon}</span>
            </button>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-2">
                <h4 class="text-xs font-bold text-white line-clamp-2 leading-tight text-shadow">${item.title}</h4>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs">${item.flag}</span>
                    ${item.status ? `<span class="text-[9px] text-gray-400 capitalize bg-black/50 px-1 rounded">${item.status}</span>` : ''}
                </div>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });
}

window.toggleQuickSave = async (event, id, titleEncoded, coverUrl, btn) => {
    event.stopPropagation();
    const title = decodeURIComponent(titleEncoded);
    btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>';
    const isNowFav = await toggleFavorite(id, title, coverUrl);
    if(isNowFav) myLibraryCache.push(id); else myLibraryCache = myLibraryCache.filter(i => i !== id);
    if (isNowFav) {
        btn.className = "absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all bg-primary text-white";
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">bookmark</span>';
    } else {
        btn.className = "absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all bg-black/60 text-white/70 hover:bg-primary hover:text-white";
        btn.innerHTML = '<span class="material-symbols-outlined text-[18px]">bookmark_add</span>';
    }
};

function showLoader(show) {
    const loader = document.getElementById('search-loader');
    if(show) loader.classList.remove('hidden'); else loader.classList.add('hidden');
}

// ==========================================
// 6. HELPER FUNCTIONS (Tags, Filtros y UI)
// ==========================================

// --- CARGAR TAGS DESDE API ---
async function loadTagsFromApi() {
    const container = document.getElementById('genres-container');
    if(!container) return; 

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
            
            // Título de sección (opcional, si quieres separar visualmente)
            // container.innerHTML += `<h4 class="text-xs font-bold text-gray-500 uppercase w-full mt-2 mb-1">${title}</h4>`;

            tagList.forEach(tag => {
                const nameEn = tag.attributes.name.en;
                const id = tag.id;
                const nameEs = translateTag(nameEn);

                const btn = document.createElement('button');
                btn.className = `filter-chip px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-sm text-gray-300 hover:bg-white/10 transition-all select-none whitespace-nowrap`;
                btn.innerText = nameEs;
                btn.dataset.id = id;
                // Importante: Aquí llamamos a la función global
                btn.onclick = () => window.toggleFilterChip(btn, 'tags', id);
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
        // Forzamos la pestaña a Manga si vienes por un tag
        document.querySelector('[data-cat="manga"]').click();
        
        filterState.tags = [tagFromUrl];
        filterState.query = ''; 
        
        setTimeout(() => {
            const btn = document.querySelector(`.filter-chip[data-id="${tagFromUrl}"]`);
            if(btn) {
                btn.classList.add('bg-primary/20', 'border-primary', 'text-white', 'active');
                btn.classList.remove('bg-white/5', 'text-gray-300');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
            performMasterSearch(''); // Ejecutar búsqueda
        }, 500);
    }
}

// ==========================================
// 7. FUNCIONES WINDOW (Botones HTML)
// ==========================================

window.toggleFilterChip = function(btn, category, value) {
    const isActive = btn.classList.contains('active');
    
    // Limpiamos la barra de búsqueda si usas filtros
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
    window.setSort('followedCount');
    
    // Recargar
    performMasterSearch('');
};

window.applySearch = function() {
    filterState.offset = 0; 
    window.toggleFilters(); 
    performMasterSearch('');
};

window.toggleFilters = function() {
    const overlay = document.getElementById('filter-overlay');
    const panel = document.getElementById('filter-panel');
    if(!overlay || !panel) return;

    const isClosed = overlay.classList.contains('opacity-0');
    if (isClosed) { 
        overlay.classList.remove('opacity-0', 'pointer-events-none'); 
        panel.classList.remove('translate-y-full'); 
    } else { 
        overlay.classList.add('opacity-0', 'pointer-events-none'); 
        panel.classList.add('translate-y-full'); 
    }
};

window.loadMore = function() {
    filterState.offset += 20;
    // Llamada especial para cargar más sin borrar lo anterior
    // Nota: Como performMasterSearch borra el grid, para loadMore necesitarías 
    // una lógica ligeramente distinta, pero por ahora re-buscar funciona como paginación simple.
    // Idealmente: performMasterSearch(filterState.query, true) donde true = append mode.
    performMasterSearch(filterState.query); 
}