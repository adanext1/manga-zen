// js/theme-init.js

// 1. INYECTAR FUENTES DE GOOGLE Y ICONOS
const fontsLink = document.createElement('link');
fontsLink.rel = 'stylesheet';
fontsLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
document.head.appendChild(fontsLink);

const iconsLink = document.createElement('link');
iconsLink.rel = 'stylesheet';
iconsLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
document.head.appendChild(iconsLink);

// 2. CONFIGURACIÓN DE TAILWIND (Centralizada)
// Esto reemplaza al <script>tailwind.config = ...</script>
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

// 3. ESTILOS GLOBALES (CSS)
// Esto reemplaza a tu etiqueta <style> gigante
const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f0f0f; color: white; }
    
    /* Efecto Cristal */
    .glass { background: rgba(20, 20, 20, 0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .glass-card { background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
    
    /* Gradientes */
    .manga-card-gradient { background: linear-gradient(0deg, rgba(15, 15, 15, 0.95) 0%, rgba(15, 15, 15, 0) 60%); }
    
    /* Utilidades */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .neon-glow:focus-within { box-shadow: 0 0 15px rgba(140, 37, 244, 0.2); border-color: rgba(140, 37, 244, 0.5); }

    /* Scrollbar Personalizado (El que hicimos hace un momento) */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f0f0f; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #8c25f4; }
`;
document.head.appendChild(globalStyles);