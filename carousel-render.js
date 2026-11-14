/* Shared renderer for the project carousel: used by the full-screen portfolio and by the monitor texture in the apartment,
   so both always show the identical layout. Cards are drawn as vertical strips so their top/bottom edges can bend. */
(function () {
  const FD = "'Bricolage Grotesque', 'Helvetica Neue', sans-serif", FT = "'Space Grotesk', 'Helvetica Neue', sans-serif";
  const CARDS = [
    { title: 'Arth', desc: 'AI powered Mutual Investment App', year: '2026', num: '01', cat: 'Personal project', vis: 'arth', cols: ['#5b3fd0', '#3f229e', '#7d68dc'], glow: [0.7, 0.2, 'rgba(143,120,238,0.9)'] },
    { title: 'PropVR Website', desc: 'Product website redesign', year: '2026', num: '02', cat: 'Product design', vis: 'browser', cols: ['#1d1e23', '#121317'], glow: [0.8, 1, 'rgba(183,159,120,0.35)'] },
    { title: 'Hologram', desc: 'Interactive 3D Real Estate Presentation', year: '2026', num: '03', cat: 'Project showcase', vis: 'tablet', cols: ['#ece5da', '#d6cbbb'], glow: [0.2, 0, 'rgba(251,247,240,1)'] },
    { title: 'Kiosk Experience', desc: 'Interactive kiosk with physical dial controls', year: '2025', num: '04', cat: 'Product design', vis: 'dial', cols: ['#2c2a28', '#1b1a19'], glow: [0.5, 0.4, 'rgba(74,70,67,0.9)'] }
  ];
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  let imgBg = null;
  const imgOf = sel => { const el = document.querySelector(sel); return el && el.complete && el.naturalWidth ? el : null; };
  const IMG = { arth: '[data-arth-thumb]', browser: '[data-propvr-thumb]', tablet: '[data-exp-thumb]', dial: '[data-dial-thumb]' };
  const thumb = () => imgOf('[data-arth-thumb]');
  function edgeColor(img) {
    if (imgBg) return imgBg;
    try { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.drawImage(img, 0, 0, img.naturalWidth * 0.06, img.naturalHeight * 0.06, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; imgBg = 'rgb(' + Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n) + ')'; } catch (e) { imgBg = '#15103d'; }
    return imgBg;
  }
  function art(c, v, CW, CH) {
    const g = c.createLinearGradient(CW * 0.33, 0, CW * 0.67, CH); v.cols.forEach((col, i) => g.addColorStop(i / (v.cols.length - 1), col)); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    const rg = c.createRadialGradient(v.glow[0] * CW, v.glow[1] * CH, 0, v.glow[0] * CW, v.glow[1] * CH, CW * 0.6); rg.addColorStop(0, v.glow[2]); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, CW, CH);
    let vis = v.vis;
    { const im = IMG[vis] && imgOf(IMG[vis]); if (im) { const iw = im.naturalWidth, ih = im.naturalHeight, s0 = Math.max(CW / iw, CH / ih), dw = iw * s0, dh = ih * s0; c.drawImage(im, (CW - dw) / 2, (CH - dh) / 2, dw, dh); return; } }
    if (vis === 'arth') { const img = thumb(); if (img) { const iw = img.naturalWidth, ih = img.naturalHeight, s0 = Math.min(CW / iw, CH / ih), dw = iw * s0, dh = ih * s0, dx = (CW - dw) / 2, dy = (CH - dh) / 2;
      if (dx > 0.5 || dy > 0.5) { const s1 = Math.max(CW / iw, CH / ih) * 1.15, w1 = iw * s1, h1 = ih * s1; c.save(); if ('filter' in c) c.filter = 'blur(' + Math.round(CW * 0.04) + 'px) brightness(0.8)'; c.drawImage(img, (CW - w1) / 2, (CH - h1) / 2, w1, h1); c.restore(); }
      c.drawImage(img, dx, dy, dw, dh); return; } vis = 'phone'; }
    const u = CW / 560; c.save(); c.translate(CW / 2, CH / 2); c.scale(1.6 * u, 1.6 * u);
    const r2 = (...a) => rr(c, ...a);
    if (vis === 'phone') { r2(-38, -70, 76, 140, 16); c.fillStyle = '#f4f0ff'; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke(); r2(-28, -48, 56, 36, 8); c.fillStyle = '#6a4cdc'; c.fill(); c.fillStyle = 'rgba(90,60,200,0.18)'; [0, 14, 28].forEach(y => { r2(-28, y, 56, 10, 4); c.fill(); }); }
    if (vis === 'browser') { r2(-80, -51, 160, 102, 8); c.fillStyle = '#0e0f12'; c.fill(); c.fillStyle = '#1b1c21'; c.fillRect(-80, -43, 160, 10); const g2 = c.createLinearGradient(-74, -29, 74, 45); g2.addColorStop(0, '#2d313a'); g2.addColorStop(0.55, '#5d5649'); g2.addColorStop(1, '#b79f78'); r2(-74, -29, 148, 74, 5); c.fillStyle = g2; c.fill(); c.fillStyle = 'rgba(255,255,255,0.85)'; r2(-66, 29, 62, 5, 2); c.fill(); }
    if (vis === 'tablet') { r2(-78, -52, 156, 104, 10); c.fillStyle = '#ffffff'; c.fill(); r2(-73, -47, 146, 94, 6); c.fillStyle = '#f7f4ef'; c.fill(); const g3 = c.createLinearGradient(-69, -43, -5, 43); g3.addColorStop(0, '#e9d8bf'); g3.addColorStop(0.55, '#c9a982'); g3.addColorStop(1, '#8c7155'); r2(-69, -43, 82, 86, 4); c.fillStyle = g3; c.fill(); c.fillStyle = '#e6dfd4'; r2(17, -43, 52, 30, 3); c.fill(); r2(17, -9, 52, 30, 3); c.fill(); c.fillStyle = '#2b2724'; r2(17, 25, 52, 18, 9); c.fill(); }
    if (vis === 'dial') { r2(-38, -70, 76, 140, 16); c.fillStyle = '#141414'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#3a3836'; c.stroke(); c.lineWidth = 6; c.strokeStyle = '#3b3936'; c.beginPath(); c.arc(0, -16, 24, 0, Math.PI * 2); c.stroke(); c.strokeStyle = '#e8e2d8'; c.beginPath(); c.arc(0, -16, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.72); c.stroke(); c.fillStyle = '#3b3936'; r2(-20, 22, 40, 4, 2); c.fill(); }
    c.restore();
  }
  const cache = {};
  function cardCanvas(i, w, h) {
    const key = i + ':' + w + 'x' + h + ':' + (thumb() ? 1 : 0) + (imgOf('[data-propvr-thumb]') ? 1 : 0) + (imgOf('[data-exp-thumb]') ? 1 : 0) + (imgOf('[data-dial-thumb]') ? 1 : 0); let e = cache[i];
    if (e && e.key === key) return e.cv;
    const cv = (e && e.cv) || document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); c.clearRect(0, 0, w, h); c.save(); rr(c, 0, 0, w, h, Math.max(2, w * 0.008)); c.clip(); art(c, CARDS[i], w, h); c.restore();
    cache[i] = { key, cv }; return cv;
  }
  // Layout for a viewport of W x H css px. Settled: one flat centre card, a partly visible card each side.
  function layout(W, H) {
    const portrait = W / H < 1;
    const CW = portrait ? W * 0.74 : Math.min(W * 0.4725, H * 0.84), CH = CW / 1.754, gap = portrait ? W * 0.05 : W * 0.048;
    const fs = Math.max(14, Math.min(19, W / 76));
    return { W, H, CW, CH, gap, step: CW + gap, cx: W / 2, cy: H * 0.53, h0: CW / 2 + gap * 0.6, titleSize: Math.max(17, CW * 0.032), descSize: Math.max(12, CW * 0.016), metaSize: Math.max(10.5, CW * 0.0135), fs };
  }
  // vertical stretch at screen x: flat in the centre band, curving outward toward the edges; more while moving
  function flatHalf(L, vel) { const av = Math.min(4, Math.abs(vel || 0)); return Math.max(L.CW * 0.18, L.h0 - av * L.CW * 0.09); }
  function bendAt(L, x, vel) {
    const av = Math.min(4, Math.abs(vel || 0)), h0 = flatHalf(L, vel), span = Math.max(40, L.W / 2 - h0);
    const t = Math.max(0, (Math.abs(x - L.cx) - h0) / span);
    return 1 + (0.21 + av * 0.05) * t * t;
  }
  function alphaAt(L, x) { const t = (Math.abs(x - L.cx) - L.h0) / Math.max(40, L.W / 2 - L.h0); return 1 - 0.35 * sstep(0.5, 1.1, t); }
  // label block above each card: name + description at top-left, year at top-right
  function labelBox(L, g, vel) {
    const gap = L.titleSize * 0.7, top = x => L.cy - L.CH * bendAt(L, x, vel) / 2, w = L.CW * 0.32;
    const yl = top(g.x0), yr = top(g.x1), angL = Math.atan2(top(g.x0 + w) - yl, w), angR = Math.atan2(yr - top(g.x1 - w), w);
    const fade = 1 - Math.min(1, Math.abs(g.o)) * 0.4;
    return { gap, yl, yr, angL, angR, dTitle: L.descSize * 1.7, al: Math.max(0.3, fade * alphaAt(L, g.x0 + w / 2)), alR: Math.max(0.3, fade * alphaAt(L, g.x1 - 10)),
      descBase: yl - gap, titleBase: yl - gap - L.descSize * 1.7, titleBaseR: yr - gap - L.descSize * 1.7 };
  }
  function offset(i, cur) { let o = ((i - cur) % 4 + 4) % 4; if (o > 2) o -= 4; return o; }
  // Returns per-card geometry (for hit areas and titles) and draws to ctx (already scaled to css px).
  function draw(ctx, W, H, cur, vel, opt) {
    opt = opt || {}; const L = layout(W, H), dpr = opt.dpr || 1, out = [];
    const sharp = opt.scratch || (draw._s = draw._s || document.createElement('canvas'));
    const pw = Math.ceil(W * dpr), ph = Math.ceil(H * dpr); if (sharp.width !== pw || sharp.height !== ph) { sharp.width = pw; sharp.height = ph; }
    const s = sharp.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, pw, ph); s.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = Math.round(L.CW * dpr), ch = Math.round(L.CH * dpr), SW = 3;
    for (let i = 0; i < 4; i++) {
      const o = offset(i, cur), x0 = L.cx + o * L.step - L.CW / 2, x1 = x0 + L.CW;
      const g = { i, o, x0, x1, top: L.cy - L.CH / 2, bot: L.cy + L.CH / 2, vis: !(x1 < 0 || x0 > W) };
      out.push(g); if (!g.vis) continue;
      const cv = cardCanvas(i, cw, ch), hov = opt.hover === i;
      const a = Math.max(0, x0), b = Math.min(W, x1);
      const fh = flatHalf(L, vel), fl = L.cx - fh, fr = L.cx + fh;
      let x = a;
      while (x < b) {
        const flat = x >= fl && x < fr;
        let xe;
        if (flat) xe = Math.min(b, fr); else xe = Math.min(b, x + SW, x < fl ? Math.max(x + 0.5, fl) : b);
        const xm = (x + xe) / 2, k = bendAt(L, xm, vel), hh = L.CH * k;
        const u0 = (x - x0) / L.CW * cw, u1 = (xe - x0) / L.CW * cw;
        s.drawImage(cv, u0, 0, Math.max(0.5, u1 - u0), ch, x, L.cy - hh / 2, xe - x + (flat ? 0 : 0.4), hh);
        x = xe;
      }
      s.globalAlpha = 1;
      if (hov) { s.save(); s.globalCompositeOperation = 'source-atop'; s.fillStyle = 'rgba(255,255,255,0.07)'; s.fillRect(a, 0, b - a, H); s.restore(); }
      g.topAt = xx => L.cy - L.CH * bendAt(L, xx, vel) / 2; g.botAt = xx => L.cy + L.CH * bendAt(L, xx, vel) / 2;
    }
    { s.setTransform(1, 0, 0, 1, 0, 0); const g = s.createLinearGradient(0, 0, pw, 0); for (let j = 0; j <= 24; j++) { const xx = W * j / 24; g.addColorStop(j / 24, 'rgba(0,0,0,' + alphaAt(L, xx).toFixed(3) + ')'); } s.globalCompositeOperation = 'destination-in'; s.fillStyle = g; s.fillRect(0, 0, pw, ph); s.globalCompositeOperation = 'source-over'; }
    const P = opt.place || [dpr, 0, 0], k = P[0] / dpr;
    let src = sharp;
    if (!opt.noBlur && 'filter' in s) {
      const bl = draw._b = draw._b || document.createElement('canvas'), sh = draw._c = draw._c || document.createElement('canvas');
      [bl, sh].forEach(c => { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
      const B = bl.getContext('2d'), C = sh.getContext('2d'), band = Math.min(L.W * 0.12, Math.max(0, L.cx - L.CW / 2 - L.gap * 0.5)) * dpr, rad = Math.max(0.8, L.W * 0.0014) * dpr;
      const mask = (c, inv) => { const g = c.createLinearGradient(0, 0, pw, 0), e = band / pw; for (let j = 0; j <= 12; j++) { const t = j / 12, v = Math.pow(1 - t, 2) * (3 - 2 * (1 - t)) * (1 - t) * 0 + (1 - t) * (1 - t) * (1 - t); const a = inv ? 1 - v : v; g.addColorStop(t * e, 'rgba(0,0,0,' + a.toFixed(3) + ')'); g.addColorStop(1 - t * e, 'rgba(0,0,0,' + a.toFixed(3) + ')'); } c.globalCompositeOperation = 'destination-in'; c.fillStyle = g; c.fillRect(0, 0, pw, ph); c.globalCompositeOperation = 'source-over'; };
      B.setTransform(1, 0, 0, 1, 0, 0); B.clearRect(0, 0, pw, ph); B.filter = 'blur(' + rad.toFixed(2) + 'px)'; B.drawImage(sharp, 0, 0); B.filter = 'none'; mask(B, false);
      C.setTransform(1, 0, 0, 1, 0, 0); C.clearRect(0, 0, pw, ph); C.drawImage(sharp, 0, 0); mask(C, true);
      C.drawImage(bl, 0, 0); src = sh;
    }
    ctx.save(); ctx.setTransform(k, 0, 0, k, P[1], P[2]); ctx.drawImage(src, 0, 0); ctx.restore();
    if (opt.titles) {
      ctx.save(); ctx.setTransform(P[0], 0, 0, P[0], P[1], P[2]); ctx.textBaseline = 'alphabetic';
      const curved = (text, x, off, font, color, alpha, ls, right) => {
        ctx.font = font; ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.textAlign = 'left';
        const ch = Array.from(text), ws = ch.map(c2 => ctx.measureText(c2).width + ls), tot = ws.reduce((p, q) => p + q, 0) - ls;
        let px = right ? x - tot : x;
        const top = xx => L.cy - L.CH * bendAt(L, xx, vel) / 2 - off;
        ch.forEach((c2, j) => { const mid = px + ws[j] / 2, y = top(mid), ang = Math.atan2(top(mid + 2) - top(mid - 2), 4);
          ctx.save(); ctx.translate(mid, y); ctx.rotate(ang); ctx.fillText(c2, -(ws[j] - ls) / 2, 0); ctx.restore(); px += ws[j]; });
      };
      out.forEach(g => { if (!g.vis) return; const c = CARDS[g.i], lb = labelBox(L, g, vel);
        curved(c.title, g.x0, lb.gap + lb.dTitle, '500 ' + L.titleSize.toFixed(1) + 'px ' + FD, '#171717', lb.al, -0.02 * L.titleSize, false);
        curved(c.desc, g.x0, lb.gap, '400 ' + L.descSize.toFixed(1) + 'px ' + FT, '#5e5244', lb.al, 0, false);
        curved(c.year, g.x1, lb.gap + lb.dTitle, '500 ' + L.descSize.toFixed(1) + 'px ' + FT, '#5e5244', lb.alR, 0, true); });
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    return { L, cards: out };
  }
  window.CarouselRender = { CARDS, layout, draw, offset, bendAt, labelBox, reset: () => { for (const k in cache) delete cache[k]; imgBg = null; } };
})();
