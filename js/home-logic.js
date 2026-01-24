import { supabase } from './supabase-client.js';
// 🔥 IMPORTANTE: Importamos la configuración maestra
import { APP_MODULES } from './modules.js'; 
import { getJellyfinLatest, getItemDetails } from './jellyfin-client.js'; 

// --- CONFIGURACIÓN API MANGADEX ---
const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';
const JELLYFIN_URL = 'https://jellyfin.adanext.com'; 
const API_KEY = '5f927dd6d8c44675937c9fc747df0f07';

// Generamos las preferencias por defecto dinámicamente basadas en los módulos existentes
const DEFAULT_PREFS = APP_MODULES.map(mod => ({ id: mod.id, active: true }));

// Variable Global para permisos de Supabase
let GLOBAL_PERMISSIONS = {}; 

document.addEventListener('DOMContentLoaded', () => {
    initDashboard(); 
});

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
async function initDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // 1. Descargar "Permisos Maestros" de Supabase
    const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    // Si no existe, creamos un objeto con todos los permisos en true
    if (!settings) {
        GLOBAL_PERMISSIONS = {};
        APP_MODULES.forEach(m => GLOBAL_PERMISSIONS[m.db_col] = true);
    } else {
        GLOBAL_PERMISSIONS = settings;
    }

    // 2. Renderizar Dashboard
    await renderDashboard();
    
    // 3. Iniciar Panel de Arrastrar
    initSortablePanel();
}

async function renderDashboard() {
    const container = document.getElementById('dynamic-dashboard');
    container.innerHTML = ''; 

    // 1. Obtener preferencias de orden local
    let localPrefs = JSON.parse(localStorage.getItem('dashboard_prefs'));
    
    // Si no hay preferencias guardadas o el número de módulos cambió, regeneramos
    if (!localPrefs || localPrefs.length !== APP_MODULES.length) {
        localPrefs = DEFAULT_PREFS;
    }

    // 2. FILTRADO MAESTRO
    const modulesToRender = localPrefs.filter(pref => {
        const modInfo = APP_MODULES.find(m => m.id === pref.id);
        if (!modInfo) return false;

        // A) Permiso en Supabase
        const isAllowedGlobally = GLOBAL_PERMISSIONS[modInfo.db_col]; 
        // B) Activo localmente
        const isActiveLocally = pref.active;

        return isAllowedGlobally && isActiveLocally;
    });

    if (modulesToRender.length === 0) {
        container.innerHTML = `<div class="text-center py-20 opacity-50 flex flex-col items-center gap-4">
            <span class="material-symbols-outlined text-4xl">visibility_off</span>
            <p>Todo está oculto o desactivado.</p>
            <button onclick="togglePreferences()" class="text-primary hover:underline">Configurar Dashboard</button>
        </div>`;
        return;
    }

    // 3. BUCLE DE RENDERIZADO MODULAR
    for (const modPref of modulesToRender) {
        // Recuperamos toda la info del módulo (iconos, params, colores) desde modules.js
        const moduleInfo = APP_MODULES.find(m => m.id === modPref.id);
        
        // Pintar Estructura HTML
        const sectionHTML = getCategorySuperBlock(moduleInfo.id, moduleInfo);
        container.insertAdjacentHTML('beforeend', sectionHTML);
        
        // Cargar Datos según el TIPO de módulo
        if (moduleInfo.type === 'manga') {
            await loadRealMangaData(); 
        } else if (moduleInfo.type === 'jellyfin') {
            // 🔥 MAGIA: Pasamos el objeto completo para que sepa qué pedir
            await loadJellyfinSection(moduleInfo);
        }
    }
    
    setupHorizontalScroll();
}

// ==========================================
// 2. GESTIÓN DEL PANEL DE PREFERENCIAS
// ==========================================

function loadPreferencesIntoPanel() {
    const list = document.getElementById('sortable-modules');
    // Aseguramos tener prefs válidas
    let localPrefs = JSON.parse(localStorage.getItem('dashboard_prefs')) || DEFAULT_PREFS;
    
    // Sincronizar por si agregaste módulos nuevos en modules.js recientemente
    if (localPrefs.length !== APP_MODULES.length) {
        const newIds = APP_MODULES.map(m => m.id);
        const currentIds = localPrefs.map(p => p.id);
        // Agregamos los que falten
        APP_MODULES.forEach(m => {
            if(!currentIds.includes(m.id)) localPrefs.push({ id: m.id, active: true });
        });
    }

    list.innerHTML = '';

    localPrefs.forEach(pref => {
        const moduleInfo = APP_MODULES.find(m => m.id === pref.id);
        if(!moduleInfo) return;

        // FILTRO DE SEGURIDAD SUPABASE
        if (!GLOBAL_PERMISSIONS[moduleInfo.db_col]) return; 

        const isChecked = pref.active ? 'checked' : '';
        const opacityClass = pref.active ? 'opacity-100' : 'opacity-50';
        
        list.innerHTML += `
            <li data-id="${pref.id}" class="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between group ${opacityClass} transition-all select-none">
                <div class="flex items-center gap-3 cursor-grab handle">
                    <span class="material-symbols-outlined text-gray-500">drag_indicator</span>
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined ${moduleInfo.color} text-[20px]">${moduleInfo.icon}</span>
                        <span class="font-medium text-sm">${moduleInfo.name}</span>
                    </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer toggle-module" ${isChecked}>
                    <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </li>
        `;
    });

    document.querySelectorAll('.toggle-module').forEach(input => {
        input.addEventListener('change', (e) => {
            const row = e.target.closest('li');
            if(e.target.checked) row.classList.remove('opacity-50'); else row.classList.add('opacity-50');
        });
    });
}

window.savePreferences = function() {
    const listItems = document.querySelectorAll('#sortable-modules li');
    let currentPrefs = JSON.parse(localStorage.getItem('dashboard_prefs')) || DEFAULT_PREFS;
    
    const uiPrefsMap = new Map();
    listItems.forEach((li, index) => {
        const id = li.dataset.id;
        const isActive = li.querySelector('input[type="checkbox"]').checked;
        uiPrefsMap.set(id, { active: isActive, index: index });
    });

    const newPrefs = currentPrefs.sort((a, b) => {
        const idxA = uiPrefsMap.has(a.id) ? uiPrefsMap.get(a.id).index : 999;
        const idxB = uiPrefsMap.has(b.id) ? uiPrefsMap.get(b.id).index : 999;
        return idxA - idxB;
    }).map(p => {
        if (uiPrefsMap.has(p.id)) return { id: p.id, active: uiPrefsMap.get(p.id).active };
        return p;
    });

    localStorage.setItem('dashboard_prefs', JSON.stringify(newPrefs));
    togglePreferences();
    
    const btn = document.querySelector('#pref-panel button'); 
    if(btn) {
        const original = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Aplicando...`;
        setTimeout(() => { renderDashboard(); btn.innerHTML = original; }, 300);
    } else {
        renderDashboard();
    }
};

// ==========================================
// 3. UI GENERATORS
// ==========================================

function getCategorySuperBlock(type, info) {
    const continueLabel = type === 'manga' ? 'Continuar Leyendo' : 'Continuar Viendo';
    return `
        <div id="module-${type}" class="space-y-8 pb-12 border-b border-white/5 last:border-0 animate-fade-in">
            <div class="flex items-center gap-3 mb-2 px-2">
                <div class="p-2 bg-white/5 rounded-lg border border-white/5">
                    <span class="material-symbols-outlined ${info.color} text-2xl">${info.icon}</span>
                </div>
                <h1 class="text-2xl font-bold text-white tracking-tight">${info.name}</h1>
            </div>

            <section>
                <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">${continueLabel}</h2>
                <div id="continue-${type}" class="px-2">
                    <div class="p-4 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
                        <p class="text-xs">Cargando historial...</p>
                    </div>
                </div>
            </section>

            <section>
                <h2 class="text-lg font-bold text-white mb-3 px-2 flex items-center gap-2">
                    <span class="material-symbols-outlined ${info.color}">new_releases</span> Recién Actualizados
                </h2>
                <div id="updates-${type}" class="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x px-2">
                    ${getSkeletonList(4)}
                </div>
            </section>
            
            <section>
                <h2 class="text-lg font-bold text-white mb-3 px-2 flex items-center gap-2">
                    <span class="material-symbols-outlined text-yellow-400">trending_up</span> Tendencias
                </h2>
                <div id="trending-${type}" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 px-2">
                    ${getSkeletonList(5, true)}
                </div>
            </section>
        </div>
    `;
}

function getSkeletonList(count, isGrid = false) {
    const className = isGrid 
        ? "aspect-[2/3] rounded-xl bg-white/5 animate-pulse" 
        : "snap-start shrink-0 w-32 md:w-40 aspect-[2/3] rounded-xl bg-white/5 animate-pulse";
    return Array(count).fill(0).map(() => `<div class="${className}"></div>`).join('');
}


// ==========================================
// 4. LÓGICA DE CARGA DE DATOS (MODULARIZADA)
// ==========================================

async function loadJellyfinSection(moduleInfo) {
    const type = moduleInfo.id;

    // 1. Cargar "Continuar Viendo"
    await loadUniversalContinue(type);

    // 2. Cargar Listas (Latest)
    // 🔥 AQUÍ ESTÁ EL CAMBIO CLAVE: Usamos los parámetros del módulo
    const items = await getJellyfinLatest(moduleInfo.jellyfinParams);

    if (items.length === 0) {
        ['updates', 'trending'].forEach(sec => {
            const el = document.getElementById(`${sec}-${type}`);
            if(el) el.innerHTML = `<p class="text-xs text-gray-500 pl-2">Sin contenido nuevo.</p>`;
        });
        return;
    }

    renderCardList(`updates-${type}`, items.slice(0, 5), 'jellyfin', false, 'Nuevo', 'bg-blue-600');
    // Para tendencias de Jellyfin usamos los mismos "Latest" por ahora, o podrías crear un endpoint específico
    renderCardList(`trending-${type}`, items.slice(0, 10), 'jellyfin', true);
}

async function loadRealMangaData() {
    await loadUniversalContinue('manga');
    await loadMangaUpdates();
    await loadMangaTrending();
}

// ==========================================
// 5. LÓGICA "CONTINUAR VIENDO"
// ==========================================

async function loadUniversalContinue(sectionType) {
    const container = document.getElementById(`continue-${sectionType}`);
    if (!container) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5"><p class="text-xs">Inicia sesión.</p></div>`;
        return;
    }

    const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false })
        .limit(15); 

    if (error || !data || data.length === 0) {
         container.innerHTML = `<div class="p-4 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed"><p class="text-xs">Sin actividad reciente.</p></div>`;
         return;
    }

    let matchItem = null;

    if (sectionType === 'manga') {
        matchItem = data.find(item => item.manga_id.includes('-'));
    } else {
        // Lógica de filtrado para Jellyfin
        const jellyfinItems = data.filter(item => !item.manga_id.includes('-'));
        
        for (const item of jellyfinItems) {
            const details = await getItemDetails(item.manga_id);
            if (details) {
                let isMatch = false;
                
                // Mapeo lógico manual (Esto es lo único que queda "hardcoded" por seguridad)
                // Pero es genérico: Series vs Pelis vs Etiquetas
                if (sectionType === 'anime' && (details.type === 'Series' || (details.genres && details.genres.includes('Anime')))) isMatch = true;
                else if (sectionType === 'movies' && (details.type === 'Movie' || details.type === 'Video')) isMatch = true;
                else if (sectionType === 'series' && details.type === 'Series' && (!details.genres || !details.genres.includes('Anime'))) isMatch = true;
                // Soporte futuro para otros tipos (ej: cartoons)
                else if (sectionType === 'cartoons' && details.genres.includes('Animation') && !details.genres.includes('Anime')) isMatch = true;

                if (isMatch) {
                    matchItem = item;
                    matchItem.backdrop = details.backdrop || details.poster; 
                    break; 
                }
            }
        }
    }

    if (!matchItem) {
        container.innerHTML = `<div class="p-4 text-center text-gray-500 bg-white/5 rounded-xl border border-white/5 border-dashed"><p class="text-xs">Sin actividad reciente.</p></div>`;
        return;
    }

    if (sectionType === 'manga') {
        let coverUrl = 'https://via.placeholder.com/800x400?text=Cargando...';
        try {
            const url = `${BASE_URL}/manga/${matchItem.manga_id}?includes[]=cover_art`;
            const res = await fetch(PROXY + encodeURIComponent(url));
            const json = await res.json();
            const coverObj = json.data.relationships.find(r => r.type === 'cover_art');
            if (coverObj) coverUrl = PROXY + encodeURIComponent(`${COVER_BASE}/${matchItem.manga_id}/${coverObj.attributes.fileName}.512.jpg`);
        } catch (e) {}

        container.innerHTML = createContinueCard(matchItem.manga_title, `Capítulo ${matchItem.chapter_num}`, coverUrl, `reader.html?chapter=${matchItem.chapter_id}`, 'CONTINUAR');
    } else {
        const backdropUrl = matchItem.backdrop || `${JELLYFIN_URL}/Items/${matchItem.manga_id}/Images/Backdrop/0?api_key=${API_KEY}`;
        container.innerHTML = createContinueCard(matchItem.manga_title, "Reanudar", backdropUrl, `watch.html?id=${matchItem.chapter_id}`, 'REANUDAR');
    }
}

function createContinueCard(title, subtitle, img, link, badgeText) {
    return `
        <div onclick="window.location.href='${link}'" 
             class="relative w-full h-48 md:h-56 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl cursor-pointer border border-white/10 group">
            <div class="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity" style="background-image: url('${img}');"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div class="relative p-5 flex flex-col h-full justify-end items-start">
                <span class="bg-[#ff6740]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow mb-2 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">play_circle</span> ${badgeText}
                </span>
                <h3 class="text-xl md:text-2xl font-bold text-white truncate w-full shadow-black drop-shadow-lg">${title}</h3>
                <p class="text-sm text-gray-300 font-medium">${subtitle}</p>
            </div>
        </div>`;
}

// ==========================================
// APIS EXTERNAS
// ==========================================
async function loadMangaUpdates() {
    const container = document.getElementById('updates-manga');
    try {
        const url = new URL(`${BASE_URL}/manga`);
        url.searchParams.append('limit', 10);
        url.searchParams.append('includes[]', 'cover_art');
        url.searchParams.append('order[latestUploadedChapter]', 'desc');
        url.searchParams.append('availableTranslatedLanguage[]', 'es');
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive'); 

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();
        renderCardList(container, json.data, 'manga', false, 'Cap Nuevo', 'bg-green-500 text-black');
    } catch (e) { console.error(e); }
}

async function loadMangaTrending() {
    const container = document.getElementById('trending-manga');
    try {
        const url = `${BASE_URL}/manga?includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&limit=10`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        renderCardList(container, json.data, 'manga', true); 
    } catch (e) { console.error(e); }
}

// --- HELPER RENDER ---
function renderCardList(containerIdOrElement, items, type, isGrid = false, badgeText = '', badgeColor = '') {
    const container = typeof containerIdOrElement === 'string' ? document.getElementById(containerIdOrElement) : containerIdOrElement;
    if (!container) return;
    container.innerHTML = '';
    
    let baseUrl = type === 'manga' ? 'details.html' : 'details-video.html';
    const widthClass = isGrid ? "w-full" : "w-32 md:w-40";

    items.forEach(item => {
        let title, coverUrl, id, tag;

        if (type === 'manga') {
            const attr = item.attributes;
            title = attr.title.en || Object.values(attr.title)[0] || 'Sin Título';
            id = item.id;
            coverUrl = getMangaCover(item);
            tag = badgeText; 
        } else {
            // Jellyfin
            title = item.title;
            id = item.id;
            coverUrl = item.img;
            tag = item.tag || badgeText; 
        }

        const tagBadge = tag ? `<div class="absolute top-2 left-2 ${badgeColor || 'bg-primary text-white'} text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wide">${tag}</div>` : '';

        container.innerHTML += `
            <div onclick="window.location.href='${baseUrl}?id=${id}'" class="${isGrid ? '' : 'snap-start shrink-0'} ${widthClass} ${isGrid ? 'aspect-[2/3]' : 'flex flex-col gap-2'} cursor-pointer group">
                <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 border border-white/5">
                    <img src="${coverUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" loading="lazy">
                    ${tagBadge}
                </div>
                <h3 class="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">${title}</h3>
            </div>
        `;
    });
}

function getMangaCover(manga) {
    const coverRel = manga.relationships.find(r => r.type === 'cover_art');
    const fileName = coverRel ? coverRel.attributes.fileName : '';
    return fileName ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.256.jpg`) : 'https://via.placeholder.com/200x300';
}

function setupHorizontalScroll() {
    const containers = document.querySelectorAll('.overflow-x-auto');
    containers.forEach(container => {
        container.addEventListener("wheel", (evt) => {
            if(container.scrollWidth > container.clientWidth) {
                evt.preventDefault();
                container.scrollBy({ left: evt.deltaY * 3, behavior: 'smooth' });
            }
        }, { passive: false });
    });
}

// --- UTILS UI ---
function initSortablePanel() {
    const el = document.getElementById('sortable-modules');
    if (typeof Sortable !== 'undefined' && el) {
        new Sortable(el, { handle: '.handle', animation: 150, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag' });
    }
}

window.togglePreferences = function() {
    const overlay = document.getElementById('pref-overlay');
    const panel = document.getElementById('pref-panel');
    if (panel.classList.contains('translate-x-full')) {
        overlay.classList.remove('hidden');
        setTimeout(() => { overlay.classList.remove('opacity-0'); panel.classList.remove('translate-x-full'); }, 10);
        loadPreferencesIntoPanel(); // Carga la lista filtrada por Supabase
    } else {
        overlay.classList.add('opacity-0'); panel.classList.add('translate-x-full');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300);
    }
};