import express from "express"; // Importa el framework Express para crear el servidor web
import fs from "fs"; // Importa el módulo de sistema de ficheros para leer/escribir archivos
import path from "path"; // Importa el módulo para manejar rutas de archivos
import { fileURLToPath } from "url"; // Importa util para obtener __filename en ESM

const __filename = fileURLToPath(import.meta.url); // Obtiene la ruta del archivo actual
const __dirname = path.dirname(__filename); // Obtiene el directorio del archivo actual

const app = express(); // Crea la instancia de la app Express
const PORT = 3000; // Puerto donde correrá el servidor

// Middleware
app.use(express.json()); // Permite que Express parsee JSON en el cuerpo de las peticiones

// 👇 Aquí está el cambio importante
app.use(express.static(path.join(__dirname, "src"))); // Sirve archivos estáticos desde la carpeta `src`

// Rutas API
app.get("/api/movies", (req, res) => { // Endpoint para obtener la lista de películas
  // Leer los datos originales y normalizar para asegurar que cada película
  // tenga los campos `jumpscares` y `suspense` (por compatibilidad y para
  // no tener que editar manualmente todo el JSON de datos).
  const raw = JSON.parse(fs.readFileSync("./data/movies.json")); // Lee y parsea el JSON de películas
  const data = raw.map(m => ({ // Mapea cada película para garantizar campos nuevos
    ...m, // Conserva todas las propiedades existentes
    // `jumpscares`: número de sobresaltos bruscos (por defecto 0 si no existe)
    jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : 0, // Añade jumpscares si falta
    // `suspense`: nivel de suspenso 1-5. Si no existe, usar `scares` cuando está, o 3 por defecto
    suspense: typeof m.suspense === 'number' ? m.suspense : (typeof m.scares === 'number' ? m.scares : 3) // Normaliza suspense
  }));
  res.json(data); // Devuelve la lista normalizada como JSON
});

app.get("/api/carousels", (req, res) => { // Endpoint para obtener datos de carousels
  const data = JSON.parse(fs.readFileSync("./data/carousels.json")); // Lee y parsea carousels.json
  res.json(data); // Devuelve los carousels como JSON
});

// Ruta para obtener una película específica
app.get("/api/movies/:id", (req, res) => { // Endpoint que devuelve una película por id
  const data = JSON.parse(fs.readFileSync("./data/movies.json")); // Lee lista completa de películas
  const m = data.find(m => m.id === parseInt(req.params.id)); // Busca la película por id numérico
  if (m) {
    // Normalizar campos nuevos antes de enviar
    const movie = {
      ...m, // Conserva propiedades existentes
      jumpscares: typeof m.jumpscares === 'number' ? m.jumpscares : 0, // Asegura jumpscares
      suspense: typeof m.suspense === 'number' ? m.suspense : (typeof m.scares === 'number' ? m.scares : 3) // Asegura suspense
    };
    res.json(movie); // Devuelve la película normalizada
  } else res.status(404).json({ error: "Película no encontrada" }); // Si no existe, 404
});

// Añadir comentario a una película (persistente en data/movies.json)
app.post("/api/movies/:id/comment", (req, res) => { // Endpoint para añadir comentario a una película
  try {
    const dataPath = path.join(__dirname, "data", "movies.json"); // Ruta absoluta al JSON de películas
    const data = JSON.parse(fs.readFileSync(dataPath)); // Lee y parsea el JSON
    const movie = data.find(m => m.id === parseInt(req.params.id)); // Encuentra la película por id
    if (!movie) return res.status(404).json({ error: "Película no encontrada" }); // 404 si no existe

    const { user, text } = req.body; // Extrae usuario y texto desde el cuerpo
    if (!user || !text) return res.status(400).json({ error: "Faltan campos" }); // 400 si faltan campos

    const comment = {
      user: String(user).substring(0, 100), // Sanitiza y limita longitud del usuario
      text: String(text).substring(0, 1000), // Sanitiza y limita longitud del texto
      date: new Date().toISOString() // Fecha ISO del comentario
    };

    movie.comments = movie.comments || []; // Inicializa array de comentarios si no existe
    movie.comments.push(comment); // Añade el nuevo comentario

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); // Guarda los cambios en el JSON

    return res.status(201).json({ success: true, comment }); // Responde con éxito y el comentario
  } catch (err) {
    console.error(err); // Log de error en servidor
    return res.status(500).json({ error: 'Error al guardar el comentario' }); // 500 si ocurre un error
  }
});

// Endpoint para recibir puntuaciones de los 4 elementos (gore, scares, jumpscares, suspense)
// Este endpoint actualiza el archivo data/movies.json promediando los valores actuales
// con los recibidos por el cliente.
app.post('/api/movies/:id/rate', (req, res) => { // Endpoint para registrar una valoración por película
  try {
    const dataPath = path.join(__dirname, 'data', 'movies.json'); // Ruta a movies.json
    const data = JSON.parse(fs.readFileSync(dataPath)); // Lee y parsea el JSON
    const movieIndex = data.findIndex(m => m.id === parseInt(req.params.id)); // Índice de la película
    if (movieIndex === -1) return res.status(404).json({ error: 'Película no encontrada' }); // 404 si no existe

    const { gore, scares, jumpscares, suspense } = req.body; // Extrae las métricas del cuerpo
    // Validación básica: deben ser números entre 0 y 5
    const vals = { gore, scares, jumpscares, suspense }; // Objeto con los valores recibidos
    for (const k of Object.keys(vals)) {
      if (typeof vals[k] !== 'number' || vals[k] < 0 || vals[k] > 5) {
        return res.status(400).json({ error: `Campo inválido: ${k}` }); // 400 si un valor no está en rango
      }
    }

    const movie = data[movieIndex]; // La película que se va a actualizar
    // Asegurar que los campos existen y son números
    const curGore = typeof movie.gore === 'number' ? movie.gore : 0; // Valor actual gore o 0
    const curScares = typeof movie.scares === 'number' ? movie.scares : 0; // Valor actual scares o 0
    const curJumps = typeof movie.jumpscares === 'number' ? movie.jumpscares : 0; // Valor actual jumpscares o 0
    const curSusp = typeof movie.suspense === 'number' ? movie.suspense : (typeof movie.scares === 'number' ? movie.scares : 3); // Suspense actual o fallback

    // Obtener contadores actuales (si no existen, asumir 1 voto inicial)
    // Si el contador existe, úsalo. Si no existe pero hay un valor
    // numérico para la métrica, asumimos que existe 1 voto previo.
    // Si no hay dato previo, el contador comienza en 0.
    let goreCount = typeof movie.gore_count === 'number'
      ? movie.gore_count
      : (typeof movie.gore === 'number' ? 1 : 0); // Contador de votos gore
    let scaresCount = typeof movie.scares_count === 'number'
      ? movie.scares_count
      : (typeof movie.scares === 'number' ? 1 : 0); // Contador de votos scares
    let jumpsCount = typeof movie.jumps_count === 'number'
      ? movie.jumps_count
      : (typeof movie.jumpscares === 'number' ? 1 : 0); // Contador de jumpscares
    let suspCount = typeof movie.suspense_count === 'number'
      ? movie.suspense_count
      : (typeof movie.suspense === 'number' ? 1 : 0); // Contador de suspense

    // Calcular nuevos promedios ponderados
    // Fórmula: ((PromedioActual * VotosActuales) + NuevoVoto) / (VotosActuales + 1)

    // Gore
    const newGore = ((curGore * goreCount) + gore) / (goreCount + 1); // Nuevo promedio gore
    movie.gore = parseFloat(newGore.toFixed(1)); // Redondea gore a 1 decimal
    movie.gore_count = goreCount + 1; // Incrementa contador gore

    // Scares
    const newScares = ((curScares * scaresCount) + scares) / (scaresCount + 1); // Nuevo promedio scares
    movie.scares = parseFloat(newScares.toFixed(1)); // Redondea scares
    movie.scares_count = scaresCount + 1; // Incrementa contador scares

    // Jumpscares
    const newJumps = ((curJumps * jumpsCount) + jumpscares) / (jumpsCount + 1); // Nuevo promedio jumpscares
    movie.jumpscares = parseFloat(newJumps.toFixed(1)); // Redondea jumpscares
    movie.jumps_count = jumpsCount + 1; // Incrementa contador jumpscares

    // Suspense
    const newSusp = ((curSusp * suspCount) + suspense) / (suspCount + 1); // Nuevo promedio suspense
    movie.suspense = parseFloat(newSusp.toFixed(1)); // Redondea suspense
    movie.suspense_count = suspCount + 1; // Incrementa contador suspense

    // Guardar cambios
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); // Escribe los cambios en el archivo

    return res.json({ success: true, movie }); // Responde con la película actualizada
  } catch (err) {
    console.error(err); // Log en caso de error
    return res.status(500).json({ error: 'Error al procesar la puntuación' }); // Responde 500 en error
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
//app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`)); // Inicia el servidor en el puerto definido

// Servir archivos estáticos adicionales (imágenes, videos)
app.use("/images", express.static(path.join(__dirname, "public", "images"))); // Sirve imágenes en /images
app.use("/videos", express.static(path.join(__dirname, "public", "videos"))); // Sirve videos en /videos

//IMPORTANTE: solo levantar el servidor si NO estamos en modo test
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () =>
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
  );
}

//Exportar la app para poder importarla en las pruebas
export default app;