// js/theme-config.js

// 🎨 CONFIGURACIÓN DE COLORES (TEMA MANGAZEN)
// Modifica los códigos Hex aquí para cambiar el look de toda la web.

const THEME_COLORS = {
    // EL COLOR PRINCIPAL (Tu Morado)
    brand: {
        DEFAULT: '#8b5cf6', // El color base (usado en botones, bordes, etc.)
        dark:    '#7c3aed', // Para el hover (cuando pasas el mouse)
        light:   '#a78bfa', // Para detalles suaves
        glow:    '#c4b5fd'  // Para efectos de brillo o sombras
    },
    
    // EL FONDO (Modo Oscuro Profundo)
    base:    '#0f0f12', // Fondo principal de la página (casi negro)
    surface: '#18181b', // Fondo de las tarjetas y barras (gris muy oscuro)
    
    // ESTADOS (Para alertas o avisos)
    success: '#22c55e', // Verde
    error:   '#ef4444', // Rojo
    warning: '#f59e0b'  // Amarillo
};

// ⚙️ APLICAR A TAILWIND (No toques esto a menos que sepas qué haces)
// Esto inyecta tu configuración en el motor de estilos.
tailwind.config = {
    theme: {
        extend: {
            colors: THEME_COLORS,
            fontFamily: {
                // Aquí podrías agregar fuentes personalizadas en el futuro
                sans: ['Inter', 'sans-serif'], 
            }
        }
    }
};

console.log("🎨 Tema Mangazen Cargado: Purple Mode");