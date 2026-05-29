// TaluSuri — community pronunciations: record, upvote, contributor badges,
// profile pictures, and the official-audio override that replaces TTS.
// Loaded after auth.js (reuses its Supabase client via window.SB). Classic
// script: functions are global so inline onclick handlers can reach them.

const SB = window.SB || null;                 // shared Supabase client (null when auth disabled)
window.OFFICIAL_AUDIO = window.OFFICIAL_AUDIO || {};  // word_key -> public audio URL (read by speak() in app.js)

// Stable key for a word across the app: "<langId>|<word>".
function wordKey(langId, w){ return langId + '|' + w; }

// ═══ OFFICIAL AUDIO (admin-promoted recordings replace the robot voice) ═══
async function loadOfficialAudio(){
  window.OFFICIAL_AUDIO = {};
  if(!SB) return;
  const {data} = await SB.from('recordings').select('word_key,audio_path').eq('is_official', true);
  (data||[]).forEach(r=>{ window.OFFICIAL_AUDIO[r.word_key] = SB.storage.from('pronunciations').getPublicUrl(r.audio_path).data.publicUrl; });
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

// ═══ RECORD MODAL (MediaRecorder + file-upload fallback) ═══
let mediaRecorder=null, recChunks=[], recordedBlob=null;

function openRecordModal(){
  if(!AUTH.user){ alert('Log eerst in om een opname in te sturen.'); authOpenModal(); return; }
  recordedBlob=null;
  document.getElementById('rec-modal-word').textContent = CUR.word;
  document.getElementById('rec-toggle').textContent = '⏺ Start opname';
  document.getElementById('rec-status').textContent = '';
  const a=document.getElementById('rec-preview'); a.style.display='none'; a.removeAttribute('src');
  document.getElementById('rec-file').value='';
  document.getElementById('rec-submit').disabled=true;
  document.getElementById('rec-modal').style.display='flex';
}
function closeRecordModal(){
  if(mediaRecorder && mediaRecorder.state==='recording') mediaRecorder.stop();
  document.getElementById('rec-modal').style.display='none';
}

async function toggleRecord(){
  if(mediaRecorder && mediaRecorder.state==='recording'){ mediaRecorder.stop(); return; }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recChunks=[]; mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e=>{ if(e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      stream.getTracks().forEach(t=>t.stop());
      recordedBlob = new Blob(recChunks, {type: recChunks[0]?.type || 'audio/webm'});
      const a=document.getElementById('rec-preview'); a.src=URL.createObjectURL(recordedBlob); a.style.display='block';
      document.getElementById('rec-toggle').textContent='⏺ Opnieuw opnemen';
      document.getElementById('rec-status').textContent='Opname klaar — beluister en stuur in.';
      document.getElementById('rec-submit').disabled=false;
    };
    mediaRecorder.start();
    document.getElementById('rec-toggle').textContent='⏹ Stop opname';
    document.getElementById('rec-status').textContent='Aan het opnemen…';
  }catch(err){
    document.getElementById('rec-status').textContent='Microfoon niet beschikbaar — upload een bestand hieronder.';
  }
}
// File-upload fallback when the mic is unavailable/denied.
function onRecFile(e){
  const f=e.target.files[0]; if(!f) return;
  recordedBlob=f;
  const a=document.getElementById('rec-preview'); a.src=URL.createObjectURL(f); a.style.display='block';
  document.getElementById('rec-status').textContent='Bestand gekozen — stuur in.';
  document.getElementById('rec-submit').disabled=false;
}

async function submitRecording(){
  if(!recordedBlob || !AUTH.user) return;
  document.getElementById('rec-submit').disabled=true;
  const uid = AUTH.user.id;
  const ext = (recordedBlob.type && recordedBlob.type.includes('ogg')) ? 'ogg' : (recordedBlob.type && recordedBlob.type.includes('mp')) ? 'mp3' : 'webm';
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const {error:upErr} = await SB.storage.from('pronunciations').upload(path, recordedBlob, {contentType: recordedBlob.type || 'audio/webm'});
  if(upErr){ alert('Upload mislukt: '+upErr.message); document.getElementById('rec-submit').disabled=false; return; }
  const {error:insErr} = await SB.from('recordings').insert({
    word_key: wordKey(CUR.langId, CUR.word), lang_id: CUR.langId, word: CUR.word,
    user_id: uid, display_name: AUTH.profile?.display_name || null, audio_path: path
  });
  if(insErr){ alert('Opslaan mislukt: '+insErr.message); document.getElementById('rec-submit').disabled=false; return; }
  closeRecordModal();
  await renderRecordingsList();
  refreshContribBadges();
  // Continue flow: offer the swipe-deck so contributing leads somewhere.
  if(confirm('Opname ingestuurd! 🎉 Wil je nu op andere uitspraken stemmen?')){
    closeRecordings();
    showView('feedback');
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
