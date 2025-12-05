import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * add_fields.js
 * Script sencillo para añadir/normalizar campos en `data/movies.json`.
 * - Crea/ajusta `jumpscares` y `suspense` según valores presentes.
 * - Realiza una copia de seguridad del archivo antes de sobrescribir.
 * Uso: node --experimental-modules scripts/add_fields.js (según entorno)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '..', 'data', 'movies.json');
try {
  console.log('Updating', file);
  if (!fs.existsSync(file)) throw new Error('File not found: ' + file);

  const backup = file + '.bak';
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const updated = raw.map((m) => {
    const scares = typeof m.scares === 'number' ? m.scares : null;
    return {
      ...m,
      jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : scares !== null ? scares : 0,
      suspense: typeof m.suspense === 'number' ? m.suspense : scares !== null ? scares : 3,
    };
  });

  fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
  console.log('Updated', updated.length, 'movies');
} catch (err) {
  console.error('Error updating movies.json:', err);
  process.exit(1);
}
