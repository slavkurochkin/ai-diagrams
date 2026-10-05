// Renders a narrated explainer video for one diagram template.
//
//   node render.mjs <video-id>                    full render → out/<video-id>/<video-id>.mp4
//   node render.mjs <video-id> --stills scenes    one still per scene → out/<video-id>/stills/
//   node render.mjs <video-id> --stills 12,48.5   stills at given seconds
//   node render.mjs <video-id> --meta             only regenerate transcript.md and youtube.md
//
// The scenario lives in videos/<video-id>/video.mjs. Every run rewrites videos/<video-id>/transcript.md and
// youtube.md (title, description, and chapters computed from the real timeline).
// Pipeline: Kokoro TTS per caption line → timeline → in-page director drives the running app
// (camera, spotlight, packets, character, cards) → one screenshot per frame → ffmpeg.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const [id, ...rest] = process.argv.slice(2);
const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
const VIDEO_DIR = join(ROOT, 'videos', id || '');
if (!id || !existsSync(join(VIDEO_DIR, 'video.mjs'))) {
  console.error('usage: node render.mjs <video-id> [--stills scenes|t1,t2,…] [--frames N]');
  process.exit(1);
}
const OUT_DIR = join(ROOT, 'out', id);
const KOKORO_DIR = join(ROOT, '.cache', 'kokoro');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
if (!existsSync(join(KOKORO_DIR, 'kokoro-v1.0.onnx'))) {
  console.error('Kokoro voice model missing: run ./setup.sh first');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
const cfg = (await import(pathToFileURL(join(VIDEO_DIR, 'video.mjs')).href)).default;
const { scenes } = cfg;

const FPS = 30;
const W = 1920, H = 1080;
const VOICE = cfg.voice || 'af_heart', SPEED = String(cfg.speed || '1.0');
const LEAD = 1.4;   // seconds of camera move before narration in each scene
const GAP = 0.35;   // pause between lines
const TAIL = 0.9;   // pause after the last line of a scene
const ONLY = flag('--frames') ? Number(flag('--frames')) : Infinity; // preview cap
const STILLS = flag('--stills');

const SPEAK = [
  [/org_id/g, 'org I D'], [/tenant_id/g, 'tenant I D'], [/crm:read/g, 'C R M read'],
  [/crm:write/g, 'C R M write'], [/_/g, ' '], [/\bMCP\b/g, 'M C P'], [/\bCRM\b/g, 'C R M'],
  [/\bJSON\b/g, 'jason'], [/ChatGPT/g, 'Chat G P T'], [/\bIDEs\b/g, 'I D Ees'],
  ...(cfg.speak || []),
];
const speakable = (s) => SPEAK.reduce((acc, [re, to]) => acc.replace(re, to), s);

// ── 1. narration audio + timeline ─────────────────────────────────────────────
const ADIR = join(ROOT, '.cache', 'audio', VOICE);
mkdirSync(ADIR, { recursive: true });
// cache key = voice + speed + spoken text, so edited lines are always re-synthesized
const clipPath = (text) => `${ADIR}/${createHash('sha1').update(`${SPEED}|${speakable(text)}`).digest('hex').slice(0, 16)}.wav`;
const jobs = scenes.flatMap((s) => s.lines.map((text) => [speakable(text), clipPath(text)]));
const jobsFile = join(OUT_DIR, 'tts_jobs.json');
writeFileSync(jobsFile, JSON.stringify(jobs));
execFileSync('uv', ['run', '--python', '3.12', '--with', 'kokoro-onnx', '--with', 'soundfile', 'python', join(ROOT, 'tts.py'), jobsFile],
  { stdio: 'inherit', env: { ...process.env, VOICE, SPEED, KOKORO_DIR } });
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
let t = 0;
const clips = [];
const timeline = scenes.map((s, si) => {
  const start = t;
  t += LEAD;
  const lines = s.lines.map((text, li) => {
    const f = clipPath(text);
    const d = dur(f);
    const line = { text, start: t, end: t + d };
    clips.push({ f, at: t });
    t += d + GAP;
    return line;
  });
  t += TAIL - GAP + (s.summary ? 1.5 : 0);
  return { ...s, start, end: t, lines };
});
const TOTAL = t;
console.log(`total ${TOTAL.toFixed(1)}s, ${Math.ceil(TOTAL * FPS)} frames`);

// transcript: what is said and shown, with timestamps; regenerated on every run so it never drifts
const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const plain = (h) => h.replace(/<[^>]+>/g, '');
const md = [`# ${cfg.title.heading} — transcript`, '',
  `Generated from \`video.mjs\` on every render. Total ${mmss(TOTAL)} · voice \`${VOICE}\` at ${SPEED}× · template "${cfg.template}".`, ''];
for (const s of timeline) {
  md.push(`## ${mmss(s.start)} · ${s.chip}`, '');
  const ch = s.char;
  for (const [li, l] of s.lines.entries()) {
    md.push(`- **${mmss(l.start)}** ${l.text}`);
    for (const p of (ch?.pops || []).filter((p) => p.line === li)) {
      const who = p.kind === 'assistant' ? 'Assistant' : p.kind === 'consent' ? 'Sign-in prompt' : cfg.character.label;
      md.push(`  - _${who}:_ ${p.text ? plain(p.text) : '(on screen)'}`);
    }
  }
  if (s.card) md.push('', `> **Card — ${plain(s.card.title)}**`, ...s.card.items.map((it) => `> - ${plain(it.text)}`));
  md.push('');
}
writeFileSync(join(VIDEO_DIR, 'transcript.md'), md.join('\n'));

// youtube.md: hand-written title/description/tags from the scenario + chapters from the timeline.
// Chapters follow YouTube's rules: first at 0:00, at least 3, each at least 10 s long.
if (!cfg.youtube) {
  console.warn('warning: no `youtube` block in video.mjs, so youtube.md was not written');
} else {
  const yt = cfg.youtube;
  // a scene's `chapter` overrides its chip; consecutive scenes with the same name share one chapter
  let chapters = [];
  for (const s of timeline) {
    const name = s.chapter || (s.title ? 'Intro' : s.chip.replace(/^\d+\s*·\s*/, ''));
    if (chapters.length && chapters[chapters.length - 1].name === name) continue;
    chapters.push({ at: chapters.length ? s.start : 0, name });
  }
  // a chapter under 10 s is folded into the next one (which then starts earlier); reported so it can be named better
  const merged = [];
  for (let i = 0; i < chapters.length - 1; i++) {
    if (chapters[i + 1].at - chapters[i].at < 10 && i > 0) {
      merged.push(`${chapters[i].name} → ${chapters[i + 1].name}`);
      chapters[i + 1].at = chapters[i].at;
      chapters[i] = null;
    }
  }
  chapters = chapters.filter(Boolean);
  for (const m of merged) console.warn(`youtube: short chapter merged into the next one (${m}); set \`chapter\` on the scenes to name it`);
  const tooShort = chapters.filter((c, i) => (chapters[i + 1]?.at ?? TOTAL) - c.at < 10).map((c) => c.name);
  const description = [yt.description.trim(), '', 'Chapters', ...chapters.map((c) => `${mmss(c.at)} ${c.name}`)].join('\n');
  const problems = [
    yt.title.length > 100 && `title is ${yt.title.length} chars (max 100)`,
    description.length > 5000 && `description is ${description.length} chars (max 5000)`,
    chapters.length < 3 && 'fewer than 3 chapters',
    tooShort.length && `chapters shorter than 10 s: ${tooShort.join(', ')}`,
  ].filter(Boolean);
  for (const p of problems) console.warn(`youtube warning: ${p}`);
  writeFileSync(join(VIDEO_DIR, 'youtube.md'), [
    `# YouTube — ${cfg.title.heading}`, '',
    `Generated from \`video.mjs\` (\`youtube\` block) on every render; chapters come from the real timeline. Paste as-is.`, '',
    '## Title', '', yt.title, '',
    '## Description', '', '```', description, '```', '',
    '## Tags', '', (yt.tags || []).join(', '), '',
    ...(problems.length ? ['## Warnings', '', ...problems.map((p) => `- ${p}`), ''] : []),
  ].join('\n'));
}
if (rest.includes('--meta')) {
  console.log(`wrote transcript.md${cfg.youtube ? ' and youtube.md' : ''}`);
  process.exit(0);
}

// mix narration into one track
const args = ['-y'];
clips.forEach((c) => args.push('-i', c.f));
const delays = clips.map((c, i) => `[${i}]adelay=${Math.round(c.at * 1000)}|${Math.round(c.at * 1000)}[a${i}]`).join(';');
args.push('-filter_complex', `${delays};${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${TOTAL}[out]`,
  '-map', '[out]', '-ar', '48000', '-ac', '2', join(OUT_DIR, 'narration.wav'));
execFileSync('ffmpeg', args, { stdio: 'ignore' });

// ── 2. load template in the app ───────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
try {
  await page.goto(APP_URL);
} catch {
  console.error(`App not reachable at ${APP_URL}: start it with \`npm run dev\` in the repo root`);
  process.exit(1);
}
await page.waitForTimeout(1500);
// first visit opens the "Set up your flow" dialog
await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 3000 }).catch(() => {});
await page.locator('[title="New flow, templates, load, and document export"]').click();
await page.getByText('Browse templates').first().click();
await page.getByText(cfg.template, { exact: true }).click();
await page.waitForTimeout(2000);
await page.mouse.move(W - 5, H - 5);
await page.addScriptTag({ path: join(ROOT, 'character.js') });

// ── 3. in-page director ───────────────────────────────────────────────────────
await page.evaluate(({ TL, CFG }) => {
  const css = document.createElement('style');
  css.textContent = `
    .react-flow__node, .react-flow__edge { transition: none !important; }
    #ex-cap { position: fixed; left: 50%; bottom: 44px; transform: translateX(-50%); max-width: 1240px; width: max-content;
      padding: 18px 30px; border-radius: 14px; background: rgba(8,11,20,.88); border: 1px solid rgba(255,255,255,.1);
      color: #f1f5f9; font: 500 27px/1.4 Geist, Inter, system-ui, sans-serif; text-align: center; z-index: 9999;
      box-shadow: 0 10px 40px rgba(0,0,0,.5); }
    #ex-chip { position: fixed; left: 252px; top: 80px; padding: 9px 16px; border-radius: 999px; z-index: 9999;
      background: rgba(251,191,36,.12); border: 1px solid rgba(251,191,36,.45); color: #fcd34d;
      font: 600 18px/1 Geist, Inter, system-ui, sans-serif; letter-spacing: .02em; }
    #ex-title { position: fixed; inset: 56px 0 0 224px; display: flex; flex-direction: column; align-items: center;
      justify-content: center; z-index: 9998; background: radial-gradient(ellipse at center, rgba(8,11,20,.92) 0%, rgba(8,11,20,.75) 60%, rgba(8,11,20,.4) 100%);
      color: #fff; font-family: Geist, Inter, system-ui, sans-serif; pointer-events: none; }
    #ex-title .k { font-size: 20px; letter-spacing: .25em; text-transform: uppercase; color: #fcd34d; margin-bottom: 18px; }
    #ex-title .h { font-size: 76px; font-weight: 700; letter-spacing: -.02em; }
    #ex-title .s { font-size: 26px; color: #94a3b8; margin-top: 16px; }
    #ex-card { position: fixed; right: 36px; top: 80px; width: 470px; padding: 20px 22px 12px; border-radius: 16px; z-index: 9999;
      background: rgba(8,11,20,.92); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 10px 40px rgba(0,0,0,.5);
      font-family: Geist, Inter, system-ui, sans-serif; color: #cbd5e1; }
    #ex-card .t { font-size: 15px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #fcd34d; margin-bottom: 12px; }
    #ex-card .i { font-size: 19px; line-height: 1.4; padding: 9px 12px; margin-bottom: 8px; border-radius: 10px; border: 1px solid transparent; }
    #ex-card .i.on { background: rgba(251,191,36,.10); border-color: rgba(251,191,36,.45); color: #f8fafc; }
    #ex-card b { color: #fff; font-weight: 600; }
    #ex-card code { font: 500 16px ui-monospace, Menlo, monospace; color: #fde68a; }
    #ex-sum { position: fixed; left: 224px; right: 0; top: 140px; display: flex; justify-content: center; gap: 14px; z-index: 9999; }
    #ex-sum span { padding: 12px 22px; border-radius: 12px; background: rgba(8,11,20,.9); border: 1px solid rgba(251,191,36,.5);
      color: #fcd34d; font: 600 26px/1 Geist, Inter, system-ui, sans-serif; }
  `;
  document.head.appendChild(css);
  const mk = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; document.body.appendChild(d); return d; };
  const cap = mk('ex-cap'), chip = mk('ex-chip'), card = mk('ex-card');
  const title = mk('ex-title', `<div class="k">${CFG.title.kicker}</div><div class="h">${CFG.title.heading}</div><div class="s">${CFG.title.sub}</div>`);
  const sum = mk('ex-sum', CFG.summary.map((w) => `<span>${w}</span>`).join(''));

  const vp = document.querySelector('.react-flow__viewport');
  const paneEl = document.querySelector('.react-flow');
  const pane = paneEl.getBoundingClientRect();

  // label → node element / geometry (flow coordinates)
  const nodes = {};
  for (const el of document.querySelectorAll('.react-flow__node')) {
    if (el.classList.contains('react-flow__node-frame')) { nodes.__frame = { el }; continue; }
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
    const g = { el, id: el.dataset.id, x: +m[1], y: +m[2], w: Math.max(el.offsetWidth, el.firstElementChild?.offsetWidth || 0), h: el.offsetHeight };
    nodes[el.textContent] = g;
  }
  // exact label first: a node's text is its label followed by lowercase config text, so "Answer" must not
  // match "Answer LLM" (label continues with a space or capital) when a node labelled exactly "Answer" exists
  const byLabel = (l) => {
    const keys = Object.keys(nodes).filter((k) => k.startsWith(l));
    const k = keys.find((k) => !/^[ A-Z(]/.test(k.slice(l.length))) || keys[0];
    if (!k) throw new Error('no node ' + l);
    return nodes[k];
  };
  const edges = [...document.querySelectorAll('.react-flow__edge')].map((el) => {
    const [, from, to] = /Edge from (\S+) to (\S+)/.exec(el.getAttribute('aria-label'));
    const path = el.querySelector('path.react-flow__edge-path');
    path.style.transition = 'none';
    return { el, from, to, path };
  });

  // the character lives in flow space beside its anchor node (left by default), with a dashed link into it
  const clients = byLabel(CFG.character.anchor);
  const right = CFG.character.side === 'right';
  const bx = right ? clients.x + clients.w + 120 : clients.x - 360, by = clients.y + clients.h / 2 - 200;
  const person = window.__character.mount(vp, CFG.character.look);
  person.style.transform = `translate(${bx}px, ${by}px)`;
  nodes[CFG.character.label] = { el: person, id: 'character', x: bx - 40, y: by - 250, w: 340, h: 630 };
  const edgeSvg = document.querySelector('.react-flow__edges svg') || document.querySelector('.react-flow__edges');
  const link = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const x1 = right ? bx + 45 : bx + 215, y1 = by + 290;
  const x2 = right ? clients.x + clients.w : clients.x, y2 = clients.y + clients.h / 2;
  const bend = right ? -70 : 70;
  link.setAttribute('d', `M ${x1},${y1} C ${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`);
  link.setAttribute('fill', 'none');
  link.style.stroke = 'rgba(255,255,255,.25)';
  link.style.strokeWidth = '1.5';
  link.style.strokeDasharray = '6 6';
  edgeSvg.appendChild(link);
  edges.push({ el: link, from: 'character', to: clients.id, path: link, custom: true });
  const all = Object.values(nodes).filter((n) => n.id);

  // per-scene resolved data
  const S = TL.map((s) => {
    const focus = s.focus === '*' ? all : s.focus.map(byLabel);
    const camNodes = s.focus === '*' ? all : [...focus, ...(s.cam || []).map(byLabel)];
    const xs = camNodes.flatMap((n) => [n.x, n.x + n.w]), ys = camNodes.flatMap((n) => [n.y, n.y + n.h]);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
    const withChar = focus.some((n) => n.id === 'character');
    // keep clear of chip, card and captions; a framed character needs extra room for its name tag
    const top = 130, bottom = withChar ? 200 : 170, left = 90, right = s.card ? 560 : 90;
    const z = Math.min((pane.width - left - right) / (bx1 - bx0), (pane.height - top - bottom) / (by1 - by0), 1.45);
    const cam = { cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2, z, ox: left + (pane.width - left - right) / 2, oy: top + (pane.height - top - bottom) / 2 };
    const hl = (s.edges || []).map(([a, b, color, dir]) => {
      const A = byLabel(a).id, B = byLabel(b).id;
      const e = edges.find((e) => e.from === A && e.to === B);
      if (!e) throw new Error(`no edge ${a} → ${b}`);
      return { e, color, rev: dir === 'rev' };
    });
    return { ...s, focusIds: new Set(focus.map((n) => n.id)), cam, hl };
  });

  // the character's mood timeline across the whole video
  const at = (s, ev) => s.lines[ev.line].start + (ev.delay || 0);
  const moodEv = [{ t: -1e9, mood: CFG.character.startMood || 'frustrated' }];
  for (const s of S) for (const m of s.char?.moods || []) moodEv.push({ t: at(s, m), mood: m.mood });
  moodEv.sort((a, b) => a.t - b.t);
  const consentHtml = (ok) => `<div class="consent"><div class="bar">🔒 auth.acme.example</div><div class="body">
    <div class="h">Sign in to Acme CRM</div>Your assistant wants to:<ul><li>Read contacts <code>crm:read</code></li>
    <li>Create and delete contacts <code>crm:write</code></li></ul><span class="btn ${ok ? 'ok' : ''}">${ok ? '✓ Approved' : 'Approve'}</span></div></div>`;

  // packets layer (in flow coordinates, inside the edges svg)
  const svg = document.querySelector('.react-flow__edges svg') || document.querySelector('.react-flow__edges');
  const NS = 'http://www.w3.org/2000/svg';
  const pkt = document.createElementNS(NS, 'g');
  svg.appendChild(pkt);
  const dots = [];
  const dot = (i) => {
    while (dots.length <= i) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '6');
      pkt.appendChild(c);
      dots.push(c);
    }
    return dots[i];
  };

  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const fade = (t, a, b, d = 0.4) => Math.max(0, Math.min(1, (t - a) / d, (b - t) / d));

  window.__render = (t) => {
    let i = S.findIndex((s) => t < s.end);
    if (i < 0) i = S.length - 1;
    const s = S[i], prev = S[Math.max(0, i - 1)];
    const k = i === 0 ? 1 : ease((t - s.start) / 1.3);

    // camera: interpolate center linearly and zoom in log space
    const z = Math.exp(lerp(Math.log(prev.cam.z), Math.log(s.cam.z), k));
    const cx = lerp(prev.cam.cx, s.cam.cx, k), cy = lerp(prev.cam.cy, s.cam.cy, k);
    const ox = lerp(prev.cam.ox, s.cam.ox, k), oy = lerp(prev.cam.oy, s.cam.oy, k);
    vp.style.transform = `translate(${ox - cx * z}px, ${oy - cy * z}px) scale(${z})`;

    // spotlight
    const ko = Math.min(1, (t - s.start) / 0.6);
    for (const n of all) {
      const was = prev.focusIds.has(n.id) ? 1 : 0.18, is = s.focusIds.has(n.id) ? 1 : 0.18;
      n.el.style.opacity = i === 0 ? is : lerp(was, is, ko);
    }
    if (nodes.__frame) nodes.__frame.el.style.opacity = s.focus === '*' ? 1 : 0.35;
    const hlSet = new Map(s.hl.map((h) => [h.e, h.color]));
    for (const e of edges) {
      const c = hlSet.get(e);
      e.el.style.opacity = c ? 1 : s.focus === '*' ? 0.9 : 0.12;
      e.path.style.stroke = c || (e.custom ? 'rgba(255,255,255,.25)' : '');
      e.path.style.strokeWidth = c ? '3px' : '';
      e.path.style.filter = c ? `drop-shadow(0 0 6px ${c})` : '';
    }

    // packets travelling along highlighted edges
    let di = 0;
    const local = t - s.start - 0.6;
    if (local > 0) {
      for (const { e, color, rev } of s.hl) {
        const L = e.path.getTotalLength();
        for (let j = 0; j < 2; j++) {
          const ph = ((local / 1.8) + j / 2) % 1;
          const p = e.path.getPointAtLength((rev ? 1 - ph : ph) * L);
          const c = dot(di++);
          c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
          c.setAttribute('fill', color);
          c.style.filter = `drop-shadow(0 0 6px ${color})`;
          c.style.opacity = String(Math.min(1, local / 0.4) * Math.min(1, ph * 6, (1 - ph) * 6));
        }
      }
    }
    for (; di < dots.length; di++) dots[di].style.opacity = '0';

    // character: expression, blink, bounce, and the popup (speech / consent / assistant reply)
    const mi = moodEv.reduce((acc, e, j) => (e.t <= t ? j : acc), 0);
    const mev = moodEv[mi], mk = ease((t - mev.t) / 0.6);
    const bt = t % 3.7, since = t - mev.t;
    const ch = s.char;
    const pops = ch?.pops || [];
    const pj = pops.reduce((acc, e, j) => (at(s, e) <= t ? j : acc), -1);
    let pop = { key: 'none', html: '', show: 0 };
    if (pj >= 0) {
      const e = pops[pj];
      const ok = e.kind === 'consent' && ch.approve && t >= at(s, ch.approve);
      const html = e.kind === 'consent' ? consentHtml(ok)
        : e.kind === 'assistant' ? `<div class="bubble assistant"><div class="who">✦ ${e.who || 'Assistant'}</div>${e.text}</div>`
        : `<div class="bubble">${e.text}</div>`;
      pop = { key: `${i}-${pj}-${ok}`, html, show: Math.max(0, Math.min(1, (t - at(s, e)) / 0.3, (s.end - 0.2 - t) / 0.3)) };
    }
    window.__character.render(person, {
      from: moodEv[Math.max(0, mi - 1)].mood, to: mev.mood, k: mi === 0 ? 1 : mk,
      blink: bt < 0.14 ? Math.sin((bt / 0.14) * Math.PI) : 0,
      bounce: mev.mood === 'happy' && since < 1.4 ? Math.abs(Math.sin(since * Math.PI * 2.2)) * 12 * (1 - since / 1.4) : 0,
      pop,
      popScale: Math.min(1.7, Math.max(1, 0.95 / z)), // keep pop-ups readable when the camera is zoomed out
    });

    // checklist card: items reveal with their narration line; the newest revealed ones are highlighted
    if (s.card) {
      if (card.dataset.scene !== String(i)) {
        card.dataset.scene = String(i);
        card.innerHTML = `<div class="t">${s.card.title}</div>` + s.card.items.map((it) => `<div class="i">${it.text}</div>`).join('');
      }
      const cur = s.lines.reduce((acc, l, li) => (t >= l.start - 0.15 ? li : acc), -1);
      [...card.querySelectorAll('.i')].forEach((el, j) => {
        const it = s.card.items[j];
        const shown = cur >= it.line;
        el.style.opacity = shown ? '1' : '0.28';
        el.classList.toggle('on', shown && it.line === cur);
      });
      card.style.opacity = String(Math.max(0, Math.min(1, (t - s.start - 0.6) / 0.5)));
    } else {
      card.style.opacity = '0';
      card.dataset.scene = '';
    }

    // overlays
    const line = s.lines.find((l) => t >= l.start - 0.15 && t < l.end + 0.3) || null;
    cap.textContent = line ? line.text : '';
    cap.style.opacity = line ? '1' : '0';
    chip.textContent = s.chip;
    chip.style.opacity = s.title ? '0' : String(Math.min(1, (t - s.start) / 0.4));
    title.style.opacity = s.title ? String(fade(t, -1, s.lines[1].start - 0.2, 0.6)) : '0';
    const sumO = s.summary ? Math.min(1, (t - s.start - 0.8) / 0.5) : 0;
    sum.style.opacity = String(Math.max(0, sumO));
    [...sum.children].forEach((el, j) => {
      const a = s.summary ? Math.max(0, Math.min(1, (t - s.lines[0].start - j * 0.55) / 0.3)) : 0;
      el.style.opacity = String(a);
      el.style.transform = `translateY(${(1 - a) * 10}px)`;
    });
  };
}, { TL: timeline, CFG: { title: cfg.title, summary: cfg.summary, character: cfg.character } });

if (STILLS) {
  const ts = STILLS === 'scenes' ? timeline.map((s) => (s.lines[0].start + s.lines[0].end) / 2) : STILLS.split(',').map(Number);
  mkdirSync(join(OUT_DIR, 'stills'), { recursive: true });
  for (const [j, t] of ts.entries()) {
    await page.evaluate((t) => window.__render(t), t);
    await page.screenshot({ path: join(OUT_DIR, 'stills', `still_${String(j).padStart(2, '0')}.png`) });
  }
  console.log(ts.map((t) => t.toFixed(1)).join(' '));
  await browser.close();
  process.exit(0);
}

// ── 4. capture frames → ffmpeg ────────────────────────────────────────────────
const cdp = await page.context().newCDPSession(page);
const frames = Math.min(Math.ceil(TOTAL * FPS), ONLY);
const out = join(OUT_DIR, `${id}.mp4`);
const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', join(OUT_DIR, 'narration.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
  '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.__render(t), f / FPS);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94 });
  if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 300 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('done →', out);
