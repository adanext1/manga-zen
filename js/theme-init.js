// js/theme-init.js

// --- 1. FAVICON Y METADATA (Para que se vea Pro) ---
const metaColor = document.createElement('meta');
metaColor.name = "theme-color";
metaColor.content = "#0f0f0f"; // Pinta la barra del navegador del móvil
document.head.appendChild(metaColor);

// Icono de la pestaña (Usamos un emoji de libro por ahora, o tu propio logo)
const linkFavicon = document.createElement('link');
linkFavicon.rel = 'icon';
// Esta es la imagen del icono codificada en base64 para no usar archivos externos por ahora
linkFavicon.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAb1BMVEVHcEz/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAD/jAA5F/nSAAAAJHRSTlMABg8XHiM0PEJQXmZpbHSAiYqPlaGjutLm5+vs8vP29/n7/f40bO3tAAACuUlEQVR4nO1X2XbrIAyUjW3AZnFCSJr3//9G2kCAkLhN2tP0oQ9pLEkzkgYQ/X4vFguF/3QcR2W/JzF0Xf8lMEa+76vG30AMnB/HURuXn0F8x/n35eXFGuu6/gRj4FzX9eV6vS7XyzXW9e8bA+f3+/32dr8/brfYbP6eMfr7lG02m59t/b3a1j6W6e1bE0P425u3b833G8bY6fTj3Vvnx/R63n7fMAbOr9fL9Xo5X6/n2O2+Zwyc3++328f9frsdYrf7qjFwfr18/Hh9vXx8zLHZ/C1jTPfP38+Xj+n+Oba1XzQGzl+vH2/T6/XjbWy7/R3j2Nq/f319Tdvav8d29/LGMLa336ft7Vdsu/0Z48j9l5d/X2P3X3/HGL0//2b0/vyL3f94GkP3X6bv1u7/dBoD59+e79bOn05j6P6/9tbuf/5qjNH77z9b77//Yr///RjH7n/92dr9119s+//fGCP37z9bu3//jW33P2Mcs/86tt3/jHHo/uPYdv8jxqH7j2Pb/c8Yx+5/je32v2Nc75///fX3Y9v97xjX+8e/Y7v7HWOM/vH12Hb/M8bR+99j2/3vGMfuf49t979jHLv/Pbbr3zF2t//Z2v3vGHv3/9ma/e8Ye/f/2Zr9P2Dsnz/8f7b2/z9gHLt/Gdv1/4Bx7P5lbLv/B4xj969ju/4fMI7dv45t9/8jxrH7j2N3/T9gHLv/cWzX/4Bx7P7Hse3+Z4z9+9ex3f+Mse/+Y2zX/4Cxv/84tt3/jLH//tPYrv8HjN3/l7FvHn9iHLv/Obbbf2Mcu/85ttv/E+PY/d+x7f5njH3/d2zX/xPj2P3fsW/+4D3GuP2vY7v9H7zHGLv/Obbbf8B43D/9Prbb/wHjcf/0+9iuf8B43D/9Prbb/wHjcf/0+9iuf8B43D/9Prbb/wHjcX/9fWy7/wHj2P3Xse3+B4y3+9+v/wA+46p42K1oWAAAAABJRU5ErkJggg==";
document.head.appendChild(linkFavicon);

// --- 2. FUENTES E ICONOS ---
const fontsLink = document.createElement('link');
fontsLink.rel = 'stylesheet';
fontsLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
document.head.appendChild(fontsLink);

const iconsLink = document.createElement('link');
iconsLink.rel = 'stylesheet';
iconsLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
document.head.appendChild(iconsLink);

// --- 3. CONFIGURACIÓN TAILWIND ---
window.tailwind = {
    darkMode: "class",
    config: {
        theme: {
            extend: {
                colors: { "primary": "#8c25f4", "background-dark": "#0f0f0f", "surface-dark": "#1E1E1E" },
                fontFamily: { "display": ["Plus Jakarta Sans", "sans-serif"] },
            },
        },
    }
};

// --- 4. ESTILOS GLOBALES (CSS) ---
const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f0f0f; color: white; -webkit-tap-highlight-color: transparent; }
    
    /* Efecto Cristal */
    .glass { background: rgba(20, 20, 20, 0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .glass-card { background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
    
    /* Scrollbars */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f0f0f; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #8c25f4; }

    /* Utilidades */
    .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
`;
document.head.appendChild(globalStyles);