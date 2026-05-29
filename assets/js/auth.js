// TaluSuri — Supabase magic-link auth + real leaderboard sync.
// Loaded last (after app.js) as a classic script: all functions are global so
// inline onclick handlers and app.js can reach them.
//
// Auth is OPTIONAL. The app stays fully usable anonymous; logging in adds you to
// the real leaderboard and syncs progress across devices. If config.js has no
// keys, AUTH_ENABLED is false and everything degrades to the old local-only flow.

// ═══ CLIENT & STATE ═══
const AUTH = { user: null, profile: null };   // current session user + their profiles row
window.AUTH = AUTH;                            // app.js reads this to flag the "me" leaderboard row
const AUTH_ENABLED = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && typeof supabase !== 'undefined');
let sb = null;
if (AUTH_ENABLED) sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
window.SB = sb;   // shared client for community.js / admin.js (null when auth disabled)

// Build 2-letter avatar initials from a display name ("Priya R." -> "PR").
function authInitials(n){return (n||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
// The languages the user has opened, as a display string (reuses S.seenLangs / LANGS).
function authLangs(){return LANGS.filter(l=>S.seenLangs.includes(l.id)).map(l=>l.name).join(', ')||S.lang.name;}

// ═══ TOPBAR UI ═══
// Reflect logged-in/out state in the topbar auth button.
function updateAuthUI(){
  const label=document.getElementById('auth-label'),btn=document.getElementById('auth-btn'),ava=document.getElementById('auth-ava');
  if(!btn)return;
  if(AUTH.user){
    label.textContent=AUTH.profile?.display_name||'Profiel';btn.title='Profiel';
    if(ava)ava.innerHTML=AUTH.profile?.avatar_url?`<img src="${AUTH.profile.avatar_url}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;display:block;">`:'<span class="emo">👤</span>';
  }else{
    label.textContent='Inloggen';btn.title='Inloggen';
    if(ava)ava.innerHTML='<span class="emo">👤</span>';
  }
}
// Topbar button: open the profile view when logged in, else the login modal.
function authButtonClick(){
  if(AUTH.user)showView('profile');
  else authOpenModal();
}
// Sign out (used by the profile view).
function authSignOut(){if(sb)sb.auth.signOut();showView('home');}

// ═══ LOGIN MODAL (magic link) ═══
function authOpenModal(){
  document.getElementById('auth-form').style.display='block';
  document.getElementById('auth-sent').style.display='none';
  document.getElementById('auth-email').value='';
  document.getElementById('auth-modal').style.display='flex';
}
function authCloseModal(){document.getElementById('auth-modal').style.display='none';}
// Send a magic link to the entered email; on success, show the "check inbox" state.
async function authSubmitEmail(){
  const email=document.getElementById('auth-email').value.trim();
  if(!email)return;
  const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin}});
  if(error){alert('Inloggen mislukt: '+error.message);return;}
  document.getElementById('auth-form').style.display='none';
  document.getElementById('auth-sent').style.display='block';
}

// ═══ DISPLAY-NAME MODAL (first login) ═══
function authOpenNameModal(){
  document.getElementById('name-input').value='';
  document.getElementById('name-modal').style.display='flex';
}
// Save the chosen display name, create the profiles row (migrating local XP), and refresh.
async function authSubmitName(){
  const name=document.getElementById('name-input').value.trim();
  if(!name)return;
  AUTH.profile={display_name:name,xp:S.xp,streak:S.streak};
  await authPushProfile();
  document.getElementById('name-modal').style.display='none';
  updateAuthUI();
  renderLeaderboard();
}

// ═══ PROFILE LOAD / SYNC ═══
// Load the user's profile after login; prompt for a name if they don't have one yet,
// otherwise reconcile XP (keep the higher of local vs remote, then push).
async function authLoadProfile(){
  const {data}=await sb.from('profiles').select('id,display_name,xp,streak,langs,avatar_url').eq('id',AUTH.user.id).maybeSingle();
  if(data&&data.display_name){
    AUTH.profile=data;
    if(data.xp>S.xp){S.xp=data.xp;renderStats();saveState();}   // remote ahead → adopt
    await authPushProfile();                                     // push (covers local-ahead case)
    if(window.communityOnLogin)window.communityOnLogin();        // contributor badges, avatar render (community.js)
  }else{
    authOpenNameModal();                                         // brand-new user → ask for a name
  }
}
// Upsert the current state to the profiles row (idempotent; RLS restricts to own id).
async function authPushProfile(){
  if(!AUTH.user||!AUTH.profile)return;
  await sb.from('profiles').upsert({
    id:AUTH.user.id,
    display_name:AUTH.profile.display_name,
    xp:S.xp,streak:S.streak,langs:authLangs(),
    avatar_url:AUTH.profile.avatar_url||null,
    updated_at:new Date().toISOString()
  });
}

// Debounced sync hook — saveState() in state.js calls this after every XP/progress change.
let authSyncTimer=null;
window.onStateSaved=function(){
  if(!AUTH_ENABLED||!AUTH.user||!AUTH.profile)return;
  clearTimeout(authSyncTimer);
  authSyncTimer=setTimeout(authPushProfile,2000);
};

// ═══ LEADERBOARD DATA ═══
// Top players by XP. Returns null when auth is off or the request fails so
// renderLeaderboard() can fall back to the sample LEADERBOARD.
window.fetchLeaderboard=async function(){
  if(!AUTH_ENABLED)return null;
  const {data,error}=await sb.from('profiles').select('id,display_name,xp,langs,avatar_url').order('xp',{ascending:false}).limit(50);
  if(error||!data)return null;
  return data.map(r=>({id:r.id,name:r.display_name,xp:r.xp,langs:r.langs||'',avatar:authInitials(r.display_name),avatar_url:r.avatar_url||null}));
};

// ═══ INIT ═══
function authInit(){
  const btn=document.getElementById('auth-btn');
  if(!AUTH_ENABLED){if(btn)btn.style.display='none';return;}
  if(btn)btn.style.display='';
  // Fires on initial session, login, and logout (supabase-js handles the magic-link redirect).
  sb.auth.onAuthStateChange(async(_event,session)=>{
    AUTH.user=session?.user||null;
    if(AUTH.user)await authLoadProfile();
    else AUTH.profile=null;
    updateAuthUI();
    renderLeaderboard();
  });
  updateAuthUI();
}
authInit();
