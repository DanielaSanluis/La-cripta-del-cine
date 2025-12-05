/**
 * normalize_movies.js
 * Script de apoyo que normaliza campos numéricos en `data/movies.json`.
 * Genera un backup `movies.json.bak` antes de sobrescribir.
 * Uso: node scripts/normalize_movies.js
 */

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'movies.json');
const backup = file + '.bak';

if (!fs.existsSync(file)) {
  console.error('No se encontró', file);
  process.exit(1);
}

try {
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    console.log('Backup creado en', backup);
  } else {
    console.log('Backup ya existe en', backup);
  }

  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  const normalized = data.map((m) => {
    const movie = Object.assign({}, m);

    // Asegurar gore
    movie.gore = Number(movie.gore || 0);

    // miedo -> preferir valor existente 'miedo', sino 'scares' u 'scare'
    movie.miedo = Number(
      typeof movie.miedo === 'number' && movie.miedo >= 0
        ? movie.miedo
        : typeof movie.scares === 'number'
        ? movie.scares
        : typeof movie.scare === 'number'
        ? movie.scare
        : 0
    );

    // jumps -> preferir 'jumps' o 'jumpscares'
    movie.jumps = Number(
      typeof movie.jumps === 'number'
        ? movie.jumps
        : typeof movie.jumpscares === 'number'
        ? movie.jumpscares
        : 0
    );

    // suspenso -> preferir 'suspenso' o 'suspense' o fallback a 'scares'
    movie.suspenso = Number(
      typeof movie.suspenso === 'number'
        ? movie.suspenso
        : typeof movie.suspense === 'number'
        ? movie.suspense
        : typeof movie.scares === 'number'
        ? movie.scares
        : 0
    );

    return movie;
  });

  fs.writeFileSync(file, JSON.stringify(normalized, null, 2), 'utf8');
  console.log('Normalización completada. Registros procesados:', normalized.length);
  process.exit(0);
} catch (err) {
  console.error('Error al normalizar:', err);
  process.exit(2);
}
