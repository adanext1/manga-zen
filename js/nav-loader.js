// js/nav-loader.js

// 1. DEFINICIÓN DE ENLACES
const NAV_LINKS = [
    { name: 'Inicio',     icon: 'home',          href: 'dashboard.html' },
    { name: 'Biblioteca', icon: 'library_books', href: 'library.html' },
    { name: 'Peticiones', icon: 'playlist_add',  href: 'requests.html' }, // Icono ajustado
    
    // 🔥 BOTÓN FLOTANTE (Explorar)
    { name: 'Explorar',   icon: 'search',        href: 'search.html', isFloating: true },
    
    { name: 'Historial',  icon: 'history',       href: 'history.html' },
    { name: 'Perfil',     icon: 'person',        href: 'profile.html' }
];

document.addEventListener('DOMContentLoaded', () => {
    renderSidebar();
    renderMobileNav();
});

// --- LÓGICA PARA DETECTAR PÁGINA ACTIVA ---
function isActive(href) {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    // Manejo especial para dashboard/index
    if ((href === 'dashboard.html' || href === 'index.html') && (currentPath === '' || currentPath === 'index.html' || currentPath === 'dashboard.html')) {
        return true;
    }
    return currentPath.includes(href);
}

// --- 2. RENDERIZAR SIDEBAR (ESCRITORIO) ---
function renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        const active = isActive(link.href);
        
        // 🎨 ESTILOS MODULARES (Usan 'brand' y 'white')
        const activeClasses = "bg-brand text-white shadow-[0_0_20px_rgba(140,37,244,0.3)] font-bold";
        const inactiveClasses = "text-gray-400 hover:text-white hover:bg-white/5 font-medium";

        // Renderizado del enlace
        linksHtml += `
            <a href="${link.href}" class="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${active ? activeClasses : inactiveClasses}">
                <span class="material-symbols-outlined text-[24px] ${active ? '' : 'group-hover:scale-110 transition-transform'}">
                    ${link.icon}
                </span>
                <span class="text-sm tracking-wide">${link.name}</span>
            </a>
        `;
    });

    // Inyectamos el HTML completo del sidebar
    sidebarContainer.innerHTML = `
        <div class="flex flex-col h-full">
            <div class="flex items-center gap-3 mb-10 px-2">
                <div class="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand border border-brand/30 shadow-[0_0_15px_rgba(140,37,244,0.3)]">
                    <span class="material-symbols-outlined text-2xl">menu_book</span>
                </div>
                <h1 class="text-xl font-bold tracking-tight text-white">MangaZen</h1>
            </div>

            <nav class="flex-1 space-y-2">
                ${linksHtml}
            </nav>

            <div id="sidebar-user-slot" class="mt-auto"></div>
        </div>
    `;
}

// --- 3. RENDERIZAR MENÚ MÓVIL (FLOTANTE) ---
function renderMobileNav() {
    const mobileContainer = document.getElementById('mobile-nav-container');
    if (!mobileContainer) return;

    // Estilos del contenedor móvil (Vidrio + Borde)
    mobileContainer.className = "md:hidden fixed bottom-0 inset-x-0 bg-base/95 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-20";

    let linksHtml = '';

    NAV_LINKS.forEach(link => {
        // En móvil a veces queremos ocultar algunos botones si son muchos, 
        // aquí mostramos los principales.
         // Opcional: Ocultar estos en móvil para que quepan

        const active = isActive(link.href);

        if (link.isFloating) {
            // 🔥 BOTÓN FLOTANTE (Lupa Morada)
            // Nota el 'border-base': usa el color de fondo para crear el efecto de recorte
            linksHtml += `
                <a href="${link.href}" 
                   class="relative -top-6 w-14 h-14 bg-brand text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(140,37,244,0.5)] border-[5px] border-base transition-transform active:scale-95">
                    <span class="material-symbols-outlined text-3xl">${link.icon}</span>
                </a>
            `;
        } else {
            // BOTONES NORMALES
            const colorClass = active ? "text-brand" : "text-gray-500 hover:text-gray-300";
            
            linksHtml += `
                <a href="${link.href}" class="flex flex-col items-center gap-1 w-12 transition-colors ${colorClass}">
                    <span class="material-symbols-outlined text-[26px] ${active ? 'filled-icon' : ''}">
                        ${link.icon}
                    </span>
                    <span class="text-[10px] font-medium">${link.name}</span>
                </a>
            `;
        }
    });

    mobileContainer.innerHTML = linksHtml;
}