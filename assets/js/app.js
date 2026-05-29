// TaluSuri — UI rendering, lessons/exams, navigation, features & init
// Part of a static site; loaded as a classic script (relies on global scope for inline handlers).

// ═══ AUDIO ═══
let audioMode='tts'; // flashcard audio mode: 'tts' | 'guide' | 'contrib'
// Switch the flashcard audio mode (TTS / phonetic guide / community) and re-render.
function setAudioMode(mode,btn){audioMode=mode;document.querySelectorAll('.audio-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderFlash();}
// Speak text aloud. If the community has an admin-promoted recording for this
// word (in the current language), play that instead of the robot voice;
// otherwise fall back to the browser Speech Synthesis API (slightly slowed).
let _ttsAudio=null;
function speak(text,langCode){
  const key=(typeof wordKey==='function')?wordKey(S.lang.id,text):null;
  const official=key&&window.OFFICIAL_AUDIO?window.OFFICIAL_AUDIO[key]:null;
  if(official){
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    if(_ttsAudio)_ttsAudio.pause();
    _ttsAudio=new Audio(official);_ttsAudio.play();
    return;
  }
  if(!('speechSynthesis'in window)){alert('Je browser ondersteunt geen spraak. Probeer Chrome of Edge.');return;}
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang=langCode||'nl-NL';u.rate=0.85;
  window.speechSynthesis.speak(u);
}

// ═══ FLAGS / FEEDBACK ═══
// Read the saved word-flag/feedback list from localStorage.
function getFlags(){try{return JSON.parse(localStorage.getItem('talusuri_flags')||'[]');}catch(e){return[];}}
// Save a new word flag (newest first, capped at 100) and unlock the contributor badge.
function saveFlag(obj){const f=getFlags();f.unshift({...obj,id:Date.now(),ts:new Date().toLocaleDateString('nl-NL')});localStorage.setItem('talusuri_flags',JSON.stringify(f.slice(0,100)));updateFeedbackBadge();unlockBadge('contributor');}
// Clear all saved feedback (with confirmation).
function clearFeedback(){if(confirm('Alle feedback wissen?')){localStorage.removeItem('talusuri_flags');updateFeedbackBadge();renderFeedbackList();}}
// Refresh the feedback count badge and the Ontdek nav dot.
function updateFeedbackBadge(){const n=getFlags().length;const b=document.getElementById('more-feedback-badge');if(b){b.textContent=n;b.style.display=n>0?'inline':'none';}const c=document.getElementById('feedback-count');if(c)c.textContent='('+n+')';const dot=document.getElementById('dot-ontdek');if(dot)dot.style.display=n>0?'block':'none';}

// ═══ CAMERA LENS ═══
// Concrete objects with emoji, matched to vocabulary across languages by Dutch keyword.
const LENS_OBJECTS=[
{emoji:'💧',nl:'water',keys:['water']},
{emoji:'🏠',nl:'huis',keys:['huis']},
{emoji:'🌳',nl:'boom',keys:['boom']},
{emoji:'🔥',nl:'vuur',keys:['vuur']},
{emoji:'🐟',nl:'vis',keys:['vis']},
{emoji:'☀️',nl:'zon',keys:['zon']},
{emoji:'🌙',nl:'maan',keys:['maan']},
{emoji:'🍚',nl:'rijst',keys:['rijst']},
{emoji:'🌊',nl:'rivier',keys:['rivier']},
{emoji:'👤',nl:'kind',keys:['kind']},
{emoji:'👩',nl:'moeder',keys:['moeder']},
{emoji:'👨',nl:'vader',keys:['vader']},
{emoji:'🌍',nl:'aarde',keys:['aarde']},
{emoji:'🍴',nl:'eten',keys:['eten']},
{emoji:'🙏',nl:'dank je',keys:['dank je','dank']}
];
let lensStream=null;
// Show one camera-lens phase (start/camera/result/translations) and hide the rest.
function setLensPhase(phase){
  ['lens-start','lens-camera','lens-result','lens-translations'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.classList.toggle('hidden',id!=='lens-'+phase);
  });
}
// Request the rear camera and start the live preview; fall back to manual pick on failure.
async function startLens(){
  try{
    lensStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=document.getElementById('lens-video');v.srcObject=lensStream;
    setLensPhase('camera');
  }catch(e){
    alert('Kon de camera niet openen. Geef toestemming voor cameratoegang in je browser, of probeer het op een telefoon. Je kunt ook zonder camera een object kiezen.');
    // fallback: skip straight to object picker
    document.getElementById('lens-photo').style.display='none';
    setLensPhase('result');renderLensObjects();
  }
}
// Stop the camera stream and return to the lens start screen.
function stopLens(){
  if(lensStream){lensStream.getTracks().forEach(t=>t.stop());lensStream=null;}
  setLensPhase('start');
}
// Capture the current video frame to a photo, stop the camera, then show the object picker.
function captureLens(){
  const v=document.getElementById('lens-video'),c=document.getElementById('lens-canvas');
  if(v.videoWidth){
    c.width=v.videoWidth;c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    const img=document.getElementById('lens-photo');
    img.src=c.toDataURL('image/jpeg',0.85);img.style.display='block';
  }
  if(lensStream){lensStream.getTracks().forEach(t=>t.stop());lensStream=null;}
  document.getElementById('lens-search').value='';
  setLensPhase('result');renderLensObjects();
}
// Render the object-picker grid, filtered by the search box.
function renderLensObjects(){
  const q=(document.getElementById('lens-search').value||'').toLowerCase().trim();
  const grid=document.getElementById('lens-objects');if(!grid)return;
  const list=q?LENS_OBJECTS.filter(o=>o.nl.includes(q)):LENS_OBJECTS;
  if(!list.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:13px;padding:16px;">Geen object gevonden. Probeer een ander woord.</div>';return;}
  grid.innerHTML=list.map((o,i)=>`<div class="lens-obj" onclick="showLensTranslations(${LENS_OBJECTS.indexOf(o)})"><div class="lens-obj-emoji">${o.emoji}</div><div class="lens-obj-name">${o.nl}</div></div>`).join('');
}
// Find the word in a language whose Dutch matches one of an object's keywords.
function findWordInLang(lang,obj){
  // find a word whose Dutch matches one of the object's keys
  for(const k of obj.keys){
    const w=lang.words.find(w=>w.nl.toLowerCase()===k||w.nl.toLowerCase().includes(k));
    if(w)return w;
  }
  return null;
}
// Show the chosen object's word in every language (sorted), each with a TTS button.
function showLensTranslations(idx){
  const obj=LENS_OBJECTS[idx];if(!obj)return;
  document.getElementById('lens-chosen-emoji').textContent=obj.emoji;
  document.getElementById('lens-chosen-nl').textContent=obj.nl;
  const list=document.getElementById('lens-trans-list');
  list.innerHTML=[...LANGS].sort((a,b)=>a.name.localeCompare(b.name,'nl')).map(l=>{
    const w=findWordInLang(l,obj);
    if(!w)return '';
    return `<div class="lens-trans-row"><span class="lens-trans-flag">${l.flag}</span><div class="lens-trans-info"><div class="lens-trans-lang">${l.name}</div><div class="lens-trans-word">${w.w}</div><div class="lens-trans-pron">/${w.p}/</div></div><button class="dict-btn" onclick="speak('${w.w.replace(/'/g,"")}','${l.speechLang}')"><span class="emo">🔊</span></button></div>`;
  }).join('')||'<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px;">Dit woord is nog niet in onze woordenlijsten beschikbaar.</div>';
  setLensPhase('translations');
}
// Reset the lens back to the start screen for another scan.
function resetLens(){document.getElementById('lens-photo').style.display='block';setLensPhase('start');}

// ═══ BETA BAR ═══
// Hide the beta banner and remember the dismissal.
function dismissBeta(){const b=document.getElementById('beta-bar');if(b)b.style.display='none';try{localStorage.setItem('talusuri_beta_dismissed','1');}catch(e){}}
// Open the Community view and scroll to the contact form.
function goToContact(){showView('feedback');setTimeout(()=>{const el=document.getElementById('contact-form');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},100);}
// Hide the beta banner on load if it was dismissed before.
function initBeta(){try{if(localStorage.getItem('talusuri_beta_dismissed')){const b=document.getElementById('beta-bar');if(b)b.style.display='none';}}catch(e){}}

// ═══ CONTACT FORM ═══
// Fill the contact form's language dropdown once.
function populateContactLangs(){
  const sel=document.getElementById('contact-lang');if(!sel||sel.dataset.filled)return;
  [...LANGS].sort((a,b)=>a.name.localeCompare(b.name,'nl')).forEach(l=>{const o=document.createElement('option');o.textContent=l.full;sel.appendChild(o);});
  sel.dataset.filled='1';
}
// Read locally backed-up contact submissions from localStorage.
function getContacts(){try{return JSON.parse(localStorage.getItem('talusuri_contacts')||'[]');}catch(e){return[];}}
// Validate the contact form, back it up locally, POST to Netlify, and show the thank-you.
function submitContact(e){
  if(e)e.preventDefault();
  const form=document.getElementById('contact-form');
  const name=document.getElementById('contact-name').value.trim();
  const email=document.getElementById('contact-email').value.trim();
  const subject=document.getElementById('contact-subject').value;
  const lang=document.getElementById('contact-lang').value;
  const msg=document.getElementById('contact-message').value.trim();
  if(!name||!email||!msg){alert('Vul je naam, e-mail en bericht in om te versturen.');return false;}
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){alert('Vul een geldig e-mailadres in.');return false;}
  // keep a local copy as backup
  try{const c=getContacts();c.unshift({name,email,subject,lang,msg,ts:new Date().toLocaleString('nl-NL')});localStorage.setItem('talusuri_contacts',JSON.stringify(c.slice(0,50)));}catch(e){}
  // submit to Netlify Forms (works once hosted on Netlify; harmless elsewhere)
  const data=new URLSearchParams(new FormData(form)).toString();
  fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data}).catch(()=>{});
  // show thank-you regardless, so the UX is smooth in preview and production
  document.querySelectorAll('#contact-form .contact-field,#contact-form .contact-row,.contact-submit').forEach(el=>el.style.display='none');
  document.getElementById('contact-thanks').classList.add('show');
  return false;
}

// Render the list of submitted word flags / feedback.
function renderFeedbackList(){
  const list=document.getElementById('feedback-list');if(!list)return;
  const flags=getFlags();
  if(!flags.length){list.innerHTML='<div class="feedback-empty"><span class="emo">🚩</span>Nog geen feedback.<br><span style="font-size:12px;">Vlag woorden via het woordenboek of een les.</span></div>';return;}
  list.innerHTML=flags.map(f=>`<div class="feedback-item"><div class="feedback-item-header"><div><div class="feedback-word">${f.word||'?'}</div><div class="feedback-lang">${f.lang||''}</div></div><div style="font-size:11px;color:var(--muted);">${f.ts||''}</div></div><div class="feedback-text">${f.text||'(geen toelichting)'}</div>${f.nl?`<div class="feedback-meta">NL: ${f.nl}</div>`:''}</div>`).join('');
}
let openFlagId=null; // id of the currently-open inline flag form (only one at a time)
// Open/close the inline flag form for a row (only one open at a time).
function toggleFlag(id){
  if(openFlagId===id){document.getElementById('flag-form-'+id)?.classList.remove('open');openFlagId=null;return;}
  if(openFlagId)document.getElementById('flag-form-'+openFlagId)?.classList.remove('open');
  openFlagId=id;const form=document.getElementById('flag-form-'+id);if(form){form.classList.add('open');form.querySelector('textarea')?.focus();}
}
// Save a word flag and show a brief thank-you.
function submitFlag(id,word,nl,lang){
  const form=document.getElementById('flag-form-'+id);const text=form?.querySelector('textarea')?.value?.trim();
  saveFlag({word,nl,lang,text});form.classList.remove('open');openFlagId=null;
  const t=document.getElementById('flag-thanks-'+id);if(t){t.style.display='block';setTimeout(()=>{t.style.display='none';},2500);}
  if(document.getElementById('view-feedback').classList.contains('active'))renderFeedbackList();
}

// ═══ BADGES ═══
// Award a badge if not already earned; returns true if newly unlocked.
function unlockBadge(id){
  if(S.badges.includes(id))return false;
  S.badges.push(id);saveState();renderHomeBadges();renderBadgesGrid();
  return true;
}
// Award any streak/flashcard/level/polyglot badges the user now qualifies for.
function checkBadges(){
  if(S.streak>=3)unlockBadge('streak_3');
  if(S.streak>=7)unlockBadge('streak_7');
  if(S.flashOk>=10)unlockBadge('flash_10');
  if(getLevel(S.xp)>=5)unlockBadge('level_5');
  if(S.seenLangs.length>=3)unlockBadge('polyglot');
  if(S.seenLangs.length>=10)unlockBadge('explorer');
}

// ═══ EXERCISE GENERATION (varied types) ═══
// Return a shuffled copy of an array (Fisher–Yates).
function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
// Build shuffled answer options: the correct one plus n wrong ones.
function pickDistractors(correct,pool,n,key){
  const opts=shuffle(pool.filter(w=>w[key]!==correct[key])).slice(0,n).map(w=>w[key]);
  return shuffle([correct[key],...opts]);
}
// Generate questions for a lesson theme by sampling words
// Generate a mixed set of questions (multiple-choice, type-in, listen) by sampling words.
function genLessonQuestions(words,count){
  const sample=shuffle(words).slice(0,count);
  return sample.map((wd,i)=>{
    const type=i%4; // cycle through 4 types
    if(type===0){ // NL->target multiple choice
      return{kind:'mc',q:`Hoe zeg je "${wd.nl}" in ${S.lang.name}?`,c:wd.w,o:pickDistractors(wd,words,3,'w'),speak:wd.w};
    }else if(type===1){ // target->NL multiple choice
      return{kind:'mc',q:`Wat betekent "${wd.w}"?`,c:wd.nl,o:pickDistractors(wd,words,3,'nl'),speak:wd.w};
    }else if(type===2){ // type-in
      return{kind:'type',q:`Typ de vertaling van "${wd.nl}" in ${S.lang.name}:`,c:wd.w,hint:wd.p,speak:wd.w};
    }else{ // listen & choose (uses TTS)
      return{kind:'listen',q:`Luister en kies de juiste vertaling:`,c:wd.nl,o:pickDistractors(wd,words,3,'nl'),speak:wd.w,listenWord:wd.w};
    }
  });
}

// ═══ RENDER: SET LANGUAGE ═══
// Switch the active language and re-render every language-dependent part of the UI.
function setLang(l){
  S.lang=l;S.flashIdx=0;S.flashRevealed=false;S.flashOk=0;S.flashTot=0;
  if(!S.seenLangs.includes(l.id)){S.seenLangs.push(l.id);checkBadges();}
  document.getElementById('hero-title').textContent=l.full;
  document.getElementById('hero-sub').textContent=l.sub;
  document.getElementById('hero-deco').textContent=l.deco;
  const w=l.words[new Date().getDay()%l.words.length];
  document.getElementById('wod-w').textContent=w.w;
  document.getElementById('wod-nl').textContent=w.nl;
  document.getElementById('dict-lang-title').textContent='NL → '+l.name;
  document.getElementById('dict-q').value='';
  renderDict(l.words.slice(0,8));
  document.getElementById('dict-source').innerHTML='<span class="emo">📚</span>Bron: '+l.sourceShort;
  renderFlash();
  document.getElementById('culture-card').style.background=l.cultureBg;
  document.getElementById('cult-icon').textContent=l.cultureIcon;
  document.getElementById('cult-title').textContent=l.cultureTitle;
  document.getElementById('cult-text').textContent=l.culture;
  renderPhrases();renderHomeLessons();
  document.querySelectorAll('.lang-card').forEach(c=>c.classList.toggle('active',c.dataset.id===l.id));
  document.getElementById('les-view-title').textContent='Lessen: '+l.full;
  renderAllLessons();
  document.getElementById('wb-title').textContent='Woordenboek: '+l.name;
  renderWB(l.words);
  updateSwitcherLabel();
  const src=SOURCES.find(s=>s.id===l.id);
  document.getElementById('wb-source').innerHTML='<strong style="color:var(--ink);font-size:12px;display:block;margin-bottom:6px;">Bronnen voor deze woordenlijst</strong>'+(src?src.sources.map(s=>`<span style="display:block;margin-top:4px;"><strong style="font-weight:500;color:var(--ink);">${s.title}</strong> — ${s.author} (${s.year})</span>`).join(''):'');
  saveState();
}

// ═══ RENDER: HEADER STATS ═══
// Update the level, XP bar, streak dots and badge counters in the header/cards.
function renderStats(){
  const lvl=getLevel(S.xp);
  document.getElementById('level-num').textContent=lvl;
  const lnp=document.getElementById('level-num-pill');if(lnp)lnp.textContent=lvl;
  document.getElementById('level-title').textContent=getLevelTitle(lvl);
  const inLvl=xpInLevel(S.xp);
  document.getElementById('level-fill').style.width=inLvl+'%';
  document.getElementById('xp-current').textContent=S.xp+' XP';
  document.getElementById('xp-next').textContent=(lvl*100)+' XP';
  const slb=document.getElementById('streak-lbl');if(slb)slb.textContent=S.streak;
  document.getElementById('streak-days').textContent=S.streak;
  const bar=document.getElementById('s-bar');bar.innerHTML='';
  for(let i=0;i<7;i++){const d=document.createElement('div');d.className='s-dot'+(i<S.streak?' done':'');bar.appendChild(d);}
  const bl=document.getElementById('badge-level');if(bl)bl.textContent=lvl;
  const bx=document.getElementById('badge-xp');if(bx)bx.textContent=S.xp;
  const bc=document.getElementById('badge-count');if(bc)bc.textContent=S.badges.length;
}
// Add XP, refresh stats/badges, and return true if the user leveled up.
function addXP(n){
  const before=getLevel(S.xp);S.xp+=n;const after=getLevel(S.xp);
  renderStats();checkBadges();saveState();
  return after>before; // leveled up
}

// ═══ RENDER: DICT ═══
// Render the home dictionary rows (with speak/flag actions) for the given words.
function renderDict(words){
  const list=document.getElementById('dict-list');list.innerHTML='';
  words.forEach((w,i)=>{
    const id='dw'+i;
    const row=document.createElement('div');row.className='dict-row';
    row.innerHTML=`<span class="dict-nl">${w.nl}</span><div class="dict-actions"><button class="dict-btn" onclick="speak('${w.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')" title="Uitspreken"><span class="emo">🔊</span></button><button class="dict-btn mic-contrib" onclick="openRecordings(S.lang.id,'${w.w.replace(/'/g,"\\'")}')" title="Uitspraken & opnemen"><span class="emo">🎙️</span></button><button class="dict-btn flag" onclick="toggleFlag('${id}')" title="Flag"><span class="emo">🚩</span></button></div><div class="dict-word-block"><span class="dict-sr">${w.w}</span><span class="dict-pron">${w.p}</span></div>`;
    list.appendChild(row);
    const fw=document.createElement('div');
    fw.innerHTML=`<div class="flag-form" id="flag-form-${id}"><div style="font-size:11px;color:var(--red);font-weight:500;margin-bottom:5px;">🚩 Wat klopt er niet aan "${w.w}"?</div><textarea placeholder="Bijv: verkeerde vertaling, andere uitspraak..."></textarea><div class="flag-form-actions"><button class="flag-submit" onclick="submitFlag('${id}','${w.w.replace(/'/g,"\\'")}','${w.nl.replace(/'/g,"\\'")}','${S.lang.name}')">Indienen</button><button class="flag-cancel" onclick="toggleFlag('${id}')">Annuleren</button></div></div><div class="flag-thanks" id="flag-thanks-${id}">✓ Bedankt!</div>`;
    list.appendChild(fw);
  });
}
// Re-render the home dictionary filtered by its search box (max 8 rows).
function filterDict(){const q=document.getElementById('dict-q').value.toLowerCase();renderDict((q?S.lang.words.filter(w=>w.nl.includes(q)||w.w.toLowerCase().includes(q)):S.lang.words).slice(0,8));}

// ═══ GLOBAL SEARCH ═══
// Search all languages for the query and render matching word cards.
function globalSearch(){
  const q=document.getElementById('global-search').value.toLowerCase().trim();
  const res=document.getElementById('search-results');
  if(!q){res.innerHTML='';return;}
  const hits=[];
  LANGS.forEach(l=>{l.words.forEach(w=>{if(w.nl.toLowerCase().includes(q)||w.w.toLowerCase().includes(q))hits.push({...w,langName:l.name,langId:l.id,speechLang:l.speechLang});});});
  if(!hits.length){res.innerHTML='<div class="search-empty">Geen resultaten voor "'+q+'"</div>';return;}
  res.innerHTML=hits.slice(0,18).map(h=>`<div class="search-result" onclick="speak('${h.w.replace(/'/g,"\\'")}','${h.speechLang}')"><div class="sr-word">${h.w}</div><div class="sr-nl">${h.nl}</div><span class="sr-lang">${h.langName}</span></div>`).join('');
}

// ═══ FLASHCARD ═══
// Render the current flashcard front plus the audio row for the active audio mode.
function renderFlash(){
  const fc=S.lang.words[S.flashIdx%S.lang.words.length];
  document.getElementById('fl-w').textContent=fc.w;
  document.getElementById('fl-p').textContent='/'+fc.p+'/';
  const a=document.getElementById('fl-a');a.textContent=fc.nl;a.className='flash-nl';
  const reveal=document.getElementById('fl-reveal');if(reveal)reveal.style.display='block';
  document.getElementById('fl-acts').style.display='none';
  S.flashRevealed=false;
  document.getElementById('fl-score').textContent=S.flashTot>0?S.flashOk+' van '+S.flashTot+' correct':'';
  const ar=document.getElementById('fl-audio-row');ar.innerHTML='';
  if(audioMode==='tts')ar.innerHTML=`<button class="speak-btn" onclick="speak('${fc.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')"><span class="emo">🔊</span> Hoor uitspraak</button>`;
  else if(audioMode==='guide')ar.innerHTML=`<span style="font-size:13px;color:var(--muted);">📖 Spreek uit: <strong style="color:var(--ink);">${fc.p}</strong></span>`;
  else ar.innerHTML=`<button class="contrib-btn" onclick="openRecordings(S.lang.id,'${fc.w.replace(/'/g,"\\'")}')"><span class="emo">🎙️</span> Opnames & opnemen</button>`;
}
// Reveal the flashcard answer and show the self-grading buttons.
function revealFlash(){if(S.flashRevealed)return;S.flashRevealed=true;document.getElementById('fl-a').classList.add('show');document.getElementById('fl-reveal').style.display='none';document.getElementById('fl-acts').style.display='flex';}
// Record the flashcard result (+XP if known) and advance to the next card.
function nextFlash(ok){S.flashTot++;if(ok){S.flashOk++;addXP(2);}S.flashIdx++;renderFlash();checkBadges();}

// ═══ PROGRESS, PHRASES, LESSONS ═══
// Render the per-theme progress ring for each lesson.
function renderProgress(){
  const grid=document.getElementById('prog-grid');grid.innerHTML='';
  S.lang.lessons.forEach((les,i)=>{
    const key=S.lang.id+'-'+i;const pct=S.themeProgress[key]||0,c=2*Math.PI*14,off=c*(1-pct/100);
    const el=document.createElement('div');el.className='prog-item';
    el.innerHTML=`<svg viewBox="0 0 36 36" width="44" height="44"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" stroke-width="3"/><circle cx="18" cy="18" r="14" fill="none" stroke="${pct>0?'var(--green)':'transparent'}" stroke-width="3" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 18 18)" stroke-linecap="round"/><text x="18" y="22" text-anchor="middle" font-size="13" >${les.emoji}</text></svg><div class="prog-lbl">${les.title}</div>`;
    grid.appendChild(el);
  });
}
// Render the handy-phrases list for the active language.
function renderPhrases(){
  const list=document.getElementById('phrase-list');list.innerHTML='';
  S.lang.phrases.forEach(p=>{const el=document.createElement('div');el.className='phrase-item';el.innerHTML=`<div class="phrase-nl">${p.nl}</div><div style="display:flex;align-items:center;gap:6px;"><div class="phrase-sr">${p.w}</div><button class="dict-btn" onclick="speak('${p.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')" style="opacity:.6;"><span class="emo">🔊</span></button></div><div class="phrase-pron">${p.p}</div>`;list.appendChild(el);});
}
// Return the saved completion percentage for a lesson index.
function lessonProgress(i){return S.themeProgress[S.lang.id+'-'+i]||0;}
// Render the two lesson cards shown on the home screen.
function renderHomeLessons(){
  S.lang.lessons.slice(0,2).forEach((l,i)=>{
    const el=document.getElementById('les'+i);if(!el)return;const pct=lessonProgress(i);
    el.innerHTML=`${pct>=100?'<span class="emo lesson-done">✅</span>':''}<div class="lesson-emoji">${l.emoji}</div><div class="lesson-title">${l.title}</div><div class="lesson-meta">Les ${i+1} · 6 vragen · ${l.xp} XP</div><div class="lesson-bar"><div class="lesson-fill" style="width:${pct}%"></div></div>`;
    el.onclick=()=>startLesson(i);
  });
}
// Render all lesson cards (plus the exam card) on the Lessons view.
function renderAllLessons(){
  const grid=document.getElementById('all-lessons');grid.innerHTML='';
  S.lang.lessons.forEach((l,i)=>{
    const pct=lessonProgress(i);
    const card=document.createElement('div');card.className='card clickable';
    card.innerHTML=`${pct>=100?'<span class="emo lesson-done">✅</span>':''}<div style="font-size:28px;margin-bottom:8px;">${l.emoji}</div><div style="font-family:'Fraunces',serif;font-weight:600;font-size:15px;margin-bottom:4px;">${l.title}</div><div style="font-size:12px;color:var(--muted);margin-bottom:12px;">6 vragen · ${l.xp} XP</div><div class="lesson-bar"><div class="lesson-fill" style="width:${pct}%"></div></div>`;
    card.onclick=()=>startLesson(i);grid.appendChild(card);
  });
  // exam card
  const exam=document.createElement('div');exam.className='card clickable exam-card';
  exam.innerHTML=`<div style="font-size:28px;margin-bottom:8px;">🎓</div><div style="font-family:'Fraunces',serif;font-weight:600;font-size:15px;margin-bottom:4px;color:#fff;">Examen</div><div style="font-size:12px;color:rgba(255,255,255,.7);margin-bottom:12px;">10 vragen · alle thema's</div><div style="font-size:11px;color:rgba(255,255,255,.6);">Haal 80% voor je certificaat 🏅</div>`;
  exam.onclick=()=>startExam();grid.appendChild(exam);
}
// Render the full alphabetical grid of languages on the Talen view.
function renderLangGrid(){
  const grid=document.getElementById('lang-grid');grid.innerHTML='';
  [...LANGS].sort((a,b)=>a.name.localeCompare(b.name,'nl')).forEach(l=>{const card=document.createElement('div');card.className='lang-card'+(l.id===S.lang.id?' active':'');card.dataset.id=l.id;card.innerHTML=`<div class="lc-flag">${l.flag}</div><div class="lc-name">${l.name}</div><div class="lc-meta">${l.speakers}<br>${l.group}</div><div><span class="lc-badge badge-${l.badgeType}">${l.badge}</span></div>`;card.onclick=()=>{setLang(l);showView('home');};grid.appendChild(card);});
}
// Render the dictionary cards on the Woordenboek view.
function renderWB(words){
  const grid=document.getElementById('wb-grid');grid.innerHTML='';
  words.forEach((w,i)=>{const id='wb'+i;const card=document.createElement('div');card.className='card';card.style.padding='14px';
    card.innerHTML=`<div style="font-size:11px;color:var(--muted);margin-bottom:3px;">${w.nl}</div><div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-family:'Fraunces',serif;font-weight:600;font-size:17px;color:var(--green);">${w.w}</div><div style="display:flex;gap:3px;"><button class="dict-btn" onclick="speak('${w.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')"><span class="emo">🔊</span></button><button class="dict-btn mic-contrib" onclick="openRecordings(S.lang.id,'${w.w.replace(/'/g,"\\'")}')" title="Uitspraken & opnemen"><span class="emo">🎙️</span></button><button class="dict-btn flag" onclick="toggleFlag('${id}')"><span class="emo">🚩</span></button></div></div><div style="font-size:11px;color:var(--muted);font-style:italic;margin-top:2px;">/${w.p}/</div><div class="flag-form" id="flag-form-${id}"><div style="font-size:11px;color:var(--red);font-weight:500;margin-bottom:5px;">🚩 Wat klopt er niet?</div><textarea placeholder="Toelichting..."></textarea><div class="flag-form-actions"><button class="flag-submit" onclick="submitFlag('${id}','${w.w.replace(/'/g,"\\'")}','${w.nl.replace(/'/g,"\\'")}','${S.lang.name}')">Indienen</button><button class="flag-cancel" onclick="toggleFlag('${id}')">Annuleren</button></div></div><div class="flag-thanks" id="flag-thanks-${id}">✓ Bedankt!</div>`;
    grid.appendChild(card);});
}
// Re-render the Woordenboek filtered by its search box.
function filterWB(){const q=document.getElementById('wb-q').value.toLowerCase();renderWB(q?S.lang.words.filter(w=>w.nl.includes(q)||w.w.toLowerCase().includes(q)):S.lang.words);}
// Render the per-language academic sources on the Bronnen view.
function renderSourcesGrid(){
  const grid=document.getElementById('sources-grid');grid.innerHTML='';
  SOURCES.forEach(s=>{const lang=LANGS.find(l=>l.id===s.id);const card=document.createElement('div');card.className='source-card';card.innerHTML=`<div class="source-lang"><span class="source-flag">${lang?lang.flag:'🌐'}</span><span class="source-lang-name">${s.name}</span></div>`+s.sources.map(src=>`<div class="source-item"><strong>${src.title}</strong>${src.author} (${src.year})<br><span class="source-tag ${src.type==='primary'?'tag-primary':'tag-secondary'}">${src.type==='primary'?'Primaire bron':'Aanvullende bron'}</span>${src.note?`<span style="display:block;margin-top:3px;font-size:11px;">${src.note}</span>`:''}</div>`).join('');grid.appendChild(card);});
}
// Render up to 4 earned badges on the home screen.
function renderHomeBadges(){
  const el=document.getElementById('home-badges');if(!el)return;
  const earned=BADGES.filter(b=>S.badges.includes(b.id)).slice(0,4);
  if(!earned.length){el.innerHTML='<div style="font-size:12px;color:var(--muted);padding:8px;">Nog geen badges. Voltooi een les om te beginnen! 🌱</div>';return;}
  el.innerHTML=earned.map(b=>`<div class="badge-item"><div class="badge-icon">${b.icon}</div><div><div class="badge-info-name">${b.name}</div><div class="badge-info-desc">${b.desc}</div></div></div>`).join('');
}
// Render all badges (locked + unlocked) on the Badges view.
function renderBadgesGrid(){
  const grid=document.getElementById('badges-grid');if(!grid)return;
  grid.innerHTML=BADGES.map(b=>{const earned=S.badges.includes(b.id);return `<div class="badge-item ${earned?'':'locked'}" style="padding:16px;"><div class="badge-icon" style="width:48px;height:48px;font-size:26px;">${earned?b.icon:'🔒'}</div><div><div class="badge-info-name" style="font-size:14px;">${b.name}</div><div class="badge-info-desc">${b.desc}</div></div></div>`;}).join('');
}
// Render the leaderboard with the user inserted and ranked by XP.
// Uses real accounts from Supabase (auth.js) when available, otherwise falls
// back to the sample LEADERBOARD so the app still works anonymous/offline.
async function renderLeaderboard(){
  const list=document.getElementById('leaderboard-list');if(!list)return;
  const localMe=()=>({name:'Jij',xp:S.xp,langs:LANGS.filter(l=>S.seenLangs.includes(l.id)).map(l=>l.name).join(', ')||S.lang.name,avatar:'JIJ',me:true});
  let all;
  const rows=window.fetchLeaderboard?await window.fetchLeaderboard():null;
  if(rows){
    all=rows;
    const uid=window.AUTH&&window.AUTH.user&&window.AUTH.user.id;
    if(uid)all.forEach(r=>{if(r.id===uid)r.me=true;}); // mark my own row
    else all.push(localMe());                          // not logged in → show local progress too
  }else{
    all=[...LEADERBOARD,localMe()];                     // fallback: sample players + local "Jij"
  }
  all.sort((a,b)=>b.xp-a.xp);
  list.innerHTML=all.map((p,i)=>`<div class="lb-row ${p.me?'me':''}"><div class="lb-rank ${i<3?'top':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div><div class="lb-avatar">${p.avatar_url?`<img src="${p.avatar_url}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:p.avatar}</div><div class="lb-info"><div class="lb-name">${p.name}${p.me?' (jij)':''}</div><div class="lb-detail">${p.langs}</div></div><div class="lb-xp">${p.xp.toLocaleString('nl-NL')} XP</div></div>`).join('');
}

// ═══ VIEWS ═══
// ═══ GROUPED NAVIGATION ═══
// The bottom-nav / top-bar tabs. Each group opens a bottom sheet listing its views.
// Each item: {v: view id (matches a <div id="view-…">), icon, label, badge?: element id for a count dot}.
const NAV_GROUPS={
  leren:{title:'Leren',sub:'Studeer met lessen, grammatica en je leerpad',items:[
    {v:'curriculum',icon:'🧭',label:'Leerpad'},
    {v:'lessen',icon:'🎓',label:'Lessen'},
    {v:'grammatica',icon:'✏️',label:'Grammatica'},
    {v:'crash',icon:'⚡',label:'Spoedcursus'}
  ]},
  oefenen:{title:'Oefenen',sub:'Herhaal, zoek op en ontdek met je camera',items:[
    {v:'lens',icon:'📷',label:'Camera-lens'},
    {v:'mistakes',icon:'🔁',label:'Mijn fouten',badge:'more-mistakes-badge'},
    {v:'woordenboek',icon:'📕',label:'Woordenboek'}
  ]},
  voortgang:{title:'Voortgang',sub:'Volg je groei en motivatie',items:[
    {v:'leaderboard',icon:'🏆',label:'Ranglijst'},
    {v:'badges',icon:'🎖️',label:'Badges'}
  ]},
  ontdek:{title:'Ontdek',sub:'Verken talen, bronnen en draag bij',items:[
    {v:'talen',icon:'🌍',label:'Alle talen'},
    {v:'bronnen',icon:'📖',label:'Bronnen'},
    {v:'feedback',icon:'🤝',label:'Community',badge:'more-feedback-badge'},
    {v:'help',icon:'❓',label:'Help'},
    {v:'admin',icon:'🛡️',label:'Admin',adminOnly:true}
  ]}
};
// map each view to its parent category (for active-state highlighting)
const VIEW_TO_CAT={home:'home'};
Object.keys(NAV_GROUPS).forEach(cat=>NAV_GROUPS[cat].items.forEach(it=>VIEW_TO_CAT[it.v]=cat));

let currentGroup=null; // nav group whose bottom sheet is currently open
// Open the bottom-sheet menu for a nav group and fill it with its items.
function openGroup(cat){
  currentGroup=cat;const g=NAV_GROUPS[cat];if(!g)return;
  document.getElementById('more-sheet-title').textContent=g.title;
  document.getElementById('more-sheet-sub').textContent=g.sub;
  const grid=document.getElementById('more-grid');
  grid.innerHTML=g.items.filter(it=>!it.adminOnly||window.IS_ADMIN).map(it=>`<button class="more-item" onclick="showViewFromMore('${it.v}')"><div class="more-item-icon">${it.icon}</div><div class="more-item-label">${it.label}</div>${it.badge?`<span class="more-item-badge" id="${it.badge}" style="display:none;">0</span>`:''}</button>`).join('');
  document.getElementById('more-overlay').classList.add('open');
  updateMistakesBadge();updateFeedbackBadge();
}
// Close the bottom-sheet menu when its backdrop is clicked.
function closeMoreMenu(e){if(!e||e.target===document.getElementById('more-overlay'))document.getElementById('more-overlay').classList.remove('open');}
// Close the menu, then switch to the chosen view.
function showViewFromMore(v){document.getElementById('more-overlay').classList.remove('open');showView(v);}

// Switch the active view, highlight its nav tab, and lazy-render that view.
function showView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
  const view=document.getElementById('view-'+v);if(view)view.classList.add('active');
  // highlight the parent category in the bottom nav
  const cat=VIEW_TO_CAT[v]||null;
  if(cat){const btn=document.querySelector('.tab[data-cat="'+cat+'"]');if(btn)btn.classList.add('active');}
  if(v==='feedback'){renderFeedbackList();populateContactLangs();if(typeof renderVoteDeck==='function')renderVoteDeck();}
  if(v==='leaderboard')renderLeaderboard();
  if(v==='badges')renderBadgesGrid();
  if(v==='curriculum')renderCurriculum();
  if(v==='grammatica')renderGrammar();
  if(v==='crash')renderCrash();
  if(v==='mistakes')renderMistakes();
  if(v==='profile'&&typeof renderProfile==='function')renderProfile();
  if(v==='admin'&&typeof renderAdmin==='function')renderAdmin();
  if(v==='lens'){setLensPhase('start');}else if(typeof lensStream!=='undefined'&&lensStream){lensStream.getTracks().forEach(t=>t.stop());lensStream=null;}
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══ LESSON / EXAM ENGINE ═══
// Start a lesson: build its questions and open the exercise modal.
function startLesson(idx){
  if(idx>=S.lang.lessons.length)return;
  const les=S.lang.lessons[idx];
  S.ex={type:'lesson',idx,title:les.title,emoji:les.emoji,xp:les.xp,q:genLessonQuestions(S.lang.words,6),cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}
// Start a 10-question exam across all themes and open the modal.
function startExam(){
  S.ex={type:'exam',title:'Examen '+S.lang.name,emoji:'🎓',xp:50,q:genLessonQuestions(S.lang.words,10),cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}
// Close the exercise modal and stop any speech.
function closeModal(){document.getElementById('modal').classList.remove('open');window.speechSynthesis&&window.speechSynthesis.cancel();}

// Render the current question (or the completion screen) inside the modal.
function renderExercise(){
  const ex=S.ex;
  if(ex.cur>=ex.q.length){renderComplete();return;}
  const q=ex.q[ex.cur];const pct=Math.round((ex.cur/ex.q.length)*100);
  let body=`<div class="q-counter">${ex.emoji} ${ex.title} · Vraag ${ex.cur+1} van ${ex.q.length}</div><div class="q-progress"><div class="q-progress-fill" style="width:${pct}%"></div></div><div class="q-q">${q.q}</div>`;
  // Audio helper for listen-type and others
  if(q.kind==='listen'){
    body+=`<div class="q-speak-row"><button class="speak-btn" onclick="speak('${q.listenWord.replace(/'/g,"\\'")}','${S.lang.speechLang}')"><span class="emo">🔊</span> 🔊 Speel woord af</button></div>`;
  }else if(q.speak){
    body+=`<div class="q-speak-row"><button class="speak-btn" onclick="speak('${q.speak.replace(/'/g,"\\'")}','${S.lang.speechLang}')"><span class="emo">🔊</span> Hoor uitspraak</button></div>`;
  }
  if(q.kind==='mc'||q.kind==='listen'){
    body+=`<div class="q-opts" id="q-opts"></div>`;
  }else if(q.kind==='type'){
    body+=`<input class="q-input" id="q-input" placeholder="Typ hier..." autocomplete="off"><div class="q-hint-row" style="margin:-8px 0 14px;"><button type="button" class="q-hint-btn" id="q-hint-btn" onclick="showHint()">💡 Hint tonen</button><span class="q-hint" id="q-hint" style="display:none;font-size:11px;color:var(--muted);">💡 ${q.hint}</span></div><button class="q-check" id="q-check" onclick="checkType()">Controleer</button>`;
  }
  body+=`<div class="q-fb" id="q-fb"></div><div class="q-flag-row" id="q-flag-row"><button class="q-flag-btn" onclick="document.getElementById('q-flag-form').classList.toggle('open')"><span class="emo">🚩</span> Vraag flaggen</button></div><div class="q-flag-form" id="q-flag-form"><div style="font-size:11px;color:var(--red);font-weight:500;margin-bottom:5px;">🚩 Wat klopt er niet?</div><textarea placeholder="Toelichting..."></textarea><div class="flag-form-actions"><button class="flag-submit" onclick="submitQFlag()">Indienen</button><button class="flag-cancel" onclick="document.getElementById('q-flag-form').classList.remove('open')">Annuleren</button></div></div><button class="q-next" id="q-next" onclick="nextEx()">Volgende <span class="emo">→</span></button><button class="q-skip" id="q-skip" onclick="skipQ()">Overslaan <span class="emo">⏭️</span></button>`;
  document.getElementById('modal-body').innerHTML=body;
  if(q.kind==='mc'||q.kind==='listen'){
    const opts=document.getElementById('q-opts');
    q.o.forEach(opt=>{const b=document.createElement('button');b.className='q-opt';b.textContent=opt;b.onclick=()=>answerMC(opt,q.c,b);opts.appendChild(b);});
  }
  if(q.kind==='type'){const inp=document.getElementById('q-input');inp.addEventListener('keydown',e=>{if(e.key==='Enter')checkType();});setTimeout(()=>inp.focus(),100);}
  ex.answered=false;
}
// Reveal the type-in hint only when the learner asks for it (hidden by default).
function showHint(){
  const h=document.getElementById('q-hint');if(h)h.style.display='inline';
  const b=document.getElementById('q-hint-btn');if(b)b.style.display='none';
}
// Handle scoring/feedback after an answer; records wrong words as mistakes.
function afterAnswer(correct){
  S.ex.answered=true;
  const fb=document.getElementById('q-fb');
  if(correct){fb.className='q-fb good';fb.textContent='Uitstekend! Dat klopt.';S.ex.score++;}
  else{fb.className='q-fb bad';fb.textContent='Helaas, fout.';
    // record mistake — find the target word for this question
    const q=S.ex.q[S.ex.cur];
    const tw=q.speak||q.listenWord;
    if(tw){const wobj=S.lang.words.find(w=>w.w===tw);if(wobj)addMistake(wobj.w,wobj.nl);}
  }
  fb.style.display='block';
  document.getElementById('q-flag-row').style.display='block';
  document.getElementById('q-next').style.display='block';
  const sk=document.getElementById('q-skip');if(sk)sk.style.display='none';
}
// Handle a multiple-choice/listen answer: mark correct/wrong and give feedback.
function answerMC(chosen,correct,btn){
  if(S.ex.answered)return;
  document.querySelectorAll('.q-opt').forEach(b=>{if(b.textContent===correct)b.classList.add('correct');});
  if(chosen!==correct)btn.classList.add('wrong');
  const fb=document.getElementById('q-fb');afterAnswer(chosen===correct);
  if(chosen!==correct)fb.textContent='Helaas. Juist is: '+correct;
}
// Check a type-in answer (lenient on punctuation) and give feedback.
function checkType(){
  if(S.ex.answered)return;
  const inp=document.getElementById('q-input');const q=S.ex.q[S.ex.cur];
  const val=inp.value.trim().toLowerCase();const correct=q.c.toLowerCase();
  const ok=val===correct||val.replace(/[^a-z]/g,'')===correct.replace(/[^a-z]/g,'');
  inp.classList.add(ok?'correct':'wrong');inp.disabled=true;
  document.getElementById('q-check').style.display='none';
  const fb=document.getElementById('q-fb');afterAnswer(ok);
  if(!ok)fb.textContent='Helaas. Juist is: '+q.c;
}
// Flag the current exercise question as incorrect.
function submitQFlag(){
  const text=document.getElementById('q-flag-form').querySelector('textarea').value.trim();
  saveFlag({word:'Lesvraag',nl:S.ex.q[S.ex.cur].q.substring(0,50)+'...',lang:S.lang.name,text});
  document.getElementById('q-flag-form').classList.remove('open');
  document.getElementById('q-flag-row').innerHTML='<span style="font-size:12px;color:var(--green);">✓ Ingediend, dank je!</span>';
}
// Advance to the next exercise question.
function nextEx(){S.ex.cur++;renderExercise();}
// Skip the current question (stopping speech) and advance.
function skipQ(){window.speechSynthesis&&window.speechSynthesis.cancel();S.ex.cur++;renderExercise();}
// Render the end screen: score, XP, level-up/certificate and a culture fact.
function renderComplete(){
  const ex=S.ex;const pct=Math.round((ex.score/ex.q.length)*100);
  let leveledUp=false;let passedExam=false;
  if(ex.type==='lesson'){
    const key=S.lang.id+'-'+ex.idx;S.themeProgress[key]=Math.max(S.themeProgress[key]||0,pct);
    leveledUp=addXP(ex.xp);
    if(pct>=60){S.streak=Math.min(7,S.streak+1);renderStats();}
    unlockBadge('first_lesson');
    if(pct===100)unlockBadge('perfect');
  }else{ // exam
    leveledUp=addXP(Math.round(ex.xp*pct/100));
    if(pct>=80){passedExam=true;unlockBadge('exam_pass');}
  }
  checkBadges();renderProgress();renderHomeLessons();renderAllLessons();saveState();
  const newBadges=BADGES.filter(b=>S.badges.includes(b.id));
  let badgeHtml='';
  // detect freshly relevant badge (simple: show first lesson / exam badge)
  const rewardEmoji=pct>=80?'🏆':pct>=60?'🌟':'💪';
  const title=ex.type==='exam'?(passedExam?'Geslaagd! 🎓':'Examen voltooid'):(pct>=80?'Schitterend!':pct>=60?'Goed gedaan!':'Blijf oefenen!');
  let body=`<div class="complete"><div class="complete-emoji">${rewardEmoji}</div><div class="complete-title">${title}</div><div class="complete-sub">${ex.score} van ${ex.q.length} goed — ${pct}%</div><div class="complete-rewards"><div class="complete-reward"><span class="emo">⚡</span> +${ex.type==='exam'?Math.round(ex.xp*pct/100):ex.xp} XP</div>`;
  if(leveledUp)body+=`<div class="complete-reward" style="background:var(--blue-l);color:var(--blue);"><span class="emo">⬆️</span> Level ${getLevel(S.xp)}!</div>`;
  if(passedExam)body+=`<div class="complete-reward" style="background:var(--green-l);color:var(--green);"><span class="emo">📜</span> Certificaat 🏅</div>`;
  body+=`</div>`;
  if(passedExam)body+=`<div class="complete-badge-unlock show"><div style="font-size:13px;font-weight:500;color:var(--green);margin-bottom:3px;">🏅 Certificaat behaald!</div><div style="font-size:12px;color:var(--muted);">Je beheerst de basis van ${S.lang.name}. Geweldig werk!</div></div>`;
  body+=`<div class="complete-culture"><strong>Cultuurweetje — ${S.lang.name}</strong>${S.lang.culture}</div><button class="complete-btn" onclick="closeModal()">Terug naar overzicht</button></div>`;
  document.getElementById('modal-body').innerHTML=body;
}
// Close the exercise modal when its backdrop (not its content) is clicked.
document.getElementById('modal').addEventListener('click',e=>{if(e.target===document.getElementById('modal'))closeModal();});

// ═══ ONBOARDING ═══
let onboardStep=0;
// Onboarding: pick a learning goal and enable the Next button.
function selectGoal(el,goal){document.querySelectorAll('#goal-opts .onboard-opt').forEach(o=>o.classList.remove('selected'));el.classList.add('selected');S.goal=goal;document.getElementById('goal-next').disabled=false;}
// Onboarding: move to the given step and update the progress dots.
function onboardNext(step){
  document.getElementById('ostep'+onboardStep).classList.remove('active');
  document.getElementById('od'+onboardStep).classList.remove('active');
  onboardStep=step;
  document.getElementById('ostep'+step).classList.add('active');
  document.getElementById('od'+step).classList.add('active');
  if(step===2)renderOnboardLangs();
}
// Onboarding: render the language-picker grid.
function renderOnboardLangs(){
  const grid=document.getElementById('onboard-langs');grid.innerHTML='';
  [...LANGS].sort((a,b)=>a.name.localeCompare(b.name,'nl')).forEach(l=>{const d=document.createElement('div');d.className='onboard-lang';d.innerHTML=`<div style="font-size:24px;">${l.flag}</div><div style="font-family:'Fraunces',serif;font-weight:600;font-size:12px;margin-top:4px;">${l.name}</div>`;d.onclick=()=>{document.querySelectorAll('.onboard-lang').forEach(x=>x.classList.remove('selected'));d.classList.add('selected');S.lang=l;document.getElementById('lang-next').disabled=false;};grid.appendChild(d);});
}
// Re-show the onboarding tutorial on demand (from the Help section).
function restartTutorial(){
  onboardStep=0;
  document.querySelectorAll('.onboard-step').forEach((el,i)=>el.classList.toggle('active',i===0));
  document.querySelectorAll('.onboard-dot').forEach((el,i)=>el.classList.toggle('active',i===0));
  document.getElementById('mainApp').style.display='none';
  document.getElementById('onboard').style.display='flex';
  window.scrollTo({top:0});
}
// Finish onboarding (with optional skip defaults), save, and boot the app.
function finishOnboard(skip){
  S.onboarded=true;if(skip&&!S.goal)S.goal='plezier';
  if(skip){const sr=LANGS.find(l=>l.id==='sranan');if(sr)S.lang=sr;}
  saveState();
  document.getElementById('onboard').style.display='none';
  document.getElementById('mainApp').style.display='block';
  bootApp();
}



// ═══ GRAMMAR LESSONS (per taal, met fallback) ═══
// Grammar notes keyed by language id. Languages without an entry use GRAMMAR_GENERIC.
// Each note: {icon, title, sub, body, examples:[{t: target sentence, n: Dutch}]}.
const GRAMMAR={
sranan:[
{icon:'🔤',title:'Persoonlijke voornaamwoorden',sub:'mi, yu, a, wi, unu, den',body:'Sranan Tongo gebruikt eenvoudige voornaamwoorden zonder vervoeging. Het werkwoord verandert niet, ongeacht wie het onderwerp is.',examples:[{t:'mi e go',n:'ik ga'},{t:'yu e go',n:'jij gaat'},{t:'a e go',n:'hij/zij gaat'},{t:'wi e go',n:'wij gaan'}]},
{icon:'⏳',title:'Tijd met "e" en "ben"',sub:'tegenwoordige & verleden tijd',body:'Het woordje "e" voor het werkwoord geeft de tegenwoordige/doorlopende tijd aan. "ben" (of "be") maakt de verleden tijd.',examples:[{t:'mi e nyan',n:'ik eet / ik ben aan het eten'},{t:'mi ben nyan',n:'ik at / ik heb gegeten'},{t:'a e wroko',n:'hij werkt'}]},
{icon:'❓',title:'Vragen stellen',sub:'fa, san, pe, oten',body:'Vraagwoorden komen vooraan de zin. De woordvolgorde blijft verder hetzelfde als in een gewone zin.',examples:[{t:'fa yu de?',n:'hoe gaat het?'},{t:'san na disi?',n:'wat is dit?'},{t:'pe yu e go?',n:'waar ga je heen?'},{t:'oten?',n:'wanneer?'}]},
{icon:'🚫',title:'Ontkenning met "no"',sub:'nee zeggen in een zin',body:'Plaats "no" vóór het werkwoord (en vóór de "e") om iets te ontkennen.',examples:[{t:'mi no sabi',n:'ik weet het niet'},{t:'a no e kon',n:'hij komt niet'},{t:'mi no man',n:'ik kan niet'}]},
{icon:'👥',title:'Meervoud met "den"',sub:'enkelvoud naar meervoud',body:'Sranan Tongo heeft geen meervouds-uitgang. Je plaatst "den" voor het zelfstandig naamwoord om meervoud aan te geven.',examples:[{t:'a oso',n:'het huis'},{t:'den oso',n:'de huizen'},{t:'den pikin',n:'de kinderen'}]}
],
sarnami:[
{icon:'🔤',title:'Persoonlijke voornaamwoorden',sub:'ham, toe, oe, ham-log',body:'Sarnami onderscheidt formeel en informeel "jij". "toe" is informeel, "aap" is beleefd.',examples:[{t:'ham jaaila',n:'ik ga'},{t:'toe jaaila',n:'jij gaat'},{t:'oe jaaila',n:'hij/zij gaat'}]},
{icon:'⏳',title:'Werkwoordstijden',sub:'tegenwoordig & verleden',body:'Werkwoorden eindigen vaak op -ila in de tegenwoordige tijd. De verleden tijd gebruikt andere uitgangen.',examples:[{t:'ham khaaila',n:'ik eet'},{t:'ham khail',n:'ik at'},{t:'ham jaaila',n:'ik ga'}]},
{icon:'❓',title:'Vragen stellen',sub:'ka, kaun, kahã, kab',body:'Vraagwoorden: "ka" (wat), "kaun" (wie), "kahã" (waar), "kab" (wanneer).',examples:[{t:'tor ka naam hai?',n:'hoe heet je?'},{t:'kahã jaais?',n:'waar ga je heen?'},{t:'ie ka hai?',n:'wat is dit?'}]},
{icon:'🚫',title:'Ontkenning met "na"',sub:'nee zeggen',body:'Gebruik "na" of "nahi" voor het werkwoord om te ontkennen.',examples:[{t:'ham na jaaila',n:'ik ga niet'},{t:'ham na jaanila',n:'ik weet het niet'}]}
],
javaans:[
{icon:'🔤',title:'Voornaamwoorden & beleefdheid',sub:'aku, kowe, ngoko & krama',body:'Javaans kent taalniveaus: "ngoko" (informeel) en "krama" (beleefd). De keuze hangt af van met wie je praat.',examples:[{t:'aku',n:'ik (informeel)'},{t:'kula',n:'ik (beleefd)'},{t:'kowe',n:'jij (informeel)'}]},
{icon:'❓',title:'Vragen stellen',sub:'apa, sapa, ngendi',body:'Vraagwoorden: "apa" (wat), "sapa" (wie), "ngendi" (waar), "kapan" (wanneer).',examples:[{t:'sapa jenengmu?',n:'wat is je naam?'},{t:'ngendi?',n:'waar?'},{t:'apa iki?',n:'wat is dit?'}]},
{icon:'🚫',title:'Ontkenning',sub:'ora & dudu',body:'"ora" ontkent werkwoorden en bijvoeglijke naamwoorden, "dudu" ontkent zelfstandige naamwoorden.',examples:[{t:'aku ora ngerti',n:'ik begrijp het niet'},{t:'dudu iki',n:'niet dit'}]}
]
};
// Generic fallback grammar for languages without specific lessons
const GRAMMAR_GENERIC=[
{icon:'🔤',title:'Basis voornaamwoorden',sub:'ik, jij, hij/zij',body:'Elke taal begint met de persoonlijke voornaamwoorden. Bekijk de woordenlijst voor "ik", "jij" en gebruik ze om eenvoudige zinnen te bouwen.',examples:[]},
{icon:'❓',title:'Vragen stellen',sub:'wie, wat, waar',body:'Leer de vraagwoorden van deze taal. In de meeste Surinaamse talen komen vraagwoorden vooraan de zin.',examples:[]},
{icon:'🚫',title:'Ontkenning',sub:'nee zeggen',body:'Bekijk hoe deze taal "niet" uitdrukt — meestal met een kort woordje voor het werkwoord.',examples:[]}
];
// Return grammar lessons for the active language, or a generic fallback.
function getGrammar(){return GRAMMAR[S.lang.id]||GRAMMAR_GENERIC;}
// Render the grammar cards (with examples + TTS) for the active language.
function renderGrammar(){
  const el=document.getElementById('grammar-content');if(!el)return;
  document.getElementById('grammar-lang-sub').textContent='Grammatica van '+S.lang.full+' — de bouwstenen om zelf zinnen te maken.';
  const g=getGrammar();
  el.innerHTML=g.map(les=>`<div class="grammar-card"><div class="grammar-card-head"><div class="grammar-icon">${les.icon}</div><div><div class="grammar-title">${les.title}</div><div class="grammar-sub">${les.sub}</div></div></div><div class="grammar-body">${les.body}</div>${les.examples.map(ex=>`<div class="grammar-example"><span class="ge-target">${ex.t}</span> <span class="ge-nl">— ${ex.n}</span> <button class="dict-btn" onclick="speak('${ex.t.replace(/'/g,"")}','${S.lang.speechLang}')" style="opacity:.6;"><span class="emo">🔊</span></button></div>`).join('')}</div>`).join('');
}

// ═══ SURINAME CULTURE CONTENT ═══
// Slides for the auto-rotating "Discover Suriname" banner on the home screen.
// Each: {emoji, title, desc, src (citation label), url (source link)}.
const CULTURE_FACTS=[
{emoji:'🎭',title:'Een smeltkroes van culturen',desc:'Suriname is een van de meest diverse landen ter wereld: Hindoestanen, Creolen, Javanen, Marrons, Inheemsen, Chinezen en meer leven samen — elk met eigen taal, keuken en tradities.',src:'Wikipedia — Suriname',url:'https://nl.wikipedia.org/wiki/Suriname'},
{emoji:'🎶',title:'Kaseko & Kawina',desc:'Kaseko is dé Surinaamse muziekstijl, ontstaan uit Afrikaanse ritmes en Europese instrumenten. Kawina-muziek met trommels begeleidt feesten en winti-rituelen.',src:'Wikipedia — Kaseko',url:'https://nl.wikipedia.org/wiki/Kaseko'},
{emoji:'🍛',title:'De Surinaamse keuken',desc:'Van roti en pom tot moksi-alesi en bami: de keuken weerspiegelt alle bevolkingsgroepen. Eten verbindt de gemeenschappen aan tafel.',src:'Wikipedia — Surinaamse keuken',url:'https://nl.wikipedia.org/wiki/Surinaamse_keuken'},
{emoji:'🎉',title:'Feesten het hele jaar door',desc:'Holi Phagwa (kleurenfeest), Keti Koti (afschaffing slavernij), Divali, Eid en Chinees Nieuwjaar — Suriname viert de feesten van al haar volken samen.',src:'Wikipedia — Keti Koti',url:'https://nl.wikipedia.org/wiki/Keti_Koti'},
{emoji:'🌳',title:'Het groenste land ter aarde',desc:'Meer dan 90% van Suriname is bedekt met ongerept regenwoud. De Marron- en Inheemse gemeenschappen leven al eeuwen in harmonie met dit bos.',src:'UNESCO — Central Suriname Nature Reserve',url:'https://whc.unesco.org/en/list/1017'},
{emoji:'🪘',title:'Winti & spiritualiteit',desc:'Winti is een Afro-Surinaanse religie waarin natuur, voorouders en geesten centraal staan. Het overleefde de slavernij en leeft voort in muziek en dans.',src:'Wikipedia — Winti',url:'https://nl.wikipedia.org/wiki/Winti'},
{emoji:'🧵',title:'Pangi & tembe-kunst',desc:'Marrons staan bekend om hun kleurrijke pangi-doeken en houtsnijwerk (tembe), met geometrische patronen die boodschappen en identiteit dragen.',src:'Wikipedia — Marrons',url:'https://nl.wikipedia.org/wiki/Marrons'},
{emoji:'🏵️',title:'Pagara & Owru Yari',desc:'Oudejaarsdag wordt gevierd met enorme pagara (vuurwerkkettingen) op straat — een Chinees-Surinaamse traditie die heel Paramaribo samenbrengt.',src:'UNESCO — Historisch Paramaribo',url:'https://whc.unesco.org/en/list/940'}
];
let cbIdx=0,cbTimer=null;
// Render the current slide of the rotating 'Discover Suriname' banner.
function renderCultureBanner(){
  const c=CULTURE_FACTS[cbIdx];
  const em=document.getElementById('cb-emoji'),ti=document.getElementById('cb-title'),de=document.getElementById('cb-desc'),nav=document.getElementById('cb-nav');
  if(!ti)return;
  em.textContent=c.emoji;ti.textContent=c.title;
  de.innerHTML=c.desc+(c.url?` <a href="${c.url}" target="_blank" rel="noopener" class="cb-src">${c.src} ↗</a>`:'');
  nav.innerHTML=CULTURE_FACTS.map((_,i)=>`<div class="cb-dot ${i===cbIdx?'active':''}" onclick="setCultureBanner(${i})"></div>`).join('');
}
// Jump the culture banner to a specific slide and reset the auto-rotate timer.
function setCultureBanner(i){cbIdx=i;renderCultureBanner();resetCbTimer();}
// (Re)start the 7-second auto-rotate timer for the culture banner.
function resetCbTimer(){if(cbTimer)clearInterval(cbTimer);cbTimer=setInterval(()=>{cbIdx=(cbIdx+1)%CULTURE_FACTS.length;renderCultureBanner();},7000);}

// Culture cards shown on the Talen view. Each: {emoji, name, desc}.
const DISCOVER=[
{emoji:'🥘',name:'Pom',desc:'Het feestgerecht bij uitstek — geraspte pomtajer met kip'},
{emoji:'🎨',name:'Tembe',desc:'Marron-houtsnijkunst vol symboliek'},
{emoji:'🌈',name:'Holi Phagwa',desc:'Hindoestaans kleurenfeest in de lente'},
{emoji:'⛓️',name:'Keti Koti',desc:'1 juli: viering van de afschaffing van slavernij'},
{emoji:'🪕',name:'Kaseko',desc:'De nationale muziekstijl van Suriname'},
{emoji:'🦋',name:'Regenwoud',desc:'90% ongerept oerwoud vol biodiversiteit'},
{emoji:'🏛️',name:'Paramaribo',desc:'Houten binnenstad op de UNESCO-werelderfgoedlijst'},
{emoji:'🥥',name:'Markt',desc:'De kleurrijke Centrale Markt — alle culturen op één plek'}
];
// Render the 'Discover Suriname' culture cards on the Talen view.
function renderDiscover(){
  const g=document.getElementById('discover-grid');if(!g)return;
  g.innerHTML=DISCOVER.map(d=>`<div class="discover-card"><div class="discover-emoji">${d.emoji}</div><div class="discover-name">${d.name}</div><div class="discover-desc">${d.desc}</div></div>`).join('');
}


// ═══ CURRICULUM (logisch leerpad) ═══
// Assemble the guided learning path (phases of lessons, grammar, crash course, exam).
function buildCurriculum(){
  // A logical sequence: phases combining vocab lessons + grammar + crash + exam
  const L=S.lang;const steps=[];
  steps.push({phase:'Fase 1 — Eerste kennismaking'});
  steps.push({type:'lesson',idx:0,title:L.lessons[0]?.title||'Begroetingen',desc:'Begin met de basiswoorden',emoji:L.lessons[0]?.emoji||'👋'});
  steps.push({type:'grammar',title:'Voornaamwoorden & basiszinnen',desc:'Leer ik/jij/hij en bouw je eerste zin',emoji:'🔤'});
  if(L.lessons[1])steps.push({type:'lesson',idx:1,title:L.lessons[1].title,desc:'Breid je woordenschat uit',emoji:L.lessons[1].emoji});
  steps.push({phase:'Fase 2 — Verdieping'});
  steps.push({type:'crash',title:'Spoedcursus: kernwoorden',desc:'De meest gebruikte woorden (80/20-principe)',emoji:'⚡'});
  steps.push({type:'grammar',title:'Vragen & ontkenning',desc:'Stel vragen en zeg "nee"',emoji:'❓'});
  for(let i=2;i<Math.min(L.lessons.length,5);i++)steps.push({type:'lesson',idx:i,title:L.lessons[i].title,desc:'Themawoorden oefenen',emoji:L.lessons[i].emoji});
  steps.push({phase:'Fase 3 — Vloeiend worden'});
  for(let i=5;i<L.lessons.length;i++)steps.push({type:'lesson',idx:i,title:L.lessons[i].title,desc:'Gevorderde thema\'s',emoji:L.lessons[i].emoji});
  steps.push({type:'grammar',title:'Tijden & meervoud',desc:'Verleden tijd en meervoudsvormen',emoji:'⏳'});
  steps.push({type:'exam',title:'Eindexamen',desc:'Test alles — haal 80% voor je certificaat',emoji:'🎓'});
  return steps;
}
// Render the curriculum path with done/active states.
function renderCurriculum(){
  const el=document.getElementById('curriculum-content');if(!el)return;
  document.getElementById('curr-lang-sub').textContent='Een logisch curriculum voor '+S.lang.full+' — van eerste woorden tot vloeiende zinnen.';
  const steps=buildCurriculum();let html='<div class="curriculum-path">';let stepNum=0;
  steps.forEach(s=>{
    if(s.phase){html+=`<div class="curr-phase">${s.phase}</div>`;return;}
    stepNum++;
    let done=false;
    if(s.type==='lesson')done=(S.themeProgress[S.lang.id+'-'+s.idx]||0)>=100;
    const cls=done?'done':(stepNum===1?'active':'');
    let action='';
    if(s.type==='lesson')action=`onclick="startLesson(${s.idx})"`;
    else if(s.type==='grammar')action=`onclick="showView('grammatica')"`;
    else if(s.type==='crash')action=`onclick="showView('crash')"`;
    else if(s.type==='exam')action=`onclick="startExam()"`;
    html+=`<div class="curr-step ${cls}" ${action}><div class="curr-step-num">Stap ${stepNum} · ${s.type==='lesson'?'Woordenschat':s.type==='grammar'?'Grammatica':s.type==='crash'?'Spoedcursus':'Examen'}</div><div class="curr-step-title">${s.emoji} ${s.title} ${done?'<span class="emo">✅</span>':''}</div><div class="curr-step-desc">${s.desc}</div></div>`;
  });
  html+='</div>';el.innerHTML=html;
}

// ═══ CRASH COURSE (Pareto frequency model) ═══
// Render the spoedcursus: frequency bands over the FREQ spine (see words.js / freq.js),
// showing how many words are available (translated) per band, most-frequent first.
function renderCrash(){
  const track=document.getElementById('crash-track');if(!track)return;
  const coverage=(typeof langCoverage==='function')?langCoverage(S.lang.id):S.lang.words.length;
  const practiced=(S.crashProgress&&S.crashProgress[S.lang.id])||0;
  document.getElementById('crash-known').textContent=practiced;
  const cov=document.getElementById('crash-coverage');
  if(cov)cov.textContent=coverage;
  const bands=(typeof crashBandStats==='function')?crashBandStats(S.lang.id):[];
  track.innerHTML=`<div class="crash-track-head"><div class="crash-track-title">⚡ ${S.lang.name} — kernwoorden op frequentie</div></div>`+
  `<div class="crash-cov-lbl">${coverage} kernwoorden beschikbaar, gerangschikt op hoe vaak ze voorkomen</div>`+
  bands.map(t=>{
    const ready=t.have>0;
    const btn=ready
      ?`<button class="crash-tier-btn" onclick="startCrashTier(${t.range[0]},${t.range[1]})">Start</button>`
      :`<button class="crash-tier-btn" disabled style="opacity:.4;cursor:default;">Binnenkort</button>`;
    return `<div class="crash-tier"><div class="crash-tier-icon">${t.icon}</div><div class="crash-tier-info"><div class="crash-tier-name">${t.name}</div><div class="crash-tier-meta">${t.have} woorden · ${t.desc}</div></div>${btn}</div>`;
  }).join('');
}
// Start a crash-course tier as an exercise. Picks the available (translated) words whose
// frequency rank falls in [fromRank, toRank), then records how many were practiced.
function startCrashTier(fromRank,toRank){
  const words=(typeof crashTierWords==='function')
    ?crashTierWords(S.lang.id,fromRank,toRank)
    :S.lang.words.slice(fromRank,toRank);
  if(!words.length)return;
  S.ex={type:'crash',title:'Spoedcursus '+S.lang.name,emoji:'⚡',xp:Math.max(10,words.length),q:genLessonQuestions(words,Math.min(words.length,8)),cur:0,score:0,answered:false};
  S.crashProgress=S.crashProgress||{};S.crashProgress[S.lang.id]=(S.crashProgress[S.lang.id]||0)+words.length;
  renderExercise();document.getElementById('modal').classList.add('open');
}

// ═══ MY MISTAKES ═══
// Read the saved mistakes list from localStorage.
function getMistakes(){try{return JSON.parse(localStorage.getItem('talusuri_mistakes')||'[]');}catch(e){return[];}}
// Record (or increment) a wrongly-answered word in the mistakes list.
function addMistake(word,nl){
  let m=getMistakes();const ex=m.find(x=>x.w===word&&x.lang===S.lang.id);
  if(ex){ex.count++;}else{m.push({w:word,nl,lang:S.lang.id,langName:S.lang.name,count:1});}
  localStorage.setItem('talusuri_mistakes',JSON.stringify(m.slice(0,200)));updateMistakesBadge();
}
// Remove a word from the mistakes list (marked as learned).
function removeMistake(word,lang){let m=getMistakes().filter(x=>!(x.w===word&&x.lang===lang));localStorage.setItem('talusuri_mistakes',JSON.stringify(m));updateMistakesBadge();renderMistakes();}
// Clear all saved mistakes (with confirmation).
function clearMistakes(){if(confirm('Alle fouten wissen?')){localStorage.removeItem('talusuri_mistakes');updateMistakesBadge();renderMistakes();}}
// Refresh the mistakes count badge and the Oefenen nav dot.
function updateMistakesBadge(){const n=getMistakes().length;const b=document.getElementById('more-mistakes-badge');if(b){b.textContent=n;b.style.display=n>0?'inline':'none';}const c=document.getElementById('mistakes-count');if(c)c.textContent='('+n+')';const dot=document.getElementById('dot-oefenen');if(dot)dot.style.display=n>0?'block':'none';}
// Render the 'My mistakes' list with speak/remove actions.
function renderMistakes(){
  const list=document.getElementById('mistakes-list');if(!list)return;
  const m=getMistakes();
  if(!m.length){list.innerHTML='<div class="mistakes-empty"><span class="emo">🎉</span>Nog geen fouten — goed bezig! 🎉<br><span style="font-size:12px;">Fout beantwoorde woorden verschijnen hier om te herhalen.</span></div>';return;}
  list.innerHTML=m.map(x=>`<div class="mistake-item"><div style="flex:1;"><div class="mistake-word">${x.w}</div><div class="mistake-nl">${x.nl} · ${x.langName}</div></div><span class="mistake-count">${x.count}× fout</span><button class="dict-btn" onclick="speak('${x.w.replace(/'/g,"")}','${(LANGS.find(l=>l.id===x.lang)||{}).speechLang||"nl-NL"}')"><span class="emo">🔊</span></button><button class="dict-btn" onclick="removeMistake('${x.w.replace(/'/g,"")}','${x.lang}')" title="Verwijderen"><span class="emo">✓</span></button></div>`).join('');
}
// Start an exercise built from the active language's mistakes.
function practiceMistakes(){
  const m=getMistakes().filter(x=>x.lang===S.lang.id);
  if(!m.length){alert('Geen fouten in '+S.lang.name+' om te oefenen. Wissel van taal of maak eerst een les!');return;}
  // build questions from mistakes using full word objects
  const words=m.map(x=>S.lang.words.find(w=>w.w===x.w)).filter(Boolean);
  if(!words.length){alert('Kon de woorden niet vinden.');return;}
  S.ex={type:'mistakes',title:'Foutenherhaling '+S.lang.name,emoji:'🔁',xp:words.length*3,q:genLessonQuestions(words,Math.min(words.length,10)),cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}


// ═══ LANGUAGE SWITCHER ═══
// Render the header language-switcher dropdown.
function renderLangSwitchMenu(){
  const menu=document.getElementById('lang-switch-menu');if(!menu)return;
  menu.innerHTML=[...LANGS].sort((a,b)=>a.name.localeCompare(b.name,'nl')).map(l=>`<div class="ls-item ${l.id===S.lang.id?'active':''}" onclick="switchLang('${l.id}')"><span class="ls-item-flag">${l.flag}</span><div style="flex:1;"><div class="ls-item-name">${l.name}</div><div class="ls-item-meta">${l.speakers} sprekers</div></div>${l.id===S.lang.id?'<span class="emo">✓</span>':''}</div>`).join('');
}
// Toggle the header language-switcher dropdown.
function toggleLangMenu(e){if(e)e.stopPropagation();const m=document.getElementById('lang-switch-menu');renderLangSwitchMenu();m.classList.toggle('open');}
// Switch language from the header dropdown and return to home.
function switchLang(id){const l=LANGS.find(x=>x.id===id);if(l){setLang(l);showView('home');}document.getElementById('lang-switch-menu').classList.remove('open');}
// Update the language-switcher button's flag + name.
function updateSwitcherLabel(){const f=document.getElementById('ls-flag'),n=document.getElementById('ls-name');if(f)f.textContent=S.lang.flag;if(n)n.textContent=S.lang.name;}
// Close the language-switcher dropdown when clicking anywhere outside it.
document.addEventListener('click',e=>{const sw=document.getElementById('lang-switch');if(sw&&!sw.contains(e.target)){document.getElementById('lang-switch-menu')?.classList.remove('open');}});

// ═══ INIT ═══
// Render everything and initialise the app after onboarding.
function bootApp(){
  applyTheme();renderStats();renderLangGrid();renderSourcesGrid();renderHomeBadges();renderBadgesGrid();setLang(S.lang);renderProgress();updateFeedbackBadge();renderCultureBanner();resetCbTimer();renderDiscover();updateSwitcherLabel();updateMistakesBadge();initBeta();
}
// Entry point: show onboarding, or boot straight into the app if already onboarded.
function init(){
  applyTheme();
  if(S.onboarded){
    document.getElementById('onboard').style.display='none';
    document.getElementById('mainApp').style.display='block';
    bootApp();
  }else{
    document.getElementById('onboard').style.display='flex';
    document.getElementById('mainApp').style.display='none';
  }
}
init();
