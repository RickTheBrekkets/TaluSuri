#!/usr/bin/env node
// TaluSuri — reproducible builder for assets/js/dict-words.js.
//
// Re-extracts Dutch→target vocabulary from the source dictionaries and regenerates
// dict-words.js deterministically. Run after editing the REVIEW corrections, or to
// reproduce / audit the committed data.
//
//   node tools/build-dict.js
//
// Requires: poppler's `pdftotext` on PATH, and the (gitignored) source PDFs in assets/:
//   - assets/SU-NL-woordenboek.pdf                 (Sranan Tongo–Nederlands, SIL)
//   - assets/Woordenboek - Sarnami Hindoestani.pdf (Dutch→Sarnami)
//
// Pipeline:
//   Sranan  (Sranan→Dutch): parse headword/sense entries, attach numbered senses only
//           when consecutive & adjacent to their bare headword (rejects page-break
//           orphans), keep single-word PRIMARY (gloss-position 0) glosses, reverse to
//           Dutch→Sranan, prefer headword-sourced then shortest.
//   Sarnami (Dutch→Sarnami): decode broken font glyphs (™->t, º->d, œ->r), strip
//           parentheticals, take the head token of the first sense.
//   Both:   keep only glosses that map onto the FREQ frequency spine; apply REVIEW
//           (FIX/DROP) corrections verified against the source; emit at lowest merge
//           priority (status 'dict' — words.js lets seed & EXTRA override).

const FS = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { FREQ } = require(path.join(ROOT, 'assets/js/freq.js'));
const freqSet = new Set(FREQ.map(f => f.nl));

const PDF_SR = path.join(ROOT, 'assets/SU-NL-woordenboek.pdf');
const PDF_SA = path.join(ROOT, 'assets/Woordenboek - Sarnami Hindoestani.pdf');

function pdftext(pdf) {
  if (!FS.existsSync(pdf)) { console.error('missing source PDF:', pdf); process.exit(2); }
  try { return execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { console.error('pdftotext failed (install poppler-utils):', e.message); process.exit(2); }
}

const POS = 'ww|znw|bnw|bw|vw|telw|vnw|tussenw|vz|lw|num|uitdr|aanspr';

// ── Sranan: reverse Sranan→Dutch with sense-number tracking ──
function parseSranan(raw) {
  const lines = raw.split('\n');
  const headRe = new RegExp('^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ’\'-]*?)(\\d?)\\s+(' + POS + ')\\.?\\s+(.*)$');
  const senseRe = new RegExp('^\\s*(\\d)\\)\\s*(' + POS + ')\\.?\\s+(.*)$');
  const bareRe = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ’'-]*?)(\d?)\s*$/;
  const links = {};
  let senseHead = null, headLine = -99, nextSense = 1, valid = false;
  const add = (sr, rest, follow, fromHead) => {
    let buf = rest, i = 0;
    while (buf.indexOf('.') < 0 && i < follow.length) { buf += ' ' + follow[i]; i++; }
    const gloss = buf.split('.')[0].replace(/\([^)]*\)/g, ' ');
    let pos = 0;
    for (const part of gloss.split(/[,;\/]/)) {
      const w = part.trim().toLowerCase();
      if (w && !/\s/.test(w) && freqSet.has(w)) (links[w] = links[w] || []).push({ sr, pos, fromHead });
      pos++;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    let m = headRe.exec(lines[i]);
    if (m) { add(m[1], m[4], lines.slice(i + 1, i + 4), true); valid = false; continue; }
    m = senseRe.exec(lines[i]);
    if (m) {
      const n = +m[1];
      const okFirst = n === 1 && (i - headLine) <= 3;
      const okNext = n === nextSense && n > 1;
      if (valid && (okFirst || okNext)) { add(senseHead, m[3], lines.slice(i + 1, i + 4), false); nextSense = n + 1; }
      else valid = false;
      continue;
    }
    m = bareRe.exec(lines[i]);
    if (m) { senseHead = m[1]; headLine = i; nextSense = 1; valid = true; }
  }
  const pick = {};
  for (const nl in links) {
    const prim = links[nl].filter(l => l.pos === 0);
    if (!prim.length) continue;
    prim.sort((a, b) => (b.fromHead - a.fromHead) || a.sr.length - b.sr.length);
    pick[nl] = prim[0].sr;
  }
  return pick;
}

// ── Sarnami: Dutch→Sarnami with glyph decode + parenthetical stripping ──
function parseSarnami(raw) {
  raw = raw.replace(/™/g, 't').replace(/º/g, 'd').replace(/œ/g, 'r');
  const entryRe = /^([a-zà-ÿ][a-zà-ÿ'’-]*)\s+(?:\d\)\s*)?\(([a-z, ]+)\)\s*(.*)$/;
  const links = {};
  for (const ln of raw.split('\n')) {
    const m = entryRe.exec(ln);
    if (!m) continue;
    const nl = m[1].toLowerCase();
    if (!freqSet.has(nl) || nl in links) continue;
    const val = m[3].replace(/\([^)]*\)/g, ' ').trim();
    const sr = val.split(/[\s.\/,;]/)[0].replace(/^-+|-+$/g, '');
    if (sr && /^[a-zà-ÿãêõîëï’'-]+$/i.test(sr)) links[nl] = sr;
  }
  return links;
}

// ── Spot-review corrections (verified against the source PDFs) ──
const FIX = { sranan: { wind: 'winti', land: 'kondre', honing: 'oni' }, sarnami: { wolk: 'baadar' } };
const DROP = { sranan: ['al', 'zijn'], sarnami: ['met', 'om', 'naar', 'tot', 'zij', 'eens', 'mist', 'serieus', 'eeuw', 'ham', 'soep'] };
function review(picks, lang) {
  DROP[lang].forEach(nl => delete picks[nl]);
  Object.entries(FIX[lang]).forEach(([nl, w]) => { if (picks[nl]) picks[nl] = w; });
  return picks;
}

function block(name, picks) {
  const k = Object.keys(picks);
  const out = ['  ' + name + ':{'];
  for (let i = 0; i < k.length; i += 4) {
    out.push('    ' + k.slice(i, i + 4).map(nl =>
      JSON.stringify(nl) + ':{w:' + JSON.stringify(picks[nl]) + ',p:' + JSON.stringify(picks[nl]) + '}'
    ).join(',') + (i + 4 < k.length ? ',' : ''));
  }
  out.push('  }');
  return out.join('\n');
}

// Emit in FREQ-rank order (most frequent first), matching the spine.
const order = picks => FREQ.reduce((o, f) => { if (picks[f.nl] !== undefined) o[f.nl] = picks[f.nl]; return o; }, {});
const sranan = order(review(parseSranan(pdftext(PDF_SR)), 'sranan'));
const sarnami = order(review(parseSarnami(pdftext(PDF_SA)), 'sarnami'));

const L = [
  '// TaluSuri — DICT_TRANSLATIONS: auto-extracted from source dictionaries in assets/*.pdf,',
  '// Dutch→target single-word primary glosses mapped onto the FREQ spine. Lowest merge priority',
  "// in words.js (hand-verified seed & EXTRA override). p = word itself (no stress invented).",
  '// Sranan: sense-number tracking rejects orphaned senses (page-break artifacts).',
  '// Sarnami: broken font glyphs decoded — ™->t (retroflex t), º->d (retroflex d),',
  '//          œ->r (retroflex r) — verified against reconstructed words (e.g. daaktar=arts).',
  "// A spot-review fixed residual slips and dropped wrong-sense/junk entries. status 'dict'.",
  '// Regenerate with: node tools/build-dict.js',
  'const DICT_TRANSLATIONS={',
  block('sranan', sranan) + ',',
  block('sarnami', sarnami),
  '};',
  "if(typeof module!=='undefined'&&module.exports){module.exports={DICT_TRANSLATIONS};}"
];
FS.writeFileSync(path.join(ROOT, 'assets/js/dict-words.js'), L.join('\n') + '\n');
console.log('wrote assets/js/dict-words.js — sranan', Object.keys(sranan).length, 'sarnami', Object.keys(sarnami).length);
