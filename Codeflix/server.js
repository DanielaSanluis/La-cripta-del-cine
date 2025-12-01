import express from "express"; // framework web minimal y flexible para Node.js
import fs from "fs"; // módulo del sistema de archivos para leer/escribir archivos
import path from "path"; // utilidades para manejar rutas de archivos
import { fileURLToPath } from "url"; // convierte URL de módulo a ruta de archivo

const __filename = fileURLToPath(import.meta.url); // ruta del archivo actual (compatibilidad ES modules)
const __dirname = path.dirname(__filename); // directorio del archivo actual

const app = express(); // instancia de la aplicación Express
const PORT = 3000; // puerto donde correrá el servidor

// Middleware
app.use(express.json()); // parsea JSON en el cuerpo de las solicitudes

// 👇 Aquí está el cambio importante
app.use(express.static(path.join(__dirname, "src"))); // sirve archivos estáticos desde la carpeta `src`

// Helper: carga movies.json y aplica un trailer por defecto cuando falta
function loadMovies() {
  const raw = fs.readFileSync(path.join(__dirname, "data", "movies.json"), 'utf8');
  const data = JSON.parse(raw);
  // asignar trailer por defecto para películas sin trailer o sin url
  const defaultTrailer = { type: 'local', url: 'videos/trailers/codeflix.mp4', format: 'mp4' };
  // helper para detectar si un trailer apunta a YouTube (considera espacios y variantes)
  function isYouTubeTrailer(t) {
    if (!t) return false;
    // type explícito
    if (t.type && String(t.type).trim().toLowerCase() === 'youtube') return true;
    // url que contiene youtube o youtu.be (ignora espacios extras)
    if (t.url && /youtu\.be|youtube\.com/i.test(String(t.url).replace(/\s+/g, ''))) return true;
    // id que parece un id de YouTube (aprox) y no hay url local
    if (t.id && typeof t.id === 'string' && /^[A-Za-z0-9_-]{6,}$/.test(t.id.trim())) return true;
    return false;
  }

  return data.map(m => {
    const t = m.trailer;
    const hasUrl = t && t.url && String(t.url).trim() !== '';
    // reemplazar si no hay trailer, no hay url, o el trailer apunta a YouTube
    if (!t || !hasUrl || isYouTubeTrailer(t)) {
      return Object.assign({}, m, { trailer: defaultTrailer }); // devolver copia con fallback
    }
    return m; // devolver original si tiene trailer local válido
  });
}

// Rutas API
app.get("/api/movies", (req, res) => { // endpoint para obtener todas las películas
  const data = loadMovies(); // carga y aplica trailer por defecto cuando falta
  res.json(data); // responde con el JSON de películas (posiblemente con fallback de trailer)
});

app.get("/api/carousels", (req, res) => { // endpoint para obtener los carousels
  const data = JSON.parse(fs.readFileSync("./data/carousels.json")); // lee y parsea `data/carousels.json`
  res.json(data); // responde con el JSON de carousels
});

// Ruta para obtener una película específica
app.get("/api/movies/:id", (req, res) => { // endpoint para obtener una película por su id
  const data = loadMovies(); // carga y aplica trailer por defecto cuando falta
  const movie = data.find(m => m.id === parseInt(req.params.id)); // busca la película con el id pedido
  if (movie) res.json(movie); // si existe, responde con la película
  else res.status(404).json({ error: "Película no encontrada" }); // si no, responde 404
});

// Añadir comentario a una película (persistente en data/movies.json)
app.post("/api/movies/:id/comment", (req, res) => { // endpoint para agregar un comentario a una película
  try {
    const dataPath = path.join(__dirname, "data", "movies.json"); // ruta absoluta a `movies.json`
    const data = JSON.parse(fs.readFileSync(dataPath)); // lee y parsea el JSON de películas
    const movie = data.find(m => m.id === parseInt(req.params.id)); // busca la película por id
    if (!movie) return res.status(404).json({ error: "Película no encontrada" }); // si no existe, 404

    const { user, text } = req.body; // extrae `user` y `text` del cuerpo de la solicitud
    if (!user || !text) return res.status(400).json({ error: "Faltan campos" }); // valida campos requeridos

    const comment = {
      user: String(user).substring(0, 100), // sanitiza/limita longitud del usuario
      text: String(text).substring(0, 1000), // sanitiza/limita longitud del texto
      date: new Date().toISOString() // fecha ISO del comentario
    };

    movie.comments = movie.comments || []; // asegura que exista el array `comments`
    movie.comments.push(comment); // agrega el comentario a la película

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); // persiste los cambios en disco

    return res.status(201).json({ success: true, comment }); // responde con el comentario creado
  } catch (err) {
    console.error(err); // registra el error en la consola
    return res.status(500).json({ error: 'Error al guardar el comentario' }); // error servidor
  }
});

// Ruta raíz: servir index.html
app.get("/", (req, res) => { // sirve la página principal
  res.sendFile(path.join(__dirname, "src", "index.html")); // envía el archivo `index.html`
});

// Servir página de detalle de película
app.get("/movie.html", (req, res) => { // sirve la página de detalle de película
  res.sendFile(path.join(__dirname, "src", "movie.html")); // envía el archivo `movie.html`
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`)); // arranca el servidor y muestra la URL

// Servir archivos estáticos adicionales (imágenes, videos)
app.use("/images", express.static(path.join(__dirname, "public", "images"))); // ruta pública para imágenes
app.use("/videos", express.static(path.join(__dirname, "public", "videos"))); // ruta pública para videos