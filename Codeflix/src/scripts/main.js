// ================================
// UTILIDADES
// ================================

// Fetch JSON desde un endpoint
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

// Escapar texto para HTML (previene inyección)
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ================================
// FILTROS Y TAGS
// ================================

// Construir lista única de tags y renderizar checkboxes
function renderTagsFilter() {
  const tagsEl = document.getElementById('tags-list');
  if (!tagsEl) return;

  const tags = new Set();
  allMovies.forEach(m => (m.tags || []).forEach(t => { if (t) tags.add(String(t).trim()); }));
  const arr = Array.from(tags).sort((a, b) => a.localeCompare(b));

  if (!arr.length) { 
    tagsEl.innerHTML = '<em>No hay tags</em>'; 
    return; 
  }

  tagsEl.innerHTML = arr.map(t => `
    <label class="tag-checkbox">
      <input type="checkbox" value="${escapeHtml(t)}" data-tag /> ${escapeHtml(t)}
    </label>
  `).join('');

  tagsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', applyFilters));
}

// Aplicar filtros de búsqueda, métricas y tags
function applyFilters(e) {
  try {
    const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
    const goreMin = Number(document.getElementById('filter-gore')?.value || 0);
    const scaresMin = Number(document.getElementById('filter-scares')?.value || 0);
    const jumpsMin = Number(document.getElementById('filter-jumps')?.value || 0);
    const suspMin = Number(document.getElementById('filter-suspense')?.value || 0);
    const selectedTags = Array.from(document.querySelectorAll('#tags-list input[type=checkbox]:checked')).map(i => i.value);

    // Filtrar películas según criterios
    const filtered = allMovies.filter(m => {
      const textMatch = !q || (m.title && m.title.toLowerCase().includes(q)) || (m.synopsis && m.synopsis.toLowerCase().includes(q));
      const goreOk = (typeof m.gore === 'number' ? m.gore : 0) >= goreMin;
      const scaresOk = (typeof m.scares === 'number' ? m.scares : 0) >= scaresMin;
      const jumpsOk = (typeof m.jumpscares === 'number' ? m.jumpscares : 0) >= jumpsMin;
      const suspOk = (typeof m.suspense === 'number' ? m.suspense : (typeof m.scares === 'number' ? m.scares : 0)) >= suspMin;
      const tagsOk = !selectedTags.length || (m.tags || []).some(t => selectedTags.includes(String(t)));
      return textMatch && goreOk && scaresOk && jumpsOk && suspOk && tagsOk;
    });

    const countEl = document.getElementById('results-count');
    const filtersActive = Boolean(q) || goreMin > 0 || scaresMin > 0 || jumpsMin > 0 || suspMin > 0 || selectedTags.length > 0;

    // --- SIN RESULTADOS ---
    if (filtersActive && filtered.length === 0) {
      if (countEl) countEl.innerText = '0';

      // Ocultar todos los carruseles originales
      document.querySelectorAll('.carousel-wrapper').forEach(el => el.style.display = 'none');

      // Mostrar mensaje de no resultados
      const main = document.querySelector('main');
      let msg = document.getElementById('no-results-message');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'no-results-message';
        msg.style.color = '#ff4b4b';
        msg.style.fontSize = '1.5rem';
        msg.style.margin = '3rem 0 1.5rem 0';
        msg.style.textAlign = 'center';
        main.insertBefore(msg, document.getElementById('all-movies'));
      }
      msg.innerHTML = `No encontramos nada 😢, pero mira algo de <strong>Terror Coreano</strong> mientras tanto:`;

      // Renderizar lista completa de películas
      renderAllMovies._overrideList = null; // usar toda la lista
      renderAllMovies(1);

      // Renderizar carrusel sugerido "Terror Coreano" **debajo del mensaje**
      let suggestionWrapper = document.getElementById('suggested-carousel-wrapper');
      if (!suggestionWrapper) {
        suggestionWrapper = document.createElement('div');
        suggestionWrapper.id = 'suggested-carousel-wrapper';
        suggestionWrapper.style.margin = '2rem auto';
        main.insertBefore(suggestionWrapper, document.getElementById('all-movies'));
      }

      // Renderizar carrusel dentro del wrapper
      renderCarousel("Terror Coreano", (window.G_carousels?.koreanHorror) || [], "suggested-carousel-wrapper");
      suggestionWrapper.style.display = 'flex';

      return; // Salimos de applyFilters
    }

    // quitar mensaje si existe
    const msg = document.getElementById('no-results-message');
    if (msg) msg.remove();

    // --- HAY RESULTADOS ---
    if (filtersActive) {
      if (countEl) countEl.innerText = String(filtered.length);
      renderAllMovies._overrideList = filtered;
      renderAllMovies(1);
      renderSearchCarousel(filtered);

      // ocultar carruseles originales
      document.querySelectorAll('.carousel-wrapper').forEach(el => {
        el.style.display = 'none';
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'H2') prev.style.display = 'none';
      });

    } else {
      // restaurar carruseles y títulos
      document.querySelectorAll('.carousel-wrapper').forEach(el => {
        el.style.display = 'flex';
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'H2') prev.style.display = '';
      });

      if (countEl) countEl.innerText = String(allMovies.length);
      renderAllMovies._overrideList = null;
      const old = document.getElementById('search-results-section'); if (old) old.remove();

      // re-renderizar carruseles originales
      renderCarousel("", (window.G_carousels && window.G_carousels.recommended) || [], "carousel-recommended");
      renderCarousel("Favoritas de Japón", (window.G_carousels && window.G_carousels.favoritesJapan) || [], "carousel-favoritesJapan");
      renderCarousel("Favoritas de España", (window.G_carousels && window.G_carousels.favoritesSpain) || [], "carousel-favoritesSpain");
      renderCarousel("Favoritas de USA", (window.G_carousels && window.G_carousels.favoritesUSA) || [], "carousel-favoritesUSA");
      renderCarousel("Terror Coreano", (window.G_carousels && window.G_carousels.koreanHorror) || [], "carousel-koreanHorror");
      renderCarousel("Cine Extremo Francés", (window.G_carousels && window.G_carousels.frenchExtreme) || [], "carousel-frenchExtreme");
      renderAllMovies(1);
      setupCarouselButtons();
    }

  } catch (err) {
    console.error('applyFilters error', err);
  }
}


// Limpiar filtros y restaurar estado inicial
function clearFilters() {
  document.getElementById('search').value = '';
  ['filter-gore','filter-scares','filter-jumps','filter-suspense'].forEach(id => document.getElementById(id).value = '0');
  document.querySelectorAll('#tags-list input[type=checkbox]').forEach(cb => cb.checked = false);

  // Cerrar tags desplegable
  document.getElementById('tags-container')?.classList.add('hidden');
  document.getElementById('tags-toggle')?.classList.remove('open');

  // Restaurar carruseles y lista completa
  document.querySelectorAll('.carousel-wrapper').forEach(el => el.style.display = 'flex');
  document.querySelectorAll('h2').forEach(h => { 
    if (h.parentElement?.querySelector('.carousel-wrapper')) h.style.display = ''; 
  });

  renderAllMovies._overrideList = null;
  document.getElementById('results-count').innerText = String(allMovies.length);
  renderAllMovies(1);

  Object.entries(window.G_carousels || {}).forEach(([key, ids]) => {
    const containerId = `carousel-${key}`;
    const titleMap = {
      recommended: '',
      favoritesJapan: 'Favoritas de Japón',
      favoritesSpain: 'Favoritas de España',
      favoritesUSA: 'Favoritas de USA',
      koreanHorror: 'Terror Coreano',
      frenchExtreme: 'Cine Extremo Francés'
    };
    renderCarousel(titleMap[key], ids, containerId);
  });

  setupCarouselButtons();
}

// ================================
// VARIABLES GLOBALES
// ================================
let allMovies = [];
const PAGE_SIZE = 14;

// ================================
// INICIALIZACIÓN
// ================================
async function init() {
  // Animación inicial
  if (typeof window.openCryptDoor === 'function') window.openCryptDoor();

  // Cargar datos
  allMovies = await fetchJSON("/api/movies");
  const carousels = await fetchJSON("/api/carousels");
  window.G_carousels = carousels;

  // Renderizar carruseles iniciales
  Object.entries(carousels).forEach(([key, ids]) => {
    const containerId = `carousel-${key}`;
    const titleMap = {
      recommended: '',
      favoritesJapan: 'Favoritas de Japón',
      favoritesSpain: 'Favoritas de España',
      favoritesUSA: 'Favoritas de USA',
      koreanHorror: 'Terror Coreano',
      frenchExtreme: 'Cine Extremo Francés'
    };
    renderCarousel(titleMap[key], ids, containerId);
  });

  // Inicializar filtros y listeners
  renderTagsFilter();
  document.getElementById("search").addEventListener("input", applyFilters);
  ['filter-gore','filter-scares','filter-jumps','filter-suspense'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });

  // Toggle tags
  const tagsToggle = document.getElementById('tags-toggle');
  const tagsContainer = document.getElementById('tags-container');
  if (tagsToggle && tagsContainer) {
    tagsToggle.addEventListener('click', () => {
      tagsContainer.classList.toggle('hidden');
      tagsToggle.classList.toggle('open');
      tagsContainer.querySelector('input[type=checkbox]')?.focus();
    });
  }

  // Botón limpiar filtros
  document.getElementById('clear-filters')?.addEventListener('click', clearFilters);

  renderAllMovies(1);
  setupCarouselButtons();
}

// ================================
// LISTA DE PELÍCULAS (PAGINADA)
// ================================
function renderAllMovies(page = 1) {
  const grid = document.getElementById('movies-grid');
  const pagination = document.getElementById('movies-pagination');
  if (!grid || !pagination) return;

  const list = Array.isArray(renderAllMovies._overrideList) ? renderAllMovies._overrideList : allMovies;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  const start = (current - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  grid.innerHTML = pageItems.map(m => `
    <div class="movie-small" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="movie-small-title">${m.title}</p>
    </div>
  `).join('');

  // Paginación
  let pagesHtml = `<button class="page-btn" data-page="${current - 1}" ${current===1?'disabled':''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `<button class="page-btn ${p===current?'active':''}" data-page="${p}">${p}</button>`;
  }
  pagesHtml += `<button class="page-btn" data-page="${current + 1}" ${current===totalPages?'disabled':''}>›</button>`;
  pagination.innerHTML = pagesHtml;

  pagination.querySelectorAll('.page-btn').forEach(b => {
    b.addEventListener('click', () => {
      const p = Number(b.dataset.page);
      if (p >= 1 && p <= totalPages) renderAllMovies(p);
    });
  });

  if (typeof window.actualizarVisibilidadCarruseles === 'function') {
    window.actualizarVisibilidadCarruseles(current);
  }

  if (typeof window.scrollToTop === 'function') window.scrollToTop(current);
}

// ================================
// CARRUSELES
// ================================
function renderCarousel(title, ids, containerId) {
  const container = document.getElementById(containerId);
  const movies = ids.map(id => allMovies.find(m => m.id === id)).filter(Boolean);
  container.innerHTML = `<div class="carousel">${movies.map(m => `
    <div class="card" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="card-title">${m.title}</p>
    </div>`).join("")}</div>`;
}

// Botones de scroll del carrusel
function setupCarouselButtons() {
  document.querySelectorAll('.arrow').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.carousel; 
      const container = document.getElementById(`carousel-${key}`);
      if (!container) return;

      const amount = Math.round(container.clientWidth * 0.8) || 300;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (btn.classList.contains('left')) {
        if (container.scrollLeft <= 0) container.scrollTo({ left: maxScroll, behavior: 'instant' });
        else container.scrollBy({ left: -amount, behavior: 'smooth' });
      } else {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 5) container.scrollTo({ left: 0, behavior: 'instant' });
        else container.scrollBy({ left: amount, behavior: 'smooth' });
      }
    };
  });
}

// Carrusel de resultados de búsqueda
function renderSearchCarousel(filtered) {
  const main = document.querySelector('main');
  const old = document.getElementById('search-results-section');
  if (old) old.remove();

  const sec = document.createElement('section');
  sec.id = 'search-results-section';
  sec.innerHTML = `
    <h2>Resultados (${filtered.length})</h2>
    <div class="carousel-wrapper">
      <button class="arrow left" data-carousel="search">❮</button>
      <div class="carousel-container" id="carousel-search">
        <div class="carousel">
          ${filtered.map(m => `
            <div class="card" onclick="openMovie(${m.id})">
              <img src="${m.poster}" alt="${escapeHtml(m.title)}" />
              <p class="card-title">${escapeHtml(m.title)}</p>
            </div>`).join('')}
        </div>
      </div>
      <button class="arrow right" data-carousel="search">❯</button>
    </div>
  `;

  main.insertBefore(sec, document.getElementById('all-movies'));
  setupCarouselButtons();
}

// ================================
// FUNCIONES AUXILIARES
// ================================
function openMovie(id) {
  window.location.href = `movie.html?id=${id}`;
}

// ================================
// FORMULARIO DE CONTACTO
// ================================
// Espera a que todo el DOM esté cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", () => {
  // Obtiene el formulario y el contenedor donde se mostrarán los mensajes al usuario
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("contactMessage");
  // Si el formulario o el mensaje no existen, el script no hace nada
  if (!form || !msg) return;

    // Agrega un listener al evento "submit" del formulario
    form.addEventListener("submit", async (e) => {
    e.preventDefault();// Evita que la página se recargue al enviar el formulario

    // Obtiene todos los datos del formulario
    const data = new FormData(form);
    const name = (data.get("name") || "").trim();
    const email = (data.get("email") || "").trim();
    const message = (data.get("message") || "").trim(); // no se valida

    /**
     * Expresión regular para validar correos electrónicos permitidos.
     * Acepta dominios específicos como:
     * - Gmail (com, mx, es, com.mx)
     * - Hotmail (com, es)
     * - Outlook (com, es, com.mx)
     * - ciencias.unam.mx
     */
    const emailRegex = /^[^\s@]+@(gmail\.(com|mx|es|com\.mx)|hotmail\.(com|es)|outlook\.(com|es|com\.mx)|ciencias\.unam\.mx)$/i;

    // Verifica que el nombre no esté vacío y tenga al menos 2 caracteres
    if (!name || name.length < 2) {
    msg.textContent = "Nombre inválido. Introduce un nombre válido.";
    return;
    }

     // Verifica que el correo cumpla con el patrón de la regex
    if (!emailRegex.test(email)) {
      msg.textContent = "Por favor ingresa un correo electrónico válido.";
      return;
    }

    try {
      // Realiza una petición POST a la ruta "/api/contact"
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

       // Si el servidor responde con error, lanza excepción
      if (!r.ok) throw new Error("No se pudo enviar");

      msg.textContent = "¡Gracias! Tu mensaje ha sido guardado.";
      form.reset();
    } catch (err) {
      // Si ocurre un error en la petición fetch, se captura aquí
      console.error(err);
      msg.textContent = "Ups, hubo un error al enviar.";
    }

    // Limpia el mensaje después de 3 segundos
    setTimeout(() => (msg.textContent = ""), 3000);
  });
});

// Exponer función global para onclick inline
window.openMovie = openMovie;

// Inicializar la app
init();


