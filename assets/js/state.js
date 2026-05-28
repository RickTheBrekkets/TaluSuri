// TaluSuri — app state, localStorage persistence, theme & level helpers
// Part of a static site; loaded as a classic script (relies on global scope for inline handlers).

// ═══ STATE & PERSISTENCE ═══
// Load saved progress from localStorage, or null if none/invalid.
function loadState(){
  try{const s=JSON.parse(localStorage.getItem('talusuri_state'));if(s)return s;}catch(e){}
  return null;
}
// Persist the durable parts of app state to localStorage.
function saveState(){
  try{localStorage.setItem('talusuri_state',JSON.stringify({xp:S.xp,streak:S.streak,langId:S.lang.id,themeProgress:S.themeProgress,badges:S.badges,seenLangs:S.seenLangs,goal:S.goal,theme:S.theme,onboarded:S.onboarded,crashProgress:S.crashProgress}));}catch(e){}
}
let saved=loadState();
// S = the single global state object the whole app reads/writes.
// Durable fields (xp, streak, langId, themeProgress, badges, seenLangs, goal, theme,
// onboarded, crashProgress) are persisted by saveState(); the rest are session-only.
let S={
  lang:LANGS[0],xp:saved?.xp||0,streak:saved?.streak||1,
  flashIdx:0,flashRevealed:false,flashOk:0,flashTot:0, // current flashcard position + score
  ex:null, // active exercise session (lesson/exam/crash/mistakes)
  themeProgress:saved?.themeProgress||{}, // "<langId>-<lessonIdx>" -> best % completed
  badges:saved?.badges||[],               // earned badge ids
  seenLangs:saved?.seenLangs||['sarnami'],// languages the user has opened (for polyglot/explorer badges)
  goal:saved?.goal||null,                 // onboarding goal
  theme:saved?.theme||'light',
  onboarded:saved?.onboarded||false,
  crashProgress:saved?.crashProgress||{}  // "<langId>" -> count of crash-course words practiced
};
// Restore the last-used language by id (object reference must come from LANGS).
if(saved?.langId){const f=LANGS.find(l=>l.id===saved.langId);if(f)S.lang=f;}

// ═══ THEME ═══
// Apply the current light/dark theme and update the toggle icon.
function applyTheme(){
  document.getElementById('htmlRoot').setAttribute('data-theme',S.theme);
  const btn=document.getElementById('theme-btn');
  if(btn)btn.innerHTML=S.theme==='dark'?'<span class="emo">☀️</span>':'<span class="emo">🌙</span>';
}
// Toggle between light and dark theme, then save it.
function toggleTheme(){S.theme=S.theme==='dark'?'light':'dark';applyTheme();saveState();}

// ═══ LEVEL SYSTEM ═══
// Compute the level from total XP (100 XP per level).
function getLevel(xp){return Math.floor(xp/100)+1;}
// Map a level number to its title (capped at the last title).
function getLevelTitle(lvl){return LEVEL_TITLES[Math.min(lvl-1,LEVEL_TITLES.length-1)];}
// XP earned within the current level (0–99).
function xpInLevel(xp){return xp%100;}
