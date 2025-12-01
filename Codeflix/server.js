import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// 👇 Aquí está el cambio importante
app.use(express.static(path.join(__dirname, "src")));

// Rutas API
app.get("/api/movies", (req, res) => {
  // Leer los datos originales y normalizar para asegurar que cada película
  // tenga los campos `jumpscares` y `suspense` (por compatibilidad y para
  // no tener que editar manualmente todo el JSON de datos).
  const raw = JSON.parse(fs.readFileSync("./data/movies.json"));
  const data = raw.map(m => ({
    ...m,
    // `jumpscares`: número de sobresaltos bruscos (por defecto 0 si no existe)
    jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : 0,
    // `suspense`: nivel de suspenso 1-5. Si no existe, usar `scares` cuando está, o 3 por defecto
    suspense: typeof m.suspense === 'number' ? m.suspense : (typeof m.scares === 'number' ? m.scares : 3)
  }));
  res.json(data);
});

app.get("/api/carousels", (req, res) => {
  const data = JSON.parse(fs.readFileSync("./data/carousels.json"));
  res.json(data);
});

// Ruta para obtener una película específica
app.get("/api/movies/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync("./data/movies.json"));
  const m = data.find(m => m.id === parseInt(req.params.id));
  if (m) {
    // Normalizar campos nuevos antes de enviar
    const movie = {
      ...m,
      jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : 0,
      suspense: typeof m.suspense === 'number' ? m.suspense : (typeof m.scares === 'number' ? m.scares : 3)
    };
    res.json(movie);
  } else res.status(404).json({ error: "Película no encontrada" });
});

// Añadir comentario a una película (persistente en data/movies.json)
app.post("/api/movies/:id/comment", (req, res) => {
  try {
    const dataPath = path.join(__dirname, "data", "movies.json");
    const data = JSON.parse(fs.readFileSync(dataPath));
    const movie = data.find(m => m.id === parseInt(req.params.id));
    if (!movie) return res.status(404).json({ error: "Película no encontrada" });

    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: "Faltan campos" });

    const comment = {
      user: String(user).substring(0, 100),
      text: String(text).substring(0, 1000),
      date: new Date().toISOString()
    };

    movie.comments = movie.comments || [];
    movie.comments.push(comment);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al guardar el comentario' });
  }
});

// Endpoint para recibir puntuaciones de los 4 elementos (gore, scares, jumpscares, suspense)
// Este endpoint actualiza el archivo data/movies.json promediando los valores actuales
// con los recibidos por el cliente.
app.post('/api/movies/:id/rate', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'movies.json');
    const data = JSON.parse(fs.readFileSync(dataPath));
    const movieIndex = data.findIndex(m => m.id === parseInt(req.params.id));
    if (movieIndex === -1) return res.status(404).json({ error: 'Película no encontrada' });

    const { gore, scares, jumpscares, suspense } = req.body;
    // Validación básica: deben ser números entre 0 y 5
    const vals = { gore, scares, jumpscares, suspense };
    for (const k of Object.keys(vals)) {
      if (typeof vals[k] !== 'number' || vals[k] < 0 || vals[k] > 5) {
        return res.status(400).json({ error: `Campo inválido: ${k}` });
      }
    }

    const movie = data[movieIndex];
    // Asegurar que los campos existen y son números
    const curGore = typeof movie.gore === 'number' ? movie.gore : 0;
    const curScares = typeof movie.scares === 'number' ? movie.scares : 0;
    const curJumps = typeof movie.jumpscares === 'number' ? movie.jumpscares : 0;
    const curSusp = typeof movie.suspense === 'number' ? movie.suspense : (typeof movie.scares === 'number' ? movie.scares : 3);

    // Obtener contadores actuales (si no existen, asumir 1 voto inicial)
    // Si el contador existe, úsalo. Si no existe pero hay un valor
    // numérico para la métrica, asumimos que existe 1 voto previo.
    // Si no hay dato previo, el contador comienza en 0.
    let goreCount = typeof movie.gore_count === 'number'
      ? movie.gore_count
      : (typeof movie.gore === 'number' ? 1 : 0);
    let scaresCount = typeof movie.scares_count === 'number'
      ? movie.scares_count
      : (typeof movie.scares === 'number' ? 1 : 0);
    let jumpsCount = typeof movie.jumps_count === 'number'
      ? movie.jumps_count
      : (typeof movie.jumpscares === 'number' ? 1 : 0);
    let suspCount = typeof movie.suspense_count === 'number'
      ? movie.suspense_count
      : (typeof movie.suspense === 'number' ? 1 : 0);

    // Calcular nuevos promedios ponderados
    // Fórmula: ((PromedioActual * VotosActuales) + NuevoVoto) / (VotosActuales + 1)

    // Gore
    const newGore = ((curGore * goreCount) + gore) / (goreCount + 1);
    movie.gore = parseFloat(newGore.toFixed(1)); // Redondear a 1 decimal
    movie.gore_count = goreCount + 1;

    // Scares
    const newScares = ((curScares * scaresCount) + scares) / (scaresCount + 1);
    movie.scares = parseFloat(newScares.toFixed(1));
    movie.scares_count = scaresCount + 1;

    // Jumpscares
    const newJumps = ((curJumps * jumpsCount) + jumpscares) / (jumpsCount + 1);
    movie.jumpscares = parseFloat(newJumps.toFixed(1));
    movie.jumps_count = jumpsCount + 1;

    // Suspense
    const newSusp = ((curSusp * suspCount) + suspense) / (suspCount + 1);
    movie.suspense = parseFloat(newSusp.toFixed(1));
    movie.suspense_count = suspCount + 1;

    // Guardar cambios
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return res.json({ success: true, movie });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al procesar la puntuación' });
  }
});

// Ruta raíz: servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

// Servir página de detalle de película
app.get("/movie.html", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "movie.html"));
});

// CONTACTO (guardar mensajes)
const contactsPath = path.join(__dirname, "data", "contacts.json");

// Si no existe contacts.json, lo creamos
if (!fs.existsSync(contactsPath)) {
  fs.writeFileSync(contactsPath, JSON.stringify([], null, 2));
}

// Guardar mensaje de contacto
app.post("/api/contact", (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Faltan campos" });
    }

    const prev = JSON.parse(fs.readFileSync(contactsPath));

    const newMsg = {
      name: String(name).substring(0, 100),
      email: String(email).substring(0, 150),
      message: String(message).substring(0, 2000),
      date: new Date().toISOString()
    };

    prev.push(newMsg);
    fs.writeFileSync(contactsPath, JSON.stringify(prev, null, 2));

    return res.status(201).json({ success: true, contact: newMsg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al guardar el mensaje" });
  }
});

// Ver todos los mensajes guardados
app.get("/api/contact-list", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(contactsPath));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al leer mensajes" });
  }
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// Servir archivos estáticos adicionales (imágenes, videos)
app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use("/videos", express.static(path.join(__dirname, "public", "videos")));