// js/reader-logic.js
import { saveProgress } from './db.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';

let state = {
    chapterId: null,
    pages: [],
    mode: 'vertical',
    dualPage: false,
    currentIndex: 0,
    baseUrl: '',
    hash: '',
    mangaId: null,
    mangaTitle: '',
    chapterNum: ''
};

// --- INICIO ---
const params = new URLSearchParams(window.location.search);
state.chapterId = params.get('chapter');

if (!state.chapterId) {
    alert("Error: Capítulo no encontrado");
    window.history.back();
} else {
    initReader();
}

window.toggleUI = function() {
    document.body.classList.toggle('ui-hidden');
};

async function initReader() {
    try {
        // PASO 1: Conseguir ID del Manga y Metadatos (PRIORIDAD MÁXIMA) 🚨
        console.log("🕵️‍♂️ Buscando información del manga...");
        await fetchMetadata(); 

        if (!state.mangaId) {
            console.error("❌ ERROR CRÍTICO: No se pudo obtener el ID del manga.");
            // Aun así intentamos cargar imágenes para que el usuario pueda leer
        } else {
            console.log("✅ ID ENCONTRADO:", state.mangaId, state.mangaTitle);
        }

        // PASO 2: Cargar Servidor de Imágenes (At-Home)
        const url = `${BASE_URL}/at-home/server/${state.chapterId}`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();

        state.baseUrl = json.baseUrl;
        state.hash = json.chapter.hash;
        
        state.pages = json.chapter.data.map(filename => {
            const rawUrl = `${state.baseUrl}/data/${state.hash}/${filename}`;
            return PROXY + encodeURIComponent(rawUrl);
        });

        // Actualizar UI
        const totalSpan = document.getElementById('total-pages');
        if (totalSpan) totalSpan.innerText = state.pages.length;
        
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        // PASO 3: Renderizar (Ahora ya es seguro observar el scroll)
        render();

        // Ocultar UI después de 2 seg
        setTimeout(() => {
            document.body.classList.add('ui-hidden');
        }, 2000);

    } catch (error) {
        console.error("Error inicializando:", error);
        alert("Error cargando el capítulo. Revisa la consola.");
    }
}

async function fetchMetadata() {
    try {
        // Pedimos info del capítulo + relación manga
        const targetUrl = `${BASE_URL}/chapter/${state.chapterId}?includes[]=manga`;
        const res = await fetch(PROXY + encodeURIComponent(targetUrl));
        const json = await res.json();
        
        const attr = json.data.attributes;
        state.chapterNum = attr.chapter || "?";
        
        // Extraer ID del Manga
        const mangaRel = json.data.relationships.find(r => r.type === 'manga');
        if (mangaRel) {
            state.mangaId = mangaRel.id;
        }

        // Título del Capítulo en UI
        const chapTitleUi = document.getElementById('chapter-title');
        if (chapTitleUi) {
            const title = attr.title ? `: ${attr.title}` : '';
            chapTitleUi.innerText = `Cap. ${state.chapterNum}${title}`;
        }

        // Intentar obtener título del manga (Opcional pero bonito)
        if (state.mangaId) {
            try {
                const mangaRes = await fetch(PROXY + encodeURIComponent(`${BASE_URL}/manga/${state.mangaId}`));
                const mangaJson = await mangaRes.json();
                state.mangaTitle = Object.values(mangaJson.data.attributes.title)[0] || "Manga";
                
                const mangaTitleUi = document.getElementById('manga-title-ui');
                if (mangaTitleUi) mangaTitleUi.innerText = state.mangaTitle;
            } catch (err) {
                console.warn("No se pudo cargar título manga, usando ID como referencia");
                state.mangaTitle = "Manga"; 
            }
        }

    } catch(e) { 
        console.error("Error en fetchMetadata:", e);
    }
}

// --- RENDERIZADO (Sin cambios mayores, solo seguridad) ---
window.changeMode = function(newMode) {
    state.mode = newMode;
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
    render();
};

window.toggleDualPage = function() {
    state.dualPage = !state.dualPage;
    const icon = document.querySelector('#dual-page-toggle span');
    if (icon) {
        icon.innerText = state.dualPage ? 'toggle_on' : 'toggle_off';
        icon.classList.toggle('text-primary', state.dualPage);
    }
    if (state.mode === 'horizontal') render();
};

function render() {
    const canvas = document.getElementById('reader-canvas');
    if (!canvas) return;

    canvas.innerHTML = '';
    canvas.className = state.mode === 'vertical' ? 'mode-vertical pb-20' : 'mode-horizontal bg-black';
    
    // Gestión de controles horizontales
    const navLeft = document.getElementById('nav-left');
    const navCenter = document.getElementById('nav-center');
    const navRight = document.getElementById('nav-right');
    const horizControls = document.getElementById('horizontal-controls');

    if (state.mode === 'vertical') {
        if(navLeft) navLeft.style.display = 'none';
        if(navCenter) navCenter.style.display = 'none';
        if(navRight) navRight.style.display = 'none';
        if(horizControls) horizControls.classList.add('hidden');
        document.body.style.overflowY = 'auto';

        state.pages.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'page-img';
            img.loading = 'lazy';
            img.setAttribute('referrerpolicy', 'no-referrer');
            img.dataset.index = index;
            img.onclick = window.toggleUI;
            canvas.appendChild(img);
        });
        
        setupVerticalScrollSpy();
    } else {
        if(navLeft) navLeft.style.display = 'block';
        if(navCenter) navCenter.style.display = 'block';
        if(navRight) navRight.style.display = 'block';
        if(horizControls) horizControls.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        renderHorizontalPage();
    }
}

function renderHorizontalPage() {
    const canvas = document.getElementById('reader-canvas');
    canvas.innerHTML = '';

    const img1Url = state.pages[state.currentIndex];
    const img2Url = state.pages[state.currentIndex + 1];

    const wrapper = document.createElement('div');
    wrapper.className = state.dualPage ? 'dual-page-container' : 'flex justify-center w-full h-full';

    const img1 = document.createElement('img');
    img1.src = img1Url;
    img1.setAttribute('referrerpolicy', 'no-referrer');
    wrapper.appendChild(img1);

    if (state.dualPage && img2Url) {
        const img2 = document.createElement('img');
        img2.src = img2Url;
        img2.setAttribute('referrerpolicy', 'no-referrer');
        wrapper.appendChild(img2);
    }

    canvas.appendChild(wrapper);
    updateProgress(state.currentIndex);
}

window.nextPage = function() {
    const increment = state.dualPage ? 2 : 1;
    if (state.currentIndex + increment < state.pages.length) {
        state.currentIndex += increment;
        renderHorizontalPage();
    }
};

window.prevPage = function() {
    const decrement = state.dualPage ? 2 : 1;
    if (state.currentIndex - decrement >= 0) {
        state.currentIndex -= decrement;
        renderHorizontalPage();
    }
};

// Listeners
const elNavLeft = document.getElementById('nav-left');
if(elNavLeft) elNavLeft.addEventListener('click', window.prevPage);

const elNavRight = document.getElementById('nav-right');
if(elNavRight) elNavRight.addEventListener('click', window.nextPage);

const elNavCenter = document.getElementById('nav-center');
if(elNavCenter) elNavCenter.addEventListener('click', window.toggleUI);

document.addEventListener('keydown', (e) => {
    if (state.mode === 'horizontal') {
        if (e.key === 'ArrowRight') window.nextPage();
        if (e.key === 'ArrowLeft') window.prevPage();
        if (e.key === ' ' || e.key === 'Enter') window.toggleUI();
    }
});

// --- SCROLL SPY & GUARDADO ---
function setupVerticalScrollSpy() {
    const images = document.querySelectorAll('.page-img');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const idx = parseInt(entry.target.dataset.index);
                updateProgress(idx);
            }
        });
    }, { threshold: 0.1 });

    images.forEach(img => observer.observe(img));
    
    const canvas = document.getElementById('reader-canvas');
    if(canvas) {
        canvas.addEventListener('click', (e) => {
            if(e.target.id === 'reader-canvas') window.toggleUI();
        });
    }
}

function updateProgress(index) {
    const total = state.pages.length;
    const indicator = document.getElementById('page-indicator');
    const progressBar = document.getElementById('read-progress');
    
    if (indicator) indicator.innerText = `Página ${index + 1}`;
    if (progressBar) {
        const percent = ((index + 1) / total) * 100;
        progressBar.style.width = `${percent}%`;
    }

    // AHORA SÍ: Guardado Seguro
    if (state.mangaId) {
        saveProgress(state.mangaId, state.mangaTitle, state.chapterId, state.chapterNum, index + 1);
    } else {
        console.warn("⏳ Aún esperando ID del manga... (Si esto sale mucho, fetchMetadata falló)");
    }
}