// TaluSuri screenshot driver.
// Usage: node drive.js <url> <view> <lang> <outPath> [crashTier]
//   url      e.g. http://localhost:8137/index.html
//   view     view id without the "view-" prefix: home|crash|woordenboek|... (default home)
//   lang     langId to start in: sranan|sarnami|... (default sranan)
//   outPath  PNG path (default /tmp/talusuri.png)
//   crashTier optional "from-to" rank range to launch a spoedcursus exercise, e.g. "0-100"
//
// Skips onboarding by pre-seeding localStorage. Prints what rendered + any console errors.
const path = require('path');
let chromium;
for (const base of [process.cwd(), __dirname, path.join(__dirname, '..', '..', '..')]) {
  try { ({ chromium } = require(path.join(base, 'node_modules', 'playwright'))); break; } catch (e) {}
}
if (!chromium) { try { ({ chromium } = require('playwright')); } catch (e) {} }
if (!chromium) { console.error('playwright not found — run: npm i -D playwright && npx playwright install chromium'); process.exit(2); }

const [url = 'http://localhost:8137/index.html', view = 'home', lang = 'sranan',
       out = '/tmp/talusuri.png', tier] = process.argv.slice(2);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.addInitScript((lang) => {
    localStorage.setItem('talusuri_state', JSON.stringify({ langId: lang, onboarded: true, theme: 'light', xp: 120, streak: 3, crashProgress: {} }));
    localStorage.setItem('talusuri_beta_dismissed', '1');
  }, lang);
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(700);
  if (view && view !== 'home') { await p.evaluate(v => window.showView && showView(v), view); await p.waitForTimeout(400); }
  if (tier) {
    const [from, to] = tier.split('-').map(Number);
    await p.evaluate(([f, t]) => window.startCrashTier && startCrashTier(f, t), [from, to]);
    await p.waitForTimeout(500);
  }
  const info = await p.evaluate(() => ({
    lang: window.S && S.lang && S.lang.name,
    coverage: document.getElementById('crash-coverage') && document.getElementById('crash-coverage').textContent,
    modalOpen: document.getElementById('modal') && document.getElementById('modal').classList.contains('open')
  }));
  console.log('lang:', info.lang, '| crash-coverage:', info.coverage, '| modal open:', info.modalOpen);
  await p.screenshot({ path: out, fullPage: !tier });
  console.log('screenshot:', out);
  console.log('console errors:', errs.length ? errs.slice(0, 5) : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
