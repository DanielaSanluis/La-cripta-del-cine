// Función asíncrona que realiza una petición fetch a la URL dada y devuelve el JSON recibido
async function fetchJSON(url) { // realiza fetch y retorna JSON
  // usamos fetch para obtener la respuesta
  const r = await fetch(url); // petición HTTP a la URL indicada
  // parseamos la respuesta como JSON y la devolvemos
  return r.json(); // devuelve el body parseado como JSON
}

// Objeto que representa los parámetros de consulta (?id=...) de la URL
const params = new URLSearchParams(location.search); // parsea los query params de la URL
// Extrae el valor del parámetro "id" (identificador de la película a mostrar)
const id = params.get("id"); // id de la película extraído del query string

// Función principal que carga los datos de la película y renderiza la página
async function load() { // carga y renderiza la vista de detalle
  // Solicita al servidor los datos de la película usando el id obtenido
  const movie = await fetchJSON(`/api/movies/${id}`); // petición a la API con el id
  // Si no existe la película, mostramos un mensaje y salimos
  if (!movie) {
    document.getElementById("movie-container").innerHTML = "<p>Película no encontrada</p>"; // mensaje de error
    return; // sale de la función
  }
  // Construye el HTML de detalle de la película (poster, información, video y comentarios)
  // A continuación mostramos también los niveles de "gore" y "miedo" (scares) si existen
  // - `movie.gore` representa un nivel de violencia/grado de gore (por ejemplo 0-5)
  // - `movie.scares` representa el nivel de sustos/miedo (por ejemplo 0-5)
  // Ambos valores se renderizan dentro del template HTML más abajo.
  // IMPORTANTE: la plantilla HTML está dentro de un template literal y no se comentan sus líneas internas
  document.getElementById("movie-container").innerHTML = `
    <div class="movie-detail">
      <a class="back" href="/">← Volver</a>
      <div class="meta">
        <img class="poster" src="${movie.poster}" alt="${movie.title}" />
        <div class="info">
          <h1>${movie.title} <small>(${movie.year})</small></h1>
          <p class="synopsis">${movie.synopsis}</p>
          <p class="tags"><strong>Tags:</strong> ${((movie.tags||[]).map(t => `<span class="tag">${t}</span>`).join(" "))}</p>
          <!-- Mostrar niveles: gore y scares (miedo) -->
          <p class="levels"><strong>Gore:</strong> ${movie.gore ?? 'N/A'} / 5 &nbsp; <strong>Miedo:</strong> ${movie.scares ?? 'N/A'} / 5</p>
        </div>
      </div>

            <div class="player">
        <h3>Trailer</h3>
        ${movie.trailer && movie.trailer.type === 'youtube' 
          ? `<iframe width="720" height="405" src="${movie.trailer.url}" frameborder="0" allowfullscreen></iframe>`
          : movie.trailer && movie.trailer.type === 'local'
          ? `<video controls width="720"><source src="${movie.trailer.url}" type="video/mp4">Tu navegador no soporta el elemento video.</video>`
          : `<video controls width="720" src="${movie.video}"></video>`
        }
      </div>

      <section class="comments-section">
        <h3>Comentarios</h3>
        <div id="comments">
          ${((movie.comments||[]).map(c => `<div class="comment"><b>${escapeHtml(c.user)}</b> <small>${formatDate(c.date)}</small><p>${escapeHtml(c.text)}</p></div>`).join(""))}
        </div>

        <h4>Añadir comentario</h4>
        <div class="comment-form">
          <input id="user" placeholder="Tu nombre" />
          <textarea id="text" placeholder="Tu comentario"></textarea>
          <button id="send">Enviar</button>
        </div>
      </section>
    </div>
  `; // FIN del template literal con el HTML de la película

  // Agrega un listener al botón "Enviar" para procesar el nuevo comentario
  document.getElementById("send").addEventListener("click", addComment); // vincula handler de envío
}

// Función que recoge los valores del formulario y envía el comentario al servidor
async function addComment() { // toma datos del formulario y hace POST para crear comentario
  // Obtiene y limpia el valor del campo nombre
  const user = document.getElementById("user").value.trim(); // nombre del usuario
  // Obtiene y limpia el valor del campo texto del comentario
  const text = document.getElementById("text").value.trim(); // texto del comentario
  // Validación simple: ambos campos son obligatorios
  if (!user || !text) { alert("Completa nombre y comentario"); return; } // valida campos

  // Enviar la petición POST al servidor para guardar el comentario (endpoint /api/movies/:id/comment)
  const res = await fetch(`/api/movies/${id}/comment`, { // realiza POST al endpoint de comentarios
    method: "POST", // método HTTP
    headers: { "Content-Type": "application/json" }, // indica JSON en body
    // cuerpo con los campos del comentario serializado a JSON
    body: JSON.stringify({ user, text }) // envía objeto {user, text}
  });

  // Si la respuesta no es OK, mostramos un error (intenta parsear el JSON de error si existe)
  if (!res.ok) {
    const err = await res.json().catch(()=>null); // intenta parsear error
    alert(err && err.error ? `Error: ${err.error}` : "Error al enviar el comentario"); // mensaje al usuario
    return; // sale si hubo error
  }

  // Si todo fue bien, limpiar el formulario
  document.getElementById("user").value = ""; // limpia campo user
  document.getElementById("text").value = ""; // limpia campo text
  // Recargar el detalle para mostrar el nuevo comentario (vuelve a llamar a load)
  load(); // recarga la vista para reflejar el comentario nuevo
}

// Utilidad: escapar caracteres especiales en un string para evitar inyección HTML
function escapeHtml(s){ // reemplaza caracteres que podrían romper HTML
  if (!s) return ''; // si es falsy, devuelve cadena vacía
  return String(s)
    .replace(/&/g,'&amp;') // escapa &
    .replace(/</g,'&lt;') // escapa <
    .replace(/>/g,'&gt;') // escapa >
    .replace(/"/g,'&quot;') // escapa "
    .replace(/'/g,'&#39;'); // escapa '
}

// Utilidad: formatea una fecha ISO u otro valor como fecha legible localmente
function formatDate(d){ // formatea fecha a formato local legible
  if (!d) return ''; // si no hay fecha, devuelve vacía
  try { const dt = new Date(d); return dt.toLocaleString(); } catch(e){ return d; } // intenta formatear
}

// Llamada inicial para cargar la página cuando se carga el script
load(); // ejecuta la carga inicial
