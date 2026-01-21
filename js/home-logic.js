// js/home-logic.js
import { supabase } from './supabase-client.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';
const COVER_BASE = 'https://uploads.mangadex.org/covers';

// Ejecutar al cargar
loadContinueReading();
loadLatestUpdates();
loadNewMangas();

async function loadContinueReading() {
    const container = document.getElementById('continue-reading-container');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // 1. Pedir a Supabase la última lectura (ordenada por fecha)
    const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_read', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        console.log("No hay lecturas recientes o error:", error);
        return; // Dejamos el mensaje por defecto
    }

    // 2. Si hay datos, necesitamos la portada (que no guardamos en la BD)
    // Hacemos una llamada rápida a MangaDex para obtener el fileName de la portada
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
        console.error("Error cargando portada:", e);
    }

    // 3. Pintar la Tarjeta Hero 
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
                    ${data.manga_title || 'Manga Desconocido'}
                </h3>
                
                <p class="text-sm text-gray-300">
                    Capítulo ${data.chapter_num} • Página ${data.page_number}
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

// --- 🔥 NUEVA FUNCIÓN: ÚLTIMAS ACTUALIZACIONES ---
async function loadLatestUpdates() {
    const container = document.getElementById('latest-updates-container');
    if (!container) return;

    try {
        const url = new URL(`${BASE_URL}/manga`);
        
        // CONFIGURACIÓN DE LA API PARA "LO NUEVO"
        url.searchParams.append('limit', 10); // Traer 10 mangas
        url.searchParams.append('includes[]', 'cover_art'); // Queremos portadas
        url.searchParams.append('order[latestUploadedChapter]', 'desc'); // Ordenar por fecha de subida
        
        // FILTROS DE IDIOMA (Vital para que no salga basura)
        url.searchParams.append('availableTranslatedLanguage[]', 'es');
        url.searchParams.append('availableTranslatedLanguage[]', 'es-la');
        
        // FILTRO DE CONTENIDO (Seguro + Ecchi suave)
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        // Limpiar skeletons
        container.innerHTML = '';

        if (!json.data || json.data.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No hay actualizaciones recientes.</p>';
            return;
        }

        json.data.forEach(manga => {
            const attr = manga.attributes;
            const title = attr.title.en || attr.title.es || Object.values(attr.title)[0] || 'Sin Título';
            
            // Portada
            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            const fileName = coverRel ? coverRel.attributes.fileName : '';
            const coverUrl = fileName 
                ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.256.jpg`) // .256.jpg es más ligero para listas
                : 'https://via.placeholder.com/200x300?text=No+Cover';

            // Tarjeta (Diseño Vertical Compacto)
            const card = `
                <div onclick="window.location.href='details.html?id=${manga.id}'" 
                     class="snap-start shrink-0 w-32 md:w-40 flex flex-col gap-2 cursor-pointer group">
                    
                    <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 shadow-md">
                        <img src="${coverUrl}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100">
                        
                        <div class="absolute top-2 left-2 bg-green-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-wide">
                            Nuevo Cap
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                            ${title}
                        </h3>
                        <p class="text-[10px] text-gray-400">Hace poco</p>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });

    } catch (e) {
        console.error("Error cargando updates:", e);
        container.innerHTML = '<p class="text-red-500 text-xs">Error de conexión.</p>';
    }

   
}

async function loadNewMangas() {
    const container = document.getElementById('new-mangas-container');
    if (!container) return;

    try {
        const url = new URL(`${BASE_URL}/manga`);
        
        // CONFIGURACIÓN: ORDENAR POR FECHA DE CREACIÓN
        url.searchParams.append('limit', 10);
        url.searchParams.append('includes[]', 'cover_art');
        url.searchParams.append('order[createdAt]', 'desc'); // <--- LA CLAVE
        
        // FILTROS (Opcional: Si quieres que tengan al menos algo en español)
        // Si lo quitas, saldrán mangas que acaban de salir en Japón aunque no tengan traducción aún
        url.searchParams.append('availableTranslatedLanguage[]', 'es');
        url.searchParams.append('availableTranslatedLanguage[]', 'es-la');
        
        url.searchParams.append('contentRating[]', 'safe');
        url.searchParams.append('contentRating[]', 'suggestive');

        const res = await fetch(PROXY + encodeURIComponent(url.toString()));
        const json = await res.json();

        container.innerHTML = '';

        if (!json.data || json.data.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No hay estrenos recientes.</p>';
            return;
        }

        json.data.forEach(manga => {
            const attr = manga.attributes;
            const title = attr.title.en || attr.title.es || Object.values(attr.title)[0] || 'Sin Título';
            
            const coverRel = manga.relationships.find(r => r.type === 'cover_art');
            const fileName = coverRel ? coverRel.attributes.fileName : '';
            const coverUrl = fileName 
                ? PROXY + encodeURIComponent(`${COVER_BASE}/${manga.id}/${fileName}.256.jpg`)
                : 'https://via.placeholder.com/200x300?text=No+Cover';

            const card = `
                <div onclick="window.location.href='details.html?id=${manga.id}'" 
                     class="shrink-0 w-32 md:w-40 flex flex-col gap-2 cursor-pointer group">
                    
                    <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 shadow-md">
                        <img src="${coverUrl}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100">
                        
                        <div class="absolute top-2 left-2 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-wide">
                            Estreno
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
            container.innerHTML += card;
        });

    } catch (e) {
        console.error("Error cargando estrenos:", e);
    }
}

// --- FIX GENERAL: SCROLL HORIZONTAL SUAVE PARA TODOS ---
// Seleccionamos TODOS los contenedores que sean de scroll horizontal
const scrollContainers = document.querySelectorAll('#latest-updates-container, #new-mangas-container, #trending-container');

scrollContainers.forEach(container => {
    container.addEventListener("wheel", (evt) => {
        if(container.scrollWidth > container.clientWidth) {
            evt.preventDefault();
            container.scrollBy({
                left: evt.deltaY * 3,
                behavior: 'smooth'
            });
        }
    }, { passive: false });
});