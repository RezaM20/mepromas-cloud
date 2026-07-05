// src/lib/supabaseBrunnen.js
// Zweiter Supabase-Client: Brunnen-Projekt (ugleiqjsghcodrullobw)
// Mepromas Cloud nutzt weiterhin den Haupt-Client (icwvipwziilaxhiziwjg).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_BRUNNEN_SUPABASE_URL
const key = import.meta.env.VITE_BRUNNEN_SUPABASE_ANON_KEY

// null statt Exception, solange die Brunnen-Zugangsdaten fehlen — createClient()
// wirft sonst beim Modul-Import (supabaseUrl is required) und reißt die ganze App mit runter,
// da diese Datei über App.jsx statisch mitgeladen wird.
export const supabaseBrunnen = (url && key) ? createClient(url, key) : null
