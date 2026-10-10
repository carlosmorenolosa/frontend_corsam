// src/lib/api.js
// Shared data layer for partidas. Consolidates the paginated Supabase REST
// fetch that was previously duplicated in PartidasExplorer.jsx and
// DashboardObra.jsx.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fetch directo para evitar el límite de 1000 del cliente Supabase.
// Supabase REST limita a 1000 por defecto, así que paginamos con rangos.
//
// Semántica de petición heredada de PartidasExplorer: mismas cabeceras,
// mismo bucle de paginación y mismos incrementos de offset.
//
// `throwOnError` conserva el comportamiento previo de cada consumidor:
//  - true (por defecto): lanza en respuestas no-OK (PartidasExplorer, que
//    mostraba la pantalla de error).
//  - false: corta el bucle y devuelve lo acumulado (DashboardObra, que antes
//    hacía `break` silencioso y renderizaba una tabla/selector vacío).
export const fetchAllPartidas = async ({ throwOnError = true } = {}) => {
  let allData = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/partidas?select=*&order=obra.asc&limit=${batchSize}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    if (!response.ok) {
      if (throwOnError) throw new Error(`HTTP ${response.status}`);
      break;
    }
    const batch = await response.json();
    if (!batch.length) break;
    allData = [...allData, ...batch];
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return { data: allData, total: allData.length };
};
