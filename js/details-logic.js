// js/details-logic.js
import { supabase } from './supabase-client.js';
import { toggleFavorite, checkLibraryStatus } from './db.js';

// Reutilizamos la lógica del Proxy que ya probamos
const BASE_URL = 'https://api.mangadex.org';
const PROXY = 'https://corsproxy.io/?'; 
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// 1. Obtener el ID de la URL
const params = new URLSearchParams(window.location.search);
const mangaId = params.get('id');

if (!mangaId) {
    window.location.href = 'dashboard.html';
}

// 2. Función Principal: Cargar Todo
async function initDetails() {
    await loadMangaMetadata(mangaId);
    await loadChapters(mangaId);
    checkIfFavorited(); // Verificar si ya es favorito al entrar
}

// --- LOGICA DE METADATOS ---
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

        // --- MODIFICACIÓN AQUÍ: Descripción Priorizando Español ---
        const desc = getSafeDescription(attr.description);
        
        const descElement = document.getElementById('manga-desc');
        descElement.innerText = desc;
        
        // Mostrar botón "Leer más" solo si es muy larga
        if(desc.length > 200) document.getElementById('toggle-desc').classList.remove('hidden');

        // Estado
        const status = attr.status;
        const statusEl = document.getElementById('manga-status');
        statusEl.innerText = status === 'ongoing' ? 'En Emisión' : 'Finalizado';
        statusEl.className = status === 'ongoing' 
            ? "bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-green-500/30"
            : "bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-blue-500/30";

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

    } catch (error) {
        console.error("Error cargando detalles:", error);
    }
}

// --- LOGICA DE CAPÍTULOS ---
async function loadChapters(id) {
    const container = document.getElementById('chapters-container');
    
    try {
        const url = `${BASE_URL}/manga/${id}/feed?translatedLanguage[]=es&translatedLanguage[]=es-la&order[chapter]=desc&limit=100`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        const chapters = json.data;

        container.innerHTML = '';

        if (chapters.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay capítulos en español :(</p>';
            return;
        }

        const firstChapId = chapters[chapters.length - 1].id; 
        document.getElementById('read-btn').onclick = () => {
            window.location.href = `reader.html?chapter=${firstChapId}`;
        };

        chapters.forEach(chap => {
            const attr = chap.attributes;
            const chapNum = attr.chapter || "Ex";
            const title = attr.title || "";
            const timeAgo = new Date(attr.publishAt).toLocaleDateString();
            
            const html = `
                <div onclick="window.location.href='reader.html?chapter=${chap.id}'" 
                     class="flex items-center justify-between p-4 bg-surface-dark rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition group active:scale-[0.99]">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition">
                            ${chapNum}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-200">Capítulo ${chapNum} ${title ? `: ${title}` : ''}</p>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] text-gray-500">${timeAgo}</span>
                                <span class="text-[10px] uppercase text-gray-600 bg-black/30 px-1 rounded">${attr.translatedLanguage}</span>
                            </div>
                        </div>
                    </div>
                    <span class="material-symbols-outlined text-gray-600 group-hover:text-white">play_arrow</span>
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

// 1. Verificar estado al cargar
async function checkIfFavorited() {
    const isFav = await checkLibraryStatus(mangaId);
    updateFavButton(isFav);
}

// 2. Actualizar visualmente el botón
function updateFavButton(isFav) {
    const btn = document.getElementById('fav-btn');
    if (!btn) return; 

    if (isFav) {
        // Estilo "Guardado"
        btn.innerHTML = '<span class="material-symbols-outlined fill-1">bookmark</span> <span class="ml-2 md:inline">En Biblioteca</span>';
        btn.classList.add('border-primary', 'text-primary');
        btn.classList.remove('text-white', 'border-white/5');
    } else {
        // Estilo "No Guardado"
        btn.innerHTML = '<span class="material-symbols-outlined">library_add</span> <span class="ml-2 md:inline">Guardar</span>';
        btn.classList.remove('border-primary', 'text-primary');
        btn.classList.add('text-white', 'border-white/5');
    }
}

// 3. Escuchar el click
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

// --- HELPER: Prioridad de Idioma para Descripción ---
function getSafeDescription(descObj) {
    if (!descObj) return "Sin descripción disponible.";
    
    // Intenta Español Latino -> Español España -> Inglés -> Lo que sea
    return descObj['es-la'] || 
           descObj['es'] || 
           descObj['en'] || 
           Object.values(descObj)[0] || 
           "Sin descripción disponible.";
}

// Arrancar
initDetails();