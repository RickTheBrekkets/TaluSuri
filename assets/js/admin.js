// TaluSuri — admin panel. Gated to emails in the `admins` table.
// Promotes a community recording (with ≥5 upvotes) to the word's official
// pronunciation, replacing the text-to-speech voice.
// UI gating here is convenience only — the real protection is the is_admin()
// RLS policy on recordings.update.

const SBA = window.SB || null;
const PROMOTE_MIN = 5;          // upvotes required before a recording is promotable
window.IS_ADMIN = false;

// Check whether the logged-in user is an admin (called by community.js after login).
window.adminCheck = async function(){
  window.IS_ADMIN = false;
  if(!SBA || !AUTH.user) return;
  const {data} = await SBA.from('admins').select('email').eq('email', AUTH.user.email).maybeSingle();
  window.IS_ADMIN = !!data;
};

// Render the admin candidates list: top recording per word with ≥5 upvotes.
async function renderAdmin(){
  const cont = document.getElementById('admin-list');
  if(!cont) return;
  if(!window.IS_ADMIN){ cont.innerHTML = '<div style="font-size:13px;color:var(--muted);">Geen toegang.</div>'; return; }
  cont.innerHTML = '<div style="font-size:13px;color:var(--muted);">Laden…</div>';
  const {data, error} = await SBA.from('recordings').select('id,word_key,lang_id,word,display_name,audio_path,is_official');
  if(error){ cont.innerHTML = '<div style="font-size:13px;color:var(--red);">Kon opnames niet laden.</div>'; return; }
  const scores = await fetchScores((data||[]).map(r=>r.id));  // net score view (community.js)
  const recs = (data||[]).map(r=>({...r, votes: scores[r.id]?.score || 0}));
  // best recording per word among those meeting the threshold
  const byWord = {};
  recs.filter(r=>r.votes>=PROMOTE_MIN).forEach(r=>{ if(!byWord[r.word_key] || r.votes>byWord[r.word_key].votes) byWord[r.word_key]=r; });
  const cands = Object.values(byWord).sort((a,b)=>b.votes-a.votes);
  if(!cands.length){ cont.innerHTML = `<div style="font-size:13px;color:var(--muted);padding:8px 0;">Nog geen opnames met ≥${PROMOTE_MIN} upvotes.</div>`; return; }
  cont.innerHTML = cands.map(r=>{
    const url = SBA.storage.from('pronunciations').getPublicUrl(r.audio_path).data.publicUrl;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      <button class="dict-btn" onclick="playRec('${url}')" title="Afspelen"><span class="emo">▶️</span></button>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:600;">${r.word} <span style="font-size:11px;color:var(--muted);font-weight:400;">(${r.lang_id})</span></div>
        <div style="font-size:12px;color:var(--muted);">${r.display_name||'Anoniem'} · ▲ ${r.votes}${r.is_official?' · ✅ officieel':''}</div>
      </div>
      <button class="onboard-btn" style="width:auto;padding:8px 14px;font-size:13px;" onclick="promote('${r.id}','${r.word_key.replace(/'/g,"\\'")}')">${r.is_official?'Opnieuw instellen':'Maak officieel'}</button>
    </div>`;
  }).join('');
}

// Promote one recording to official for its word (clears any previous official).
async function promote(id, word_key){
  if(!window.IS_ADMIN) return;
  const u1 = await SBA.from('recordings').update({is_official:false}).eq('word_key', word_key);
  if(u1.error){ alert('Mislukt: '+u1.error.message); return; }
  const u2 = await SBA.from('recordings').update({is_official:true}).eq('id', id);
  if(u2.error){ alert('Mislukt: '+u2.error.message); return; }
  await loadOfficialAudio();
  await renderAdmin();
  alert('Officiële uitspraak ingesteld. 🔊 speelt nu deze opname af.');
}
