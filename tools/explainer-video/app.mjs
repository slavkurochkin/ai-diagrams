// Renders a hands-on episode: a real app (the MCP Inspector) driven live against a real server, with real
// terminal commands, plus the storytelling layer (character picture-in-picture, captions, cards, cursor,
// highlights).
//
//   node app.mjs <video-id> [--stills scenes|t1,t2,…] [--frames N] [--meta]
//
// Everything on screen is real. The demo server and the Inspector are started fresh for every run, the
// database is reset, clicks and typing happen in the real UI at their scheduled moment, and terminal
// commands actually run and show their actual output.
//
// Scene keys (beyond the shared ones: chip, lines, card, char, title, summary, chapter):
//   do:        [{ line, delay?, act: 'click'|'type'|'paste'|'press'|'run'|'clear'|'goto'|'scroll', target?, text?, cmd?, display?, dur?,
//                 saveAs?, capture?, retryUntil?, tries?, quiet?, hidden?, output?, outputOf?: 'server'|'inspector', url? }]
//              run:   capture: regex string; its first group (instead of all stdout) is saved to saveAs.
//                     retryUntil: regex string; the command reruns (up to `tries`, default 3) until its output matches
//                     (and, with verify: { cmd, match }, until that silent command's output matches too). onRetry: a
//                     silent command run before each retry (e.g. to delete the rejected run from the app's history).
//                     Each retry is logged. Use it for live runs whose outcome varies, and say so in the video's LOG.md.
//              goto:  navigate to url ({{VAR}}s filled in) and re-mount the overlay.
//              scroll: bring target to the middle of the screen.
//              click: hidden: true clicks without moving the cursor (housekeeping while a terminal covers the page).
//   highlight: [{ line, delay?, until?, target, label?, dim? }]   amber ring (and optional dim) around a target
//   terminal:  true | { pos: 'right'|'left'|'wide'|'full' }        show the terminal panel during this scene ('wide': left, beside a card)
//   cardPos:   'right' (default) | 'left' | 'bottomleft' (next to the character, clear of the right sidebar)
//   cardTop:   top offset in px for right/left cards (default 66), to keep a button the cursor needs visible
//   cardFrom:  line index at which the card appears (default: scene start), when it would cover early clicks
// Targets: 'text=…', 'label=…', 'placeholder=…', 'role=["button",{"name":"…"}]', 'switch=<server id>', or CSS.
//
// setup.app: 'agentflow' drives the AgentFlow app itself (APP_URL, default http://localhost:5173) instead of the
// MCP Inspector: nothing is started, and setup.prelude — [{ act: 'click', target, times? }] — runs hidden before
// recording (open a template, select a node, open a panel, put it in its starting state).
//
// setup.app: 'terminal' records a terminal-only episode: nothing is started, the screen is a plain backdrop, and
// commands run in setup.dir (override with DEMO_DIR; a leading ~ is the home directory). setup.terminalTitle
// labels the terminal window (default ~/acme-crm-mcp).
//
// setup.app: 'web' records a local web app plus the terminal, both in setup.dir (DEMO_DIR): setup.before — shell
// commands — runs first (e.g. to reset state), then setup.serve — { cmd, ready, url, env? } — starts the app and waits for
// `ready` (a regex string) in its output. The video starts on a plain backdrop; a goto action opens the app.
// setup.css is injected on every page load (e.g. to zoom the app). The cursor hides while a terminal is shown.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { capture } from './lib/capture.mjs';
import { prepare, ROOT } from './lib/prepare.mjs';

const ctx = await prepare('app.mjs');
const { cfg, timeline, OUT_DIR } = ctx;
const setup = cfg.setup ?? {};
const ACME_DIR = process.env.ACME_DIR || setup.acmeDir || join(homedir(), 'Documents/dev/acme-crm-mcp');
const VIEW = { width: 1280, height: 720 }; // laid out at 1280×720, captured at 1.5× → 1920×1080

// ── 1. fresh environment ──────────────────────────────────────────────────────
const AGENTFLOW = setup.app === 'agentflow';
const TERMINAL = setup.app === 'terminal';
const WEB = setup.app === 'web';
const RUN_DIR = TERMINAL || WEB ? (process.env.DEMO_DIR || setup.dir || '').replace(/^~(?=\/|$)/, homedir()) : ACME_DIR;
const children = [];
const cleanup = () => { for (const c of children) { try { process.kill(-c.pid, 'SIGTERM'); } catch {} } };
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

/** Starts a long-running process and resolves with its startup output once `ready` matches. */
function start(cmd, args, opts, ready) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    let out = '';
    const onData = (d) => {
      out += d;
      if (ready.test(out)) resolve(out);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => reject(new Error(`${cmd} ${args.join(' ')} exited (${code}):\n${out}`)));
    setTimeout(() => reject(new Error(`timed out starting ${cmd}:\n${out}`)), 60_000);
  });
}

let serverLog = '', inspectorLog = '', startUrl;
const vars = { ROOT }; // ROOT: this tool's folder (its pinned Inspector), for terminal commands
const fill = (text) => String(text ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
if (TERMINAL) {
  startUrl = null; // a plain backdrop, set below
} else if (WEB) {
  for (const cmd of setup.before ?? []) {
    const r = spawnSync('/bin/bash', ['-c', cmd], { cwd: RUN_DIR, encoding: 'utf8' });
    if (r.status !== 0) { console.error(`setup.before failed: ${cmd}\n${r.stderr}`); process.exit(1); }
  }
  const [cmd, ...args] = setup.serve.cmd.split(' ');
  serverLog = await start(cmd, args, { cwd: RUN_DIR, env: { ...process.env, ...setup.serve.env } }, new RegExp(setup.serve.ready));
  startUrl = null; // a plain backdrop until the first goto (the app may have nothing to show yet)
} else if (AGENTFLOW) {
  startUrl = process.env.APP_URL || 'http://localhost:5173';
  if (!(await fetch(startUrl).then((r) => r.ok, () => false))) {
    console.error(`AgentFlow isn't running at ${startUrl}. Start it with \`npm run dev\` in the repo root.`);
    process.exit(1);
  }
} else {
const busy = await fetch('http://localhost:8787/healthz').then(() => true, () => false);
if (busy) {
  console.error('Port 8787 is in use. Stop your acme-crm-mcp dev server first: the renderer starts a fresh one,\nso rate-limit state and data are always the same.');
  process.exit(1);
}
spawnSync('npm', ['run', 'db:reset'], { cwd: ACME_DIR, stdio: 'ignore' });
serverLog = await start('npm', ['run', 'dev'], { cwd: ACME_DIR }, /MCP server/);

// tokens minted up front (setup.tokens: { VAR: 'client-id' }), usable as {{VAR}} in the catalog and in actions
for (const [name, client] of Object.entries(setup.tokens ?? {})) {
  vars[name] = spawnSync('npm', ['run', '-s', 'token', '--', client], { cwd: ACME_DIR, encoding: 'utf8' }).stdout.trim();
}

const home = join(OUT_DIR, 'inspector-home');
rmSync(home, { recursive: true, force: true });
mkdirSync(home, { recursive: true });
writeFileSync(join(home, 'mcp.json'), fill(JSON.stringify({ mcpServers: setup.servers ?? {} }, null, 2)));
inspectorLog = await start('npx', ['mcp-inspector', '--catalog', join(home, 'mcp.json')], {
  cwd: ROOT,
  env: { ...process.env, MCP_AUTO_OPEN_ENABLED: 'false', MCP_STORAGE_DIR: home, MCP_INSPECTOR_SECRET_STORE: 'memory' },
}, /MCP_INSPECTOR_API_TOKEN=[a-f0-9]+/);
startUrl = inspectorLog.match(/http:\/\/127\.0\.0\.1:\d+\?MCP_INSPECTOR_API_TOKEN=[a-f0-9]+/)[0];
}

// ── 2. browser + overlay ──────────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1.5 });
page.setDefaultTimeout(5000); // scheduled actions fail fast (and are reported) instead of stalling the render
if (startUrl) {
  await page.goto(startUrl);
  await page.waitForTimeout(1500);
} else {
  await page.setContent('<style>html,body{margin:0;height:100%;background:radial-gradient(ellipse at 50% 40%,#1e293b 0%,#0b1020 75%)}</style>');
}
// hidden set-up before recording (AgentFlow: open a template, select a node, open a panel, set its state)
for (const step of setup.prelude ?? []) {
  for (let n = 0; n < (step.times ?? 1); n++) {
    await locate(step.target).click({ timeout: 8000 });
    await page.waitForTimeout(step.wait ?? 250);
  }
}
/** Adds the storytelling overlay (and setup.css) to the current page; again after every navigation. */
async function mountOverlay() {
  if (setup.css) await page.addStyleTag({ content: setup.css });
  await page.addScriptTag({ path: join(ROOT, 'character.js') });
  await page.addScriptTag({ path: join(ROOT, 'lib', 'overlay.js') });
  await page.evaluate(({ TL, CFG }) => window.__overlay.init(TL, CFG), {
    TL: timeline, CFG: { title: cfg.title, summary: cfg.summary, character: cfg.character, terminalTitle: setup.terminalTitle, hideCursor: TERMINAL, hideCursorOnTerminal: WEB },
  });
}
await mountOverlay();

// ── 3. the action schedule ────────────────────────────────────────────────────
const at = (s, e) => s.lines[e.line].start + (e.delay ?? 0);
const actions = timeline.flatMap((s, si) => (s.do ?? []).map((a) => ({ ...a, scene: si, t: at(s, a) })))
  .sort((a, b) => a.t - b.t);

function locate(target) {
  if (target.startsWith('switch=')) {
    return page.getByRole('switch', { name: `Connect or disconnect "${target.slice(7)}"` }).locator('xpath=ancestor::label[1]');
  }
  // always the first VISIBLE match: closed dialogs and menus leave hidden copies of the same text in the page
  const visible = (l) => l.filter({ visible: true }).first();
  if (target.startsWith('text=')) return visible(page.getByText(target.slice(5), { exact: true }));
  if (target.startsWith('label=')) return visible(page.getByLabel(target.slice(6), { exact: true }));
  if (target.startsWith('placeholder=')) return visible(page.getByPlaceholder(target.slice(12), { exact: true }));
  if (target.startsWith('role=')) return visible(page.getByRole(...JSON.parse(target.slice(5))));
  return visible(page.locator(target));
}
const center = (box) => box && { x: box.x + box.width / 2, y: box.y + box.height / 2 };
/** Bounding box if the target is on screen right now; never waits (a missing target is normal mid-scene). */
async function boxOf(target) {
  const l = locate(fill(target));
  if ((await l.count().catch(() => 0)) === 0) return null;
  return l.boundingBox({ timeout: 300 }).catch(() => null);
}

// terminal: one running transcript of commands and their real output
const term = { lines: [], typing: null };
const display = (out) => (cfg.displayOutput ? cfg.displayOutput(out) : out);
function runCommand(a) {
  if (a.output !== undefined || a.outputOf) {
    // display-only: real output captured from the processes this renderer started
    const real = a.outputOf === 'server' ? serverLog : a.outputOf === 'inspector' ? inspectorLog : a.output;
    return { stdout: real, stderr: '' };
  }
  const r = spawnSync('/bin/bash', ['-c', fill(a.cmd)], { cwd: RUN_DIR, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', code: r.status };
}

let cursor = { x: VIEW.width * 0.62, y: VIEW.height * 0.55 };
let cursorFrom = cursor, cursorTo = cursor, moveStart = -1, moveEnd = -1;
const MOVE = 0.6; // seconds the cursor travels before a click
let next = 0; // index of the next action to start
let lastActionT = null;
const pending = []; // actions started but not finished (typing)

/** Types pending field text up to time t (completing anything whose typing has ended by then). */
async function progressTyping(t) {
  for (const p of [...pending]) {
    const k = Math.min(1, (t - p.t) / (p.dur ?? Math.max(0.6, p.text.length * 0.06)));
    await locate(p.target).fill(p.text.slice(0, Math.ceil(p.text.length * k)), { timeout: 1000 }).catch(() => {});
    if (k >= 1) pending.splice(pending.indexOf(p), 1);
  }
}

async function advance(t) {
  // start cursor moves for upcoming clicks/typing
  for (const a of actions.slice(next)) {
    if (a.moved || a.hidden || !['click', 'type', 'paste'].includes(a.act) || t < a.t - MOVE) continue;
    a.moved = true;
    const box = await boxOf(a.target);
    if (box) {
      cursorFrom = cursor;
      cursorTo = center(box);
      moveStart = a.t - MOVE;
      moveEnd = a.t;
    }
  }
  // fire due actions in order
  while (next < actions.length && actions[next].t <= t) {
    const a = actions[next++];
    // when jumping ahead (stills), the app still needs real time between steps (dialogs animate, connections
    // open): pause in proportion to the scheduled gap, capped, then land any earlier typing first
    if (t - a.t > 0.1 && lastActionT !== null) await page.waitForTimeout(Math.min(800, (a.t - lastActionT) * 600));
    lastActionT = a.t;
    await progressTyping(a.t);
    try {
      if (a.act === 'click') await locate(fill(a.target)).click({ timeout: 5000, force: !!a.force });
      else if (a.act === 'scroll') await locate(fill(a.target)).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      else if (a.act === 'goto') { await page.goto(fill(a.url)); await page.waitForTimeout(a.wait ?? 2500); await mountOverlay(); }
      else if (a.act === 'press') await page.keyboard.press(a.target);
      else if (a.act === 'paste') { await locate(a.target).click({ timeout: 5000 }); await locate(a.target).fill(fill(a.text)); }
      else if (a.act === 'type') { await locate(a.target).click({ timeout: 5000 }); pending.push({ ...a, text: fill(a.text) }); }
      else if (a.act === 'clear') { term.lines = []; term.typing = null; }
      else if (a.act === 'run') {
        if (term.typing) term.lines.push({ cmd: term.typing.cmd, output: term.typing.output }); // finish the previous command
        // retryUntil (and verify: a silent command whose output must match) pick a run with the outcome the story needs
        const ok = (r) => new RegExp(a.retryUntil).test(r.stdout + r.stderr)
          && (!a.verify || new RegExp(a.verify.match).test(runCommand({ cmd: a.verify.cmd }).stdout));
        let r = runCommand(a);
        for (let n = 1; a.retryUntil && n < (a.tries ?? 3) && !ok(r); n++) {
          console.warn(`↻ ${a.display ?? a.cmd} at ${a.t.toFixed(1)}s: not the expected outcome; retry ${n}`);
          if (a.onRetry) runCommand({ cmd: a.onRetry }); // e.g. delete the rejected run, so it doesn't show up later
          r = runCommand(a);
        }
        if (a.retryUntil && !ok(r)) console.warn(`⚠ ${a.display ?? a.cmd}: never got the expected outcome (${a.retryUntil})`);
        if (a.saveAs) vars[a.saveAs] = a.capture ? ((r.stdout + r.stderr).match(new RegExp(a.capture))?.[1] ?? '') : r.stdout.trim();
        if (!a.hidden) {
          term.typing = { cmd: a.display ?? fill(a.cmd), start: a.t, dur: a.dur ?? Math.min(2.2, 0.04 * (a.display ?? a.cmd).length),
            // quiet: stdout was captured (e.g. into a variable), so the terminal shows only what is printed (stderr)
            output: display([r.stderr, a.quiet ? '' : r.stdout].filter(Boolean).join('').trimEnd()) };
        }
      }
    } catch (err) {
      console.warn(`⚠ ${a.act} ${a.target ?? a.cmd} at ${a.t.toFixed(1)}s: ${err.message.split('\n')[0]}`);
      // keep a picture of what was on screen, so failures are diagnosable without re-running
      await page.screenshot({ path: join(OUT_DIR, `failed-${a.t.toFixed(1)}s.png`) }).catch(() => {});
    }
  }
  await progressTyping(t);
  // terminal: commit a command once its typing and output reveal are done
  if (term.typing && t > term.typing.start + term.typing.dur + 0.5) {
    term.lines.push({ cmd: term.typing.cmd, output: term.typing.output });
    term.typing = null;
  }
  // cursor position
  if (t >= moveStart && t <= moveEnd) {
    const k = (t - moveStart) / (moveEnd - moveStart);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    cursor = { x: cursorFrom.x + (cursorTo.x - cursorFrom.x) * e, y: cursorFrom.y + (cursorTo.y - cursorFrom.y) * e };
  } else if (t > moveEnd) cursor = cursorTo;
}

/** Live rectangles of the scene's active highlights. */
async function highlights(t) {
  const i = timeline.findIndex((s) => t < s.end);
  const s = timeline[i < 0 ? timeline.length - 1 : i];
  // `until` is a line index; past the last line means "until the scene ends"
  const live = (s.highlight ?? []).filter((h) => t >= at(s, h) && (h.until === undefined || h.until >= s.lines.length || t < at(s, { line: h.until })));
  const rects = [];
  for (const h of live) {
    const box = await boxOf(h.target);
    if (box) rects.push({ ...box, label: h.label, dim: h.dim, since: t - at(s, h) });
  }
  return rects;
}

function terminalView(t) {
  const lines = [...term.lines];
  let typing = null;
  if (term.typing && t >= term.typing.start) {
    const k = Math.min(1, (t - term.typing.start) / term.typing.dur);
    typing = { cmd: term.typing.cmd.slice(0, Math.ceil(term.typing.cmd.length * k)), output: t > term.typing.start + term.typing.dur + 0.25 ? term.typing.output : null };
  }
  return { lines, typing };
}

async function renderAt(t) {
  await advance(t);
  const clickPulse = actions.some((a) => !a.hidden && ['click', 'type', 'paste'].includes(a.act) && t >= a.t && t < a.t + 0.25);
  await page.evaluate((d) => window.__overlay.render(d), {
    t, cursor, clickPulse, rects: await highlights(t), terminal: terminalView(t),
  });
}

try {
  // stills jump straight to a moment; give the live app the real seconds it would have had (connections, dialogs)
  ctx.settleStills = 2500;
  ctx.captureScale = 1.5; // must match deviceScaleFactor above
  await capture(ctx, page, renderAt);
} finally {
  await browser.close();
  cleanup();
}
process.exit(0);
