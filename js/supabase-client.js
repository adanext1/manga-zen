// js/supabase-client.js

// Importamos la librería desde el CDN (Internet)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ⚠️ REEMPLAZA ESTO CON TUS DATOS DE SUPABASE
const SUPABASE_URL = 'https://fwqspkqfzgbhylukczqc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_g1EUZ56D-dQsLPhUGJ4Jfw_9pvCO2Co';

// Creamos la conexión y la exportamos para usarla en otros archivos
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);