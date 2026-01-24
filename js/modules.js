// js/modules.js

export const APP_MODULES = [
    // --- 1. MANGAS (Tipo Especial: MangaDex) ---
    { 
        id: 'manga', 
        name: 'Mangas', 
        db_col: 'show_manga', // Columna en Supabase
        type: 'manga',        // Identificador para lógica interna
        icon: 'menu_book', 
        color: 'text-green-400'
    },

    // --- 2. ANIMES (Jellyfin) ---
    { 
        id: 'anime', 
        name: 'Animes', 
        db_col: 'show_anime', 
        type: 'jellyfin', 
        icon: 'smart_display', 
        color: 'text-primary',
        // 🔥 FILTROS JELLYFIN: Aquí defines qué es esto
        jellyfinParams: '&IncludeItemTypes=Series&Genres=Anime' 
    },

    // --- 3. PELÍCULAS (Jellyfin) ---
    { 
        id: 'movies', 
        name: 'Películas', 
        db_col: 'show_movies', 
        type: 'jellyfin', 
        icon: 'movie', 
        color: 'text-blue-400',
        jellyfinParams: '&IncludeItemTypes=Movie' 
    },

    // --- EJEMPLO FUTURO: Cuando quieras agregar SERIES ---
    // Solo descomentas esto, agregas la columna a Supabase y ¡LISTO!
    /*
    { 
        id: 'series', 
        name: 'Series TV', 
        db_col: 'show_series', 
        type: 'jellyfin', 
        icon: 'tv', 
        color: 'text-purple-400',
        jellyfinParams: '&IncludeItemTypes=Series&ExcludeGenres=Anime'
    },
    */
];