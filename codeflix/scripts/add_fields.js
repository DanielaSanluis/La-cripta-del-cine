import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '..', 'data', 'movies.json');
console.log('Updating', file);
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const updated = raw.map(m => {
  const scares = typeof m.scares === 'number' ? m.scares : null;
  return {
    ...m,
    jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : (scares !== null ? scares : 0),
    suspense: typeof m.suspense === 'number' ? m.suspense : (scares !== null ? scares : 3)
  };
});
fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
console.log('Updated', updated.length, 'movies');
