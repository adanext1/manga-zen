// js/jellyfin-client.js

// --- CONFIGURACIÓN ---
// Conexión directa a tu dominio
const JELLYFIN_URL = 'https://jellyfin.adanext.com'; 
const API_KEY = '5f927dd6d8c44675937c9fc747df0f07'; 
const USER_ID = 'c905909790c84d488555825ccbaaf923';

// 1. OBTENER ÚLTIMOS (Para el Dashboard)
export async function getJellyfinLatest(queryParams) {
    try {
        // queryParams viene de modules.js (ej: "&IncludeItemTypes=Movie")
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/Latest?Limit=10&Fields=PrimaryImageAspectRatio,ProductionYear,Genres,Tags${queryParams}&api_key=${API_KEY}`;
        
        const res = await fetch(url);
        
        // Si el servidor está apagado o hay error, esto saltará al catch
        if (!res.ok) throw new Error(`Error ${res.status}`);
        
        const json = await res.json();
        
        return json.map(item => ({
            id: item.Id,
            title: item.Name,
            img: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            year: item.ProductionYear,
            type: item.Type === 'Movie' ? 'video' : 'series',
            tag: item.ProductionYear ? String(item.ProductionYear) : ''
        }));
    } catch (e) {
        console.error("Error conectando con Jellyfin (Latest):", e);
        return []; // Retorna lista vacía si falla para no romper la web
    }
}

// 2. OBTENER DETALLES (Para Continuar Viendo y Player)
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
            // Imágenes de fondo y póster
            backdrop: `${JELLYFIN_URL}/Items/${item.Id}/Images/Backdrop/0?api_key=${API_KEY}`,
            poster: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`
        };
    } catch (e) {
        console.error("Error conectando con Jellyfin (Details):", e);
        return null;
    }
}

// 3. BÚSQUEDA (Para el Buscador)
export async function getJellyfinSearch(query, includeTypes = 'Series,Movie') {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?searchTerm=${encodeURIComponent(query)}&IncludeItemTypes=${includeTypes}&Recursive=true&Fields=PrimaryImageAspectRatio,ProductionYear,Status&Limit=20&api_key=${API_KEY}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        return data.Items.map(item => ({
            Id: item.Id,
            Name: item.Name,
            Image: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            ProductionYear: item.ProductionYear,
            Type: item.Type
        }));
    } catch (e) {
        console.error("Error conectando con Jellyfin (Search):", e);
        return [];
    }
}

// 4. CATÁLOGO COMPLETO (Para "Ver todos" y Cargar Más)
export async function getJellyfinCatalog(type, limit = 20, startIndex = 0) {
    try {
        const itemType = type === 'movies' ? 'Movie' : 'Series';
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?IncludeItemTypes=${itemType}&Recursive=true&SortBy=DateCreated,SortName&SortOrder=Descending&Fields=PrimaryImageAspectRatio,ProductionYear,Status&Limit=${limit}&StartIndex=${startIndex}&api_key=${API_KEY}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        return data.Items.map(item => ({
            Id: item.Id,
            Name: item.Name,
            Image: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            ProductionYear: item.ProductionYear,
            Type: itemType
        }));
    } catch (e) {
        console.error("Error conectando con Jellyfin (Catalog):", e);
        return [];
    }
}