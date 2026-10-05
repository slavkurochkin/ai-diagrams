// Shared first half of every renderer: load the scenario, synthesize narration (cached per line), build the
// timeline, write transcript.md and youtube.md, and mix the narration track. Returns everything a renderer needs.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function prepare(usage) {
  const [id, ...rest] = process.argv.slice(2);
  const flag = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  const VIDEO_DIR = join(ROOT, 'videos', id || '');
  if (!id || !existsSync(join(VIDEO_DIR, 'video.mjs'))) {
    console.error(`usage: node ${usage} <video-id> [--stills scenes|t1,t2,…] [--frames N] [--meta]`);
    process.exit(1);
  }
  const OUT_DIR = join(ROOT, 'out', id);
  const KOKORO_DIR = join(ROOT, '.cache', 'kokoro');
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

  return { id, rest, flag, cfg, scenes, timeline, TOTAL, FPS, W, H, ONLY, STILLS, OUT_DIR, VIDEO_DIR, mmss };
}
