// Offline-First-Modul: IndexedDB-Warteschlange für Protokolle & Anlagen.
// Ohne Netz erfasste Datensätze werden lokal gepuffert und beim nächsten
// Online-Ereignis (oder App-Start) automatisch zu Supabase synchronisiert.
// IDs werden clientseitig (crypto.randomUUID) vergeben, damit abhängige
// Messwerte bereits offline korrekt referenzieren.

const DB_NAME = 'mepromas-offline'
const STORE = 'queue'

function oeffneDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const res = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(res?.result)
    t.onerror = () => reject(t.error)
  })
}

// eintrag: { tabelle: 'protokolle'|'anlagen', datensatz: {...}, messwerte?: [...] }
export async function inWarteschlange(eintrag) {
  const db = await oeffneDb()
  await tx(db, 'readwrite', s => s.add({ ...eintrag, erfasst_am: new Date().toISOString() }))
  db.close()
}

export async function anzahlAusstehend() {
  const db = await oeffneDb()
  const n = await tx(db, 'readonly', s => s.count())
  db.close()
  return n ?? 0
}

// Synchronisiert die Warteschlange sequentiell; bricht beim ersten Fehler ab
// (Reihenfolge bleibt erhalten, Rest wird beim nächsten Versuch verarbeitet).
export async function syncWarteschlange(supabase) {
  if (!navigator.onLine) return { synchronisiert: 0 }
  const db = await oeffneDb()
  const keysReq = await tx(db, 'readonly', s => s.getAllKeys())
  let synchronisiert = 0

  for (const key of keysReq ?? []) {
    const eintrag = await tx(db, 'readonly', s => s.get(key))
    if (!eintrag) continue
    try {
      const { error } = await supabase.from(eintrag.tabelle).insert(eintrag.datensatz)
      // Duplikat (23505) = bereits synchronisiert → Eintrag verwerfen
      if (error && error.code !== '23505') throw error
      if (eintrag.messwerte?.length) {
        const { error: mErr } = await supabase.from('messwerte').insert(eintrag.messwerte)
        if (mErr && mErr.code !== '23505') throw mErr
      }
      await tx(db, 'readwrite', s => s.delete(key))
      synchronisiert++
    } catch (e) {
      console.warn('Offline-Sync unterbrochen:', e?.message || e)
      break
    }
  }
  db.close()
  return { synchronisiert }
}

// Einheitlicher Speicherpfad: online direkt, offline in die Warteschlange.
// Rückgabe: { offline: boolean, error }
export async function speichernOderPuffern(supabase, tabelle, datensatz, messwerte = []) {
  if (navigator.onLine) {
    const { error } = await supabase.from(tabelle).insert(datensatz)
    if (!error && messwerte.length) {
      const { error: mErr } = await supabase.from('messwerte').insert(messwerte)
      if (mErr) console.warn('Messwerte nicht gespeichert:', mErr.message)
    }
    // Netzfehler trotz onLine (z. B. Funkloch) → puffern
    if (error && (error.message?.includes('fetch') || error.message?.includes('network'))) {
      await inWarteschlange({ tabelle, datensatz, messwerte })
      return { offline: true, error: null }
    }
    return { offline: false, error }
  }
  await inWarteschlange({ tabelle, datensatz, messwerte })
  return { offline: true, error: null }
}
