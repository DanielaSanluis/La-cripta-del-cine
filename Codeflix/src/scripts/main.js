// ================================
// main.js - reorganizado y corregido
// ================================

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
// VARIABLES GLOBALES
// ================================
let allMovies = [];
const PAGE_SIZE = 14;

// ================================
// CARRUSELES - BOTONES DE SCROLL
// ================================
function setupCarouselButtonsSingle(wrapperEl) {
  if (!wrapperEl) return;

  // Encontrar botones y el track dentro de este wrapper
  const btnLeft = wrapperEl.querySelector('.arrow.left');
  const btnRight = wrapperEl.querySelector('.arrow.right');
  const track = wrapperEl.querySelector('.carousel-container, .carousel-track');

  if (!track) return;

  // función de scroll reusable
  const doScroll = (dir) => {
    const amount = Math.round(track.clientWidth * 0.8) || 300;
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (dir === 'left') {
      if (track.scrollLeft <= 0) track.scrollTo({ left: maxScroll, behavior: 'instant' });
      else track.scrollBy({ left: -amount, behavior: 'smooth' });
    } else {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 5) track.scrollTo({ left: 0, behavior: 'instant' });
      else track.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Reemplazamos onclick (evita handlers duplicados)
  if (btnLeft) {
    btnLeft.onclick = (ev) => {
      ev.stopPropagation();
      doScroll('left');
    };
  }

  if (btnRight) {
    btnRight.onclick = (ev) => {
      ev.stopPropagation();
      doScroll('right');
    };
  }

  // También soportamos teclado (flechas izquierda/derecha cuando el track está enfocado)
  track.onkeydown = (ev) => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); doScroll('left'); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); doScroll('right'); }
  };

  // Optional: allow dragging on desktop/touch swipes on mobile (lightweight)
  let isDown = false, startX = 0, scrollLeftStart = 0;
  track.addEventListener('mousedown', (e) => {
    isDown = true;
    track.classList.add('dragging');
    startX = e.pageX - track.offsetLeft;
    scrollLeftStart = track.scrollLeft;
  });
  window.addEventListener('mouseup', () => {
    if (isDown) { isDown = false; track.classList.remove('dragging'); }
  });
  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1; // scroll-fast multiplier
    track.scrollLeft = scrollLeftStart - walk;
  });

  // Simple touch swipe
  let touchStartX = 0, touchStartScroll = 0;
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].pageX;
    touchStartScroll = track.scrollLeft;
  }, { passive: true });
  track.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX;
    const dx = x - touchStartX;
    track.scrollLeft = touchStartScroll - dx;
  }, { passive: true });
}
// ================================
// RENDER CARRUSELES 
// ================================
function renderCarousel(title, ids, containerId, key) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const wrapper = container.parentElement; 
  wrapper.innerHTML = "";

  if (!key) {
    key = containerId.replace("carousel-", "");
  }

  const movies = ids.map(id => allMovies.find(m => m.id === id)).filter(Boolean);

  // Botón izquierdo
  const btnLeft = document.createElement("button");
  btnLeft.className = "arrow left";
  btnLeft.innerHTML = "❮";

  // Botón derecho
  const btnRight = document.createElement("button");
  btnRight.className = "arrow right";
  btnRight.innerHTML = "❯";

  // Track
  const track = document.createElement("div");
  track.className = "carousel-container carousel-track";

  const list = document.createElement("div");
  list.className = "carousel";
  list.innerHTML = movies.map(m => `
    <div class="card" onclick="openMovie(${m.id})">
      <img src="${escapeHtml(m.poster)}" alt="${escapeHtml(m.title)}">
      <p class="card-title">${escapeHtml(m.title)}</p>
    </div>
  `).join("");

  track.appendChild(list);

  wrapper.appendChild(btnLeft);
  wrapper.appendChild(track);
  wrapper.appendChild(btnRight);

  setupCarouselButtonsSingle(wrapper);
}

function renderSearchCarousel(filtered) {
  const main = document.querySelector('main');
  if (!main) return;

  document.getElementById('search-results-section')?.remove();

  const sec = document.createElement('section');
  sec.id = 'search-results-section';
  sec.innerHTML = `<h2>Resultados (${filtered.length})</h2>`;

  const wrapper = document.createElement('div');
  wrapper.className = 'carousel-wrapper';

  const btnLeft = document.createElement('button');
  btnLeft.className = 'arrow left'; btnLeft.textContent = '❮';
  const btnRight = document.createElement('button');
  btnRight.className = 'arrow right'; btnRight.textContent = '❯';

  const track = document.createElement('div');
  track.className = 'carousel-container carousel-track';
  track.tabIndex = 0;

  const list = document.createElement('div');
  list.className = 'carousel';
  list.innerHTML = filtered.map(m => `
    <div class="card" onclick="openMovie(${m.id})">
      <img src="${escapeHtml(m.poster)}" alt="${escapeHtml(m.title)}">
      <p class="card-title">${escapeHtml(m.title)}</p>
    </div>
  `).join('');

  track.appendChild(list);
  wrapper.appendChild(btnLeft);
  wrapper.appendChild(track);
  wrapper.appendChild(btnRight);
  sec.appendChild(wrapper);
  main.insertBefore(sec, document.getElementById('all-movies'));

  setupCarouselButtonsSingle(wrapper);
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

  tagsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const label = cb.closest('label');
      if (cb.checked) label.classList.add('selected');
      else label.classList.remove('selected');

      applyFilters();
    });
  });
  
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

    const allMoviesGrid = document.getElementById('all-movies');
    const allMoviesTitle = allMoviesGrid?.previousElementSibling?.tagName === 'H2' ? allMoviesGrid.previousElementSibling : null;

    // --- SIN RESULTADOS ---
    // --- SIN RESULTADOS ---
if (filtered.length === 0) {
  if (allMoviesGrid) allMoviesGrid.style.display = 'none';
  if (allMoviesTitle) allMoviesTitle.style.display = 'none';

  const main = document.querySelector('main');

  // Contenedor principal de sugerencias
  let suggestionWrapper = document.getElementById('suggested-carousel-wrapper');
  if (!suggestionWrapper) {
    suggestionWrapper = document.createElement('div');
    suggestionWrapper.id = 'suggested-carousel-wrapper';
    suggestionWrapper.style.display = 'flex';
    suggestionWrapper.style.flexDirection = 'column';
    suggestionWrapper.style.alignItems = 'center';
    suggestionWrapper.style.margin = '2rem auto';
    main.insertBefore(suggestionWrapper, allMoviesGrid);
  } else {
    suggestionWrapper.innerHTML = '';
    suggestionWrapper.style.display = 'flex';
  }

  // --- Mensaje ---
  const msg = document.createElement('div');
  msg.id = 'no-results-message';
  msg.style.color = '#ff4b4b';
  msg.style.fontSize = '1.5rem';
  msg.style.margin = '0 0 1.5rem 0';
  msg.style.textAlign = 'center';
  msg.innerHTML = `No encontramos nada 😢, pero mira algo de <strong>Terror Coreano</strong> mientras tanto:`;
  suggestionWrapper.appendChild(msg);

  // --- Contenedor independiente para el carrusel ---
  const carouselWrapper = document.createElement('div');
  carouselWrapper.id = 'carousel-koreanHorror-wrapper';
  carouselWrapper.className = 'carousel-wrapper';
  suggestionWrapper.appendChild(carouselWrapper);

  // Crear un div “limpio” para renderCarousel
  const carouselContainer = document.createElement('div');
  carouselContainer.id = 'carousel-koreanHorror';
  carouselWrapper.appendChild(carouselContainer);

  // Renderizar carrusel dentro de este contenedor limpio
  renderCarousel(
    'Terror Coreano',
    (window.G_carousels?.koreanHorror) || [],
    'carousel-koreanHorror'
  );

  // Activar flechas
  setupCarouselButtonsSingle(carouselWrapper);
}



    // quitar mensaje si existe
    const msg = document.getElementById('no-results-message');
    if (msg) msg.remove();

    // --- HAY RESULTADOS ---
    if (filtersActive) {
      if (countEl) countEl.innerText = String(filtered.length);

      // ocultar grid principal
      if (allMoviesGrid) allMoviesGrid.style.display = 'none';
      if (allMoviesTitle) allMoviesTitle.style.display = 'none';

      // ocultar carruseles originales (excepto sugerido)
      document.querySelectorAll('.carousel-wrapper').forEach(el => {
        if (!el.closest('#suggested-carousel-wrapper')) el.style.display = 'none';
        const prev = el.previousElementSibling;
        if (prev && prev.tagName === 'H2') prev.style.display = 'none';
      });

      // renderizar carrusel de búsqueda
      renderSearchCarousel(filtered);
      const searchWrapper = document.getElementById('search-results-section')?.querySelector('.carousel-wrapper');
      if (searchWrapper) setupCarouselButtonsSingle(searchWrapper);

    } else {
      // Restaurar grid principal y títulos
      if (allMoviesGrid) allMoviesGrid.style.display = '';
      if (allMoviesTitle) allMoviesTitle.style.display = '';

      if (countEl) countEl.innerText = String(allMovies.length);
      renderAllMovies._overrideList = null;
      const old = document.getElementById('search-results-section'); 
      if (old) old.remove();

      // re-renderizar carruseles originales
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
        renderCarousel(titleMap[key], ids, containerId, key);
      });

      renderAllMovies(1);
    }

  } catch (err) {
    console.error('applyFilters error', err);
  }
}


// Limpiar filtros y restaurar estado inicial
function clearFilters() {
  if (document.getElementById('search')) document.getElementById('search').value = '';
  ['filter-gore','filter-scares','filter-jumps','filter-suspense'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '0';
  });
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
  const rc = document.getElementById('results-count');
  if (rc) rc.innerText = String(allMovies.length);
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
    renderCarousel(titleMap[key], ids, containerId, key);
  });

  // NOTA: setupCarouselButtons ya fue ejecutado por cada renderCarousel
}

// ================================
// INICIALIZACIÓN
// ================================
async function init() {
  // Animación inicial
  if (typeof window.openCryptDoor === 'function') window.openCryptDoor();

  // Cargar datos
  allMovies = await fetchJSON("/api/movies");
  const carousels = await fetchJSON("/api/carousels");
  window.G_carousels = carousels || {};

  // Renderizar carruseles iniciales (solo los containers que existan)
  Object.entries(window.G_carousels).forEach(([key, ids]) => {
    const containerId = `carousel-${key}`;
    const titleMap = {
      recommended: '',
      favoritesJapan: 'Favoritas de Japón',
      favoritesSpain: 'Favoritas de España',
      favoritesUSA: 'Favoritas de USA',
      koreanHorror: 'Terror Coreano',
      frenchExtreme: 'Cine Extremo Francés'
    };
    renderCarousel(titleMap[key], ids, containerId, key);
  });

  // Inicializar filtros y listeners
  renderTagsFilter();
  document.getElementById("search")?.addEventListener("input", applyFilters);
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
  // NOTA: no llamamos setupCarouselButtons() aquí — ya se ejecuta desde cada renderCarousel/renderSearchCarousel
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
      <img src="${escapeHtml(m.poster)}" alt="${escapeHtml(m.title)}" />
      <p class="movie-small-title">${escapeHtml(m.title)}</p>
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
// FUNCIONES AUXILIARES
// ================================
function openMovie(id) {
  window.location.href = `movie.html?id=${id}`;
}

// ================================
// FORMULARIO DE CONTACTO
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("contactMessage");
  if (!form || !msg) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const name = (data.get("name") || "").trim();
    const email = (data.get("email") || "").trim();
    const message = (data.get("message") || "").trim();

    const emailRegex = /^[^\s@]+@(gmail\.(com|mx|es|com\.mx)|hotmail\.(com|es)|outlook\.(com|es|com\.mx)|ciencias\.unam\.mx)$/i;

    if (!name || name.length < 2) {
      msg.textContent = "Nombre inválido. Introduce un nombre válido.";
      return;
    }

    if (!emailRegex.test(email)) {
      msg.textContent = "Por favor ingresa un correo electrónico válido.";
      return;
    }

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

// Exponer función global para onclick inline
window.openMovie = openMovie;

// Inicializar la app
init();


