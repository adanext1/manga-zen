// js/nav-loader.js

// 1. DEFINICIÓN DE ENLACES (CONFIGURACIÓN CENTRAL)
const NAV_LINKS = [
    { name: 'Inicio',     icon: 'home',      href: 'dashboard.html' },
    { name: 'Biblioteca', icon: 'bookmarks', href: 'library.html' },
    { name: 'Explorar',   icon: 'explore',   href: 'search.html' },
    { name: 'Historial',  icon: 'history',   href: 'history.html' },
    { name: 'Perfil',     icon: 'person',    href: 'profile.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    renderMobileNav();
});

// --- LOGICA PARA DETECTAR PÁGINA ACTIVA ---
function isActive(href) {
    const currentPath = window.location.pathname;
    // Si estamos en la raíz (/) y el link es dashboard.html, o si el path incluye el nombre del archivo
    return currentPath.includes(href) || (href === 'dashboard.html' && (currentPath === '/' || currentPath.endsWith('/')));
}

// --- 2. RENDERIZAR SIDEBAR (ESCRITORIO) ---
function renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        const active = isActive(link.href);
        
        // Estilos condicionales: Si está activo es morado, si no es gris
        const classes = active 
            ? "bg-primary text-white shadow-lg shadow-primary/20" 
            : "text-gray-400 hover:text-white hover:bg-white/5";

        linksHtml += `
            <a href="${link.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${classes}">
                <span class="material-symbols-outlined ${active ? 'fill-1' : ''}">${link.icon}</span>
                ${link.name}
            </a>
        `;
    });

    const html = `
        <div>
            <div class="flex items-center gap-3 mb-10 px-2">
                <div class="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_rgba(140,37,244,0.3)]">
                    <span class="material-symbols-outlined text-[24px]">auto_stories</span>
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-white">MangaZen</h1>
            </div>
            
            <nav class="space-y-2">
                ${linksHtml}
            </nav>
        </div>

        <div id="sidebar-user-slot" class="mt-auto"></div>
    `;

    sidebarContainer.innerHTML = html;
}

// --- 3. RENDERIZAR MENU MOVIL (BOTTOM BAR) ---
function renderMobileNav() {
    const mobileContainer = document.getElementById('mobile-nav-container');
    if (!mobileContainer) return;

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        const active = isActive(link.href);
        
        // En móvil, el activo cambia de color el icono y el texto
        const colorClass = active ? "text-white" : "text-zinc-500 hover:text-gray-300";
        const iconClass = active ? "text-primary scale-110 drop-shadow-[0_0_8px_rgba(140,37,244,0.6)]" : "";

        linksHtml += `
            <a href="${link.href}" class="flex flex-col items-center gap-1 transition-colors group ${colorClass}">
                <span class="material-symbols-outlined text-[24px] group-active:scale-95 transition-transform ${iconClass}">
                    ${link.icon}
                </span>
                <span class="text-[10px] font-medium tracking-wide">${link.name}</span>
            </a>
        `;
    });

    mobileContainer.innerHTML = linksHtml;
}

// ... (Código anterior de nav-loader.js) ...

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    renderMobileNav();
    renderHeader(); // <--- AGREGAMOS ESTO
});

// --- 4. RENDERIZAR HEADER (BARRA DE BÚSQUEDA) ---
function renderHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    // Detectamos si estamos en search.html para activar funciones extra o no
    const isSearchPage = window.location.pathname.includes('search.html');

    headerContainer.innerHTML = `
        <div class="flex items-center gap-3 max-w-4xl mx-auto">
            <label class="group flex flex-1 cursor-text items-center justify-start gap-3 rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10 transition-all duration-300 neon-glow hover:bg-white/10">
                <span class="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                
                <input id="search-input"
                    class="h-full w-full bg-transparent p-0 text-base font-medium text-white placeholder-gray-500 focus:outline-none focus:ring-0 border-none"
                    placeholder="Buscar título, autor..." type="text" autocomplete="off" />
                
                <button id="clear-search" class="hidden text-gray-500 hover:text-white">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            </label>
            
            <button onclick="window.toggleFilters ? window.toggleFilters() : window.location.href='search.html?openFilters=true'"
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-primary active:scale-95">
                <span class="material-symbols-outlined">tune</span>
            </button>
        </div>
        
        <div id="search-dropdown" class="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl hidden overflow-hidden z-10"></div>
    `;
}