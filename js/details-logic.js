// js/details-logic.js
import { supabase } from './supabase-client.js';
import { toggleFavorite, checkLibraryStatus } from './db.js';

const BASE_URL = 'https://api.mangadex.org';
const PROXY = 'https://corsproxy.io/?'; 
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// VARIABLE DE ESTADO: Idioma actual (por defecto español)
let currentLang = 'es'; 

// 1. Obtener el ID de la URL
const params = new URLSearchParams(window.location.search);
const mangaId = params.get('id');

if (!mangaId) {
    window.location.href = 'dashboard.html';
}

// 2. Función Principal
async function initDetails() {
    await loadMangaMetadata(mangaId);
    await loadChapters(mangaId);
    checkIfFavorited(); 
    
}

// --- LOGICA DE METADATOS ---
// En js/details-logic.js

async function loadMangaMetadata(id) {
    try {
        const url = `${BASE_URL}/manga/${id}?includes[]=author&includes[]=artist&includes[]=cover_art`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        const data = json.data;
        const attr = data.attributes;

        // Título
        const title = attr.title.en || attr.title.es || Object.values(attr.title)[0];
        document.getElementById('manga-title').innerText = title;
        document.getElementById('nav-title').innerText = title;

        // Descripción
        const desc = getSafeDescription(attr.description);
        const descElement = document.getElementById('manga-desc');
        descElement.innerText = desc;
        if(desc.length > 200) document.getElementById('toggle-desc').classList.remove('hidden');

        // Estado
        const status = attr.status;
        const statusEl = document.getElementById('manga-status');
        statusEl.innerText = status === 'ongoing' ? 'En Emisión' : 'Finalizado';
        // (El resto de la lógica del status se queda igual...)

        // Autor
        const authorObj = data.relationships.find(r => r.type === 'author');
        if (authorObj) document.getElementById('manga-author').innerText = authorObj.attributes?.name || "Autor Desconocido";

        // Portada
        const coverObj = data.relationships.find(r => r.type === 'cover_art');
        const fileName = coverObj ? coverObj.attributes.fileName : null;
        if (fileName) {
            const rawUrl = `${COVER_BASE}/${id}/${fileName}.512.jpg`;
            const finalUrl = PROXY + encodeURIComponent(rawUrl);
            document.getElementById('manga-cover').src = finalUrl;
            document.getElementById('manga-bg').style.backgroundImage = `url('${finalUrl}')`;
        }

        // --- 🔥 NUEVO: GÉNEROS (TAGS) 🔥 ---
        // --- GÉNEROS (TAGS) CLICKEABLES ---
        const genresContainer = document.getElementById('manga-genres');
        if (genresContainer && attr.tags.length > 0) {
            genresContainer.innerHTML = ''; 
            
            attr.tags.forEach(tag => {
                const tagName = tag.attributes.name.en;
                const tagId = tag.id; // 🔥 IMPORTANTE: Obtenemos el ID del tag
                const translatedTag = translateGenre(tagName);

                const btn = document.createElement('button');
                // Agregamos cursor-pointer y hover para que se vea clickeable
                btn.className = "whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/10 text-gray-300 border border-white/5 hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer";
                btn.innerText = translatedTag;
                
                // 🔥 AL HACER CLIC: Redirigir a search con el ID
                btn.onclick = () => {
                    window.location.href = `search.html?tag=${tagId}`;
                };

                genresContainer.appendChild(btn);
            });
        }

    } catch (error) {
        console.error("Error cargando detalles:", error);
    }
}

// --- 🔥 LOGICA DE CAPÍTULOS CON FILTRO DE IDIOMA 🔥 ---

// Esta función se llama desde los botones del HTML
window.changeChapterLang = function(lang) {
    if (currentLang === lang) return; // Si ya está en ese idioma, no hacer nada

    currentLang = lang;
    
    // Actualizar estilo visual de los botones
    const btnEs = document.getElementById('btn-lang-es');
    const btnEn = document.getElementById('btn-lang-en');

    if (lang === 'es') {
        btnEs.className = "px-3 py-1 rounded-md text-xs font-bold transition-all bg-primary text-white shadow-lg";
        btnEn.className = "px-3 py-1 rounded-md text-xs font-bold text-gray-400 hover:text-white transition-all";
    } else {
        btnEn.className = "px-3 py-1 rounded-md text-xs font-bold transition-all bg-primary text-white shadow-lg";
        btnEs.className = "px-3 py-1 rounded-md text-xs font-bold text-gray-400 hover:text-white transition-all";
    }

    // Recargar lista
    loadChapters(mangaId);
};

// En js/details-logic.js

async function loadChapters(id) {
    const container = document.getElementById('chapters-container');
    
    // Spinner de carga
    container.innerHTML = `
        <div class="flex justify-center py-10">
            <span class="material-symbols-outlined animate-spin text-primary">sync</span>
        </div>`;
    
    try {
        const url = new URL(`${BASE_URL}/manga/${id}/feed`);
        
        // CONFIGURACIÓN DINÁMICA DE IDIOMA
        if (currentLang === 'es') {
            url.searchParams.append('translatedLanguage[]', 'es');
            url.searchParams.append('translatedLanguage[]', 'es-la');
        } else {
            url.searchParams.append('translatedLanguage[]', 'en');
        }

        url.searchParams.append('order[chapter]', 'desc');
        url.searchParams.append('limit', 200); 

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();
        const rawChapters = json.data;

        container.innerHTML = '';

        const langText = currentLang === 'es' ? 'en español' : 'en inglés';

        if (rawChapters.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">No hay capítulos ${langText} :(</p>`;
            return;
        }

        // --- FILTRO ANTI-REPETIDOS ---
        const uniqueChapters = [];
        const seenNumbers = new Set();

        rawChapters.forEach(chap => {
            const num = chap.attributes.chapter;
            if (!seenNumbers.has(num)) {
                seenNumbers.add(num);
                uniqueChapters.push(chap);
            }
        });

        // Configurar botón "Leer"
        const firstChapId = uniqueChapters[uniqueChapters.length - 1].id; 
        const readBtn = document.getElementById('read-btn');
        if(readBtn) {
            readBtn.onclick = () => window.location.href = `reader.html?chapter=${firstChapId}`;
            readBtn.innerHTML = `<span class="material-symbols-outlined">book_2</span> Leer ${currentLang === 'es' ? '' : '(EN)'}`;
        }

        // Renderizar la lista
        uniqueChapters.forEach(chap => {
            const attr = chap.attributes;
            const chapNum = attr.chapter || "Ex";
            const title = attr.title || "";
            const timeAgo = new Date(attr.publishAt).toLocaleDateString();
            
            const flag = attr.translatedLanguage === 'en' ? '🇬🇧' : (attr.translatedLanguage === 'es' ? '🇪🇸' : '🇲🇽');

            // --- 🔥 AQUÍ ESTÁ EL ARREGLO DEL TEXTO 🔥 ---
            const html = `
                <div onclick="window.location.href='reader.html?chapter=${chap.id}'" 
                     class="flex items-center justify-between p-4 bg-surface-dark rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition group active:scale-[0.99]">
                    
                    <div class="flex items-center gap-4 w-full overflow-hidden">
                        
                        <div class="w-10 h-10 shrink-0 bg-white/5 rounded flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition">
                            ${chapNum}
                        </div>

                        <div class="min-w-0 flex-1">
                            
                            <p class="text-sm font-bold text-gray-200 truncate">
                                Capítulo ${chapNum} ${title ? `: ${title}` : ''}
                            </p>

                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-gray-500 whitespace-nowrap">${timeAgo}</span>
                                <span class="text-[10px] uppercase text-gray-400 bg-black/30 px-1.5 rounded flex items-center gap-1 whitespace-nowrap">
                                    ${flag} ${attr.translatedLanguage}
                                </span>
                            </div>
                        </div>
                    </div>

                    <span class="material-symbols-outlined text-gray-600 group-hover:text-white shrink-0 ml-2">play_arrow</span>
                </div>
            `;
            container.innerHTML += html;
        });

    } catch (error) {
        console.error("Error capítulos:", error);
        container.innerHTML = '<p class="text-red-400">Error cargando capítulos</p>';
    }
}

// --- LOGICA DE FAVORITOS ---
async function checkIfFavorited() {
    const isFav = await checkLibraryStatus(mangaId);
    updateFavButton(isFav);
}

function updateFavButton(isFav) {
    const btn = document.getElementById('fav-btn');
    if (!btn) return; 

    if (isFav) {
        btn.innerHTML = '<span class="material-symbols-outlined fill-1">bookmark</span> <span class="ml-2 md:inline">En Biblioteca</span>';
        btn.classList.add('border-primary', 'text-primary');
        btn.classList.remove('text-white', 'border-white/5');
    } else {
        btn.innerHTML = '<span class="material-symbols-outlined">library_add</span> <span class="ml-2 md:inline">Guardar</span>';
        btn.classList.remove('border-primary', 'text-primary');
        btn.classList.add('text-white', 'border-white/5');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const favBtn = document.getElementById('fav-btn');
    if(favBtn) {
        favBtn.addEventListener('click', async () => {
            favBtn.style.opacity = "0.5";
            const title = document.getElementById('manga-title').innerText;
            const cover = document.getElementById('manga-cover').src;
            const isNowFav = await toggleFavorite(mangaId, title, cover);
            updateFavButton(isNowFav);
            favBtn.style.opacity = "1";
        });
    }
});

function getSafeDescription(descObj) {
    if (!descObj) return "Sin descripción disponible.";
    return descObj['es-la'] || descObj['es'] || descObj['en'] || Object.values(descObj)[0] || "Sin descripción disponible.";
}

// --- Helper para traducir géneros (Ponlo al final del archivo) ---
function translateGenre(englishName) {
    const map = {
        'Action': 'Acción', 'Adventure': 'Aventura', 'Comedy': 'Comedia',
        'Drama': 'Drama', 'Fantasy': 'Fantasía', 'Horror': 'Terror',
        'Mystery': 'Misterio', 'Romance': 'Romance', 'Sci-Fi': 'Ciencia Ficción',
        'Slice of Life': 'Recuentos de la vida', 'Sports': 'Deportes',
        'Psychological': 'Psicológico', 'Tragedy': 'Tragedia', 'Isekai': 'Isekai',
        'School Life': 'Escolar', 'Magic': 'Magia', 'Supernatural': 'Sobrenatural',
        'Military': 'Militar', 'Vampires': 'Vampiros', 'Zombies': 'Zombies',
        'Boys\' Love': 'BL', 'Girls\' Love': 'GL', 'Web Comic': 'Webcomic',
        'Full Color': 'A Color', 'Long Strip': 'Formato Webtoon', 'Reincarnation': 'Reencarnación',
        'Time Travel': 'Viaje en el tiempo', 'Video Games': 'Videojuegos', 'Monsters': 'Monstruos',
        'Villainess': 'Villana', 'Historical': 'Histórico', 'Martial Arts': 'Artes Marciales'
    };
    return map[englishName] || englishName; // Si no está en la lista, devuelve el original
}

initDetails();