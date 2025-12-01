// src/scripts/main.js
async function fetchJSON(url) { // función auxiliar para hacer fetch y devolver JSON
  const r = await fetch(url); // realiza la petición HTTP a `url`
  return r.json(); // parsea y devuelve el body como JSON
}

let allMovies = []; // array global que almacenará todas las películas


async function init() { // inicializa la aplicación en la carga
  // 🔥 ARREGLO: Ejecutamos openCryptDoor al inicio para asegurar que la animación de la puerta se inicie
  if (typeof window.openCryptDoor === 'function') { // si la función existe
      window.openCryptDoor(); // la ejecuta para la animación
  }
  
  allMovies = await fetchJSON("/api/movies"); // carga todas las películas desde la API
  const carousels = await fetchJSON("/api/carousels"); // carga datos de los carousels
  // guardar carousels en variable global para poder re-renderizarlos sin volver a pedir al servidor
  window.G_carousels = carousels; // guarda en propiedad global para reutilizar

  renderCarousel("", carousels.recommended, "carousel-recommended"); // renderiza carrusel recomendado
  renderCarousel("Favoritas de Japón", carousels.favoritesJapan, "carousel-favoritesJapan"); // renderiza carrusel Japón
  renderCarousel("Favoritas de España", carousels.favoritesSpain, "carousel-favoritesSpain"); // renderiza carrusel España
  renderCarousel("Favoritas de USA", carousels.favoritesUSA, "carousel-favoritesUSA"); // renderiza carrusel USA
  renderCarousel("Terror Coreano", carousels.koreanHorror, "carousel-koreanHorror"); // renderiza carrusel terror coreano
  renderCarousel("Cine Extremo Francés", carousels.frenchExtreme, "carousel-frenchExtreme"); // renderiza carrusel cine extremo francés

  document.getElementById("search").addEventListener("input", handleSearch); // agrega listener al input de búsqueda


  // Después de renderizar carruseles, inicializar lista paginada y botones
  renderAllMovies(1); // página inicial: renderiza la lista paginada en la página 1
  setupCarouselButtons(); // configura los botones de desplazamiento de los carruseles

  // Listener de búsqueda
  document.getElementById("search").addEventListener("input", handleSearch); // (de nuevo) asegura el listener
}

const PAGE_SIZE = 15; // películas por página en la lista completa

// Renderiza la lista paginada de todas las películas (solo imagen + título)
function renderAllMovies(page = 1) { // renderiza la vista de listado paginado
  const grid = document.getElementById('movies-grid'); // contenedor de las tarjetas pequeñas
  const pagination = document.getElementById('movies-pagination'); // contenedor de la paginación
  if (!grid || !pagination) return; // si no existen elementos en DOM, salir

  const total = allMovies.length; // total de películas
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); // número total de páginas
  const current = Math.min(Math.max(1, page), totalPages); // página actual (clamped)

  // calcular slice de películas para la página actual
  const start = (current - 1) * PAGE_SIZE; // índice inicial
  const pageItems = allMovies.slice(start, start + PAGE_SIZE); // items de la página

  // construir grid: tarjetas pequeñas con imagen y nombre
  grid.innerHTML = pageItems.map(m => `
    <div class="movie-small" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="movie-small-title">${m.title}</p>
    </div>
  `).join(''); // genera HTML para cada película de la página

  // construir paginación simple: anterior, números y siguiente
  let pagesHtml = '';
  pagesHtml += `<button class="page-btn" data-page="${current - 1}" ${current===1? 'disabled': ''}>‹</button>`; // botón anterior
  for (let p = 1; p <= totalPages; p++) {
    pagesHtml += `<button class="page-btn ${p===current? 'active':''}" data-page="${p}">${p}</button>`; // botón por página
  }
  pagesHtml += `<button class="page-btn" data-page="${current + 1}" ${current===totalPages? 'disabled' : ''}>›</button>`; // botón siguiente
  pagination.innerHTML = pagesHtml; // inserta la paginación en el DOM

  // enlazar eventos de paginación
  pagination.querySelectorAll('.page-btn').forEach(b => {
    b.addEventListener('click', () => {
      const p = Number(b.dataset.page); // obtener número de página del botón
      if (p >= 1 && p <= totalPages) {
        // Al hacer click, llamar a renderAllMovies(p)
        renderAllMovies(p); // renderiza la página seleccionada
      }
    });
  });

  // Lógica de control de visibilidad de carruseles (página 1 vs otras)
  if (typeof window.actualizarVisibilidadCarruseles === 'function') {
    window.actualizarVisibilidadCarruseles(current); // llama función para actualizar visibilidad según la página
  }

  // 🔥 ARREGLO: Pasamos la página actual a scrollToTop para que sepa dónde ir
  if (typeof window.scrollToTop === 'function') {
    window.scrollToTop(current); // <-- ¡Importante! desplaza la vista según la página
  }
}

function renderCarousel(title, ids, containerId) { // renderiza un carrusel dado un array de ids
  const container = document.getElementById(containerId); // contenedor del carrusel
  const movies = ids.map(id => allMovies.find(m => m.id === id)).filter(Boolean); // mapea ids a objetos de película y filtra falsos

  // insertar sólo la fila .carousel dentro del contenedor (el título ya está en el HTML)
  container.innerHTML = `<div class="carousel">${movies.map(m => `
    <div class="card" onclick="openMovie(${m.id})">
      <img src="${m.poster}" alt="${m.title}" />
      <p class="card-title">${m.title}</p>
    </div>`).join("")}</div>`; // genera HTML interno del carrusel
}

function setupCarouselButtons() { // configura botones de flecha para desplazar carruseles
  document.querySelectorAll('.arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.carousel; // 'recommended' o 'favoritesJapan'
      const container = document.getElementById(`carousel-${key}`); // contenedor del carrusel correspondiente
      if (!container) return; // si no existe, salir
      // el elemento que tiene overflow-x es .carousel-container (el propio container)
      const amount = Math.round(container.clientWidth * 0.8) || 300; // cantidad a desplazar
      if (btn.classList.contains('left')) {
        container.scrollBy({ left: -amount, behavior: 'smooth' }); // desplazar hacia la izquierda
      } else {
        container.scrollBy({ left: amount, behavior: 'smooth' }); // desplazar hacia la derecha
      }
    });
  });
}

function openMovie(id) { // redirige a la página de detalle con el id en query
  window.location.href = `movie.html?id=${id}`; // cambia la URL para abrir movie.html
}

// Búsqueda simple + filtros básicos: soporta "gore:3", "scares:4" o texto
function handleSearch(e) { // maneja la búsqueda y muestra resultados
  const q = e.target.value.trim().toLowerCase(); // obtiene y normaliza el texto de búsqueda
  if (!q) {
    // restaurar carruseles originales
    // Re-renderizar carruseles y lista completa en página 1
    renderCarousel("", (window.G_carousels && window.G_carousels.recommended) || [], "carousel-recommended"); // restaura recomendado
    renderCarousel("Favoritas de Japón", (window.G_carousels && window.G_carousels.favoritesJapan) || [], "carousel-favoritesJapan"); // restaura Japón
    renderCarousel("Favoritas de España", (window.G_carousels && window.G_carousels.favoritesSpain) || [], "carousel-favoritesSpain"); // restaura España
    renderCarousel("Favoritas de USA", (window.G_carousels && window.G_carousels.favoritesUSA) || [], "carousel-favoritesUSA"); // restaura USA
    renderCarousel("Terror Coreano", (window.G_carousels && window.G_carousels.koreanHorror) || [], "carousel-koreanHorror"); // restaura terror coreano
    renderCarousel("Cine Extremo Francés", (window.G_carousels && window.G_carousels.frenchExtreme) || [], "carousel-frenchExtreme"); // restaura cine extremo


    renderAllMovies(1); // renderiza lista completa en página 1
    setupCarouselButtons(); // reconfigura botones
    return; // termina la función porque no hay query
  }

  // parse gore:#
  const goreMatch = q.match(/gore:(\d+)/); // intenta matchear gore:N
  const scaresMatch = q.match(/scares:(\d+)/); // intenta matchear scares:N
  const gore = goreMatch ? Number(goreMatch[1]) : null; // valor numérico de gore o null
  const scares = scaresMatch ? Number(scaresMatch[1]) : null; // valor numérico de scares o null

  // filtrar por texto y/o valores
  const filtered = allMovies.filter(m => {
    const textMatch = m.title.toLowerCase().includes(q) || m.synopsis.toLowerCase().includes(q); // búsqueda por texto
    const goreMatch = gore === null ? true : m.gore >= gore; // filtro por gore
    const scaresMatch = scares === null ? true : m.scares >= scares; // filtro por scares
    return (gore !== null || scares !== null) ? (goreMatch && scaresMatch) : textMatch; // si hay filtros numéricos, aplicarlos, sino usar textMatch
  });

  // mostrar los resultados en una sección única
  const main = document.querySelector("main"); // contenedor principal
  main.innerHTML = `<section><h2>Resultados</h2><div class="carousel">${filtered.map(m => `
      <div class="card" onclick="openMovie(${m.id})">
        <img src="${m.poster}" alt="${m.title}" />
        <p class="card-title">${m.title}</p>
      </div>`).join("")}</div></section>`; // genera y muestra resultados
}


window.openMovie = openMovie; // exponer para onclick inline
init(); // iniciar la aplicación