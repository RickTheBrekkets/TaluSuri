// TaluSuri — Supabase email+password auth + real leaderboard sync.
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
// flowType 'implicit': magic-link/recovery links carry a hash token that establishes a
// session on load without a stored PKCE code-verifier — so password-reset links work
// reliably (incl. across browsers/devices). detectSessionInUrl consumes that hash.
// Custom auth lock: supabase-js serializes auth calls with the Web Locks API, which WAITS
// forever if another tab (or a stuck operation) holds the lock — making signIn/signOut
// silently hang ("knop doet niks"). Grab the lock only if free; if busy, run unlocked rather
// than block. Worst case is a rare cross-tab token race, far better than a frozen login.
function authLock(name, _acquireTimeout, fn){
  if(typeof navigator==='undefined' || !navigator.locks || !navigator.locks.request) return fn();
  return navigator.locks.request(name, {ifAvailable:true}, ()=>fn());
}
if (AUTH_ENABLED) sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, lock: authLock }
});
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
// Sign out (used by the profile view). Reset state/UI FIRST and immediately, then clear the
// Supabase session fire-and-forget — so logout always works even if the supabase call hangs
// or rejects (an awaited signOut could otherwise block the whole reset and "do nothing").
// Reset the local progress to a blank "guest" state. Called on logout so a signed-out
// visitor is treated as an unknown user (XP/streak/badges/lessons back to zero); the real
// progress stays safe on the server and is restored on the next login.
function resetProgressToGuest(){
  S.xp=0; S.streak=1; S.weekXP=0; S.monthXP=0;
  S.badges=[]; S.learnedWords=[];
  S.themeProgress={}; S.crashProgress={};
  S.seenLangs=[S.lang.id]; S.goal=null; S.nameChanged=false;
  if(typeof rollPeriods==='function')rollPeriods();
  saveState();   // AUTH.user is already null here, so onStateSaved won't push 0 to the server
  try{
    if(typeof renderStats==='function')renderStats();
    if(typeof renderHomeLessons==='function')renderHomeLessons();
    if(typeof renderAllLessons==='function')renderAllLessons();
    if(typeof renderProfile==='function')renderProfile();
  }catch(e){}
}
function authSignOut(){
  AUTH.user=null; AUTH.profile=null;
  resetProgressToGuest();  // signed out → behandel als onbekende gebruiker, voortgang naar 0
  authCloseAllModals();   // never leave a modal covering the topbar after logout
  if(typeof updateAuthUI==='function')updateAuthUI();
  if(typeof renderLeaderboard==='function')renderLeaderboard();
  showView('home');
  try{ if(sb)sb.auth.signOut({scope:'local'}).catch(()=>{}); }catch(e){}
  // Belt-and-suspenders: drop the persisted supabase session so logout survives a refresh
  // even if the signOut call above hung before clearing it.
  try{ Object.keys(localStorage).filter(k=>k.startsWith('sb-')).forEach(k=>localStorage.removeItem(k)); }catch(e){}
}

// ═══ LOGIN MODAL (email + password) ═══
// Hide every auth overlay (login, name, password-reset). Used on logout and before opening
// the login modal so a stray overlay can never sit on top of the topbar / block the pill.
function authCloseAllModals(){
  ['auth-modal','name-modal','pw-reset-modal'].forEach(id=>{const m=document.getElementById(id);if(m)m.style.display='none';});
}
let authMode='login';   // 'login' or 'signup'
function authOpenModal(){
  authCloseAllModals();
  authMode='login';authApplyMode();
  document.getElementById('auth-email').value='';
  document.getElementById('auth-pw').value='';
  document.getElementById('auth-modal').style.display='flex';
}
function authCloseModal(){document.getElementById('auth-modal').style.display='none';}
// Reflect the current login/signup mode in the modal copy.
function authApplyMode(){
  const login=authMode==='login';
  document.getElementById('auth-title').textContent=login?'Inloggen':'Account aanmaken';
  document.getElementById('auth-sub').textContent=login?'Log in met je e-mailadres en wachtwoord.':'Maak een account met je e-mailadres en een wachtwoord.';
  document.getElementById('auth-submit-btn').textContent=login?'Inloggen':'Account aanmaken';
  document.getElementById('auth-pw').setAttribute('autocomplete',login?'current-password':'new-password');
  document.getElementById('auth-toggle-text').textContent=login?'Nog geen account?':'Heb je al een account?';
  document.getElementById('auth-toggle-link').textContent=login?'Account aanmaken':'Inloggen';
}
// Switch between login and signup.
function authToggleMode(){authMode=authMode==='login'?'signup':'login';authApplyMode();}
// Log in or sign up with email + password (no emails sent when "Confirm email" is off in Supabase).
async function authPasswordSubmit(){
  const email=document.getElementById('auth-email').value.trim();
  const pw=document.getElementById('auth-pw').value;
  if(!email||!pw){alert('Vul je e-mailadres en wachtwoord in.');return;}
  if(pw.length<6){alert('Wachtwoord moet minstens 6 tekens zijn.');return;}
  const btn=document.getElementById('auth-submit-btn');
  const orig=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Bezig…';}
  // Never let the request hang silently — race it against a timeout so the button always
  // either succeeds, shows an error, or tells the user to retry.
  const withTimeout=(promise,ms)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error('__timeout')),ms))]);
  try{
    if(authMode==='signup'){
      const max=window.BETA_MAX_ACCOUNTS||0;
      const count=await window.fetchAccountCount();
      if(max&&count!==null&&count>=max){alert('De gesloten bèta zit vol ('+count+'/'+max+' plekken bezet). Houd ons in de gaten voor de volgende ronde!');return;}
    }
    const res=await withTimeout(authMode==='signup'
      ? sb.auth.signUp({email,password:pw})
      : sb.auth.signInWithPassword({email,password:pw}), 15000);
    if(res.error){alert((authMode==='signup'?'Registreren':'Inloggen')+' mislukt: '+res.error.message);return;}
    if(authMode==='signup'&&!res.data.session){
      alert('Account aangemaakt. Bevestig je e-mail om in te loggen — of schakel e-mailbevestiging uit in Supabase (Auth → Providers → Email).');
      return;
    }
    authCloseModal();   // onAuthStateChange handles profile load + UI refresh
  }catch(e){
    if(e&&e.message==='__timeout')alert('Inloggen duurt te lang. Sluit eventuele andere TaluSuri-tabbladen en herlaad de pagina, en probeer opnieuw.');
    else alert('Er ging iets mis bij het inloggen. Probeer het opnieuw.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent=orig;}
  }
}
// Send a password-reset email (also how old magic-link accounts set their first password).
async function authForgot(){
  const email=document.getElementById('auth-email').value.trim();
  if(!email){alert('Vul eerst je e-mailadres in, dan sturen we een reset-link.');return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
  if(error){alert('Versturen mislukt: '+error.message);return;}
  alert('Reset-link verstuurd naar '+email+'. Open de link in je inbox om een nieuw wachtwoord in te stellen.');
}
// After the user opens the reset link, Supabase starts a recovery session; set the new password.
async function authSetNewPassword(){
  const pw=document.getElementById('pw-reset-input').value;
  if(pw.length<6){alert('Wachtwoord moet minstens 6 tekens zijn.');return;}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){alert('Je herstel-sessie is verlopen. Open de reset-link opnieuw (en in dezelfde browser).');return;}
  const {error}=await sb.auth.updateUser({password:pw});
  if(error){alert('Opslaan mislukt: '+error.message);return;}
  document.getElementById('pw-reset-modal').style.display='none';
  alert('Wachtwoord ingesteld — je bent ingelogd.');
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
// The durable progress that lives in one jsonb blob on the profile (everything except
// xp/streak/week_*/month_*, which are their own columns for the leaderboard queries).
function progressSnapshot(){
  return {badges:S.badges, learnedWords:S.learnedWords, themeProgress:S.themeProgress,
          crashProgress:S.crashProgress, seenLangs:S.seenLangs, goal:S.goal, onboarded:S.onboarded,
          theme:S.theme, nameChanged:S.nameChanged};
}
// Merge a remote progress blob into local state (union sets, keep the better of each value)
// so logging in on a new device combines progress rather than overwriting it either way.
function applyRemoteProgress(rp){
  if(!rp||typeof rp!=='object')return;
  const uniq=(a,b)=>Array.from(new Set([...(a||[]),...(b||[])]));
  const maxMap=(a,b)=>{const o={...(a||{})};Object.keys(b||{}).forEach(k=>{o[k]=Math.max(o[k]||0,b[k]||0);});return o;};
  S.badges=uniq(S.badges,rp.badges);
  S.learnedWords=uniq(S.learnedWords,rp.learnedWords);
  S.seenLangs=uniq(S.seenLangs,rp.seenLangs);
  S.themeProgress=maxMap(S.themeProgress,rp.themeProgress);
  S.crashProgress=maxMap(S.crashProgress,rp.crashProgress);
  if(rp.goal&&!S.goal)S.goal=rp.goal;
  S.onboarded=S.onboarded||!!rp.onboarded;
  if(rp.nameChanged)S.nameChanged=true;   // once used on any device, the rename stays spent
  if(rp.theme&&rp.theme!==S.theme){S.theme=rp.theme;if(typeof applyTheme==='function')applyTheme();}  // adopt the device-saved theme
}
// Load the user's profile after login; prompt for a name if they don't have one yet,
// otherwise reconcile XP + progress (keep the better of local vs remote, then push).
async function authLoadProfile(){
  const {data}=await sb.from('profiles').select('id,display_name,xp,streak,langs,avatar_url,week_xp,week_key,month_xp,month_key').eq('id',AUTH.user.id).maybeSingle();
  if(data&&data.display_name){
    AUTH.profile=data;
    if(data.xp>S.xp)S.xp=data.xp;                               // remote ahead → adopt
    if((data.streak||0)>S.streak)S.streak=data.streak;
    // Progress lives in a jsonb column added by progress.sql. Fetch it separately and flag
    // its presence so login + xp sync keep working even if that migration hasn't run yet.
    const {data:pr,error:pe}=await sb.from('profiles').select('progress').eq('id',AUTH.user.id).maybeSingle();
    if(pe){window.__progressCol=false;}else{window.__progressCol=true;applyRemoteProgress(pr&&pr.progress);}
    if(typeof rollPeriods==='function')rollPeriods();
    const {wk,mo}=lbPeriodKeys();
    if(data.week_key===wk&&(data.week_xp||0)>S.weekXP)S.weekXP=data.week_xp;     // adopt higher same-period totals
    if(data.month_key===mo&&(data.month_xp||0)>S.monthXP)S.monthXP=data.month_xp;
    // Best-effort re-render: on a refresh this can run before the app has built the UI, so
    // never let a render error abort the rest (sync + communityOnLogin + the caller's updateAuthUI).
    try{
      if(typeof renderStats==='function')renderStats();
      if(typeof checkBadges==='function')checkBadges();
      if(typeof renderHomeLessons==='function')renderHomeLessons();
    }catch(e){}
    saveState();
    await authPushProfile();                                     // push merged result (covers local-ahead case)
    if(window.communityOnLogin)window.communityOnLogin();        // contributor badges, avatar render (community.js)
  }else{
    authOpenNameModal();                                         // brand-new user → ask for a name
  }
}
// Upsert the current state to the profiles row (idempotent; RLS restricts to own id).
async function authPushProfile(){
  if(!AUTH.user||!AUTH.profile)return;
  if(typeof rollPeriods==='function')rollPeriods();   // ensure period counters are current before syncing
  const payload={
    id:AUTH.user.id,
    display_name:AUTH.profile.display_name,
    xp:S.xp,streak:S.streak,langs:authLangs(),
    week_xp:S.weekXP,week_key:S.weekKey,month_xp:S.monthXP,month_key:S.monthKey,
    avatar_url:AUTH.profile.avatar_url||null,
    updated_at:new Date().toISOString()
  };
  if(window.__progressCol!==false)payload.progress=progressSnapshot();   // omit only if the column is known missing
  const {error}=await sb.from('profiles').upsert(payload);
  if(error&&/progress/.test(error.message||'')){window.__progressCol=false;await sb.from('profiles').upsert((delete payload.progress,payload));}
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
// Number of accounts created (profiles rows). null when auth is off or the request fails.
window.fetchAccountCount=async function(){
  if(!AUTH_ENABLED)return null;
  const {count,error}=await sb.from('profiles').select('id',{count:'exact',head:true});
  return error?null:(count||0);
};
window.fetchLeaderboard=async function(){
  if(!AUTH_ENABLED)return null;
  const {data,error}=await sb.from('profiles').select('id,display_name,xp,langs,avatar_url,week_xp,week_key,month_xp,month_key').order('xp',{ascending:false}).limit(50);
  if(error||!data)return null;
  return data.map(r=>({id:r.id,name:r.display_name,xp:r.xp,langs:r.langs||'',avatar:authInitials(r.display_name),avatar_url:r.avatar_url||null,week_xp:r.week_xp,week_key:r.week_key,month_xp:r.month_xp,month_key:r.month_key}));
};

// ═══ INIT ═══
function authInit(){
  const btn=document.getElementById('auth-btn');
  if(!AUTH_ENABLED){if(btn)btn.style.display='none';return;}
  if(btn)btn.style.display='';
  // Fires on initial session, login, and logout (supabase-js persists the session locally).
  sb.auth.onAuthStateChange((event,session)=>{
    // IMPORTANT: keep this callback synchronous and fast. supabase-js invokes it inside its
    // auth lock and (in current versions) awaits it — so awaiting heavy work here (a profile
    // load) blocks the very signIn/refresh that triggered it, making login hang ("knop doet
    // niks" / "duurt te lang"). Update the UI immediately, then load the profile DETACHED.
    AUTH.user=session?.user||null;
    if(!AUTH.user)AUTH.profile=null;
    updateAuthUI();
    renderLeaderboard();
    if(typeof updateBetaSeats==='function')updateBetaSeats();   // refresh closed-beta seat count
    if(event==='PASSWORD_RECOVERY')document.getElementById('pw-reset-modal').style.display='flex';
    if(AUTH.user)setTimeout(()=>{
      authLoadProfile().catch(e=>console.error('authLoadProfile failed:',e))
        .finally(()=>{try{updateAuthUI();renderLeaderboard();}catch(e){}});
    },0);
  });
  updateAuthUI();
}
authInit();
