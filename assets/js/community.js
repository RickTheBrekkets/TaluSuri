// TaluSuri — community pronunciations: record, upvote, contributor badges,
// profile pictures, and the official-audio override that replaces TTS.
// Loaded after auth.js (reuses its Supabase client via window.SB). Classic
// script: functions are global so inline onclick handlers can reach them.

const SB = window.SB || null;                 // shared Supabase client (null when auth disabled)
window.OFFICIAL_AUDIO = window.OFFICIAL_AUDIO || {};  // word_key -> best community-recording URL (read by speak() in app.js)

// Stable key for a word across the app: "<langId>|<word>".
function wordKey(langId, w){ return langId + '|' + w; }

// ═══ COMMUNITY AUDIO (a community recording replaces the robot voice when available) ═══
// Build word_key -> best recording URL. Always prefer a community recording over TTS;
// among recordings, an official (admin-promoted) one wins, otherwise the highest-voted.
async function loadOfficialAudio(){
  window.OFFICIAL_AUDIO = {};
  if(!SB) return;
  const {data} = await SB.from('recordings').select('id,word_key,audio_path,is_official');
  if(data && data.length){
    let scoreMap={};
    try{ const {data:sc}=await SB.from('recording_scores').select('recording_id,score'); (sc||[]).forEach(s=>{scoreMap[s.recording_id]=s.score||0;}); }catch(e){}
    const best={};
    data.forEach(r=>{
      const cand={off:!!r.is_official, score:scoreMap[r.id]||0, path:r.audio_path};
      const cur=best[r.word_key];
      if(!cur || (cand.off&&!cur.off) || (cand.off===cur.off && cand.score>cur.score)) best[r.word_key]=cand;
    });
    Object.keys(best).forEach(k=>{ window.OFFICIAL_AUDIO[k] = SB.storage.from('pronunciations').getPublicUrl(best[k].path).data.publicUrl; });
  }
  if(typeof refreshAudioUI==='function') refreshAudioUI();   // show gold speakers now that recordings are known
}
// Play a stored audio URL (used by the recordings list and the speak() override).
let _recAudio=null;
function playRec(url){ if(_recAudio)_recAudio.pause(); _recAudio=new Audio(url); _recAudio.play(); }

// ═══ RECORDINGS + VOTES MODAL ═══
let CUR = {langId:null, word:null};   // word the recordings modal is open for

// Entry point from the dictionary 🎙️ buttons.
async function openRecordings(langId, word){
  if(!SB){ alert('Community-opnames vereisen dat inloggen is ingesteld.'); return; }
  CUR = {langId, word};
  document.getElementById('rec-word-title').textContent = 'Uitspraken: ' + word;
  document.getElementById('rec-word-sub').textContent = 'Beluister en stem op de beste uitspraak.';
  document.getElementById('recordings-modal').style.display = 'flex';
  await renderRecordingsList();
}
function closeRecordings(){ document.getElementById('recordings-modal').style.display='none'; }

// Net score (+ up/down tallies) per recording, from the recording_scores view.
async function fetchScores(ids){
  const map = {};
  if(!ids.length) return map;
  const {data} = await SB.from('recording_scores').select('recording_id,score,ups,downs').in('recording_id', ids);
  (data||[]).forEach(s=>{ map[s.recording_id] = {score:s.score, ups:s.ups, downs:s.downs}; });
  return map;
}

async function renderRecordingsList(){
  const list = document.getElementById('rec-list');
  list.innerHTML = '<div style="font-size:13px;color:var(--muted);">Laden…</div>';
  const key = wordKey(CUR.langId, CUR.word);
  const {data, error} = await SB.from('recordings').select('id,display_name,audio_path,is_official').eq('word_key', key);
  if(error){ list.innerHTML = '<div style="font-size:13px;color:var(--red);">Kon opnames niet laden.</div>'; return; }
  let recs = data||[];
  if(!recs.length){ list.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nog geen opnames. Wees de eerste! 🎙️</div>'; return; }
  const scores = await fetchScores(recs.map(r=>r.id));
  recs = recs.map(r=>({...r, score: scores[r.id]?.score || 0}));
  recs.sort((a,b)=>b.score-a.score);
  // the current user's existing vote value per recording (1 / -1)
  let mine = {};
  if(AUTH.user){
    const {data:vs} = await SB.from('recording_votes').select('recording_id,value').eq('user_id', AUTH.user.id).in('recording_id', recs.map(r=>r.id));
    (vs||[]).forEach(v=>{ mine[v.recording_id]=v.value; });
  }
  list.innerHTML = recs.map((r,i)=>{
    const url = SB.storage.from('pronunciations').getPublicUrl(r.audio_path).data.publicUrl;
    const best = (i===0 && r.score>0) ? ' <span style="color:var(--green);font-size:11px;">★ beste</span>' : '';
    const official = r.is_official ? ' <span style="font-size:11px;">✅ officieel</span>' : '';
    const up=mine[r.id]===1, down=mine[r.id]===-1;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
      <button class="dict-btn" onclick="playRec('${url}')" title="Afspelen"><span class="emo">▶️</span></button>
      <div style="flex:1;font-size:13px;font-weight:500;">${r.display_name||'Anoniem'}${best}${official}</div>
      <button onclick="vote('${r.id}',1)" title="Goed" style="border:1px solid var(--border);border-radius:8px;background:${up?'var(--green-l)':'var(--card)'};color:${up?'var(--green)':'var(--muted)'};padding:4px 9px;cursor:pointer;font-size:13px;">▲</button>
      <span style="font-size:13px;font-weight:600;min-width:18px;text-align:center;">${r.score}</span>
      <button onclick="vote('${r.id}',-1)" title="Niet goed" style="border:1px solid var(--border);border-radius:8px;background:${down?'rgba(220,50,50,.12)':'var(--card)'};color:${down?'var(--red)':'var(--muted)'};padding:4px 9px;cursor:pointer;font-size:13px;">▼</button>
    </div>`;
  }).join('');
}

// Cast or toggle a signed vote (1 up / -1 down) on a recording.
async function vote(id, value){
  if(!AUTH.user){ alert('Log eerst in om te stemmen.'); authOpenModal(); return; }
  const uid = AUTH.user.id;
  const {data:ex} = await SB.from('recording_votes').select('value').eq('user_id', uid).eq('recording_id', id).maybeSingle();
  if(ex && ex.value===value) await SB.from('recording_votes').delete().eq('user_id', uid).eq('recording_id', id); // tap same again = clear
  else await SB.from('recording_votes').upsert({recording_id:id, user_id:uid, value});
  await renderRecordingsList();
}

// ═══ RECORD MODAL (live microphone recording only — no file upload) ═══
let mediaRecorder=null, recChunks=[], recordedBlob=null;
// Live waveform drawn from the mic stream while recording.
let _waveCtx=null, _waveRaf=null;
function startWave(stream){
  const canvas=document.getElementById('rec-wave'); if(!canvas) return;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  canvas.style.display='block';
  _waveCtx=new AC();
  const analyser=_waveCtx.createAnalyser(); analyser.fftSize=1024;
  _waveCtx.createMediaStreamSource(stream).connect(analyser);
  const buf=new Uint8Array(analyser.fftSize), g=canvas.getContext('2d');
  const colour=(getComputedStyle(document.documentElement).getPropertyValue('--green')||'#3A7A4E').trim();
  const draw=()=>{
    _waveRaf=requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(buf);
    const w=canvas.width, h=canvas.height;
    g.clearRect(0,0,w,h);
    g.lineWidth=2; g.strokeStyle=colour; g.beginPath();
    const slice=w/buf.length;
    for(let i=0;i<buf.length;i++){const y=(buf[i]/128)*h/2; const x=i*slice; i?g.lineTo(x,y):g.moveTo(x,y);}
    g.stroke();
  };
  draw();
}
function stopWave(){
  if(_waveRaf) cancelAnimationFrame(_waveRaf); _waveRaf=null;
  if(_waveCtx){ try{_waveCtx.close();}catch(e){} _waveCtx=null; }
  const canvas=document.getElementById('rec-wave'); if(canvas) canvas.style.display='none';
}

function openRecordModal(){
  if(!AUTH.user){ alert('Log eerst in om een opname in te sturen.'); authOpenModal(); return; }
  recordedBlob=null;
  document.getElementById('rec-modal-word').textContent = CUR.word;
  document.getElementById('rec-toggle').textContent = '⏺ Start opname';
  document.getElementById('rec-status').textContent = '';
  const a=document.getElementById('rec-preview'); a.style.display='none'; a.removeAttribute('src');
  stopWave();
  document.getElementById('rec-submit').disabled=true;
  document.getElementById('rec-modal').style.display='flex';
}
function closeRecordModal(){
  if(mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop();
  stopWave();
  document.getElementById('rec-modal').style.display='none';
}

async function toggleRecord(){
  if(mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder==='undefined'){
    document.getElementById('rec-status').textContent='Opnemen wordt niet ondersteund in deze browser. Probeer Chrome, Edge of een recente Safari.';
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recChunks=[]; mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e=>{ if(e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      stopWave();
      stream.getTracks().forEach(t=>t.stop());
      recordedBlob = new Blob(recChunks, {type: recChunks[0]?.type || 'audio/webm'});
      const a=document.getElementById('rec-preview'); a.src=URL.createObjectURL(recordedBlob); a.style.display='block';
      document.getElementById('rec-toggle').textContent='⏺ Opnieuw opnemen';
      document.getElementById('rec-status').textContent='Opname klaar — beluister en stuur in.';
      document.getElementById('rec-submit').disabled=false;
    };
    mediaRecorder.start();
    document.getElementById('rec-preview').style.display='none';
    document.getElementById('rec-submit').disabled=true;
    startWave(stream);
    document.getElementById('rec-toggle').textContent='⏹ Stop opname';
    document.getElementById('rec-status').textContent='Aan het opnemen…';
  }catch(err){
    document.getElementById('rec-status').textContent = (err && err.name==='NotAllowedError')
      ? 'Microfoon-toegang geweigerd. Sta het toe in je browser-instellingen en probeer opnieuw.'
      : 'Microfoon niet beschikbaar. Controleer of er een microfoon is aangesloten en probeer opnieuw.';
  }
}

async function submitRecording(){
  if(!AUTH.user){ alert('Je bent niet ingelogd. Log in en probeer opnieuw.'); return; }
  if(!recordedBlob){ alert('Geen opname gevonden. Neem eerst op of kies een bestand.'); return; }
  const btn=document.getElementById('rec-submit');
  btn.disabled=true; btn.textContent='Bezig met insturen…';
  try{
    const uid = AUTH.user.id;
    const ext = (recordedBlob.type && recordedBlob.type.includes('ogg')) ? 'ogg' : (recordedBlob.type && recordedBlob.type.includes('mp')) ? 'mp3' : 'webm';
    const rid = (self.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'r'+Date.now()+Math.random().toString(16).slice(2);
    const path = `${uid}/${rid}.${ext}`;
    const {error:upErr} = await SB.storage.from('pronunciations').upload(path, recordedBlob, {contentType: recordedBlob.type || 'audio/webm', upsert:false});
    if(upErr) throw new Error('Upload mislukt: '+(upErr.message||upErr));
    const {error:insErr} = await SB.from('recordings').insert({
      word_key: wordKey(CUR.langId, CUR.word), lang_id: CUR.langId, word: CUR.word,
      user_id: uid, display_name: AUTH.profile?.display_name || null, audio_path: path
    });
    if(insErr) throw new Error('Opslaan mislukt: '+(insErr.message||insErr));
    closeRecordModal();
    await renderRecordingsList();
    refreshContribBadges();
    // Continue flow: offer the swipe-deck so contributing leads somewhere.
    if(confirm('Opname ingestuurd! 🎉 Wil je nu op andere uitspraken stemmen?')){
      closeRecordings();
      showView('feedback');
    }
  }catch(err){
    console.error('submitRecording failed:', err);
    alert((err&&err.message)||'Insturen mislukt. Probeer het opnieuw.');
  }finally{
    btn.disabled=false; btn.textContent='Insturen';
  }
}

// ═══ SWIPE-TO-VOTE DECK (Community page) ═══
// Tinder-style: one recording at a time, swipe/tap right = upvote, left = skip.
let voteQueue=[], voteIdx=0;

async function renderVoteDeck(){
  const host=document.getElementById('vote-deck'); if(!host) return;
  if(!SB){ host.innerHTML='<div style="font-size:13px;color:var(--muted);">Niet beschikbaar.</div>'; return; }
  if(!AUTH.user){
    host.innerHTML='<div style="text-align:center;padding:16px 8px;"><div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Log in om mee te stemmen op uitspraken.</div><button class="onboard-btn" style="width:auto;padding:8px 16px;font-size:13px;" onclick="authOpenModal()">Inloggen</button></div>';
    return;
  }
  host.innerHTML='<div style="font-size:13px;color:var(--muted);">Laden…</div>';
  await loadVoteDeck();
  showVoteCard();
}

// Fetch recordings the user hasn't made and hasn't voted on yet.
async function loadVoteDeck(){
  const {data}=await SB.from('recordings').select('id,word,lang_id,display_name,audio_path').neq('user_id',AUTH.user.id);
  let recs=data||[];
  if(recs.length){
    const {data:vs}=await SB.from('recording_votes').select('recording_id').eq('user_id',AUTH.user.id).in('recording_id',recs.map(r=>r.id));
    const voted=new Set((vs||[]).map(v=>v.recording_id));
    recs=recs.filter(r=>!voted.has(r.id));
  }
  const scores=await fetchScores(recs.map(r=>r.id));
  recs=recs.map(r=>({...r,score:scores[r.id]?.score||0}));
  recs.sort((a,b)=>a.score-b.score); // surface under-voted clips first
  voteQueue=recs; voteIdx=0;
}

function showVoteCard(){
  const host=document.getElementById('vote-deck'); if(!host) return;
  if(voteIdx>=voteQueue.length){
    host.innerHTML='<div style="text-align:center;padding:24px 8px;"><div style="font-size:32px;">🎉</div><div style="font-size:14px;color:var(--muted);margin-top:8px;">Geen opnames meer om op te stemmen. Bedankt!</div><button class="onboard-btn" style="width:auto;padding:8px 16px;margin-top:14px;font-size:13px;" onclick="renderVoteDeck()">Opnieuw laden</button></div>';
    return;
  }
  const r=voteQueue[voteIdx];
  const url=SB.storage.from('pronunciations').getPublicUrl(r.audio_path).data.publicUrl;
  const lang=(LANGS.find(l=>l.id===r.lang_id)||{}).name||r.lang_id;
  host.innerHTML=`
    <div class="swipe-wrap">
      <div class="swipe-card" id="swipe-card">
        <div class="swipe-hint nope">👎 niet goed</div>
        <div class="swipe-hint like">👍 goed</div>
        <div class="swipe-lang">${lang}</div>
        <div class="swipe-word">${r.word}</div>
        <button class="speak-btn" onclick="playRec('${url}')"><span class="emo">▶️</span> Beluister</button>
        <div class="swipe-meta">door ${r.display_name||'Anoniem'} · score ${r.score}</div>
      </div>
    </div>
    <div class="swipe-actions">
      <button class="swipe-btn down" onclick="swipeVote('down')" title="Niet goed">👎</button>
      <button class="swipe-btn idk" onclick="swipeVote('idk')" title="Weet ik niet">🤷</button>
      <button class="swipe-btn like" onclick="swipeVote('up')" title="Goede uitspraak">👍</button>
    </div>
    <div style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px;">${voteIdx+1} / ${voteQueue.length} · swipe ← niet goed · → goed</div>`;
  initSwipeDrag();
}

// Apply the choice (up/down = signed vote, idk = skip) and advance the deck.
async function swipeVote(action){
  const r=voteQueue[voteIdx];
  if(!r) return;
  if((action==='up'||action==='down') && AUTH.user){
    await SB.from('recording_votes').upsert({recording_id:r.id,user_id:AUTH.user.id,value:action==='up'?1:-1});
    refreshContribBadges();
  }
  voteIdx++;
  showVoteCard();
}

// Pointer-drag swipe (mouse + touch). Right = up, left = down. Reassigns handlers each render — no leak.
function initSwipeDrag(){
  const card=document.getElementById('swipe-card'); if(!card) return;
  let startX=null,dx=0;
  card.onpointerdown=e=>{startX=e.clientX;dx=0;card.style.transition='none';try{card.setPointerCapture(e.pointerId);}catch(_){}};
  card.onpointermove=e=>{if(startX===null)return;dx=e.clientX-startX;card.style.transform=`translateX(${dx}px) rotate(${dx/22}deg)`;card.classList.toggle('show-like',dx>40);card.classList.toggle('show-nope',dx<-40);};
  card.onpointerup=()=>{
    if(startX===null)return;const moved=dx;startX=null;
    card.style.transition='transform .28s ease';
    if(Math.abs(moved)>90){card.style.transform=`translateX(${moved>0?700:-700}px) rotate(${moved>0?25:-25}deg)`;setTimeout(()=>swipeVote(moved>0?'up':'down'),170);}
    else{card.style.transform='';card.classList.remove('show-like','show-nope');}
  };
}

// ═══ CONTRIBUTOR BADGES (by total upvotes on your recordings) ═══
async function refreshContribBadges(){
  if(!SB || !AUTH.user) return;
  const {data} = await SB.from('recordings').select('id').eq('user_id', AUTH.user.id);
  const recs = data||[];
  if(recs.length) unlockBadge('rec_first');
  const scores = await fetchScores(recs.map(r=>r.id));
  const total = recs.reduce((s,r)=>s + (scores[r.id]?.score || 0), 0);  // net upvotes across your clips
  if(total>=25)  unlockBadge('voice_25');
  if(total>=100) unlockBadge('voice_100');
}

// ═══ PROFILE PICTURE ═══
async function uploadAvatar(e){
  const file = e.target.files[0];
  if(!file || !AUTH.user) return;
  const uid = AUTH.user.id;
  const ext = (file.name.split('.').pop()||'png').toLowerCase();
  const path = `${uid}/avatar.${ext}`;
  const {error} = await SB.storage.from('avatars').upload(path, file, {upsert:true, contentType:file.type});
  if(error){ alert('Upload mislukt: '+error.message); return; }
  const base = SB.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const url = base + '?t=' + Date.now();   // cache-bust the reused path
  AUTH.profile = AUTH.profile || {};
  AUTH.profile.avatar_url = url;
  await SB.from('profiles').update({avatar_url:url}).eq('id', uid);
  updateAuthUI();
  renderProfile();
}

// Fill the profile view (avatar, name, email, earned badges).
function renderProfile(){
  const nameEl=document.getElementById('pf-name'), emailEl=document.getElementById('pf-email'),
        ava=document.getElementById('pf-ava'), badges=document.getElementById('pf-badges');
  if(!nameEl) return;
  if(!AUTH.user){ nameEl.textContent='Niet ingelogd'; if(emailEl)emailEl.textContent=''; if(ava)ava.innerHTML=''; if(badges)badges.innerHTML=''; return; }
  nameEl.textContent = AUTH.profile?.display_name || '—';
  if(emailEl) emailEl.textContent = AUTH.user.email || '';
  if(ava) ava.innerHTML = AUTH.profile?.avatar_url
    ? `<img src="${AUTH.profile.avatar_url}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;">`
    : `<div style="width:96px;height:96px;border-radius:50%;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;font-family:'Fraunces',serif;">${authInitials(AUTH.profile?.display_name)}</div>`;
  if(badges){
    const earned = BADGES.filter(b=>S.badges.includes(b.id));
    badges.innerHTML = earned.length ? earned.map(b=>`<span title="${b.name} — ${b.desc}" style="font-size:24px;">${b.icon}</span>`).join(' ')
                                     : '<span style="font-size:12px;color:var(--muted);">Nog geen badges.</span>';
  }
  const rn=document.getElementById('pf-rename');
  if(rn) rn.style.display = (AUTH.user && !S.nameChanged) ? 'inline-block' : 'none';   // one rename allowed
}
// Change the display name — allowed only ONCE per account. Marks it used and syncs.
async function renameUser(){
  if(!AUTH.user||!AUTH.profile){ alert('Log eerst in.'); return; }
  if(S.nameChanged){ alert('Je kunt je weergavenaam maar één keer wijzigen — dat is al gebeurd.'); return; }
  const cur=AUTH.profile.display_name||'';
  const name=(prompt('Nieuwe weergavenaam (max 24 tekens).\nLet op: je kunt dit maar ÉÉN keer wijzigen.', cur)||'').trim();
  if(!name || name===cur) return;
  if(name.length>24){ alert('Naam mag maximaal 24 tekens zijn.'); return; }
  if(typeof isNameTaken==='function' && await isNameTaken(name)){ alert('Die weergavenaam is al in gebruik. Kies een andere.'); return; }
  if(!confirm('Je weergavenaam wordt "'+name+'".\nDit kan hierna niet meer gewijzigd worden. Doorgaan?')) return;
  const prev=AUTH.profile.display_name;
  AUTH.profile.display_name=name;
  S.nameChanged=true;
  // Only commit the one-time change once the server has accepted it — otherwise revert,
  // so a failed sync can't leave the user "spent" locally (or let them rename twice).
  let ok=false;
  try{ ok=(typeof authPushProfile==='function') ? await authPushProfile() : false; }catch(e){ ok=false; }
  if(!ok){
    AUTH.profile.display_name=prev; S.nameChanged=false; saveState();
    alert('Opslaan van je nieuwe naam is mislukt. Probeer het opnieuw.');
    return;
  }
  saveState();
  if(typeof updateAuthUI==='function') updateAuthUI();
  renderProfile();
  if(typeof renderLeaderboard==='function') renderLeaderboard();
}

// ═══ ACCOUNT DELETION ("vergeet mij") ═══
// Permanently delete the signed-in user. Removes their storage files (not cascaded by the
// DB foreign keys), then calls the security-definer RPC that drops the auth account — which
// cascades their profile, recordings and votes. Finally wipes local progress and signs out.
// Irreversible; guarded by a confirm + typed confirmation. Needs supabase/forget-me.sql.
async function forgetMe(){
  if(!SB || !AUTH.user){ alert('Je moet ingelogd zijn om je account te verwijderen.'); return; }
  if(!confirm('Weet je het zeker? Dit verwijdert je account, je opnames, je stemmen en je profiel definitief. Dit kan niet ongedaan worden gemaakt.')) return;
  if((prompt('Typ VERWIJDER (in hoofdletters) om je account definitief te wissen.')||'').trim().toUpperCase()!=='VERWIJDER') return;
  const uid=AUTH.user.id;
  try{
    // 1. remove the user's own storage files (folder is named by their uid in each bucket)
    for(const bucket of ['pronunciations','avatars']){
      const {data:files}=await SB.storage.from(bucket).list(uid,{limit:1000});
      if(files&&files.length) await SB.storage.from(bucket).remove(files.map(f=>uid+'/'+f.name));
    }
    // 2. delete the auth user — cascades profiles, recordings and recording_votes
    const {error}=await SB.rpc('delete_own_account');
    if(error) throw error;
  }catch(e){ alert('Verwijderen mislukt: '+(e.message||e)+'\nProbeer het opnieuw of neem contact op.'); return; }
  // 3. wipe local progress on this device, sign out, and reload to a clean state
  try{ Object.keys(localStorage).filter(k=>k.startsWith('talusuri_')).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  alert('Je account is verwijderd. Bedankt dat je TaluSuri hebt geprobeerd.');
  try{ if(typeof authSignOut==='function') await authSignOut(); }catch(e){}
  location.reload();
}

// Called by auth.js after a profile loads.
window.communityOnLogin = function(){
  loadOfficialAudio();
  refreshContribBadges();
  if(window.adminCheck) window.adminCheck();   // resolve admin status for the nav gate
  updateAuthUI();
  renderProfile();
};

// Load official audio for everyone (incl. anonymous) on startup.
if(SB) loadOfficialAudio();
