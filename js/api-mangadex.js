// js/api-mangadex.js

const BASE_URL = 'https://api.mangadex.org';
const COVER_URL = 'https://uploads.mangadex.org/covers';

// 1. EL PROXY UNIFICADO
// Usaremos este para TODO (Datos e Imágenes) ya que sabemos que en tu red funciona.
const PROXY = 'https://corsproxy.io/?'; 

export async function getPopularMangas() {
    try {
        const targetUrl = `${BASE_URL}/manga?includes[]=cover_art&order[followedCount]=desc&limit=20&contentRating[]=safe&contentRating[]=suggestive`;
        
        // Petición de datos
        const response = await fetch(PROXY + encodeURIComponent(targetUrl));
        
        if (!response.ok) throw new Error('Error en la conexión con MangaDex');

        const data = await response.json();
        
        return data.data.map(manga => {
            // Buscamos el nombre del archivo de la portada
            const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
            const fileName = coverArt ? coverArt.attributes.fileName : null;
            
            // Construimos la URL
            let finalCoverUrl = 'https://via.placeholder.com/200x300?text=No+Cover';
            
            if (fileName) {
                const rawUrl = `${COVER_URL}/${manga.id}/${fileName}.256.jpg`;
                // Pasamos la imagen por el mismo proxy que los datos
                finalCoverUrl = PROXY + encodeURIComponent(rawUrl);
            }

            return {
                id: manga.id,
                title: manga.attributes.title.en || Object.values(manga.attributes.title)[0],
                cover: finalCoverUrl,
                desc: manga.attributes.description ? (manga.attributes.description.en || "Sin descripción") : "..."
            };
        });

    } catch (error) {
        console.error("Error obteniendo mangas:", error);
        return [];
    }
}

export function renderMangaGrid(mangas, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return; 
    
    container.innerHTML = ''; 

    mangas.forEach(manga => {
        const card = `
            <div onclick="window.location.href='details.html?id=${manga.id}'" 
                 class="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer bg-[#1a1023] border border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(140,37,244,0.3)]">
                
                <img src="${manga.cover}" 
                     alt="${manga.title}" 
                     loading="lazy" 
                     referrerpolicy="no-referrer"
                     class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>
                
                <div class="absolute bottom-0 left-0 p-3 w-full">
                    <h3 class="text-white font-bold text-sm truncate leading-tight">${manga.title}</h3>
                    <p class="text-[#ad90cb] text-xs mt-1">Popular</p>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}