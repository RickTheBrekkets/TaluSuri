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
