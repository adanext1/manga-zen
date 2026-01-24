import { supabase } from './supabase-client.js';

// --- CONFIGURACIÓN JELLYFIN ---
const JELLYFIN_URL = 'https://jellyfin.adanext.com'; 
const API_KEY = '5f927dd6d8c44675937c9fc747df0f07'; 
const USER_ID = 'c905909790c84d488555825ccbaaf923'; 

const player = document.getElementById('video-player');
let contentId = null;
let contentTitle = '';
let startTime = 0; // <--- AQUÍ GUARDAMOS DONDE EMPEZAR

document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
});

async function initPlayer() {
    const params = new URLSearchParams(window.location.search);
    contentId = params.get('id');

    if (!contentId) {
        alert("Error: ID no encontrado");
        window.history.back();
        return;
    }

    // 1. PRIMERO: Preguntamos a Supabase "¿Dónde me quedé?"
    await loadSavedProgress(contentId);

    // 2. Cargamos título e imagen
    await loadMetadata(contentId);

    // 3. Iniciamos el video saltando al minuto guardado
    setupHls(contentId, startTime);

    // 4. Empezamos a guardar de nuevo
    startProgressTracking();
}

// --- NUEVA LÓGICA: RECUPERAR PROGRESO ---
async function loadSavedProgress(id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscamos en la base de datos
    const { data, error } = await supabase
        .from('reading_progress')
        .select('page_number') // Usamos esta columna para guardar SEGUNDOS
        .eq('user_id', user.id)
        .eq('manga_id', id)
        .maybeSingle();

    if (data && data.page_number) {
        startTime = data.page_number;
        console.log(`Recuperado: Iniciar en segundo ${startTime}`);
    }
}

async function loadMetadata(id) {
    try {
        const url = `${JELLYFIN_URL}/Users/${USER_ID}/Items/${id}?api_key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        contentTitle = data.Name;
        if (data.SeriesName) contentTitle = `${data.SeriesName}: ${data.Name}`;
        document.getElementById('video-title').innerText = contentTitle;
        
        const posterUrl = `${JELLYFIN_URL}/Items/${id}/Images/Backdrop/0?api_key=${API_KEY}`;
        player.poster = posterUrl;
    } catch (e) { console.error(e); }
}

function setupHls(id, startSeconds = 0) {
    // URL con Calidad Máxima
    const streamUrl = `${JELLYFIN_URL}/Videos/${id}/master.m3u8?` + 
        `mediaSourceId=${id}&playSessionId=${Date.now()}&api_key=${API_KEY}&` +
        `VideoCodec=h264,hevc&AudioCodec=aac,mp3,opus&` +
        `VideoBitrate=140000000&MaxStreamingBitrate=140000000&TranscodingMaxAudioChannels=2`;

    if (Hls.isSupported()) {
        const hls = new Hls({
            debug: false,
            startPosition: startSeconds // <--- ¡LA CLAVE! HLS inicia aquí
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(player);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            player.play().catch(() => document.getElementById('video-status').innerText = "Click para iniciar");
        });
        
        // Recuperación de errores
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                if(data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                else hls.recoverMediaError();
            }
        });

    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        // Para iOS (Safari)
        player.src = streamUrl;
        player.addEventListener('loadedmetadata', () => {
            if (startSeconds > 0) player.currentTime = startSeconds; // Salto manual en iOS
            player.play();
        });
    }
}

function startProgressTracking() {
    setInterval(async () => {
        if (player.paused || player.currentTime < 5) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // AHORA GUARDAMOS SEGUNDOS EXACTOS (Math.floor)
        // No guardamos porcentaje, porque para "reanudar" necesitamos segundos.
        const currentSeconds = Math.floor(player.currentTime);

        const { error } = await supabase.from('reading_progress').upsert({
            user_id: user.id,
            manga_id: contentId,
            manga_title: contentTitle,
            chapter_num: 1, 
            chapter_id: contentId,
            page_number: currentSeconds, // <--- GUARDAMOS SEGUNDOS
            last_read: new Date().toISOString()
        }, { onConflict: 'user_id, manga_id' });

    }, 10000); // Cada 10 segundos
}

// UI events
player.addEventListener('waiting', () => document.getElementById('loading-spinner').classList.remove('hidden'));
player.addEventListener('playing', () => document.getElementById('loading-spinner').classList.add('hidden'));
let timeout;
document.addEventListener('mousemove', () => {
    document.body.classList.remove('hide-cursor');
    clearTimeout(timeout);
    timeout = setTimeout(() => { if (!player.paused) document.body.classList.add('hide-cursor'); }, 3000);
});