// js/home-logic.js
import { supabase } from './supabase-client.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadContinueReading();
    loadLatestUpdates();
    loadNewMangas();
    loadTrending(); // Agregamos tendencias también
    setupHorizontalScroll();
});

// 1. CONTINUAR LEYENDO (Hero Section)
async function loadContinueReading() {
    const container = document.getElementById('continue-reading-container');
    if (!container) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                <p>Inicia sesión para guardar tu progreso.</p>
            </div>`;
        return;
    }

    // Pedir última lectura a Supabase
    const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        // Mensaje por defecto si no ha leído nada
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                <p>No tienes lecturas recientes.</p>
                <a href="search.html" class="text-primary text-sm font-bold mt-2 inline-block hover:underline">Explorar Mangas</a>
            </div>`;
        return;
    }

    // Buscar portada en MangaDex
    let coverUrl = 'https://via.placeholder.com/800x400?text=Sin+Portada';
    try {
        const url = `${BASE_URL}/manga/${data.manga_id}?includes[]=cover_art`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        const coverObj = json.data.relationships.find(r => r.type === 'cover_art');
        
        if (coverObj) {
            const rawUrl = `${COVER_BASE}/${data.manga_id}/${coverObj.attributes.fileName}.512.jpg`;
            coverUrl = PROXY + encodeURIComponent(rawUrl);
        }
    } catch (e) {
        console.error("Error portada continue:", e);
    }

    // Renderizar Tarjeta Grande
    const html = `
        <div onclick="window.location.href='reader.html?chapter=${data.chapter_id}'" 
             class="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden bg-surface-dark shadow-2xl group cursor-pointer border border-white/5 transition-transform hover:scale-[1.01]">
            
            <div class="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity duration-700" 
                 style="background-image: url('${coverUrl}');"></div>
            
            <div class="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent"></div>
            
            <div class="relative p-6 flex flex-col h-full justify-end items-start gap-2">
                <span class="inline-flex items-center rounded-md bg-primary/20 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30 backdrop-blur-md">
                    Continuar leyendo
                </span>
                
                <h3 class="text-2xl md:text-4xl font-bold leading-tight text-white shadow-black drop-shadow-lg truncate w-full">
                    ${data.manga_title || 'Manga Sin Título'}
                </h3>
                
                <p class="text-sm text-gray-300">
                    Capítulo ${data.chapter_num} ${data.page_number ? `• Pág ${data.page_number}` : ''}
                </p>
                
                <button class="mt-2 flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition">
                    <span class="material-symbols-outlined text-sm">resume</span>
                    Reanudar
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// 2. RECIÉN ACTUALIZADOS
async function loadLatestUpdates() {
    const container = document.getElementById('latest-updates-container');
    if (!container) return;

    try {
        const url = new URL(`${BASE_URL}/manga`);
        url.searchParams.append('limit', 10);
        url.searchParams.append('includes[]', 'cover_art');
        url.searchParams.append('order[latestUploadedChapter]', 'desc');
        url.searchParams.append('availableTranslatedLanguage[]', 'es');
        url.searchParams.append('availableTranslatedLanguage[]', 'es-la');
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        container.innerHTML = '';

        if (!json.data || json.data.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Sin actualizaciones.</p>';
            return;
        }

        json.data.forEach(manga => {
            const card = createMiniCard(manga, 'Nuevo Cap', 'bg-green-500 text-black');
            container.innerHTML += card;
        });

    } catch (e) { console.error(e); }
}

// 3. NUEVOS EN EL CATÁLOGO
async function loadNewMangas() {
    const container = document.getElementById('new-mangas-container');
    if (!container) return;

    try {
        const url = new URL(`${BASE_URL}/manga`);
        url.searchParams.append('limit', 10);
        url.searchParams.append('includes[]', 'cover_art');
        url.searchParams.append('order[createdAt]', 'desc'); 
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        container.innerHTML = '';

        json.data.forEach(manga => {
            const card = createMiniCard(manga, 'Estreno', 'bg-blue-500 text-white');
            container.innerHTML += card;
        });

    } catch (e) { console.error(e); }
}

// 4. TENDENCIAS (GRILLA)
async function loadTrending() {
    const container = document.getElementById('manga-container');
    if (!container) return;

    try {
        const url = `${BASE_URL}/manga?includes[]=cover_art&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&limit=10`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        
        container.innerHTML = '';
        json.data.forEach(manga => {
            const card = createGridCard(manga);
            container.innerHTML += card;
        });
    } catch (e) { console.error(e); }
}

// --- HELPERS PARA TARJETAS ---

function createMiniCard(manga, badgeText, badgeColor) {
    const attr = manga.attributes;
    const title = attr.title.en || attr.title.es || Object.values(attr.title)[0] || 'Sin Título';
    const coverUrl = getCover(manga);

    return `
        <div onclick="window.location.href='details.html?id=${manga.id}'" 
             class="snap-start shrink-0 w-32 md:w-40 flex flex-col gap-2 cursor-pointer group">
            
            <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 shadow-md border border-white/5">
                <img src="${coverUrl}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100">
                
                <div class="absolute top-2 left-2 ${badgeColor} text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wide">
                    ${badgeText}
                </div>
            </div>

            <div>
                <h3 class="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                    ${title}
                </h3>
                <p class="text-[10px] text-gray-400 capitalize">${attr.status || 'Manga'}</p>
            </div>
        </div>
    `;
}

function createGridCard(manga) {
    const attr = manga.attributes;
    const title = attr.title.en || attr.title.es || Object.values(attr.title)[0] || 'Sin Título';
    const coverUrl = getCover(manga);
    
    let flag = '';
    if(attr.originalLanguage === 'ja') flag = '🇯🇵';
    if(attr.originalLanguage === 'ko') flag = '🇰🇷';
    if(attr.originalLanguage === 'zh') flag = '🇨🇳';

    return `
        <div class="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-transform hover:scale-[1.02] cursor-pointer"
             onclick="window.location.href='details.html?id=${manga.id}'">
            
            <img class="absolute inset-0 size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                 src="${coverUrl}" loading="lazy" />
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                <h4 class="text-sm font-bold line-clamp-2 leading-tight text-white group-hover:text-primary transition-colors text-shadow">${title}</h4>
                <div class="flex items-center gap-2 mt-2">
                    <span class="text-xs">${flag}</span>
                    <span class="text-[10px] text-gray-400 capitalize bg-black/50 px-1 rounded">${attr.status || 'Unknown'}</span>
                </div>
            </div>
        </div>
    `;
}

function getCover(manga) {
    const coverRel = manga.relationships.find(r => r.type === 'cover_art');
    const fileName = coverRel ? coverRel.attributes.fileName : '';
    return fileName 
        ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.256.jpg`)
        : 'https://via.placeholder.com/200x300?text=No+Cover';
}

// --- FIX SCROLL HORIZONTAL ---
function setupHorizontalScroll() {
    const scrollContainers = document.querySelectorAll('#latest-updates-container, #new-mangas-container');
    scrollContainers.forEach(container => {
        container.addEventListener("wheel", (evt) => {
            if(container.scrollWidth > container.clientWidth) {
                evt.preventDefault();
                container.scrollBy({ left: evt.deltaY * 3, behavior: 'smooth' });
            }
        }, { passive: false });
    });
}