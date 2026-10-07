// In-page storytelling layer for hands-on episodes, drawn over a real app: captions, chapter chip, checklist
// card, title and summary cards, the character picture-in-picture (via character.js), a fake cursor with
// click ripples, highlight rings with optional dimming, and a terminal panel. Layout units are CSS px of a
// 1280×720 viewport (captured at 1.5×).
(() => {
  const css = document.createElement('style');
  css.textContent = `
    #ov-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; font-family: Geist, Inter, system-ui, sans-serif; }
    #ov-root > * { position: absolute; }
    #ov-cap { left: 50%; bottom: 14px; transform: translateX(-50%); max-width: 820px; width: max-content; padding: 11px 20px;
      border-radius: 11px; background: rgba(8,11,20,.9); color: #f1f5f9; font: 500 17px/1.4 Geist, Inter, system-ui, sans-serif;
      text-align: center; box-shadow: 0 8px 28px rgba(0,0,0,.35); }
    #ov-chip { left: 14px; top: 66px; padding: 6px 12px; border-radius: 999px; background: rgba(8,11,20,.88);
      border: 1px solid rgba(251,191,36,.6); color: #fcd34d; font: 600 13px/1 Geist, Inter, system-ui, sans-serif; }
    #ov-card { top: 66px; width: 340px; padding: 14px 15px 8px; border-radius: 13px; background: rgba(8,11,20,.94);
      border: 1px solid rgba(255,255,255,.14); box-shadow: 0 10px 34px rgba(0,0,0,.4); color: #cbd5e1; }
    #ov-card .t { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #fcd34d; margin-bottom: 8px; }
    #ov-card .i { font-size: 13.5px; line-height: 1.4; padding: 6px 9px; margin-bottom: 6px; border-radius: 8px; border: 1px solid transparent; }
    #ov-card .i.on { background: rgba(251,191,36,.12); border-color: rgba(251,191,36,.5); color: #f8fafc; }
    #ov-card b { color: #fff; } #ov-card code { font: 500 12px ui-monospace, Menlo, monospace; color: #fde68a; }
    #ov-title { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, rgba(8,11,20,.95) 0%, rgba(8,11,20,.85) 65%, rgba(8,11,20,.7) 100%); color: #fff; }
    #ov-title .k { font-size: 14px; letter-spacing: .25em; text-transform: uppercase; color: #fcd34d; margin-bottom: 12px; }
    #ov-title .h { font-size: 50px; font-weight: 700; letter-spacing: -.02em; }
    #ov-title .s { font-size: 18px; color: #94a3b8; margin-top: 10px; }
    #ov-sum { left: 0; right: 0; top: 90px; display: flex; justify-content: center; gap: 10px; }
    #ov-sum span { padding: 9px 15px; border-radius: 10px; background: rgba(8,11,20,.92); border: 1px solid rgba(251,191,36,.55);
      color: #fcd34d; font: 600 18px/1 Geist, Inter, system-ui, sans-serif; }
    #ov-pip { left: 6px; bottom: 6px; width: 260px; height: 380px; transform: scale(.48); transform-origin: 0 100%; }
    #ov-pip #explainer-character { position: relative; }
    #ov-pip #explainer-character .pop { left: 150px; }   /* open to the right, away from the screen edge */
    #ov-pip #explainer-character .bubble::after { left: 24px; }
    #ov-hl { inset: 0; }
    #ov-hl .ring { position: absolute; border: 3px solid #fbbf24; border-radius: 10px; box-shadow: 0 0 14px rgba(251,191,36,.7); }
    #ov-hl .ring.dim { box-shadow: 0 0 14px rgba(251,191,36,.7), 0 0 0 3000px rgba(8,11,20,.42); }
    #ov-hl .tag { position: absolute; left: -3px; bottom: calc(100% + 6px); white-space: nowrap; padding: 4px 9px; border-radius: 7px;
      background: #fbbf24; color: #1c1917; font: 700 12px/1.2 Geist, Inter, system-ui, sans-serif; }
    #ov-cursor { width: 22px; height: 22px; left: 0; top: 0; }
    #ov-ripple { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(251,191,36,.9); }
    #ov-term { border-radius: 11px; background: #0b1020; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 14px 44px rgba(0,0,0,.5); overflow: hidden; }
    #ov-term .bar { height: 26px; background: #1e2433; display: flex; align-items: center; gap: 6px; padding: 0 10px; }
    #ov-term .bar i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    #ov-term .bar span { margin-left: 8px; color: #94a3b8; font: 500 11px ui-monospace, Menlo, monospace; }
    #ov-term pre { margin: 0; padding: 10px 12px; height: calc(100% - 26px); overflow: hidden; color: #e2e8f0;
      font: 400 12.5px/1.45 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    #ov-term .p { color: #34d399; } #ov-term .c { color: #f8fafc; font-weight: 600; } #ov-term .o { color: #cbd5e1; }
    #ov-term .caret { display: inline-block; width: 7px; height: 14px; background: #e2e8f0; vertical-align: -2px; }
  `;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'ov-root';
  document.body.appendChild(root);
  const mk = (id, html = '') => { const d = document.createElement('div'); d.id = id; d.innerHTML = html; root.appendChild(d); return d; };

  let TL, CFG, els, person, moodEv;
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const at = (s, e) => s.lines[e.line].start + (e.delay || 0);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function init(tl, cfg) {
    TL = tl; CFG = cfg;
    const hl = mk('ov-hl');
    const term = mk('ov-term', '<div class="bar"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i><span></span></div><pre></pre>');
    term.querySelector('.bar span').textContent = cfg.terminalTitle || '~/acme-crm-mcp';
    const card = mk('ov-card');
    const pip = mk('ov-pip');
    const cap = mk('ov-cap'), chip = mk('ov-chip');
    const title = mk('ov-title', `<div class="k">${cfg.title.kicker}</div><div class="h">${cfg.title.heading}</div><div class="s">${cfg.title.sub}</div>`);
    const sum = mk('ov-sum', cfg.summary.map((w) => `<span>${w}</span>`).join(''));
    const ripple = mk('ov-ripple');
    const cursor = mk('ov-cursor', '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.3 20.3 L11.2 13.7 L17.5 13.7 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>');
    els = { hl, term, card, pip, cap, chip, title, sum, cursor, ripple };
    person = window.__character.mount(pip, cfg.character.look);
    moodEv = [{ t: -1e9, mood: cfg.character.startMood || 'neutral' }];
    for (const s of TL) for (const m of s.char?.moods || []) moodEv.push({ t: at(s, m), mood: m.mood });
    moodEv.sort((a, b) => a.t - b.t);
  }

  function render(d) {
    const { t } = d;
    let i = TL.findIndex((s) => t < s.end);
    if (i < 0) i = TL.length - 1;
    const s = TL[i];

    // captions, chip, title, summary
    const line = s.lines.find((l) => t >= l.start - 0.15 && t < l.end + 0.3) || null;
    els.cap.textContent = line ? line.text : '';
    els.cap.style.opacity = line ? '1' : '0';
    els.chip.textContent = s.chip;
    els.chip.style.opacity = s.title ? '0' : String(Math.min(1, (t - s.start) / 0.4));
    const fade = (a, b, dd = 0.5) => Math.max(0, Math.min(1, (t - a) / dd, (b - t) / dd));
    els.title.style.opacity = s.title ? String(fade(-1, (s.lines[1] ?? s.lines[0]).start - 0.2)) : '0';
    els.sum.style.opacity = s.summary ? String(Math.min(1, Math.max(0, (t - s.start - 0.6) / 0.5))) : '0';
    [...els.sum.children].forEach((el, j) => {
      const a = s.summary ? Math.max(0, Math.min(1, (t - s.lines[0].start - j * 0.55) / 0.3)) : 0;
      el.style.opacity = String(a);
      el.style.transform = `translateY(${(1 - a) * 8}px)`;
    });

    // card: items light up with their narration line
    if (s.card) {
      if (els.card.dataset.scene !== String(i)) {
        els.card.dataset.scene = String(i);
        els.card.innerHTML = `<div class="t">${s.card.title}</div>` + s.card.items.map((it) => `<div class="i">${it.text}</div>`).join('');
        const left = s.cardPos === 'left' || s.cardPos === 'bottomleft';
        els.card.style.left = left ? (s.cardPos === 'bottomleft' ? '150px' : '14px') : 'auto';
        els.card.style.right = left ? 'auto' : '14px';
        els.card.style.top = s.cardPos === 'bottomleft' ? 'auto' : `${s.cardTop ?? 66}px`;
        els.card.style.bottom = s.cardPos === 'bottomleft' ? '70px' : 'auto';
      }
      const cur = s.lines.reduce((acc, l, li) => (t >= l.start - 0.15 ? li : acc), -1);
      [...els.card.querySelectorAll('.i')].forEach((el, j) => {
        const it = s.card.items[j];
        el.style.opacity = cur >= it.line ? '1' : '0.3';
        el.classList.toggle('on', cur >= it.line && it.line === cur);
      });
      const from = s.cardFrom === undefined ? s.start + 0.4 : at(s, { line: s.cardFrom });
      els.card.style.opacity = String(Math.max(0, Math.min(1, (t - from) / 0.4)));
    } else {
      els.card.style.opacity = '0';
      els.card.dataset.scene = '';
    }

    // character: mood blend, blink, bounce, pop-ups
    const mi = moodEv.reduce((acc, e, j) => (e.t <= t ? j : acc), 0);
    const mev = moodEv[mi], since = t - mev.t, bt = t % 3.7;
    const pops = s.char?.pops || [];
    const pj = pops.reduce((acc, e, j) => (at(s, e) <= t ? j : acc), -1);
    let pop = { key: 'none', html: '', show: 0 };
    if (pj >= 0) {
      const e = pops[pj];
      const html = e.kind === 'assistant' ? `<div class="bubble assistant"><div class="who">✦ ${e.who || 'Assistant'}</div>${e.text}</div>` : `<div class="bubble">${e.text}</div>`;
      // until: a line index at which the pop closes (default: the end of the scene)
      const end = e.until !== undefined && e.until < s.lines.length ? at(s, { line: e.until }) : s.end;
      pop = { key: `${i}-${pj}`, html, show: Math.max(0, Math.min(1, (t - at(s, e)) / 0.3, (end - 0.2 - t) / 0.3)) };
    }
    window.__character.render(person, {
      from: moodEv[Math.max(0, mi - 1)].mood, to: mev.mood, k: mi === 0 ? 1 : ease(since / 0.6),
      blink: bt < 0.14 ? Math.sin((bt / 0.14) * Math.PI) : 0,
      bounce: mev.mood === 'happy' && since < 1.4 ? Math.abs(Math.sin(since * Math.PI * 2.2)) * 12 * (1 - since / 1.4) : 0,
      pop, popScale: 1.75,
    });
    els.pip.style.opacity = s.title ? '0' : '1';

    // highlights
    els.hl.innerHTML = d.rects.map((r) => {
      const pad = 5, grow = Math.min(1, r.since / 0.35);
      return `<div class="ring ${r.dim ? 'dim' : ''}" style="left:${r.x - pad}px;top:${r.y - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;opacity:${grow};transform:scale(${1.08 - 0.08 * grow})">${r.label ? `<div class="tag">${r.label}</div>` : ''}</div>`;
    }).join('');

    // cursor + click ripple
    els.cursor.style.transform = `translate(${d.cursor.x - 3}px, ${d.cursor.y - 2}px)`;
    els.cursor.style.opacity = s.title || CFG.hideCursor || (CFG.hideCursorOnTerminal && s.terminal) ? '0' : '1';
    els.ripple.style.transform = `translate(${d.cursor.x - 17}px, ${d.cursor.y - 17}px) scale(${d.clickPulse ? 1 : 0.4})`;
    els.ripple.style.opacity = d.clickPulse ? '1' : '0';

    // terminal panel
    const term = s.terminal;
    if (term) {
      const pos = term.pos || 'right';
      const box = pos === 'full' ? { left: 150, top: 100, width: 980, height: 460 }
        : pos === 'wide' ? { left: 14, top: 100, width: 862, height: 420 } // beside a right-hand card
        : pos === 'left' ? { left: 14, top: 100, width: 600, height: 380 } : { left: 666, top: 100, width: 600, height: 380 };
      Object.assign(els.term.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      const parts = d.terminal.lines.map((l) => `<span class="p">$</span> <span class="c">${esc(l.cmd)}</span>\n${l.output ? `<span class="o">${esc(l.output)}</span>\n` : ''}`);
      if (d.terminal.typing) {
        const ty = d.terminal.typing;
        parts.push(`<span class="p">$</span> <span class="c">${esc(ty.cmd)}</span>${ty.output === null ? '<span class="caret"></span>' : `\n<span class="o">${esc(ty.output)}</span>\n`}`);
      } else parts.push('<span class="p">$</span> <span class="caret"></span>');
      const pre = els.term.querySelector('pre');
      pre.innerHTML = parts.join('');
      pre.scrollTop = pre.scrollHeight;
      els.term.style.opacity = String(Math.min(1, (t - s.start) / 0.3));
    } else {
      els.term.style.opacity = '0';
    }
  }

  window.__overlay = { init, render };
})();
