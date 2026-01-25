// js/jellyfin-client.js

// --- CONFIGURACIÓN ---
const JELLYFIN_URL = 'https://jellyfin.adanext.com'; 
const API_KEY = '5f927dd6d8c44675937c9fc747df0f07'; 
const USER_ID = 'c905909790c84d488555825ccbaaf923';

// 1. OBTENER ÚLTIMOS (Home)
export async function getJellyfinLatest(queryParams) {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/Latest?Limit=10&Fields=PrimaryImageAspectRatio,ProductionYear,Genres,Tags${queryParams}&api_key=${API_KEY}`;
        const res = await fetch(url);
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
        console.error("Error Jellyfin Latest:", e);
        return [];
    }
}

// 2. OBTENER DETALLES (Ficha Técnica)
export async function getItemDetails(itemId) {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/${itemId}?Fields=Overview,ProductionYear,RemoteTrailers,Genres,OfficialRating,Tags,VoteAverage&api_key=${API_KEY}`;
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
            rating: item.VoteAverage ? item.VoteAverage.toFixed(1) : null, // Agregué Rating por si acaso
            type: item.Type,
            backdrop: `${JELLYFIN_URL}/Items/${item.Id}/Images/Backdrop/0?api_key=${API_KEY}`,
            poster: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`
        };
    } catch (e) {
        console.error("Error Jellyfin Details:", e);
        return null;
    }
}

// 3. 🔥 OBTENER TEMPORADAS (Nueva - Faltaba esta)
export async function getSeasons(seriesId) {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?ParentId=${seriesId}&IncludeItemTypes=Season&Fields=PrimaryImageAspectRatio,ProductionYear&SortBy=SortName&api_key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        return data.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            img: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            index: item.IndexNumber
        }));
    } catch (e) {
        console.error("Error Jellyfin Seasons:", e);
        return [];
    }
}

// 4. 🔥 OBTENER EPISODIOS (Nueva - Esta era el error)
// Puede pedir episodios de una serie completa O de una temporada específica
export async function getEpisodes(seriesId, seasonId = null) {
    try {
        let url = `${JELLYFIN_URL}/Users/${USER_ID}/Items?ParentId=${seasonId || seriesId}&IncludeItemTypes=Episode&Fields=Overview,PrimaryImageAspectRatio,ProductionYear,IndexNumber,ParentIndexNumber&SortBy=SortName&api_key=${API_KEY}`;
        
        // Si no hay seasonId, asumimos que seriesId es el padre y pedimos recursivo (todos los caps)
        if (!seasonId) {
            url += '&Recursive=true';
        }

        const res = await fetch(url);
        const data = await res.json();
        
        return data.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            overview: item.Overview,
            img: `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${API_KEY}`,
            season: item.ParentIndexNumber || 1,
            episode: item.IndexNumber,
            year: item.ProductionYear
        }));
    } catch (e) {
        console.error("Error Jellyfin Episodes:", e);
        return [];
    }
}

// 5. BÚSQUEDA
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
        console.error("Error Jellyfin Search:", e);
        return [];
    }
}

// 6. CATÁLOGO
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
        console.error("Error Jellyfin Catalog:", e);
        return [];
    }
}