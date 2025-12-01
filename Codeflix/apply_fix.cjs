const fs = require('fs');
const path = require('path');

const moviesPath = path.join(__dirname, 'data', 'movies.json');

function readMovies() {
  return JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
}

function backupMovies() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = moviesPath + `.bak.${ts}`;
  fs.copyFileSync(moviesPath, backupPath);
  return backupPath;
}

const defaultTrailer = { type: 'local', url: 'videos/trailers/codeflix.mp4', format: 'mp4' };

function isYouTubeTrailer(t) {
  if (!t) return true;
  if (t.type && t.type.toLowerCase() === 'local') return false;
  const url = (t.url || '').toString().trim().replace(/\s+/g, '');
  const id = (t.id || '').toString().trim();
  if (!url && !id) return true;
  const ytDomains = ['youtube.com', 'youtu.be', 'youtube-nocookie.com'];
  if (ytDomains.some(d => url.toLowerCase().includes(d))) return true;
  if (/embed\/[\w-]{8,}/i.test(url)) return true;
  if (/^[\w-]{11}$/.test(id)) return true;
  return false;
}

function transformMovies(movies) {
  let changed = 0;
  const out = movies.map(m => {
    const t = m.trailer;
    if (!t || isYouTubeTrailer(t)) {
      const wasLocalSame = t && t.type === 'local' && t.url === defaultTrailer.url;
      if (!wasLocalSame) changed++;
      m.trailer = defaultTrailer;
    }
    return m;
  });
  return { out, changed };
}

function main() {
  try {
    if (!fs.existsSync(moviesPath)) {
      console.error('No se encontró', moviesPath);
      process.exit(1);
    }
    const backup = backupMovies();
    console.log('Backup creado en:', backup);
    const movies = readMovies();
    const { out, changed } = transformMovies(movies);
    fs.writeFileSync(moviesPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(`Reescrito ${moviesPath} — registros modificados: ${changed}`);
    process.exit(0);
  } catch (err) {
    console.error('Error procesando movies.json:', err);
    process.exit(2);
  }
}

main();
