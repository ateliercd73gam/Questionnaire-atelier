const XLSX_LIB = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

const XL = {
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
  csp: { agriculteur: 'Agriculteur(rice) exploitant(e)', artisan: "Artisan(e), commerçant(e), chef d'entreprise",
    cadre: 'Cadre, profession intellectuelle sup.', intermediaire: 'Profession intermédiaire', employe: 'Employé(e)',
    ouvrier: 'Ouvrier(ère)', retraite: 'Retraité(e)', sans_activite: 'Sans activité professionnelle' },
  genre: { homme: 'Homme', femme: 'Femme', nr: 'Ne se prononce pas' }
};

function xlLabel (map, v) {
  if (v === null || v === undefined || v === '') return '';
  return Object.prototype.hasOwnProperty.call(map, v) ? map[v] : String(v);
}
function xlLabels (map, v) {
  return Array.isArray(v) ? v.map(x => xlLabel(map, x)).join(', ') : xlLabel(map, v);
}
function xlLabelsP (map, r, key) {
  const v = r[key];
  if (!Array.isArray(v)) return xlLabel(map, v);
  const precisions = r.precisions || {};
  return v.map(x => precisions[`${key}.${x}`] ? `${xlLabel(map, x)} (${precisions[`${key}.${x}`]})` : xlLabel(map, x)).join(', ');
}
function xlActName (v) {
  return String(v).startsWith('autre:') ? `Autre : ${String(v).slice(6)}` : xlLabel(XL.activites, v);
}
function xlActivites (r) {
  const precisions = r.precisions || {};
  const niveaux = r.niveaux || {};
  return (Array.isArray(r.activites) ? r.activites : []).map(v => {
    const p = precisions[`activites.${v}`];
    const n = niveaux[v];
    return xlActName(v) + (p ? ` : ${p}` : '') + (n ? ` (${xlLabel(XL.niveau, n)})` : '');
  }).join(', ');
}
function xlFrequences (r) {
  const f = r.frequence;
  if (!f || typeof f !== 'object') return xlLabel(XL.frequence, f);
  return (Array.isArray(r.activites) ? r.activites : []).filter(v => f[v])
    .map(v => `${xlActName(v)} : ${xlLabel(XL.frequence, f[v])}`).join(', ');
}
function versionDate (v) {
  const d = new Date(+String(v).slice(1));
  return isNaN(d) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).replace(' ', ' à ');
}
function xlImages (r) {
  const images = r.images || {};
  return IMAGE_SLOTS.filter(s => images[s.id] && images[s.id] !== 'origine')
    .map(s => `${slotTitle(s)} : image du ${versionDate(images[s.id])}`).join(', ');
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
    { h: 'Date',                       w: 18, v: r => new Date(r.timestamp), fmt: 'dd/mm/yyyy hh:mm' },
    { h: 'Durée (s)',                  w: 10, v: r => r.duration_s },
    { h: 'Activités (niveau)',         w: 46, v: r => xlActivites(r) },
    { h: 'Fréquence (par activité)',   w: 46, v: r => xlFrequences(r) },
    { h: 'Ce qui est recherché',       w: 40, v: r => xlLabels(XL.motif, r.motif_pratique) },
    { h: 'Saison',                     w: 16, v: r => xlLabels(XL.saisons, r.saisons) },
    { h: 'Préparation',                w: 22, v: r => xlLabels(XL.preparation, r.preparation) },
    { h: 'Moyens de préparation',      w: 40, v: r => xlLabelsP(XL.moyens, r, 'moyens') },
    { h: 'Informations recherchées',   w: 40, v: r => r.infos_recherchees || '' },
    { h: 'Délai de préparation',       w: 22, v: r => xlLabel(XL.delai, r.delai_preparation) },
    { h: 'Hors-sentier',               w: 13, v: r => xlLabel(XL.horsSentier, r.hors_sentier) },
    { h: 'Raisons hors-sentier',       w: 38, v: r => xlLabelsP(XL.horsRaisons, r, 'hors_sentier_raisons') },
    { h: 'Lecture des panneaux',       w: 34, v: r => xlLabels(XL.lecture, r.attention_signaletique) },
    { h: 'Freins à la lecture',        w: 38, v: r => xlLabels(XL.raisons, r.raisons_non_lecture) }
  ].concat(
    CONFIG.ACCUEIL.map(a => ({ h: `Note ${a.label} (1 à 4)`, w: 14, v: r => (r.accueil_notes || {})[a.id] || '' })),
    [
      { h: 'Attentes et idées',          w: 46, v: r => r.besoins || '' },
      { h: 'Sort avec',                  w: 26, v: r => xlLabels(XL.visite, r.type_visite) },
      { h: 'Âge',                        w: 16, v: r => xlLabel(XL.age, r.age) },
      { h: 'Situation professionnelle',  w: 34, v: r => xlLabel(XL.csp, r.csp) },
      { h: "Département d'origine",      w: 22, v: r => r.departement || '' },
      { h: 'Genre',                      w: 16, v: r => xlLabel(XL.genre, r.genre) },
      { h: "Avis sur l'enquête",         w: 46, v: r => r.avis_enquete || '' },
      { h: 'Images remplacées vues',     w: 38, v: r => xlImages(r) },
      { h: 'Ordre des situations',       w: 38, v: r => Array.isArray(r.sign_order) ? r.sign_order.map(xlSignName).join('  >  ') : '' }
    ],
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
