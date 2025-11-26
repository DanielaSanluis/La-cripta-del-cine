// Función asíncrona que realiza una petición fetch a la URL dada y devuelve el JSON recibido
async function fetchJSON(url) {
  // usamos fetch para obtener la respuesta
  const r = await fetch(url);
  // parseamos la respuesta como JSON y la devolvemos
  return r.json();
}

// Objeto que representa los parámetros de consulta (?id=...) de la URL
const params = new URLSearchParams(location.search);
// Extrae el valor del parámetro "id" (identificador de la película a mostrar)
const id = params.get("id");

// Función principal que carga los datos de la película y renderiza la página
async function load() {
  // Solicita al servidor los datos de la película usando el id obtenido
  const movie = await fetchJSON(`/api/movies/${id}`);
  // Si no existe la película, mostramos un mensaje y salimos
  if (!movie) {
    document.getElementById("movie-container").innerHTML = "<p>Película no encontrada</p>";
    return;
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
  `;

  // Agrega un listener al botón "Enviar" para procesar el nuevo comentario
  document.getElementById("send").addEventListener("click", addComment);
}

// Función que recoge los valores del formulario y envía el comentario al servidor
async function addComment() {
  // Obtiene y limpia el valor del campo nombre
  const user = document.getElementById("user").value.trim();
  // Obtiene y limpia el valor del campo texto del comentario
  const text = document.getElementById("text").value.trim();
  // Validación simple: ambos campos son obligatorios
  if (!user || !text) { alert("Completa nombre y comentario"); return; }

  // Enviar la petición POST al servidor para guardar el comentario (endpoint /api/movies/:id/comment)
  const res = await fetch(`/api/movies/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // cuerpo con los campos del comentario serializado a JSON
    body: JSON.stringify({ user, text })
  });

  // Si la respuesta no es OK, mostramos un error (intenta parsear el JSON de error si existe)
  if (!res.ok) {
    const err = await res.json().catch(()=>null);
    alert(err && err.error ? `Error: ${err.error}` : "Error al enviar el comentario");
    return;
  }

  // Si todo fue bien, limpiar el formulario
  document.getElementById("user").value = "";
  document.getElementById("text").value = "";
  // Recargar el detalle para mostrar el nuevo comentario (vuelve a llamar a load)
  load();
}

// Utilidad: escapar caracteres especiales en un string para evitar inyección HTML
function escapeHtml(s){
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Utilidad: formatea una fecha ISO u otro valor como fecha legible localmente
function formatDate(d){
  if (!d) return '';
  try { const dt = new Date(d); return dt.toLocaleString(); } catch(e){ return d; }
}

// Llamada inicial para cargar la página cuando se carga el script
load();
