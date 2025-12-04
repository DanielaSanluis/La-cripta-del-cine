// ------------------- UTILIDADES -------------------

// Función asíncrona para obtener JSON desde una URL
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

// Escapar HTML para evitar inyección
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Formatear fecha a legible
function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch(e){ return d; }
}

// Calcular terrorímetro (promedio de 4 métricas)
function computeTerrorimeter(movie) {
  const g = Number.isFinite(movie.gore)? Math.min(5,Math.max(0,movie.gore)):0;
  const s = Number.isFinite(movie.scares)? Math.min(5,Math.max(0,movie.scares)):0;
  const j = Number.isFinite(movie.jumpscares)? Math.min(5,Math.max(0,movie.jumpscares)):0;
  const sp = Number.isFinite(movie.suspense)? Math.min(5,Math.max(0,movie.suspense)):0;
  const avg = (g+s+j+sp)/4;
  return Math.round(avg*10)/10;
}

// ------------------- COMENTARIOS -------------------
async function addComment() {
  const user = document.getElementById("user").value.trim();
  const text = document.getElementById("text").value.trim();
  if(!user || !text){ alert("Completa nombre y comentario"); return; }

  const res = await fetch(`/api/movies/${id}/comment`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({user,text})
  });

  if(!res.ok){
    const err = await res.json().catch(()=>null);
    alert(err && err.error ? `Error: ${err.error}` : "Error al enviar el comentario");
    return;
  }

  document.getElementById("user").value="";
  document.getElementById("text").value="";
  load(); // recarga la página con el nuevo comentario
}

// ------------------- RATING -------------------
function showRatingForm(movie){
  if(document.getElementById('rating-modal')) return;

  const modal = document.createElement('div');
  modal.id='rating-modal';
  modal.className='rating-overlay';
  modal.innerHTML=`
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

  function buildStars(containerId, currentValue) {
  const cont = document.getElementById(containerId);
  cont.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    s.dataset.value = i;
    s.tabIndex = 0;
    s.innerText = '★';
    
    // colorear TODAS al abrir
    s.classList.add('selected');

    // click y teclado
    s.addEventListener('click', () => setStars(cont, i));
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setStars(cont, i);
      }
    });
    cont.appendChild(s);
  }
}


  function setStars(container,value){
    const stars=container.querySelectorAll('.star');
    stars.forEach(s=>{
      const v=Number(s.dataset.value);
      if(v<=value) s.classList.add('selected'); else s.classList.remove('selected');
    });
  }

  buildStars('r-gore',movie.gore);
  buildStars('r-scares',movie.scares);
  buildStars('r-jumps',movie.jumpscares);
  buildStars('r-susp',movie.suspense);

  document.getElementById('rating-cancel').addEventListener('click',hideRatingForm);
  document.getElementById('rating-send').addEventListener('click',async ()=>{
    const read=(id)=>{
      const selected=Array.from(document.querySelectorAll(`#${id} .star.selected`));
      if(!selected.length) return 0;
      return Math.max(...selected.map(s=>Number(s.dataset.value)));
    };
    const gore=read('r-gore');
    const scares=read('r-scares');
    const jumpscares=read('r-jumps');
    const suspense=read('r-susp');

    for(const v of [gore,scares,jumpscares,suspense]){
      if(!Number.isFinite(v) || v<0 || v>5){ alert('Valores deben ser entre 0 y 5'); return; }
    }

    const res=await fetch(`/api/movies/${id}/rate`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({gore,scares,jumpscares,suspense})
    });

    if(!res.ok){
      let errText='Error al enviar valoración';
      try{const j=await res.json(); if(j && j.error) errText=`${res.status} - ${j.error}`;}catch(e){ errText=`${res.status} - ${res.statusText}`;}
      alert(errText); return;
    }

    hideRatingForm();
    load();
  });
}

function hideRatingForm(){ const m=document.getElementById('rating-modal'); if(m) m.remove(); }

// ------------------- LOAD -------------------
const params=new URLSearchParams(location.search);
const id=params.get("id");

async function load(){
  const movie=await fetchJSON(`/api/movies/${id}`);
  if(!movie){ document.getElementById("movie-container").innerHTML="<p>Película no encontrada</p>"; return; }

  const terrorValue=computeTerrorimeter(movie);
  const terrorPercent=Math.round((terrorValue/5)*100);
  document.getElementById("movie-container").innerHTML=`
  <style>
    #movie-video:hover {
      box-shadow: 0 0 25px rgba(128,0,128,0.7), 0 0 50px rgba(138,43,226,0.5);
      transform: scale(1.02);
      transition: all 0.3s ease;
    }
    #simulate-end:hover, #show-trailer:hover {
      box-shadow: 0 0 15px #8a2be2, 0 0 25px #4b0082 inset;
      transform: scale(1.05);
      transition: all 0.3s ease;
    }
    .star.selected {
      color: #ba55d3;
      text-shadow: 0 0 6px #8a2be2;
    }
    .trailer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .trailer-box {
      position: relative;
      background: #111;
      padding: 20px;
      border-radius: 8px;
    }
    .trailer-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #4b0082;
      color: #fff;
      border: none;
      font-size: 20px;
      border-radius: 50%;
      cursor: pointer;
      width: 32px;
      height: 32px;
    }
  </style>

  <div class="movie-detail" style="background:#111;color:#f5f5f5;font-family:'Creepster','Arial',sans-serif;padding:20px;border-radius:12px;max-width:960px;margin:30px auto;box-shadow:0 0 20px rgba(138,43,226,0.5);">
    <div class="meta" style="display:flex;gap:20px;align-items:flex-start;">
      <img class="poster" src="${movie.poster}" alt="${movie.title}" style="width:250px;border-radius:8px;box-shadow:0 0 15px rgba(138,43,226,0.6);"/>
      <div class="info" style="flex:1;">
        <h1 style="font-size:2em;color:#ba55d3;margin-bottom:10px;">${movie.title} <small style="font-size:0.6em;color:#ccc">(${movie.year})</small></h1>
        <div class="terrorimeter" style="margin:12px 0;">
          <div class="terror-bar" style="background:#333;border:2px solid #4b0082;border-radius:6px;height:20px;width:100%;overflow:hidden;">
            <div class="terror-fill" style="width:${terrorPercent}%;background:linear-gradient(90deg,#4b0082 0%,#ba55d3 100%);height:100%;"></div>
          </div>
          <div class="terror-score" style="margin-top:4px;color:#ba55d3;font-weight:bold;">Terrorímetro: ${terrorValue}/5</div>
        </div>
        <p class="synopsis" style="margin:10px 0;line-height:1.5;color:#eee;">${movie.synopsis}</p>
        <p class="tags" style="margin:6px 0;"><strong>Tags:</strong> ${((movie.tags||[]).map(t=>`<span class="tag" style="background:#4b0082;padding:2px 6px;border-radius:4px;margin-right:4px;color:#fff;">${t}</span>`).join(" "))}</p>
        <p class="levels" style="margin:4px 0;"><strong>Gore:</strong> ${movie.gore??'N/A'} / 5 &nbsp; <strong>Miedo:</strong> ${movie.scares??'N/A'} / 5</p>
        <p class="levels" style="margin:4px 0;"> <strong>Jumpscares:</strong> ${movie.jumpscares??'N/A'} / 5 &nbsp; <strong>Suspenso:</strong> ${movie.suspense??'N/A'} / 5</p>
        <!-- Botones alineados -->
        <div style="margin-top:12px; display:flex; gap:12px;">
          <button id="show-trailer" style="background:#4b0082;color:#fff;padding:10px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 0 10px #8a2be2;">
            Ver trailer
          </button>
          <button id="simulate-end" style="background:#4b0082;color:#fff;padding:10px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 0 10px #8a2be2;">
            Calificar película
          </button>
        </div>
      </div>
    </div>

    <div class="player" style="margin-top:30px;text-align:center;">
      <video id="movie-video" controls width="720" style="border-radius:8px;box-shadow:0 0 15px rgba(138,43,226,0.4);">
        <source src="/videos/trailers/codeflix.mp4" type="video/mp4">
        Tu navegador no soporta el elemento video.
      </video>
    </div>

    <section class="comments-section" style="margin-top:40px;">
      <h3 style="color:#ba55d3;border-bottom:1px solid #4b0082;padding-bottom:6px;">Comentarios</h3>
      <div id="comments" style="margin-top:12px;">
        ${((movie.comments||[]).map(c=>`<div class="comment" style="background:#222;border:1px solid #4b0082;padding:8px 12px;border-radius:6px;margin-bottom:8px;"><b style="color:#ba55d3;">${escapeHtml(c.user)}</b> <small style="color:#aaa;">${formatDate(c.date)}</small><p style="margin-top:4px;color:#eee;">${escapeHtml(c.text)}</p></div>`).join(""))}
      </div>
      <h4 style="margin-top:20px;color:#ba55d3;">Añadir comentario</h4>
      <div class="comment-form" style="display:flex;flex-direction:column;gap:8px;">
        <input id="user" placeholder="Tu nombre" style="padding:8px;border-radius:6px;border:1px solid #4b0082;background:#111;color:#fff;"/>
        <textarea id="text" placeholder="Tu comentario" style="padding:8px;border-radius:6px;border:1px solid #4b0082;background:#111;color:#fff;"></textarea>
        <button id="send" style="background:#4b0082;color:#fff;padding:10px 16px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 0 10px #8a2be2;">Enviar</button>
      </div>
    </section>

    <footer class="footer">
      <p>&copy; 2025 CodeFlix. Todos los derechos reservados.</p>
    </footer>
  </div>
  `;


  document.getElementById("send").addEventListener("click",addComment);

  // ---------------- TRAILER ----------------
  const showTrailerBtn=document.getElementById('show-trailer');
  if(showTrailerBtn){
    showTrailerBtn.addEventListener('click',()=>{
      if(showTrailerBtn.dataset.clicked) return;
      showTrailerBtn.dataset.clicked='1';

      const overlay=document.createElement('div');
      overlay.id='trailer-modal';
      overlay.className='trailer-overlay';
      overlay.innerHTML=`
        <div class="trailer-box">
          <button id="trailer-close" class="trailer-close">✕</button>
          <div id="trailer-content" class="trailer-content">Cargando trailer…</div>
        </div>
      `;
      document.body.appendChild(overlay);

      const content=document.getElementById('trailer-content');
      let keyHandler=(e)=>{ if(e.key==='Escape') closeModal(); };
      function closeModal(){ const m=document.getElementById('trailer-modal'); if(m){ const v=m.querySelector('video'); if(v&&!v.paused) try{v.pause();v.currentTime=0;}catch(e){} m.remove(); } delete showTrailerBtn.dataset.clicked; document.removeEventListener('keydown',keyHandler); }

      document.getElementById('trailer-close').addEventListener('click',closeModal);
      document.addEventListener('keydown',keyHandler);

      if(movie.trailer){
        if(movie.trailer.type==='local'){
        // Trailers locales (MP4)
          const v=document.createElement('video'); v.controls=true; v.width=920;
          const s=document.createElement('source'); s.src=movie.trailer.url; s.type='video/mp4'; v.appendChild(s);
          content.innerHTML=''; content.appendChild(v);
          v.addEventListener('ended',()=>{ closeModal(); showRatingForm(movie); });
        }
        else if(movie.trailer.type==='youtube'){
          //Trailers de YouTube
          content.innerHTML=`
          <iframe
            width="920"
            height="518"
            src="${movie.trailer.url}"
            title="Trailer de ${movie.title}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        `;
      }
      else {
        content.innerHTML='<p>Tipo de trailer no soportado</p>';
      }
} else if(movie.video){
  const v=document.createElement('video'); v.controls=true; v.width=920; v.src=movie.video;
  content.innerHTML=''; content.appendChild(v);
  v.addEventListener('ended',()=>{ closeModal(); showRatingForm(movie); });
} else { 
  content.innerHTML='<p>Trailer no disponible</p>'; 
}
    });
  }

  // Video principal
const vid = document.getElementById('movie-video');
if (vid) {
  vid.addEventListener('ended', () => {

    const showTrailerBtn = document.getElementById('show-trailer');

    // Si el botón existe, "simular" un click para abrir la ventana emergente
    if (showTrailerBtn && !showTrailerBtn.dataset.clicked) {
      showTrailerBtn.click();
    } else {
      // Si por alguna razón no se puede abrir el modal, mostramos el form
      showRatingForm(movie);
    }
  });
}


  // Botón simular fin
  const sim=document.getElementById('simulate-end');
  if(sim) sim.addEventListener('click',()=>showRatingForm(movie));
}

// ---------------- INICIO ----------------
load();

