// js/db.js
import { supabase } from './supabase-client.js';

// 1. GUARDAR PROGRESO (Se llama cada vez que cambias de página)


export async function saveProgress(mangaId, mangaTitle, chapterId, chapterNum, pageNum) {
    console.log("💾 INTENTANDO GUARDAR:", { mangaId, mangaTitle, chapterNum, pageNum }); // <--- CHIVATO 1

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("❌ ERROR: No hay usuario logueado.");
        return;
    }

    const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
            user_id: user.id,
            manga_id: mangaId,
            manga_title: mangaTitle,
            chapter_id: chapterId,
            chapter_num: chapterNum,
            page_number: pageNum,
            last_read: new Date()
        }, { onConflict: 'user_id, manga_id' })
        .select();

    if (error) {
        console.error("🔥 ERROR SUPABASE:", error.message, error.details); // <--- CHIVATO 2
    } else {
        console.log("✅ GUARDADO EXITOSO EN NUBE:", data); // <--- CHIVATO 3
    }
}

// 2. FAVORITOS: AGREGAR/QUITAR (Para el botón de la biblioteca)
// --- CÓDIGO CORREGIDO DE LA FUNCIÓN ---
export async function toggleFavorite(mangaId, mangaTitle, coverUrl) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Usamos maybeSingle() para que no de error si está vacío
    const { data } = await supabase
        .from('library')
        .select('*')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle(); 

    if (data) {
        // Si existe (data no es null) -> Borrar
        await supabase.from('library').delete().eq('id', data.id);
        return false;
    } else {
        // Si no existe (data es null) -> Crear
        await supabase.from('library').insert({
            user_id: user.id,
            manga_id: mangaId,
            manga_title: mangaTitle,
            cover_url: coverUrl,
            status: 'leyendo'
        });
        return true;
    }
}

// 3. CONSULTAR ESTADO (Para pintar el botón de color si ya es favorito)
export async function checkLibraryStatus(mangaId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
        .from('library')
        .select('id')
        .eq('user_id', user.id)
        .eq('manga_id', mangaId)
        .maybeSingle(); // <--- Aquí también cambia single() por maybeSingle()

    return !!data;// Devuelve true si existe, false si no
}

