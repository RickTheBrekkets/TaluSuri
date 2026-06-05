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
function speak(text,langCode,langId){
  const lid=langId||S.lang.id;   // explicit langId so e.g. Sranan odo recordings play in any language
  const key=(typeof wordKey==='function')?wordKey(lid,text):null;
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
// True when a community/official recording exists for this word — speak() plays it
// instead of the computer voice, and the speaker icon is shown in gold.
function hasOfficialAudio(text){
  const k=(typeof wordKey==='function')?wordKey(S.lang.id,text):null;
  return !!(k&&window.OFFICIAL_AUDIO&&window.OFFICIAL_AUDIO[k]);
}
// Re-render the word UIs so gold speakers appear once official audio has loaded (called from community.js).
function refreshAudioUI(){try{if(typeof filterDict==='function')filterDict();if(typeof renderFlash==='function')renderFlash();if(typeof filterWB==='function')filterWB();}catch(e){}}

// ═══ SOUND EFFECTS ═══
let _sfxCtx=null;
function sfxCtx(){
  if(!_sfxCtx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{_sfxCtx=new AC();}catch(e){return null;}}
  if(_sfxCtx.state==='suspended'){try{_sfxCtx.resume();}catch(e){}}
  return _sfxCtx;
}
// Android/iOS Chrome keep a fresh AudioContext "suspended" until a user gesture unlocks it.
// Create + resume it on the first interaction so the correct-answer cue is audible right away.
function unlockSfx(){const c=sfxCtx();if(c&&c.state==='running'){['pointerdown','touchend','keydown','click'].forEach(ev=>document.removeEventListener(ev,unlockSfx));}}
['pointerdown','touchend','keydown','click'].forEach(ev=>document.addEventListener(ev,unlockSfx,{passive:true}));
// Short, upbeat "correct" cue with a Surinamese feel: two apinti-style drum taps (kawina
// groove) resolving into a bright marimba two-note rise. Synthesized — no audio file needed.
function playCorrect(){
  const ctx=sfxCtx();if(!ctx)return;
  const t0=ctx.currentTime;
  const drum=(t,freq,gain)=>{ // membrane drum: pitched sine dropping fast
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*0.5,t+0.12);
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
    o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+0.14);
  };
  const note=(t,freq,gain)=>{ // bright marimba-ish pluck
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='triangle';o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+0.24);
  };
  drum(t0,180,0.6); drum(t0+0.10,150,0.5);
  note(t0+0.16,1046.5,0.45); // C6
  note(t0+0.30,1318.5,0.45); // E6
}
// A language is "low-resource" (under construction) when it has fewer than 100 words; the
// spoedcursus is hidden for these and a call for native speakers/sources is shown.
function isLowResource(l){l=l||S.lang;return ((l.words&&l.words.length)||0)<100;}

// ═══ FLAGS / FEEDBACK ═══
// Read the saved word-flag/feedback list from localStorage.
function getFlags(){try{return JSON.parse(localStorage.getItem('talusuri_flags')||'[]');}catch(e){return[];}}
// Save a new word flag (newest first, capped at 100) and unlock the contributor badge.
function saveFlag(obj){const f=getFlags();f.unshift({...obj,id:Date.now(),ts:new Date().toLocaleDateString('nl-NL')});localStorage.setItem('talusuri_flags',JSON.stringify(f.slice(0,100)));updateFeedbackBadge();unlockBadge('contributor');}
// Clear all saved feedback (with confirmation).
function clearFeedback(){if(confirm('Alle feedback wissen?')){localStorage.removeItem('talusuri_flags');updateFeedbackBadge();renderFeedbackList();}}
// Refresh the feedback count badge and the Ontdek nav dot.
function updateFeedbackBadge(){const n=getFlags().length;const b=document.getElementById('more-feedback-badge');if(b){b.textContent=n;b.style.display=n>0?'inline':'none';}const c=document.getElementById('feedback-count');if(c)c.textContent='('+n+')';const dot=document.getElementById('dot-ontdek');if(dot)dot.style.display=n>0?'block':'none';}


// ═══ BETA BAR ═══
// Open the Community view and scroll to the contact form.
function goToContact(){showView('feedback');setTimeout(()=>{const el=document.getElementById('contact-form');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});},100);}
// ═══ SHARE THE APP ═══
const SHARE_URL='https://talusuri.netlify.app';
const SHARE_TEXT='Leer de talen van Suriname met TaluSuri! 🇸🇷';
function shareNative(){ if(navigator.share){ navigator.share({title:'TaluSuri',text:SHARE_TEXT,url:SHARE_URL}).catch(()=>{}); } else shareCopyLink(); }
function shareWhatsApp(){ window.open('https://wa.me/?text='+encodeURIComponent(SHARE_TEXT+' '+SHARE_URL),'_blank','noopener'); }
function shareFacebook(){ window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(SHARE_URL),'_blank','noopener'); }
function shareX(){ window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(SHARE_TEXT)+'&url='+encodeURIComponent(SHARE_URL),'_blank','noopener'); }
function shareTelegram(){ window.open('https://t.me/share/url?url='+encodeURIComponent(SHARE_URL)+'&text='+encodeURIComponent(SHARE_TEXT),'_blank','noopener'); }
function shareEmail(){ window.location.href='mailto:?subject='+encodeURIComponent('TaluSuri — leer de talen van Suriname')+'&body='+encodeURIComponent(SHARE_TEXT+'\n\n'+SHARE_URL); }
function shareCopyLink(){ if(navigator.clipboard){ navigator.clipboard.writeText(SHARE_URL).then(()=>alert('Link gekopieerd!'),()=>prompt('Kopieer de link:',SHARE_URL)); } else prompt('Kopieer de link:',SHARE_URL); }
function shareApp(){ shareWhatsApp(); }   // backwards-compatible alias
// Closed-beta bar + footer version. The bar is persistent (no dismiss) during the beta.
function initBeta(){
  const fv=document.getElementById('footer-version');
  if(fv)fv.textContent='versie '+(window.APP_VERSION||'?');
  updateBetaSeats();
}
// Show how many of the limited closed-beta seats are taken (X/MAX) in the beta bar.
async function updateBetaSeats(){
  const el=document.getElementById('beta-seats');if(!el)return;
  const max=window.betaMax?window.betaMax():(window.BETA_MAX_ACCOUNTS||0);
  const bar=document.getElementById('beta-bar');
  if(!max){ if(bar)bar.style.display='none'; el.textContent=''; return; }   // cap lifted → hide the beta bar
  if(bar)bar.style.display='';
  const count=window.fetchAccountCount?await window.fetchAccountCount():null;
  if(count===null){el.textContent='';return;}
  const free=Math.max(0,max-count);
  el.textContent=`${count}/${max} plekken bezet${free>0?` — nog ${free} vrij`:' — vol'}`;
}

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
  if(S.seenLangs.length>=LANGS.length)unlockBadge('explorer');
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
  const hh=document.getElementById('hero-help');
  if(hh){
    if(isLowResource(l)){hh.style.display='block';hh.innerHTML=`🔎 We bouwen <strong>${l.name}</strong> nog uit. We zoeken native speakers en bronnen om deze taal te verrijken — kun je helpen? <a href="javascript:void(0)" onclick="goToContact()">Neem contact op</a>.`;}
    else hh.style.display='none';
  }
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
  if(typeof refreshCultureBanner==='function')refreshCultureBanner(); // re-pick banner facts (incl. this language's migration history)
  document.querySelectorAll('.lang-card').forEach(c=>c.classList.toggle('active',c.dataset.id===l.id));
  document.getElementById('les-view-title').textContent='Lessen: '+l.full;
  renderAllLessons();renderThemes();
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
  if(typeof rollPeriods==='function')rollPeriods();   // reset week/month counters if the period rolled over
  const before=getLevel(S.xp);S.xp+=n;S.weekXP+=n;S.monthXP+=n;const after=getLevel(S.xp);
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
    row.innerHTML=`<span class="dict-nl">${w.nl}</span><div class="dict-actions"><button class="dict-btn ${hasOfficialAudio(w.w)?'speak-official':''}" onclick="speak('${w.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')" title="${hasOfficialAudio(w.w)?'Community-opname':'Uitspreken'}"><span class="emo">🔊</span></button><button class="dict-btn mic-contrib" onclick="openRecordings(S.lang.id,'${w.w.replace(/'/g,"\\'")}')" title="Uitspraken & opnemen"><span class="emo">🎙️</span></button><button class="dict-btn flag" onclick="toggleFlag('${id}')" title="Flag"><span class="emo">🚩</span></button></div><div class="dict-word-block"><span class="dict-sr">${w.w}</span><span class="dict-pron">${w.p}</span></div>`;
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
  if(audioMode==='tts')ar.innerHTML=`<button class="speak-btn ${hasOfficialAudio(fc.w)?'speak-official':''}" onclick="speak('${fc.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')">${hasOfficialAudio(fc.w)?'<span class="emo">🔊</span> Community-opname':'<span class="emo">🔊</span> Hoor uitspraak'}</button>`;
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
  const grid=document.getElementById('prog-grid');if(!grid)return;grid.innerHTML='';
  const counts={};S.lang.words.forEach(w=>{if(w.cat&&THEME_META[w.cat])counts[w.cat]=(counts[w.cat]||0)+1;});
  const cats=Object.keys(counts).filter(c=>counts[c]>=4).sort((a,b)=>counts[b]-counts[a]);
  const learned=new Set(S.learnedWords||[]);
  cats.forEach(cat=>{
    const total=counts[cat];
    const done=S.lang.words.filter(w=>w.cat===cat&&learned.has(S.lang.id+'|'+w.w)).length;
    const pct=Math.round(done/total*100),c=2*Math.PI*14,off=c*(1-pct/100),m=THEME_META[cat];
    const el=document.createElement('div');el.className='prog-item';el.style.cursor='pointer';
    el.onclick=()=>openThemeWords(cat);
    el.innerHTML=`<svg viewBox="0 0 36 36" width="44" height="44"><circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" stroke-width="3"/><circle cx="18" cy="18" r="14" fill="none" stroke="${pct>0?'var(--green)':'transparent'}" stroke-width="3" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 18 18)" stroke-linecap="round"/><text x="18" y="22" text-anchor="middle" font-size="13">${m.emoji}</text></svg><div class="prog-lbl">${m.label}</div>`;
    grid.appendChild(el);
  });
}
// Theme detail: list the theme's words with a checkmark for each one already learned.
function openThemeWords(cat){
  const m=THEME_META[cat];if(!m)return;
  const words=S.lang.words.filter(w=>w.cat===cat);
  const learned=new Set(S.learnedWords||[]);
  const done=words.filter(w=>learned.has(S.lang.id+'|'+w.w)).length;
  let body=`<div style="text-align:center;margin-bottom:14px;"><div style="font-size:28px;">${m.emoji}</div><div style="font-family:'Fraunces',serif;font-weight:600;font-size:19px;">${m.label}</div><div style="font-size:12px;color:var(--muted);">${done}/${words.length} woorden geleerd</div></div>`;
  body+='<div class="tw-list">'+words.map(w=>{const ok=learned.has(S.lang.id+'|'+w.w);return `<div class="tw-row"><span class="tw-check ${ok?'on':''}">${ok?'✓':''}</span><span class="tw-nl">${w.nl}</span><span class="tw-w">${w.w}</span></div>`;}).join('')+'</div>';
  body+=`<button class="complete-btn" onclick="closeModal();startTheme('${cat}')">Oefen dit thema</button>`;
  document.getElementById('modal-body').innerHTML=body;document.getElementById('modal').classList.add('open');
}
// Render the handy-phrases list for the active language.
function renderPhrases(){
  const list=document.getElementById('phrase-list');list.innerHTML='';
  S.lang.phrases.forEach(p=>{const el=document.createElement('div');el.className='phrase-item';el.innerHTML=`<div class="phrase-nl">${p.nl}</div><div style="display:flex;align-items:center;gap:6px;"><div class="phrase-sr">${p.w}</div><button class="dict-btn" onclick="speak('${p.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')" style="opacity:.6;"><span class="emo">🔊</span></button></div><div class="phrase-pron">${p.p}</div>`;list.appendChild(el);});
}
// Return the saved completion percentage for a lesson index.
function lessonProgress(i){return S.themeProgress[S.lang.id+'-'+i]||0;}
// The lesson to continue with: the first not-yet-completed lesson in the path, or the last
// one if everything is done. This is what the home hero "Les starten" button launches.
function nextLessonIdx(){
  const n=S.lang.lessons.length;
  for(let i=0;i<n;i++){if(lessonProgress(i)<100)return i;}
  return Math.max(0,n-1);
}
// Start the lesson where the user left off (home hero button).
function startNextLesson(){startLesson(nextLessonIdx());}
// Render the two lesson cards shown on the home screen — they slide along the learning path
// to start at where the user left off — and point the hero button at the next lesson.
function renderHomeLessons(){
  const n=S.lang.lessons.length;
  let start=nextLessonIdx();
  if(start>n-2)start=Math.max(0,n-2);   // keep both cards filled when near the end of the path
  for(let k=0;k<2;k++){
    const el=document.getElementById('les'+k);if(!el)continue;
    const idx=start+k, l=S.lang.lessons[idx];
    if(!l){el.style.display='none';continue;}
    el.style.display='';
    const pct=lessonProgress(idx);
    el.innerHTML=`${pct>=100?'<span class="emo lesson-done">✅</span>':''}<div class="lesson-emoji">${l.emoji}</div><div class="lesson-title">${l.title}</div><div class="lesson-meta">Les ${idx+1} · 6 vragen · ${l.xp} XP</div><div class="lesson-bar"><div class="lesson-fill" style="width:${pct}%"></div></div>`;
    el.onclick=()=>startLesson(idx);
  }
  const hb=document.getElementById('hero-lesson-btn');
  if(hb){const ni=nextLessonIdx();const les=S.lang.lessons[ni];
    hb.innerHTML=`<span class="emo">▶️</span> ${les?(lessonProgress(ni)>0?'Verder: ':'Les ')+les.title:'Les starten'}`;}
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
  exam.innerHTML=`<div style="font-size:28px;margin-bottom:8px;">🎓</div><div style="font-family:'Fraunces',serif;font-weight:600;font-size:15px;margin-bottom:4px;color:#fff;">Examen</div><div style="font-size:12px;color:rgba(255,255,255,.7);margin-bottom:12px;">10 vragen · alle thema's</div><div style="font-size:11px;color:rgba(255,255,255,.6);">Haal 80% om te slagen 🏅</div>`;
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
    card.innerHTML=`<div style="font-size:11px;color:var(--muted);margin-bottom:3px;">${w.nl}</div><div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-family:'Fraunces',serif;font-weight:600;font-size:17px;color:var(--green);">${w.w}</div><div style="display:flex;gap:3px;"><button class="dict-btn ${hasOfficialAudio(w.w)?'speak-official':''}" onclick="speak('${w.w.replace(/'/g,"\\'")}','${S.lang.speechLang}')" title="${hasOfficialAudio(w.w)?'Community-opname':'Uitspreken'}"><span class="emo">🔊</span></button><button class="dict-btn mic-contrib" onclick="openRecordings(S.lang.id,'${w.w.replace(/'/g,"\\'")}')" title="Uitspraken & opnemen"><span class="emo">🎙️</span></button><button class="dict-btn flag" onclick="toggleFlag('${id}')"><span class="emo">🚩</span></button></div></div><div style="font-size:11px;color:var(--muted);font-style:italic;margin-top:2px;">/${w.p}/</div><div class="flag-form" id="flag-form-${id}"><div style="font-size:11px;color:var(--red);font-weight:500;margin-bottom:5px;">🚩 Wat klopt er niet?</div><textarea placeholder="Toelichting..."></textarea><div class="flag-form-actions"><button class="flag-submit" onclick="submitFlag('${id}','${w.w.replace(/'/g,"\\'")}','${w.nl.replace(/'/g,"\\'")}','${S.lang.name}')">Indienen</button><button class="flag-cancel" onclick="toggleFlag('${id}')">Annuleren</button></div></div><div class="flag-thanks" id="flag-thanks-${id}">✓ Bedankt!</div>`;
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
// Switch the active leaderboard board (week / month / all) and re-render.
function setLbTab(tab){
  S.lbTab=tab;
  document.querySelectorAll('.lb-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  renderLeaderboard();
}
async function renderLeaderboard(){
  const list=document.getElementById('leaderboard-list');if(!list)return;
  const tab=S.lbTab||'week';
  if(typeof rollPeriods==='function')rollPeriods();
  const {wk,mo}=lbPeriodKeys();
  // Effective period XP ignores counters whose stored period key is stale (an old week/month).
  const localMe=()=>({name:'Jij',xp:S.xp,wxp:S.weekKey===wk?S.weekXP:0,mxp:S.monthKey===mo?S.monthXP:0,langs:LANGS.filter(l=>S.seenLangs.includes(l.id)).map(l=>l.name).join(', ')||S.lang.name,avatar:'JIJ',me:true,guest:true});
  let all;
  const rows=window.fetchLeaderboard?await window.fetchLeaderboard():null;
  if(rows){
    all=rows.map(r=>({...r,wxp:r.week_key===wk?(r.week_xp||0):0,mxp:r.month_key===mo?(r.month_xp||0):0}));
    const uid=window.AUTH&&window.AUTH.user&&window.AUTH.user.id;
    if(uid)all.forEach(r=>{if(r.id===uid)r.me=true;}); // mark my own row
    else all.push(localMe());                          // not logged in → show local progress too
  }else{
    all=[...LEADERBOARD,localMe()];                     // fallback: sample players + local "Jij"
  }
  const scoreOf=p=>tab==='week'?(p.wxp||0):tab==='month'?(p.mxp||0):(p.xp||0);
  all.sort((a,b)=>scoreOf(b)-scoreOf(a));
  list.innerHTML=all.map((p,i)=>{
    const sc=scoreOf(p);
    const rank=i<3?(i===0?'🥇':i===1?'🥈':'🥉'):'#'+(i+1);
    const detail=p.guest
      ? `<a href="javascript:void(0)" onclick="authOpenModal()" style="color:var(--green);font-weight:500;">🔒 Log in om je voortgang op te slaan</a>`
      : (p.langs||'');
    return `<div class="lb-row ${p.me?'me':''}"><div class="lb-rank ${i<3?'top':''}">${rank}</div><div class="lb-avatar">${p.avatar_url?`<img src="${p.avatar_url}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:p.avatar}</div><div class="lb-info"><div class="lb-name">${p.name}${p.me?' (jij)':''}</div><div class="lb-detail">${detail}</div></div><div class="lb-xp">${sc.toLocaleString('nl-NL')} XP</div></div>`;
  }).join('');
  // Earn a placement badge for finishing top-3 on the weekly/monthly boards.
  if(tab==='week'||tab==='month'){
    const meIdx=all.findIndex(p=>p.me);
    if(meIdx>=0&&meIdx<3&&scoreOf(all[meIdx])>0)unlockBadge((tab==='week'?'week_':'month_')+['gold','silver','bronze'][meIdx]);
  }
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
  oefenen:{title:'Oefenen',sub:'Herhaal, zoek woorden op en leer gezegdes',items:[
    {v:'mistakes',icon:'💪',label:'Blijf oefenen',badge:'more-mistakes-badge'},
    {v:'woordenboek',icon:'📕',label:'Woordenboek'},
    {v:'gezegdes',icon:'🗣️',label:'Gezegdes'}
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
  if(v==='gezegdes')renderGezegdes();
  if(v==='help')renderChangelog();
  if(v==='profile'&&typeof renderProfile==='function')renderProfile();
  if(v==='admin'&&typeof renderAdmin==='function')renderAdmin();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══ LESSON / EXAM ENGINE ═══
// The on-theme words for a lesson, looked up from the shared LESSON_CATALOG (words.js).
// Returns only words in the lesson's categories (plus courtesy words for greetings), so a
// lesson never quizzes off-theme words like "tomaat". 'Eerste woorden' (and any title not
// in the catalog) uses the full word list. Falls back to all words if a pool is too thin.
function lessonWords(title){
  const L=(typeof LESSON_CATALOG!=='undefined'?LESSON_CATALOG:[]).find(x=>x.title===title);
  if(!L)return S.lang.words;
  const pool=lessonPoolWords(S.lang.words,L);
  return pool.length>=3?pool:S.lang.words;
}
// Start a lesson: build its questions and open the exercise modal.
function startLesson(idx){
  if(idx>=S.lang.lessons.length)return;
  const les=S.lang.lessons[idx];
  S.ex={type:'lesson',idx,title:les.title,emoji:les.emoji,xp:les.xp,q:genLessonQuestions(lessonWords(les.title),6),cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}
// Start a 10-question exam across all themes and open the modal.
function startExam(){
  S.ex={type:'exam',title:'Examen '+S.lang.name,emoji:'🎓',xp:50,q:genLessonQuestions(S.lang.words,10),cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}

// ═══ THEMES (practise by topic) ═══
// Topical word categories (from the FREQ spine's `cat`), shown as selectable themes so
// learners can focus on a subject. Grammatical/abstract cats are intentionally omitted.
const THEME_META={
  food:{label:'Eten',emoji:'🍛'},drink:{label:'Drinken',emoji:'🥤'},family:{label:'Familie',emoji:'👪'},
  body:{label:'Lichaam',emoji:'🧍'},color:{label:'Kleuren',emoji:'🌈'},number:{label:'Cijfers',emoji:'🔢'},
  animal:{label:'Dieren',emoji:'🐾'},nature:{label:'Natuur',emoji:'🌿'},clothing:{label:'Kleding',emoji:'👕'},
  house:{label:'Huis',emoji:'🏠'},time:{label:'Tijd',emoji:'🕐'},travel:{label:'Reizen',emoji:'✈️'},
  weather:{label:'Weer',emoji:'🌦️'},place:{label:'Plaatsen',emoji:'📍'},work:{label:'Werk',emoji:'💼'},
  emotion:{label:'Gevoelens',emoji:'❤️'},person:{label:'Mensen',emoji:'🧑'},social:{label:'Sociaal',emoji:'🤝'},
  verb:{label:'Werkwoorden',emoji:'🏃'},adjective:{label:'Bijvoeglijk',emoji:'🏷️'},object:{label:'Voorwerpen',emoji:'📦'},
  direction:{label:'Richting',emoji:'🧭'},question:{label:'Vraagwoorden',emoji:'❓'}
};
// Render the theme chips for the active language (only themes with enough words to practise).
function renderThemes(){
  const grid=document.getElementById('theme-grid');if(!grid)return;
  const counts={};
  S.lang.words.forEach(w=>{if(w.cat&&THEME_META[w.cat])counts[w.cat]=(counts[w.cat]||0)+1;});
  const cats=Object.keys(counts).filter(c=>counts[c]>=4).sort((a,b)=>counts[b]-counts[a]);
  grid.innerHTML=cats.length
    ? cats.map(c=>{const m=THEME_META[c];return `<button class="theme-chip" onclick="startTheme('${c}')"><span class="theme-chip-emoji">${m.emoji}</span><span class="theme-chip-label">${m.label}</span><span class="theme-chip-count">${counts[c]}</span></button>`;}).join('')
    : '<div style="font-size:12px;color:var(--muted);">Nog te weinig woorden voor thema-oefeningen in deze taal.</div>';
}
// Theme-related example sentences, by language then category. Only the well-documented
// languages (Sranan Tongo, Sarnami) have curated sentences using their attested grammar;
// other languages fall back to their verified general phrases (see themeSentences).
const SENTENCES={
  sranan:{
    social:[{nl:'Hallo, hoe gaat het?',w:'Odi, fa yu de?',p:'o-di, fa yu de'}],
    family:[{nl:'Ik heb een broer.',w:'Mi abi wan brada.',p:'mi a-bi wan bra-da'},{nl:'Mijn moeder is thuis.',w:'Mi mama de na oso.',p:'mi ma-ma de na o-so'}],
    number:[{nl:'Ik heb twee kinderen.',w:'Mi abi tu pikin.',p:'mi a-bi tu pi-kin'}],
    food:[{nl:'Ik eet brood.',w:'Mi e nyan brede.',p:'mi e nyan bre-de'},{nl:'Het eten is lekker.',w:'A nyanyan switi.',p:'a nya-nyan swi-ti'}],
    drink:[{nl:'Ik drink water.',w:'Mi e dringi watra.',p:'mi e drin-gi wat-ra'}],
    body:[{nl:'Mijn hoofd doet pijn.',w:'Mi ede e hati.',p:'mi e-de e ha-ti'}],
    house:[{nl:'Ik ga naar huis.',w:'Mi e go na oso.',p:'mi e go na o-so'}],
    color:[{nl:'Het huis is rood.',w:'A oso redi.',p:'a o-so re-di'}],
    time:[{nl:'Vandaag is een mooie dag.',w:'Tide na wan moi dei.',p:'ti-de na wan moi dei'}],
    animal:[{nl:'Ik heb een hond.',w:'Mi abi wan dagu.',p:'mi a-bi wan da-gu'}],
    nature:[{nl:'De rivier is groot.',w:'A liba bigi.',p:'a li-ba bi-gi'}]
  },
  sarnami:{
    social:[{nl:'Hallo, hoe gaat het?',w:'Namaste, kaise hai?',p:'na-mas-te, kai-se hai'}],
    family:[{nl:'Mijn moeder is thuis.',w:'Hamaar maai ghar mê hai.',p:'ha-maar maai ghar me hai'}],
    food:[{nl:'Ik eet rijst.',w:'Ham bhaat khaaila.',p:'ham bhaat khaa-i-la'}],
    drink:[{nl:'Ik drink water.',w:'Ham paanie piela.',p:'ham paa-nie pie-la'}],
    number:[{nl:'Ik heb twee kinderen.',w:'Hamaar doei larka hai.',p:'ha-maar doei lar-ka hai'}]
  }
};
// Example sentences for a theme: curated ones if available, else a verified general phrase.
function themeSentences(langId,cat){
  const byLang=SENTENCES[langId];
  if(byLang&&byLang[cat])return byLang[cat];
  return (S.lang.phrases||[]).slice(0,1); // fallback: a verified handy phrase
}
// Start a practice exercise limited to one theme's words, ending with example sentence(s).
function startTheme(cat){
  const m=THEME_META[cat];if(!m)return;
  const words=S.lang.words.filter(w=>w.cat===cat);
  if(words.length<4)return;
  const n=Math.min(8,words.length);
  const sents=themeSentences(S.lang.id,cat).slice(0,2);
  const sentQ=sents.map(s=>({kind:'type',q:`Typ de vertaling van de zin: "${s.nl}"`,c:s.w,hint:s.p,speak:s.w}));
  const q=genLessonQuestions(words,n).concat(sentQ);
  S.ex={type:'theme',cat,title:'Thema: '+m.label,emoji:m.emoji,xp:Math.max(10,q.length),q,cur:0,score:0,answered:false};
  renderExercise();document.getElementById('modal').classList.add('open');
}
// Close the exercise modal and stop any speech.
function closeModal(){document.getElementById('modal').classList.remove('open');window.speechSynthesis&&window.speechSynthesis.cancel();}

// Render the current question (or the completion screen) inside the modal.
// Build an exercise audio row: the speaker (gold for a community recording) plus a mic that
// opens the recordings modal so a learner can mark this word for a better pronunciation.
// When only the computer voice exists, a 🤖 hint nudges the community to record the real one.
function exAudioRow(word,playLabel){
  const w=word.replace(/'/g,"\\'");
  const official=hasOfficialAudio(word);
  return `<div class="q-speak-row">`
    +`<button class="speak-btn ${official?'speak-official':''}" onclick="speak('${w}','${S.lang.speechLang}')"><span class="emo">🔊</span> ${playLabel||(official?'Community-opname':'Hoor uitspraak')}</button>`
    +`<button class="contrib-btn" onclick="openRecordings(S.lang.id,'${w}')" title="Markeer dit woord om de uitspraak te verbeteren"><span class="emo">🎙️</span> Verbeter uitspraak</button>`
    +(official?'':`<span style="font-size:15px;align-self:center;cursor:help;" title="Dit is nog een computerstem — help met een echte opname">🤖</span>`)
    +`</div>`;
}
function renderExercise(){
  const ex=S.ex;
  if(ex.cur>=ex.q.length){renderComplete();return;}
  const q=ex.q[ex.cur];const pct=Math.round((ex.cur/ex.q.length)*100);
  let body=`<div class="q-counter">${ex.emoji} ${ex.title} · Vraag ${ex.cur+1} van ${ex.q.length}</div><div class="q-progress"><div class="q-progress-fill" style="width:${pct}%"></div></div><div class="q-q">${q.q}</div>`;
  // Audio helper for listen-type and others — includes a "verbeter uitspraak" mic so a
  // learner can flag a word for a real recording, especially when it's still a computer voice.
  if(q.kind==='listen'){
    body+=exAudioRow(q.listenWord,'Speel woord af');
  }else if(q.speak){
    body+=exAudioRow(q.speak);
  }
  if(q.kind==='mc'||q.kind==='listen'){
    body+=`<div class="q-opts" id="q-opts"></div>`;
  }else if(q.kind==='type'){
    body+=`<input class="q-input" id="q-input" placeholder="Typ hier..." autocomplete="off"><div class="q-hint-row" style="margin:-8px 0 14px;"><button type="button" class="q-hint-btn" id="q-hint-btn" onclick="showHint()">💡 Hint tonen</button><span class="q-hint" id="q-hint" style="display:none;font-size:11px;color:var(--muted);">💡 ${q.hint}</span></div><button class="q-check" id="q-check" onclick="checkType()">Controleer</button>`;
  }
  body+=`<div class="q-fb" id="q-fb"></div><div class="q-flag-row" id="q-flag-row"><button class="q-flag-btn" onclick="document.getElementById('q-flag-form').classList.toggle('open')"><span class="emo">🚩</span> Vraag flaggen</button></div><div class="q-flag-form" id="q-flag-form"><div style="font-size:11px;color:var(--red);font-weight:500;margin-bottom:5px;">🚩 Wat klopt er niet?</div><textarea placeholder="Toelichting..."></textarea><div class="flag-form-actions"><button class="flag-submit" onclick="submitQFlag()">Indienen</button><button class="flag-cancel" onclick="document.getElementById('q-flag-form').classList.remove('open')">Annuleren</button></div></div><button class="q-next" id="q-next" onclick="nextEx()">Volgende <span class="emo">→</span></button>${q.kind==='listen'?'<button class="q-skip" id="q-skip" onclick="skipQ()">Overslaan <span class="emo">⏭️</span></button>':''}`;
  document.getElementById('modal-body').innerHTML=body;
  const mv=document.getElementById('modal'); if(mv)mv.scrollTop=0;   // full-page: start each question at the top
  if(q.kind==='mc'||q.kind==='listen'){
    const opts=document.getElementById('q-opts');
    q.o.forEach(opt=>{const b=document.createElement('button');b.className='q-opt';b.textContent=opt;b.onclick=()=>answerMC(opt,q.c,b);opts.appendChild(b);});
  }
  if(q.kind==='type'){const inp=document.getElementById('q-input');inp.addEventListener('keydown',e=>{if(e.key==='Enter')checkType();});setTimeout(()=>inp.focus(),100);}
  // "Listen & choose": auto-play the word — speak() prefers a community recording over TTS.
  if(q.kind==='listen'&&q.listenWord)speak(q.listenWord,S.lang.speechLang);
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
  if(correct){fb.className='q-fb good';fb.textContent='Uitstekend! Dat klopt.';S.ex.score++;
    if(typeof playCorrect==='function')playCorrect();
    const tw=S.ex.q[S.ex.cur].speak;   // mark the practised word as learned
    if(tw){const key=S.lang.id+'|'+tw;if(!S.learnedWords.includes(key))S.learnedWords.push(key);
      // In a mistake-practice session, a correct answer clears that word from the list.
      if(S.ex.type==='mistakes'&&typeof removeMistake==='function')removeMistake(tw,S.lang.id);}
  }
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
// Render the end screen: score, XP, level-up and a culture fact.
function renderComplete(){
  const ex=S.ex;const pct=Math.round((ex.score/ex.q.length)*100);
  if(!ex.scored){   // apply scoring/XP once (renderComplete re-runs after the bonus question)
    ex.scored=true;
    let leveledUp=false,passedExam=false;
    if(ex.type==='lesson'){
      const key=S.lang.id+'-'+ex.idx;S.themeProgress[key]=Math.max(S.themeProgress[key]||0,pct);
      leveledUp=addXP(ex.xp);
      if(pct>=60){S.streak=Math.min(7,S.streak+1);renderStats();}
      unlockBadge('first_lesson');
      if(pct===100)unlockBadge('perfect');
    }else if(ex.type==='exam'){
      leveledUp=addXP(Math.round(ex.xp*pct/100));
      if(pct>=80){passedExam=true;unlockBadge('exam_pass');}
    }else{ // practice: theme / crash — flat XP, streak
      leveledUp=addXP(ex.xp);
      if(pct>=60){S.streak=Math.min(7,S.streak+1);renderStats();}
      unlockBadge('first_lesson');
      if(pct===100)unlockBadge('perfect');
      if(ex.type==='theme'&&ex.cat){const k='t-'+S.lang.id+'-'+ex.cat;S.themeProgress[k]=Math.max(S.themeProgress[k]||0,pct);}
    }
    ex.leveledUp=leveledUp; ex.passedExam=passedExam;
    checkBadges();renderProgress();renderHomeLessons();renderAllLessons();
    if(typeof renderCurriculum==='function')renderCurriculum();
    saveState();
  }
  // Flawless lesson → a bonus Surinaamse gezegde before the summary.
  if(ex.type==='lesson'&&pct===100&&!ex.bonusDone&&typeof ODOS!=='undefined'&&ODOS.length>=4){renderOdoBonus();return;}
  const leveledUp=ex.leveledUp,passedExam=ex.passedExam;
  const newBadges=BADGES.filter(b=>S.badges.includes(b.id));
  let badgeHtml='';
  // detect freshly relevant badge (simple: show first lesson / exam badge)
  const rewardEmoji=pct>=80?'🏆':pct>=60?'🌟':'💪';
  const title=ex.type==='exam'?(passedExam?'Geslaagd! 🎓':'Examen voltooid'):(pct>=80?'Schitterend!':pct>=60?'Goed gedaan!':'Blijf oefenen!');
  let body=`<div class="complete"><div class="complete-emoji">${rewardEmoji}</div><div class="complete-title">${title}</div><div class="complete-sub">${ex.score} van ${ex.q.length} goed — ${pct}%</div><div class="complete-rewards"><div class="complete-reward"><span class="emo">⚡</span> +${ex.type==='exam'?Math.round(ex.xp*pct/100):ex.xp} XP</div>`;
  if(leveledUp)body+=`<div class="complete-reward" style="background:var(--blue-l);color:var(--blue);"><span class="emo">⬆️</span> Level ${getLevel(S.xp)}!</div>`;
  if(passedExam)body+=`<div class="complete-reward" style="background:var(--green-l);color:var(--green);"><span class="emo">🏅</span> Geslaagd!</div>`;
  body+=`</div>`;
  if(passedExam)body+=`<div class="complete-badge-unlock show"><div style="font-size:13px;font-weight:500;color:var(--green);margin-bottom:3px;">🏅 Examen gehaald!</div><div style="font-size:12px;color:var(--muted);">Je beheerst de basis van ${S.lang.name}. Geweldig werk!</div></div>`;
  // Guest who just finished their first exercise (lesson, theme or crash) → nudge them to log
  // in so progress is kept. Shown once per device (a signed-out visitor loses progress).
  const authOn=(typeof AUTH_ENABLED==='undefined')||AUTH_ENABLED;
  const isGuest=!(window.AUTH&&window.AUTH.user);
  if(isGuest&&authOn&&!localStorage.getItem('talusuri_guest_saveprompt')){
    try{localStorage.setItem('talusuri_guest_saveprompt','1');}catch(e){}
    body+=`<div class="complete-badge-unlock show" style="background:var(--gold-l);"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:4px;">💾 Bewaar je voortgang</div><div style="font-size:12px;color:var(--muted);margin-bottom:10px;">Je bent niet ingelogd. Maak gratis een account of log in om je XP, badges en lessen te bewaren — anders ben je ze kwijt zodra je weggaat.</div><button class="complete-btn" style="margin:0;" onclick="closeModal();authOpenModal();"><span class="emo">🔒</span> Inloggen / account maken</button></div>`;
  }
  body+=`<div class="complete-culture"><strong>Cultuurweetje — ${S.lang.name}</strong>${S.lang.culture}</div><button class="complete-btn" onclick="closeModal()">Terug naar overzicht</button></div>`;
  document.getElementById('modal-body').innerHTML=body;
  const mv=document.getElementById('modal'); if(mv)mv.scrollTop=0;
}
// Bonus question after a flawless (100%) lesson: pick a Surinamese saying, choose its meaning.
function renderOdoBonus(){
  const ex=S.ex;
  const odo=ODOS[Math.floor(Math.random()*ODOS.length)];
  const opts=shuffle([odo.nl,...shuffle(ODOS.filter(o=>o.nl!==odo.nl)).slice(0,3).map(o=>o.nl)]);
  ex.bonusOdo=odo; ex.bonusAnswered=false;
  let body=`<div class="complete" style="padding-top:8px;">`
    +`<div class="complete-emoji">🗣️</div>`
    +`<div class="complete-title">Foutloos! Bonus-gezegde</div>`
    +`<div class="complete-sub">Wat betekent dit Surinaamse gezegde?</div>`
    +`<div style="position:relative;background:linear-gradient(135deg,var(--gold-l) 0%,var(--card) 55%,var(--green-l) 100%);border:2px solid var(--gold);border-radius:18px;padding:28px 22px;margin-bottom:18px;box-shadow:0 8px 22px rgba(0,0,0,.07);overflow:hidden;">`
    +`<div style="position:absolute;top:2px;left:14px;font-family:'Fraunces',serif;font-size:54px;color:var(--gold);opacity:.55;line-height:1;">&ldquo;</div>`
    +`<div style="position:relative;font-family:'Fraunces',serif;font-weight:600;font-size:19px;line-height:1.45;color:var(--ink);text-align:center;padding:0 8px;">${odo.w}</div>`
    +`<div style="position:absolute;bottom:-14px;right:16px;font-family:'Fraunces',serif;font-size:54px;color:var(--green);opacity:.55;line-height:1;">&rdquo;</div>`
    +`</div>`
    +`<div class="q-opts" id="odo-opts"></div><div class="q-fb" id="odo-fb"></div></div>`;
  document.getElementById('modal-body').innerHTML=body;
  const mv=document.getElementById('modal'); if(mv)mv.scrollTop=0;
  const wrap=document.getElementById('odo-opts');
  opts.forEach(opt=>{const b=document.createElement('button');b.className='q-opt';b.textContent=opt;b.onclick=()=>answerOdoBonus(opt===odo.nl,b);wrap.appendChild(b);});
}
function answerOdoBonus(ok,btn){
  const ex=S.ex; if(ex.bonusAnswered)return; ex.bonusAnswered=true;
  document.querySelectorAll('#odo-opts .q-opt').forEach(b=>{if(b.textContent===ex.bonusOdo.nl)b.classList.add('correct');});
  if(!ok&&btn)btn.classList.add('wrong');
  const fb=document.getElementById('odo-fb');
  if(ok){
    if(typeof playCorrect==='function')playCorrect();
    addXP(15);
    S.odosCorrect=(S.odosCorrect||0)+1;
    if(S.odosCorrect>=10)unlockBadge('odo_master');
    saveState();
    fb.className='q-fb good';fb.textContent='Goed geraden! +15 XP 🎉'+(S.odosCorrect===10?' — je verdient de Odo-meester-badge!':'');
  }else{
    fb.className='q-fb bad';fb.innerHTML='Niet erg — je les blijft 100%! Juist is: <strong>'+ex.bonusOdo.nl+'</strong>';
  }
  fb.style.display='block';
  const cont=document.createElement('button');cont.className='complete-btn';cont.style.marginTop='16px';cont.innerHTML='Verder <span class="emo">→</span>';
  cont.onclick=()=>{ex.bonusDone=true;renderComplete();};
  document.querySelector('#modal-body .complete').appendChild(cont);
}
// List all Surinamese sayings (odo's) with their meaning + source, in the Oefenen section.
function renderGezegdes(){
  const list=document.getElementById('gezegdes-list'); if(!list||typeof ODOS==='undefined')return;
  const done=S.odosCorrect||0;
  const sl=((typeof LANGS!=='undefined'&&LANGS.find(l=>l.id==='sranan'))||{}).speechLang||'nl-NL';
  const head=`<div style="font-size:13px;color:var(--muted);margin-bottom:14px;">Je hebt <strong>${done}</strong> ${done===1?'gezegde':'gezegdes'} goed geraden${done>=10?' — 🗣️ Odo-meester!':' ('+Math.max(0,10-done)+' tot de badge)'}. Spreek een gezegde in via het 🎙️.</div>`;
  list.innerHTML=head+ODOS.map(o=>{
    const esc=o.w.replace(/'/g,"\\'");
    const gold=!!(window.OFFICIAL_AUDIO&&window.OFFICIAL_AUDIO['sranan|'+o.w]);
    return `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:10px;">
      <div style="flex:1;min-width:0;"><div style="font-family:'Fraunces',serif;font-weight:600;font-size:15px;margin-bottom:4px;line-height:1.4;">${o.w}</div><div style="font-size:13px;color:var(--muted);">${o.nl}</div></div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="dict-btn ${gold?'speak-official':''}" onclick="speak('${esc}','${sl}','sranan')" title="${gold?'Community-opname':'Uitspreken'}"><span class="emo">🔊</span></button>
        <button class="dict-btn mic-contrib" onclick="openRecordings('sranan','${esc}')" title="Uitspraken & opnemen"><span class="emo">🎙️</span></button>
      </div>
    </div>`;
  }).join('');
  const src=document.getElementById('gezegdes-source');
  if(src&&typeof ODOS_SOURCE!=='undefined')src.innerHTML='Bron: <a href="'+ODOS_SOURCE.url+'" target="_blank" rel="noopener" style="color:var(--green);">'+ODOS_SOURCE.name+'</a>';
}
// Render the changelog (Help page) from window.CHANGELOG, newest first. Empty until a release.
function renderChangelog(){
  const el=document.getElementById('changelog-list'); if(!el)return;
  const log=(typeof CHANGELOG!=='undefined'&&CHANGELOG)?CHANGELOG:[];
  if(!log.length){el.innerHTML='<div style="font-size:13px;color:var(--muted);">Nog geen wijzigingen vermeld.</div>';return;}
  el.innerHTML=log.map(e=>`<div style="border-left:3px solid var(--green);padding:0 0 12px 12px;margin-bottom:8px;">`
    +`<div style="font-weight:600;font-size:14px;">versie ${e.version}${e.date?` <span style="font-size:11px;color:var(--muted);font-weight:400;">· ${e.date}</span>`:''}</div>`
    +`<ul style="font-size:13px;color:var(--ink);line-height:1.6;padding-left:18px;margin:5px 0 0;">${(e.changes||[]).map(c=>`<li>${c}</li>`).join('')}</ul></div>`).join('');
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
  setTimeout(startTour,500); // guided spotlight tour once the app UI is rendered
}

// ═══ GUIDED TOUR (spotlight) ═══
// A spotlight walkthrough shown right after onboarding: where the leerpad and
// spoedcursus live, how to contribute pronunciations, and (mobile) add-to-homescreen.
let tourStep=0, tourSteps=[];
function isMobileDevice(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(('ontouchstart'in window)&&window.matchMedia('(max-width:760px)').matches);}
function homescreenHint(){
  const ua=navigator.userAgent;
  if(/iPhone|iPad|iPod/i.test(ua))return 'Tik op het <b>deel-icoon</b> (vierkant met pijl omhoog) en kies <b>Zet op beginscherm</b>.';
  return 'Open het browsermenu (<b>⋮</b>) en kies <b>App installeren</b> of <b>Toevoegen aan startscherm</b>.';
}
function buildTourSteps(){
  const s=[
    {sel:'.tab[data-cat="leren"]',emoji:'📚',title:'Je leerpad',text:'Onder <b>Leren</b> vind je je <b>leerpad</b> — een stap-voor-stap route door alle thema\'s, van begroetingen tot werkwoorden.'},
    {sel:'.tab[data-cat="leren"]',emoji:'⚡',title:'Spoedcursus',text:'Ook onder <b>Leren</b>: de <b>spoedcursus</b> met de meest gebruikte woorden, gerangschikt op hoe vaak ze voorkomen.'},
    {sel:'.tab[data-cat="oefenen"]',emoji:'🎙️',title:'Help met uitspraak',text:'In het <b>Woordenboek</b> (onder Oefenen) neem je bij elk woord je eigen uitspraak op. De community stemt erop — bij <b>3+ upvotes</b> vervangt jouw opname automatisch de computerstem (of een beheerder maakt hem officieel).'}
  ];
  if(isMobileDevice())s.push({sel:null,emoji:'📲',title:'Zet op je beginscherm',text:'Wil je TaluSuri als app gebruiken? '+homescreenHint(),install:true});
  return s;
}
function startTour(){
  tourSteps=buildTourSteps();tourStep=0;
  let ov=document.getElementById('tour-overlay');
  if(!ov){ov=document.createElement('div');ov.id='tour-overlay';document.body.appendChild(ov);}
  renderTourStep();
}
function renderTourStep(){
  const ov=document.getElementById('tour-overlay');if(!ov)return;
  const st=tourSteps[tourStep];if(!st){endTour();return;}
  const tgt=st.sel?document.querySelector(st.sel):null;
  const r=tgt?tgt.getBoundingClientRect():null;
  const last=tourStep===tourSteps.length-1;
  const spot=r?`<div class="tour-spot" style="top:${r.top-6}px;left:${r.left-6}px;width:${r.width+12}px;height:${r.height+12}px;"></div>`:`<div class="tour-dim"></div>`;
  // Always centre the card (the spotlight ring marks the target) — keeps tall cards
  // fully on-screen instead of overflowing above a bottom-nav target.
  const cardPos='top:50%;left:12px;right:12px;transform:translateY(-50%);';
  const installBtn=st.install&&window.deferredInstallPrompt?`<button class="tour-install" onclick="tourInstall()">📲 App installeren</button>`:'';
  ov.innerHTML=`${spot}
    <div class="tour-card" style="${cardPos}">
      <div class="tour-card-emoji">${st.emoji}</div>
      <div class="tour-card-title">${st.title}</div>
      <div class="tour-card-text">${st.text}</div>
      ${installBtn}
      <div class="tour-dots">${tourSteps.map((_,i)=>`<span class="${i===tourStep?'on':''}"></span>`).join('')}</div>
      <div class="tour-actions">
        <button class="tour-skip" onclick="endTour()">Overslaan</button>
        ${tourStep>0?`<button class="tour-back" onclick="tourNav(-1)">Terug</button>`:''}
        <button class="tour-next" onclick="${last?'endTour()':'tourNav(1)'}">${last?'Klaar':'Volgende'}</button>
      </div>
    </div>`;
}
function tourNav(d){tourStep+=d;renderTourStep();}
function tourInstall(){if(window.deferredInstallPrompt){window.deferredInstallPrompt.prompt();window.deferredInstallPrompt=null;}}
function endTour(){const ov=document.getElementById('tour-overlay');if(ov)ov.remove();}
// Capture the install prompt (Android/Chrome) so the tour can offer an install button.
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.deferredInstallPrompt=e;});

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
// "Ontdek Suriname" banner. CULTURE_FACTS (~100) and LANG_FACTS come from facts.js.
// Shows a rotating WINDOW of 5 facts (5 dots); after cycling through the window it picks a
// fresh random 5 from the pool, so over time all facts surface. On Sranan/Sarnami the
// language's own migration history is woven into the window.
let cbWindow=[], cbIdx=0, cbTimer=null;
function cbShuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function cbPickWindow(){
  const base=(typeof CULTURE_FACTS!=='undefined')?CULTURE_FACTS:[];
  const lf=(typeof LANG_FACTS!=='undefined'&&LANG_FACTS[S.lang.id])?LANG_FACTS[S.lang.id]:[];
  let win=lf.length?cbShuffle(lf).slice(0,2):[];          // feature up to 2 migration-history facts
  win=win.concat(cbShuffle(base).slice(0,Math.max(0,5-win.length)));
  cbWindow=cbShuffle(win).slice(0,5);
  cbIdx=0;
}
// Render the current slide of the rotating "Ontdek Suriname" banner.
function renderCultureBanner(){
  const ti=document.getElementById('cb-title');if(!ti)return;
  if(!cbWindow.length)cbPickWindow();
  const c=cbWindow[cbIdx%cbWindow.length];if(!c)return;
  document.getElementById('cb-emoji').textContent=c.emoji;
  ti.textContent=c.title;
  document.getElementById('cb-desc').textContent=c.desc;
  document.getElementById('cb-nav').innerHTML=cbWindow.map((_,i)=>`<div class="cb-dot ${i===cbIdx?'active':''}" onclick="setCultureBanner(${i})"></div>`).join('');
}
// Jump the culture banner to a specific slide and reset the auto-rotate timer.
function setCultureBanner(i){cbIdx=i;renderCultureBanner();resetCbTimer();}
// Re-pick the window for the active language (called on language switch).
function refreshCultureBanner(){cbPickWindow();renderCultureBanner();resetCbTimer();}
// (Re)start the 7-second auto-rotate timer; reshuffle the window after a full cycle.
function resetCbTimer(){if(cbTimer)clearInterval(cbTimer);cbTimer=setInterval(()=>{cbIdx++;if(cbIdx>=cbWindow.length)cbPickWindow();renderCultureBanner();},7000);}

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
// Pedagogically ordered theme groups: each phase lists category keys (see THEME_META),
// from most foundational to advanced. Only themes the language actually has words for
// appear, and each step practises exactly that theme's words (via startTheme).
const CURRICULUM_PHASES=[
  {phase:'Fase 1 — Eerste woorden', cats:['social','family','number'],
   grammar:{title:'Voornaamwoorden & basiszinnen',desc:'Leer ik/jij/hij en bouw je eerste zin',emoji:'🔤'}},
  {phase:'Fase 2 — Dagelijks leven', cats:['food','drink','body','house','color','time'], crash:true},
  {phase:'Fase 3 — De wereld om je heen', cats:['person','nature','animal','weather','place','clothing','travel','direction'],
   grammar:{title:'Vragen & ontkenning',desc:'Stel vragen en zeg "nee"',emoji:'❓'}},
  {phase:'Fase 4 — Taal & uitdrukking', cats:['verb','adjective','question','emotion','work','object'],
   grammar:{title:'Tijden & meervoud',desc:'Verleden tijd en meervoudsvormen',emoji:'⏳'}, exam:true}
];
// Assemble the guided learning path for the active language from the phases above.
function buildCurriculum(){
  const steps=[];
  const counts={}; S.lang.words.forEach(w=>{if(w.cat)counts[w.cat]=(counts[w.cat]||0)+1;});
  CURRICULUM_PHASES.forEach(ph=>{
    const themes=ph.cats.filter(c=>THEME_META[c]&&counts[c]>=4);
    if(!themes.length && !ph.crash && !ph.exam) return; // nothing to show for this language
    steps.push({phase:ph.phase});
    themes.forEach(c=>{const m=THEME_META[c];steps.push({type:'theme',cat:c,title:m.label,emoji:m.emoji,desc:`Leer woorden over ${m.label.toLowerCase()}`});});
    if(ph.grammar)steps.push({type:'grammar',title:ph.grammar.title,desc:ph.grammar.desc,emoji:ph.grammar.emoji});
    if(ph.crash&&!isLowResource(S.lang))steps.push({type:'crash',title:'Spoedcursus: kernwoorden',desc:'De meest gebruikte woorden (80/20-principe)',emoji:'⚡'});
    if(ph.exam)steps.push({type:'exam',title:'Eindexamen',desc:'Test alles — haal 80% om te slagen',emoji:'🎓'});
  });
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
    if(s.type==='theme')done=(S.themeProgress['t-'+S.lang.id+'-'+s.cat]||0)>=80;
    const cls=done?'done':(stepNum===1?'active':'');
    let action='';
    if(s.type==='theme')action=`onclick="startTheme('${s.cat}')"`;
    else if(s.type==='grammar')action=`onclick="showView('grammatica')"`;
    else if(s.type==='crash')action=`onclick="showView('crash')"`;
    else if(s.type==='exam')action=`onclick="startExam()"`;
    const kind=s.type==='theme'?'Thema':s.type==='grammar'?'Grammatica':s.type==='crash'?'Spoedcursus':'Examen';
    html+=`<div class="curr-step ${cls}" ${action}><div class="curr-step-num">Stap ${stepNum} · ${kind}</div><div class="curr-step-title">${s.emoji} ${s.title} ${done?'<span class="emo">✅</span>':''}</div><div class="curr-step-desc">${s.desc}</div></div>`;
  });
  html+='</div>';el.innerHTML=html;
}

// ═══ CRASH COURSE (Pareto frequency model) ═══
// Render the spoedcursus: frequency bands over the FREQ spine (see words.js / freq.js),
// showing how many words are available (translated) per band, most-frequent first.
function renderCrash(){
  const track=document.getElementById('crash-track');if(!track)return;
  // Low-resource languages don't have enough words for a frequency course yet.
  if(isLowResource(S.lang)){
    const cov=document.getElementById('crash-coverage');if(cov)cov.textContent='—';
    const kn=document.getElementById('crash-known');if(kn)kn.textContent='0';
    track.innerHTML=`<div class="crash-track-head"><div class="crash-track-title">⚡ ${S.lang.name}</div></div>`+
      `<div style="font-size:13px;color:var(--muted);line-height:1.6;">De spoedcursus is voor ${S.lang.name} nog niet beschikbaar — we hebben meer woorden nodig. We zoeken native speakers en bronnen om deze taal te verrijken. Kun je helpen? <a href="javascript:void(0)" onclick="goToContact()" style="color:var(--green);font-weight:500;">Neem contact op</a>.</div>`;
    return;
  }
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
  S.ex={type:'mistakes',title:'Oefenronde '+S.lang.name,emoji:'💪',xp:words.length*3,q:genLessonQuestions(words,Math.min(words.length,10)),cur:0,score:0,answered:false};
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

// ═══ SHARE CARDS (social growth) ═══
// Draw a branded square card to a canvas and share it (Web Share API with image), falling
// back to a PNG download. Used for the word of the day and the progress card.
async function shareImageCard({heading, big, sub, meta, shareText}){
  const W=1080,H=1080,c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#FBF9F3';g.fillRect(0,0,W,H);
  g.fillStyle='#2e6b41';g.fillRect(0,0,W,18);
  g.textBaseline='alphabetic';
  // logo
  g.font='600 54px Georgia,serif';g.fillStyle='#1b2a20';g.fillText('Talu',80,150);
  const tw=g.measureText('Talu').width;g.fillStyle='#2e6b41';g.fillText('Suri',80+tw,150);
  // heading
  g.fillStyle='#7a7a7a';g.font='34px DM Sans,Arial,sans-serif';g.fillText(heading,80,300);
  // big word — auto-fit to width
  let fs=150;g.fillStyle='#1b2a20';
  do{ g.font='700 '+fs+'px Georgia,serif'; if(g.measureText(big).width<=W-160)break; fs-=6; }while(fs>48);
  g.fillText(big,80,300+fs);
  let y=300+fs;
  if(sub){ g.fillStyle='#2e6b41';g.font='40px DM Sans,Arial,sans-serif';y+=70;g.fillText(sub,80,y); }
  if(meta){ g.fillStyle='#444';g.font='38px DM Sans,Arial,sans-serif';y+=80;
    // wrap meta
    const words=meta.split(' ');let line='';
    for(const w of words){ const t=line?line+' '+w:w; if(g.measureText(t).width>W-160){g.fillText(line,80,y);y+=54;line=w;}else line=t; }
    g.fillText(line,80,y);
  }
  // footer
  g.fillStyle='#7a7a7a';g.font='30px DM Sans,Arial,sans-serif';g.fillText('Leer de 9 talen van Suriname · talusuri.netlify.app',80,H-70);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  const file=new File([blob],'talusuri.png',{type:'image/png'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],text:shareText}); return; }catch(e){ if(e&&e.name==='AbortError')return; }
  }
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='talusuri.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// Share the user's progress as an image card.
function shareProgress(){
  const lvl=getLevel(S.xp);
  shareImageCard({heading:'Mijn voortgang', big:'Level '+lvl, sub:getLevelTitle(lvl),
    meta:S.xp+' XP · '+S.streak+' dagen streak · ik leer '+S.lang.name,
    shareText:'Ik leer '+S.lang.name+' op TaluSuri — level '+lvl+', '+S.xp+' XP! Leer mee → talusuri.netlify.app'});
}

// ═══ SURINAAMSE GEBEURTENISSEN — COUNTDOWN ═══
// Rotates (every 7s, like the "Ontdek Suriname" banner) through the next 3 upcoming events,
// soonest first, with a live per-second countdown. Fixed-date events recur yearly; variable
// (Hindu/Muslim/Christian) ones carry an explicit per-year date — update these each year.
const SURI_EVENTS=[
  {emoji:'🎉',name:'Nieuwjaar',m:0,d:1,desc:'Nieuwjaarsdag'},
  {emoji:'🗣️',name:'Internationale Moedertaaldag',m:1,d:21,desc:'UNESCO-dag van de moedertaal'},
  {emoji:'🛠️',name:'Dag van de Arbeid',m:4,d:1,desc:'Dag van de Arbeid'},
  {emoji:'🚢',name:'Hindostaanse Immigratiedag',m:5,d:5,desc:'Aankomst eerste contractanten, 1873'},
  {emoji:'⛓️‍💥',name:'Keti Koti',m:6,d:1,desc:'Afschaffing van de slavernij, 1863'},
  {emoji:'🪶',name:'Dag der Inheemsen',m:7,d:9,desc:'Dag van de inheemse volken'},
  {emoji:'🌺',name:'Javaanse Immigratiedag',m:7,d:9,desc:'Aankomst eerste contractanten, 1890'},
  {emoji:'✊🏿',name:'Dag der Marrons',m:9,d:10,desc:'Dag van de Marrons'},
  {emoji:'🏮',name:'Chinese Immigratiedag',m:9,d:20,desc:'Aankomst eerste contractanten, 1853'},
  {emoji:'🇸🇷',name:'Onafhankelijkheidsdag',m:10,d:25,desc:'Srefidensi — onafhankelijkheid 1975'},
  {emoji:'🎄',name:'Kerst',m:11,d:25,desc:'Eerste Kerstdag'},
  // variable-date events — best estimates for 2026 (verify/replace yearly)
  {emoji:'🌈',name:'Holi Phagwa',date:'2026-03-04',desc:'Hindostaans kleurenfeest'},
  {emoji:'🌙',name:'Id-ul-Fitr',date:'2026-03-20',desc:'Suikerfeest — einde ramadan'},
  {emoji:'✝️',name:'Goede Vrijdag',date:'2026-04-03',desc:'Goede Vrijdag'},
  {emoji:'🪔',name:'Divali',date:'2026-11-08',desc:'Hindostaans lichtjesfeest'}
];
// Next occurrence of an event (this year or next for fixed dates; the fixed date for variable).
function eventNextDate(ev,now){
  if(ev.date) return new Date(ev.date+'T00:00:00');
  const y=now.getFullYear();
  let t=new Date(y,ev.m,ev.d,0,0,0);
  if(t.getTime()<=now.getTime()) t=new Date(y+1,ev.m,ev.d,0,0,0);
  return t;
}
// The n soonest upcoming events, soonest first.
function nextEvents(n){
  const now=new Date();
  return SURI_EVENTS.map(ev=>({...ev,when:eventNextDate(ev,now)}))
    .filter(ev=>ev.when.getTime()>now.getTime())
    .sort((a,b)=>a.when-b.when).slice(0,n);
}
let evList=[], evIdx=0, evRotTimer=null, evTickTimer=null;
function renderEventCountdown(){
  const card=document.getElementById('ketikoti-card'); if(!card) return;
  if(!evList.length){evList=nextEvents(3);evIdx=0;}
  if(!evList.length){card.style.display='none';return;}
  card.style.display='';
  const ev=evList[evIdx%evList.length];
  document.getElementById('kk-title').innerHTML=ev.emoji+' Aftellen naar '+ev.name;
  document.getElementById('kk-sub').textContent=ev.when.toLocaleDateString('nl-NL',{day:'numeric',month:'long'})+' · '+ev.desc;
  let diff=Math.max(0,ev.when.getTime()-Date.now());
  const d=Math.floor(diff/864e5);diff-=d*864e5;
  const h=Math.floor(diff/36e5);diff-=h*36e5;
  const m=Math.floor(diff/6e4);diff-=m*6e4;
  const s=Math.floor(diff/1e3);
  const cell=(v,l)=>`<div style="background:rgba(255,255,255,.14);border-radius:10px;padding:8px 12px;text-align:center;min-width:54px;"><div style="font-size:22px;font-weight:700;font-family:'Fraunces',serif;line-height:1;color:#FFD016;">${String(v).padStart(2,'0')}</div><div style="font-size:10px;opacity:.85;text-transform:uppercase;letter-spacing:.5px;margin-top:3px;">${l}</div></div>`;
  document.getElementById('kk-timer').innerHTML=cell(d,'dagen')+cell(h,'uur')+cell(m,'min')+cell(s,'sec');
  const cur=evIdx%evList.length;
  document.getElementById('kk-nav').innerHTML=evList.map((e,i)=>`<div onclick="setEventCountdown(${i})" title="${e.name}" style="width:8px;height:8px;border-radius:50%;background:${i===cur?'#fff':'rgba(255,255,255,.35)'};cursor:pointer;"></div>`).join('');
}
// Jump to an event and restart the rotate timer.
function setEventCountdown(i){evIdx=i;renderEventCountdown();resetEventRotate();}
// (Re)start the 7s rotate — same cadence as the Ontdek Suriname banner.
function resetEventRotate(){if(evRotTimer)clearInterval(evRotTimer);evRotTimer=setInterval(()=>{evIdx++;if(evIdx>=evList.length){evList=nextEvents(3);evIdx=0;}renderEventCountdown();},7000);}
// Boot: always start at the soonest event; tick the digits every second.
function startEventCountdown(){
  evList=nextEvents(3); evIdx=0; renderEventCountdown();
  if(!evTickTimer)evTickTimer=setInterval(renderEventCountdown,1000);
  resetEventRotate();
}

// ═══ INIT ═══
// Render everything and initialise the app after onboarding.
function bootApp(){
  applyTheme();renderStats();renderLangGrid();renderSourcesGrid();renderHomeBadges();renderBadgesGrid();setLang(S.lang);renderProgress();updateFeedbackBadge();renderCultureBanner();resetCbTimer();renderDiscover();updateSwitcherLabel();updateMistakesBadge();initBeta();
  startEventCountdown();
}
// Entry point: show onboarding, or boot straight into the app if already onboarded.
function init(){
  // Capture a referral code (?ref=<uid>) for later — applied when an account is created.
  try{const ref=new URLSearchParams(location.search).get('ref');if(ref)localStorage.setItem('talusuri_ref',ref);}catch(e){}
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
