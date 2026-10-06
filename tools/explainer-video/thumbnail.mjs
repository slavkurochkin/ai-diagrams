// Renders a YouTube thumbnail for a video: a 1280×720 JPEG in the video's folder. A dimmed frame from the video as
// the background, a huge short headline, the video's character large in the corner with a strong emotion, and a
// "hero" card: a sharp, tilted crop of the one moment that matters, with a red circle or ✗/✓ on the key detail,
// the series tag, and a yellow sticker.
//
//   node thumbnail.mjs <video-id> [--frame <seconds>]      → videos/<id>/thumbnail.jpg (committed with the video)
//   node thumbnail.mjs --all                              every video with a thumbnail block and a rendered mp4
//
// Uses the rendered video (out/<id>/<id>.mp4), or preview stills from its renderer if there isn't one. The scenario's `thumbnail` block:
//   thumbnail: {
//     text: 'Did the AI **make it up?**',   // 3–6 words; **word** = highlighted. Names the title's topic, doesn't repeat it
//     frame: 92,                            // seconds into the video: the hero (and, by default, the background)
//     crop: [485, 560, 560, 270],           // hero region in the 1920×1080 frame: x, y, width, height
//     mark: { circle: [10, 208, 380, 29], cross: [470, 222] },  // optional, in crop pixels: circle (x, y, w, h);
//                                           // cross / check: [x, y] for a red ✗ or green ✓ stamp
//     badge: 'Faithfulness 0.50',           // optional yellow sticker on the hero: one striking number or phrase
//     bg: 30,                               // optional: another moment for the background
//     mood: 'angry',                        // frustrated | neutral | curious | happy | surprised | angry | disappointed | suspicious
//     pose: 'hands-on-head',                // optional arms: hands-on-head | facepalm | thumbs-up | thinking
//     fx: 'anger',                          // optional effects: anger | question | exclaim | sparkles | tear
//   }
// YouTube draws the duration over the bottom-right corner: no text there (the hero card may run under it).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

const ids = args[0] === '--all'
  ? readdirSync(join(ROOT, 'videos')).filter((d) => existsSync(join(ROOT, 'videos', d, 'video.mjs')))
  : [args[0]];
if (!ids[0] || ids[0].startsWith('--')) {
  console.error('usage: node thumbnail.mjs <video-id> [--frame <seconds>] | --all');
  process.exit(1);
}

const characterJs = readFileSync(join(ROOT, 'character.js'), 'utf8');
const browser = await chromium.launch();
let failed = 0;

/**
 * One full-resolution frame of the video, as a data URL. Without a rendered mp4, asks the video's renderer for a
 * single preview still instead (needs the app running, like any still), so a thumbnail doesn't need a full render.
 */
function grab(id, cfg, mp4, at, path) {
  if (existsSync(mp4)) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', mp4, '-frames:v', '1', path]);
    return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
  }
  const renderer = cfg.setup?.app ? 'app.mjs' : 'render.mjs';
  execFileSync('node', [join(ROOT, renderer), id, '--stills', String(at)], { stdio: 'ignore' });
  return `data:image/png;base64,${readFileSync(join(ROOT, 'out', id, 'stills', 'still_00.png')).toString('base64')}`;
}

for (const id of ids) {
  const cfg = (await import(pathToFileURL(join(ROOT, 'videos', id, 'video.mjs')).href)).default;
  const th = cfg.thumbnail;
  const mp4 = join(ROOT, 'out', id, `${id}.mp4`);
  if (!th) { console.error(`${id}: no thumbnail block in video.mjs, skipped`); failed++; continue; }
  if (!existsSync(mp4)) console.log(`${id}: no rendered mp4, using preview stills`);

  const at = Number(flag('--frame') ?? th.frame ?? 5);
  const frame = grab(id, cfg, mp4, at, join(ROOT, 'out', id, 'thumbnail-frame.png'));
  const bg = th.bg === undefined ? frame : grab(id, cfg, mp4, th.bg, join(ROOT, 'out', id, 'thumbnail-bg.png'));

  // hero card: fit the crop into 760×330, bottom right
  const [cx, cy, cw, ch] = th.crop || [320, 120, 1280, 720];
  const scale = Math.min(760 / cw, 330 / ch);
  const hw = Math.round(cw * scale), hh = Math.round(ch * scale);
  const hx = 1210 - hw, hy = 368 + Math.round((330 - hh) / 2);
  const headline = th.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');

  let mark = '';
  if (th.mark?.circle) {
    const [x, y, w, h] = th.mark.circle.map((v) => v * scale);
    const pad = 12, tilt = w / h > 4 ? 1 : 3; // long thin rows get a flatter tilt, or the ellipse misses them
    const ex = x + w / 2, ey = y + h / 2;
    mark = `<svg class="mark" viewBox="0 0 ${hw} ${hh}" width="${hw}" height="${hh}">
      <ellipse cx="${ex}" cy="${ey}" rx="${w / 2 + pad}" ry="${h / 2 + pad}" fill="none" stroke="#ef4444" stroke-width="7" transform="rotate(${-tilt} ${ex} ${ey})"/>
      <ellipse cx="${ex + 4}" cy="${ey - 2}" rx="${w / 2 + pad + 6}" ry="${h / 2 + pad - 2}" fill="none" stroke="#ef4444" stroke-width="3.5" opacity=".7" transform="rotate(${tilt * 0.7} ${ex} ${ey})"/>
    </svg>`;
  }
  for (const kind of ['cross', 'check']) {
    if (!th.mark?.[kind]) continue;
    const [x, y] = th.mark[kind].map((v) => v * scale);
    mark += `<div class="stamp ${kind}" style="left:${x - 40}px; top:${y - 40}px">${kind === 'cross' ? '✗' : '✓'}</div>`;
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1280px; height: 720px; overflow: hidden; background: #0b1020; font-family: Geist, Inter, system-ui, -apple-system, sans-serif; }
    .bg { position: absolute; inset: 0; background: url(${bg}) 55% 30% / 125% auto no-repeat; filter: brightness(.5) saturate(1.15) blur(1.5px); }
    .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(5,8,18,.88) 0%, rgba(5,8,18,.55) 38%, rgba(5,8,18,.15) 75%); }
    .frame { position: absolute; inset: 0; border: 10px solid #fcd34d; opacity: .9; }
    .text { position: absolute; top: 44px; left: 400px; width: 830px; max-height: 300px; color: #fff; font-weight: 850;
      letter-spacing: -.02em; line-height: 1.02; text-shadow: 0 6px 24px rgba(0,0,0,.6); }
    .text em { font-style: normal; color: #fcd34d; }
    .hero { position: absolute; left: ${hx}px; top: ${hy}px; width: ${hw}px; height: ${hh}px; transform: rotate(-2.5deg);
      border: 5px solid #fff; border-radius: 14px; box-shadow: 0 22px 55px rgba(0,0,0,.6); background: url(${frame}) no-repeat;
      background-size: ${1920 * scale}px ${1080 * scale}px; background-position: ${-cx * scale}px ${-cy * scale}px; }
    .hero .mark { position: absolute; inset: 0; overflow: visible; }
    .hero .stamp { position: absolute; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 54px; font-weight: 900; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.45); border: 4px solid #fff; }
    .hero .stamp.cross { background: #dc2626; } .hero .stamp.check { background: #16a34a; }
    .tag { position: absolute; left: -5px; top: -36px; padding: 5px 12px; border-radius: 8px; background: rgba(8,11,20,.85); color: #fff;
      font-size: 16px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
    .badge { position: absolute; right: -24px; top: -34px; padding: 8px 20px; border-radius: 14px; background: #fde047; color: #111827;
      font-size: 38px; font-weight: 900; transform: rotate(4deg); box-shadow: 0 12px 30px rgba(0,0,0,.45); border: 4px solid #111827; white-space: nowrap; }
    .who { position: absolute; bottom: -150px; left: -40px; width: 260px; height: 380px; transform: scale(1.75); transform-origin: 0 100%; }
    #explainer-character .tag, #explainer-character .pop { display: none; }
  </style></head><body>
    <div class="bg"></div><div class="shade"></div>
    <div class="who" id="who"></div>
    <div class="hero">${mark}${cfg.title?.kicker ? `<div class="tag">${cfg.title.kicker}</div>` : ''}${th.badge ? `<div class="badge">${th.badge}</div>` : ''}</div>
    <div class="text">${headline}</div>
    <div class="frame"></div>
  </body></html>`);
  await page.addScriptTag({ content: characterJs });
  await page.evaluate(({ look, mood, pose, fx }) => {
    const c = window.__character;
    const person = c.mount(document.getElementById('who'), look);
    c.render(person, { from: mood, to: mood, k: 1, blink: 0, bounce: 0, pop: { key: 'none', html: '', show: 0 } });
    if (pose) c.pose(person, pose);
    if (fx) c.fx(person, fx);
    // fit the headline: largest size that stays inside its box (two lines at most, above the hero card)
    const t = document.querySelector('.text');
    for (let size = 104; size >= 56; size -= 4) {
      t.style.fontSize = `${size}px`;
      if (t.scrollHeight <= Math.min(290, size * 2.3) && t.scrollWidth <= 830) break;
    }
  }, { look: cfg.character?.look, mood: th.mood || cfg.character?.startMood || 'neutral', pose: th.pose, fx: th.fx });

  const out = join(ROOT, 'videos', id, 'thumbnail.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 90 });
  await page.close();
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`${id}: ${out} (${kb} KB${kb > 2000 ? ', over YouTube’s 2 MB limit' : ''})`);
}

await browser.close();
process.exit(failed && ids.length === 1 ? 1 : 0);
