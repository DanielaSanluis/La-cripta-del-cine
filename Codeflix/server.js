/**
 * server.js
 * Servidor web para CodeFlix - entrega de contenido estático y API REST
 * - Sirve la UI estática en `src/`
 * - Expone endpoints JSON para `movies`, `carousels`, `contact` y rating
 *
 * Nota: Implementación orientada a prototipado/entorno de desarrollo.
 */
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // Obtiene la ruta del archivo actual
const __dirname = path.dirname(__filename); // Obtiene el directorio del archivo actual

const app = express(); // Crea la instancia de la app Express
const PORT = 3000; // Puerto donde correrá el servidor

// Middleware
app.use(express.json()); // Permite que Express parsee JSON en el cuerpo de las peticiones

// 👇 Aquí está el cambio importante
app.use(express.static(path.join(__dirname, "src"))); // Sirve archivos estáticos desde la carpeta `src`

// Rutas API
/**
 * GET /api/movies
 * Devuelve la lista de películas normalizada. Asegura que cada objeto
 * tenga los campos numéricos `jumpscares` y `suspense` para evitar
 * inconsistencias en el cliente.
 */
app.get("/api/movies", (req, res) => {
  const raw = JSON.parse(fs.readFileSync("./data/movies.json"));
  const data = raw.map((m) => ({
    ...m,
    jumpscares: typeof m.jumpscares === "number" ? m.jumpscares : 0,
    suspense:
      typeof m.suspense === "number"
        ? m.suspense
        : typeof m.scares === "number"
        ? m.scares
        : 3,
  }));
  res.json(data);
});

/**
 * GET /api/carousels
 * Devuelve el contenido del archivo `data/carousels.json` tal cual.
 */
app.get("/api/carousels", (req, res) => {
  const data = JSON.parse(fs.readFileSync("./data/carousels.json"));
  res.json(data);
});

// Ruta para obtener una película específica
/**
 * GET /api/movies/:id
 * Devuelve una película por su identificador. Normaliza los campos numéricos
 * y retorna 404 si no se encuentra.
 */
app.get("/api/movies/:id", (req, res) => {
  const data = JSON.parse(fs.readFileSync("./data/movies.json"));
  const m = data.find((m) => m.id === parseInt(req.params.id));
  if (m) {
    const movie = {
      ...m,
      jumpscares: typeof m.jumpscares === "number" ? m.jumpscares : 0,
      suspense:
        typeof m.suspense === "number"
          ? m.suspense
          : typeof m.scares === "number"
          ? m.scares
          : 3,
    };
    res.json(movie);
  } else res.status(404).json({ error: "Película no encontrada" });
});

// Añadir comentario a una película (persistente en data/movies.json)
/**
 * POST /api/movies/:id/comment
 * Añade un comentario a la película indicada por :id. El cuerpo debe
 * contener { user, text }. Responde 201 con el comentario creado.
 */
app.post("/api/movies/:id/comment", (req, res) => {
  try {
    const dataPath = path.join(__dirname, "data", "movies.json");
    const data = JSON.parse(fs.readFileSync(dataPath));
    const movie = data.find((m) => m.id === parseInt(req.params.id));
    if (!movie) return res.status(404).json({ error: "Película no encontrada" });

    const { user, text } = req.body;
    if (!user || !text) return res.status(400).json({ error: "Faltan campos" });

    const comment = {
      user: String(user).substring(0, 100),
      text: String(text).substring(0, 1000),
      date: new Date().toISOString(),
    };

    movie.comments = movie.comments || [];
    movie.comments.push(comment);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al guardar el comentario" });
  }
});

// Endpoint para recibir puntuaciones de los 4 elementos (gore, scares, jumpscares, suspense)
// Este endpoint actualiza el archivo data/movies.json promediando los valores actuales
// con los recibidos por el cliente.
/**
 * POST /api/movies/:id/rate
 * Recibe un payload con { gore, scares, jumpscares, suspense } (números 0-5)
 * y actualiza los promedios de la película persistiendo en el JSON.
 */
app.post("/api/movies/:id/rate", (req, res) => {
  try {
    const dataPath = path.join(__dirname, "data", "movies.json");
    const data = JSON.parse(fs.readFileSync(dataPath));
    const movieIndex = data.findIndex((m) => m.id === parseInt(req.params.id));
    if (movieIndex === -1) return res.status(404).json({ error: "Película no encontrada" });

    const { gore, scares, jumpscares, suspense } = req.body;
    const vals = { gore, scares, jumpscares, suspense };
    for (const k of Object.keys(vals)) {
      if (typeof vals[k] !== "number" || vals[k] < 0 || vals[k] > 5) {
        return res.status(400).json({ error: `Campo inválido: ${k}` });
      }
    }

    const movie = data[movieIndex];
    const curGore = typeof movie.gore === "number" ? movie.gore : 0;
    const curScares = typeof movie.scares === "number" ? movie.scares : 0;
    const curJumps = typeof movie.jumpscares === "number" ? movie.jumpscares : 0;
    const curSusp = typeof movie.suspense === "number" ? movie.suspense : typeof movie.scares === "number" ? movie.scares : 3;

    let goreCount = typeof movie.gore_count === "number" ? movie.gore_count : typeof movie.gore === "number" ? 1 : 0;
    let scaresCount = typeof movie.scares_count === "number" ? movie.scares_count : typeof movie.scares === "number" ? 1 : 0;
    let jumpsCount = typeof movie.jumps_count === "number" ? movie.jumps_count : typeof movie.jumpscares === "number" ? 1 : 0;
    let suspCount = typeof movie.suspense_count === "number" ? movie.suspense_count : typeof movie.suspense === "number" ? 1 : 0;

    const newGore = ((curGore * goreCount) + gore) / (goreCount + 1);
    movie.gore = parseFloat(newGore.toFixed(1));
    movie.gore_count = goreCount + 1;

    const newScares = ((curScares * scaresCount) + scares) / (scaresCount + 1);
    movie.scares = parseFloat(newScares.toFixed(1));
    movie.scares_count = scaresCount + 1;

    const newJumps = ((curJumps * jumpsCount) + jumpscares) / (jumpsCount + 1);
    movie.jumpscares = parseFloat(newJumps.toFixed(1));
    movie.jumps_count = jumpsCount + 1;

    const newSusp = ((curSusp * suspCount) + suspense) / (suspCount + 1);
    movie.suspense = parseFloat(newSusp.toFixed(1));
    movie.suspense_count = suspCount + 1;

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return res.json({ success: true, movie });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al procesar la puntuación" });
  }
});

// Ruta raíz: servir index.html
app.get("/", (req, res) => { // Endpoint para la página principal
  res.sendFile(path.join(__dirname, "src", "index.html")); // Envía index.html
});

// Servir página de detalle de película
app.get("/movie.html", (req, res) => { // Endpoint para la página de detalle
  res.sendFile(path.join(__dirname, "src", "movie.html")); // Envía movie.html
});

// CONTACTO (guardar mensajes)
const contactsPath = path.join(__dirname, "data", "contacts.json"); // Ruta a contacts.json

// Si no existe contacts.json, lo creamos
if (!fs.existsSync(contactsPath)) {
  fs.writeFileSync(contactsPath, JSON.stringify([], null, 2)); // Crea archivo con array vacío
}

/**
 * Ruta POST: /api/contact
 * -------------------------------------------
 * Esta ruta recibe la información enviada por el
 * formulario de contacto (nombre, correo y mensaje),
 * valida los datos, los guarda en un archivo JSON
 * y responde al cliente con el resultado.
 */
app.post("/api/contact", (req, res) => {
  try {
    // Extrae los datos enviados en el cuerpo de la solicitud
    let { name, email, message } = req.body;

    // Validación inicial: el nombre y el email son obligatorios
    if (!name || !email) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Normaliza los valores eliminando espacios innecesarios
    name = String(name).trim();
    email = String(email).trim();
    message = String(message || "").trim();

    // Regex para email
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailRegex = /^[^\s@]+@(gmail\.(com|mx|es|com\.mx)|hotmail\.(com|es)|outlook\.(com|es|com\.mx)|ciencias\.unam\.mx)$/i;

    // Validación solo de nombre y email
    if (name.length < 2) {
      return res.status(400).json({ error: "Nombre demasiado corto" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Correo electrónico inválido" });
    }

    /**
     * Lee el archivo JSON donde se guardan los contactos.
     * El archivo debe existir y contener un arreglo JSON válido.
     */
    const prev = JSON.parse(fs.readFileSync(contactsPath));

    const newMsg = {
      // Se aplica un límite para evitar entradas excesivamente largas
      name: name.substring(0, 100),
      email: email.substring(0, 150),
      message: message.substring(0, 2000), // se acepta vacio
      date: new Date().toISOString()// Fecha en formato estándar
    };

    prev.push(newMsg);
    fs.writeFileSync(contactsPath, JSON.stringify(prev, null, 2));

    return res.status(201).json({ success: true, contact: newMsg });
  } catch (err) {
    /**
     * Cualquier error en el proceso (lectura/escritura del archivo,
     * problemas con JSON, etc.) es capturado aquí para evitar que
     * el servidor se caiga y se responde con un error 500.
     */
    console.error(err);
    return res.status(500).json({ error: "Error al guardar el mensaje" });
  }
});

// Ver todos los mensajes guardados
app.get("/api/contact-list", (req, res) => { // Endpoint para listar mensajes de contacto
  try {
    const data = JSON.parse(fs.readFileSync(contactsPath)); // Lee y parsea contacts.json
    res.json(data); // Devuelve lista de mensajes
  } catch (err) {
    console.error(err); // Log de error
    res.status(500).json({ error: "Error al leer mensajes" }); // 500 si ocurre un error
  }
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`)); // Inicia el servidor en el puerto definido

// Servir archivos estáticos adicionales (imágenes, videos)
app.use("/images", express.static(path.join(__dirname, "public", "images"))); // Sirve imágenes en /images
app.use("/videos", express.static(path.join(__dirname, "public", "videos"))); // Sirve videos en /videos