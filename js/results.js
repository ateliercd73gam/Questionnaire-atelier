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
    { title: 'Pratique une activité de pleine nature', map: XL.pratique, ordered: true, values: r => listOf(r.pratique) },
    { title: 'Activités pratiquées', map: XL.activites, values: r => listOf(r.activites).map(actKey), note: 'Plusieurs réponses possibles' },
    { title: 'Niveau par activité', stack: 'niveau' },
    { title: 'Fréquence', split: 'frequence', map: XL.frequence, ordered: true, order: FREQS.map(([k]) => k), values: r => listOf(r.activites).map(a => (r.frequence || {})[a]).filter(Boolean), per: 'activité' },
    { title: 'Ce qui est recherché', map: XL.motif, values: r => listOf(r.motif_pratique), note: 'Plusieurs réponses possibles' },
    { title: 'Saison(s) de pratique', map: XL.saisons, ordered: true, values: r => listOf(r.saisons), note: 'Plusieurs réponses possibles' }
  ] },
  { title: 'Préparation', panels: [
    { title: 'Préparation des sorties (par activité)', map: XL.preparation, ordered: true, values: r => prepValues(r), per: 'activité' },
    { title: 'Moyens de préparation', map: XL.moyens, values: r => listOf(r.moyens), note: 'Plusieurs réponses possibles' },
    { title: 'Délai de préparation', map: XL.delai, ordered: true, values: r => listOf(r.delai_preparation) },
    { title: 'Informations recherchées avant de partir', text: r => r.infos_recherchees },
    { title: 'Supports utilisés sur place', map: XL.supports, values: r => listOf(r.supports_sur_place), note: 'Plusieurs réponses possibles' },
    { title: 'Informations recherchées sur place', text: r => r.infos_sur_place }
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
    { title: 'Département ou pays de résidence', values: r => listOf(r.departement), top: 10 }
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
    { val: count(prepsBefore),                                     lbl: 'Préparent avant de partir' },
    { val: count(r => ['parfois', 'souvent'].includes(r.hors_sentier)), lbl: 'Quittent les sentiers' },
    { val: count(r => listOf(r.attention_signaletique).includes('lis_tout')), lbl: 'Lisent tout le panneau' }
  ].map(s => `<div class="stat-card"><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`).join('');

  $('totalResponses').textContent = `${total} réponse${total > 1 ? 's' : ''}`;
}

function barsPanel (p, data) {
  const asked = data.filter(r => p.values(r).length);
  const counts = new Map();
  if (p.ordered && p.map) (p.order || Object.keys(p.map)).forEach(k => counts.set(k, 0));
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
    ${switchFor(p)}
    ${body}
  </div>`;
}

const STACKS = {
  niveau:    { keys: LEVELS.map(([k]) => k), labels: XL.niveau,    shades: ['#BCD0C4', '#6F9180', '#244534'],            get: r => r.niveaux },
  frequence: { keys: FREQS.map(([k]) => k),  labels: XL.frequence, shades: ['#244534', '#4F7563', '#8FAE9E', '#C9D9CF'], get: r => r.frequence }
};
const DARK_SHADES = ['#244534', '#4F7563', '#6F9180'];
const VIEWS_KEY = 'atelier_panel_views';
const panelViews = (() => { try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}'); } catch (e) { return {}; } })();

function anyPanel (p, data) {
  if (p.text) return textPanel(p, data);
  if (p.stack) return stackPanel(p, data);
  if (p.split) {
    const html = panelViews[p.split] === 'act'
      ? stackPanel({ ...p, title: p.title + ' par activité', stack: p.split }, data)
      : barsPanel(p, data);
    return html.replace('<div class="panel">', `<div class="panel" id="panel_${p.split}">`);
  }
  return barsPanel(p, data);
}

function switchFor (p) {
  if (!p.split) return '';
  const view = panelViews[p.split] === 'act' ? 'act' : 'global';
  return `<div class="panel-switch" role="group">${[['global', 'Global'], ['act', 'Par activité']].map(([k, l]) =>
    `<button type="button" class="${view === k ? 'on' : ''}" aria-pressed="${view === k}" onclick="setPanelView('${p.split}','${k}')">${l}</button>`).join('')}</div>`;
}

function setPanelView (split, view) {
  panelViews[split] = view;
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(panelViews)); } catch (e) {}
  const el = $('panel_' + split);
  const p = SECTIONS.flatMap(sec => sec.panels || []).find(x => x.split === split);
  if (el && p) el.outerHTML = anyPanel(p, lastData);
}

function stackPanel (p, data) {
  const st = STACKS[p.stack];
  const keys = st.keys;
  const valueOf = (r, a) => { const m = st.get(r); return m && typeof m === 'object' ? m[a] : undefined; };
  const acts = new Map();
  data.forEach(r => listOf(r.activites).forEach(a => {
    const v = valueOf(r, a);
    if (!keys.includes(v)) return;
    const k = actKey(a);
    if (!acts.has(k)) acts.set(k, Object.fromEntries(keys.map(l => [l, 0])));
    acts.get(k)[v]++;
  }));
  const rows = [...acts.entries()]
    .map(([k, c]) => ({ k, c, n: keys.reduce((t, l) => t + c[l], 0) }))
    .sort((a, b) => b.n - a.n);
  const people = data.filter(r => listOf(r.activites).some(a => keys.includes(valueOf(r, a)))).length;
  const shade = l => st.shades[keys.indexOf(l)];

  const legend = keys.map(l => `<span><i style="background:${shade(l)}"></i>${st.labels[l]}</span>`).join('');
  const body = !rows.length ? '<p class="empty">Aucune donnée pour le moment.</p>' : rows.map(({ k, c, n }) => `
    <div class="lvl-row">
      <div class="bar-lbl">${escapeHtml(k === 'autre' ? 'Autre' : xlLabel(XL.activites, k))}</div>
      <div class="lvl-track">${keys.map(l => c[l] ? `<span class="${DARK_SHADES.includes(shade(l)) ? 'dark' : ''}" style="flex:${c[l]};background:${shade(l)}" title="${st.labels[l]} : ${c[l]} (${pct(c[l], n)} %)">${pct(c[l], n) >= 14 ? pct(c[l], n) + ' %' : ''}</span>` : '').join('')}</div>
      <div class="bar-val"><b>${n}</b> <span>pers.</span></div>
    </div>`).join('');

  return `<div class="panel">
    <div class="panel-head"><span class="panel-title">${p.title}</span><span class="panel-sub">${people} répondant${people > 1 ? 's' : ''}</span></div>
    ${switchFor(p)}
    ${rows.length ? `<div class="lvl-legend">${legend}</div>` : ''}
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
    if (sec.heatmaps) inner = '<div id="hmapTools"></div><div class="heatmaps-grid" id="heatmapsGrid"></div>';
    else if (sec.accueil) inner = accueilPanel(data);
    else inner = `<div class="panels">${sec.panels.map(p => anyPanel(p, data)).join('')}</div>`;
    return `<h2 class="results-h">${sec.title}</h2>${inner}`;
  }).join('');
  renderHeatmaps(data);
}

const HMAP_KEY = 'atelier_hmap_view';
const HMAP_MODES  = [['heat', 'Chaleur'], ['dots', 'Points'], ['photo', 'Photo']];
const HMAP_ORDERS = [['all', 'Tous les clics'], ['first', '1er clic']];
const HMAP_GRID = { w: 240, h: 180 };
const HMAP_SIGMA = 0.045;
const HMAP_RAMP = [
  [0.00, 72, 20, 140, 0],
  [0.06, 72, 20, 140, 0],
  [0.14, 96, 32, 180, 0.5],
  [0.32, 200, 30, 90, 0.78],
  [0.52, 226, 35, 26, 0.86],
  [0.74, 245, 140, 30, 0.9],
  [0.90, 247, 197, 30, 0.94],
  [1.00, 255, 246, 214, 0.96]
];
const HMAP_LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 1;
    while (k < HMAP_RAMP.length - 1 && HMAP_RAMP[k][0] < t) k++;
    const a = HMAP_RAMP[k - 1], b = HMAP_RAMP[k];
    const f = (t - a[0]) / (b[0] - a[0]);
    for (let c = 0; c < 4; c++) lut[i * 4 + c] = (a[c + 1] + (b[c + 1] - a[c + 1]) * f) * (c === 3 ? 255 : 1);
  }
  return lut;
})();

const hmapView = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(HMAP_KEY) || '{}'); } catch (e) {}
  return {
    mode:  HMAP_MODES.some(([k]) => k === saved.mode) ? saved.mode : 'heat',
    order: HMAP_ORDERS.some(([k]) => k === saved.order) ? saved.order : 'all'
  };
})();

function setHmapView (key, value) {
  hmapView[key] = value;
  try { localStorage.setItem(HMAP_KEY, JSON.stringify(hmapView)); } catch (e) {}
  renderHeatmapsAgain();
}

function hmapToolbar () {
  const seg = (key, opts) => `<div class="hmap-seg" role="group">${opts.map(([k, l]) =>
    `<button type="button" class="${hmapView[key] === k ? 'on' : ''}" aria-pressed="${hmapView[key] === k}" onclick="setHmapView('${key}','${k}')">${l}</button>`).join('')}</div>`;
  return `<div class="hmap-tools">${seg('mode', HMAP_MODES)}${seg('order', HMAP_ORDERS)}</div>`;
}

function renderHeatmaps (data) {
  const grid = $('heatmapsGrid');
  if (!grid) return;
  const token = ++renderToken;
  const tools = $('hmapTools');
  if (tools) tools.innerHTML = hmapToolbar();

  CONFIG.SIGNS.forEach(sign => {
    const people = [];
    let old = 0;
    data.forEach(r => {
      const clicks = (r.sign_interactions || {})[sign.id];
      if (!Array.isArray(clicks)) return;
      if (versionOf(r, sign) !== sign.imageVersion || (r.v || 0) < (sign.since || 0)) { old++; return; }
      const kept = hmapView.order === 'first'
        ? clicks.filter((c, i) => (c.order || i + 1) === 1)
        : clicks;
      if (kept.length) people.push(kept);
    });
    const nClicks = people.reduce((t, p) => t + p.length, 0);

    const card = document.createElement('div');
    card.className = 'hmap-card';
    card.innerHTML = `
      <div class="hmap-header">
        <span class="hmap-title">${signTitle(sign)}</span>
        <span class="hmap-badge">${people.length} participant${people.length > 1 ? 's' : ''} · ${nClicks} clic${nClicks > 1 ? 's' : ''}</span>
      </div>
      <p class="hmap-q">${escapeHtml(sign.question)}</p>
      <div class="hmap-body mode-${hmapView.mode}" id="hmap_${sign.id}"></div>
      ${old ? `<p class="hmap-old">${old} réponse${old > 1 ? 's' : ''} sur une image ou une question précédente non affichée${old > 1 ? 's' : ''}</p>` : ''}
    `;
    grid.appendChild(card);

    requestAnimationFrame(() => {
      setTimeout(() => { if (token === renderToken) buildHeatmap(sign, people); }, 40);
    });
  });
}

function hmapDensity (clicks) {
  const { w, h } = HMAP_GRID;
  const grid = new Float32Array(w * h);
  const s = HMAP_SIGMA * w;
  const reach = Math.ceil(s * 3);
  const inv = 1 / (2 * s * s);
  clicks.forEach(c => {
    const cx = c.x / 100 * w, cy = c.y / 100 * h;
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(w - 1, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(h - 1, Math.ceil(cy + reach));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        grid[y * w + x] += Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  });
  let max = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i];
  return { grid, max };
}

function hmapPeaks ({ grid, max }, people) {
  const { w, h } = HMAP_GRID;
  const s = HMAP_SIGMA * w;
  const cand = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const v = grid[y * w + x];
      if (v < max * 0.3) continue;
      let top = true;
      for (let j = -1; j <= 1 && top; j++) for (let i = -1; i <= 1; i++) {
        if ((i || j) && grid[(y + j) * w + x + i] > v) { top = false; break; }
      }
      if (top) cand.push({ x, y, v });
    }
  }
  cand.sort((a, b) => b.v - a.v);
  const kept = [];
  cand.forEach(c => {
    if (kept.length < 5 && kept.every(k => Math.hypot(k.x - c.x, k.y - c.y) > s * 2.6)) kept.push(c);
  });
  const reach = s * 1.6;
  return kept.map(p => {
    const n = people.filter(clicks => clicks.some(c =>
      Math.hypot(c.x / 100 * w - (p.x + 0.5), c.y / 100 * h - (p.y + 0.5)) <= reach)).length;
    return { x: (p.x + 0.5) / w * 100, y: (p.y + 0.5) / h * 100, n, share: pct(n, people.length) };
  });
}

function buildHeatmap (sign, people) {
  const container = document.getElementById(`hmap_${sign.id}`);
  if (!container) return;
  container.innerHTML = signMarkup(sign);

  const clicks = people.flat();
  if (!clicks.length || hmapView.mode === 'photo') return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hmap-canvas';
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');

  if (hmapView.mode === 'dots') {
    const r = 11;
    clicks.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x / 100 * canvas.width, c.y / 100 * canvas.height, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(247, 197, 30, 0.9)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#17211C';
      ctx.stroke();
    });
    container.appendChild(canvas);
    return;
  }

  const dens = hmapDensity(clicks);
  const { w, h } = HMAP_GRID;
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(w, h);
  for (let i = 0; i < dens.grid.length; i++) {
    const k = Math.min(255, Math.round(dens.grid[i] / dens.max * 255)) * 4;
    img.data[i * 4]     = HMAP_LUT[k];
    img.data[i * 4 + 1] = HMAP_LUT[k + 1];
    img.data[i * 4 + 2] = HMAP_LUT[k + 2];
    img.data[i * 4 + 3] = HMAP_LUT[k + 3];
  }
  sctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  container.appendChild(canvas);

  const pins = document.createElement('div');
  pins.className = 'hmap-pins';
  pins.innerHTML = hmapPeaks(dens, people).map((p, i) => `
    <div class="hmap-peak${p.x > 78 ? ' left' : ''}" style="left:${p.x}%;top:${p.y}%"
      title="${p.n} participant${p.n > 1 ? 's' : ''} sur ${people.length} ont cliqué dans cette zone">
      <b class="hmap-pin">${i + 1}</b><span>${p.share} %</span>
    </div>`).join('');
  container.appendChild(pins);
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
