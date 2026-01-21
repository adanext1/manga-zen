// js/reader-logic.js
import { saveProgress } from './db.js';

const PROXY = 'https://corsproxy.io/?'; 
const BASE_URL = 'https://api.mangadex.org';

let state = {
    chapterId: null,
    pagesHQ: [],       
    pagesSaver: [],    
    mode: 'vertical',
    dualPage: false,
    currentIndex: 0,
    baseUrl: '',
    hash: '',
    mangaId: null,
    mangaTitle: '',
    chapterNum: '',
    // 🔥 NUEVO: IDs para navegar
    nextChapterId: null,
    prevChapterId: null
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
        // 1. Metadatos (Aquí obtenemos el ID del manga)
        console.log("🕵️‍♂️ Cargando info...");
        await fetchMetadata(); 

        // 2. 🔥 NUEVO: Calcular Siguiente/Anterior Capítulo
        if (state.mangaId) {
            await setupChapterNavigation();
        }

        // 3. Imágenes
        const url = `${BASE_URL}/at-home/server/${state.chapterId}`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();

        state.baseUrl = json.baseUrl;
        state.hash = json.chapter.hash;
        state.pagesHQ = json.chapter.data;         
        state.pagesSaver = json.chapter.dataSaver; 

        // UI Updates
        const totalSpan = document.getElementById('total-pages');
        if (totalSpan) totalSpan.innerText = state.pagesHQ.length;
        
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        // 4. Renderizar
        render();

        setTimeout(() => {
            document.body.classList.add('ui-hidden');
        }, 2000);

    } catch (error) {
        console.error("Error inicializando:", error);
        alert("Error cargando el capítulo. Intenta recargar.");
    }
}

async function fetchMetadata() {
    try {
        const targetUrl = `${BASE_URL}/chapter/${state.chapterId}?includes[]=manga`;
        const res = await fetch(PROXY + encodeURIComponent(targetUrl));
        const json = await res.json();
        
        const attr = json.data.attributes;
        state.chapterNum = attr.chapter || "?";
        
        const mangaRel = json.data.relationships.find(r => r.type === 'manga');
        if (mangaRel) state.mangaId = mangaRel.id;

        const chapTitleUi = document.getElementById('chapter-title');
        if (chapTitleUi) {
            const title = attr.title ? `: ${attr.title}` : '';
            chapTitleUi.innerText = `Cap. ${state.chapterNum}${title}`;
        }

        if (state.mangaId) {
            try {
                const mangaRes = await fetch(PROXY + encodeURIComponent(`${BASE_URL}/manga/${state.mangaId}`));
                const mangaJson = await mangaRes.json();
                state.mangaTitle = Object.values(mangaJson.data.attributes.title)[0] || "Manga";
                
                const mangaTitleUi = document.getElementById('manga-title-ui');
                if (mangaTitleUi) mangaTitleUi.innerText = state.mangaTitle;
            } catch (err) { state.mangaTitle = "Manga"; }
        }
    } catch(e) { console.error(e); }
}

// --- 🔥 NUEVO: LÓGICA DE NAVEGACIÓN ENTRE CAPÍTULOS ---
async function setupChapterNavigation() {
    try {
        // Pedimos la lista de capítulos (feed) ordenada descendente (más nuevo primero)
        // Limitamos a 500 para cubrir mangas largos. Si es One Piece, quizás requiera más lógica, pero esto cubre el 99%.
        const url = `${BASE_URL}/manga/${state.mangaId}/feed?translatedLanguage[]=es&translatedLanguage[]=es-la&order[chapter]=desc&limit=500`;
        const res = await fetch(PROXY + encodeURIComponent(url));
        const json = await res.json();
        const chapters = json.data;

        // Encontrar índice del capítulo actual
        const currentIndex = chapters.findIndex(ch => ch.id === state.chapterId);

        if (currentIndex !== -1) {
            // Como la lista es DESCENDENTE (10, 9, 8...):
            // - El ANTERIOR (Cap 9 -> 8) está en el índice SIGUIENTE (idx + 1)
            // - El SIGUIENTE (Cap 9 -> 10) está en el índice ANTERIOR (idx - 1)
            
            if (currentIndex > 0) {
                state.nextChapterId = chapters[currentIndex - 1].id;
            }
            
            if (currentIndex < chapters.length - 1) {
                state.prevChapterId = chapters[currentIndex + 1].id;
            }

            console.log("Navegación:", { prev: state.prevChapterId, next: state.nextChapterId });
            updateNavUI();
        }
    } catch (e) {
        console.error("Error calculando navegación:", e);
    }
}

function updateNavUI() {
    // Aquí podrías habilitar botones en el header si tuvieras flechas ahí
    // Por ahora nos centraremos en el botón al final del renderizado vertical
}

// --- RENDERIZADO ---
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
    
    const els = ['nav-left', 'nav-center', 'nav-right', 'horizontal-controls'];
    if (state.mode === 'vertical') {
        els.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
        document.body.style.overflowY = 'auto';

        // 1. IMÁGENES
        state.pagesHQ.forEach((filename, index) => {
            const img = document.createElement('img');
            img.className = 'page-img';
            img.loading = 'lazy';
            img.setAttribute('referrerpolicy', 'no-referrer'); 
            
            img.src = `${state.baseUrl}/data/${state.hash}/${filename}`;

            img.onerror = function() {
                const saverFilename = state.pagesSaver[index];
                const saverUrl = `${state.baseUrl}/data-saver/${state.hash}/${saverFilename}`;
                if (this.src !== saverUrl) this.src = saverUrl;
            };

            img.dataset.index = index;
            img.onclick = window.toggleUI;
            canvas.appendChild(img);
        });
        
        // 2. 🔥 BOTÓN SIGUIENTE CAPÍTULO (Solo Vertical) 🔥
        if (state.nextChapterId) {
            const nextBtnDiv = document.createElement('div');
            nextBtnDiv.className = "w-full max-w-3xl mx-auto mt-8 mb-12 px-4";
            nextBtnDiv.innerHTML = `
                <button onclick="window.location.href='reader.html?chapter=${state.nextChapterId}'" 
                        class="w-full py-4 bg-primary hover:bg-[#7a1fd6] text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                    <span>Siguiente Capítulo</span>
                    <span class="material-symbols-outlined">arrow_forward</span>
                </button>
            `;
            canvas.appendChild(nextBtnDiv);
        } else {
             const endDiv = document.createElement('div');
             endDiv.className = "w-full text-center text-gray-500 mt-8 mb-12";
             endDiv.innerHTML = "<p>Has llegado al último capítulo.</p>";
             canvas.appendChild(endDiv);
        }

        setupVerticalScrollSpy();
    } else {
        els.forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); });
        document.body.style.overflow = 'hidden';
        renderHorizontalPage();
    }
}

function renderHorizontalPage() {
    const canvas = document.getElementById('reader-canvas');
    canvas.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = state.dualPage ? 'dual-page-container' : 'flex justify-center w-full h-full';

    const createImg = (index) => {
        if(index >= state.pagesHQ.length) return null;
        const img = document.createElement('img');
        const filename = state.pagesHQ[index];
        img.src = `${state.baseUrl}/data/${state.hash}/${filename}`;
        img.setAttribute('referrerpolicy', 'no-referrer');
        img.onerror = function() {
            const saverFilename = state.pagesSaver[index];
            const saverUrl = `${state.baseUrl}/data-saver/${state.hash}/${saverFilename}`;
            if (this.src !== saverUrl) this.src = saverUrl;
        };
        return img;
    };

    const img1 = createImg(state.currentIndex);
    if(img1) wrapper.appendChild(img1);

    if (state.dualPage) {
        const img2 = createImg(state.currentIndex + 1);
        if(img2) wrapper.appendChild(img2);
    }

    canvas.appendChild(wrapper);
    updateProgress(state.currentIndex);
}

// --- NAVEGACIÓN HORIZONTAL (Modificada para saltar de cap) ---
window.nextPage = function() {
    const increment = state.dualPage ? 2 : 1;
    if (state.currentIndex + increment < state.pagesHQ.length) {
        state.currentIndex += increment;
        renderHorizontalPage();
    } else {
        // 🔥 SI ES LA ÚLTIMA PÁGINA
        if (state.nextChapterId) {
            if(confirm("¿Ir al siguiente capítulo?")) {
                window.location.href = `reader.html?chapter=${state.nextChapterId}`;
            }
        }
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
    const total = state.pagesHQ.length;
    const indicator = document.getElementById('page-indicator');
    const progressBar = document.getElementById('read-progress');
    
    if (indicator) indicator.innerText = `Página ${index + 1}`;
    if (progressBar) {
        const percent = ((index + 1) / total) * 100;
        progressBar.style.width = `${percent}%`;
    }

    if (state.mangaId) {
        saveProgress(state.mangaId, state.mangaTitle, state.chapterId, state.chapterNum, index + 1);
    }
}