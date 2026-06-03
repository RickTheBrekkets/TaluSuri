// TaluSuri — datasets: languages, words, sources, badges, leaderboard
// Part of a static site; loaded as a classic script (relies on global scope for inline handlers).

// ═══ SOURCES ═══
// Academic references per language, shown on the Bronnen view and as the dictionary footer.
// Shape: {id, flag, name, sources:[{title, author, year, type:'primary'|'secondary', note}]}.
const SOURCES=[
{id:'sarnami',flag:'🚢',name:'Sarnami Hindoestani',sources:[{title:'Beknopt Nederlands-Sarnami Hindoestani Woordenboek',author:'Instituut voor Taalwetenschap Paramaribo',year:'2002',type:'primary',note:'Primaire bron'},{title:'Sarnami: A Living Language of Suriname',author:'Kishna, M. et al.',year:'1993',type:'secondary',note:'Achtergrond'}]},
{id:'sranan',flag:'🇸🇷',name:'Sranan Tongo',sources:[{title:'Sranan Tongo – Nederlands Woordenboek (5e ed.)',author:'Wilner, J. et al. / SIL International',year:'2007',type:'primary',note:'Data 1981–2003'},{title:'Nederlands – Sranan Tongo Woordenboek',author:'SIL International Suriname',year:'2007',type:'primary',note:'Omgekeerde richting'}]},
{id:'javaans',flag:'🌺',name:'Surinaams-Javaans',sources:[{title:'Surinaams-Javaans-Nederlands Woordenboek',author:'Vruggink, H. & Sarmo, J. / KITLV Press',year:'2002',type:'primary',note:'Standaardwerk'},{title:'Het Surinaams Javaans: een introduktie',author:'Vruggink, H.',year:'1985',type:'secondary',note:'OSO tijdschrift'}]},
{id:'ndyuka',flag:'🌿',name:'Ndyuka',sources:[{title:'Ndyuka–English Dictionary',author:'Huttar, G.L. & Huttar, M.L. / SIL',year:'1994',type:'primary',note:'SIL Suriname'},{title:'Atlas of the Languages of Suriname',author:'Carlin & Arends / KITLV',year:'2002',type:'secondary',note:'Context'}]},
{id:'saramaccaans',flag:'🏞️',name:'Saramaccaans',sources:[{title:'Saramaccan–English Dictionary',author:'Rountree & Glock / SIL',year:'1977',type:'primary',note:'SIL Suriname'},{title:'Atlas of the Languages of Suriname',author:'Carlin & Arends / KITLV',year:'2002',type:'secondary',note:'Context'}]},
{id:'arawak',flag:'🌄',name:'Arawak (Lokono)',sources:[{title:'Grammar Sketch and Lexicon of Arawak',author:'Pet, W.J.A. / SIL',year:'1987',type:'primary',note:'Woordenschat'},{title:'Lokono Dian: The Arawak Language',author:'Pet, W.J.A. / KITLV',year:'1987',type:'primary',note:'Referentie'}]},
{id:'karib',flag:'🌊',name:"Kari'na",sources:[{title:"The Carib Language (Kari'nja)",author:'Hoff, B.J. / KITLV',year:'1968',type:'primary',note:'Woordenindex'},{title:'Atlas of the Languages of Suriname',author:'Carlin & Arends / KITLV',year:'2002',type:'secondary',note:'Context'}]},
{id:'hakka',flag:'🏮',name:'Hakka',sources:[{title:'Changing Chinese Linguistic Situation in Suriname',author:'Tjon Sie Fat, P.B. / CUHK',year:'2009',type:'primary',note:'Migratie & taal'},{title:'Hakka community documentation',author:'Gemeenschapsdocumenten',year:'–',type:'secondary',note:'Community-kennis'}]},
{id:'matawai',flag:'🌳',name:'Matawai',sources:[{title:'Comparative Maroon Language Studies',author:'Huttar, G.L. / SIL',year:'div.',type:'primary',note:'Maroon studies'},{title:'Atlas of the Languages of Suriname',author:'Carlin & Arends / KITLV',year:'2002',type:'secondary',note:'Context'}]}
];

// ═══ BADGES ═══
// Achievement definitions. `id` is matched against S.badges to know what's earned
// (see unlockBadge/checkBadges in app.js).
const BADGES=[
{id:'first_lesson',icon:'🌱',name:'Eerste stap',desc:'Voltooi je eerste les'},
{id:'streak_3',icon:'🔥',name:'Op dreef',desc:'3 dagen streak'},
{id:'streak_7',icon:'⚡',name:'Week-strijder',desc:'7 dagen streak'},
{id:'flash_10',icon:'🃏',name:'Kaartenkoning',desc:'10 flashcards goed'},
{id:'perfect',icon:'💯',name:'Perfectie',desc:'100% op een les'},
{id:'exam_pass',icon:'🏅',name:'Geslaagd',desc:'Haal een examen'},
{id:'polyglot',icon:'🌍',name:'Polyglot',desc:'Leer in 3 talen'},
{id:'level_5',icon:'⭐',name:'Gevorderd',desc:'Bereik level 5'},
{id:'contributor',icon:'🤝',name:'Bijdrager',desc:'Dien feedback in'},
{id:'explorer',icon:'🧭',name:'Ontdekker',desc:'Bekijk alle talen'},
{id:'rec_first',icon:'🎤',name:'Stemgever',desc:'Eerste opname ingestuurd'},
{id:'voice_25',icon:'🌟',name:'Geliefde stem',desc:'25 upvotes op je opnames'},
{id:'voice_100',icon:'👑',name:'Uitspraakheld',desc:'100 upvotes op je opnames'},
{id:'ambassador',icon:'📣',name:'Ambassadeur',desc:'Nodig een vriend uit'},
{id:'ambassador_5',icon:'🤩',name:'Superambassadeur',desc:'Nodig 5 vrienden uit'},
{id:'odo_master',icon:'🗣️',name:'Odo-meester',desc:'10 gezegdes goed geraden'},
{id:'week_gold',icon:'🥇',name:'Goud van de week',desc:'Eindig 1e op het weekklassement'},
{id:'week_silver',icon:'🥈',name:'Zilver van de week',desc:'Eindig 2e op het weekklassement'},
{id:'week_bronze',icon:'🥉',name:'Brons van de week',desc:'Eindig 3e op het weekklassement'},
{id:'month_gold',icon:'🥇',name:'Goud van de maand',desc:'Eindig 1e op het maandklassement'},
{id:'month_silver',icon:'🥈',name:'Zilver van de maand',desc:'Eindig 2e op het maandklassement'},
{id:'month_bronze',icon:'🥉',name:'Brons van de maand',desc:'Eindig 3e op het maandklassement'}
];

// Title shown for each level; indexed by (level - 1), capped at the last entry.
const LEVEL_TITLES=['Beginner','Leerling','Spreker','Gevorderd','Kenner','Meester','Expert','Ambassadeur'];

// ═══ FAKE LEADERBOARD ═══
// Hard-coded sample players the real user is inserted into and ranked against (see renderLeaderboard).
// xp = all-time, wxp = this week, mxp = this month — chosen so the three boards rank differently.
const LEADERBOARD=[
{name:'Priya R.',xp:2840,wxp:320,mxp:1180,langs:'Sarnami, Sranan',avatar:'PR'},
{name:'Marlon K.',xp:2510,wxp:410,mxp:940,langs:'Sranan, Ndyuka',avatar:'MK'},
{name:'Indra S.',xp:2190,wxp:150,mxp:720,langs:'Javaans',avatar:'IS'},
{name:'Astrid W.',xp:1870,wxp:280,mxp:1320,langs:'Sranan, Saramaccaans',avatar:'AW'},
{name:'Rony D.',xp:1640,wxp:95,mxp:410,langs:'Kari\'na, Arawak',avatar:'RD'},
{name:'Soemita P.',xp:1320,wxp:360,mxp:600,langs:'Sarnami, Hakka',avatar:'SP'},
{name:'Glenn T.',xp:980,wxp:60,mxp:220,langs:'Sranan',avatar:'GT'},
{name:'Lisa M.',xp:720,wxp:210,mxp:510,langs:'Matawai, Sranan',avatar:'LM'}
];

// ═══ LANGUAGE DATA ═══
// The core content: one entry per language. LANGS[0] is the default language.
// Per language:
//   id, name, full, flag, deco (hero emoji), badge/badgeType (status pill),
//   speakers, group, sub (hero subtitle),
//   culture/cultureIcon/cultureBg/cultureTitle (home culture card),
//   sourceShort (dictionary footer), speechLang (BCP-47 code for text-to-speech),
//   words:   [{nl, w (target word), p (phonetic guide)}]
//   phrases: [{nl, w, p}]
//   lessons: [{emoji, title, xp}]   — lesson order also drives the curriculum & crash tiers
const LANGS=[
{id:'sarnami',name:'Sarnami',full:'Sarnami Hindoestani',flag:'🚢',deco:'🕉️',badge:'Erkend',badgeType:'green',speakers:'~150.000',group:'Contractarbeiders (India)',sub:'Verbind je met de Hindoestaanse gemeenschap.',culture:'In de Sarnami cultuur zijn begroetingen erg belangrijk. Hindoestanen gebruiken "Namaste" met gevouwen handen, Moslim-Hindoestanen "Salaam".',cultureIcon:'🕉️',cultureBg:'var(--gold-l)',cultureTitle:'Hindoestaanse cultuur',sourceShort:'Inst. Taalwetenschap Paramaribo, 2002',speechLang:'hi-IN',
words:[{nl:'hallo (Hindoe)',w:'namaste',p:'na-mas-te'},{nl:'hallo (Moslim)',w:'salaam',p:'sa-laam'},{nl:'dank je',w:'dhanbaad',p:'dhan-baad'},{nl:'ja',w:'hã',p:'hã'},{nl:'nee',w:'na',p:'na'},{nl:'welkom',w:'swaagat',p:'swaa-gat'},{nl:'goed',w:'attjha',p:'at-tjha'},{nl:'moeder',w:'maai',p:'maai'},{nl:'vader',w:'baap',p:'baap'},{nl:'broer',w:'bhaai',p:'bhaai'},{nl:'zuster',w:'bahien',p:'ba-hien'},{nl:'familie',w:'palwaar',p:'pal-waar'},{nl:'water',w:'paanie',p:'paa-nie'},{nl:'rijst',w:'bhaat',p:'bhaat'},{nl:'roti',w:'rotie',p:'ro-tie'},{nl:'lekker',w:'miestha',p:'miest-ha'},{nl:'huis',w:'ghar',p:'ghar'},{nl:'blij',w:'khoesie',p:'khoe-sie'},{nl:'liefde',w:'pjaar',p:'pjaar'},{nl:'rood',w:'laal',p:'laal'},{nl:'groen',w:'hariar',p:'ha-riar'},{nl:'geel',w:'piejar',p:'pie-jar'},{nl:'wit',w:'oeddjar',p:'oed-djar'},{nl:'zwart',w:'karia',p:'ka-ria'},{nl:'één',w:'ek',p:'ek'},{nl:'twee',w:'doei',p:'doei'},{nl:'drie',w:'tien',p:'tien'},{nl:'vier',w:'tjaar',p:'tjaar'},{nl:'vijf',w:'pãatj',p:'pãatj'},{nl:'hoofd',w:'moedie',p:'moe-die'},{nl:'hand',w:'hãath',p:'hãath'},{nl:'oog',w:'ãakhie',p:'ãak-hie'},{nl:'dag',w:'dien',p:'dien'},{nl:'nacht',w:'raat',p:'raat'},{nl:'zon',w:'soeriedj',p:'soe-riedj'},{nl:'maan',w:'tjand',p:'tjand'},{nl:'boom',w:'perdh',p:'perdh'},{nl:'rivier',w:'nadie',p:'na-die'},{nl:'kind',w:'larka',p:'lar-ka'},{nl:'school',w:'skoel',p:'skoel'}],
phrases:[{nl:'Hoe heet jij?',w:'tor ka naam hai?',p:'tor ka naam hai'},{nl:'Mijn naam is...',w:'hamaar naam ... hai',p:'ha-maar naam hai'},{nl:'Ik heb honger.',w:'hamke bhoekh lage hai.',p:'ham-ke bhoekh la-ge hai'},{nl:'Dank je wel.',w:'bahoet dhanbaad.',p:'ba-hoet dhan-baad'}]},
{id:'sranan',name:'Sranan Tongo',full:'Sranan Tongo',flag:'🇸🇷',deco:'✊',badge:'Lingua Franca',badgeType:'ink',speakers:'~850.000',group:'Creoolse gemeenschap',sub:'De gedeelde taal van alle Surinamers.',culture:'Sranan Tongo is het hart van Suriname. Ontstaan op de plantages als brug tussen Afrikanen, Europeanen en anderen.',cultureIcon:'✊',cultureBg:'var(--blue-l)',cultureTitle:'Creoolse roots',sourceShort:'Wilner et al. / SIL, 2007',speechLang:'nl-NL',
words:[{nl:'hallo',w:'odi',p:'o-di'},{nl:'hoe gaat het?',w:'fa yu de?',p:'fa yu de'},{nl:'goed',w:'bun',p:'bun'},{nl:'dank je',w:'tangi',p:'tan-gi'},{nl:'ja',w:'iya',p:'i-ya'},{nl:'nee',w:'no',p:'no'},{nl:'moeder',w:'mama',p:'ma-ma'},{nl:'vader',w:'papa',p:'pa-pa'},{nl:'kind',w:'pikin',p:'pi-kin'},{nl:'eten',w:'nyan',p:'nyan'},{nl:'water',w:'watra',p:'wat-ra'},{nl:'huis',w:'oso',p:'o-so'},{nl:'groot',w:'bigi',p:'bi-gi'},{nl:'mooi',w:'moi',p:'moi'},{nl:'liefde',w:'lobi',p:'lo-bi'},{nl:'vriend',w:'mati',p:'ma-ti'},{nl:'dag',w:'dei',p:'dei'},{nl:'nacht',w:'neti',p:'ne-ti'},{nl:'één',w:'wan',p:'wan'},{nl:'twee',w:'tu',p:'tu'},{nl:'drie',w:'tri',p:'tri'},{nl:'vier',w:'fo',p:'fo'},{nl:'vijf',w:'feyfi',p:'fey-fi'},{nl:'boom',w:'bon',p:'bon'},{nl:'rivier',w:'liba',p:'li-ba'},{nl:'vis',w:'fisi',p:'fi-si'},{nl:'vuur',w:'faya',p:'fa-ya'},{nl:'zon',w:'son',p:'son'},{nl:'broer',w:'brada',p:'bra-da'},{nl:'zuster',w:'sisa',p:'si-sa'}],
phrases:[{nl:'Hoe heet je?',w:'fa yu nem?',p:'fa yu nem'},{nl:'Mijn naam is...',w:'mi nem na ...',p:'mi nem na'},{nl:'Ik hou van jou.',w:'mi lobi yu.',p:'mi lo-bi yu'},{nl:'Tot ziens!',w:'te na baka!',p:'te na ba-ka'}]},
{id:'javaans',name:'Javaans',full:'Surinaams-Javaans',flag:'🌺',deco:'🌺',badge:'Erkend',badgeType:'green',speakers:'~75.000',group:'Javaanse gemeenschap',sub:'De taal van de Javaanse gemeenschap.',culture:'De Javaanse gemeenschap bracht wayang, gamelan en batik mee — nu onderdeel van de Surinaamse cultuur.',cultureIcon:'🌺',cultureBg:'var(--red-l)',cultureTitle:'Javaanse traditie',sourceShort:'Vruggink & Sarmo / KITLV, 2002',speechLang:'jv-ID',
words:[{nl:'hallo',w:'halo',p:'ha-lo'},{nl:'goedemorgen',w:'sugeng enjing',p:'su-geng en-jing'},{nl:'dank je',w:'matur nuwun',p:'ma-tur nu-wun'},{nl:'ja',w:'nggih',p:'ngih'},{nl:'nee',w:'mboten',p:'mbo-ten'},{nl:'moeder',w:'ibu',p:'i-bu'},{nl:'vader',w:'bapak',p:'ba-pak'},{nl:'kind',w:'anak',p:'a-nak'},{nl:'eten',w:'mangan',p:'ma-ngan'},{nl:'water',w:'banyu',p:'ban-yu'},{nl:'huis',w:'omah',p:'o-mah'},{nl:'goed',w:'apik',p:'a-pik'},{nl:'mooi',w:'ayu',p:'a-yu'},{nl:'liefde',w:'tresna',p:'tres-na'},{nl:'één',w:'siji',p:'si-ji'},{nl:'twee',w:'loro',p:'lo-ro'},{nl:'drie',w:'telu',p:'te-lu'},{nl:'rijst',w:'sego',p:'se-go'},{nl:'vriend',w:'kanca',p:'kan-ca'},{nl:'dag',w:'dina',p:'di-na'},{nl:'nacht',w:'wengi',p:'wen-gi'},{nl:'broer',w:'mas',p:'mas'},{nl:'zuster',w:'mbak',p:'mbak'},{nl:'boom',w:'wit',p:'wit'},{nl:'rivier',w:'kali',p:'ka-li'}],
phrases:[{nl:'Hoe heet je?',w:'Jenengmu sopo?',p:'je-neng-mu so-po'},{nl:'Mijn naam is...',w:'Jenengku ...',p:'je-neng-ku'},{nl:'Dank je wel.',w:'Matur nuwun sanget.',p:'ma-tur nu-wun san-get'},{nl:'Tot ziens.',w:'Sampun rumiyin.',p:'sam-pun ru-mi-yin'}]},
{id:'ndyuka',name:'Ndyuka',full:'Ndyuka (Aukaans)',flag:'🌿',deco:'🌿',badge:'Marontaal ¹',badgeType:'gold',speakers:'~30.000',group:'Ndyuka Marrons',sub:'De taal van de Ndyuka-Marrons.',culture:'De Ndyuka zijn nakomelingen van tot slaaf gemaakten die ontsnapten aan de plantages. Hun taal draagt de geschiedenis van vrijheidsstrijd.',cultureIcon:'🌿',cultureBg:'var(--green-l)',cultureTitle:'Marron erfgoed',sourceShort:'Huttar & Huttar / SIL, 1994',speechLang:'nl-NL',
words:[{nl:'hallo',w:'fa yu du?',p:'fa yu du'},{nl:'goed',w:'bun',p:'bun'},{nl:'dank je',w:'tangi',p:'tan-gi'},{nl:'ja',w:'ii',p:'ii'},{nl:'nee',w:'no',p:'no'},{nl:'moeder',w:'mama',p:'ma-ma'},{nl:'vader',w:'tata',p:'ta-ta'},{nl:'kind',w:'pikin',p:'pi-kin'},{nl:'water',w:'watra',p:'wat-ra'},{nl:'huis',w:'oso',p:'o-so'},{nl:'groot',w:'bigi',p:'bi-gi'},{nl:'boom',w:'puu',p:'puu'},{nl:'rivier',w:'liba',p:'li-ba'},{nl:'vuur',w:'faya',p:'fa-ya'},{nl:'één',w:'wan',p:'wan'},{nl:'twee',w:'tu',p:'tu'},{nl:'dag',w:'dei',p:'dei'},{nl:'nacht',w:'neti',p:'ne-ti'},{nl:'vis',w:'fisi',p:'fi-si'},{nl:'zon',w:'son',p:'son'}],
phrases:[{nl:'Hoe gaat het?',w:'fa yu du?',p:'fa yu du'},{nl:'Het gaat goed.',w:'mi de bun.',p:'mi de bun'},{nl:'Tot ziens.',w:'te na baka.',p:'te na ba-ka'},{nl:'Ik ga naar huis.',w:'mi e go na oso.',p:'mi e go na o-so'}]},
{id:'saramaccaans',name:'Saramaccaans',full:'Saramaccaans',flag:'🏞️',deco:'🏞️',badge:'Marontaal ¹',badgeType:'gold',speakers:'~25.000',group:'Saramaka Marrons',sub:'Portugese, Engelse en Afrikaanse roots.',culture:'Saramaccaans bevat veel Portugese woorden, een erfenis van Sefardische Joodse plantageholders in de 17e eeuw.',cultureIcon:'🏞️',cultureBg:'var(--blue-l)',cultureTitle:'Saramaka erfgoed',sourceShort:'Rountree & Glock / SIL, 1977',speechLang:'nl-NL',
words:[{nl:'hallo',w:'a di',p:'a di'},{nl:'goed',w:'bunu',p:'bu-nu'},{nl:'dank je',w:'i dé',p:'i dé'},{nl:'ja',w:'ii',p:'ii'},{nl:'nee',w:'a nó',p:'a nó'},{nl:'moeder',w:'mama',p:'ma-ma'},{nl:'vader',w:'tata',p:'ta-ta'},{nl:'kind',w:'piíi',p:'pí-i'},{nl:'water',w:'wáta',p:'wá-ta'},{nl:'huis',w:'óso',p:'ó-so'},{nl:'boom',w:'páu',p:'páu'},{nl:'rivier',w:'wóyo',p:'wó-yo'},{nl:'vuur',w:'féi',p:'féi'},{nl:'zon',w:'sónu',p:'só-nu'},{nl:'één',w:'wán',p:'wán'},{nl:'vis',w:'físi',p:'fí-si'},{nl:'nacht',w:'néti',p:'né-ti'},{nl:'dag',w:'déi',p:'déi'},{nl:'groot',w:'bígi',p:'bí-gi'},{nl:'mooi',w:'mói',p:'mói'}],
phrases:[{nl:'Hoe gaat het?',w:'unu de bunu?',p:'u-nu de bu-nu'},{nl:'Het gaat goed.',w:'mi de bunu.',p:'mi de bu-nu'},{nl:'Tot ziens.',w:'te na baka.',p:'te na ba-ka'},{nl:'Waar ga je heen?',w:'u di u e go?',p:'u di u e go'}]},
{id:'arawak',name:'Arawak',full:'Arawak (Lokono)',flag:'🌄',deco:'🌄',badge:'Inheems ¹',badgeType:'red',speakers:'~3.000',group:'Arawak / Lokono volk',sub:'Een van de oorspronkelijke talen van Suriname.',culture:'"Suriname" zelf is afgeleid van "Surinen", een Arawak-stam. De taal wordt actief gerevitaliseerd.',cultureIcon:'🌄',cultureBg:'var(--gold-l)',cultureTitle:'Inheemse roots',sourceShort:'Pet, W.J.A. / SIL, 1987',speechLang:'nl-NL',
words:[{nl:'hallo',w:'kama',p:'ka-ma'},{nl:'goed',w:'lokono',p:'lo-ko-no'},{nl:'dank je',w:'biara',p:'bi-a-ra'},{nl:'ja',w:'hã',p:'hã'},{nl:'nee',w:'koro',p:'ko-ro'},{nl:'moeder',w:'hiyari',p:'hi-ya-ri'},{nl:'vader',w:'hiyaro',p:'hi-ya-ro'},{nl:'water',w:'duna',p:'du-na'},{nl:'huis',w:'kibara',p:'ki-ba-ra'},{nl:'boom',w:'hidi',p:'hi-di'},{nl:'rivier',w:'tuna',p:'tu-na'},{nl:'zon',w:'adali',p:'a-da-li'},{nl:'maan',w:'kathi',p:'ka-thi'},{nl:'vis',w:'hima',p:'hi-ma'},{nl:'één',w:'abba',p:'ab-ba'},{nl:'twee',w:'biama',p:'bi-a-ma'},{nl:'aarde',w:'wama',p:'wa-ma'},{nl:'vuur',w:'wadili',p:'wa-di-li'},{nl:'kind',w:'nakhoro',p:'na-kho-ro'}],
phrases:[{nl:'Goedemorgen.',w:'Shikabo adali.',p:'shi-ka-bo a-da-li'},{nl:'Hoe heet je?',w:'Ama daka?',p:'a-ma da-ka'},{nl:'Dank je.',w:'Biara.',p:'bi-a-ra'},{nl:'Ik hou van jou.',w:'Niya lokoberi khu.',p:'ni-ya lo-ko-be-ri'}]},
{id:'karib',name:"Kari'na",full:"Kari'na (Karib)",flag:'🌊',deco:'🌊',badge:'Inheems ¹',badgeType:'red',speakers:'~3.000',group:"Kari'na volk",sub:"Taal van de Kari'na aan de noordkust.",culture:"'Caribisch' en 'Paramaribo' zijn beide afgeleid van Kari'na woorden.",cultureIcon:'🌊',cultureBg:'var(--blue-l)',cultureTitle:"Kari'na erfgoed",sourceShort:'Hoff, B.J. / KITLV, 1968',speechLang:'nl-NL',
words:[{nl:'hallo',w:'topu',p:'to-pu'},{nl:'goed',w:'marima',p:'ma-ri-ma'},{nl:'dank je',w:'kuriyano',p:'ku-ri-ya-no'},{nl:'ja',w:'au',p:'au'},{nl:'nee',w:'ewe',p:'e-we'},{nl:'moeder',w:'yaya',p:'ya-ya'},{nl:'vader',w:'papa',p:'pa-pa'},{nl:'water',w:'tuna',p:'tu-na'},{nl:'huis',w:'pata',p:'pa-ta'},{nl:'boom',w:'wewe',p:'we-we'},{nl:'zon',w:'weyú',p:'we-yú'},{nl:'vis',w:'waikeru',p:'wai-ke-ru'},{nl:'kind',w:'enu',p:'e-nu'},{nl:'één',w:'obo',p:'o-bo'},{nl:'twee',w:'oko',p:'o-ko'},{nl:'nacht',w:'poromé',p:'po-ro-mé'},{nl:'maan',w:'nuno',p:'nu-no'},{nl:'aarde',w:'yumali',p:'yu-ma-li'}],
phrases:[{nl:'Goedemorgen.',w:'Marima weyú.',p:'ma-ri-ma we-yú'},{nl:'Hoe heet je?',w:'Amochi nito?',p:'a-mo-chi ni-to'},{nl:'Dank je wel.',w:'Kuriyano.',p:'ku-ri-ya-no'},{nl:'Tot ziens.',w:'Moro.',p:'mo-ro'}]},
{id:'hakka',name:'Hakka',full:'Hakka Chinees',flag:'🏮',deco:'🏮',badge:'Gemeenschapstaal',badgeType:'ink',speakers:'~17.500',group:'Chinees-Surinaamse gemeenschap',sub:'De Chinese taal van Suriname.',culture:'De Hakka-Chinezen stichtten winkels door heel Suriname. De "Chinese winkeltje" is een icoon van het dagelijks leven.',cultureIcon:'🏮',cultureBg:'var(--red-l)',cultureTitle:'Chinees-Surinaamse cultuur',sourceShort:'Tjon Sie Fat / CUHK, 2009',speechLang:'zh-TW',
words:[{nl:'hallo',w:'nǐ hǎo',p:'ni hao'},{nl:'dank je',w:'m̀h-gōi',p:'mm-goi'},{nl:'ja',w:'hái',p:'hái'},{nl:'nee',w:'mò yû',p:'mo yu'},{nl:'goed',w:'hó',p:'hó'},{nl:'moeder',w:'a-mâ',p:'a-mà'},{nl:'vader',w:'a-pâ',p:'a-pà'},{nl:'eten',w:'sik-fan',p:'sik-fan'},{nl:'water',w:'súi',p:'súi'},{nl:'huis',w:'ûk',p:'ûk'},{nl:'één',w:'yit',p:'yit'},{nl:'twee',w:'ngi',p:'ngi'},{nl:'drie',w:'sâm',p:'sâm'},{nl:'vier',w:'si',p:'si'},{nl:'vijf',w:'ńg',p:'ng'},{nl:'kind',w:'sai-mân-jai',p:'sai-man-jai'},{nl:'groot',w:'thai',p:'thai'},{nl:'klein',w:'sai',p:'sai'},{nl:'vis',w:'ǹg',p:'ng'},{nl:'dag',w:'ngit-thèu',p:'ngit-thèu'}],
phrases:[{nl:'Hoe gaat het?',w:'Nǐ hǎo ma?',p:'ni hao ma'},{nl:'Dank je wel.',w:'M̀h-gōi saai.',p:'mm-goi saai'},{nl:'Tot ziens.',w:'Zàijiàn.',p:'zai-jian'},{nl:'Hoe heet je?',w:'Nǐ jiào shénme?',p:'ni jiao shenme'}]},
{id:'matawai',name:'Matawai',full:'Matawai',flag:'🌳',deco:'🌳',badge:'Marontaal ¹',badgeType:'gold',speakers:'~5.000',group:'Matawai Marrons',sub:'De taal van de Matawai-Marrons.',culture:'De Matawai sloten in 1762 als een van de eersten een vredesverdrag met de Nederlandse koloniale overheid.',cultureIcon:'🌳',cultureBg:'var(--green-l)',cultureTitle:'Matawai geschiedenis',sourceShort:'Huttar, G.L. / SIL',speechLang:'nl-NL',
words:[{nl:'hallo',w:'fa yu du?',p:'fa yu du'},{nl:'goed',w:'bun',p:'bun'},{nl:'dank je',w:'tangi',p:'tan-gi'},{nl:'ja',w:'ee',p:'ee'},{nl:'nee',w:'no',p:'no'},{nl:'moeder',w:'mama',p:'ma-ma'},{nl:'vader',w:'tata',p:'ta-ta'},{nl:'kind',w:'pikin',p:'pi-kin'},{nl:'water',w:'watra',p:'wat-ra'},{nl:'huis',w:'oso',p:'o-so'},{nl:'boom',w:'puu',p:'puu'},{nl:'rivier',w:'liba',p:'li-ba'},{nl:'vuur',w:'faya',p:'fa-ya'},{nl:'zon',w:'son',p:'son'},{nl:'één',w:'wan',p:'wan'},{nl:'vis',w:'fisi',p:'fi-si'},{nl:'dag',w:'dei',p:'dei'},{nl:'nacht',w:'neti',p:'ne-ti'},{nl:'groot',w:'bigi',p:'bi-gi'},{nl:'mooi',w:'moi',p:'moi'}],
phrases:[{nl:'Hoe gaat het?',w:'fa yu du?',p:'fa yu du'},{nl:'Het gaat goed.',w:'mi de bun.',p:'mi de bun'},{nl:'Ik ga naar huis.',w:'mi go na oso.',p:'mi go na o-so'},{nl:'Dank je.',w:'tangi.',p:'tan-gi'}]}
];
