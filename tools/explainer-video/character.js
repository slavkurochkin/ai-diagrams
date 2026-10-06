// The explainer's on-canvas character: an SVG person drawn in flow space, with blendable expressions,
// a speech bubble, an OAuth consent popup, and an assistant reply card. The look (hair, outfit, glasses,
// colors, name tag) is set per video; the default is Becky. Injected into the page before the director.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#1f2937';
  // default look is Becky; other characters override any of these
  const BECKY = {
    tag: 'Becky · Sales rep at Acme', hairStyle: 'long', hair: '#5b3427', skin: '#f6cfa9', neck: '#e3ad86', nose: '#d99873',
    outfit: 'blazer', top: '#0f766e', topShade: '#115e59', glasses: false, earrings: true,
  };

  // expression parameters; frames blend between these
  const MOODS = {
    frustrated: { browIn: 7, browOut: -3, eye: 0.75, smile: 0, mTop: -7, mBot: -5, corner: 4, blush: 0, sweat: 1 },
    neutral: { browIn: 0, browOut: 0, eye: 1, smile: 0, mTop: 0, mBot: 1.5, corner: 0, blush: 0, sweat: 0 },
    curious: { browIn: -5, browOut: -7, eye: 1.12, smile: 0, mTop: -1, mBot: 6, corner: 0, blush: 0.2, sweat: 0 },
    happy: { browIn: -4, browOut: -2, eye: 1, smile: 1, mTop: 3, mBot: 22, corner: -3, blush: 1, sweat: 0 },
    // stronger expressions, mostly for thumbnails
    surprised: { browIn: -13, browOut: -13, eye: 1.4, smile: 0, mTop: -10, mBot: 16, corner: 3, blush: 0, sweat: 0 },
    angry: { browIn: 14, browOut: -8, eye: 0.75, smile: 0, mTop: 0, mBot: 3, corner: 8, blush: 0, sweat: 0 },
    disappointed: { browIn: -7, browOut: 5, eye: 0.5, smile: 0, mTop: -2, mBot: 0, corner: 7, blush: 0, sweat: 0 },
    suspicious: { browIn: 6, browOut: 3, eye: 0.42, smile: 0, mTop: 1, mBot: 3, corner: 2, blush: 0, sweat: 0 },
  };

  const css = document.createElement('style');
  css.textContent = `
    #explainer-character { position: absolute; left: 0; top: 0; width: 260px; height: 380px; transform-origin: 0 0; pointer-events: none;
      font-family: Geist, Inter, system-ui, sans-serif; }
    #explainer-character .fig { position: absolute; left: 0; top: 0; width: 260px; height: 340px; transform-origin: 130px 340px; }
    #explainer-character .tag { position: absolute; left: 50%; top: 342px; transform: translateX(-50%); white-space: nowrap; padding: 7px 14px;
      border-radius: 999px; background: rgba(8,11,20,.92); border: 1px solid rgba(251,191,36,.5); color: #fcd34d; font-size: 16px; font-weight: 600; }
    #explainer-character .pop { position: absolute; left: -30px; bottom: calc(100% - 8px); width: 330px; transform-origin: 80px 100%; }
    #explainer-character .bubble { padding: 14px 18px; border-radius: 18px; background: #f8fafc; color: #0f172a; font-size: 19px; line-height: 1.35;
      box-shadow: 0 10px 30px rgba(0,0,0,.45); position: relative; }
    #explainer-character .bubble::after { content: ''; position: absolute; left: 120px; bottom: -12px; border: 12px solid transparent;
      border-bottom: 0; border-top-color: #f8fafc; }
    #explainer-character .bubble.assistant { background: #0f1b2d; color: #e2e8f0; border: 1px solid rgba(52,211,153,.6); }
    #explainer-character .bubble.assistant::after { border-top-color: #0f1b2d; }
    #explainer-character .bubble .who { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #34d399; margin-bottom: 6px; }
    #explainer-character .consent { border-radius: 14px; background: #fff; color: #0f172a; box-shadow: 0 14px 40px rgba(0,0,0,.5); overflow: hidden; }
    #explainer-character .consent .bar { background: #e2e8f0; color: #475569; font-size: 13px; padding: 7px 12px; font-family: ui-monospace, Menlo, monospace; }
    #explainer-character .consent .body { padding: 14px 16px 16px; font-size: 16px; line-height: 1.4; }
    #explainer-character .consent .h { font-size: 19px; font-weight: 700; margin-bottom: 6px; }
    #explainer-character .consent ul { margin: 6px 0 12px; padding-left: 18px; }
    #explainer-character .consent code { font: 600 13px ui-monospace, Menlo, monospace; color: #0369a1; }
    #explainer-character .consent .btn { display: inline-block; padding: 8px 18px; border-radius: 9px; background: #2563eb; color: #fff; font-weight: 600; }
    #explainer-character .consent .btn.ok { background: #059669; }
  `;
  document.head.appendChild(css);

  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };

  function mount(parent, look = {}) {
    const L = { ...BECKY, ...look };
    const HAIR = L.hair, SKIN = L.skin;
    const root = document.createElement('div');
    root.id = 'explainer-character';
    root.innerHTML = `<div class="pop"></div><div class="tag">${L.tag}</div>`;
    const svg = el('svg', { viewBox: '0 0 260 340', width: 260, height: 340, class: 'fig' });
    root.insertBefore(svg, root.firstChild);

    if (L.hairStyle === 'long') el('path', { d: 'M60,132 C52,58 208,58 200,132 L210,262 C182,276 78,276 50,262 Z', fill: HAIR }, svg); // hair, back
    // neck first, so the clothes cover its base; a band of shadow under the chin ties it to the head
    el('path', { d: 'M110,186 L150,186 L152,276 L108,276 Z', fill: L.neck }, svg);                                   // neck
    el('path', { d: 'M110,190 C122,214 138,214 150,190 L150,204 C138,224 122,224 110,204 Z', fill: 'rgba(0,0,0,.14)' }, svg); // chin shadow
    el('path', { d: 'M30,340 C30,266 76,244 130,244 C184,244 230,266 230,340 Z', fill: L.top }, svg);                 // torso
    if (L.outfit === 'blazer') {
      el('path', { d: 'M104,246 L130,294 L156,246 Z', fill: '#f8fafc' }, svg);                                      // shirt
      el('path', { d: 'M108,246 L130,272 L152,246 Z', fill: L.neck }, svg);                                         // neckline
      el('path', { d: 'M96,256 L130,330 L112,258 Z M164,256 L130,330 L148,258 Z', fill: L.topShade }, svg);         // lapels
    } else {
      el('path', { d: 'M94,254 C102,282 158,282 166,254 C156,262 104,262 94,254 Z', fill: L.topShade }, svg);       // hoodie collar, around the neck
      el('path', { d: 'M116,276 L112,316 M144,276 L148,316', stroke: '#f8fafc', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg); // strings
      el('circle', { cx: 112, cy: 318, r: 3.5, fill: '#f8fafc' }, svg);
      el('circle', { cx: 148, cy: 318, r: 3.5, fill: '#f8fafc' }, svg);
    }
    el('circle', { cx: 73, cy: 146, r: 11, fill: SKIN }, svg);                                                       // ears
    el('circle', { cx: 187, cy: 146, r: 11, fill: SKIN }, svg);
    if (L.earrings) {
      el('circle', { cx: 73, cy: 160, r: 3.5, fill: '#fbbf24' }, svg);                                               // earrings
      el('circle', { cx: 187, cy: 160, r: 3.5, fill: '#fbbf24' }, svg);
    }
    el('ellipse', { cx: 130, cy: 140, rx: 58, ry: 66, fill: SKIN }, svg);                                             // head
    if (L.hairStyle === 'long') {
      el('path', { d: 'M71,134 C66,76 112,58 142,64 C178,70 198,98 190,136 C180,110 160,96 136,92 C118,108 94,120 71,134 Z', fill: HAIR }, svg); // bangs
    } else {
      // short curly hair: a cap plus a row of curls along the hairline
      el('path', { d: 'M72,128 C64,66 110,52 134,54 C176,56 200,90 189,128 C182,104 170,96 156,94 C132,98 100,98 80,112 Z', fill: HAIR }, svg);
      for (const [cx, cy, r] of [[78, 112, 13], [92, 90, 15], [112, 74, 16], [136, 68, 16], [160, 76, 15], [178, 94, 14], [186, 116, 11]]) {
        el('circle', { cx, cy, r, fill: HAIR }, svg);
      }
    }
    const cheekL = el('ellipse', { cx: 100, cy: 166, rx: 11, ry: 7, fill: '#f472b6' }, svg);
    const cheekR = el('ellipse', { cx: 160, cy: 166, rx: 11, ry: 7, fill: '#f472b6' }, svg);
    const eyeL = el('ellipse', { cx: 110, cy: 144, rx: 6, ry: 7, fill: INK }, svg);
    const eyeR = el('ellipse', { cx: 150, cy: 144, rx: 6, ry: 7, fill: INK }, svg);
    const arcL = el('path', { d: 'M101,147 Q110,136 119,147', stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, svg);
    const arcR = el('path', { d: 'M141,147 Q150,136 159,147', stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, svg);
    const browL = el('path', { stroke: HAIR, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, svg);
    const browR = el('path', { stroke: HAIR, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, svg);
    el('path', { d: 'M130,152 Q125,163 132,165', stroke: L.nose, 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, svg); // nose
    const mouth = el('path', { fill: '#9f1239', stroke: '#7c2d12', 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    if (L.glasses) {
      for (const cx of [110, 150]) el('circle', { cx, cy: 144, r: 15, fill: 'rgba(255,255,255,.08)', stroke: '#111827', 'stroke-width': 3.5 }, svg);
      el('path', { d: 'M125,142 Q130,138 135,142 M95,141 L78,136 M165,141 L182,136', stroke: '#111827', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, svg);
    }
    const sweat = el('path', { d: 'M190,92 C183,104 183,111 190,113 C197,111 197,104 190,92 Z', fill: '#7dd3fc' }, svg);

    root._look = L;
    root._parts = { svg, cheekL, cheekR, eyeL, eyeR, arcL, arcR, browL, browR, mouth, sweat, pop: root.querySelector('.pop') };
    parent.appendChild(root);
    return root;
  }

  const mix = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key] + (b[key] - a[key]) * k]));

  // state: { from, to, k, blink (0..1 closed), bounce (px), pop: {kind, html, show} }
  function render(root, st) {
    const p = root._parts;
    const m = mix(MOODS[st.from], MOODS[st.to], st.k);
    const open = m.eye * (1 - st.blink);
    p.eyeL.setAttribute('ry', Math.max(0.6, 7 * open));
    p.eyeR.setAttribute('ry', Math.max(0.6, 7 * open));
    p.eyeL.style.opacity = p.eyeR.style.opacity = String(1 - m.smile);
    p.arcL.style.opacity = p.arcR.style.opacity = String(m.smile);
    const by = 120;
    p.browL.setAttribute('d', `M94,${by + m.browOut} Q106,${by - 4 + (m.browIn + m.browOut) / 2} 120,${by + m.browIn}`);
    p.browR.setAttribute('d', `M166,${by + m.browOut} Q154,${by - 4 + (m.browIn + m.browOut) / 2} 140,${by + m.browIn}`);
    const my = 182 + m.corner;
    p.mouth.setAttribute('d', `M113,${my} Q130,${182 + 2 * m.mTop} 147,${my} Q130,${182 + 2 * m.mBot} 113,${my} Z`);
    p.cheekL.style.opacity = p.cheekR.style.opacity = String(0.45 * m.blush);
    p.sweat.style.opacity = String(m.sweat);
    p.svg.style.transform = `translateY(${-st.bounce}px)`;

    if (p.pop.dataset.key !== st.pop.key) {
      p.pop.dataset.key = st.pop.key;
      p.pop.innerHTML = st.pop.html;
    }
    p.pop.style.opacity = String(st.pop.show);
    p.pop.style.transform = `scale(${(st.popScale || 1) * (0.9 + 0.1 * st.pop.show)})`;
  }

  // Arm poses, drawn over the figure (thumbnails): the figure has no arms otherwise.
  const POSES = {
    'hands-on-head': [ // pulling their hair
      { arm: 'M58,312 C26,250 30,188 66,150', hand: [62, 138, 18] },
      { arm: 'M202,312 C234,250 230,188 194,150', hand: [198, 138, 18] },
    ],
    facepalm: [{ arm: 'M206,312 C228,250 204,186 156,130', hand: [142, 126, 0], palm: true }],
    'thumbs-up': [{ arm: 'M212,318 C236,292 230,262 210,252', hand: [204, 246, 18], thumb: true }],
    thinking: [{ arm: 'M204,316 C218,266 190,236 152,218', hand: [142, 212, 16] }],
  };

  function pose(root, name) {
    const parts = POSES[name];
    if (!parts) return;
    const L = root._look, svg = root._parts.svg;
    svg.style.overflow = 'visible';
    for (const p of parts) {
      el('path', { d: p.arm, stroke: L.topShade, 'stroke-width': 34, fill: 'none', 'stroke-linecap': 'round' }, svg);
      el('path', { d: p.arm, stroke: L.top, 'stroke-width': 28, fill: 'none', 'stroke-linecap': 'round' }, svg);
      const [cx, cy, r] = p.hand;
      if (p.palm) el('ellipse', { cx, cy, rx: 30, ry: 19, fill: L.skin, stroke: L.nose, 'stroke-width': 2, transform: `rotate(-12 ${cx} ${cy})` }, svg);
      else el('circle', { cx, cy, r, fill: L.skin, stroke: L.nose, 'stroke-width': 2 }, svg);
      if (p.thumb) el('rect', { x: cx - 6, y: cy - 40, width: 12, height: 30, rx: 6, fill: L.skin, stroke: L.nose, 'stroke-width': 2 }, svg);
    }
    if (name === 'hands-on-head') { // a few strands pulled loose
      for (const d of ['M54,118 C40,96 48,80 36,64', 'M70,112 C64,90 74,78 66,60', 'M206,118 C220,96 212,80 224,64', 'M190,112 C196,90 186,78 194,60']) {
        el('path', { d, stroke: L.hair, 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, svg);
      }
    }
  }

  // Effects around the head (thumbnails).
  function fx(root, names) {
    const svg = root._parts.svg;
    svg.style.overflow = 'visible';
    const text = (x, y, size, fill, str, rot = 0) => {
      const t = el('text', { x, y, 'font-size': size, 'font-weight': 900, fill, stroke: '#0b1020', 'stroke-width': 3, 'paint-order': 'stroke',
        'font-family': 'Geist, Inter, system-ui, sans-serif', transform: `rotate(${rot} ${x} ${y})` }, svg);
      t.textContent = str;
    };
    for (const n of [].concat(names || [])) {
      if (n === 'anger') {
        el('ellipse', { cx: 130, cy: 140, rx: 58, ry: 66, fill: 'rgba(239,68,68,.22)' }, svg); // red face
        for (const d of ['M50,56 Q60,68 72,60', 'M76,52 Q66,64 76,76', 'M52,82 Q62,72 72,84', 'M46,60 Q58,70 48,82']) { // top-left, clear of text on the right
          el('path', { d, stroke: '#ef4444', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, svg);
        }
      }
      if (n === 'question') { text(96, 56, 74, '#fcd34d', '?', -10); text(150, 34, 50, '#fcd34d', '?', 12); } // above the head
      if (n === 'exclaim') { text(108, 50, 84, '#f87171', '!', -8); text(150, 36, 60, '#f87171', '!', 10); }
      if (n === 'sparkles') for (const [x, y, s] of [[150, 40, 46], [40, 80, 34], [96, 30, 28]]) text(x, y, s, '#fcd34d', '✦');
      if (n === 'tear') el('path', { d: 'M158,156 C152,168 152,176 158,178 C164,176 164,168 158,156 Z', fill: '#7dd3fc' }, svg);
    }
  }

  window.__character = { mount, render, pose, fx, MOODS };
})();
