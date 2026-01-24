// js/jellyfin-client.js

// 🔴 CAMBIO IMPORTANTE:
// En vez de la URL completa, usamos la ruta relativa del túnel de Vercel.
const JELLYFIN_URL = '/api/jellyfin'; 

// Las imágenes SI necesitan la URL real completa para que el navegador las descargue
const JELLYFIN_IMAGE_BASE = 'https://jellyfin.adanext.com';

const API_KEY = '5f927dd6d8c44675937c9fc747df0f07'; 
const USER_ID = 'c905909790c84d488555825ccbaaf923';

// 1. OBTENER ÚLTIMOS
export async function getJellyfinLatest(queryParams) {
    try {
        // Fetch a la ruta interna (/api/jellyfin/...)
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/Latest?Limit=10&Fields=PrimaryImageAspectRatio,ProductionYear,Genres,Tags${queryParams}&api_key=${API_KEY}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const json = await res.json();
        
        return json.map(item => ({
            id: item.Id,
            title: item.Name,
            // 🖼️ Las imágenes usan la URL REAL externa
            img: `${JELLYFIN_IMAGE_BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            year: item.ProductionYear,
            type: item.Type === 'Movie' ? 'video' : 'series',
            tag: item.ProductionYear ? String(item.ProductionYear) : ''
        }));
    } catch (e) {
        console.error("Error Jellyfin Latest:", e);
        return [];
    }
}

// 2. DETALLES
export async function getItemDetails(itemId) {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/${itemId}?Fields=Overview,ProductionYear,Genres,OfficialRating,Tags&api_key=${API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const item = await res.json();
        
        return {
            id: item.Id,
            title: item.Name,
            overview: item.Overview,
            year: item.ProductionYear,
            genres: item.Genres || [],
            tags: item.Tags || [],
            type: item.Type,
            // 🖼️ Imágenes con URL real
            backdrop: `${JELLYFIN_IMAGE_BASE}/Items/${item.Id}/Images/Backdrop/0?api_key=${API_KEY}`,
            poster: `${JELLYFIN_IMAGE_BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`
        };
    } catch (e) {
        console.error("Error Jellyfin Details:", e);
        return null;
    }
}

// 3. BÚSQUEDA
export async function getJellyfinSearch(query, includeTypes = 'Series,Movie') {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?searchTerm=${encodeURIComponent(query)}&IncludeItemTypes=${includeTypes}&Recursive=true&Fields=PrimaryImageAspectRatio,ProductionYear,Status&Limit=20&api_key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.Items.map(item => ({
            Id: item.Id,
            Name: item.Name,
            Image: `${JELLYFIN_IMAGE_BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            ProductionYear: item.ProductionYear,
            Type: item.Type
        }));
    } catch (e) {
        console.error("Error Jellyfin Search:", e);
        return [];
    }
}

// 4. CATÁLOGO
export async function getJellyfinCatalog(type, limit = 20, startIndex = 0) {
    try {
        const itemType = type === 'movies' ? 'Movie' : 'Series';
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?IncludeItemTypes=${itemType}&Recursive=true&SortBy=DateCreated,SortName&SortOrder=Descending&Fields=PrimaryImageAspectRatio,ProductionYear,Status&Limit=${limit}&StartIndex=${startIndex}&api_key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.Items.map(item => ({
            Id: item.Id,
            Name: item.Name,
            Image: `${JELLYFIN_IMAGE_BASE}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            ProductionYear: item.ProductionYear,
            Type: itemType
        }));
    } catch (e) {
        console.error("Error Jellyfin Catalog:", e);
        return [];
    }
}