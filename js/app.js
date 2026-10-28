const CONFIG = {
  SIGN_WORD: 'situation',
  SIGNS: [
    { id: 'situation_1', label: '', image: 'signs/situation-1.jpg?v=6', zoom: 1.3, aspect: 'pertinent',  focus: 'les plus utiles',  question: "Selon vous, quelles sont les informations les plus utiles de ce panneau ?" },
    { id: 'situation_2', label: '', image: 'signs/situation-2.jpg?v=7', zoom: 1.3, aspect: 'inutile',    focus: 'les moins utiles', question: "Selon vous, quelles sont les informations les moins utiles de ce panneau ?" }
  ],
  ACCUEIL: [
    { id: 'accueil_1', label: 'Installation 1', image: 'accueil/accueil-1.jpg?v=1' },
    { id: 'accueil_2', label: 'Installation 2', image: 'accueil/accueil-2.jpg?v=1' },
    { id: 'accueil_3', label: 'Installation 3', image: 'accueil/accueil-3.jpg?v=1' },
    { id: 'accueil_4', label: 'Installation 4', image: 'accueil/accueil-4.jpg?v=3' }
  ],
  SMILEYS: [
    { value: 1, label: 'Pas du tout', mouth: '<path d="M8 16.5q4-3.5 8 0"/>' },
    { value: 2, label: 'Un peu',      mouth: '<path d="M8.5 15.5h7"/>' },
    { value: 3, label: 'Assez',       mouth: '<path d="M8 14q4 3.5 8 0"/>' },
    { value: 4, label: 'Beaucoup',    mouth: '<path d="M7.5 13.5q4.5 6 9 0z" fill="currentColor"/>' }
  ],
  MIN_CLICKS: 1,
  MAX_CLICKS: 3,
  ZOOM: 2.5
};

const SCHEMA_VERSION = 6;
const LEVELS = [
  ['debutant',      'Débutant',      'M2 13 L12 3 L22 13 Z'],
  ['intermediaire', 'Intermédiaire', 'M1 13 L8 5 L12 9 L16 5 L23 13 Z'],
  ['avance',        'Avancé',        'M1 13 L6 8 L9 10.5 L12 4.5 L15 10.5 L18 8 L23 13 Z M11.5 5 V0 H12.5 V5 Z M12.5 0 L16.5 1.3 L12.5 2.6 Z']
];
const FREQS = [
  ['plusieurs_semaine', 'Plusieurs fois par semaine'],
  ['semaine',           'Chaque semaine'],
  ['mois',              '1 à 2 fois par mois'],
  ['annee',             'Quelques fois par an']
];
const ACT_NOUNS = {
  rando: 'la randonnée', trail: 'le trail', promenade: 'la promenade', orientation: "la course d'orientation",
  vtt: 'le VTT', vttae: 'le VTT électrique', escalade: "l'escalade", via_ferrata: 'la via ferrata',
  parapente: 'le parapente', ski_fond: 'le ski de fond', ski_rando: 'le ski de randonnée', raquettes: 'la raquette',
  biathlon: 'le biathlon', peche: 'la pêche', chasse: 'la chasse', equitation: "l'équitation"
};
const MOYENS_LIEUX = {
  internet: 'sur Internet', reseaux: 'sur les réseaux sociaux', appli: 'dans les applications de sentiers',
  tourisme: 'auprès des offices de tourisme', papier: 'dans les cartes et guides papier', proches: 'auprès de vos proches'
};
const MOBILE = window.matchMedia('(max-width: 600px)');

function esc (str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const IMAGE_SLOTS = [...CONFIG.SIGNS, ...CONFIG.ACCUEIL];
IMAGE_SLOTS.forEach(s => { s.defaultImage = s.image; s.imageVersion = 'origine'; });

function applyImages (images) {
  IMAGE_SLOTS.forEach(s => {
    const custom = images && images[s.id];
    s.image = custom ? custom.data : s.defaultImage;
    s.imageVersion = custom ? custom.v : 'origine';
  });
}

function slotTitle (slot) {
  return CONFIG.SIGNS.includes(slot) ? signTitle(slot) : slot.label;
}

function signTitle (sign) {
  let name = sign.label;
  if (!name) {
    const word = CONFIG.SIGN_WORD.charAt(0).toUpperCase() + CONFIG.SIGN_WORD.slice(1);
    name = `${word} ${CONFIG.SIGNS.indexOf(sign) + 1}`;
  }
  return sign.aspect ? `${name} · ${sign.aspect}` : name;
}

function adaptTitles () {
  const list = state.responses.activites;
  const one  = list.length === 1 ? ACT_NOUNS[list[0]] || `l'activité «\u00a0${activityName(list[0])}\u00a0»` : '';
  document.querySelectorAll('.q-title[data-many]').forEach(t =>
    setTitle(t, list.length > 1 ? t.dataset.many : t.dataset.one.replace('{act}', one)));
  const where = Object.keys(MOYENS_LIEUX).filter(m => state.responses.moyens.includes(m)).map(m => MOYENS_LIEUX[m]);
  if (where.length) setTitle($('infosTitle'), `Quelles informations venez-vous trouver ${frenchList(where)} ?`);
}

function frenchList (items) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}` : items[0];
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

function smileyMarkup (s) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="12" cy="12" r="10"/><circle cx="9" cy="9.5" r=".7" fill="currentColor"/><circle cx="15" cy="9.5" r=".7" fill="currentColor"/>'
    + s.mouth + '</svg>';
}

function renderAccueil () {
  if (!$('rateImg')) return;
  const n = CONFIG.ACCUEIL.length;
  $('rateImg').innerHTML = CONFIG.ACCUEIL.map((a, i) =>
    `<div class="rate-photo" data-i="${i}">${accueilMarkup(a)}<span class="pick-num">${i + 1} / ${n}</span>`
    + `<button type="button" class="rate-zoom" aria-label="Agrandir la photo"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg></button></div>`).join('');
  $('rateSmileys').innerHTML = CONFIG.SMILEYS.map(s =>
    `<button type="button" class="smiley" data-value="${s.value}">${smileyMarkup(s)}<span>${s.label}</span></button>`).join('');
  $('rateThumbs').innerHTML = CONFIG.ACCUEIL.map((a, i) =>
    `<button type="button" class="rate-thumb" data-i="${i}" aria-label="${a.label}">${accueilMarkup(a)}<span class="rate-badge"></span></button>`).join('');
  showAccueil(0);
}

function showAccueil (i) {
  const notes = state.responses.accueil_notes;
  accueilIndex = i;
  $('rateImg').querySelectorAll('.rate-photo').forEach(p => p.classList.toggle('on', +p.dataset.i === i));
  $('rateSmileys').querySelectorAll('.smiley').forEach(b => b.classList.toggle('sel', +b.dataset.value === notes[CONFIG.ACCUEIL[i].id]));
  $('rateThumbs').querySelectorAll('.rate-thumb').forEach((t, j) => {
    const note = notes[CONFIG.ACCUEIL[j].id];
    t.classList.toggle('on', j === i);
    t.classList.toggle('done', !!note);
    const badge = t.querySelector('.rate-badge');
    badge.dataset.value = note || '';
    badge.innerHTML = note ? smileyMarkup(CONFIG.SMILEYS[note - 1]) : '';
  });
}

function openLightbox (src, alt) {
  const box = $('lightbox');
  const img = box.querySelector('img');
  img.src = src; img.alt = alt || '';
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add('on'));
  box.querySelector('.lightbox-close').focus();
}

function closeLightbox () {
  const box = $('lightbox');
  if (box.hidden) return;
  box.classList.remove('on');
  setTimeout(() => { if (!box.classList.contains('on')) box.hidden = true; }, 200);
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
    activites: [],
    frequence: {},
    niveaux: {},
    motif_pratique: [],
    saisons: null,
    preparation: null,
    moyens: [],
    infos_recherchees: '',
    delai_preparation: null,
    hors_sentier: null,
    hors_sentier_raisons: [],
    attention_signaletique: [],
    raisons_non_lecture: [],
    sign_interactions: {},
    sign_order: [],
    accueil_notes: {},
    besoins: '',
    type_visite: [],
    age: null, csp: null, departement: '', genre: null,
    precisions: {}
  }
};

const ALL_STEPS = [
  'q_activites', 'q_frequence', 'q_motif', 'q_saisons',
  'q_preparation', 'q_moyens', 'q_infos', 'q_delai',
  'q_hors_sentier', 'q_hors_raisons', 'q7', 'q8',
  'signs', 'q_accueil', 'q_besoins',
  'q_visite', 'q_age', 'q_csp', 'q_departement', 'q_genre',
  'q_fin', 'merci'
];

const STEP_KEYS = {
  q_moyens: 'moyens', q_infos: 'infos_recherchees', q_delai: 'delai_preparation',
  q_hors_raisons: 'hors_sentier_raisons', q8: 'raisons_non_lecture'
};

function $ (id) { return document.getElementById(id); }

function asList (v) { return Array.isArray(v) ? v : (v ? [v] : []); }
function readsAll (list) { return list.length === 1 && list[0] === 'lis_tout'; }
function prepares (r) { return !!r.preparation && r.preparation !== 'aucune'; }
function leavesTrail (r) { return r.hors_sentier === 'parfois' || r.hors_sentier === 'souvent'; }

function buildSteps () {
  const r = state.responses;
  return ALL_STEPS.filter(s => {
    if (s === 'q_moyens' || s === 'q_infos') return prepares(r);
    if (s === 'q_delai') return r.preparation === 'avant';
    if (s === 'q_hors_raisons') return leavesTrail(r);
    if (s === 'q8') return r.attention_signaletique.length > 0 && !readsAll(r.attention_signaletique);
    return true;
  });
}

const DUR = 380;
let navBusy = false;
let autoTimer = null;
let freqTimer = null;
let rateTimer = null;
let accueilIndex = 0;

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
  if (toId === 'signs' || toId === 'q_accueil') state.imagesLocked = true;
  const fromEl = $(fromId);
  const toEl   = $(toId);

  fromEl.style.animation = `${direction === 'forward' ? 'exitFwd' : 'exitBack'} ${DUR}ms ease forwards`;

  setTimeout(() => {
    fromEl.classList.remove('active');
    fromEl.style.animation = '';
    toEl.classList.add('active');
    toEl.style.animation = `${direction === 'forward' ? 'enterFwd' : 'enterBack'} ${DUR}ms ease forwards`;
    updateProgress(steps);
    setStageMode(toId);
    window.scrollTo(0, 0);
    $('stage').classList.toggle('stage-center', toId === 'merci');
    if (toId === 'signs') initSignSection(direction);
    if (toId === 'q_frequence') renderFreq();
    if (toId === 'q_accueil') showAccueil(Math.max(0, CONFIG.ACCUEIL.findIndex(a => !state.responses.accueil_notes[a.id])));
    adaptTitles();
    fitSlide(toEl);
    navBusy = false;
  }, DUR * 0.6);
}

function setStageMode (id) {
  $('stage').classList.toggle('stage-signs', id === 'signs' || id === 'q_accueil');
  $('stage').classList.toggle('stage-wide', id === 'q_activites' || id === 'q_frequence');
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
  if (MOBILE.matches) return;
  const cs    = getComputedStyle(stage);
  const avail = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h     = el.offsetHeight;
  if (h > avail) el.style.zoom = Math.max(0.6, avail / h).toFixed(3);
}

function onOptionClick (e) {
  if (e.target.closest('#lightbox')) { closeLightbox(); return; }
  const photo = e.target.closest('.rate-photo');
  if (photo) {
    const img = photo.querySelector('img');
    if (img) openLightbox(img.src, img.alt);
    return;
  }
  const smiley = e.target.closest('.smiley');
  if (smiley) {
    const notes = state.responses.accueil_notes;
    const from  = accueilIndex;
    notes[CONFIG.ACCUEIL[from].id] = +smiley.dataset.value;
    showAccueil(from);
    updateNextBtn(smiley.closest('.slide'));
    let next = CONFIG.ACCUEIL.findIndex((a, j) => j > from && !notes[a.id]);
    if (next === -1) next = CONFIG.ACCUEIL.findIndex(a => !notes[a.id]);
    clearTimeout(rateTimer);
    if (next !== -1) rateTimer = setTimeout(() => { if (accueilIndex === from) showAccueil(next); }, 420);
    return;
  }

  const thumb = e.target.closest('.rate-thumb');
  if (thumb) { clearTimeout(rateTimer); showAccueil(+thumb.dataset.i); return; }

  const pop = $('levelPop');
  if (pop && !pop.hidden) {
    const seg = e.target.closest('.seg-btn');
    if (seg) {
      const slide = pop.closest('.slide');
      state.responses.niveaux[pop.dataset.act] = seg.dataset.level;
      hideLevelPop();
      renderLevels(slide, state.responses.activites);
      updateNextBtn(slide);
      return;
    }
    if (e.target.closest('.level-pop')) return;
    const same = e.target.closest('.chip.open');
    closeLevelPop();
    if (same) return;
  }

  const fb = e.target.closest('.freq-btn');
  if (fb) {
    const row  = fb.closest('.freq-row');
    const list = state.responses.activites;
    const freq = state.responses.frequence;
    const i    = +row.dataset.i;
    freq[row.dataset.act] = fb.dataset.freq;
    row.querySelectorAll('.freq-btn').forEach(b => b.classList.toggle('sel', b === fb));
    row.querySelector('.freq-val').textContent = fb.textContent;
    row.classList.remove('todo');
    let next = list.findIndex((a, j) => j > i && !freq[a]);
    if (next === -1) next = list.findIndex(a => !freq[a]);
    clearTimeout(freqTimer);
    freqTimer = setTimeout(() => setFreqOpen(next), 180);
    updateNextBtn(fb.closest('.slide'));
    return;
  }

  const head = e.target.closest('.freq-head');
  if (head) {
    const row = head.closest('.freq-row');
    clearTimeout(freqTimer);
    setFreqOpen(row.classList.contains('open') ? -1 : +row.dataset.i);
    return;
  }

  const sug = e.target.closest('.sug');
  if (sug) { pickSuggest(sug); return; }

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
    const max = +slide.dataset.max;
    if (i !== -1 && 'levels' in slide.dataset) { removeActivity(slide, value); return; }
    if (i === -1 && max && arr.length >= max) { bumpCount(); return; }
    if (i === -1) {
      const exclusive = v => slide.querySelector(`.opt[data-value="${v}"]`).hasAttribute('data-exclusive');
      const keep = opt.hasAttribute('data-exclusive') ? [] : arr.filter(v => !exclusive(v));
      arr.splice(0, arr.length, ...keep, value);
    } else {
      arr.splice(i, 1);
    }
    slide.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', arr.includes(o.dataset.value)));
    togglePrecise(slide, arr);
    if (i !== -1 && 'custom' in opt.dataset) opt.remove();
    if ('levels' in slide.dataset) { renderLevels(slide, arr); updateActCount(slide, arr); openLevelPop(slide, value); }
    const precise = i === -1 && slide.querySelector(`.precise[data-for="${value}"]`);
    if (precise) (precise.querySelector('input') || precise).focus();
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

function renderLevels (slide, list) {
  slide.querySelectorAll('.chip').forEach(chip => {
    const act = chip.dataset.value;
    const old = chip.querySelector('.chip-lvl');
    if (old) old.remove();
    const level = list.includes(act) && LEVELS.find(([k]) => k === state.responses.niveaux[act]);
    if (level) chip.insertAdjacentHTML('beforeend', `<small class="chip-lvl">${level[1]}</small>`);
  });
  fitSlide(slide);
}

function activityName (act) {
  const span = $('q_activites').querySelector(`.chip[data-value="${CSS.escape(act)}"] span`);
  return span ? span.textContent : act;
}

function renderFreq (open) {
  const list = state.responses.activites;
  const freq = state.responses.frequence;
  if (open === undefined) open = list.findIndex(a => !freq[a]);
  $('freqList').innerHTML = list.map((act, i) => {
    const name = esc(activityName(act));
    const f = FREQS.find(([k]) => k === freq[act]);
    return `<div class="freq-row${i === open ? ' open' : ''}${f ? '' : ' todo'}" data-act="${esc(act)}" data-i="${i}">
      <button type="button" class="freq-head"><span class="freq-name">${name}</span><span class="freq-val">${f ? f[1] : ''}</span></button>
      <div class="freq-body"><div class="freq-inner">
        <div class="freq-opts" role="group" aria-label="Fréquence en ${name}">${FREQS.map(([k, label]) =>
          `<button type="button" class="freq-btn${freq[act] === k ? ' sel' : ''}" data-freq="${k}">${label}</button>`).join('')}</div>
      </div></div>
    </div>`;
  }).join('');
  updateNextBtn($('q_frequence'));
}

function setFreqOpen (open) {
  $('freqList').querySelectorAll('.freq-row').forEach(row => row.classList.toggle('open', +row.dataset.i === open));
}

function openLevelPop (slide, act) {
  const pop = $('levelPop');
  const box = pop.parentElement;
  const chip = box.querySelector(`.chip[data-value="${CSS.escape(act)}"]`);
  pop.dataset.act = act;
  const name = chip.querySelector('span').textContent;
  pop.querySelector('strong').textContent = /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
  box.querySelectorAll('.chip').forEach(c => c.classList.toggle('open', c === chip));
  pop.hidden = false;

  const mid  = chip.offsetLeft + chip.offsetWidth / 2;
  const left = Math.max(0, Math.min(mid - pop.offsetWidth / 2, box.clientWidth - pop.offsetWidth));
  const zoom = parseFloat(slide.style.zoom) || 1;
  const up   = chip.getBoundingClientRect().bottom + (pop.offsetHeight + 12) * zoom > window.innerHeight - 8;
  pop.classList.toggle('up', up);
  pop.style.left = `${left}px`;
  pop.style.top  = `${up ? chip.offsetTop - pop.offsetHeight - 12 : chip.offsetTop + chip.offsetHeight + 12}px`;
  pop.style.setProperty('--arrow', `${mid - left}px`);
  pop.classList.remove('new');
  void pop.offsetWidth;
  pop.classList.add('new');
}

function hideLevelPop () {
  const pop = $('levelPop');
  pop.hidden = true;
  pop.parentElement.querySelectorAll('.chip.open').forEach(c => c.classList.remove('open'));
}

function closeLevelPop () {
  const pop = $('levelPop');
  if (pop.hidden) return;
  hideLevelPop();
  if (!state.responses.niveaux[pop.dataset.act]) removeActivity(pop.closest('.slide'), pop.dataset.act);
}

function removeActivity (slide, act) {
  const list = state.responses.activites;
  const i = list.indexOf(act);
  if (i !== -1) list.splice(i, 1);
  delete state.responses.niveaux[act];
  const chip = slide.querySelector(`.chip[data-value="${CSS.escape(act)}"]`);
  if (chip && 'custom' in chip.dataset) chip.remove();
  else if (chip) chip.classList.remove('sel');
  renderLevels(slide, list);
  updateActCount(slide, list);
  updateNextBtn(slide);
}

function openChipForm () {
  $('chipAdd').hidden = true;
  $('chipForm').hidden = false;
  $('chipForm').querySelector('input').focus();
}

function closeChipForm () {
  const form = $('chipForm');
  form.querySelector('input').value = '';
  form.hidden = true;
  $('chipAdd').hidden = false;
}

function addCustomActivity () {
  const input = $('chipForm').querySelector('input');
  const text = input.value.trim().replace(/\s+/g, ' ');
  closeChipForm();
  if (!text) return;
  const slide = $('q_activites');
  const list = state.responses.activites;
  const value = `autre:${text}`;
  if (!list.includes(value) && list.length >= +slide.dataset.max) { bumpCount(); return; }
  if (!list.includes(value)) {
    const chip = document.createElement('button');
    chip.className = 'opt chip sel';
    chip.dataset.value = value;
    chip.dataset.custom = '';
    chip.innerHTML = `<span>${esc(text)}</span>`;
    $('chipAdd').before(chip);
    list.push(value);
  }
  renderLevels(slide, list);
  updateActCount(slide, list);
  updateNextBtn(slide);
  openLevelPop(slide, value);
}

function updateActCount (slide, list) {
  slide.classList.toggle('full', list.length >= +slide.dataset.max);
}

function bumpCount () {
  const el = $('actCount');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function togglePrecise (slide, list) {
  slide.querySelectorAll('.precise').forEach(p => { p.hidden = !list.includes(p.dataset.for); });
  fitSlide(slide);
}

const fold = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const PLACES = [
  ..."01 Ain|02 Aisne|03 Allier|04 Alpes-de-Haute-Provence|05 Hautes-Alpes|06 Alpes-Maritimes|07 Ardèche|08 Ardennes|09 Ariège|10 Aube|11 Aude|12 Aveyron|13 Bouches-du-Rhône|14 Calvados|15 Cantal|16 Charente|17 Charente-Maritime|18 Cher|19 Corrèze|2A Corse-du-Sud|2B Haute-Corse|21 Côte-d'Or|22 Côtes-d'Armor|23 Creuse|24 Dordogne|25 Doubs|26 Drôme|27 Eure|28 Eure-et-Loir|29 Finistère|30 Gard|31 Haute-Garonne|32 Gers|33 Gironde|34 Hérault|35 Ille-et-Vilaine|36 Indre|37 Indre-et-Loire|38 Isère|39 Jura|40 Landes|41 Loir-et-Cher|42 Loire|43 Haute-Loire|44 Loire-Atlantique|45 Loiret|46 Lot|47 Lot-et-Garonne|48 Lozère|49 Maine-et-Loire|50 Manche|51 Marne|52 Haute-Marne|53 Mayenne|54 Meurthe-et-Moselle|55 Meuse|56 Morbihan|57 Moselle|58 Nièvre|59 Nord|60 Oise|61 Orne|62 Pas-de-Calais|63 Puy-de-Dôme|64 Pyrénées-Atlantiques|65 Hautes-Pyrénées|66 Pyrénées-Orientales|67 Bas-Rhin|68 Haut-Rhin|69 Rhône|70 Haute-Saône|71 Saône-et-Loire|72 Sarthe|73 Savoie|74 Haute-Savoie|75 Paris|76 Seine-Maritime|77 Seine-et-Marne|78 Yvelines|79 Deux-Sèvres|80 Somme|81 Tarn|82 Tarn-et-Garonne|83 Var|84 Vaucluse|85 Vendée|86 Vienne|87 Haute-Vienne|88 Vosges|89 Yonne|90 Territoire de Belfort|91 Essonne|92 Hauts-de-Seine|93 Seine-Saint-Denis|94 Val-de-Marne|95 Val-d'Oise|971 Guadeloupe|972 Martinique|973 Guyane|974 La Réunion|976 Mayotte"
    .split('|').map(d => { const [, code, name] = d.match(/^(\S+) (.+)$/); return { code, name, label: `${code} – ${name}` }; }),
  ...'Belgique|Suisse|Luxembourg|Allemagne|Italie|Espagne|Portugal|Royaume-Uni|Irlande|Pays-Bas|Autriche|Danemark|Suède|Norvège|Finlande|Pologne|République tchèque|États-Unis|Canada|Australie|Japon|Chine|Brésil|Maroc|Algérie|Tunisie'
    .split('|').map(name => ({ name, label: name, pays: true }))
];
let placeActive = -1;

function placeHits (text) {
  const flat = str => fold(str).replace(/[-'’–]/g, ' ').replace(/\s+/g, ' ').trim();
  const q = flat(text);
  if (!q) return [];
  const rank = p => {
    const name = flat(p.name);
    if (p.code && p.code.toLowerCase().startsWith(q)) return 0;
    if (name.startsWith(q) || flat(p.label).startsWith(q)) return 1;
    return name.split(' ').some(w => w.startsWith(q)) ? 2 : -1;
  };
  return PLACES.map(p => [rank(p), p]).filter(([r, p]) => r >= 0 && p.label !== text.trim())
    .sort((a, b) => a[0] - b[0]).slice(0, 6).map(([, p]) => p);
}

function renderPlaces () {
  const input = $('placeInput');
  const list  = $('placeList');
  const hits  = placeHits(input.value);
  placeActive = -1;
  list.innerHTML = hits.map(p => `<li class="ac-item" role="option" data-label="${esc(p.label)}">${p.code ? `<b>${p.code}</b>` : ''}<span>${esc(p.name)}</span>${p.pays ? '<em>pays</em>' : ''}</li>`).join('');
  list.hidden = !hits.length;
  input.setAttribute('aria-expanded', String(!list.hidden));
}

function closePlaces () {
  $('placeList').hidden = true;
  $('placeInput').setAttribute('aria-expanded', 'false');
}

function pickPlace (label) {
  const input = $('placeInput');
  input.value = label;
  state.responses.departement = label;
  updateNextBtn(input.closest('.slide'));
  closePlaces();
}

function onPlaceKey (e) {
  const items = [...$('placeList').querySelectorAll('.ac-item')];
  if ($('placeList').hidden || !items.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    placeActive = (placeActive + (e.key === 'ArrowDown' ? 1 : -1) + items.length + 1) % (items.length + 1);
    if (placeActive === items.length) placeActive = -1;
    items.forEach((it, i) => it.classList.toggle('on', i === placeActive));
  } else if (e.key === 'Enter' && placeActive >= 0) {
    e.preventDefault();
    e.stopPropagation();
    pickPlace(items[placeActive].dataset.label);
  } else if (e.key === 'Escape') {
    closePlaces();
  }
}

function updateSuggest (input) {
  const box   = input.closest('.precise-box');
  const slide = box.closest('.slide');
  state.responses.precisions[`${slide.dataset.key}.${box.dataset.for}`] = input.value.replace(/[\s,]+$/, '');
  const parts = input.value.split(',');
  const token = fold(parts.pop().trim());
  const used  = parts.map(p => fold(p.trim()));
  const hits  = token ? box.dataset.suggest.split('|').filter(name => {
    const f = fold(name);
    return f !== token && !used.includes(f) && f.split(/[\s-]+/).concat(f).some(w => w.startsWith(token));
  }).slice(0, 4) : [];
  const sug = box.querySelector('.suggest');
  sug.innerHTML = hits.map(name => `<button type="button" class="sug">${esc(name)}</button>`).join('');
  sug.hidden = !hits.length;
}

function pickSuggest (btn) {
  const input = btn.closest('.precise-box').querySelector('.precise-input');
  const parts = input.value.split(',').slice(0, -1).map(p => p.trim()).filter(Boolean);
  input.value = [...parts, btn.textContent].join(', ') + ', ';
  input.focus();
  updateSuggest(input);
}

function onFieldInput (e) {
  if (e.target.classList.contains('precise-input')) { updateSuggest(e.target); return; }
  const field = e.target.closest('.field');
  const slide = field && field.closest('.slide');
  if (!slide || !slide.dataset.key) return;
  if (field.classList.contains('precise')) state.responses.precisions[`${slide.dataset.key}.${field.dataset.for}`] = field.value;
  else state.responses[slide.dataset.key] = field.value;
  updateNextBtn(slide);
}

function onFieldKey (e) {
  if (e.key === 'Enter' && e.target.classList.contains('precise-input')) { e.preventDefault(); e.target.blur(); return; }
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || !e.target.classList.contains('field')) return;
  e.preventDefault();
  if (e.target.id === 'contactEmail') submitSurvey();
  else nextStep();
}

function isAnswered (slide) {
  const v = state.responses[slide.dataset.key];
  switch (slide.dataset.type) {
    case 'multi':  return v.length > 0 && (!('levels' in slide.dataset) || v.every(a => state.responses.niveaux[a]));
    case 'freq':   return state.responses.activites.every(a => v[a]);
    case 'rating': return CONFIG.ACCUEIL.every(a => v[a.id]);
    case 'text':   return 'optional' in slide.dataset || v.trim() !== '';
    default:       return v != null;
  }
}

function updateNextBtn (slide) {
  const btn = slide.querySelector('.btn-next');
  if (!btn || !slide.dataset.key || state.saving) return;
  btn.disabled = !isAnswered(slide);
}

function validateCurrent () {
  const slide = $(buildSteps()[state.currentStepIndex]);
  if (!slide || !slide.dataset.key) return true;
  const ok = isAnswered(slide);
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
  state.briefTimer = setTimeout(closeBrief, 2000);
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
  if (state.currentSignClicks.length < CONFIG.MIN_CLICKS) return;
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
  $('signReset').disabled = n === 0;
  navBtn.disabled = n < CONFIG.MIN_CLICKS;
  navBtn.textContent = n === 0 ? `Placez 1 à ${CONFIG.MAX_CLICKS} points` : (last ? 'Continuer' : 'Suivant');
}

function isCompleteResponse (r) {
  if (!r || r.v !== SCHEMA_VERSION) return false;
  const list = k => Array.isArray(r[k]) && r[k].length > 0;
  const lists = ['activites', 'motif_pratique', 'attention_signaletique', 'type_visite'];
  if (lists.some(k => !list(k))) return false;
  if (r.activites.some(a => !LEVELS.some(([k]) => (r.niveaux || {})[a] === k))) return false;
  if (r.activites.some(a => !FREQS.some(([k]) => (r.frequence || {})[a] === k))) return false;
  if (['saisons', 'preparation', 'hors_sentier', 'age', 'csp', 'departement', 'genre'].some(k => !r[k])) return false;
  if (prepares(r) && !list('moyens')) return false;
  if (r.preparation === 'avant' && !r.delai_preparation) return false;
  if (leavesTrail(r) && !list('hors_sentier_raisons')) return false;
  if (!readsAll(r.attention_signaletique) && !list('raisons_non_lecture')) return false;
  const notes = r.accueil_notes || {};
  if (!CONFIG.ACCUEIL.every(a => notes[a.id] >= 1 && notes[a.id] <= CONFIG.SMILEYS.length)) return false;
  const si = r.sign_interactions || {};
  return CONFIG.SIGNS.every(sg => Array.isArray(si[sg.id]) && si[sg.id].length >= CONFIG.MIN_CLICKS && si[sg.id].length <= CONFIG.MAX_CLICKS);
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
]);

async function submitSurvey () {
  const slide = $('q_fin');
  if (state.saving) return;
  const email = $('contactEmail').value.trim();
  if (email && !EMAIL_RE.test(email)) { showErr(slide); return; }

  const r = state.responses;
  const steps = buildSteps();
  Object.entries(STEP_KEYS).forEach(([id, key]) => {
    const type = $(id).dataset.type;
    if (!steps.includes(id)) r[key] = type === 'multi' ? [] : type === 'text' ? '' : null;
  });

  const precisions = {};
  document.querySelectorAll('.precise').forEach(p => {
    const s = p.closest('.slide');
    const name = `${s.dataset.key}.${p.dataset.for}`;
    const text = (r.precisions[name] || '').trim();
    if (text && steps.includes(s.id) && r[s.dataset.key].includes(p.dataset.for)) precisions[name] = text;
  });

  const niveaux = {};
  const frequence = {};
  r.activites.forEach(a => { niveaux[a] = r.niveaux[a]; frequence[a] = r.frequence[a]; });

  const record = { ...r, precisions, niveaux, frequence,
    infos_recherchees: r.infos_recherchees.trim(), besoins: r.besoins.trim(), departement: r.departement.trim(),
    avis_enquete: $('avisEnquete').value.trim(),
    images: Object.fromEntries(IMAGE_SLOTS.map(s => [s.id, s.imageVersion])),
    v: SCHEMA_VERSION, session_id: state.sessionId, timestamp: new Date().toISOString(),
    duration_s: Math.round((Date.now() - state.startTime) / 1000) };
  if (!isCompleteResponse(record)) return;

  const btn   = slide.querySelector('.btn-next');
  const label = btn.textContent;
  state.saving = true;
  btn.disabled = true;
  btn.textContent = 'Envoi…';

  try {
    await withTimeout(DB.save(record, email), 20000);
  } catch (e) {
    console.error(e);
    state.saving = false;
    btn.disabled = false;
    btn.textContent = label;
    showErr(slide, 'Envoi impossible. Vérifiez votre connexion puis réessayez.');
    return;
  }
  state.saving = false;
  $('merciContact').hidden = !email;
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
  DB.images().then(images => {
    if (state.imagesLocked || !Object.keys(images).length) return;
    applyImages(images);
    renderAccueil();
  }).catch(e => console.error(e));
  setStageMode(steps[0]);
  $('levelPop').querySelector('.seg').innerHTML = LEVELS.map(([k, label, peak]) =>
    `<button type="button" class="seg-btn" data-level="${k}">
      <svg viewBox="0 0 24 14" aria-hidden="true"><path d="${peak}"/></svg><span>${label}</span>
    </button>`).join('');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLevelPop(); closeLightbox(); } });
  renderLevels($('q_activites'), state.responses.activites);
  adaptTitles();
  updateActCount($('q_activites'), state.responses.activites);
  $('actCount').addEventListener('animationend', e => e.target.classList.remove('bump'));
  $('chipAdd').addEventListener('click', openChipForm);
  $('chipForm').addEventListener('submit', e => { e.preventDefault(); addCustomActivity(); });
  $('chipForm').querySelector('input').addEventListener('keydown', e => { if (e.key === 'Escape') closeChipForm(); });
  $('chipForm').querySelector('input').addEventListener('blur', () => setTimeout(() => { if (!$('chipForm').hidden) addCustomActivity(); }, 120));
  document.querySelectorAll('.slide[data-key]').forEach(updateNextBtn);
  document.addEventListener('click', onOptionClick);
  document.addEventListener('input', onFieldInput);
  const place = $('placeInput');
  if (place) {
    place.addEventListener('input', renderPlaces);
    place.addEventListener('keydown', onPlaceKey);
    place.addEventListener('blur', () => setTimeout(closePlaces, 150));
    $('placeList').addEventListener('mousedown', e => e.preventDefault());
    $('placeList').addEventListener('click', e => { const item = e.target.closest('.ac-item'); if (item) pickPlace(item.dataset.label); });
  }
  document.addEventListener('focusout', e => {
    if (!e.target.classList.contains('precise-input')) return;
    const sug = e.target.closest('.precise-box').querySelector('.suggest');
    setTimeout(() => { if (document.activeElement !== e.target) sug.hidden = true; }, 200);
  });
  document.addEventListener('keydown', onFieldKey);
  const wrapper = $('signWrapper');
  if (wrapper) {
    wrapper.addEventListener('click', handleSignClick);
    wrapper.addEventListener('pointermove', moveLens);
    wrapper.addEventListener('pointerleave', hideLens);
  }
  window.addEventListener('resize', () => fitSlide($(buildSteps()[state.currentStepIndex])));
});
