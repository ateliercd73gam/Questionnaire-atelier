const XLSX_LIB = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

const XL = {
  yesno: { oui: 'Oui', non: 'Non' },
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
  csp: { agriculteur: 'Agriculteur exploitant', artisan: "Artisan, commerçant, chef d'entreprise",
    cadre: 'Cadre, profession intellectuelle sup.', intermediaire: 'Profession intermédiaire', employe: 'Employé(e)',
    ouvrier: 'Ouvrier(ère)', retraite: 'Retraité(e)', etudiant: 'Étudiant(e)', sans_activite: 'Sans activité professionnelle' },
  genre: { homme: 'Homme', femme: 'Femme', autre: 'Autre', nr: 'Ne se prononce pas' },
  visite: { seul: 'Seul(e)', couple: 'En couple', famille: 'En famille', amis: 'Entre amis', groupe: 'En groupe organisé' }
};

function xlLabel (map, v) {
  if (v === null || v === undefined || v === '') return '';
  return Object.prototype.hasOwnProperty.call(map, v) ? map[v] : String(v);
}
function xlLabels (map, v) {
  return Array.isArray(v) ? v.map(x => xlLabel(map, x)).join(', ') : xlLabel(map, v);
}
function xlClicks (r, signId) {
  const list = (r.sign_interactions || {})[signId];
  if (!Array.isArray(list)) return '';
  return list.map(c => `${c.order} (${Math.round(c.x)} %, ${Math.round(c.y)} %)`).join('   ·   ');
}
function xlSignName (id) {
  const sign = CONFIG.SIGNS.find(s => s.id === id);
  return sign ? signTitle(sign) : id;
}

function xlColumns () {
  return [
    { h: 'Date',                      w: 18, v: r => new Date(r.timestamp), fmt: 'dd/mm/yyyy hh:mm' },
    { h: 'Durée (s)',                 w: 10, v: r => r.duration_s },
    { h: 'Pratique une activité',     w: 15, v: r => xlLabel(XL.yesno, r.pratiquant) },
    { h: 'Activités',                 w: 34, v: r => xlLabels(XL.activites, r.activites) },
    { h: 'Fréquence',                 w: 24, v: r => xlLabel(XL.frequence, r.frequence) },
    { h: 'Choix des lieux de sortie', w: 38, v: r => xlLabels(XL.destinations, r.destinations) },
    { h: 'Préparation rando',         w: 20, v: r => xlLabel(XL.preparation, r.preparation_rando) },
    { h: 'Hors-sentier',              w: 13, v: r => xlLabel(XL.horsSentier, r.hors_sentier) },
    { h: 'Lecture des panneaux',      w: 34, v: r => xlLabels(XL.lecture, r.attention_signaletique) },
    { h: 'Freins à la lecture',       w: 38, v: r => xlLabels(XL.raisons, r.raisons_non_lecture) },
    { h: 'Âge',                       w: 16, v: r => xlLabel(XL.age, r.age) },
    { h: 'Situation professionnelle', w: 34, v: r => xlLabel(XL.csp, r.csp) },
    { h: 'Genre',                     w: 16, v: r => xlLabel(XL.genre, r.genre) },
    { h: 'Sort le plus souvent',      w: 26, v: r => xlLabels(XL.visite, r.type_visite) },
    { h: 'Ordre des situations',      w: 38, v: r => Array.isArray(r.sign_order) ? r.sign_order.map(xlSignName).join('  >  ') : '' }
  ].concat(
    CONFIG.SIGNS.map(sign => ({ h: 'Clics : ' + signTitle(sign), w: 32, v: r => xlClicks(r, sign.id) })),
    [{ h: 'ID', w: 14, v: r => r.session_id, grey: true }]
  );
}

function loadExcelJS () {
  if (window.ExcelJS) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_LIB; s.onload = resolve;
    s.onerror = () => reject(new Error('Bibliothèque Excel inaccessible'));
    document.head.appendChild(s);
  });
}

async function exportXLSX (btn) {
  if (!lastData.length) { alert('Aucune donnée à exporter.'); return; }
  const label = btn && btn.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'export…'; }
  try {
    await loadExcelJS();
    const cols = xlColumns();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tableau de réponses', { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
    ws.columns = cols.map(c => ({ header: c.h, width: c.w }));

    const head = ws.getRow(1);
    head.height = 34;
    head.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });

    lastData.forEach((record, i) => {
      const row = ws.addRow(cols.map(c => c.v(record)));
      const shaded = row.number % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell, n) => {
        const col = cols[n - 1];
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        cell.font = { size: 10, color: { argb: col.grey ? 'FF999999' : 'FF000000' } };
        if (col.fmt) cell.numFmt = col.fmt;
        if (shaded) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F4' } };
      });
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reponses_questionnaire_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch (e) {
    console.error(e);
    alert("L'export a échoué : " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
}
