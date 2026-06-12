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
  try{localStorage.setItem('talusuri_state',JSON.stringify({xp:S.xp,streak:S.streak,langId:S.lang.id,themeProgress:S.themeProgress,badges:S.badges,seenLangs:S.seenLangs,goal:S.goal,theme:S.theme,onboarded:S.onboarded,crashProgress:S.crashProgress,weekXP:S.weekXP,monthXP:S.monthXP,weekKey:S.weekKey,monthKey:S.monthKey,learnedWords:S.learnedWords,nameChanged:S.nameChanged,odosCorrect:S.odosCorrect,energy:S.energy,energyDay:S.energyDay}));}catch(e){}
  if(window.onStateSaved)window.onStateSaved(); // sync progress to Supabase profile when logged in (auth.js)
}
let saved=loadState();
// S = the single global state object the whole app reads/writes.
// Durable fields (xp, streak, langId, themeProgress, badges, seenLangs, goal, theme,
// onboarded, crashProgress, weekXP/monthXP + their period keys) are persisted by
// saveState(); the rest are session-only.
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
  crashProgress:saved?.crashProgress||{}, // "<langId>" -> count of crash-course words practiced
  // Leaderboard periods: XP earned in the current ISO week / calendar month, with the
  // period key each counter belongs to (so a new week/month resets it — see rollPeriods).
  weekXP:saved?.weekXP||0,monthXP:saved?.monthXP||0,
  weekKey:saved?.weekKey||null,monthKey:saved?.monthKey||null,
  learnedWords:saved?.learnedWords||[], // "<langId>|<targetWord>" answered correctly at least once
  nameChanged:saved?.nameChanged||false, // true once the user has used their one display-name change
  odosCorrect:saved?.odosCorrect||0,    // number of bonus gezegdes (odo's) answered correctly
  energy:(typeof saved?.energy==='number')?saved.energy:(window.ENERGY_MAX||16), // drains per answer, refills daily
  energyDay:saved?.energyDay||null,     // day-key the energy belongs to (resets on a new day)
  lbTab:'week' // active leaderboard tab (session-only): 'week' | 'month' | 'all'
};
// Restore the last-used language by id (object reference must come from LANGS).
if(saved?.langId){const f=LANGS.find(l=>l.id===saved.langId);if(f)S.lang=f;}

// ═══ LEADERBOARD PERIODS ═══
// Keys identifying the current week (Monday-anchored date) and month (YYYY-MM), in LOCAL time.
function lbPeriodKeys(){
  const d=new Date();
  const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7)); // back up to Monday
  const p=n=>String(n).padStart(2,'0');
  return {wk:mon.getFullYear()+'-'+p(mon.getMonth()+1)+'-'+p(mon.getDate()), mo:d.getFullYear()+'-'+p(d.getMonth()+1)};
}
// Reset the weekly/monthly XP counters when their period has rolled over. Idempotent.
function rollPeriods(){
  const {wk,mo}=lbPeriodKeys();
  if(S.weekKey!==wk){S.weekKey=wk;S.weekXP=0;}
  if(S.monthKey!==mo){S.monthKey=mo;S.monthXP=0;}
}
rollPeriods(); // clear stale counters on load before anything reads them

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
