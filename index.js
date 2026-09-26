const STORAGE_KEY = 'tanimes_data_v1';
let animes = [];
let editingId = null;
let currentFilter = 'all';
let pendingCover = null;

const seed = [
  {id:1,name:"Vinland Saga",cover:null,rating:9.4,comment:"Von Racheepos zu Charaktertiefe – eines der stärksten Skripte überhaupt.",episodes:24,favorite:true,videolink:"",notes:"Staffel 2 nochmal schauen.",watched:"2023-11",status:"done",addedAt:Date.now()-4*86400000},
  {id:2,name:"Frieren: Beyond Journey's End",cover:null,rating:9.7,comment:"Ruhig, melancholisch, unglaublich warm erzählt.",episodes:28,favorite:true,videolink:"https://www.tiktok.com/",notes:"",watched:"2024-05",status:"done",addedAt:Date.now()-3*86400000},
  {id:3,name:"Chainsaw Man",cover:null,rating:8.6,comment:"Chaotisch, blutig, aber mit Herz. Denji ist einfach großartig geschrieben.",episodes:12,favorite:false,videolink:"https://www.youtube.com/",notes:"Manga ist noch krasser.",watched:"2022-12",status:"done",addedAt:Date.now()-2*86400000},
  {id:4,name:"Jujutsu Kaisen",cover:null,rating:6.2,comment:"Starke Kämpfe, manchmal etwas hektisches Pacing in S2.",episodes:24,favorite:false,videolink:"",notes:"",watched:"2023-02",status:"done",addedAt:Date.now()-1*86400000},
  {id:5,name:"Spy x Family",cover:null,rating:8.9,comment:"Perfekte Balance aus Comedy und Herzlichkeit – Anya ist Gold.",episodes:25,favorite:true,videolink:"https://www.tiktok.com/",notes:"",watched:"2024-08",status:"done",addedAt:Date.now()},
  {id:6,name:"Fanservice-Isekai #372",cover:null,rating:3.4,comment:"Hab's nur wegen einem Freund weitergeschaut. Story flach, Humor müde.",episodes:12,favorite:false,videolink:"",notes:"",watched:"2024-01",status:"dropped",currentEpisode:4,addedAt:Date.now()-5*86400000},
  {id:7,name:"One Piece",cover:null,rating:null,comment:"Grad mittendrin, kommt gut voran.",episodes:1100,favorite:false,videolink:"",notes:"",watched:"",status:"watching",currentEpisode:340,addedAt:Date.now()-6*86400000},
  {id:8,name:"Dandadan",cover:null,rating:null,comment:"Wurde mir von mehreren Leuten empfohlen.",episodes:12,favorite:false,videolink:"",notes:"",watched:"",status:"watchlist",priority:"high",addedAt:Date.now()-7*86400000}
];

let idCounter = 0;
function generateId(){
  // Zeitbasiert + Zähler, damit auch mehrere schnell hintereinander angelegte Einträge garantiert eine eigene ID bekommen
  return Date.now() * 1000 + (idCounter++ % 1000);
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    animes = raw ? JSON.parse(raw) : seed.slice();
  }catch(e){ animes = seed.slice(); }
}
function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(animes)); }catch(e){ console.error('Speichern fehlgeschlagen', e); }
}

function renderDash(){
  const total = animes.length;
  const favs = animes.filter(a=>a.favorite).length;
  const watching = animes.filter(a=>a.status==='watching').length;
  const dropped = animes.filter(a=>a.status==='dropped').length;
  const watchlist = animes.filter(a=>a.status==='watchlist').length;
  const rated = animes.filter(a=>typeof a.rating === 'number' && !isNaN(a.rating));
  const avg = rated.length ? (rated.reduce((s,a)=>s+a.rating,0)/rated.length).toFixed(1) : '–';
  document.getElementById('dash').innerHTML = `
    <div class="stat"><div class="num">${total}</div><div class="label">Meine Animes</div></div>
    <div class="stat"><div class="num" style="color:var(--violet);">${watchlist}</div><div class="label">Watchlist</div></div>
    <div class="stat"><div class="num" style="color:#4fa3e5;">${watching}</div><div class="label">Schaue gerade</div></div>
    <div class="stat"><div class="num" style="color:#e5654f;">${dropped}</div><div class="label">Abgebrochen</div></div>
    <div class="stat"><div class="num"><em>${favs}</em></div><div class="label">Favoriten</div></div>
    <div class="stat"><div class="num">${avg}${rated.length?'<span style="font-size:16px;color:#6d6d76;">/10</span>':''}</div><div class="label">Ø Bewertung</div></div>
  `;
}

function ratingColor(r){
  if(typeof r !== 'number' || isNaN(r)) return '#6d6d76';
  const clamped = Math.max(0, Math.min(10, r));
  const hue = clamped<=5 ? (clamped/5)*55 : 55 + ((clamped-5)/5)*65;
  return `hsl(${hue}, 72%, 52%)`;
}
function formatWatched(str){
  if(!str) return null;
  const [y,m] = str.split('-');
  const d = new Date(Number(y), Number(m)-1);
  return d.toLocaleDateString('de-DE', {month:'short', year:'numeric'});
}
function statusLabel(s){
  if(s==='watching') return 'Schaue gerade';
  if(s==='dropped') return 'Abgebrochen';
  if(s==='watchlist') return 'Watchlist';
  return null;
}
function priorityLabel(p){
  if(p==='high') return 'Hoch';
  if(p==='low') return 'Später';
  return null;
}
function progressPct(a){
  if(!a.episodes || !a.currentEpisode) return null;
  return Math.max(0, Math.min(100, (a.currentEpisode/a.episodes)*100));
}
function cardHTML(a){
  const cover = a.cover
    ? `<img src="${a.cover}" alt="${escapeHtml(a.name)}">`
    : `<div class="ph">${escapeHtml(a.name)}</div>`;
  const st = a.status||'done';
  const label = statusLabel(st);
  const pct = progressPct(a);
  const pLabel = st==='watchlist' ? priorityLabel(a.priority) : null;
  return `
    <div class="card ${a.favorite?'fav':''} ${st==='dropped'?'dropped':''} ${st==='watching'?'watching':''} ${st==='watchlist'?'watchlist':''}" data-id="${a.id}">
      <div class="cover">${cover}
        ${typeof a.rating==='number'?`<div class="rating-badge" style="color:${ratingColor(a.rating)}">${a.rating.toFixed(1)}</div>`:''}
        ${label?`<div class="status-badge ${st}">${label}</div>`:''}
        ${a.favorite?`<div class="fav-badge ${label?'with-status':''}">★</div>`:''}
        ${a.videolink?`<div class="vid-badge">▶ Edit</div>`:''}
        ${pLabel?`<div class="priority-badge ${a.priority}">${pLabel}</div>`:''}
        <button class="del-badge" data-del="${a.id}" title="Löschen" aria-label="Löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(a.name)}</h3>
        <div class="comment">${escapeHtml(a.comment||'Kein Kommentar hinterlegt.')}</div>
        <div class="meta">${a.episodes?a.episodes+' Folgen · ':''}${st==='done'?'gesehen':label}${a.watched?' · '+formatWatched(a.watched):''}</div>
        ${(st!=='done' && st!=='watchlist' && a.currentEpisode)?`
          <div class="progress-wrap">
            <div class="progress-bar">${pct!==null?`<div class="fill" style="width:${pct}%"></div>`:''}</div>
            <div class="progress-text">Folge ${a.currentEpisode}${a.episodes?' / '+a.episodes:''}${pct!==null?' · '+Math.round(pct)+'%':''}</div>
          </div>`:''}
      </div>
    </div>`;
}

function renderGrid(){
  let list = animes.slice();
  if(currentFilter==='fav') list = list.filter(a=>a.favorite);
  if(currentFilter==='video') list = list.filter(a=>a.videolink);
  if(currentFilter==='watching') list = list.filter(a=>a.status==='watching');
  if(currentFilter==='dropped') list = list.filter(a=>a.status==='dropped');
  if(currentFilter==='watchlist') list = list.filter(a=>a.status==='watchlist');
  const q = (document.getElementById('searchInput').value||'').trim().toLowerCase();
  if(q) list = list.filter(a=>a.name.toLowerCase().includes(q));

  const sortBy = document.getElementById('sortSelect').value;
  const prioOrder = {high:0, normal:1, low:2};
  list.sort((a,b)=>{
    if(sortBy==='rating_desc') return (b.rating??-1)-(a.rating??-1);
    if(sortBy==='rating_asc') return (a.rating??11)-(b.rating??11);
    if(sortBy==='name_asc') return a.name.localeCompare(b.name,'de');
    if(sortBy==='watched_desc') return (b.watched||'').localeCompare(a.watched||'');
    if(sortBy==='progress_desc') return (progressPct(b)??-1)-(progressPct(a)??-1);
    if(sortBy==='priority_desc') return (prioOrder[a.priority||'normal']??1)-(prioOrder[b.priority||'normal']??1);
    return (b.addedAt||0)-(a.addedAt||0); // added_desc default
  });

  const grid = document.getElementById('grid');
  const filterLabels = {all:'Meine Animes', fav:'Favoriten', video:'Mit Edit / Video', watching:'Schaue gerade', dropped:'Abgebrochen', watchlist:'Watchlist'};
  document.getElementById('countLabel').textContent = filterLabels[currentFilter] || 'Meine Animes';
  if(!list.length){
    const emptyMsg = currentFilter==='watchlist'
      ? 'Deine Watchlist ist leer. Füg Animes hinzu, die du dir mal ansehen willst.'
      : 'Noch nichts hier. Füg deinen ersten Anime hinzu.';
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;"><div class="em">🍥</div>${emptyMsg}</div>`;
    return;
  }
  grid.innerHTML = list.map(cardHTML).join('');
  grid.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click', ()=>openDetail(Number(el.dataset.id)));
  });
  grid.querySelectorAll('.del-badge').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      deleteAnime(Number(btn.dataset.del));
    });
  });
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function carouselCardHTML(a){
  const cover = a.cover
    ? `<img src="${a.cover}" alt="${escapeHtml(a.name)}" loading="lazy">`
    : `<div class="ph">${escapeHtml(a.name)}</div>`;
  const st = a.status||'done';
  const label = statusLabel(st);
  return `
    <div class="carousel-card" data-id="${a.id}">
      <div class="cc-cover">${cover}
        ${typeof a.rating==='number'?`<div class="rating-badge" style="color:${ratingColor(a.rating)}">${a.rating.toFixed(1)}</div>`:''}
        ${label?`<div class="status-badge ${st}">${label}</div>`:''}
        ${a.favorite?`<div class="fav-badge ${label?'with-status':''}">★</div>`:''}
        <button class="del-badge" data-del="${a.id}" title="Löschen" aria-label="Löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
        <div class="cc-title">${escapeHtml(a.name)}</div>
      </div>
    </div>`;
}

function renderCarousel(){
  const section = document.getElementById('carouselSection');
  const track = document.getElementById('carouselTrack');
  // Watchlist-Einträge (noch nicht angeschaut) tauchen nicht in der "Deine Sammlung"-Vitrine auf
  const collection = animes.filter(a=>a.status!=='watchlist');
  if(!collection.length){
    section.style.display = 'none';
    track.innerHTML = '';
    return;
  }
  section.style.display = '';

  // Genug Karten erzeugen, damit die Schleife auch bei wenigen Einträgen satt aussieht
  let base = collection.slice();
  let repeated = [];
  while(repeated.length < 10){ repeated = repeated.concat(base); }
  const setHTML = repeated.map(carouselCardHTML).join('');
  // Zweimal hintereinander = nahtloser Loop (Animation läuft nur über die erste Hälfte)
  track.innerHTML = setHTML + setHTML;

  track.querySelectorAll('.carousel-card').forEach(el=>{
    el.addEventListener('click', e=>{
      if(e.target.closest('.del-badge')) return;
      openDetail(Number(el.dataset.id));
    });
  });
  track.querySelectorAll('.del-badge').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      deleteAnime(Number(btn.dataset.del));
    });
  });

  // Geschwindigkeit konstant halten, egal wie viele Karten es sind
  requestAnimationFrame(()=>{
    const singleSetWidth = track.scrollWidth / 2;
    const pxPerSecond = 42; // ruhiges, gleichmäßiges Tempo
    const duration = Math.max(24, singleSetWidth / pxPerSecond);
    track.style.animationDuration = duration.toFixed(1) + 's';
  });
}

function renderAll(){ renderDash(); renderCarousel(); renderGrid(); }

/* --- Add / Edit form --- */
const addOverlay = document.getElementById('addOverlay');
document.getElementById('openAdd').addEventListener('click', ()=>openForm());
document.getElementById('closeAdd').addEventListener('click', closeForm);
document.getElementById('cancelAdd').addEventListener('click', closeForm);
addOverlay.addEventListener('click', e=>{ if(e.target===addOverlay) closeForm(); });

function openForm(existing){
  editingId = existing ? existing.id : null;
  document.getElementById('formTitle').textContent = existing ? 'Anime bearbeiten' : 'Anime hinzufügen';
  document.getElementById('f_name').value = existing?.name || '';
  document.getElementById('f_status').value = existing?.status || 'watchlist';
  document.getElementById('f_priority').value = existing?.priority || 'normal';
  document.getElementById('f_rating').value = existing?.rating ?? '';
  document.getElementById('f_episodes').value = existing?.episodes ?? '';
  document.getElementById('f_currentEpisode').value = existing?.currentEpisode ?? '';
  toggleProgressField();
  toggleWatchlistFields();
  document.getElementById('f_comment').value = existing?.comment || '';
  document.getElementById('f_watched').value = existing?.watched || '';
  document.getElementById('f_videolink').value = existing?.videolink || '';
  document.getElementById('f_notes').value = existing?.notes || '';
  pendingCover = existing?.cover || null;
  document.getElementById('coverUploadText').textContent = pendingCover ? 'Cover ausgewählt ✓' : 'Bild hochladen oder hierher ziehen';
  document.getElementById('coverUpload').classList.toggle('has', !!pendingCover);
  favOn = !!existing?.favorite;
  updateFavToggle();
  document.getElementById('deleteBtn').style.display = existing ? 'inline-block' : 'none';
  addOverlay.classList.add('open');
}
function closeForm(){
  addOverlay.classList.remove('open');
  document.getElementById('animeForm').reset();
  editingId = null; pendingCover = null;
}

let favOn = false;
const favToggle = document.getElementById('favToggle');
favToggle.addEventListener('click', ()=>{ favOn = !favOn; updateFavToggle(); });
function updateFavToggle(){ favToggle.classList.toggle('on', favOn); }

function toggleProgressField(){
  const st = document.getElementById('f_status').value;
  document.getElementById('progressField').style.display = (st==='watching'||st==='dropped') ? 'block' : 'none';
}
function toggleWatchlistFields(){
  const st = document.getElementById('f_status').value;
  const isWL = st === 'watchlist';
  document.getElementById('priorityField').style.display = isWL ? 'block' : 'none';
  document.getElementById('ratingField').style.display = isWL ? 'none' : '';
  document.getElementById('watchedField').style.display = isWL ? 'none' : '';
}
document.getElementById('f_status').addEventListener('change', ()=>{ toggleProgressField(); toggleWatchlistFields(); });

document.getElementById('f_cover').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    pendingCover = reader.result;
    document.getElementById('coverUploadText').textContent = 'Cover ausgewählt ✓';
    document.getElementById('coverUpload').classList.add('has');
  };
  reader.readAsDataURL(file);
});

document.getElementById('animeForm').addEventListener('submit', e=>{
  e.preventDefault();
  const status = document.getElementById('f_status').value;
  const data = {
    id: editingId || generateId(),
    name: document.getElementById('f_name').value.trim() || 'Unbenannt',
    status: status,
    priority: status==='watchlist' ? document.getElementById('f_priority').value : undefined,
    rating: parseFloat(document.getElementById('f_rating').value),
    episodes: parseInt(document.getElementById('f_episodes').value) || null,
    currentEpisode: parseInt(document.getElementById('f_currentEpisode').value) || null,
    comment: document.getElementById('f_comment').value.trim(),
    watched: status==='watchlist' ? '' : document.getElementById('f_watched').value,
    videolink: document.getElementById('f_videolink').value.trim(),
    notes: document.getElementById('f_notes').value.trim(),
    favorite: favOn,
    cover: pendingCover,
    addedAt: (editingId && animes.find(a=>a.id===editingId)?.addedAt) || Date.now()
  };
  if(isNaN(data.rating) || status==='watchlist') delete data.rating;
  if(data.priority === undefined) delete data.priority;
  if(editingId){
    animes = animes.map(a=>a.id===editingId ? data : a);
  }else{
    animes.unshift(data);
  }
  save(); renderAll(); closeForm();
});

document.getElementById('deleteBtn').addEventListener('click', ()=>{
  if(!editingId) return;
  const id = editingId;
  closeForm();
  deleteAnime(id);
});

/* --- Löschen mit "Rückgängig"-Funktion (statt sofort endgültigem Löschen) --- */
function deleteAnime(id){
  const idx = animes.findIndex(a=>a.id===id);
  if(idx === -1) return;
  const item = animes[idx];
  animes.splice(idx, 1);
  save(); renderAll();
  showUndoToast(item, idx);
}

function showUndoToast(item, originalIndex){
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>„${escapeHtml(item.name)}“ gelöscht</span>
    <button class="toast-undo" type="button">Rückgängig</button>
    <button class="toast-x" type="button" aria-label="Schließen">✕</button>
  `;
  container.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('show'));

  const dismiss = ()=>{
    clearTimeout(timeoutId);
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 250);
  };
  const timeoutId = setTimeout(dismiss, 6000);

  toast.querySelector('.toast-undo').addEventListener('click', ()=>{
    clearTimeout(timeoutId);
    const safeIndex = Math.min(originalIndex, animes.length);
    animes.splice(safeIndex, 0, item);
    save(); renderAll();
    toast.classList.remove('show');
    setTimeout(()=>toast.remove(), 250);
  });
  toast.querySelector('.toast-x').addEventListener('click', dismiss);
}

/* --- Detail modal --- */
const detailOverlay = document.getElementById('detailOverlay');
detailOverlay.addEventListener('click', e=>{ if(e.target===detailOverlay) detailOverlay.classList.remove('open'); });

function openDetail(id){
  const a = animes.find(x=>x.id===id);
  if(!a) return;
  const modal = document.getElementById('detailModal');
  const pLabel = a.status==='watchlist' ? priorityLabel(a.priority) : null;
  modal.innerHTML = `
    <button class="closex" onclick="document.getElementById('detailOverlay').classList.remove('open')">✕</button>
    ${a.cover?`<img class="detail-cover" src="${escapeHtml(a.cover)}">`:''}
    <div class="detail-top">
      <h2>${escapeHtml(a.name)} ${a.favorite?'★':''}</h2>
      ${typeof a.rating==='number'?`<div class="detail-rating" style="color:${ratingColor(a.rating)}">${a.rating.toFixed(1)}/10</div>`:''}
    </div>
    <div class="detail-meta">${a.episodes?`<span>${a.episodes} Folgen</span>`:''}<span>${statusLabel(a.status)||'gesehen'}</span>${pLabel?`<span>Priorität: ${pLabel}</span>`:''}${a.watched?`<span>${formatWatched(a.watched)}</span>`:''}</div>
    ${(a.status!=='done' && a.status!=='watchlist' && a.currentEpisode)?`
      <div class="progress-wrap" style="margin-bottom:14px;">
        <div class="progress-bar">${progressPct(a)!==null?`<div class="fill" style="width:${progressPct(a)}%;background:${a.status==='dropped'?'#e5654f':'#4fa3e5'}"></div>`:''}</div>
        <div class="progress-text">Folge ${a.currentEpisode}${a.episodes?' / '+a.episodes:''}${progressPct(a)!==null?' · '+Math.round(progressPct(a))+'%':''}</div>
      </div>`:''}
    ${a.status==='watchlist'?`<button class="startwatch-btn" onclick="startWatching(${a.id})">▶ Jetzt anfangen zu schauen</button>`:''}
    <div class="detail-comment"><div class="lbl">Kommentar</div>${escapeHtml(a.comment)||'—'}</div>
    ${a.notes?`<div class="detail-comment"><div class="lbl">Notizen</div>${escapeHtml(a.notes)}</div>`:''}
    ${a.videolink?`<a class="videolink" href="${escapeHtml(a.videolink)}" target="_blank" rel="noopener">▶ Video / Edit ansehen</a>`:''}
    <div class="formactions">
      <button class="btn ghost" onclick="editFromDetail(${a.id})">Bearbeiten</button>
    </div>
  `;
  detailOverlay.classList.add('open');
}
function editFromDetail(id){
  detailOverlay.classList.remove('open');
  openForm(animes.find(a=>a.id===id));
}
function startWatching(id){
  const a = animes.find(x=>x.id===id);
  if(!a) return;
  a.status = 'watching';
  delete a.priority;
  if(!a.currentEpisode) a.currentEpisode = 0;
  save(); renderAll();
  openDetail(id);
}

document.getElementById('searchInput').addEventListener('input', renderGrid);
document.getElementById('sortSelect').addEventListener('change', renderGrid);

document.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    renderGrid();
  });
});

load();
renderAll();
