const CONFIG = {
  SIGN_WORD: 'situation',
  SIGNS: [
    { id: 'situation_1', label: '', image: 'signs/situation-1.jpg?v=5', zoom: 1.3, aspect: 'pertinent',  focus: 'les plus utiles',  question: "Selon vous, quelles sont les informations les plus utiles de ce panneau ?" },
    { id: 'situation_2', label: '', image: 'signs/situation-2.jpg?v=7', zoom: 1.3, aspect: 'inutile',    focus: 'les moins utiles', question: "Selon vous, quelles sont les informations les moins utiles ?" }
  ],
  ACCUEIL: [
    { id: 'accueil_1', label: 'Installation 1', image: 'accueil/accueil-1.jpg?v=1' },
    { id: 'accueil_2', label: 'Installation 2', image: 'accueil/accueil-2.jpg?v=1' },
    { id: 'accueil_3', label: 'Installation 3', image: 'accueil/accueil-3.jpg?v=1' },
    { id: 'accueil_4', label: 'Installation 4', image: 'accueil/accueil-4.jpg?v=2' }
  ],
  MAX_CLICKS: 3,
  ZOOM: 2.5
};

const SCHEMA_VERSION = 2;

function signTitle (sign) {
  let name = sign.label;
  if (!name) {
    const word = CONFIG.SIGN_WORD.charAt(0).toUpperCase() + CONFIG.SIGN_WORD.slice(1);
    name = `${word} ${CONFIG.SIGNS.indexOf(sign) + 1}`;
  }
  return sign.aspect ? `${name} · ${sign.aspect}` : name;
}

function setTitle (el, text) {
  el.textContent = text.replace(/ ([?!:;])/g, '\u00A0$1');
  el.innerHTML = el.innerHTML
    .replace(/[\p{L}']+(?:-[\p{L}']+)+/gu, m => `<span style="white-space:nowrap">${m}</span>`)
    .replace(/\n/g, '<br>');
}

function highlight (el, focus) {
  if (focus) el.innerHTML = el.innerHTML.replace(focus, `<span class="hl">${focus}</span>`);
}

function signMarkup (sign) {
  return sign.image
    ? `<img class="sign-surface" src="${sign.image}" alt="" draggable="false">`
    : '<div class="sign-surface sign-grid"></div>';
}

function accueilMarkup (a) {
  return a.image
    ? `<img src="${a.image}" alt="${a.label}" draggable="false">`
    : '<div class="sign-grid"></div>';
}

function renderAccueil () {
  const picks = $('accueilPicks');
  if (!picks) return;
  picks.innerHTML = CONFIG.ACCUEIL.map((a, i) =>
    `<button class="opt pick" data-value="${a.id}">${accueilMarkup(a)}<span class="pick-num">${i + 1}</span></button>`
  ).join('');
}

const state = {
  sessionId: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
  startTime: Date.now(),
  currentStepIndex: 0,
  currentSignIndex: 0,
  currentSignClicks: [],
  signOrder: null,
  signDrafts: {},
  signShownAt: 0,
  responses: {
    pratiquant: null,
    activites: [],
    frequence: null,
    destinations: [],
    preparation_rando: null,
    hors_sentier: null,
    attention_signaletique: [],
    raisons_non_lecture: [],
    sign_interactions: {},
    sign_order: [],
    accueil: null,
    age: null, csp: null, genre: null, type_visite: []
  }
};

const ALL_STEPS = [
  'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8',
  'signs', 'q_accueil',
  'q_visite', 'q_age', 'q_csp', 'q_genre',
  'merci'
];

const STEP_KEYS = {
  q2: 'activites', q3: 'frequence', q4: 'destinations', q5: 'preparation_rando',
  q6: 'hors_sentier', q8: 'raisons_non_lecture'
};

function $ (id) { return document.getElementById(id); }

function asList (v) { return Array.isArray(v) ? v : (v ? [v] : []); }
function readsAll (list) { return list.length === 1 && list[0] === 'lis_tout'; }

function buildSteps () {
  const r = state.responses;
  const pratique = r.pratiquant === 'oui';
  return ALL_STEPS.filter(s => {
    if (s === 'q2' || s === 'q3' || s === 'q4' || s === 'q6') return pratique;
    if (s === 'q5') return pratique && r.activites.includes('rando');
    if (s === 'q8') return r.attention_signaletique.length > 0 && !readsAll(r.attention_signaletique);
    return true;
  });
}

const DUR = 380;
let navBusy = false;
let autoTimer = null;

function navigate (direction) {
  if (navBusy) return;
  if (direction === 'forward' && !validateCurrent()) return;

  const steps  = buildSteps();
  const fromId = steps[state.currentStepIndex];

  if (direction === 'back') {
    if (fromId === 'signs' && state.currentSignIndex > 0) {
      state.currentSignIndex--;
      renderSign(state.currentSignIndex);
      return;
    }
    if (state.currentStepIndex <= 0) { window.location.href = 'index.html'; return; }
    state.currentStepIndex--;
  } else {
    if (state.currentStepIndex >= steps.length - 1) return;
    state.currentStepIndex++;
  }

  navBusy = true;
  const toId   = steps[state.currentStepIndex];
  const fromEl = $(fromId);
  const toEl   = $(toId);

  fromEl.style.animation = `${direction === 'forward' ? 'exitFwd' : 'exitBack'} ${DUR}ms ease forwards`;

  setTimeout(() => {
    fromEl.classList.remove('active');
    fromEl.style.animation = '';
    toEl.classList.add('active');
    toEl.style.animation = `${direction === 'forward' ? 'enterFwd' : 'enterBack'} ${DUR}ms ease forwards`;
    updateProgress(steps);
    $('stage').classList.toggle('stage-signs', toId === 'signs' || toId === 'q_accueil');
    $('stage').classList.toggle('stage-center', toId === 'merci');
    if (toId === 'signs') initSignSection(direction);
    fitSlide(toEl);
    navBusy = false;
  }, DUR * 0.6);
}

function nextStep () { navigate('forward'); }
function prevStep () { navigate('back'); }

function updateProgress (steps) {
  steps = steps || buildSteps();
  const total   = steps.length - 1;
  const current = state.currentStepIndex;
  const pct     = total > 0 ? Math.round(Math.min(current / total, 1) * 100) : 0;

  const fill = $('progressFill');
  if (fill) fill.style.width = pct + '%';

  const back = $('headerBack');
  if (back) back.classList.toggle('visible', steps[current] !== 'merci');
}

function fitSlide (el) {
  const stage = $('stage');
  if (!el || !stage) return;
  el.style.zoom = '';
  const cs    = getComputedStyle(stage);
  const avail = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h     = el.offsetHeight;
  if (h > avail) el.style.zoom = Math.max(0.6, avail / h).toFixed(3);
}

function onOptionClick (e) {
  const opt   = e.target.closest('.opt');
  const slide = opt && opt.closest('.slide');
  if (!slide || !slide.dataset.key) return;

  const key   = slide.dataset.key;
  const value = opt.dataset.value;
  const err   = slide.querySelector('.err');
  if (err) err.style.display = 'none';

  if (slide.dataset.type === 'multi') {
    const arr = state.responses[key];
    const i = arr.indexOf(value);
    if (i === -1) {
      const exclusive = v => slide.querySelector(`.opt[data-value="${v}"]`).hasAttribute('data-exclusive');
      const keep = opt.hasAttribute('data-exclusive') ? [] : arr.filter(v => !exclusive(v));
      arr.splice(0, arr.length, ...keep, value);
    } else {
      arr.splice(i, 1);
    }
    slide.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', arr.includes(o.dataset.value)));
    updateNextBtn(slide);
    return;
  }

  state.responses[key] = value;
  slide.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o === opt));
  updateNextBtn(slide);
  if ('auto' in slide.dataset) {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { if (slide.classList.contains('active')) nextStep(); }, 300);
  }
}

function updateNextBtn (slide) {
  const btn = slide.querySelector('.btn-next');
  if (!btn || !slide.dataset.key || state.saving) return;
  const v = state.responses[slide.dataset.key];
  btn.disabled = slide.dataset.type === 'multi' ? v.length === 0 : v == null;
}

function validateCurrent () {
  const slide = $(buildSteps()[state.currentStepIndex]);
  if (!slide || !slide.dataset.key) return true;
  const v  = state.responses[slide.dataset.key];
  const ok = slide.dataset.type === 'multi' ? v.length > 0 : v != null;
  if (!ok) showErr(slide);
  return ok;
}

function showErr (slide, message) {
  const el = slide.querySelector('.err');
  if (!el) return;
  if (!el.dataset.def) el.dataset.def = el.textContent;
  el.textContent = message || el.dataset.def;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, message ? 5000 : 2800);
}

function initSignSection (direction) {
  if (!state.signOrder) {
    state.signOrder = [...CONFIG.SIGNS];
    state.responses.sign_order = state.signOrder.map(s => s.id);
  }
  state.currentSignIndex = direction === 'back' ? state.signOrder.length - 1 : 0;
  renderSign(state.currentSignIndex);
}

function renderSign (index) {
  const sign = state.signOrder[index];
  const lbl    = $('signLabel');
  const prog   = $('signProg');
  const title = $('signTitle');
  if (title)  { setTitle(title, sign.question || ''); highlight(title, sign.focus); }
  if (lbl)    lbl.textContent    = sign.label || CONFIG.SIGN_WORD;
  if (prog)   prog.textContent   = `${index + 1} / ${state.signOrder.length}`;
  const ph = $('signPlaceholder');
  if (ph) ph.innerHTML = signMarkup(sign);
  $('signLensView').innerHTML = signMarkup(sign);
  const ov = $('signOverlay');
  if (ov) ov.innerHTML = '';
  state.currentSignClicks = [];
  state.signShownAt = Date.now();
  (state.signDrafts[sign.id] || []).forEach(c => { state.currentSignClicks.push(c); addDot(c); });
  showBrief(sign);
  updateClickUI();
  fitSlide($('signs'));
}

function showBrief (sign) {
  const brief = $('signBrief');
  if (!brief) return;
  clearTimeout(state.briefTimer);
  const seen = state.signDrafts[sign.id];
  brief.classList.toggle('on', !seen);
  $('signs').classList.toggle('briefing', !seen);
  if (seen) return;
  const q = $('signBriefText');
  setTitle(q, sign.question || '');
  highlight(q, sign.focus);
  state.briefTimer = setTimeout(closeBrief, 3000);
}

function closeBrief () {
  if (!$('signs').classList.contains('active')) return;
  $('signBrief').classList.remove('on');
  $('signs').classList.remove('briefing');
  saveSignDraft();
}

function handleSignClick (e) {
  if ($('signBrief').classList.contains('on')) return;
  if (state.currentSignClicks.length >= CONFIG.MAX_CLICKS) return;
  const wrapper = $('signWrapper');
  const rect    = wrapper.getBoundingClientRect();
  const x = +((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
  const y = +((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
  const click = { x, y, order: state.currentSignClicks.length + 1, t: Date.now() - state.startTime, dt: Date.now() - state.signShownAt };
  state.currentSignClicks.push(click);
  saveSignDraft();
  addDot(click);
  updateClickUI();
}

function addDot (click) {
  const dot = document.createElement('div');
  dot.className  = 'click-dot';
  dot.textContent = click.order;
  dot.style.left  = click.x + '%';
  dot.style.top   = click.y + '%';
  $('signOverlay').appendChild(dot);
  $('signLensView').appendChild(dot.cloneNode(true));
}

function moveLens (e) {
  const lens = $('signLens');
  if (!lens || !document.querySelector('#signPlaceholder img') || e.pointerType !== 'mouse' || $('signBrief').classList.contains('on')) { hideLens(); return; }
  const ph   = $('signPlaceholder');
  const rect = ph.getBoundingClientRect();
  const view = $('signLensView');
  const k = rect.width / ph.offsetWidth;
  const x = (e.clientX - rect.left) / k, y = (e.clientY - rect.top) / k;
  const sign = state.signOrder[state.currentSignIndex];
  lens.style.width = lens.style.height = (sign.lens || 220) + 'px';
  const r = lens.offsetWidth / 2;
  const zoom = sign.zoom || CONFIG.ZOOM;
  view.style.width  = ph.offsetWidth  * zoom + 'px';
  view.style.height = ph.offsetHeight * zoom + 'px';
  view.style.left   = r - x * zoom + 'px';
  view.style.top    = r - y * zoom + 'px';
  lens.style.left = x + 'px';
  lens.style.top  = y + 'px';
  lens.classList.add('on');
}

function hideLens () {
  const lens = $('signLens');
  if (lens) lens.classList.remove('on');
}

function saveSignDraft () {
  state.signDrafts[state.signOrder[state.currentSignIndex].id] = [...state.currentSignClicks];
}

function resetSign () {
  state.currentSignClicks = [];
  saveSignDraft();
  $('signOverlay').innerHTML = '';
  $('signLensView').querySelectorAll('.click-dot').forEach(d => d.remove());
  updateClickUI();
}

function nextSign () {
  if (state.currentSignClicks.length < CONFIG.MAX_CLICKS) return;
  state.responses.sign_interactions[state.signOrder[state.currentSignIndex].id] = [...state.currentSignClicks];
  const next = state.currentSignIndex + 1;
  if (next >= state.signOrder.length) { nextStep(); return; }
  state.currentSignIndex = next;
  renderSign(next);
}

function updateClickUI () {
  const n = state.currentSignClicks.length;
  document.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', i < n));
  const navBtn = $('signNavBtn');
  if (!navBtn) return;
  const last = state.currentSignIndex >= state.signOrder.length - 1;
  navBtn.disabled = n < CONFIG.MAX_CLICKS;
  const left = CONFIG.MAX_CLICKS - n;
  navBtn.textContent = n === 0 ? `Placez ${left} points`
    : left > 0 ? `${left} point${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`
    : (last ? 'continuer →' : 'suivant →');
}

function isCompleteResponse (r) {
  if (!r || r.v !== SCHEMA_VERSION) return false;
  const list = k => Array.isArray(r[k]) && r[k].length > 0;
  if (['pratiquant', 'age', 'csp', 'genre'].some(k => !r[k])) return false;
  const attention = asList(r.attention_signaletique);
  if (!attention.length) return false;
  if (!list('type_visite') && !(typeof r.type_visite === 'string' && r.type_visite)) return false;
  if (r.pratiquant === 'oui') {
    if (!list('activites') || !list('destinations') || !r.frequence || !r.hors_sentier) return false;
    if (r.activites.includes('rando') && !r.preparation_rando) return false;
  }
  if (!readsAll(attention) && !list('raisons_non_lecture')) return false;
  const si = r.sign_interactions || {};
  return CONFIG.SIGNS.every(sg => Array.isArray(si[sg.id]) && si[sg.id].length >= CONFIG.MAX_CLICKS);
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
]);

async function submitSurvey () {
  const slide = $('q_genre');
  if (!state.responses.genre) { showErr(slide); return; }
  if (state.saving) return;

  const r = state.responses;
  const steps = buildSteps();
  Object.entries(STEP_KEYS).forEach(([id, key]) => {
    if (!steps.includes(id)) r[key] = Array.isArray(r[key]) ? [] : null;
  });

  const record = { ...r, v: SCHEMA_VERSION, session_id: state.sessionId, timestamp: new Date().toISOString(),
    duration_s: Math.round((Date.now() - state.startTime) / 1000) };
  if (!isCompleteResponse(record)) return;

  const btn   = slide.querySelector('.btn-next');
  const label = btn.textContent;
  state.saving = true;
  btn.disabled = true;
  btn.textContent = 'envoi…';

  try {
    await withTimeout(DB.save(record), 20000);
  } catch (e) {
    console.error(e);
    state.saving = false;
    btn.disabled = false;
    btn.textContent = label;
    showErr(slide, 'Envoi impossible. Vérifiez votre connexion puis réessayez.');
    return;
  }
  state.saving = false;
  nextStep();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!$('stage')) return;
  document.querySelectorAll('.q-title').forEach(t => {
    t.innerHTML = t.innerHTML.replace(/[\p{L}']+(?:-[\p{L}']+)+/gu, m => `<span style="white-space:nowrap">${m}</span>`);
  });
  const steps = buildSteps();
  const first = $(steps[0]);
  if (first) { first.classList.add('active'); first.style.animation = 'none'; fitSlide(first); }
  updateProgress(steps);
  renderAccueil();
  document.querySelectorAll('.slide[data-key]').forEach(updateNextBtn);
  document.addEventListener('click', onOptionClick);
  const wrapper = $('signWrapper');
  if (wrapper) {
    wrapper.addEventListener('click', handleSignClick);
    wrapper.addEventListener('pointermove', moveLens);
    wrapper.addEventListener('pointerleave', hideLens);
  }
  window.addEventListener('resize', () => fitSlide($(buildSteps()[state.currentStepIndex])));
});
