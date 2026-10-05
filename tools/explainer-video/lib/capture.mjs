// Shared second half: stills or a full encode. `renderAt(t)` draws the frame for time t; renderers that drive a
// live app (actions with side effects) need times in increasing order, which both paths guarantee.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function capture(ctx, page, renderAt) {
  const { id, timeline, TOTAL, FPS, ONLY, STILLS, OUT_DIR } = ctx;
  const cdp = await page.context().newCDPSession(page);
  // the raw CDP capture ignores the page's device scale factor, so ask for the scaled size explicitly
  // (a 1280×720 layout at scale 1.5 → 1920×1080 frames; the diagram renderer is 1920×1080 at scale 1)
  const view = page.viewportSize();
  const scale = ctx.captureScale ?? 1;
  const clip = { x: 0, y: 0, width: view.width, height: view.height, scale };
  const shoot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, clip })).data, 'base64');

  if (STILLS) {
    const ts = STILLS === 'scenes' ? timeline.map((s) => (s.lines[0].start + s.lines[0].end) / 2) : STILLS.split(',').map(Number);
    mkdirSync(join(OUT_DIR, 'stills'), { recursive: true });
    const order = ts.map((t, j) => [t, j]).sort((a, b) => a[0] - b[0]);
    for (const [t, j] of order) {
      await renderAt(t);
      if (ctx.settleStills) { await page.waitForTimeout(ctx.settleStills); await renderAt(t); } // let a live app catch up
      await page.screenshot({ path: join(OUT_DIR, 'stills', `still_${String(j).padStart(2, '0')}.png`) });
    }
    console.log(ts.map((t) => t.toFixed(1)).join(' '));
    return;
  }

  const frames = Math.min(Math.ceil(TOTAL * FPS), ONLY);
  const out = join(OUT_DIR, `${id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', join(OUT_DIR, 'narration.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
    '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await renderAt(f / FPS);
    if (!ff.stdin.write(await shoot())) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('done →', out);
}
