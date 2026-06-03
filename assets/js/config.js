// TaluSuri — Supabase configuration.
//
// The anon (public) key is SAFE to expose in client code: it only grants the
// access allowed by Row Level Security policies on the database. NEVER put the
// service_role key here.
//
// Leave both blank to run the app fully anonymous (auth disabled, leaderboard
// falls back to sample data). Fill them in from your Supabase project:
//   Project Settings → API → Project URL  and  Project API keys → anon public
window.SUPABASE_URL = 'https://jhfhbonsdfxrebfpqusv.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_xBE0dO5BkPrItDUfgSMNUw_tiwGiY5S';

// App release info (shown in the footer and the closed-beta bar).
window.APP_VERSION = '1.0 beta';
// Closed beta: max number of accounts. Enforced client-side (nice message) and
// server-side by the trigger in supabase/beta_cap.sql. The cap follows a schedule —
// keep this in sync with beta_cap.sql: 50 until 16 Jun 2026, 250 until Keti Koti
// (1 Jul 2026), then open to everyone.
window.BETA_MAX_ACCOUNTS = 50;   // legacy fallback
window.betaMax = function(){
  const now = Date.now();
  if(now < Date.parse('2026-06-16T00:00:00')) return 50;
  if(now < Date.parse('2026-07-01T00:00:00')) return 250;
  return 0;   // 0 = no cap, open to everyone
};
