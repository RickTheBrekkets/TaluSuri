---
name: run-app
description: Launch the TaluSuri static web app in a headless browser and screenshot a view (home, spoedcursus/crash, woordenboek, etc.). Use when asked to run the app, see/verify a UI change, or confirm a view renders. Drives real JS — pre-seeds localStorage to skip onboarding.
---

# Run TaluSuri

TaluSuri is a **static site** (`index.html` + `assets/js/*.js` as classic scripts, no build step). It needs a real browser to run — the JS renders views, and the spoedcursus reads the frequency-ranked word data at runtime. `file://` is unreliable (CDN/font loads), so serve over HTTP.

## One-time setup (browser binary persists in ~/.cache)

```bash
cd /home/richard/projects/talusuri
npm i -D playwright            # node_modules is gitignored; recreate if absent
npx playwright install chromium   # ~110MB, cached in ~/.cache/ms-playwright — only needed once per machine
```

`node_modules/`, `package.json`, `package-lock.json` are throwaway — do NOT commit them.

## Run + screenshot

```bash
cd /home/richard/projects/talusuri
python3 -m http.server 8137 >/tmp/srv.log 2>&1 &   # serve
sleep 1
# drive.js <url> <view> <lang> <outPath> [crashTier]
node .claude/skills/run-app/drive.js http://localhost:8137/index.html crash sranan /tmp/spoedcursus.png
kill %1                                             # stop server when done
```

Then **Read the PNG** — a blank/garbled frame means it failed to launch. The driver also prints the active language, crash coverage, and any console errors (expect `none`).

### Common targets
- Spoedcursus listing (Sranan): `... crash sranan /tmp/spoed.png`
- Spoedcursus in Sarnami: `... crash sarnami /tmp/spoed.png`
- Launch a tier's exercise modal (rank range): add a 5th arg, e.g. `... crash sranan /tmp/ex.png 0-100`
- Home / other views: replace `crash` with `home`, `woordenboek`, `community`, …

## Notes / gotchas
- Onboarding overlay (`#onboard`) blocks views on first load — `drive.js` pre-seeds `localStorage` (`onboarded:true`) to skip it. Don't remove that.
- Views are toggled by `showView('<id>')` (id without the `view-` prefix); exercises start via `startCrashTier(fromRank, toRank)`.
- Default language is `LANGS[0]` (sarnami). Sranan (`sranan`) and Sarnami have the deepest spoedcursus coverage (~600–780 kernwoorden, from the imported dictionaries); other languages show fewer words.
- If the port is busy, pick another and pass it in the URL.

## Regenerating the spoedcursus dictionary data

The Sranan/Sarnami crash-course words in `assets/js/dict-words.js` are auto-extracted from the source dictionary PDFs in `assets/` (gitignored). To re-run or audit that import:

```bash
cd /home/richard/projects/talusuri
node tools/build-dict.js     # needs poppler's pdftotext + the assets/*.pdf sources
```

It regenerates `dict-words.js` deterministically (pdftotext → parse → decode broken glyphs → sense-number tracking → review corrections → emit). With the same PDFs it reproduces the committed file byte-for-byte. Edit the `REVIEW` (FIX/DROP) block in `tools/build-dict.js` to correct entries, then re-run. Hand-verified words live in `EXTRA_TRANSLATIONS` in `assets/js/words.js` and always override the dictionary import.
