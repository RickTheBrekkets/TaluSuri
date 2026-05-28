# TaluSuri — Talen van Suriname

A browser-based app for learning the **10 languages of Suriname** and bringing its
communities closer together through language. Duolingo-style lessons, flashcards,
a dictionary, grammar notes, a 1000-word crash course, gamification (XP, levels,
streaks, badges) and a camera lens — all in a single static site, no backend required.

The interface is in **Dutch**. The vocabulary is drawn from published academic
dictionaries (see the in-app *Bronnen* page and [Data & sources](#data--sources)).

> **Status:** Beta / MVP v3.0. Vocabulary and audio are being refined — feedback and
> native-speaker contributions are very welcome via the in-app *Community* page.

## Languages covered

Sarnami Hindoestani · Sranan Tongo · Surinaams-Javaans · Ndyuka · Saramaccaans ·
Arawak (Lokono) · Kari'na · Hakka · Surinaams-Nederlands · Matawai

## Features

- **Lessons & exams** — auto-generated exercises (multiple choice, type-in, listen-and-choose)
- **Flashcards** with reveal + self-scoring
- **Dictionary** per language and a **global search** across all 10 languages
- **Grammar** notes per language (with a generic fallback)
- **Crash course** — core vocabulary grouped into frequency tiers (80/20 principle)
- **Curriculum** — a guided learning path combining vocab, grammar and exams
- **Camera lens** — photograph an object and see its name in all 10 languages
- **Gamification** — XP, levels, daily streaks, achievement badges, a leaderboard
- **My mistakes** — wrong answers are collected for focused review
- **Community** — flag incorrect entries and a contact form (wired for Netlify Forms)
- **Text-to-speech** pronunciation via the browser Speech Synthesis API
- **Light / dark theme**, fully responsive (desktop top-bar, mobile bottom-nav)
- **Offline-friendly persistence** — progress is stored in `localStorage`

## Project structure

```
talusuri/
├── index.html              # Markup only — view containers, onboarding, modal
├── assets/
│   ├── css/
│   │   └── styles.css       # All styling (theme variables, layout, components)
│   └── js/
│       ├── data.js          # Datasets: languages, words, phrases, sources, badges, leaderboard
│       ├── state.js         # App state, localStorage persistence, theme & level helpers
│       └── app.js           # UI rendering, lessons/exams, navigation, features & init
└── README.md
```

### A note on the architecture

The three JS files are loaded as **classic scripts in order** (`data.js` → `state.js`
→ `app.js`) and share the global scope. This is intentional: the markup uses inline
`onclick="…"` handlers, which require the functions to be global. Load order matters —
`state.js` initialises state from the datasets in `data.js`, and `app.js` is the last
to run (its trailing `init()` boots the app). When adding new content (a language,
grammar section, culture fact), put the **data** in `data.js` or beside its feature in
`app.js`, and keep the **rendering logic** in `app.js`.

## Running locally

It's a static site — any static file server works. From the project root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

> Open it through a server (not `file://`) so the camera lens and form `fetch` behave
> correctly. The camera lens needs `https://` or `localhost` and works best on a phone.

## Deployment

Deploy the folder to any static host (Netlify, GitHub Pages, Cloudflare Pages, …).
The contact form is wired for **Netlify Forms** (`data-netlify="true"` + a honeypot
field); it submits silently and degrades gracefully on other hosts. A local backup of
each submission is also kept in `localStorage`.

## Data & sources

Vocabulary is based on published dictionaries and academic references (e.g. SIL, KITLV,
Instituut voor Taalwetenschap Paramaribo). The full per-language source list is shown on
the in-app *Bronnen* page and defined in `assets/js/data.js`. Documentation for the
Indigenous and Maroon languages is more limited; contributions from native speakers are
explicitly invited.

## Contributing

Found a wrong translation or want to help as a native speaker? Use the **Community** page
in the app to flag entries or send a message. Code/data contributions are welcome via
pull request — keep datasets in `data.js` and rendering in `app.js`.

---

Built with ❤️ for Suriname — verbinding door taal.
