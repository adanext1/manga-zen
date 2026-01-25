/** @type {import('tailwindcss').Config} */
module.exports = {
  // Le decimos dónde buscar tus clases (HTML y JS)
  content: ["./**/*.{html,js}"], 
  theme: {
    extend: {
      // 🎨 TUS COLORES (Migrados del theme-config.js a aquí)
      colors: {
        // 🟣 TU PALETA EXACTA (Extraída de profile.html)
        brand: {
          DEFAULT: '#8c25f4', // Tu Morado Principal (Toggles/Bordes)
          dark:    '#721ec6', // Un poco más oscuro para efectos hover
          light:   '#a855f7', // Lila para degradados
        },
        // 🌑 TUS FONDOS
        base:    '#0f0f0f', // Fondo General (Body)
        sidebar: '#120b18', // Fondo Panel Lateral (Ese tono morado oscuro)
        surface: '#1E1E1E', // Fondo Avatar/Tarjetas
        
        // Colores de estado
        success: '#22c55e',
        error:   '#ef4444', 
      }
    },
  },
  plugins: [],
}