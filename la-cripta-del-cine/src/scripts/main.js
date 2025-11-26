// src/scripts/main.js
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
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

  document.getElementById("search").addEventListener("input", handleSearch);


  // Después de renderizar carruseles, inicializar lista paginada y botones
  renderAllMovies(1); // página inicial
  setupCarouselButtons();

  // Listener de búsqueda
  document.getElementById("search").addEventListener("input", handleSearch);
}

const PAGE_SIZE = 15; // películas por página en la lista completa

// Renderiza la lista paginada de todas las películas (solo imagen + título)
function renderAllMovies(page = 1) {
  const grid = document.getElementById('movies-grid');
  const pagination = document.getElementById('movies-pagination');
  if (!grid || !pagination) return;

  const total = allMovies.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);

  // calcular slice de películas para la página actual
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = allMovies.slice(start, start + PAGE_SIZE);

  // construir grid: tarjetas pequeñas con imagen y nombre
  grid.innerHTML = pageItems.map(m => `
    <div class="movie-small" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="movie-small-title">${m.title}</p>
    </div>
  `).join('');

  // construir paginación simple: anterior, números y siguiente
  let pagesHtml = '';
  pagesHtml += `<button class="page-btn" data-page="${current - 1}" ${current===1? 'disabled': ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `<button class="page-btn ${p===current? 'active':''}" data-page="${p}">${p}</button>`;
  }
  pagesHtml += `<button class="page-btn" data-page="${current + 1}" ${current===totalPages? 'disabled' : ''}>›</button>`;
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

  // 🔥 ARREGLO: Pasamos la página actual a scrollToTop para que sepa dónde ir
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
function handleSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    // restaurar carruseles originales
    // Re-renderizar carruseles y lista completa en página 1
    renderCarousel("", (window.G_carousels && window.G_carousels.recommended) || [], "carousel-recommended");
    renderCarousel("Favoritas de Japón", (window.G_carousels && window.G_carousels.favoritesJapan) || [], "carousel-favoritesJapan");
    renderCarousel("Favoritas de España", (window.G_carousels && window.G_carousels.favoritesSpain) || [], "carousel-favoritesSpain");
    renderCarousel("Favoritas de USA", (window.G_carousels && window.G_carousels.favoritesUSA) || [], "carousel-favoritesUSA");
    renderCarousel("Terror Coreano", (window.G_carousels && window.G_carousels.koreanHorror) || [], "carousel-koreanHorror");
    renderCarousel("Cine Extremo Francés", (window.G_carousels && window.G_carousels.frenchExtreme) || [], "carousel-frenchExtreme");


    renderAllMovies(1);
    setupCarouselButtons();
    return;
  }

  // parse gore:#
  const goreMatch = q.match(/gore:(\d+)/);
  const scaresMatch = q.match(/scares:(\d+)/);
  const gore = goreMatch ? Number(goreMatch[1]) : null;
  const scares = scaresMatch ? Number(scaresMatch[1]) : null;

  // filtrar por texto y/o valores
  const filtered = allMovies.filter(m => {
    const textMatch = m.title.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q);
    const goreMatch = gore === null ? true : m.gore >= gore;
    const scaresMatch = scares === null ? true : m.scares >= scares;
    return (gore !== null || scares !== null) ? (goreMatch && scaresMatch) : textMatch;
  });

  // mostrar los resultados en una sección única
  const main = document.querySelector("main");
  main.innerHTML = `<section><h2>Resultados</h2><div class="carousel">${filtered.map(m => `
      <div class="card" onclick="openMovie(${m.id})">
        <img src="${m.poster}" alt="${m.title}" />
        <p class="card-title">${m.title}</p>
      </div>`).join("")}</div></section>`;
}


window.openMovie = openMovie; // exponer para onclick inline
init();