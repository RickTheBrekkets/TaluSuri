// TaluSuri — word layer: Pareto frequency model shared by lessons, exercises & spoedcursus.
//
// Loaded AFTER freq.js (defines FREQ: the 1000 most-frequent Dutch lemmas, rank = index)
// and AFTER data.js (defines LANGS with inline, dictionary-verified seed words), but BEFORE
// app.js. It does three things:
//   1. Seeds TRANSLATIONS[langId] from each language's existing inline words (status 'verified').
//   2. Merges EXTRA_TRANSLATIONS — additional confident translations keyed by Dutch lemma.
//   3. Rebuilds each language's `words` array, frequency-ordered (Pareto): FREQ-matched entries
//      first by rank, then any curated words that don't map onto the frequency spine.
//
// Every consumer (dictionary, flashcards, lessons, exams, crash course, mistakes) reads
// `lang.words`, so widening + reordering that array lifts the whole app at once. To grow a
// language's vocabulary, add entries to EXTRA_TRANSLATIONS — nothing else.

// ═══ EXTRA TRANSLATIONS ═══
// Keyed by langId, then by the exact Dutch lemma as it appears in FREQ (freq.js).
// Shape: '<nl lemma>': {w:'<target word>', p:'<phonetic>'}  (status defaults to 'verified').
// Only languages we can source responsibly are filled here; endangered languages stay at their
// curated seed size rather than being machine-filled with unverifiable words.
const EXTRA_TRANSLATIONS = {
  // Sranan Tongo — Suriname's lingua franca, well documented (Wilner et al. / SIL, 2007).
  sranan: {
    'ik':{w:'mi',p:'mi'},'je':{w:'yu',p:'yu'},'hij':{w:'a',p:'a'},'we':{w:'wi',p:'wi'},
    'wij':{w:'wi',p:'wi'},'ze':{w:'den',p:'den'},'jullie':{w:'unu',p:'u-nu'},'niet':{w:'no',p:'no'},
    'met':{w:'nanga',p:'na-nga'},'van':{w:'fu',p:'fu'},'naar':{w:'na',p:'na'},'hier':{w:'dya',p:'dya'},
    'daar':{w:'drape',p:'dra-pe'},'nu':{w:'now',p:'now'},'veel':{w:'furu',p:'fu-ru'},'naam':{w:'nen',p:'nen'},
    'man':{w:'man',p:'man'},'vrouw':{w:'uma',p:'u-ma'},'mensen':{w:'sma',p:'sma'},'geld':{w:'moni',p:'mo-ni'},
    'werk':{w:'wroko',p:'wro-ko'},'werken':{w:'wroko',p:'wro-ko'},'tijd':{w:'ten',p:'ten'},'jaar':{w:'yari',p:'ya-ri'},
    'morgen':{w:'tamara',p:'ta-ma-ra'},'gisteren':{w:'esrede',p:'es-re-de'},'vandaag':{w:'tide',p:'ti-de'},
    'ochtend':{w:'mamanten',p:'ma-man-ten'},'maan':{w:'mun',p:'mun'},'ster':{w:'stari',p:'sta-ri'},
    'weg':{w:'pasi',p:'pa-si'},'stad':{w:'foto',p:'fo-to'},'land':{w:'kondre',p:'kon-dre'},'wereld':{w:'grontapu',p:'gron-ta-pu'},
    'boek':{w:'buku',p:'bu-ku'},'school':{w:'skoro',p:'sko-ro'},'hand':{w:'anu',p:'a-nu'},'oog':{w:'ai',p:'ai'},
    'hoofd':{w:'ede',p:'e-de'},'deur':{w:'doro',p:'do-ro'},'tien':{w:'tin',p:'tin'},'rood':{w:'redi',p:'re-di'},
    'wit':{w:'weti',p:'we-ti'},'zwart':{w:'blaka',p:'bla-ka'},'groen':{w:'grun',p:'grun'},'geel':{w:'geri',p:'ge-ri'},
    'blauw':{w:'blaw',p:'blaw'},'nieuw':{w:'nyun',p:'nyun'},'oud':{w:'owru',p:'ow-ru'},'lang':{w:'langa',p:'la-nga'},
    'snel':{w:'esi',p:'e-si'},'klein':{w:'pikin',p:'pi-kin'},'gaan':{w:'go',p:'go'},'komen':{w:'kon',p:'kon'},
    'zien':{w:'si',p:'si'},'geven':{w:'gi',p:'gi'},'nemen':{w:'teki',p:'te-ki'},'weten':{w:'sabi',p:'sa-bi'},
    'willen':{w:'wani',p:'wa-ni'},'maken':{w:'meki',p:'me-ki'},'zeggen':{w:'taki',p:'ta-ki'},'praten':{w:'taki',p:'ta-ki'},
    'spreken':{w:'taki',p:'ta-ki'},'lezen':{w:'leisi',p:'lei-si'},'schrijven':{w:'skrifi',p:'skri-fi'},'kopen':{w:'bai',p:'bai'},
    'horen':{w:'yere',p:'ye-re'},'kijken':{w:'luku',p:'lu-ku'},'wachten':{w:'wakti',p:'wak-ti'},'vragen':{w:'aksi',p:'ak-si'},
    'helpen':{w:'yepi',p:'ye-pi'},'leren':{w:'leri',p:'le-ri'},'spelen':{w:'prey',p:'prey'},'lachen':{w:'lafu',p:'la-fu'},
    'huilen':{w:'krei',p:'krei'},'begrijpen':{w:'frustan',p:'frus-tan'},'vergeten':{w:'frigiti',p:'fri-gi-ti'},
    'vertellen':{w:'fruteri',p:'fru-te-ri'},'brengen':{w:'tyari',p:'tya-ri'},'staan':{w:'tanapu',p:'ta-na-pu'},
    'zitten':{w:'sidon',p:'si-don'},'liggen':{w:'didon',p:'di-don'},'blijven':{w:'tan',p:'tan'},'wonen':{w:'libi',p:'li-bi'},
    'leven':{w:'libi',p:'li-bi'},'beginnen':{w:'bigin',p:'bi-gin'},'vallen':{w:'fadon',p:'fa-don'},'slapen':{w:'sribi',p:'sri-bi'},
    'drinken':{w:'dringi',p:'drin-gi'},'lopen':{w:'waka',p:'wa-ka'},'houden':{w:'lobi',p:'lo-bi'},
    // question words & function
    'hoe':{w:'fa',p:'fa'},'wat':{w:'san',p:'san'},'wie':{w:'suma',p:'su-ma'},'waar':{w:'pe',p:'pe'},'waarom':{w:'fu san',p:'fu san'},
    // animals
    'vogel':{w:'fowru',p:'fow-ru'},'hond':{w:'dagu',p:'da-gu'},'kat':{w:'puspusi',p:'pus-pu-si'},'paard':{w:'asi',p:'a-si'},
    'koe':{w:'kaw',p:'kaw'},'varken':{w:'agu',p:'a-gu'},'slang':{w:'sneki',p:'sne-ki'},'dier':{w:'meti',p:'me-ti'},
    // food & drink
    'brood':{w:'brede',p:'bre-de'},'rijst':{w:'aleisi',p:'a-lei-si'},'vlees':{w:'meti',p:'me-ti'},'ei':{w:'eksi',p:'ek-si'},
    'zout':{w:'sowtu',p:'sow-tu'},'suiker':{w:'sukru',p:'su-kru'},'melk':{w:'merki',p:'mer-ki'},
    // body
    'voet':{w:'futu',p:'fu-tu'},'been':{w:'futu',p:'fu-tu'},'mond':{w:'mofo',p:'mo-fo'},'oor':{w:'yesi',p:'ye-si'},
    'neus':{w:'noso',p:'no-so'},'tand':{w:'tifi',p:'ti-fi'},'haar':{w:'wiwiri',p:'wi-wi-ri'},'buik':{w:'bere',p:'be-re'},
    'hart':{w:'ati',p:'a-ti'},'bloed':{w:'brudu',p:'bru-du'},'bot':{w:'bonyo',p:'bo-nyo'},'huid':{w:'buba',p:'bu-ba'},
    // nature
    'regen':{w:'alen',p:'a-len'},'wind':{w:'winti',p:'win-ti'},'aarde':{w:'gron',p:'gron'},'steen':{w:'ston',p:'ston'},
    'zand':{w:'santi',p:'san-ti'},'zee':{w:'se',p:'se'},'bloem':{w:'bromki',p:'brom-ki'},'lucht':{w:'loktu',p:'lok-tu'},
    // house & objects
    'tafel':{w:'tafra',p:'ta-fra'},'stoel':{w:'sturu',p:'stu-ru'},'bed':{w:'bedi',p:'be-di'},'kleren':{w:'krosi',p:'kro-si'},
    'schoen':{w:'susu',p:'su-su'},
    // time & numbers
    'week':{w:'wiki',p:'wi-ki'},'uur':{w:'yuru',p:'yu-ru'},'zes':{w:'siksi',p:'sik-si'},'zeven':{w:'seibi',p:'sei-bi'},
    'acht':{w:'aiti',p:'ai-ti'},'negen':{w:'neigi',p:'nei-gi'},'honderd':{w:'hondro',p:'hon-dro'},
    // more verbs
    'sterven':{w:'dede',p:'de-de'},'dood':{w:'dede',p:'de-de'},'rennen':{w:'lon',p:'lon'},'zwemmen':{w:'swen',p:'swen'},
    'vliegen':{w:'frei',p:'frei'},'zingen':{w:'singi',p:'sin-gi'},'dansen':{w:'dansi',p:'dan-si'},'wassen':{w:'wasi',p:'wa-si'},
    'koken':{w:'bori',p:'bo-ri'},'openen':{w:'opo',p:'o-po'},'sluiten':{w:'tapu',p:'ta-pu'},'vinden':{w:'feni',p:'fe-ni'},
    'verliezen':{w:'lasi',p:'la-si'},'tellen':{w:'teri',p:'te-ri'},'betalen':{w:'pai',p:'pai'},'verkopen':{w:'seri',p:'se-ri'},
    'bouwen':{w:'bow',p:'bow'},'breken':{w:'broko',p:'bro-ko'},'trekken':{w:'hari',p:'ha-ri'},'duwen':{w:'pusu',p:'pu-su'},
    'gooien':{w:'trowe',p:'tro-we'},'vangen':{w:'kisi',p:'ki-si'},'stoppen':{w:'tapu',p:'ta-pu'}
  },
  // Sarnami Hindoestani (Bhojpuri-based). Conservative set — only well-attested everyday words.
  sarnami: {
    'ik':{w:'ham',p:'ham'},'je':{w:'toe',p:'toe'},'groot':{w:'bara',p:'ba-ra'},'klein':{w:'chhota',p:'chho-ta'},
    'naam':{w:'naam',p:'naam'},'geld':{w:'paisa',p:'pai-sa'},'veel':{w:'bahoet',p:'ba-hoet'},'vuur':{w:'aag',p:'aag'},
    'man':{w:'aadmie',p:'aad-mie'},'vriend':{w:'dost',p:'dost'},'gaan':{w:'jaae',p:'jaa-e'},'komen':{w:'aae',p:'aa-e'},
    'eten':{w:'khaana',p:'khaa-na'},'nieuw':{w:'nawaa',p:'na-waa'},'oud':{w:'puraan',p:'pu-raan'},'vis':{w:'matjhie',p:'ma-tjhie'}
  }
};

// Frequency bands for the spoedcursus, expressed as [fromRank, toRank) over the FREQ spine.
const CRASH_BANDS = [
  {name:'Kern 1 — Allerbelangrijkste', range:[0,100],   icon:'🥇', desc:'De ~100 meest essentiële woorden'},
  {name:'Kern 2 — Kerntaal',           range:[100,300], icon:'🥈', desc:'Dagelijkse kernwoordenschat'},
  {name:'Kern 3 — Uitbreiding',        range:[300,600], icon:'🥉', desc:'Breid je woordenschat uit'},
  {name:'Kern 4 — Vloeiend',           range:[600,1000],icon:'🏆', desc:'Op weg naar vloeiend begrip'}
];

// Index FREQ lemma -> rank for O(1) lookup. Falls back to empty if freq.js failed to load.
const FREQ_RANK = (typeof FREQ !== 'undefined')
  ? FREQ.reduce((m, f, i) => { m[f.nl] = {rank:i, cat:f.cat}; return m; }, {})
  : {};

// Build TRANSLATIONS by seeding from each language's inline words, then layering EXTRA on top.
const TRANSLATIONS = {};
function seedTranslations() {
  if (typeof LANGS === 'undefined') return;
  const dict = (typeof DICT_TRANSLATIONS !== 'undefined') ? DICT_TRANSLATIONS : {};
  LANGS.forEach(l => {
    const t = {};
    // 1. Lowest priority: dictionary-extracted words (status 'dict').
    const dt = dict[l.id] || {};
    Object.keys(dt).forEach(nl => { t[nl] = {w:dt[nl].w, p:dt[nl].p, status:'dict'}; });
    // 2. Inline seed words (hand-curated, dictionary-cited) override dict.
    (l.words || []).forEach(w => { t[w.nl] = {w:w.w, p:w.p, status:'verified'}; });
    // 3. Highest priority: manual EXTRA translations.
    const extra = EXTRA_TRANSLATIONS[l.id] || {};
    Object.keys(extra).forEach(nl => {
      t[nl] = {w:extra[nl].w, p:extra[nl].p, status:extra[nl].status || 'verified'};
    });
    TRANSLATIONS[l.id] = t;
  });
}

// Frequency-ordered learnable words for a language: FREQ-matched first (by rank), curated last.
function buildLangWords(langId) {
  const t = TRANSLATIONS[langId] || {};
  const ranked = [], extra = [];
  Object.keys(t).forEach(nl => {
    const tr = t[nl];
    const fr = FREQ_RANK[nl];
    const entry = {nl, w:tr.w, p:tr.p, status:tr.status, rank: fr ? fr.rank : null, cat: fr ? fr.cat : null};
    (fr ? ranked : extra).push(entry);
  });
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.concat(extra);
}

// Count of words that land on the frequency spine (the available kernwoorden for a language).
function langCoverage(langId) {
  return (TRANSLATIONS[langId] ? buildLangWords(langId) : []).filter(w => w.rank !== null).length;
}

// Per-band coverage for the spoedcursus view.
function crashBandStats(langId) {
  const ranked = buildLangWords(langId).filter(w => w.rank !== null);
  return CRASH_BANDS.map(b => ({
    ...b,
    have: ranked.filter(w => w.rank >= b.range[0] && w.rank < b.range[1]).length,
    size: b.range[1] - b.range[0]
  }));
}

// Words within a frequency-rank range, for starting a crash tier.
function crashTierWords(langId, fromRank, toRank) {
  return buildLangWords(langId).filter(w => w.rank !== null && w.rank >= fromRank && w.rank < toRank);
}

// Apply: rebuild every language's `words` array in frequency order.
function applyFrequencyOrder() {
  if (typeof LANGS === 'undefined') return;
  LANGS.forEach(l => { l.words = buildLangWords(l.id); });
}

seedTranslations();
applyFrequencyOrder();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {TRANSLATIONS, EXTRA_TRANSLATIONS, CRASH_BANDS,
    buildLangWords, langCoverage, crashBandStats, crashTierWords, applyFrequencyOrder, seedTranslations};
}
