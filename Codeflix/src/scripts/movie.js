// Función asíncrona que realiza una petición fetch a la URL dada y devuelve el JSON recibido
async function fetchJSON(url) {
  // usamos fetch para obtener la respuesta
  const r = await fetch(url); // Realiza la petición
  // parseamos la respuesta como JSON y la devolvemos
  return r.json(); // Devuelve JSON parseado
}

// Objeto que representa los parámetros de consulta (?id=...) de la URL
const params = new URLSearchParams(location.search); // Parsea query string
// Extrae el valor del parámetro "id" (identificador de la película a mostrar)
const id = params.get("id"); // id de la película

// Función principal que carga los datos de la película y renderiza la página
async function load() {
  // Solicita al servidor los datos de la película usando el id obtenido
  const movie = await fetchJSON(`/api/movies/${id}`); // Solicita detalle de la película
  // Si no existe la película, mostramos un mensaje y salimos
  if (!movie) {
    document.getElementById("movie-container").innerHTML = "<p>Película no encontrada</p>"; // Mensaje 404
    return;
  }
  // Construye el HTML de detalle de la película (poster, información, video y comentarios)
  // A continuación mostramos también los niveles de "gore" y "miedo" (scares) si existen
  // - `movie.gore` representa un nivel de violencia/grado de gore (por ejemplo 0-5)
  // - `movie.scares` representa el nivel de sustos/miedo (por ejemplo 0-5)
  // Ambos valores se renderizan dentro del template HTML más abajo.
  // IMPORTANTE: la plantilla HTML está dentro de un template literal y no se comentan sus líneas internas
  // calcular terrorímetro antes de renderizar la plantilla
  const terrorValue = computeTerrorimeter(movie); // Calcula puntuación combinada
  const terrorPercent = Math.round((terrorValue / 5) * 100); // Convierte a porcentaje para la barra

  // NOTA: el siguiente bloque usa un template literal multilínea para generar el HTML; por seguridad no se insertan comentarios dentro del literal
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
          <!-- Botón para mostrar trailer (posicionado más arriba, junto a las métricas) -->
          <div style="text-align:left;margin-top:18px;"><button id="show-trailer" class="simulate-btn trailer-btn">Ver trailer</button></div>
        </div>
      </div>

      <div class="player">
        <h3>Película</h3>
        <!-- Reproductor principal solicitado: muestra el archivo codeflix.mp4 desde public/videos/trailers -->
        <video id="movie-video" controls width="720">
          <source src="/videos/trailers/codeflix.mp4" type="video/mp4">
          Tu navegador no soporta el elemento video.
        </video>
        <!-- Botón para abrir el formulario de valoración -->
        <div style="text-align:center;margin-top:8px;"><button id="simulate-end" class="simulate-btn">Calificar película</button></div>
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
  `; // Fin del template literal

  // Agrega un listener al botón "Enviar" para procesar el nuevo comentario
  document.getElementById("send").addEventListener("click", addComment);

  // Botón para mostrar el trailer bajo demanda en un modal emergente
  const showTrailerBtn = document.getElementById('show-trailer');
  if (showTrailerBtn) {
    showTrailerBtn.addEventListener('click', () => {
      if (showTrailerBtn.dataset.clicked) return; // evitar múltiples aperturas
      showTrailerBtn.dataset.clicked = '1';
      // Crear overlay/modal
      const overlay = document.createElement('div');
      overlay.id = 'trailer-modal';
      overlay.className = 'trailer-overlay';
      overlay.innerHTML = `
        <div class="trailer-box">
          <button id="trailer-close" class="trailer-close">✕</button>
          <div id="trailer-content" class="trailer-content">Cargando trailer…</div>
          <div style="text-align:center;margin-top:12px;"><button id="trailer-close-bottom" class="trailer-close-bottom">Cerrar</button></div>
        </div>
      `;
      document.body.appendChild(overlay);

      const content = document.getElementById('trailer-content');
      // Preparar listener de teclado para Escape
      let keyHandler = (e) => { if (e.key === 'Escape') closeModal(); };

      // Función para cerrar modal
      function closeModal() {
        const m = document.getElementById('trailer-modal');
        if (m) {
          // pausar cualquier video que esté reproduciéndose
          const v = m.querySelector('video');
          if (v && !v.paused) {
            try { v.pause(); v.currentTime = 0; } catch (err) {}
          }
          m.remove();
        }
        showTrailerBtn.style.display = ''; // permitir volver a abrir si se desea
        delete showTrailerBtn.dataset.clicked;
        document.removeEventListener('keydown', keyHandler);
      }

      // Agregar listener para el botón de cerrar (superior) y el botón inferior
      document.getElementById('trailer-close').addEventListener('click', closeModal);
      const bottomClose = document.getElementById('trailer-close-bottom');
      if (bottomClose) bottomClose.addEventListener('click', closeModal);
      // Añadir listener para cerrar con Escape
      document.addEventListener('keydown', keyHandler);

      // Renderizar trailer según tipo
      if (movie.trailer && movie.trailer.type === 'youtube') {
        const iframe = document.createElement('iframe');
        iframe.width = '920';
        iframe.height = '518';
        iframe.src = movie.trailer.url;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        content.innerHTML = '';
        content.appendChild(iframe);
      } else if (movie.trailer && movie.trailer.type === 'local') {
        const v = document.createElement('video');
        v.id = 'trailer-video';
        v.controls = true;
        v.width = 920;
        const s = document.createElement('source');
        s.src = movie.trailer.url;
        s.type = 'video/mp4';
        v.appendChild(s);
        content.innerHTML = '';
        content.appendChild(v);
        v.addEventListener('ended', () => { closeModal(); showRatingForm(movie); });
      } else if (movie.video) {
        const v = document.createElement('video');
        v.id = 'trailer-video';
        v.controls = true;
        v.width = 920;
        v.src = movie.video;
        content.innerHTML = '';
        content.appendChild(v);
        v.addEventListener('ended', () => { closeModal(); showRatingForm(movie); });
      } else {
        content.innerHTML = '<p>Trailer no disponible</p>';
      }

      // Cerrar modal al pulsar fuera de la caja
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    });
  }

  // Si existe un elemento video, añadimos evento 'ended' para mostrar el formulario al terminar
  const vid = document.getElementById('movie-video');
  if (vid) {
    vid.addEventListener('ended', () => {
      showRatingForm(movie); // Muestra formulario de valoración al terminar
    });
  }

  // Botón para simular el fin de la película/trailer (útil para iframes o pruebas)
  const sim = document.getElementById('simulate-end');
  if (sim) sim.addEventListener('click', () => showRatingForm(movie));
}

// Mostrar modal con formulario para puntuar las 4 métricas usando un selector tipo "estrellas"
function showRatingForm(movie) {
  // evitar múltiples modales
  if (document.getElementById('rating-modal')) return; // Si ya existe modal, salir

  const modal = document.createElement('div'); // Crea elemento modal
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
    `; // Template para modal de valoración
  document.body.appendChild(modal); // Añade modal al DOM

  // Inicializar cada control de estrellas
  function buildStars(containerId, currentValue) {
    const cont = document.getElementById(containerId);
    cont.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('span');
      s.className = 'star'; // Clase para estilos
      s.dataset.value = String(i); // Valor de la estrella
      s.tabIndex = 0; // Permite foco
      s.innerText = '★'; // Símbolo de estrella
      if (i <= Math.round(currentValue || 0)) s.classList.add('selected'); // Marca estrellas seleccionadas
      // click
      s.addEventListener('click', () => setStars(cont, i)); // Click selecciona estrellas
      s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStars(cont, i); } }); // Soporta teclado
      cont.appendChild(s); // Añade la estrella al contenedor
    }
  }

  function setStars(container, value) {
    const stars = container.querySelectorAll('.star'); // Obtiene todas las estrellas
    stars.forEach(s => {
      const v = Number(s.dataset.value);
      if (v <= value) s.classList.add('selected'); else s.classList.remove('selected'); // Marca/desmarca según el valor
    });
  }

  // Crear controles y fijar valores iniciales basados en movie
  buildStars('r-gore', movie.gore);
  buildStars('r-scares', movie.scares);
  buildStars('r-jumps', movie.jumpscares);
  buildStars('r-susp', movie.suspense);

  document.getElementById('rating-cancel').addEventListener('click', hideRatingForm); // Cancelar cierra modal
  document.getElementById('rating-send').addEventListener('click', async () => {
    // leer selección de estrellas (valor 1-5) o 0 si no hay selección
    // Método más robusto: contamos las estrellas con la clase `selected`
    // y devolvemos el valor máximo entre ellas (debe coincidir con la selección)
    const read = (id) => {
      const selected = Array.from(document.querySelectorAll(`#${id} .star.selected`)); // Obtiene estrellas seleccionadas
      if (!selected.length) return 0; // Si no hay selección
      const vals = selected.map(s => Number(s.dataset.value)).filter(v => Number.isFinite(v));
      return vals.length ? Math.max(...vals) : 0; // Devuelve el mayor valor seleccionado
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
      alert(errText); // Muestra error si la petición falla
      return;
    }

    // ocultar modal y recargar datos para reflejar los promedios nuevos
    hideRatingForm(); // Cierra modal
    load(); // Recarga datos de la página
  });
}

function hideRatingForm() {
  const m = document.getElementById('rating-modal'); // Busca elemento modal
  if (m) m.remove(); // Lo elimina si existe
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
  document.getElementById("user").value = ""; // Limpia campo user
  document.getElementById("text").value = ""; // Limpia textarea
  // Recargar el detalle para mostrar el nuevo comentario (vuelve a llamar a load)
  load(); // Recarga la página de detalle
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
  if (!d) return ''; // Si dato vacío, devuelve cadena vacía
  try { const dt = new Date(d); return dt.toLocaleString(); } catch (e) { return d; } // Intenta formatear
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
