const PASSWORD   = 'changez-moi';
const SHEET_NAME = 'Tableau de réponses';

const SITUATIONS = [
  { id: 'situation_1', label: 'Situation 1 · pertinent' },
  { id: 'situation_2', label: 'Situation 2 · inutile' }
];

const INSTALLATIONS = [
  { id: 'accueil_1', label: 'Installation 1' },
  { id: 'accueil_2', label: 'Installation 2' },
  { id: 'accueil_3', label: 'Installation 3' },
  { id: 'accueil_4', label: 'Installation 4' }
];

const IMAGE_SLOTS  = SITUATIONS.concat(INSTALLATIONS);
const IMAGES_SHEET = 'Images du questionnaire';
const IMAGE_CHUNK  = 45000;
const MAX_IMAGE_CHARS = 3000000;

const CONTACT_SHEET = 'Contacts résultats';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_RECORD_CHARS = 20000;
const GRID_ROWS = 3000;

const L = {
  activites: { rando: 'Randonnée', trail: 'Trail', promenade: 'Promenade', orientation: "Course d'orientation",
    vtt: 'VTT', vttae: 'VTT électrique', escalade: 'Escalade', via_ferrata: 'Via ferrata',
    parapente: 'Parapente',
    ski_fond: 'Ski de fond', ski_rando: 'Ski de randonnée', raquettes: 'Raquettes', biathlon: 'Biathlon',
    peche: 'Pêche', chasse: 'Chasse', equitation: 'Équitation', autre: 'Autre' },
  frequence: { semaine: 'Chaque semaine', plusieurs_semaine: 'Plusieurs fois par semaine', mois: '1 à 2 fois par mois',
    annee: 'Quelques fois par an' },
  niveau: { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' },
  motif: { detente: 'Se détendre, se balader', sport: 'Faire du sport, se dépasser', nature: 'Découvrir la nature et les paysages',
    partage: 'Partager un moment avec ses proches' },
  saisons: { automne: 'Automne', hiver: 'Hiver', printemps: 'Printemps', ete: 'Été' },
  preparation: { avant: 'Avant de partir', sur_place: 'Sur place', aucune: 'Ne prépare pas' },
  moyens: { internet: 'Internet / sites web', reseaux: 'Réseaux sociaux', appli: 'Applications de sentiers', tourisme: 'Offices de tourisme',
    papier: 'Cartes et guides papier', proches: 'Recommandations de proches' },
  delai: { plus_6_mois: 'Plus de 6 mois avant', '2_6_mois': 'Entre 2 et 6 mois avant', '1_mois': 'Environ un mois avant',
    '1_semaine': 'Environ une semaine avant', veille: 'La veille', jour_meme: 'Le jour même' },
  horsSentier: { jamais: 'Jamais', parfois: 'Parfois', souvent: 'Souvent' },
  horsRaisons: { lisibilite: 'Chemin ou balisage peu clair', decouverte: "Découvrir d'autres chemins / paysages",
    raccourcis: 'Prendre un raccourci', autre: 'Autre raison' },
  lecture: { lis_tout: 'Lit tout', partiellement: 'Survole', carte: 'Surtout la carte', reglement: 'Surtout les règles',
    sensibilisation: 'Surtout la sensibilisation', ne_lis_pas: "Ne s'arrête pas" },
  raisons: { trop_infos: "Trop d'informations", textes: 'Textes trop petits ou trop longs', emplacement: 'Mal placés / peu visibles',
    connais: 'Connaît déjà le site', gps: 'Se repère au téléphone / GPS', desinteret: "Pas d'intérêt" },
  visite: { seul: 'Seul(e)', couple: 'En couple', famille: 'En famille', amis: 'Entre amis', groupe: 'En groupe organisé' },
  age: { moins_15: 'Moins de 15 ans', '15_29': '15 – 29 ans', '30_44': '30 – 44 ans', '45_59': '45 – 59 ans',
    '60_74': '60 – 74 ans', plus_75: '75 ans ou plus' },
  csp: { agriculteur: 'Agriculteur(rice) exploitant(e)', artisan: 'Artisan(e), commerçant(e), chef d\'entreprise',
    cadre: 'Cadre, profession intellectuelle sup.', intermediaire: 'Profession intermédiaire', employe: 'Employé(e)',
    ouvrier: 'Ouvrier(ère)', retraite: 'Retraité(e)', sans_activite: 'Sans activité professionnelle' },
  genre: { homme: 'Homme', femme: 'Femme', nr: 'Ne se prononce pas' },
  signs: SITUATIONS.reduce((m, s) => { m[s.id] = s.label; return m; }, {})
};

function lab_(map, value) {
  if (value === null || value === undefined || value === '') return '';
  return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : String(value);
}
function labs_(map, values) {
  if (Array.isArray(values)) return values.map(v => lab_(map, v)).join(', ');
  return lab_(map, values);
}
function labsP_(map, record, key) {
  const values = record[key];
  if (!Array.isArray(values)) return lab_(map, values);
  const precisions = record.precisions || {};
  return values.map(v => {
    const p = precisions[key + '.' + v];
    return p ? lab_(map, v) + ' (' + p + ')' : lab_(map, v);
  }).join(', ');
}
function actName_(v) {
  return String(v).indexOf('autre:') === 0 ? 'Autre : ' + String(v).slice(6) : lab_(L.activites, v);
}
function activites_(record) {
  const values = Array.isArray(record.activites) ? record.activites : [];
  const precisions = record.precisions || {};
  const niveaux = record.niveaux || {};
  return values.map(v => {
    const p = precisions['activites.' + v];
    const n = niveaux[v];
    return actName_(v) + (p ? ' : ' + p : '') + (n ? ' (' + lab_(L.niveau, n) + ')' : '');
  }).join(', ');
}
function frequences_(record) {
  const f = record.frequence;
  if (!f || typeof f !== 'object') return lab_(L.frequence, f);
  const values = Array.isArray(record.activites) ? record.activites : [];
  return values.filter(v => f[v]).map(v => actName_(v) + ' : ' + lab_(L.frequence, f[v])).join(', ');
}
function images_(record) {
  const images = record.images || {};
  return IMAGE_SLOTS.filter(s => images[s.id] && images[s.id] !== 'origine')
    .map(s => s.label + ' : image du ' + Utilities.formatDate(new Date(+String(images[s.id]).slice(1)), 'Europe/Paris', 'dd/MM/yyyy HH:mm'))
    .join(', ');
}
function clicks_(record, signId) {
  const list = (record.sign_interactions || {})[signId];
  if (!Array.isArray(list)) return '';
  return list.map(c => c.order + ' (' + Math.round(c.x) + ' %, ' + Math.round(c.y) + ' %)').join('   ·   ');
}

const COLS = [
  { h: 'Date',                       w: 125, v: r => new Date(r.timestamp) },
  { h: 'Durée (s)',                  w: 70,  v: r => r.duration_s },
  { h: 'Activités (niveau)',         w: 320, v: r => activites_(r) },
  { h: 'Fréquence (par activité)',   w: 320, v: r => frequences_(r) },
  { h: 'Ce qui est recherché',       w: 280, v: r => labs_(L.motif, r.motif_pratique) },
  { h: 'Saison',                     w: 120, v: r => labs_(L.saisons, r.saisons) },
  { h: 'Préparation',                w: 150, v: r => labs_(L.preparation, r.preparation) },
  { h: 'Moyens de préparation',      w: 280, v: r => labsP_(L.moyens, r, 'moyens') },
  { h: 'Informations recherchées',   w: 280, v: r => r.infos_recherchees || '' },
  { h: 'Délai de préparation',       w: 160, v: r => lab_(L.delai, r.delai_preparation) },
  { h: 'Hors-sentier',               w: 90,  v: r => lab_(L.horsSentier, r.hors_sentier) },
  { h: 'Raisons hors-sentier',       w: 260, v: r => labsP_(L.horsRaisons, r, 'hors_sentier_raisons') },
  { h: 'Lecture des panneaux',       w: 230, v: r => labs_(L.lecture, r.attention_signaletique) },
  { h: 'Freins à la lecture',        w: 260, v: r => labs_(L.raisons, r.raisons_non_lecture) }
].concat(
  INSTALLATIONS.map(a => ({ h: 'Note ' + a.label + ' (1 à 4)', w: 100, v: r => (r.accueil_notes || {})[a.id] || '' })),
  [
    { h: 'Attentes et idées',          w: 320, v: r => r.besoins || '' },
    { h: 'Sort avec',                  w: 180, v: r => labs_(L.visite, r.type_visite) },
    { h: 'Âge',                        w: 110, v: r => lab_(L.age, r.age) },
    { h: 'Situation professionnelle',  w: 230, v: r => lab_(L.csp, r.csp) },
    { h: "Département d'origine",      w: 160, v: r => r.departement || '' },
    { h: 'Genre',                      w: 110, v: r => lab_(L.genre, r.genre) },
    { h: "Avis sur l'enquête",         w: 320, v: r => r.avis_enquete || '' },
    { h: 'Images remplacées vues',     w: 260, v: r => images_(r) },
    { h: 'Ordre des situations',       w: 260, v: r => Array.isArray(r.sign_order) ? r.sign_order.map(id => lab_(L.signs, id)).join('  >  ') : '' }
  ],
  SITUATIONS.map(sit => ({ h: 'Clics : ' + sit.label, w: 210, v: r => clicks_(r, sit.id) }))
);
const N_VISIBLE = COLS.length;
const ID_COL    = N_VISIBLE + 1;
const JSON_COL  = N_VISIBLE + 2;
const N_TOTAL   = JSON_COL;
const HEADERS   = COLS.map(c => c.h).concat(['ID', 'json']);

function safe_(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function rowFor_(record) {
  const row = COLS.map(c => safe_(c.v(record)));
  row.push(safe_(record.session_id));
  row.push(JSON.stringify(record));
  return row;
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const all = ss.getSheets();
    if (all.length === 1) { sheet = all[0]; sheet.setName(SHEET_NAME); }
    else sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureLayout_(sheet);
  return sheet;
}

function ensureLayout_(sheet) {
  const lastCol = sheet.getLastColumn();
  const header = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (header[N_TOTAL - 1] === 'json') {
    if (HEADERS.some((h, i) => header[i] !== h)) sheet.getRange(1, 1, 1, N_TOTAL).setValues([HEADERS]);
    return;
  }

  let records = [];
  const jsonIdx = header.indexOf('json');
  const last = sheet.getLastRow();
  if (jsonIdx >= 0 && last > 1) {
    records = sheet.getRange(2, jsonIdx + 1, last - 1, 1).getValues()
      .map(row => { try { return JSON.parse(row[0]); } catch (err) { return null; } })
      .filter(Boolean);
  }
  sheet.clear();
  sheet.setConditionalFormatRules([]);
  formatSheet_(sheet);
  if (records.length) sheet.getRange(2, 1, records.length, N_TOTAL).setValues(records.map(rowFor_));
}

function formatSheet_(sheet) {
  if (sheet.getMaxColumns() < N_TOTAL) sheet.insertColumnsAfter(sheet.getMaxColumns(), N_TOTAL - sheet.getMaxColumns());
  const maxRows = sheet.getMaxRows();
  if (maxRows < GRID_ROWS) sheet.insertRowsAfter(maxRows, GRID_ROWS - maxRows);
  const rows = Math.max(sheet.getMaxRows(), GRID_ROWS) - 1;

  sheet.getRange(1, 1, 1, N_TOTAL).setValues([HEADERS])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#000000')
    .setVerticalAlignment('middle').setHorizontalAlignment('left').setWrap(true);
  sheet.setRowHeight(1, 46);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  sheet.getRange(2, 1, rows, N_TOTAL).setVerticalAlignment('top').setWrap(true).setFontSize(10);
  sheet.getRange(2, 1, rows, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(2, ID_COL, rows, 1).setFontColor('#999999');

  COLS.forEach((c, i) => sheet.setColumnWidth(i + 1, c.w));
  sheet.setColumnWidth(ID_COL, 90);
  sheet.hideColumns(JSON_COL);

  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(ISEVEN(ROW()),$A2<>"")')
    .setBackground('#f4f4f4')
    .setRanges([sheet.getRange(2, 1, rows, N_VISIBLE + 1)])
    .build();
  sheet.setConditionalFormatRules([rule]);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, message: 'Serveur du questionnaire actif' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return out_({ ok: false, error: 'bad_request' }); }

  try {
    if (req.action === 'submit') return out_(submit_(req.record, req.contact));
    if (req.action === 'images') return out_({ ok: true, images: images_list_() });

    if (req.password !== PASSWORD) {
      Utilities.sleep(800);
      return out_({ ok: false, error: 'unauthorized' });
    }
    if (req.action === 'check')     return out_({ ok: true });
    if (req.action === 'list')      return out_({ ok: true, records: list_() });
    if (req.action === 'deleteAll') return out_(deleteAll_());
    if (req.action === 'setImage')   return out_(setImage_(req.slot, req.data));
    if (req.action === 'resetImage') return out_(setImage_(req.slot, null));
    return out_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return out_({ ok: false, error: 'server_error', detail: String(err) });
  }
}

function submit_(record, contact) {
  if (!record || typeof record !== 'object' || record.v !== 6
      || typeof record.session_id !== 'string' || record.session_id.length > 80) {
    return { ok: false, error: 'invalid_record' };
  }
  if (JSON.stringify(record).length > MAX_RECORD_CHARS) return { ok: false, error: 'invalid_record' };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const last = sheet.getLastRow();
    if (last > 1) {
      const ids = sheet.getRange(2, ID_COL, last - 1, 1).getValues();
      if (ids.some(row => row[0] === record.session_id)) return { ok: true, duplicate: true };
    }
    sheet.appendRow(rowFor_(record));
    saveContact_(contact);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function contactSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONTACT_SHEET);
    sheet.getRange(1, 1).setValue('E-mail (envoi des résultats)')
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#000000');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 320);
  }
  return sheet;
}

function saveContact_(email) {
  if (typeof email !== 'string') return;
  email = email.trim();
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) return;
  const sheet = contactSheet_();
  const last = Math.max(sheet.getLastRow(), 1);
  const pos = 2 + Math.floor(Math.random() * last);
  if (pos > last) sheet.appendRow([safe_(email)]);
  else {
    sheet.insertRowBefore(pos);
    sheet.getRange(pos, 1).setValue(safe_(email));
  }
}

function list_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, JSON_COL, last - 1, 1).getValues()
    .map(row => { try { return JSON.parse(row[0]); } catch (err) { return null; } })
    .filter(Boolean);
}

function deleteAll_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet_();
    const last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, N_TOTAL).clearContent();
    const contacts = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONTACT_SHEET);
    if (contacts && contacts.getLastRow() > 1) contacts.deleteRows(2, contacts.getLastRow() - 1);
    return { ok: true, deleted: Math.max(last - 1, 0) };
  } finally {
    lock.releaseLock();
  }
}

function imagesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(IMAGES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(IMAGES_SHEET);
    sheet.getRange(1, 1, 1, 3).setValues([['Emplacement', 'Version', 'Image (ne pas modifier)']])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#000000');
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}

function images_list_() {
  const sheet = imagesSheet_();
  const last = sheet.getLastRow();
  const images = {};
  if (last < 2) return images;
  sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues().forEach(row => {
    if (!row[0] || !row[1]) return;
    images[row[0]] = { v: String(row[1]), data: row.slice(2).map(c => String(c).slice(1)).join('') };
  });
  return images;
}

function setImage_(slot, data) {
  if (!IMAGE_SLOTS.some(s => s.id === slot)) return { ok: false, error: 'invalid_slot' };
  if (data !== null && (typeof data !== 'string' || data.length > MAX_IMAGE_CHARS
      || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(data))) {
    return { ok: false, error: 'invalid_image' };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = imagesSheet_();
    const last = sheet.getLastRow();
    const slots = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]) : [];
    const idx = slots.indexOf(slot);
    if (idx >= 0) sheet.deleteRow(idx + 2);
    if (data === null) return { ok: true };

    const chunks = [];
    for (let i = 0; i < data.length; i += IMAGE_CHUNK) chunks.push('~' + data.slice(i, i + IMAGE_CHUNK));
    const width = 2 + chunks.length;
    if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
    const version = 't' + Date.now();
    sheet.appendRow([slot, version].concat(chunks));
    return { ok: true, v: version };
  } finally {
    lock.releaseLock();
  }
}
