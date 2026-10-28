const SMILEY_COLORS = ['#D8432F', '#EE8A26', '#97C23C', '#2E9A57'];

let lastData  = [];
let allCount  = 0;
let unsubscribe = null;
let renderToken = 0;
let imagesLoaded = false;

function pct (n, total) { return total === 0 ? 0 : Math.round(n / total * 100); }
const listOf = v => (Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]));
const actKey = a => (String(a).startsWith('autre:') ? 'autre' : a);
const versionOf = (r, slot) => (r.images || {})[slot.id] || 'origine';

function escapeHtml (str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const SECTIONS = [
  { title: 'Pratiques', panels: [
    { title: 'Activités pratiquées', map: XL.activites, values: r => listOf(r.activites).map(actKey), note: 'Plusieurs réponses possibles' },
    { title: 'Niveau (par activité)', map: XL.niveau, ordered: true, values: r => listOf(r.activites).map(a => (r.niveaux || {})[a]).filter(Boolean), per: 'activité' },
    { title: 'Fréquence (par activité)', map: XL.frequence, ordered: true, values: r => listOf(r.activites).map(a => (r.frequence || {})[a]).filter(Boolean), per: 'activité' },
    { title: 'Ce qui est recherché', map: XL.motif, values: r => listOf(r.motif_pratique), note: 'Plusieurs réponses possibles' },
    { title: 'Saison principale', map: XL.saisons, ordered: true, values: r => listOf(r.saisons) }
  ] },
  { title: 'Préparation', panels: [
    { title: 'Préparation des sorties', map: XL.preparation, ordered: true, values: r => listOf(r.preparation) },
    { title: 'Moyens de préparation', map: XL.moyens, values: r => listOf(r.moyens), note: 'Plusieurs réponses possibles' },
    { title: 'Délai de préparation', map: XL.delai, ordered: true, values: r => listOf(r.delai_preparation) },
    { title: 'Informations recherchées', text: r => r.infos_recherchees }
  ] },
  { title: 'Sur le terrain', panels: [
    { title: 'Sortie des sentiers', map: XL.horsSentier, ordered: true, values: r => listOf(r.hors_sentier) },
    { title: 'Raisons de quitter les sentiers', map: XL.horsRaisons, values: r => listOf(r.hors_sentier_raisons), note: 'Plusieurs réponses possibles' },
    { title: 'Lecture des panneaux', map: XL.lecture, values: r => listOf(r.attention_signaletique), note: 'Plusieurs réponses possibles' },
    { title: 'Freins à la lecture', map: XL.raisons, values: r => listOf(r.raisons_non_lecture), note: 'Plusieurs réponses possibles' }
  ] },
  { title: 'Situations', heatmaps: true },
  { title: "Installations d'accueil", accueil: true },
  { title: 'Attentes et avis', panels: [
    { title: 'Attentes et idées', text: r => r.besoins },
    { title: "Avis sur l'enquête", text: r => r.avis_enquete }
  ] },
  { title: 'Profil des participants', panels: [
    { title: 'Sort avec', map: XL.visite, values: r => listOf(r.type_visite), note: 'Plusieurs réponses possibles' },
    { title: 'Âge', map: XL.age, ordered: true, values: r => listOf(r.age) },
    { title: 'Situation professionnelle', map: XL.csp, ordered: true, values: r => listOf(r.csp) },
    { title: 'Genre', map: XL.genre, ordered: true, values: r => listOf(r.genre) },
    { title: "Département ou pays d'origine", values: r => listOf(r.departement), top: 10 }
  ] }
];

function renderStats (data) {
  const total = data.length;
  const durations = data.map(r => r.duration_s).filter(n => n > 0).sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const count = test => pct(data.filter(test).length, total) + ' %';

  $('statsRow').innerHTML = [
    { val: total,                                                  lbl: 'Réponses complètes' },
    { val: median ? `${Math.max(1, Math.round(median / 60))} min` : '–', lbl: 'Durée médiane' },
    { val: count(r => r.preparation === 'avant'),                  lbl: 'Préparent avant de partir' },
    { val: count(r => ['parfois', 'souvent'].includes(r.hors_sentier)), lbl: 'Quittent les sentiers' },
    { val: count(r => listOf(r.attention_signaletique).includes('lis_tout')), lbl: 'Lisent tout le panneau' }
  ].map(s => `<div class="stat-card"><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`).join('');

  $('totalResponses').textContent = `${total} réponse${total > 1 ? 's' : ''}`;
}

function barsPanel (p, data) {
  const asked = data.filter(r => p.values(r).length);
  const counts = new Map();
  if (p.ordered && p.map) Object.keys(p.map).forEach(k => counts.set(k, 0));
  let units = 0;
  asked.forEach(r => p.values(r).forEach(v => { counts.set(v, (counts.get(v) || 0) + 1); units++; }));
  const base = p.per ? units : asked.length;
  let rows = [...counts.entries()];
  if (!p.ordered) rows.sort((a, b) => b[1] - a[1]);
  if (p.top) rows = rows.slice(0, p.top);

  const body = !asked.length ? '<p class="empty">Aucune donnée pour le moment.</p>' : rows.map(([k, n]) => `
    <div class="bar-row">
      <div class="bar-lbl">${escapeHtml(p.map ? xlLabel(p.map, k) : k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct(n, base)}%;"></div></div>
      <div class="bar-val"><b>${pct(n, base)} %</b> <span>${n}</span></div>
    </div>`).join('');

  const sub = p.per ? `${base} ${p.per}${base > 1 ? 's' : ''} citée${base > 1 ? 's' : ''}` : `${asked.length} répondant${asked.length > 1 ? 's' : ''}`;
  return `<div class="panel">
    <div class="panel-head"><span class="panel-title">${p.title}</span><span class="panel-sub">${sub}${p.note ? ' · ' + p.note : ''}</span></div>
    ${body}
  </div>`;
}

function textPanel (p, data) {
  const answers = data.map(r => (p.text(r) || '').trim()).filter(Boolean).reverse();
  return `<div class="panel panel-text">
    <div class="panel-head"><span class="panel-title">${p.title}</span><span class="panel-sub">${answers.length} réponse${answers.length > 1 ? 's' : ''}</span></div>
    <div class="answers">${answers.length
      ? answers.map(t => `<p class="answer">${escapeHtml(t)}</p>`).join('')
      : '<p class="empty">Aucune réponse pour le moment.</p>'}</div>
  </div>`;
}

function accueilPanel (data) {
  const max = CONFIG.SMILEYS.length;
  const cards = CONFIG.ACCUEIL.map(a => {
    const all = data.filter(r => (r.accueil_notes || {})[a.id]);
    const cur = all.filter(r => versionOf(r, a) === a.imageVersion);
    const notes = cur.map(r => r.accueil_notes[a.id]);
    const avg = notes.length ? notes.reduce((t, n) => t + n, 0) / notes.length : 0;
    const dist = CONFIG.SMILEYS.map(s => notes.filter(n => n === s.value).length);
    const old = all.length - cur.length;
    return `<div class="acc-card">
      <div class="acc-img">${accueilMarkup(a)}</div>
      <div class="acc-body">
        <div class="acc-head"><b>${a.label}</b><span class="acc-avg">${notes.length ? avg.toFixed(1).replace('.', ',') : '–'}<small> / ${max}</small></span></div>
        <div class="acc-stack">${dist.map((n, i) => n ? `<span style="flex:${n};background:${SMILEY_COLORS[i]}" title="${CONFIG.SMILEYS[i].label} : ${n}"></span>` : '').join('') || '<span class="acc-none"></span>'}</div>
        <div class="acc-legend">${CONFIG.SMILEYS.map((s, i) => `<span><i style="background:${SMILEY_COLORS[i]}"></i>${s.label} ${dist[i]}</span>`).join('')}</div>
        ${old ? `<p class="acc-old">+ ${old} note${old > 1 ? 's' : ''} sur une image précédente</p>` : ''}
      </div>
    </div>`;
  }).join('');
  return `<div class="acc-grid">${cards}</div>`;
}

function renderResults (data) {
  const body = $('resultsBody');
  body.innerHTML = SECTIONS.map(sec => {
    let inner;
    if (sec.heatmaps) inner = '<div class="heatmaps-grid" id="heatmapsGrid"></div>';
    else if (sec.accueil) inner = accueilPanel(data);
    else inner = `<div class="panels">${sec.panels.map(p => (p.text ? textPanel(p, data) : barsPanel(p, data))).join('')}</div>`;
    return `<h2 class="results-h">${sec.title}</h2>${inner}`;
  }).join('');
  renderHeatmaps(data);
}

function renderHeatmaps (data) {
  const grid = $('heatmapsGrid');
  if (!grid) return;
  const token = ++renderToken;

  CONFIG.SIGNS.forEach(sign => {
    const allClicks = [];
    let old = 0;
    data.forEach(r => {
      const clicks = (r.sign_interactions || {})[sign.id];
      if (!Array.isArray(clicks)) return;
      if (versionOf(r, sign) === sign.imageVersion) allClicks.push(...clicks);
      else old++;
    });

    const card = document.createElement('div');
    card.className = 'hmap-card';
    card.innerHTML = `
      <div class="hmap-header">
        <span class="hmap-title">${signTitle(sign)}</span>
        <span class="hmap-badge">${allClicks.length} clic${allClicks.length !== 1 ? 's' : ''}</span>
      </div>
      <p class="hmap-q">${escapeHtml(sign.question)}</p>
      <div class="hmap-body" id="hmap_${sign.id}"></div>
      ${old ? `<p class="hmap-old">${old} réponse${old > 1 ? 's' : ''} sur une image précédente non affichée${old > 1 ? 's' : ''}</p>` : ''}
    `;
    grid.appendChild(card);

    requestAnimationFrame(() => {
      setTimeout(() => { if (token === renderToken) buildHeatmap(sign, allClicks); }, 80);
    });
  });
}

function buildHeatmap (sign, allClicks) {
  const container = document.getElementById(`hmap_${sign.id}`);
  if (!container) return;

  container.innerHTML = signMarkup(sign);

  const w = container.offsetWidth;
  const h = Math.round(w * 0.75);
  container.style.height = h + 'px';

  if (allClicks.length === 0 || typeof h337 === 'undefined') return;

  const hm = h337.create({
    container:  container,
    radius:     Math.max(28, Math.round(w * 0.065)),
    maxOpacity: 0.72,
    minOpacity: 0,
    blur:       0.80
  });

  hm.setData({
    max: Math.max(2, Math.ceil(allClicks.length * 0.35)),
    data: allClicks.map(c => ({
      x: Math.round(c.x / 100 * w),
      y: Math.round(c.y / 100 * h),
      value: 1
    }))
  });

  const canvas = container.querySelector('canvas');
  if (canvas) {
    canvas.style.position = 'absolute';
    canvas.style.top  = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';
  }
}

const STATUS_LABELS = { connecting: 'connexion…', connected: 'connecté', disconnected: 'déconnecté' };
function setStatus (state, at) {
  const el = $('status');
  if (!el) return;
  const time = at ? ' ' + at.toLocaleTimeString('fr-FR') : '';
  el.textContent = (STATUS_LABELS[state] || '') + time;
  el.classList.toggle('off', state === 'disconnected');
}

function render (docs) {
  allCount = docs.length;
  lastData = docs
    .filter(isCompleteResponse)
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  renderStats(lastData);
  renderResults(lastData);
}

async function loadImages () {
  try { applyImages(await DB.images()); }
  catch (e) { console.error(e); }
  imagesLoaded = true;
  renderImages();
  renderResults(lastData);
}

function startResults () {
  if (unsubscribe) return;
  const note = $('localNote');
  if (note) note.style.display = DB.mode === 'local' ? 'block' : 'none';
  setStatus('connecting');
  renderStats([]);
  renderResults([]);
  renderImages();
  loadImages();
  unsubscribe = DB.subscribe(render, err => console.error(err), setStatus);
}

function stopResults () {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

async function refreshResults (btn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Actualisation…';
  try { await Promise.all([DB.refresh(), loadImages()]); } finally { btn.disabled = false; btn.textContent = label; }
}

function bindTabs () {
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      const on = t === tab;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on);
      $(t.dataset.tab).hidden = !on;
    });
    if (tab.dataset.tab === 'tabResults') renderHeatmapsAgain();
  }));
}

function renderHeatmapsAgain () {
  const grid = $('heatmapsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  renderHeatmaps(lastData);
}

/* images du questionnaire */

const crop = { slot: null, img: null, zoom: 1, cx: 0.5, cy: 0.5, drag: null };

function renderImages () {
  const grid = $('imgGrid');
  if (!grid) return;
  grid.innerHTML = IMAGE_SLOTS.map(s => {
    const custom = s.imageVersion !== 'origine';
    return `<div class="img-card" data-slot="${s.id}">
      <div class="img-thumb">${s.image ? `<img src="${s.image}" alt="">` : '<div class="sign-grid"></div>'}</div>
      <div class="img-info">
        <b>${slotTitle(s)}</b>
        <span class="img-state${custom ? ' custom' : ''}">${!imagesLoaded ? 'chargement…' : custom ? `Remplacée le ${versionDate(s.imageVersion)}` : "Image d'origine"}</span>
      </div>
      <div class="img-actions">
        <button type="button" class="btn btn-sm" data-act="change"${imagesLoaded ? '' : ' disabled'}>Changer</button>
        ${custom ? `<button type="button" class="btn btn-sm" data-act="reset">Revenir à l'origine</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function bindImages () {
  $('imgGrid').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const slot = IMAGE_SLOTS.find(s => s.id === btn.closest('.img-card').dataset.slot);
    if (btn.dataset.act === 'change') {
      crop.slot = slot;
      $('imgFile').value = '';
      $('imgFile').click();
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Rétablissement…';
    try { await DB.resetImage(slot.id); await loadImages(); }
    catch (err) { console.error(err); alert("Impossible de rétablir l'image : " + err.message); renderImages(); }
  });

  $('imgFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => openCrop(img);
    img.onerror = () => alert('Format non lu. Utilisez une image JPG ou PNG.');
    img.src = URL.createObjectURL(file);
  });

  const frame = $('cropFrame');
  frame.addEventListener('pointerdown', e => {
    crop.drag = { x: e.clientX, y: e.clientY };
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('dragging');
  });
  frame.addEventListener('pointermove', e => {
    if (!crop.drag) return;
    const { dw, dh } = cropSize();
    crop.cx -= (e.clientX - crop.drag.x) / dw;
    crop.cy -= (e.clientY - crop.drag.y) / dh;
    crop.drag = { x: e.clientX, y: e.clientY };
    drawCrop();
  });
  const endDrag = () => { crop.drag = null; frame.classList.remove('dragging'); };
  frame.addEventListener('pointerup', endDrag);
  frame.addEventListener('pointercancel', endDrag);
  frame.addEventListener('wheel', e => {
    e.preventDefault();
    setZoom(crop.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06));
  }, { passive: false });
  $('cropZoom').addEventListener('input', e => setZoom(+e.target.value));

  const modal = $('cropModal');
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeCrop));
  modal.addEventListener('click', e => { if (e.target === modal) closeCrop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCrop(); });
  window.addEventListener('resize', () => { if (!modal.hidden) drawCrop(); });
}

function cropSize () {
  const frame = $('cropFrame');
  const W = frame.clientWidth, H = frame.clientHeight;
  const { naturalWidth: w, naturalHeight: h } = crop.img;
  const scale = Math.max(W / w, H / h) * crop.zoom;
  return { W, H, dw: w * scale, dh: h * scale };
}

function drawCrop () {
  const { W, H, dw, dh } = cropSize();
  const hx = W / 2 / dw, hy = H / 2 / dh;
  crop.cx = Math.min(1 - hx, Math.max(hx, crop.cx));
  crop.cy = Math.min(1 - hy, Math.max(hy, crop.cy));
  const img = $('cropImg');
  img.style.width  = dw + 'px';
  img.style.height = dh + 'px';
  img.style.left = (W / 2 - crop.cx * dw) + 'px';
  img.style.top  = (H / 2 - crop.cy * dh) + 'px';
}

function setZoom (z) {
  crop.zoom = Math.min(3, Math.max(1, z));
  $('cropZoom').value = crop.zoom;
  drawCrop();
}

function openCrop (img) {
  crop.img = img;
  crop.zoom = 1; crop.cx = 0.5; crop.cy = 0.5;
  $('cropImg').src = img.src;
  $('cropZoom').value = 1;
  $('cropTitle').textContent = `Nouvelle image · ${slotTitle(crop.slot)}`;
  $('cropErr').style.display = 'none';
  const save = $('cropSave');
  save.disabled = false; save.textContent = 'Enregistrer';
  $('cropModal').hidden = false;
  drawCrop();
}

function closeCrop () {
  const modal = $('cropModal');
  if (modal.hidden || $('cropSave').textContent !== 'Enregistrer') return;
  modal.hidden = true;
  if (crop.img) URL.revokeObjectURL(crop.img.src);
  crop.img = null;
}

function cropDataUrl () {
  const OUT_W = 1600, OUT_H = 1200;
  const { W, dw, dh, H } = cropSize();
  const k = OUT_W / W;
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W; canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(crop.img, (W / 2 - crop.cx * dw) * k, (H / 2 - crop.cy * dh) * k, dw * k, dh * k);
  let quality = 0.86, data = canvas.toDataURL('image/jpeg', quality);
  while (data.length > 900000 && quality > 0.5) { quality -= 0.08; data = canvas.toDataURL('image/jpeg', quality); }
  return data;
}

async function saveCrop () {
  const save = $('cropSave');
  const err = $('cropErr');
  save.disabled = true;
  save.textContent = 'Envoi…';
  try {
    await DB.setImage(crop.slot.id, cropDataUrl());
    save.textContent = 'Enregistrer';
    closeCrop();
    await loadImages();
  } catch (e) {
    console.error(e);
    err.textContent = "Envoi impossible. Vérifiez votre connexion, puis réessayez.";
    err.style.display = 'block';
    save.disabled = false;
    save.textContent = 'Enregistrer';
  }
}

/* suppression */

function openDeleteModal () {
  $('delCount').textContent =
    `${allCount} enregistrement${allCount > 1 ? 's' : ''} (réponses complètes ou non) et les adresses e-mail laissées pour les résultats seront supprimés définitivement, pour tout le monde. Pensez à exporter le fichier Excel avant.`;
  $('delStep1').hidden = false;
  $('delStep2').hidden = true;
  $('delInput').value = '';
  $('delGo').disabled = true;
  $('delErr').style.display = 'none';
  $('delModal').hidden = false;
}

function closeDeleteModal () {
  $('delModal').hidden = true;
}

function deleteStep2 () {
  $('delStep1').hidden = true;
  $('delStep2').hidden = false;
  $('delInput').focus();
}

async function confirmDelete () {
  const go  = $('delGo');
  const err = $('delErr');
  if ($('delInput').value.trim() !== 'supprimer') return;
  go.disabled = true;
  go.textContent = 'Suppression…';
  try {
    await DB.deleteAll();
    closeDeleteModal();
  } catch (e) {
    console.error(e);
    err.textContent = 'Suppression impossible. Vérifiez votre connexion et vos droits, puis réessayez.';
    err.style.display = 'block';
  }
  go.textContent = 'Supprimer définitivement';
  go.disabled = $('delInput').value.trim() !== 'supprimer';
}

function bindDeleteModal () {
  const modal = $('delModal');
  $('delInput').addEventListener('input', e => {
    $('delGo').disabled = e.target.value.trim() !== 'supprimer';
  });
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeDeleteModal));
  modal.addEventListener('click', e => { if (e.target === modal) closeDeleteModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDeleteModal(); });
}
