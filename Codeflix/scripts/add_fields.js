import fs from 'fs'; // Importa módulo para leer/escribir archivos
import path from 'path'; // Importa módulo para manejar rutas
import { fileURLToPath } from 'url'; // Importa función para obtener __filename en ESM

const __filename = fileURLToPath(import.meta.url); // Obtiene la ruta del archivo actual
const __dirname = path.dirname(__filename); // Obtiene el directorio del archivo actual

const file = path.join(__dirname, '..', 'data', 'movies.json'); // Construye la ruta al JSON de películas
console.log('Updating', file); // Muestra en consola el archivo que se actualizará
const raw = JSON.parse(fs.readFileSync(file, 'utf8')); // Lee y parsea el JSON original
const updated = raw.map(m => { // Mapea cada película para asegurar nuevos campos
  const scares = typeof m.scares === 'number' ? m.scares : null; // Guarda valor de `scares` si existe
  return {
    ...m, // Conserva propiedades existentes
    jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : (scares !== null ? scares : 0), // Añade/normaliza jumpscares
    suspense: typeof m.suspense === 'number' ? m.suspense : (scares !== null ? scares : 3) // Añade/normaliza suspense
  };
});
fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8'); // Sobrescribe el archivo con la versión actualizada
console.log('Updated', updated.length, 'movies'); // Log con número de películas procesadas
