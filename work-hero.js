/* Work screen hero ("Hi, I'm Shruti Tomar" -> "A Product & UX Designer" + subtext), centred on the screen,
   with a scatter of draggable desk objects around the first line.
   Shared by the full-screen Work view (HTML) and the desk monitor texture in the apartment (canvas),
   so both use the same sizes and positions and the hand-off between them is seamless. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LINES = ['Hi, I’m Shruti Tomar', 'A Product & UX Designer'];
  const SUB = '2 years of designing simple experiences for complex problems, now prototyping them with AI.';

  // Layout of the hero block for a W x H screen, vertically centred.
  function box(W, H) {
    const phone = W < 600;
    const fs = Math.round(phone ? clamp(W * 0.072, 22, 34) : clamp(W * 0.056, 40, 84));
    const sub = Math.round(clamp(W * 0.0132, 15, 20));
    const lineH = Math.round(fs * 1.25), gap = Math.round(fs * 0.26), subMax = Math.round(Math.min(W - 48, sub * 34));
    const blockH = lineH + gap + sub * 1.5 * 2;
    const top = Math.round(H / 2 - blockH / 2);
    return { fs, sub, top, lineH, gap, subMax, blockH };
  }

  /* ---------- desk objects (hand-drawn SVG, warm room palette) ---------- */
  const SVG = (vb, body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">' + body + '</svg>';
  const ITEMS = [
    { id: 'album', label: 'Record and album sleeve', w: 210, h: 152, fx: 0.2, fy: 0.25, rot: -6, phone: true, svg: SVG('0 0 220 160',
      '<rect x="4" y="6" width="148" height="148" rx="3" fill="#7d9474"/><rect x="4" y="6" width="148" height="148" rx="3" fill="none" stroke="#5f7657" stroke-width="2"/>' +
      '<circle cx="62" cy="70" r="34" fill="#e9b45a"/><path d="M4 118 C40 96 80 128 152 100 L152 154 L4 154 Z" fill="#4f6548"/><path d="M4 132 C50 116 96 142 152 124 L152 154 L4 154Z" fill="#3e5239"/>' +
      '<rect x="16" y="20" width="58" height="6" rx="3" fill="#f6efe2"/><rect x="16" y="31" width="36" height="4" rx="2" fill="#f6efe2" opacity="0.8"/>' +
      '<circle cx="150" cy="80" r="70" fill="#1c1a18"/>' +
      '<circle cx="150" cy="80" r="62" fill="none" stroke="#2c2926" stroke-width="1.4"/><circle cx="150" cy="80" r="54" fill="none" stroke="#2c2926" stroke-width="1.4"/><circle cx="150" cy="80" r="46" fill="none" stroke="#2c2926" stroke-width="1.4"/><circle cx="150" cy="80" r="38" fill="none" stroke="#2c2926" stroke-width="1.4"/>' +
      '<path d="M104 46 A60 60 0 0 1 150 22" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round"/><path d="M196 114 A60 60 0 0 1 170 134" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="150" cy="80" r="22" fill="#c8553d"/><circle cx="150" cy="80" r="15" fill="none" stroke="#f6efe2" stroke-opacity="0.55" stroke-width="1.5"/><rect x="138" y="70" width="24" height="3" rx="1.5" fill="#f6efe2" opacity="0.8"/><circle cx="150" cy="80" r="3" fill="#f6efe2"/>') },
    { id: 'coffee', label: 'Coffee mug and croissant', w: 220, h: 138, fx: 0.79, fy: 0.25, rot: 0, phone: true, svg: SVG('0 0 240 150',
      '<ellipse cx="66" cy="136" rx="62" ry="10" fill="#e7ddcc"/>' +
      '<path d="M114 58 C146 58 146 104 110 104" fill="none" stroke="#a9563a" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M20 40 L112 40 L106 124 Q104 136 92 136 L40 136 Q28 136 26 124 Z" fill="#c4683f"/>' +
      '<path d="M26 60 L110 60 L109 72 L27 72 Z" fill="#b25c37" opacity="0.6"/><path d="M34 48 L42 126" stroke="#e08a5f" stroke-width="5" stroke-linecap="round" opacity="0.45"/>' +
      '<ellipse cx="66" cy="40" rx="46" ry="10" fill="#d47a4f"/><ellipse cx="66" cy="41" rx="40" ry="7.5" fill="#4a2c1d"/><ellipse cx="62" cy="40" rx="20" ry="3.4" fill="#a8774f" opacity="0.8"/>' +
      '<path d="M54 30 C48 22 60 18 54 8 M72 30 C66 20 80 16 72 4" fill="none" stroke="#bfb3a3" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>' +
      '<g transform="translate(176 102) rotate(-12)">' +
      '<path d="M-58 8 C-62 -10 -40 -20 -32 -12 C-26 -34 26 -34 32 -12 C40 -20 62 -10 58 8 C50 22 -50 22 -58 8 Z" fill="#d99a4e"/>' +
      '<path d="M-32 -12 C-28 6 -26 16 -22 20 M32 -12 C28 6 26 16 22 20 M-12 -28 C-10 -6 -8 10 -6 21 M12 -28 C10 -6 8 10 6 21" fill="none" stroke="#a96a2a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-24 -26 C-8 -32 8 -32 24 -26" fill="none" stroke="#f0c27e" stroke-width="4" stroke-linecap="round" opacity="0.8"/></g>') },
    { id: 'headphones', label: 'Headphones', w: 150, h: 142, fx: 0.08, fy: 0.5, rot: -10, phone: false, svg: SVG('0 0 180 170',
      '<path d="M30 112 C22 40 64 14 90 14 C116 14 158 40 150 112" fill="none" stroke="#2a2725" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M44 92 C42 50 66 30 90 30 C114 30 138 50 136 92" fill="none" stroke="#8a9e80" stroke-width="7" stroke-linecap="round"/>' +
      '<rect x="12" y="94" width="44" height="68" rx="20" fill="#3a3633"/><rect x="40" y="100" width="18" height="56" rx="9" fill="#1f1d1b"/><rect x="18" y="104" width="8" height="40" rx="4" fill="#ffffff" opacity="0.12"/>' +
      '<rect x="124" y="94" width="44" height="68" rx="20" fill="#3a3633"/><rect x="122" y="100" width="18" height="56" rx="9" fill="#1f1d1b"/><rect x="154" y="104" width="8" height="40" rx="4" fill="#ffffff" opacity="0.12"/>') },
    { id: 'guitar', label: 'Acoustic guitar', w: 108, h: 290, fx: 0.92, fy: 0.56, rot: 12, phone: false, svg: SVG('0 0 120 320',
      '<rect x="50" y="8" width="20" height="34" rx="5" fill="#4a2f1c"/><g fill="#d8cfc0"><circle cx="46" cy="16" r="4"/><circle cx="46" cy="28" r="4"/><circle cx="74" cy="16" r="4"/><circle cx="74" cy="28" r="4"/></g>' +
      '<rect x="53" y="40" width="14" height="140" fill="#5a3a22"/>' +
      '<g stroke="#c9b48e" stroke-width="1.2"><path d="M53 58H67M53 74H67M53 89H67M53 103H67M53 116H67M53 128H67M53 139H67M53 149H67"/></g>' +
      '<path d="M60 150 C24 150 18 176 30 196 C14 206 2 230 8 262 C16 300 46 312 60 312 C74 312 104 300 112 262 C118 230 106 206 90 196 C102 176 96 150 60 150 Z" fill="#c98b4f"/>' +
      '<path d="M60 156 C30 156 26 178 36 196 C22 206 12 230 16 258 C22 292 48 304 60 304 C72 304 98 292 104 258 C108 230 98 206 84 196 C94 178 90 156 60 156 Z" fill="#dba468"/>' +
      '<circle cx="60" cy="214" r="17" fill="#2a1d14"/><circle cx="60" cy="214" r="21" fill="none" stroke="#7a4a28" stroke-width="3"/>' +
      '<rect x="44" y="262" width="32" height="8" rx="3" fill="#4a2f1c"/>' +
      '<g stroke="#efe6d6" stroke-width="0.8" opacity="0.9"><path d="M55.5 26V266M58.5 26V266M61.5 26V266M64.5 26V266"/></g>') },
    { id: 'plant', label: 'Potted plant', w: 128, h: 164, fx: 0.11, fy: 0.8, rot: 0, phone: true, svg: SVG('0 0 140 180',
      '<path d="M70 108 C66 80 58 62 40 46 M70 108 C72 78 80 56 100 40 M70 108 C70 80 70 50 68 22 M70 108 C60 92 44 86 26 84 M70 108 C82 94 98 90 116 90" fill="none" stroke="#5a7a4c" stroke-width="3" stroke-linecap="round"/>' +
      '<g fill="#6f8f5e"><ellipse cx="38" cy="44" rx="16" ry="10" transform="rotate(-35 38 44)"/><ellipse cx="102" cy="38" rx="16" ry="10" transform="rotate(30 102 38)"/><ellipse cx="68" cy="20" rx="10" ry="16"/></g>' +
      '<g fill="#87a874"><ellipse cx="24" cy="84" rx="16" ry="10" transform="rotate(10 24 84)"/><ellipse cx="118" cy="90" rx="16" ry="10" transform="rotate(-10 118 90)"/><ellipse cx="52" cy="62" rx="13" ry="8" transform="rotate(-50 52 62)"/><ellipse cx="88" cy="58" rx="13" ry="8" transform="rotate(45 88 58)"/></g>' +
      '<g fill="#a5c08f" opacity="0.7"><ellipse cx="66" cy="16" rx="3" ry="8"/><ellipse cx="36" cy="42" rx="7" ry="3" transform="rotate(-35 36 42)"/></g>' +
      '<path d="M30 112 L110 112 L100 172 Q99 178 92 178 L48 178 Q41 178 40 172 Z" fill="#c4704a"/><rect x="24" y="104" width="92" height="16" rx="4" fill="#d27f57"/><path d="M44 126 L52 172" stroke="#e39a73" stroke-width="5" stroke-linecap="round" opacity="0.5"/>') },
    { id: 'notebook', label: 'Notebook and pen', w: 182, h: 136, fx: 0.32, fy: 0.84, rot: -4, phone: false, svg: SVG('0 0 200 150',
      '<g transform="rotate(-6 96 76)"><rect x="24" y="18" width="140" height="112" rx="6" fill="#efe7d8"/><rect x="20" y="14" width="140" height="112" rx="6" fill="#c9a878"/>' +
      '<rect x="20" y="14" width="14" height="112" rx="4" fill="#b08f60"/><rect x="132" y="14" width="7" height="112" fill="#2f2b28"/>' +
      '<rect x="56" y="44" width="62" height="34" rx="3" fill="#f6efe2"/><rect x="64" y="54" width="44" height="4" rx="2" fill="#b39b7b"/><rect x="64" y="64" width="30" height="3" rx="1.5" fill="#c9b79c"/></g>' +
      '<g transform="rotate(32 120 80)"><rect x="40" y="74" width="150" height="11" rx="5.5" fill="#1f1f1f"/><rect x="40" y="74" width="40" height="11" rx="5.5" fill="#3a3a3a"/><path d="M190 74 L204 79.5 L190 85 Z" fill="#c9a24f"/><rect x="60" y="70" width="44" height="4" rx="2" fill="#b9b9b9"/><rect x="44" y="76" width="140" height="2.5" rx="1.2" fill="#ffffff" opacity="0.18"/></g>') },
    { id: 'camera', label: 'Film camera', w: 158, h: 114, fx: 0.68, fy: 0.84, rot: 6, phone: true, svg: SVG('0 0 180 130',
      '<rect x="22" y="14" width="34" height="14" rx="3" fill="#2b2826"/><rect x="128" y="16" width="22" height="10" rx="3" fill="#c8553d"/>' +
      '<rect x="6" y="24" width="168" height="98" rx="14" fill="#2b2826"/><rect x="6" y="24" width="168" height="38" rx="14" fill="#e9e2d4"/><rect x="6" y="48" width="168" height="14" fill="#e9e2d4"/>' +
      '<g fill="#3a3633" opacity="0.5"><circle cx="20" cy="80" r="1.5"/><circle cx="20" cy="92" r="1.5"/><circle cx="20" cy="104" r="1.5"/><circle cx="160" cy="80" r="1.5"/><circle cx="160" cy="92" r="1.5"/><circle cx="160" cy="104" r="1.5"/></g>' +
      '<rect x="128" y="34" width="30" height="18" rx="3" fill="#f7f4ee" stroke="#cfc6b6" stroke-width="2"/>' +
      '<circle cx="90" cy="74" r="38" fill="#cfc6b6"/><circle cx="90" cy="74" r="32" fill="#1b1a19"/><circle cx="90" cy="74" r="22" fill="#3d3a37"/><circle cx="90" cy="74" r="14" fill="#1f2a33"/>' +
      '<circle cx="84" cy="68" r="5" fill="#ffffff" opacity="0.55"/><circle cx="97" cy="81" r="2.5" fill="#ffffff" opacity="0.3"/>') },
    { id: 'sticky', label: 'Sticky notes', w: 132, h: 132, fx: 0.37, fy: 0.17, rot: 0, phone: true, svg: SVG('0 0 150 150',
      '<g transform="rotate(-8 62 70)"><rect x="12" y="20" width="100" height="100" fill="#f3d36b"/><path d="M12 112 L112 112 L112 120 L12 120 Z" fill="#e2bf55"/>' +
      '<path d="M26 46 q8 -5 16 0 t16 0 t16 0 t14 0 M26 64 q8 -5 16 0 t16 0 t16 0 M26 82 q8 -5 16 0 t16 0" fill="none" stroke="#6b5a2e" stroke-width="2.6" stroke-linecap="round"/></g>' +
      '<g transform="rotate(9 100 92)"><rect x="56" y="48" width="84" height="84" fill="#f0a6a0"/><path d="M56 126 L140 126 L140 132 L56 132 Z" fill="#dd8f88"/>' +
      '<path d="M70 72 q7 -5 14 0 t14 0 t14 0 M70 90 q7 -5 14 0 t14 0" fill="none" stroke="#7a3d38" stroke-width="2.6" stroke-linecap="round"/><circle cx="118" cy="108" r="8" fill="none" stroke="#7a3d38" stroke-width="2.4"/><path d="M118 103 V108 L121 110" stroke="#7a3d38" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
      '<rect x="44" y="8" width="44" height="16" rx="2" fill="#ffffff" opacity="0.55" transform="rotate(-8 66 16)"/>') },
    { id: 'book', label: 'A book', w: 108, h: 146, fx: 0.56, fy: 0.19, rot: 8, phone: false, svg: SVG('0 0 120 160',
      '<rect x="18" y="10" width="94" height="142" rx="4" fill="#f3ece0"/><path d="M106 14 V148" stroke="#ddd3c3" stroke-width="2"/><path d="M110 16 V146" stroke="#ddd3c3" stroke-width="1.5"/>' +
      '<rect x="8" y="6" width="96" height="144" rx="5" fill="#3f5f7a"/><rect x="8" y="6" width="16" height="144" rx="4" fill="#33506a"/>' +
      '<rect x="36" y="30" width="54" height="7" rx="3.5" fill="#f3ece0"/><rect x="36" y="44" width="40" height="5" rx="2.5" fill="#f3ece0" opacity="0.75"/>' +
      '<circle cx="62" cy="96" r="20" fill="#e9b45a"/><path d="M42 118 L82 118" stroke="#f3ece0" stroke-width="2" opacity="0.6"/>' +
      '<rect x="36" y="128" width="30" height="4" rx="2" fill="#f3ece0" opacity="0.6"/>') },
    { id: 'specs', label: 'Glasses', w: 150, h: 60, fx: 0.86, fy: 0.84, rot: -8, phone: true, svg: SVG('0 0 180 70',
      '<path d="M8 22 L2 12 M172 22 L178 12" stroke="#2a2725" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="8" y="16" width="70" height="46" rx="20" fill="#cfe0e6" fill-opacity="0.35" stroke="#2a2725" stroke-width="6"/>' +
      '<rect x="102" y="16" width="70" height="46" rx="20" fill="#cfe0e6" fill-opacity="0.35" stroke="#2a2725" stroke-width="6"/>' +
      '<path d="M78 30 C84 22 96 22 102 30" fill="none" stroke="#2a2725" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M22 28 L38 24 M116 28 L132 24" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>') }
  ];
  ITEMS.forEach(it => { it.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(it.svg); });

  // Default positions: a loose ring around the hero text, never on top of it.
  function itemLayout(W, H) {
    const phone = W < 600, b = box(W, H), sc = clamp(Math.min(W / 1440, H / 900), phone ? 0.5 : 0.62, 1.15);
    const tw = Math.min(W - 32, b.fs * 12), pad = 22 * sc + 10;
    const T = { x0: W / 2 - tw / 2 - pad, x1: W / 2 + tw / 2 + pad, y0: b.top - pad, y1: b.top + b.blockH + pad };
    const out = {};
    ITEMS.forEach(it => {
      if (phone && !it.phone) return;
      const w = it.w * sc, h = it.h * sc;
      let cx = clamp(it.fx * W, w / 2 + 8, W - w / 2 - 8), cy = clamp(it.fy * H, h / 2 + 76, H - h / 2 - 12);
      if (cx + w / 2 > T.x0 && cx - w / 2 < T.x1 && cy + h / 2 > T.y0 && cy - h / 2 < T.y1) {
        cy = cy < (T.y0 + T.y1) / 2 ? T.y0 - h / 2 - 6 : T.y1 + h / 2 + 6;
        cy = clamp(cy, h / 2 + 76, H - h / 2 - 12);
      }
      out[it.id] = { x: cx - w / 2, y: cy - h / 2, w, h, rot: it.rot };
    });
    return out;
  }

  /* ---------- static editorial desk composition around the headline (no motion) ----------
     Photoreal cut-outs (transparent WebP). Positions hug the bottom and outer edges and are kept clear of the
     centred headline block; some are cropped by the viewport on purpose. Fewer objects on tablet / phone. */
  const DESK = [
    { id: 'notebook', src: './assets/desk-notebook.webp', ar: 370 / 228 },
    { id: 'keyboard', src: './assets/desk-keyboard.webp', ar: 1138 / 486 },
    { id: 'book', src: './assets/desk-book.webp', ar: 618 / 1054 },
    { id: 'coffee', src: './assets/desk-coffee.webp', ar: 389 / 287 }
  ];
  const AR = id => DESK.find(o => o.id === id).ar;
  // One straight row resting on a line just above the scroll cue (the cue sits at the very bottom of the screen):
  // notebook | keyboard (centred) | book | coffee. All upright, no rotation, never touching the headline block.
  const CUE_SPACE = W => W < 600 ? 86 : 104;
  function deskLayout(W, H) {
    const phone = W < 600, tablet = !phone && W < 1024, u = Math.min(W, H * 1.65), b = box(W, H), out = [];
    const base = H - CUE_SPACE(W), room = Math.max(60, base - (b.top + b.blockH + 28));
    const put = (id, x, w) => { const h = w / AR(id); out.push({ id, src: DESK.find(o => o.id === id).src, x, y: base - h, w, h, rot: 0 }); return h; };
    if (phone) {
      // notebook | keyboard | book | coffee, a little smaller than desktop; the notebook tucks off the left edge
      let kw = W * 0.48, nw = W * 0.24, bw = W * 0.1, cw = W * 0.18, g = W * 0.02;
      const tallest = Math.max(kw / AR('keyboard'), nw / AR('notebook'), bw / AR('book'), cw / AR('coffee'));
      const f = Math.min(1, room / tallest);
      kw *= f; nw *= f; bw *= f; cw *= f; g *= f;
      const tot = nw + g + kw + g + bw + g + cw, x0 = Math.min((W - tot) / 2, W - tot - W * 0.02);
      put('notebook', x0, nw); put('keyboard', x0 + nw + g, kw); put('book', x0 + nw + g + kw + g, bw); put('coffee', x0 + nw + g + kw + g + bw + g, cw);
      return { items: out };
    }
    let kw = u * (tablet ? 0.4 : 0.36), nw = u * 0.17, bw = u * 0.075, cw = u * 0.13, g = u * 0.024;
    const tallest = Math.max(kw / AR('keyboard'), nw / AR('notebook'), bw / AR('book'), cw / AR('coffee'));
    const half = Math.max(kw / 2 + g + nw, kw / 2 + g + bw + g + cw), f = Math.min(1, (W / 2 - 16) / half, room / tallest);
    kw *= f; nw *= f; bw *= f; cw *= f; g *= f;
    const kx = W / 2 - kw / 2; put('keyboard', kx, kw); put('notebook', kx - g - nw, nw);
    const bx = kx + kw + g; put('book', bx, bw); put('coffee', bx + bw + g, cw);
    return { items: out };
  }
  const deskImgs = {}; DESK.forEach(d => { const im = new Image(); im.onload = () => { if (window.__apartment && window.__apartment.redrawMon) window.__apartment.redrawMon(); }; im.src = d.src; deskImgs[d.id] = im; });

  // Canvas version for the monitor: stage 0 = first line + objects, 1 = second line, 2 = second line + subtext.
  const imgs = {}; let pending = 0;
  ITEMS.forEach(it => { const im = new Image(); pending++; im.onload = im.onerror = () => { if (--pending === 0 && window.__apartment && window.__apartment.redrawMon) window.__apartment.redrawMon(); }; im.src = it.src; imgs[it.id] = im; });
  function draw(ctx, W, H, stage) {
    const b = box(W, H);
    ctx.save();
    if (stage < 3) deskLayout(W, H).items.forEach(o => { const im = deskImgs[o.id]; if (!im || !im.complete || !im.naturalWidth) return; ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2); ctx.rotate(o.rot * Math.PI / 180); ctx.drawImage(im, -o.w / 2, -o.h / 2, o.w, o.h); ctx.restore(); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#392C27';
    ctx.font = '500 ' + b.fs + "px 'Bricolage Grotesque', 'Helvetica Neue', sans-serif";
    try { ctx.letterSpacing = (-0.03 * b.fs).toFixed(2) + 'px'; } catch (e) {}
    ctx.fillText(LINES[stage >= 1 ? 1 : 0], W / 2, b.top + b.lineH / 2);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
    if (stage >= 2) {
      ctx.font = '400 ' + b.sub + "px 'Inter', 'Helvetica Neue', sans-serif"; ctx.fillStyle = '#765B4B';
      const words = SUB.split(' '), lines = []; let cur = '';
      words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > b.subMax && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, b.top + b.lineH + b.gap + b.sub * 1.5 * (i + 0.5)));
    }
    ctx.restore();
  }
  window.WorkHero = { LINES, SUB, ITEMS, box, itemLayout, deskLayout, draw };
})();
