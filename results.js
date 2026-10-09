const ATTN_LABELS = {
  lis_tout:       'Lisent tout',
  partiellement:  'Survolent',
  carte:          'Regardent surtout la carte',
  reglement:      'Cherchent les règles et interdictions',
  sensibilisation:'Lisent surtout les messages de sensibilisation',
  ne_lis_pas:     'Ne s\'arrêtent pas aux panneaux'
};

let lastData  = [];
let allCount  = 0;
let unsubscribe = null;
let renderToken = 0;

function pct (n, total) { return total === 0 ? 0 : Math.round(n / total * 100); }

function renderStats (data) {
  const total       = data.length;
  const pratiquants = data.filter(r => r.pratiquant === 'oui').length;
  const horsSentier = data.filter(r => ['parfois', 'souvent', 'oui'].includes(r.hors_sentier)).length;
  const lisTout     = data.filter(r => asList(r.attention_signaletique).includes('lis_tout')).length;
  const neLisPas    = data.filter(r => asList(r.attention_signaletique).includes('ne_lis_pas')).length;

  const container = document.getElementById('statsRow');
  if (!container) return;
  container.innerHTML = '';

  [
    { val: total,                        lbl: 'Réponses'     },
    { val: pct(pratiquants, total) + '%', lbl: 'Pratiquants'  },
    { val: pct(horsSentier, total) + '%', lbl: 'Hors-sentier' },
    { val: pct(lisTout, total) + '%',     lbl: 'Lit tout'     },
    { val: pct(neLisPas, total) + '%',    lbl: 'Ne s\'arrête pas' }
  ].forEach(s => {
    const d = document.createElement('div');
    d.className = 'stat-card';
    d.innerHTML = `<div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div>`;
    container.appendChild(d);
  });

  const el = document.getElementById('totalResponses');
  if (el) el.textContent = `${total} réponse${total > 1 ? 's' : ''}`;
}

function renderBarChart (data) {
  const container = document.getElementById('barChart');
  if (!container) return;
  if (!data.length) { container.innerHTML = '<p class="empty">Aucune donnée disponible.</p>'; return; }

  const counts = {};
  Object.keys(ATTN_LABELS).forEach(k => counts[k] = 0);
  data.forEach(r => asList(r.attention_signaletique).forEach(v => { if (v in counts) counts[v]++; }));

  const total = data.length;

  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `
    <div class="bar-row">
      <div class="bar-lbl">${ATTN_LABELS[k]}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct(n, total)}%;"></div></div>
      <div class="bar-val"><b>${pct(n, total)} %</b> <span>(${n} sur ${total})</span></div>
    </div>
  `).join('');

  container.innerHTML = rows;
}

function renderHeatmaps (data) {
  const grid = document.getElementById('heatmapsGrid');
  if (!grid) return;

  grid.innerHTML = '';
  const token = ++renderToken;

  if (!data.length) {
    grid.innerHTML = '<p class="empty" style="grid-column:1/-1;">Aucune donnée pour le moment.</p>';
    return;
  }

  CONFIG.SIGNS.forEach(sign => {
    const allClicks = [];
    data.forEach(session => {
      const si = session.sign_interactions;
      if (si && typeof si === 'object') {
        const clicks = Array.isArray(si[sign.id]) ? si[sign.id] : [];
        allClicks.push(...clicks);
      }
    });

    const card = document.createElement('div');
    card.className = 'hmap-card';
    card.innerHTML = `
      <div class="hmap-header">
        <span class="hmap-title">${signTitle(sign)}</span>
        <span class="hmap-badge">${allClicks.length} clic${allClicks.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="hmap-body" id="hmap_${sign.id}"></div>
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
  const el = document.getElementById('status');
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
  renderBarChart(lastData);
  renderHeatmaps(lastData);
}

function startResults () {
  if (unsubscribe) return;
  const note = document.getElementById('localNote');
  if (note) note.style.display = DB.mode === 'local' ? 'block' : 'none';
  setStatus('connecting');
  unsubscribe = DB.subscribe(render, err => console.error(err), setStatus);
}

function stopResults () {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

async function refreshResults (btn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'actualisation…';
  try { await DB.refresh(); } finally { btn.disabled = false; btn.textContent = label; }
}

function openDeleteModal () {
  document.getElementById('delCount').textContent =
    `${allCount} enregistrement${allCount > 1 ? 's' : ''} (réponses complètes ou non) seront supprimés définitivement, pour tout le monde. Pensez à exporter le CSV avant.`;
  document.getElementById('delStep1').hidden = false;
  document.getElementById('delStep2').hidden = true;
  document.getElementById('delInput').value = '';
  document.getElementById('delGo').disabled = true;
  document.getElementById('delErr').style.display = 'none';
  document.getElementById('delModal').hidden = false;
}

function closeDeleteModal () {
  document.getElementById('delModal').hidden = true;
}

function deleteStep2 () {
  document.getElementById('delStep1').hidden = true;
  document.getElementById('delStep2').hidden = false;
  document.getElementById('delInput').focus();
}

async function confirmDelete () {
  const go  = document.getElementById('delGo');
  const err = document.getElementById('delErr');
  if (document.getElementById('delInput').value.trim() !== 'supprimer') return;
  go.disabled = true;
  go.textContent = 'suppression…';
  try {
    await DB.deleteAll();
    closeDeleteModal();
  } catch (e) {
    console.error(e);
    err.textContent = 'Suppression impossible. Vérifiez votre connexion et vos droits, puis réessayez.';
    err.style.display = 'block';
  }
  go.textContent = 'supprimer définitivement';
  go.disabled = document.getElementById('delInput').value.trim() !== 'supprimer';
}

function bindDeleteModal () {
  const modal = document.getElementById('delModal');
  document.getElementById('delInput').addEventListener('input', e => {
    document.getElementById('delGo').disabled = e.target.value.trim() !== 'supprimer';
  });
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeDeleteModal));
  modal.addEventListener('click', e => { if (e.target === modal) closeDeleteModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDeleteModal(); });
}
