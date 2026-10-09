const PASSWORD   = 'changez-moi';
const SHEET_NAME = 'Tableau de réponses';

const SITUATIONS = [
  { id: 'situation_1', label: 'Situation 1 · pertinent' },
  { id: 'situation_2', label: 'Situation 2 · inutile' },
  { id: 'situation_3', label: 'Situation 3 · peu lisible' }
];

const MAX_RECORD_CHARS = 20000;
const GRID_ROWS = 3000;

const L = {
  yesno:   { oui: 'Oui', non: 'Non' },
  activites: { rando: 'Randonnée / trail', vtt: 'VTT / VTTAE', aerien: 'Activité(s) aérienne', corde: 'Activité(s) sur corde',
    nordique: 'Activité(s) nordique', aquatique: 'Activité(s) nautique', peche: 'Pêche', autre: 'Autre' },
  frequence: { annee: 'Quelques fois par an', mois: '1 à 2 fois par mois', semaine: 'Chaque semaine',
    plusieurs_semaine: 'Plusieurs fois par semaine', saison: 'En fonction de la saison' },
  destinations: { internet: 'Internet / réseaux sociaux', appli: 'Applications de sentiers', tourisme: 'Offices de tourisme',
    papier: 'Cartes et guides papier', proches: 'Recommandations de proches', spontane: 'Spontanément' },
  preparation: { avance: 'Avant de partir', place: 'Sur place', chemin: 'En chemin', aucune: 'Pas de préparation' },
  horsSentier: { jamais: 'Jamais', parfois: 'Parfois', souvent: 'Souvent' },
  lecture: { lis_tout: 'Lit tout', partiellement: 'Survole', carte: 'Surtout la carte', reglement: 'Surtout les règles',
    sensibilisation: 'Surtout la sensibilisation', ne_lis_pas: "Ne s'arrête pas" },
  raisons: { trop_infos: "Trop d'informations", textes: 'Textes trop petits ou trop longs', emplacement: 'Mal placés / peu visibles',
    connais: 'Connaît déjà le site', gps: 'Se repère au téléphone / GPS', desinteret: "Pas d'intérêt" },
  age: { moins_18: 'Moins de 18 ans', '18_25': '18 – 25 ans', '26_35': '26 – 35 ans', '36_45': '36 – 45 ans',
    '46_55': '46 – 55 ans', '56_65': '56 – 65 ans', plus_65: 'Plus de 65 ans' },
  csp: { agriculteur: 'Agriculteur exploitant', artisan: 'Artisan, commerçant, chef d\'entreprise',
    cadre: 'Cadre, profession intellectuelle sup.', intermediaire: 'Profession intermédiaire', employe: 'Employé(e)',
    ouvrier: 'Ouvrier(ère)', retraite: 'Retraité(e)', etudiant: 'Étudiant(e)', sans_activite: 'Sans activité professionnelle' },
  genre: { homme: 'Homme', femme: 'Femme', autre: 'Autre', nr: 'Ne se prononce pas' },
  visite: { seul: 'Seul(e)', couple: 'En couple', famille: 'En famille', amis: 'Entre amis', groupe: 'En groupe organisé' },
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
function clicks_(record, signId) {
  const list = (record.sign_interactions || {})[signId];
  if (!Array.isArray(list)) return '';
  return list.map(c => c.order + ' (' + Math.round(c.x) + ' %, ' + Math.round(c.y) + ' %)').join('   ·   ');
}

const COLS = [
  { h: 'Date',                      w: 125, v: r => new Date(r.timestamp) },
  { h: 'Durée (s)',                 w: 70,  v: r => r.duration_s },
  { h: 'Pratique une activité',     w: 100, v: r => lab_(L.yesno, r.pratiquant) },
  { h: 'Activités',                 w: 230, v: r => labs_(L.activites, r.activites) },
  { h: 'Fréquence',                 w: 170, v: r => lab_(L.frequence, r.frequence) },
  { h: 'Choix des lieux de sortie', w: 260, v: r => labs_(L.destinations, r.destinations) },
  { h: 'Préparation rando',         w: 140, v: r => lab_(L.preparation, r.preparation_rando) },
  { h: 'Hors-sentier',              w: 90,  v: r => lab_(L.horsSentier, r.hors_sentier) },
  { h: 'Lecture des panneaux',      w: 230, v: r => labs_(L.lecture, r.attention_signaletique) },
  { h: 'Freins à la lecture',       w: 260, v: r => labs_(L.raisons, r.raisons_non_lecture) },
  { h: 'Âge',                       w: 110, v: r => lab_(L.age, r.age) },
  { h: 'Situation professionnelle', w: 230, v: r => lab_(L.csp, r.csp) },
  { h: 'Genre',                     w: 110, v: r => lab_(L.genre, r.genre) },
  { h: 'Sort le plus souvent',      w: 180, v: r => labs_(L.visite, r.type_visite) },
  { h: 'Ordre des situations',      w: 260, v: r => Array.isArray(r.sign_order) ? r.sign_order.map(id => lab_(L.signs, id)).join('  >  ') : '' }
].concat(SITUATIONS.map(sit => ({ h: 'Clics : ' + sit.label, w: 210, v: r => clicks_(r, sit.id) })));
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
    if (req.action === 'submit') return out_(submit_(req.record));

    if (req.password !== PASSWORD) {
      Utilities.sleep(800);
      return out_({ ok: false, error: 'unauthorized' });
    }
    if (req.action === 'check')     return out_({ ok: true });
    if (req.action === 'list')      return out_({ ok: true, records: list_() });
    if (req.action === 'deleteAll') return out_(deleteAll_());
    return out_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return out_({ ok: false, error: 'server_error', detail: String(err) });
  }
}

function submit_(record) {
  if (!record || typeof record !== 'object' || record.v !== 2
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
    return { ok: true };
  } finally {
    lock.releaseLock();
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
    return { ok: true, deleted: Math.max(last - 1, 0) };
  } finally {
    lock.releaseLock();
  }
}
