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
  // calcular terrorímetro antes de renderizar la plantilla
  const terrorValue = computeTerrorimeter(movie);
  const terrorPercent = Math.round((terrorValue / 5) * 100);

  document.getElementById("movie-container").innerHTML = `
    <div class="movie-detail">
      <a class="back" href="/">← Volver</a>
      <div class="meta">
        <img class="poster" src="${movie.poster}" alt="${movie.title}" />
        <div class="info">
          <h1>${movie.title} <small>(${movie.year})</small></h1>
          <!-- Terrorímetro: medidor calculado a partir de gore, miedo, jumpscares y suspenso -->
          <div class="terrorimeter">
            <div class="terror-bar"><div class="terror-fill" style="width:${terrorPercent}%;"></div></div>
            <div class="terror-score">Terrorímetro: ${terrorValue}/5</div>
          </div>
          <p class="synopsis">${movie.synopsis}</p>
          <p class="tags"><strong>Tags:</strong> ${((movie.tags || []).map(t => `<span class="tag">${t}</span>`).join(" "))}</p>
          <!-- Mostrar niveles: gore y scares (miedo) -->
          <p class="levels"><strong>Gore:</strong> ${movie.gore ?? 'N/A'} / 5 &nbsp; <strong>Miedo:</strong> ${movie.scares ?? 'N/A'} / 5</p>
          <!-- Mostrar nuevos campos: jumpscares y suspense -->
          <!-- movie.jumpscares: número aproximado de sobresaltos tipo "jump" en la película (0-5) -->
          <!-- movie.suspensos: nivel de suspenso 1-5; si no está, el servidor puede devolver suspense por defecto -->
          <p class="levels"><strong>Jumpscares:</strong> ${movie.jumpscares ?? 'N/A'} &nbsp; <strong>Suspenso:</strong> ${movie.suspense ?? 'N/A'} / 5</p>
        </div>
      </div>

            <div class="player">
        <h3>Trailer</h3>
            ${movie.trailer && movie.trailer.type === 'youtube'
      ? `<iframe width="720" height="405" src="${movie.trailer.url}" frameborder="0" allowfullscreen></iframe>`
      : movie.trailer && movie.trailer.type === 'local'
        ? `<video id="movie-video" controls width="720"><source src="${movie.trailer.url}" type="video/mp4">Tu navegador no soporta el elemento video.</video>`
        : `<video id="movie-video" controls width="720" src="${movie.video}"></video>`
    }
            <!-- Botón de simulación para reproducir fin en cualquier caso -->
            <div style="text-align:center;margin-top:8px;"><button id="simulate-end" class="simulate-btn">He terminado de ver</button></div>
      </div>

      <section class="comments-section">
        <h3>Comentarios</h3>
        <div id="comments">
          ${((movie.comments || []).map(c => `<div class="comment"><b>${escapeHtml(c.user)}</b> <small>${formatDate(c.date)}</small><p>${escapeHtml(c.text)}</p></div>`).join(""))}
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

  // Si existe un elemento video, añadimos evento 'ended' para mostrar el formulario al terminar
  const vid = document.getElementById('movie-video');
  if (vid) {
    vid.addEventListener('ended', () => {
      showRatingForm(movie);
    });
  }

  // Botón para simular el fin de la película/trailer (útil para iframes o pruebas)
  const sim = document.getElementById('simulate-end');
  if (sim) sim.addEventListener('click', () => showRatingForm(movie));
}

// Mostrar modal con formulario para puntuar las 4 métricas usando un selector tipo "estrellas"
function showRatingForm(movie) {
  // evitar múltiples modales
  if (document.getElementById('rating-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'rating-modal';
  modal.className = 'rating-overlay';
  modal.innerHTML = `
      <div class="rating-box">
        <h3>Valora la película</h3>
        <p>Selecciona de 1 a 5 estrellas para cada elemento:</p>
        <div class="rating-field"><div class="rating-label">Gore</div><div id="r-gore" class="star-rating"></div></div>
        <div class="rating-field"><div class="rating-label">Miedo (scares)</div><div id="r-scares" class="star-rating"></div></div>
        <div class="rating-field"><div class="rating-label">Jumpscares</div><div id="r-jumps" class="star-rating"></div></div>
        <div class="rating-field"><div class="rating-label">Suspenso</div><div id="r-susp" class="star-rating"></div></div>
        <div class="rating-actions">
          <button id="rating-send">Enviar valoración</button>
          <button id="rating-cancel">Cancelar</button>
        </div>
      </div>
    `;
  document.body.appendChild(modal);

  // Inicializar cada control de estrellas
  function buildStars(containerId, currentValue) {
    const cont = document.getElementById(containerId);
    cont.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.dataset.value = String(i);
      s.tabIndex = 0;
      s.innerText = '★';
      if (i <= Math.round(currentValue || 0)) s.classList.add('selected');
      // click
      s.addEventListener('click', () => setStars(cont, i));
      s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStars(cont, i); } });
      cont.appendChild(s);
    }
  }

  function setStars(container, value) {
    const stars = container.querySelectorAll('.star');
    stars.forEach(s => {
      const v = Number(s.dataset.value);
      if (v <= value) s.classList.add('selected'); else s.classList.remove('selected');
    });
  }

  // Crear controles y fijar valores iniciales basados en movie
  buildStars('r-gore', movie.gore);
  buildStars('r-scares', movie.scares);
  buildStars('r-jumps', movie.jumpscares);
  buildStars('r-susp', movie.suspense);

  document.getElementById('rating-cancel').addEventListener('click', hideRatingForm);
  document.getElementById('rating-send').addEventListener('click', async () => {
    // leer selección de estrellas (valor 1-5) o 0 si no hay selección
    // Método más robusto: contamos las estrellas con la clase `selected`
    // y devolvemos el valor máximo entre ellas (debe coincidir con la selección)
    const read = (id) => {
      const selected = Array.from(document.querySelectorAll(`#${id} .star.selected`));
      if (!selected.length) return 0;
      const vals = selected.map(s => Number(s.dataset.value)).filter(v => Number.isFinite(v));
      return vals.length ? Math.max(...vals) : 0;
    };
    const gore = read('r-gore');
    const scares = read('r-scares');
    const jumpscares = read('r-jumps');
    const suspense = read('r-susp');

    // Depuración: mostrar los valores leídos en la consola
    console.debug('Valores de valoración seleccionados ->', { gore, scares, jumpscares, suspense });

    // validación: valores entre 0 y 5
    for (const v of [gore, scares, jumpscares, suspense]) {
      if (!Number.isFinite(v) || v < 0 || v > 5) { alert('Valores deben ser entre 0 y 5'); return; }
    }

    // enviar al servidor el rating (usar el id de la URL para mayor fiabilidad)
    const res = await fetch(`/api/movies/${id}/rate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gore, scares, jumpscares, suspense })
    });
    if (!res.ok) {
      let errText = 'Error al enviar valoración';
      try { const j = await res.json(); if (j && j.error) errText = `${res.status} - ${j.error}`; else errText = `${res.status} - ${JSON.stringify(j)}` } catch (e) { errText = `${res.status} - ${res.statusText}` }
      alert(errText);
      return;
    }

    // ocultar modal y recargar datos para reflejar los promedios nuevos
    hideRatingForm();
    load();
  });
}

function hideRatingForm() {
  const m = document.getElementById('rating-modal');
  if (m) m.remove();
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
    const err = await res.json().catch(() => null);
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
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Utilidad: formatea una fecha ISO u otro valor como fecha legible localmente
function formatDate(d) {
  if (!d) return '';
  try { const dt = new Date(d); return dt.toLocaleString(); } catch (e) { return d; }
}

// Calcula el "terrorímetro" de una película a partir de cuatro métricas
// Recibe un objeto movie y devuelve un número entre 0 y 5 (puede tener un decimal)
function computeTerrorimeter(movie) {
  // Obtener las 4 métricas, garantizando valores numéricos y rango 0-5
  const g = Number.isFinite(movie.gore) ? Math.min(5, Math.max(0, movie.gore)) : 0;
  const s = Number.isFinite(movie.scares) ? Math.min(5, Math.max(0, movie.scares)) : 0; // miedo
  const j = Number.isFinite(movie.jumpscares) ? Math.min(5, Math.max(0, movie.jumpscares)) : 0;
  const sp = Number.isFinite(movie.suspense) ? Math.min(5, Math.max(0, movie.suspense)) : 0;

  // Promedio simple (peso igual). Se puede ajustar con ponderaciones diferentes.
  const avg = (g + s + j + sp) / 4;
  // Redondear a un decimal para mostrar (por ejemplo 4.2)
  return Math.round(avg * 10) / 10;
}

// Llamada inicial para cargar la página cuando se carga el script
load();
