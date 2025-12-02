// src/scripts/main.js
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

// Escapar texto para HTML (pequeña utilidad)
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Construir lista única de tags y renderizar casillas
function renderTagsFilter() {
  const tagsEl = document.getElementById('tags-list');
  if (!tagsEl) return;
  const tags = new Set();
  allMovies.forEach(m => (m.tags || []).forEach(t => { if (t) tags.add(String(t).trim()); }));
  const arr = Array.from(tags).sort((a, b) => a.localeCompare(b));
  if (!arr.length) { tagsEl.innerHTML = '<em>No hay tags</em>'; return; }
  tagsEl.innerHTML = arr.map(t => `
    <label class="tag-checkbox"><input type="checkbox" value="${escapeHtml(t)}" data-tag /> ${escapeHtml(t)}</label>
  `).join('');
  tagsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', applyFilters));
}

// Función central que aplica todos los filtros (texto, métricas y tags)
function applyFilters(e) {
  try {
    const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
    const goreMin = Number(document.getElementById('filter-gore')?.value || 0);
    const scaresMin = Number(document.getElementById('filter-scares')?.value || 0);
    const jumpsMin = Number(document.getElementById('filter-jumps')?.value || 0);
    const suspMin = Number(document.getElementById('filter-suspense')?.value || 0);
    const selectedTags = Array.from(document.querySelectorAll('#tags-list input[type=checkbox]:checked')).map(i => i.value);

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

    // determinar si hay filtros activos (texto, métricas o tags)
    const filtersActive = Boolean(q) || goreMin > 0 || scaresMin > 0 || jumpsMin > 0 || suspMin > 0 || selectedTags.length > 0;

    if (filtersActive) {
      // ocultar carruseles y sus títulos para mostrar solo resultados
      document.querySelectorAll('.carousel-wrapper').forEach(el => {
        el.style.display = 'none';
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'H2') prev.style.display = 'none';
      });

      if (countEl) countEl.innerText = String(filtered.length);
      renderAllMovies._overrideList = filtered;
      renderAllMovies(1);

      // actualizar sección de resultados superior
      const main = document.querySelector('main');
      const old = document.getElementById('search-results-section'); if (old) old.remove();
      const sec = document.createElement('section');
      sec.id = 'search-results-section';
      sec.innerHTML = `<h2>Resultados (${filtered.length})</h2><div class="carousel">${filtered.map(m => `
      <div class="card" onclick="openMovie(${m.id})">
        <img src="${m.poster}" alt="${escapeHtml(m.title)}" />
        <p class="card-title">${escapeHtml(m.title)}</p>
      </div>
    `).join('')}</div>`;
      main.insertBefore(sec, document.getElementById('all-movies'));

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
  } catch (err) { console.error('applyFilters error', err); }
}

// Función que limpia todos los filtros y restaura el estado inicial
function clearFilters() {
  // limpiar input de búsqueda
  const s = document.getElementById('search'); if (s) s.value = '';
  // reset selects
  ['filter-gore', 'filter-scares', 'filter-jumps', 'filter-suspense'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '0';
  });
  // desmarcar tags
  document.querySelectorAll('#tags-list input[type=checkbox]').forEach(cb => { cb.checked = false; });
  // cerrar desplegable de tags
  const tagsContainer = document.getElementById('tags-container'); if (tagsContainer) tagsContainer.classList.add('hidden');
  const tagsToggle = document.getElementById('tags-toggle'); if (tagsToggle) tagsToggle.classList.remove('open');
  // restaurar carruseles, títulos y lista completa
  document.querySelectorAll('.carousel-wrapper').forEach(el => el.style.display = 'flex');
  document.querySelectorAll('h2').forEach(h => { /* sólo restaurar si es título de carrusel - se deja en blanco en filters-panel */ if (h.parentElement && h.parentElement.querySelector('.carousel-wrapper')) h.style.display = ''; });
  renderAllMovies._overrideList = null;
  const countEl = document.getElementById('results-count'); if (countEl) countEl.innerText = String(allMovies.length);
  renderAllMovies(1);
  // re-renderizar carruseles originales
  renderCarousel("", (window.G_carousels && window.G_carousels.recommended) || [], "carousel-recommended");
  renderCarousel("Favoritas de Japón", (window.G_carousels && window.G_carousels.favoritesJapan) || [], "carousel-favoritesJapan");
  renderCarousel("Favoritas de España", (window.G_carousels && window.G_carousels.favoritesSpain) || [], "carousel-favoritesSpain");
  renderCarousel("Favoritas de USA", (window.G_carousels && window.G_carousels.favoritesUSA) || [], "carousel-favoritesUSA");
  renderCarousel("Terror Coreano", (window.G_carousels && window.G_carousels.koreanHorror) || [], "carousel-koreanHorror");
  renderCarousel("Cine Extremo Francés", (window.G_carousels && window.G_carousels.frenchExtreme) || [], "carousel-frenchExtreme");
  setupCarouselButtons();
}


let allMovies = [];


async function init() {
  // 🔥 ARREGLO: Ejecutamos openCryptDoor al inicio para asegurar que la animación de la puerta se inicie
  if (typeof window.openCryptDoor === 'function') {
    window.openCryptDoor();
  }

  allMovies = await fetchJSON("/api/movies");
  const carousels = await fetchJSON("/api/carousels");
  // guardar carousels en variable global para poder re-renderizarlos sin volver a pedir al servidor
  window.G_carousels = carousels;

  renderCarousel("", carousels.recommended, "carousel-recommended");
  renderCarousel("Favoritas de Japón", carousels.favoritesJapan, "carousel-favoritesJapan");
  renderCarousel("Favoritas de España", carousels.favoritesSpain, "carousel-favoritesSpain");
  renderCarousel("Favoritas de USA", carousels.favoritesUSA, "carousel-favoritesUSA");
  renderCarousel("Terror Coreano", carousels.koreanHorror, "carousel-koreanHorror");
  renderCarousel("Cine Extremo Francés", carousels.frenchExtreme, "carousel-frenchExtreme");

  // Inicializar filtros y listeners
  renderTagsFilter();
  document.getElementById("search").addEventListener("input", applyFilters);
  ['filter-gore', 'filter-scares', 'filter-jumps', 'filter-suspense'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFilters);
  });

  // Listener para el toggle de tags (desplegable)
  const tagsToggle = document.getElementById('tags-toggle');
  const tagsContainer = document.getElementById('tags-container');
  if (tagsToggle && tagsContainer) {
    tagsToggle.addEventListener('click', () => {
      tagsContainer.classList.toggle('hidden');
      tagsToggle.classList.toggle('open');
      // forzar foco en primer checkbox al abrir
      if (!tagsContainer.classList.contains('hidden')) {
        const first = tagsContainer.querySelector('input[type=checkbox]');
        if (first) first.focus();
      }
    });
  }

  // Listener para limpiar filtros
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  // Después de renderizar carruseles, inicializar lista paginada y botones
  renderAllMovies(1); // página inicial
  setupCarouselButtons();
}

const PAGE_SIZE = 15; // películas por página en la lista completa

// Renderiza la lista paginada de todas las películas (solo imagen + título)
function renderAllMovies(page = 1) {
  const grid = document.getElementById('movies-grid');
  const pagination = document.getElementById('movies-pagination');
  if (!grid || !pagination) return;

  // Si existe una lista override (resultado de filtros), usarla
  const list = Array.isArray(renderAllMovies._overrideList) ? renderAllMovies._overrideList : allMovies;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  // calcular slice de películas para la página actual
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  // construir grid: tarjetas pequeñas con imagen y nombre
  grid.innerHTML = pageItems.map(m => `
    <div class="movie-small" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="movie-small-title">${m.title}</p>
    </div>
  `).join('');

  // construir paginación simple: anterior, números y siguiente
  let pagesHtml = '';
  pagesHtml += `<button class="page-btn" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `<button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }
  pagesHtml += `<button class="page-btn" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>›</button>`;
  pagination.innerHTML = pagesHtml;

  // enlazar eventos de paginación
  pagination.querySelectorAll('.page-btn').forEach(b => {
    b.addEventListener('click', () => {
      const p = Number(b.dataset.page);
      if (p >= 1 && p <= totalPages) {
        // Al hacer click, llamar a renderAllMovies(p)
        renderAllMovies(p);
      }
    });
  });

  // Lógica de control de visibilidad de carruseles (página 1 vs otras)
  if (typeof window.actualizarVisibilidadCarruseles === 'function') {
    window.actualizarVisibilidadCarruseles(current);
  }

  //ARREGLO: Pasamos la página actual a scrollToTop para que sepa dónde ir
  if (typeof window.scrollToTop === 'function') {
    window.scrollToTop(current); // <-- ¡Importante!
  }
}

function renderCarousel(title, ids, containerId) {
  const container = document.getElementById(containerId);
  const movies = ids.map(id => allMovies.find(m => m.id === id)).filter(Boolean);

  // insertar sólo la fila .carousel dentro del contenedor (el título ya está en el HTML)
  container.innerHTML = `<div class="carousel">${movies.map(m => `
    <div class="card" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="card-title">${m.title}</p>
    </div>`).join("")}</div>`;
}

function setupCarouselButtons() {
  document.querySelectorAll('.arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.carousel; // 'recommended' or 'favoritesJapan'
      const container = document.getElementById(`carousel-${key}`);
      if (!container) return;
      // el elemento que tiene overflow-x es .carousel-container (el propio container)
      const amount = Math.round(container.clientWidth * 0.8) || 300;
      if (btn.classList.contains('left')) {
        container.scrollBy({ left: -amount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: amount, behavior: 'smooth' });
      }
    });
  });
}

function openMovie(id) {
  window.location.href = `movie.html?id=${id}`;
}

// Búsqueda simple + filtros básicos: soporta "gore:3", "scares:4" o texto
// handleSearch removed - ahora usamos applyFilters que soporta métricas y tags

// --- Formulario de contacto ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("contactMessage");

  if (!form || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");

    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

      if (!r.ok) throw new Error("No se pudo enviar");

      msg.textContent = "¡Gracias! Tu mensaje ha sido guardado.";
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = "Ups, hubo un error al enviar.";
    }

    setTimeout(() => (msg.textContent = ""), 3000);
  });
});

window.openMovie = openMovie; // exponer para onclick inline
init();