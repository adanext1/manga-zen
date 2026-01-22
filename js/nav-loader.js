// js/nav-loader.js

// 1. DEFINICIÓN DE ENLACES
const NAV_LINKS = [
    { name: 'Inicio',     icon: 'home',          href: 'dashboard.html' },
    { name: 'Biblioteca', icon: 'library_books', href: 'library.html' },
    
    // 🔥 ESTE ES EL BOTÓN FLOTANTE (isFloating: true)
    { name: 'Explorar',   icon: 'search',        href: 'search.html', isFloating: true },
    
    { name: 'Historial',  icon: 'history',       href: 'history.html' },
    { name: 'Perfil',     icon: 'person',        href: 'profile.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    renderMobileNav();
    if(typeof renderHeader === 'function') renderHeader(); // Si existe la función
});

// --- LOGICA PARA DETECTAR PÁGINA ACTIVA ---
function isActive(href) {
    const currentPath = window.location.pathname;
    return currentPath.includes(href) || (href === 'dashboard.html' && (currentPath === '/' || currentPath.endsWith('/')));
}

// --- 2. RENDERIZAR SIDEBAR (ESCRITORIO - IGUAL QUE ANTES) ---
function renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        const active = isActive(link.href);
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

    sidebarContainer.innerHTML = `
        <div>
            <div class="flex items-center gap-3 mb-10 px-2">
                <div class="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_rgba(140,37,244,0.3)]">
                    <span class="material-symbols-outlined text-[24px]">auto_stories</span>
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-white">MangaZen</h1>
            </div>
            <nav class="space-y-2">${linksHtml}</nav>
        </div>
        <div id="sidebar-user-slot" class="mt-auto"></div>
    `;
}

// --- 3. RENDERIZAR MENU MOVIL (DISEÑO FLOTANTE) ---
function renderMobileNav() {
    const mobileContainer = document.getElementById('mobile-nav-container');
    if (!mobileContainer) return;

    // APLICAR CLASES AL CONTENEDOR (Para darle altura y fondo)
    mobileContainer.className = "md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-20";

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        const active = isActive(link.href);

        if (link.isFloating) {
            // --- DISEÑO DEL BOTÓN FLOTANTE (LUPA MORADA) ---
            linksHtml += `
                <a href="${link.href}" 
                   class="flex items-center justify-center -mt-10 size-14 bg-primary text-white rounded-full shadow-[0_0_20px_rgba(140,37,244,0.4)] active:scale-95 transition-transform border-4 border-[#0f0f0f]">
                    <span class="material-symbols-outlined text-3xl">${link.icon}</span>
                </a>
            `;
        } else {
            // --- DISEÑO DE LOS BOTONES NORMALES ---
            const colorClass = active ? "text-primary" : "text-gray-500 hover:text-white";
            
            linksHtml += `
                <a href="${link.href}" class="flex flex-col items-center gap-1 group w-12 ${colorClass}">
                    <span class="material-symbols-outlined text-[26px] group-active:scale-95 transition-transform ${active ? 'fill-1' : ''}">
                        ${link.icon}
                    </span>
                    <span class="text-[10px] font-medium">${link.name}</span>
                </a>
            `;
        }
    });

    mobileContainer.innerHTML = linksHtml;
}