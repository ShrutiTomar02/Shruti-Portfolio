(function () {
let THREE = null;
const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';

/* ---------- helpers ---------- */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const FONT_D = "'Bricolage Grotesque', 'Helvetica Neue', sans-serif";
const FONT_T = "'Space Grotesk', 'Helvetica Neue', sans-serif";

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData.redraw = () => { ctx.clearRect(0, 0, w, h); draw(ctx, w, h); t.needsUpdate = true; };
  return t;
}
function rbox(w, h, d, r = 0.03, s = 4) {
  const g = new THREE.BoxGeometry(w, h, d, s, s, s);
  const p = g.attributes.position, v = new THREE.Vector3(), inn = new THREE.Vector3();
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inn.set(clamp(v.x, -hw, hw), clamp(v.y, -hh, hh), clamp(v.z, -hd, hd));
    const dir = v.clone().sub(inn);
    if (dir.lengthSq() > 1e-10) v.copy(inn).add(dir.normalize().multiplyScalar(r));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line); return lines;
}

/* ---------- time of day ---------- */
const TIMES = {
  morning: { top: '#8fbfe3', bot: '#f6e7cc', fog: '#dfe7e6', fogN: 14, fogF: 60, sun: '#ffe9c7', sunI: 2.6, sunP: [7, 9, -12], hemi: 0.55, ceil: 3.5, lamp: 1.5, rain: 0, stars: 0, exp: 1.0 },
  foggy: { top: '#c3cacc', bot: '#e3e5e2', fog: '#d6dbdb', fogN: 5, fogF: 19, sun: '#eef0f0', sunI: 0.9, sunP: [6, 10, -12], hemi: 0.6, ceil: 5, lamp: 2.5, rain: 0, stars: 0, exp: 1.0 },
  rainy: { top: '#5f6a72', bot: '#8e989c', fog: '#7d878b', fogN: 7, fogF: 26, sun: '#cfd9de', sunI: 0.55, sunP: [6, 10, -12], hemi: 0.42, ceil: 6, lamp: 4, rain: 1, stars: 0, exp: 1.05 },
  sunset: { top: '#2f2c63', bot: '#ff8f45', fog: '#c8705a', fogN: 12, fogF: 48, sun: '#ff9d57', sunI: 3.2, sunP: [9, 2.6, -12], hemi: 0.38, ceil: 4.5, lamp: 3.5, rain: 0, stars: 0.15, exp: 1.05 },
  night: { top: '#070b1c', bot: '#1a2242', fog: '#141b33', fogN: 10, fogF: 40, sun: '#8ea6ff', sunI: 0.35, sunP: [6, 10, -12], hemi: 0.18, ceil: 7.5, lamp: 6, rain: 0, stars: 1, exp: 1.08 }
};
const CK = ['top', 'bot', 'fog', 'sun'], NK = ['fogN', 'fogF', 'sunI', 'hemi', 'ceil', 'lamp', 'rain', 'stars', 'exp'];

/* ---------- film script (verbatim from brief) ---------- */
const FILM = [
  { k: 'title', text: 'The Life of Shruti. Directed by Shruti Tomar.', dur: 5.4 },
  { k: 'hello', text: "Hello, I'm Shruti Tomar.", dur: 4.2 },
  { k: 'line', vis: 'untangle', label: 'Product Designer · UX Designer', text: "I'm a Product Designer and UX Designer who enjoys turning complicated problems into experiences that feel simple, thoughtful, and intuitive." },
  { k: 'line', vis: 'dots', label: 'Curious by nature', text: "I'm curious about how things work, why people behave the way they do, and how small design decisions can make a big difference." },
  { k: 'line', vis: 'code', label: 'Where it started', text: 'My journey started with a curiosity about technology and how digital products are built. I even explored frontend development before discovering that what excited me most was designing the experience itself.' },
  { k: 'line', vis: 'cards', label: 'Today', text: 'Today, I work on digital products and immersive experiences, bringing together user needs, product thinking, interaction design, and visual storytelling.' },
  { k: 'interests', text: "And when I'm not designing, you'll probably find me playing guitar, watching or playing cricket, playing badminton, reading something interesting, or looking for my next coffee." },
  { k: 'line', vis: 'none', label: '', text: 'This is a little introduction to who I am, how I think, and the experiences I love creating.' },
  { k: 'big', text: 'Welcome to my world.', dur: 4.2 },
  { k: 'end', text: "So, want to see what I've been working on?", dur: 9999 }
];
FILM.forEach(s => { if (!s.dur) s.dur = clamp(s.text.split(' ').length * 0.36 + 1.8, 4.5, 12); });

function createApartment(canvas, o = {}) {
  const reduce = !!o.reduce;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const lowPower = Math.min(window.innerWidth, window.innerHeight) < 600 || (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(lowPower ? 1.5 : 1.75, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#dfe7e6', 14, 60);
  scene.background = new THREE.Color('#1a1714');
  const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 140); camera.rotation.order = 'YXZ';

  const M = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, fog: false, ...x });
  const MO = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, fog: true, ...x });
  const add = (g, m, x, y, z, parent = scene, shadow = true) => {
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
  const group = (x = 0, y = 0, z = 0, parent = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const cols = [], spots = {}, pickables = [];
  const C = (x0, x1, z0, z1) => { const c = { x0, x1, z0, z1, on: true }; cols.push(c); return c; };
  const tag = (obj, id) => { obj.traverse(m => { m.userData.spot = id; }); pickables.push(obj); };

  /* ---------- materials & textures ---------- */
  const wood = canvasTex(1024, 1024, (x, w, h) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const l = 44 + ((i * 37) % 9) - 4;
      x.fillStyle = `hsl(24, 42%, ${l}%)`; x.fillRect(0, i * h / n, w, h / n);
      for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(60,30,10,${0.04 + Math.random() * 0.05})`; x.fillRect(Math.random() * w, i * h / n + Math.random() * h / n, 80 + Math.random() * 300, 1.5); }
      x.fillStyle = 'rgba(40,20,8,0.5)'; x.fillRect(0, i * h / n, w, 2);
      x.fillRect(((i * 397) % w), i * h / n, 2, h / n);
    }
  });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(2.5, 2.5);
  const walnut = M('#6b4a33', { roughness: 0.6 }), dark = M('#2b2621', { roughness: 0.55 }), black = M('#141312', { roughness: 0.4 });
  const wallM = M('#ebe1d1', { roughness: 0.95 }), trimM = M('#f4efe6'), corrM = M('#b19bd6', { roughness: 0.85 });
  const brass = M('#c9a25c', { roughness: 0.35, metalness: 0.7 }), teal = M('#3F746E', { roughness: 0.9 }), cream = M('#efe3cf', { roughness: 0.95 });
  const terracotta = M('#b8643f', { roughness: 0.9 }), leaf = M('#4f7a4a', { roughness: 0.8 }), leaf2 = M('#6b9a5a', { roughness: 0.8 });

  /* ---------- room shell (10 x 8 x 3) ---------- */
  const floor = add(new THREE.PlaneGeometry(10, 8), M('#ffffff', { map: wood, roughness: 0.62 }), 0, 0, 0, scene, false);
  floor.rotation.x = -Math.PI / 2;
  add(B(10.4, 0.1, 8.4), M('#f3ede3'), 0, 3.05, 0, scene, false);
  // back wall with window hole (x 1.6..4.4, y 0.9..2.5)
  add(B(6.6, 3, 0.2), wallM, -1.7, 1.5, -4.1); add(B(0.6, 3, 0.2), wallM, 4.7, 1.5, -4.1);
  add(B(2.8, 0.9, 0.2), wallM, 3, 0.45, -4.1); add(B(2.8, 0.5, 0.2), wallM, 3, 2.75, -4.1);
  add(B(0.2, 3, 8.4), wallM, -5.1, 1.5, 0); add(B(0.2, 3, 8.4), wallM, 5.1, 1.5, 0);
  const fw = [wallM, wallM, wallM, wallM, corrM, wallM];
  add(B(7.5, 3, 0.2), fw, -1.25, 1.5, 4.1); add(B(1.5, 3, 0.2), fw, 4.25, 1.5, 4.1); add(B(1, 0.9, 0.2), fw, 3, 2.55, 4.1);
  const base = M('#d9cbb4');
  add(B(10, 0.1, 0.03), base, 0, 0.05, -3.985, scene, false); add(B(0.03, 0.1, 8), base, -4.985, 0.05, 0, scene, false); add(B(0.03, 0.1, 8), base, 4.985, 0.05, 0, scene, false);
  // window frame
  add(B(2.9, 0.08, 0.3), trimM, 3, 2.52, -4.05); add(B(3.1, 0.06, 0.38), trimM, 3, 0.88, -3.96);
  add(B(0.08, 1.68, 0.3), trimM, 1.58, 1.7, -4.05); add(B(0.08, 1.68, 0.3), trimM, 4.42, 1.7, -4.05);
  add(B(0.05, 1.6, 0.08), trimM, 3, 1.7, -4.12); add(B(2.8, 0.05, 0.08), trimM, 3, 1.95, -4.12);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.6), new THREE.MeshStandardMaterial({ color: '#cfe3e6', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false, fog: false }));
  glass.position.set(3, 1.7, -4.13); scene.add(glass);
  // curtains
  const curtainM = M('#4b4c50', { side: THREE.DoubleSide, roughness: 0.95 });
  [1.22, 4.78].forEach(cx => {
    const g = new THREE.PlaneGeometry(0.62, 2.45, 28, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 32) * 0.035);
    g.computeVertexNormals();
    const m = add(g, curtainM, cx, 1.5, -3.86); m.castShadow = false;
  });
  add(cyl(0.015, 0.015, 3.9, 8), brass, 3, 2.78, -3.86).rotation.z = Math.PI / 2;

  /* ---------- outside world ---------- */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0.25, 0.85, vUv.y)), 1.0); \n#include <colorspace_fragment>\n }',
    depthWrite: false, fog: false
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(160, 70), skyMat); sky.position.set(3, 18, -40); scene.add(sky);
  add(new THREE.PlaneGeometry(80, 40), MO('#7c9a63'), 3, -0.02, -24, scene, false).rotation.x = -Math.PI / 2;
  const fenceM = MO('#5a4632');
  for (let x = -6; x <= 12; x += 0.42) add(B(0.08, 1.1, 0.05), fenceM, x, 0.55, -7.2, scene, false);
  add(B(18.5, 0.07, 0.06), fenceM, 3, 0.85, -7.15, scene, false); add(B(18.5, 0.07, 0.06), fenceM, 3, 0.35, -7.15, scene, false);
  const blossom = [MO('#d9547e'), MO('#e9789b'), MO('#c43f6a')];
  const tree = (x, z, s, mats) => {
    add(cyl(0.12 * s, 0.2 * s, 2.6 * s, 8), MO('#4a3424'), x, 1.3 * s, z, scene, false);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.39, r = (0.4 + (i % 4) * 0.35) * s;
      add(new THREE.IcosahedronGeometry((0.55 + (i % 3) * 0.2) * s, 0), mats[i % mats.length], x + Math.cos(a) * r, (2.6 + (i % 5) * 0.32) * s, z + Math.sin(a) * r * 0.6, scene, false);
    }
  };
  tree(1.6, -9.5, 1.15, blossom); tree(8.5, -12, 1, [MO('#5e8a52'), MO('#6f9a5e')]); tree(-3.5, -13, 0.9, [MO('#5e8a52'), MO('#7aa262')]);
  const houseM = MO('#dde1e3');
  add(B(6, 4.2, 5), houseM, 5, 2.1, -18, scene, false);
  const roofGeo = cyl(0.02, 1, 1, 4); roofGeo.rotateY(Math.PI / 4); const roof = add(roofGeo, MO('#4a5560'), 5, 4.85, -18, scene, false); roof.scale.set(3.3, 1.3, 2.8);
  for (let i = 0; i < 3; i++) add(B(0.9, 1.1, 0.05), MO('#39424a'), 3.3 + i * 1.7, 2.6, -15.48, scene, false);
  // rain
  const RN = reduce ? 500 : 1400, rPos = new Float32Array(RN * 6), rSpd = new Float32Array(RN);
  for (let i = 0; i < RN; i++) { const x = -2 + Math.random() * 11, y = Math.random() * 9, z = -4.6 - Math.random() * 9; rPos.set([x, y, z, x + 0.02, y - 0.28, z], i * 6); rSpd[i] = 8 + Math.random() * 4; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: '#dfe8ec', transparent: true, opacity: 0, fog: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);
  const stPos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) stPos.set([3 + (Math.random() - 0.5) * 120, 4 + Math.random() * 40, -38], i * 3);
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---------- corridor + entrance ---------- */
  const tile = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#b9ab92'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#c4b69d' : '#ad9f86'; x.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); } });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(2, 2);
  add(B(4.2, 0.1, 4.2), M('#ffffff', { map: tile }), 3, -0.05, 6.3, scene, false);
  add(B(0.2, 3, 4.2), corrM, 0.9, 1.5, 6.3); add(B(0.2, 3, 4.2), corrM, 5.1, 1.5, 6.3); add(B(4.4, 3, 0.2), corrM, 3, 1.5, 8.4);
  add(B(4.4, 0.1, 4.4), M('#e7dfd2'), 3, 3.05, 6.3, scene, false);
  // casing: stepped molding in a deeper purple
  const casM = M('#8a6cc0', { roughness: 0.5 }), casM2 = M('#987dcb', { roughness: 0.5 });
  add(B(0.13, 2.24, 0.05), casM, 2.415, 1.12, 4.225); add(B(0.13, 2.24, 0.05), casM, 3.585, 1.12, 4.225); add(B(1.3, 0.13, 0.05), casM, 3, 2.185, 4.225);
  add(B(0.045, 2.2, 0.03), casM2, 2.385, 1.1, 4.262); add(B(0.045, 2.2, 0.03), casM2, 3.615, 1.1, 4.262); add(B(1.275, 0.045, 0.03), casM2, 3, 2.228, 4.262);
  add(B(0.03, 2.1, 0.2), casM, 2.515, 1.05, 4.1); add(B(0.03, 2.1, 0.2), casM, 3.485, 1.05, 4.1); add(B(1.0, 0.03, 0.2), casM, 3, 2.085, 4.1);
  // door: hinge on the right (x 3.47), swings into the flat
  const doorM = M('#b59ce0', { roughness: 0.42 });
  const goldM = M('#ead065', { roughness: 0.36, metalness: 0.45 }), silverM = M('#d7d7da', { roughness: 0.3, metalness: 0.85 });
  const doorPivot = group(3.47, 0, 4.1);
  const door = group(-0.47, 1.035, 0, doorPivot);
  add(rbox(0.94, 2.07, 0.05, 0.008, 2), doorM, 0, 0, 0, door);
  // ornate gold frame
  const frameG = group(0, 0.4, 0.027, door);
  const v3 = (x, y) => new THREE.Vector3(x, y, 0);
  const tube = (pts, r, closed = false) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'centripetal'), closed ? 90 : 40, r, 10, closed), goldM, 0, 0, 0, frameG);
  tube([v3(-0.125, 0.18), v3(0, 0.168), v3(0.125, 0.18), v3(0.15, 0), v3(0.125, -0.18), v3(0, -0.168), v3(-0.125, -0.18), v3(-0.15, 0)], 0.017, true);
  tube([v3(-0.1, 0.15), v3(0, 0.142), v3(0.1, 0.15), v3(0.118, 0), v3(0.1, -0.15), v3(0, -0.142), v3(-0.1, -0.15), v3(-0.118, 0)], 0.008, true);
  [1, -1].forEach(sy => {
    tube([v3(-0.13, 0.19 * sy), v3(-0.07, 0.225 * sy), v3(0, 0.205 * sy), v3(0.07, 0.225 * sy), v3(0.13, 0.19 * sy)], 0.013);
    tube([v3(-0.05, 0.2 * sy), v3(0, 0.232 * sy), v3(0.05, 0.2 * sy)], 0.009);
  });
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const sc = add(new THREE.TorusGeometry(0.022, 0.008, 8, 24, Math.PI * 1.55), goldM, sx * 0.14, sy * 0.19, 0.004, frameG);
    sc.rotation.z = Math.atan2(sy, sx) - Math.PI * 0.2;
    add(new THREE.SphereGeometry(0.01, 10, 8), goldM, sx * 0.14, sy * 0.19, 0.006, frameG);
  });
  [1, -1].forEach(sx => add(new THREE.SphereGeometry(0.012, 10, 8), goldM, sx * 0.152, 0, 0.004, frameG).scale.set(1, 2.2, 0.8));
  add(new THREE.TorusGeometry(0.017, 0.0055, 10, 24), silverM, 0, 0.02, 0.006, frameG);
  add(new THREE.CircleGeometry(0.012, 20), M('#2a2238'), 0, 0.02, 0.004, frameG, false);
  // knob, lock, chain, hinges
  add(cyl(0.045, 0.048, 0.012, 24), goldM, 0, 0.02, 0.031, door).rotation.x = Math.PI / 2;
  const knob = add(new THREE.SphereGeometry(0.036, 20, 14), goldM, 0, 0.02, 0.07, door); knob.scale.set(1, 1, 0.85);
  add(cyl(0.014, 0.018, 0.04, 12), goldM, 0, 0.02, 0.045, door).rotation.x = Math.PI / 2;
  add(rbox(0.085, 0.075, 0.035, 0.01, 2), M('#7a3a22', { roughness: 0.5 }), -0.36, 0.06, 0.04, door);
  add(B(0.018, 0.04, 0.02), M('#4a2414'), -0.36, 0.06, 0.06, door);
  add(rbox(0.07, 0.19, 0.012, 0.006, 2), goldM, -0.36, -0.24, 0.031, door);
  [-0.19, -0.29].forEach(y => { add(cyl(0.012, 0.012, 0.03, 12), goldM, -0.36, y, 0.05, door).rotation.x = Math.PI / 2; add(new THREE.SphereGeometry(0.02, 14, 10), goldM, -0.36, y, 0.07, door); });
  [0.78, -0.78].forEach(y => { add(cyl(0.011, 0.011, 0.11, 12), silverM, 0.47, y, 0.03, door); add(new THREE.SphereGeometry(0.012, 10, 8), silverM, 0.47, y + 0.06, 0.03, door); });
  add(cyl(0.05, 0.05, 0.012, 20), goldM, 0.36, 0.02, -0.031, door).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.034, 16, 12), goldM, 0.36, 0.02, -0.06, door);
  tag(door, 'door-out');
  const entryL = new THREE.PointLight('#ffcf8a', 0, 7, 1.6); entryL.position.set(3, 2.2, 3.3); scene.add(entryL);
  const gap = add(B(0.98, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: '#ffcf8a', fog: false }), 3, 0.006, 4.22, scene, false);
  // doorbell
  const bellG = group(3.86, 1.3, 4.21);
  add(rbox(0.09, 0.14, 0.02, 0.008, 2), brass, 0, 0, 0, bellG);
  const bellBtnM = new THREE.MeshStandardMaterial({ color: '#d4af37', emissive: '#ffcf6b', emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.55, fog: false });
  const bellBtn = add(cyl(0.024, 0.024, 0.02, 20), bellBtnM, 0, -0.015, 0.015, bellG); bellBtn.rotation.x = Math.PI / 2;
  tag(bellG, 'bell');
  // nameplate
  const plateTex = canvasTex(1600, 645, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d9b977'); g.addColorStop(0.5, '#f1d899'); g.addColorStop(1, '#bc9654');
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(80,55,20,0.55)'; x.lineWidth = 12; x.strokeRect(30, 30, w - 60, h - 60);
    x.fillStyle = 'rgba(80,55,20,0.5)'; [[68, 68], [w - 68, 68], [68, h - 68], [w - 68, h - 68]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 12, 0, Math.PI * 2); x.fill(); });
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    let np = 176; do { x.font = '600 ' + np + 'px ' + FONT_D; np -= 2; } while (x.measureText('Shruti Tomar').width > w - 300);
    x.fillStyle = '#21160a'; x.fillText('Shruti Tomar', w / 2, 272);
    let rp = 104; do { x.font = '500 ' + rp + 'px ' + FONT_T; rp -= 2; } while (x.measureText('Product Designer · UX Designer').width > w - 150);
    x.fillStyle = '#140d06'; x.fillText('Product Designer · UX Designer', w / 2, 272 + 64 + rp);
  });
  plateTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  add(rbox(0.62, 0.25, 0.016, 0.005, 2), [M('#c9a25c', { roughness: 0.35, metalness: 0.5 }), M('#c9a25c', { roughness: 0.35, metalness: 0.5 }), M('#c9a25c', { roughness: 0.35, metalness: 0.5 }), M('#c9a25c', { roughness: 0.35, metalness: 0.5 }), M('#ffffff', { map: plateTex, roughness: 0.55, metalness: 0.2 }), M('#c9a25c')], 1.8, 1.5, 4.212);
  // sconce
  add(rbox(0.12, 0.2, 0.04, 0.01, 2), brass, 1.82, 2.05, 4.22);
  const sconceM = new THREE.MeshStandardMaterial({ color: '#fff3dc', emissive: '#ffc977', emissiveIntensity: 2.2, fog: false });
  add(new THREE.SphereGeometry(0.075, 16, 12), sconceM, 1.82, 2.06, 4.28);
  const sconceL = new THREE.PointLight('#ffc977', 5, 7, 1.6); sconceL.position.set(1.82, 2.1, 4.6); scene.add(sconceL);
  const corrL = new THREE.PointLight('#ffe2b8', 3, 8, 1.6); corrL.position.set(3, 2.8, 6.8); scene.add(corrL);
  add(B(0.9, 0.015, 0.55), M('#8c7155', { roughness: 1 }), 3, 0.008, 4.65, scene, false);
  const shelfTexLate = [];
  const matTex = canvasTex(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#efe3cf'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const word = 'WELCOME', fs = 132; x.font = '600 ' + fs + 'px ' + FONT_T;
    const sp = 30, widths = [...word].map(c => x.measureText(c).width), tot = widths.reduce((a, b) => a + b, 0) + sp * (word.length - 1);
    let cx = (w - tot) / 2; [...word].forEach((c, i) => { x.fillText(c, cx + widths[i] / 2, h / 2 + 6); cx += widths[i] + sp; });
  });
  shelfTexLate.push(matTex);
  matTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const matTxt = add(new THREE.PlaneGeometry(0.7, 0.175), new THREE.MeshStandardMaterial({ map: matTex, transparent: true, alphaTest: 0.08, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }), 3, 0.0158, 4.65, scene, false);
  matTxt.rotation.x = -Math.PI / 2; matTxt.receiveShadow = true;
  add(cyl(0.18, 0.14, 0.36), terracotta, 4.6, 0.18, 4.6);
  for (let i = 0; i < 9; i++) {
    const a = i * 1.8, sx = 4.6 + Math.cos(a) * 0.08, sz = 4.6 + Math.sin(a) * 0.08, sh = 0.3 + (i % 3) * 0.04;
    add(cyl(0.004, 0.004, sh, 5), M('#5a7a3a'), sx, 0.18 + sh / 2, sz).rotation.set(Math.sin(i) * 0.08, 0, Math.cos(i) * 0.08);
    [0, 2.094, 4.188].forEach(off => {
      const l = add(new THREE.IcosahedronGeometry(0.045, 0), (i + off) % 2 ? leaf : leaf2, sx + Math.cos(a + off) * 0.032, 0.18 + sh + 0.01, sz + Math.sin(a + off) * 0.032);
      l.scale.set(1, 0.28, 0.85); l.rotation.set(1.2, a + off, 0.3);
    });
  }

  /* ---------- living area ---------- */
  const rug = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#e6dccb'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? 'rgba(255,250,240,0.35)' : 'rgba(150,128,100,0.12)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.4, 0, Math.PI * 2); x.fill(); }
  });
  rug.wrapS = rug.wrapT = THREE.RepeatWrapping; rug.repeat.set(3, 2.4);
  add(rbox(3.3, 0.028, 2.5, 0.012, 3), M('#ffffff', { map: rug, roughness: 1 }), -2, 0.014, -1.6, scene, false).receiveShadow = true;
  // sofa
  const velvet = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c4632a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? 'rgba(90,35,10,0.16)' : 'rgba(240,160,100,0.12)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.2, 0, Math.PI * 2); x.fill(); } });
  velvet.wrapS = velvet.wrapT = THREE.RepeatWrapping; velvet.repeat.set(2, 2);
  const sofa = group(-2, 0, -0.3), fabric = M('#ffffff', { map: velvet, roughness: 0.92 }), fabric2 = M('#f2e2d6', { map: velvet, roughness: 0.92 }), tuftM = M('#7d3712', { roughness: 0.7 });
  add(rbox(2.2, 0.26, 0.9, 0.05), fabric, 0, 0.24, 0.02, sofa);
  [-0.72, 0, 0.72].forEach(x => add(rbox(0.71, 0.15, 0.72, 0.06), fabric2, x, 0.44, -0.07, sofa));
  add(rbox(2.2, 0.56, 0.24, 0.08), fabric, 0, 0.67, 0.34, sofa);
  const roll = add(cyl(0.1, 0.1, 2.2, 20), fabric, 0, 0.93, 0.37, sofa); roll.rotation.z = Math.PI / 2;
  const bumpG = new THREE.SphereGeometry(0.13, 14, 10);
  [[0.62, [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]], [0.8, [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]]].forEach(([y, xs]) => xs.forEach(x => { const b = add(bumpG, fabric, x, y, 0.235, sofa); b.scale.set(1.12, 0.72, 0.28); }));
  [[0.71, [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]], [0.53, [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]], [0.89, [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]]].forEach(([y, xs]) => xs.forEach(x => add(new THREE.SphereGeometry(0.016, 10, 8), tuftM, x, y, 0.225, sofa, false)));
  [-1, 1].forEach(sx => {
    add(rbox(0.24, 0.48, 0.9, 0.06), fabric, sx * 1.16, 0.4, 0.02, sofa);
    const ar = add(cyl(0.13, 0.13, 0.94, 22), fabric, sx * 1.17, 0.65, 0.0, sofa); ar.rotation.x = Math.PI / 2;
    add(new THREE.CircleGeometry(0.1, 20), M('#ffffff', { map: velvet, roughness: 0.92, color: '#d8c2b2' }), sx * 1.17, 0.65, -0.472, sofa, false).rotation.y = Math.PI;
    add(new THREE.SphereGeometry(0.02, 10, 8), tuftM, sx * 1.17, 0.65, -0.476, sofa, false);
  });
  [[-1.12, -0.36], [1.12, -0.36], [-1.12, 0.4], [1.12, 0.4], [0, -0.36], [0, 0.4]].forEach(([x, z]) => add(new THREE.SphereGeometry(0.05, 14, 10), walnut, x, 0.055, z, sofa));
  tag(sofa, 'sofa'); C(-3.3, -0.7, -0.82, 0.2);
  // foosball table (decorative, left corner behind the sofa)
  const fbG = group(-3.95, 0, 1.3);
  const fbWoodM = M('#5a3a22', { roughness: 0.6 }), fbFeltM = M('#2f6b3a', { roughness: 0.85 }), fbRailM = M('#caa96a', { roughness: 0.5 });
  const FB_L = 1.2, FB_W = 0.68, FB_TOPY = 0.8;
  add(B(FB_L, 0.05, FB_W), fbFeltM, 0, FB_TOPY, 0, fbG);
  add(B(FB_L + 0.06, 0.08, 0.04), fbRailM, 0, FB_TOPY + 0.03, FB_W / 2 + 0.02, fbG);
  add(B(FB_L + 0.06, 0.08, 0.04), fbRailM, 0, FB_TOPY + 0.03, -FB_W / 2 - 0.02, fbG);
  add(B(0.04, 0.08, FB_W), fbRailM, FB_L / 2 + 0.02, FB_TOPY + 0.03, 0, fbG);
  add(B(0.04, 0.08, FB_W), fbRailM, -FB_L / 2 - 0.02, FB_TOPY + 0.03, 0, fbG);
  [[-FB_L / 2 + 0.06, -FB_W / 2 + 0.06], [FB_L / 2 - 0.06, -FB_W / 2 + 0.06], [-FB_L / 2 + 0.06, FB_W / 2 - 0.06], [FB_L / 2 - 0.06, FB_W / 2 - 0.06]].forEach(([lx, lz]) => add(B(0.05, FB_TOPY, 0.05), fbWoodM, lx, FB_TOPY / 2, lz, fbG));
  const fbTeamM = [M('#d63c2a', { roughness: 0.5 }), M('#f2c230', { roughness: 0.5 })];
  [-0.46, -0.26, -0.06, 0.14, 0.34, 0.5].forEach((rx, ri) => {
    add(cyl(0.012, 0.012, FB_W + 0.08, 10), M('#c9c9c9', { roughness: 0.3, metalness: 0.6 }), rx, FB_TOPY + 0.14, 0, fbG).rotation.x = Math.PI / 2;
    const team = fbTeamM[ri % 2];
    [-0.22, -0.07, 0.07, 0.22].forEach(pz => {
      const pg = group(rx, FB_TOPY + 0.14, pz, fbG);
      add(cyl(0.012, 0.012, 0.1, 8), team, 0, 0, 0, pg);
      add(B(0.1, 0.02, 0.03), team, 0, -0.06, 0, pg);
    });
  });
  C(-4.65, -3.25, 0.86, 1.74);
  // coffee table
  const ct = group(-2, 0, -2);
  add(rbox(1.2, 0.05, 0.62, 0.02, 2), walnut, 0, 0.42, 0, ct);
  [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]].forEach(([x, z]) => add(cyl(0.02, 0.016, 0.4, 8), dark, x, 0.2, z, ct));
  add(B(0.32, 0.04, 0.24), M('#3F746E'), -0.3, 0.465, 0.05, ct); add(B(0.3, 0.035, 0.22), M('#e7d9c0'), -0.29, 0.503, 0.04, ct).rotation.y = 0.15;
  add(cyl(0.04, 0.035, 0.09, 16), cream, 0.25, 0.49, -0.05, ct);
  add(cyl(0.07, 0.06, 0.1, 14), terracotta, 0.42, 0.495, 0.12, ct); add(new THREE.IcosahedronGeometry(0.08, 0), leaf2, 0.42, 0.59, 0.12, ct);
  C(-2.62, -1.38, -2.33, -1.67);
  // tv console + tv
  const tvc = group(-2, 0, -3.73);
  add(rbox(2.2, 0.44, 0.44, 0.02, 2), walnut, 0, 0.32, 0, tvc);
  [-0.55, 0.55].forEach(x => add(B(0.004, 0.36, 0.005), dark, x, 0.32, 0.222, tvc));
  [[-1.02, -0.17], [1.02, -0.17], [-1.02, 0.17], [1.02, 0.17]].forEach(([x, z]) => add(cyl(0.02, 0.015, 0.1, 8), dark, x, 0.05, z, tvc));
  const bon = group(0.84, 0.54, 0.02, tvc), potM = M('#4a3a31', { roughness: 0.45 }), barkM = M('#5b4636', { roughness: 0.9 });
  add(rbox(0.3, 0.07, 0.18, 0.012, 2), potM, 0, 0.045, 0, bon); add(B(0.32, 0.008, 0.2), potM, 0, 0.081, 0, bon);
  [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]].forEach(([x, z]) => add(B(0.03, 0.012, 0.03), potM, x, 0.006, z, bon));
  add(B(0.27, 0.01, 0.15), M('#3a2e24', { roughness: 1 }), 0, 0.082, 0, bon, false);
  const v3b = (x, y, z) => new THREE.Vector3(x, y, z);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3b(-0.03, 0.08, 0), v3b(0.02, 0.14, 0.01), v3b(-0.02, 0.2, 0), v3b(0.03, 0.25, -0.01)]), 20, 0.018, 8), barkM, 0, 0, 0, bon);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3b(0.03, 0.25, -0.01), v3b(0.07, 0.29, 0), v3b(0.1, 0.3, 0.01)]), 12, 0.01, 6), barkM, 0, 0, 0, bon);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3b(-0.015, 0.19, 0), v3b(-0.07, 0.23, 0.01), v3b(-0.11, 0.24, 0.02)]), 12, 0.009, 6), barkM, 0, 0, 0, bon);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3b(0.02, 0.24, -0.01), v3b(0.01, 0.29, -0.01), v3b(0.0, 0.32, -0.01)]), 10, 0.008, 6), barkM, 0, 0, 0, bon);
  const padG = new THREE.IcosahedronGeometry(0.06, 1), bl1 = M('#3e6a3a', { roughness: 0.85, flatShading: true }), bl2 = M('#557f46', { roughness: 0.85, flatShading: true });
  [[0.1, 0.315, 0.01, 1.2], [-0.11, 0.255, 0.02, 1.0], [0.0, 0.345, -0.01, 1.05], [0.06, 0.3, 0.03, 0.75], [-0.06, 0.27, -0.02, 0.7]].forEach(([x, y, z, k], i) => { const p = add(padG, i % 2 ? bl2 : bl1, x, y, z, bon); p.scale.set(1.5 * k, 0.5 * k, 1.1 * k); });
  add(B(0.28, 0.05, 0.2), M('#b8643f'), -0.8, 0.565, 0, tvc); add(B(0.26, 0.04, 0.19), M('#efe3cf'), -0.8, 0.61, 0, tvc);
  C(-3.12, -0.88, -4, -3.48);
  const clockTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#f4ede0'; x.beginPath(); x.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2b2621'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r0 = big ? 200 : 214, r1 = 232; x.save(); x.translate(w / 2, h / 2); x.rotate(a); x.fillRect(big ? -5 : -1.5, -r1, big ? 10 : 3, r1 - r0); x.restore(); }
  });
  const clk = group(-0.12, 1.98, -3.985);
  add(new THREE.TorusGeometry(0.17, 0.014, 10, 48), M('#2b2621', { roughness: 0.4 }), 0, 0, 0.012, clk);
  add(cyl(0.172, 0.172, 0.02, 48), M('#2b2621', { roughness: 0.5 }), 0, 0, 0.002, clk).rotation.x = Math.PI / 2;
  add(new THREE.CircleGeometry(0.163, 48), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.8 }), 0, 0, 0.0125, clk, false);
  const handM = M('#1c1916', { roughness: 0.5 });
  const hrH = group(0, 0, 0.016, clk), mnH = group(0, 0, 0.019, clk), scH = group(0, 0, 0.022, clk);
  add(B(0.014, 0.085, 0.003), handM, 0, 0.037, 0, hrH, false); add(B(0.009, 0.125, 0.003), handM, 0, 0.055, 0, mnH, false); add(B(0.003, 0.13, 0.002), M('#b8643f'), 0, 0.05, 0, scH, false);
  add(cyl(0.008, 0.008, 0.008, 14), handM, 0, 0, 0.024, clk, false).rotation.x = Math.PI / 2;
  const updClock = () => { const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, mn = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + mn / 60; scH.rotation.z = -sec / 60 * Math.PI * 2; mnH.rotation.z = -mn / 60 * Math.PI * 2; hrH.rotation.z = -hr / 12 * Math.PI * 2; };
  add(rbox(1.68, 0.97, 0.05, 0.015, 2), black, -2, 1.45, -3.955);
  const TVW = 1280, TVH = 720;
  const tvCanvas = document.createElement('canvas'); tvCanvas.width = TVW; tvCanvas.height = TVH;
  const tvx = tvCanvas.getContext('2d');
  const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace; tvTex.anisotropy = 8;
  const tvScreen = add(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false, fog: false }), -2, 1.45, -3.927, scene, false);
  tvScreen.castShadow = false;
  // The TV screen is a standalone mesh (not part of the sofa group), so it was
  // never included in the sofa's own tag() call below and had no click target
  // at all - clicking directly on the TV did nothing. Tag it as the 'sofa'
  // hotspot so clicking the screen itself walks over and sits down/starts
  // the TV, the same way clicking the monitor already works for the desk.
  tag(tvScreen, 'sofa');
  const tvLight = new THREE.PointLight('#cfdcff', 0, 6, 1.6); tvLight.position.set(-2, 1.4, -3.2); scene.add(tvLight);
  // floor lamp
  const fl = group(-3.78, 0, -0.35);
  add(cyl(0.16, 0.17, 0.03, 20), dark, 0, 0.015, 0, fl); add(cyl(0.012, 0.012, 1.42, 8), dark, 0, 0.73, 0, fl);
  const shadeM = new THREE.MeshStandardMaterial({ color: '#f3e7d1', emissive: '#ffcf8a', emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 1, fog: false });
  add(cyl(0.17, 0.24, 0.3, 24, 1), shadeM, 0, 1.5, 0, fl).castShadow = false;
  const floorL = new THREE.PointLight('#ffc98a', 2, 6, 1.7); floorL.position.set(-3.78, 1.42, -0.35); scene.add(floorL);
  const flHit = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.7, 10), new THREE.MeshBasicMaterial({ visible: false })); flHit.position.set(0, 0.85, 0); fl.add(flHit);
  fl.traverse(m => { m.userData.item = 'lamp2'; });
  let lamp2On = true, lamp2T = 1, lamp2E = 1, lamp2Hover = false;
  C(-4.0, -3.56, -0.57, -0.13);
  // plants
  const fiddle = group(-4.45, 0, -3.45);
  add(cyl(0.22, 0.17, 0.42, 20), terracotta, 0, 0.21, 0, fiddle); add(cyl(0.02, 0.025, 1.3, 6), M('#5a4632'), 0, 1.0, 0, fiddle);
  for (let i = 0; i < 22; i++) { const a = i * 2.4, h = 0.75 + (i / 22) * 1.0, r = 0.1 + Math.sin(i) * 0.08 + 0.1; const l = add(new THREE.IcosahedronGeometry(0.13, 0), i % 3 ? leaf : leaf2, Math.cos(a) * r, h, Math.sin(a) * r, fiddle); l.scale.set(1, 0.3, 0.75); l.rotation.set(0.5, a, 0.4); }
  C(-4.75, -4.15, -3.75, -3.15);
  const snake = group(-4.5, 0, 3.4);
  add(cyl(0.17, 0.14, 0.34, 18), cream, 0, 0.17, 0, snake);
  for (let i = 0; i < 9; i++) { const l = add(B(0.06, 0.7 + (i % 3) * 0.15, 0.012), i % 2 ? leaf : leaf2, Math.cos(i * 2) * 0.06, 0.65, Math.sin(i * 2) * 0.06, snake); l.rotation.set(Math.sin(i * 3) * 0.2, i * 0.7, Math.cos(i * 2) * 0.18); }
  C(-4.75, -4.25, 3.15, 3.65);
  // posters
  const poster1 = canvasTex(600, 800, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f2c27b'); g.addColorStop(0.55, '#e0794f'); g.addColorStop(1, '#5b3d5c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fbe7b8'; x.beginPath(); x.arc(w / 2, h * 0.46, 110, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3f2a46'; x.beginPath(); x.moveTo(0, h * 0.62); for (let i = 0; i <= 10; i++) x.lineTo(i * w / 10, h * 0.6 - Math.sin(i * 1.3) * 50 - (i % 2) * 30); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.fillStyle = '#2a1d31'; x.beginPath(); x.moveTo(0, h * 0.74); for (let i = 0; i <= 8; i++) x.lineTo(i * w / 8, h * 0.72 - Math.cos(i * 1.7) * 30); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.fillStyle = '#fbe7b8'; x.font = `600 58px ${FONT_D}`; x.textAlign = 'center'; x.fillText('SOMEWHERE', w / 2, 110); x.fillText('NEW', w / 2, 170);
  });
  const hangFrame = (tex, w, h, x, y, z, ry) => {
    const g = group(x, y, z); g.rotation.y = ry;
    add(B(w + 0.06, h + 0.06, 0.03), dark, 0, 0, 0, g);
    add(new THREE.PlaneGeometry(w, h), M('#ffffff', { map: tex, roughness: 0.9 }), 0, 0, 0.017, g);
    return g;
  };
  hangFrame(poster1, 0.72, 0.96, -4.98, 1.7, -1.6, Math.PI / 2);
  // photo frames on the wall beside the front door (inside the flat, facing the room)
  // photoFrame shows `fallback` (a canvas texture) until the image loads, then crops the image to fill the frame
  const photoFrame = (url, fallback, w, h, x, y, z, ry) => {
    const g = group(x, y, z); g.rotation.y = ry;
    add(B(w + 0.08, h + 0.08, 0.035), dark, 0, 0, 0, g);
    add(B(w + 0.02, h + 0.02, 0.004), M('#f4efe6', { roughness: 0.9 }), 0, 0, 0.019, g, false);
    const mat = new THREE.MeshStandardMaterial({ map: fallback, roughness: 0.85 });
    add(new THREE.PlaneGeometry(w, h), mat, 0, 0, 0.022, g, false);
    new THREE.TextureLoader().load(url, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const ia = t.image.width / t.image.height, fa = w / h;
      if (ia > fa) { t.repeat.set(fa / ia, 1); t.offset.set((1 - fa / ia) / 2, 0); } else { t.repeat.set(1, ia / fa); t.offset.set(0, (1 - ia / fa) / 2); }
      mat.map = t; mat.needsUpdate = true;
    }, undefined, () => {});
    return g;
  };
  const softTex = canvasTex(380, 500, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efe7da'); g.addColorStop(1, '#dccfb9'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  // photo collage: staggered sizes and heights so the wall reads as a gallery wall
  const FRAME_Z = 3.975, FRAME_RY = Math.PI;
  [
    ['./assets/shruti-photo-v2.webp', 0.46, 0.61, 1.05, 1.82],
    ['./assets/wall-photo-boat.jpg', 0.58, 0.74, 0.12, 1.62],
    ['./assets/wall-photo-beach.jpg', 0.44, 0.59, -0.92, 1.9],
    ['./assets/sofa-wall-photo.webp', 0.5, 0.66, -1.92, 1.68]
  ].forEach(([url, w, h, x, y]) => photoFrame(url, softTex, w, h, x, y, FRAME_Z, FRAME_RY));
  // ceiling lights
  const ceilM = new THREE.MeshStandardMaterial({ color: '#fff7e8', emissive: '#ffe4bd', emissiveIntensity: 1.5, fog: false });
  const ceilLights = [[-2, -1.6], [2.6, 0.4], [2.8, 3.0]].map(([x, z]) => {
    add(new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ceilM, x, 3.0, z, scene, false).rotation.x = Math.PI;
    const l = new THREE.PointLight('#ffe2b8', 4, 9, 1.4); l.position.set(x, 2.75, z); scene.add(l); return l;
  });

  /* ---------- workstation ---------- */
  const desk = group(3, 0, -3.5);
  add(rbox(2.0, 0.05, 0.78, 0.015, 2), walnut, 0, 0.75, 0, desk);
  [-0.94, 0.94].forEach(x => add(B(0.04, 0.73, 0.7), dark, x, 0.365, 0, desk));
  add(B(1.84, 0.12, 0.02), dark, 0, 0.66, -0.3, desk);
  add(B(0.24, 0.012, 0.18), dark, 0, 0.781, -0.12, desk); add(B(0.05, 0.36, 0.03), dark, 0, 0.95, -0.15, desk);
  add(rbox(0.92, 0.56, 0.035, 0.01, 2), M('#1b1a19', { roughness: 0.4 }), 0, 1.2, -0.12, desk);
  const MW = 1024, MH = 596;
  const monTex = canvasTex(MW, MH, (x, w, h) => { x.fillStyle = '#EAE0D1'; x.fillRect(0, 0, w, h); });
  monTex.anisotropy = 8;
  // Draws the same layout the full-screen carousel uses (same window size, same card math), letterboxed into the screen.
  const cardCv = document.createElement('canvas'); cardCv.width = 560; cardCv.height = 422 + 110;
  const VIS = [
    { title: 'Arth', vis: 'arth', cols: ['#5b3fd0', '#3f229e', '#7d68dc'], glow: [0.7, 0.2, 'rgba(143,120,238,0.9)'] },
    { title: 'PropVR Website', vis: 'browser', cols: ['#1d1e23', '#121317'], glow: [0.8, 1, 'rgba(183,159,120,0.35)'] },
    { title: 'Kiosk Experience', vis: 'dial', cols: ['#2c2a28', '#1b1a19'], glow: [0.5, 0.4, 'rgba(74,70,67,0.9)'] }
  ];
  const monScratch = document.createElement('canvas');
  let monChrome = false; // desk-only labels (Esc pill, Scroll) drawn on the screen
  function drawMon() {
    const x = monTex.image.getContext('2d'), w = MW, h = MH;
    const rr = (c, px, py, pw, ph, r) => { c.beginPath(); c.moveTo(px + r, py); c.arcTo(px + pw, py, px + pw, py + ph, r); c.arcTo(px + pw, py + ph, px, py + ph, r); c.arcTo(px, py + ph, px, py, r); c.arcTo(px, py, px + pw, py, r); c.closePath(); };
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#EAE0D1'; x.fillRect(0, 0, w, h);
    const Wv = Math.max(320, window.innerWidth), Hv = Math.max(320, window.innerHeight), f = Math.min(w / Wv, h / Hv);
    // Work screen: the centred hero until the visitor has scrolled down to the carousel (stage 3)
    const HB = window.WorkHero, stage = HB ? (window.__heroStage == null ? 3 : window.__heroStage) : 3;
    if (stage >= 3) { if (window.CarouselRender) { const ox = (w - Wv * f) / 2, oy = (h - Hv * f) / 2; window.CarouselRender.draw(x, Wv, Hv, 0, 0, { dpr: 1, place: [f, ox, oy], titles: true, scratch: monScratch }); } }
    else { x.setTransform(f, 0, 0, f, (w - Wv * f) / 2, (h - Hv * f) / 2); HB.draw(x, Wv, Hv, stage); }
    x.setTransform(f, 0, 0, f, (w - Wv * f) / 2, (h - Hv * f) / 2);
    const fs = Math.max(14, Math.min(19, Wv / 76)), top = 3.6 * fs, drumH = Math.max(12 * fs, Hv - 7.4 * fs);
    const Wc = Math.min(Wv * 0.46, drumH * 0.66 * (560 / 422)), k = Wc / 560, S = Wc * 0.93, cx = Wv / 2, cy = top + 0.44 * drumH;
    if (monChrome && stage >= 3) { x.font = '400 ' + (0.8 * fs).toFixed(2) + 'px ' + FONT_T; x.fillStyle = '#765B4B'; x.textAlign = 'center'; x.textBaseline = 'bottom'; x.fillText('Scroll', cx, Hv - 1.6 * fs); x.textAlign = 'left'; }
    x.setTransform(1, 0, 0, 1, 0, 0); monTex.needsUpdate = true;
  }
  drawMon();
  { let rzT = 0; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(drawMon, 150); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawMon);
  ['[data-arth-thumb]', '[data-propvr-thumb]', '[data-exp-thumb]', '[data-dial-thumb]'].forEach(sel => { const el = document.querySelector(sel); if (el && !el.complete) el.addEventListener('load', drawMon, { once: true }); else if (el) drawMon(); });
  const monScreen = add(new THREE.PlaneGeometry(0.86, 0.5), new THREE.MeshBasicMaterial({ map: monTex, toneMapped: false, fog: false, side: THREE.DoubleSide }), 0, 1.2, -0.1, desk, false);
  const keyTex = canvasTex(512, 160, (x, w, h) => { x.fillStyle = '#2b2826'; x.fillRect(0, 0, w, h); x.fillStyle = '#e9e2d6'; for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) x.fillRect(8 + k * 35.6, 8 + r * 37, 31, 32); x.fillRect(120, 8 + 4 * 37 - 4, 260, 0); });
  add(rbox(0.44, 0.018, 0.14, 0.006, 2), M('#ffffff', { map: keyTex, roughness: 0.6 }), 0, 0.785, 0.2, desk);
  add(rbox(0.06, 0.025, 0.1, 0.012, 2), M('#e9e2d6'), 0.36, 0.787, 0.22, desk);
  const mug = group(-0.68, 0.775, 0.22, desk);
  add(cyl(0.042, 0.038, 0.1, 20), M('#efe3cf'), 0, 0.05, 0, mug); add(new THREE.CircleGeometry(0.038, 20), M('#3b2414'), 0, 0.095, 0, mug).rotation.x = -Math.PI / 2;
  add(new THREE.TorusGeometry(0.026, 0.008, 8, 16), M('#efe3cf'), 0.045, 0.05, 0, mug).rotation.y = Math.PI / 2;
  const nb = add(B(0.22, 0.015, 0.29), M('#efe3cf'), -0.46, 0.783, 0.05, desk); nb.rotation.y = 0.25;
  add(B(0.22, 0.016, 0.02), M('#3F746E'), -0.46, 0.784, -0.09, desk).rotation.y = 0.25;
  add(cyl(0.005, 0.005, 0.15, 6), M('#d23a2c'), -0.33, 0.795, 0.08, desk).rotation.set(Math.PI / 2, 0, 0.6);
  // desk lamp
  const dl = group(0.78, 0.775, -0.12, desk);
  const lampY = M('#d9a43b', { roughness: 0.5 });
  add(cyl(0.08, 0.09, 0.025, 20), lampY, 0, 0.012, 0, dl);
  const a1 = add(cyl(0.01, 0.01, 0.4, 8), dark, 0, 0.2, 0.05, dl); a1.rotation.x = 0.25;
  const a2 = add(cyl(0.01, 0.01, 0.34, 8), dark, 0, 0.47, 0.18, dl); a2.rotation.x = -1.0;
  const shade = add(cyl(0.035, 0.1, 0.13, 20, 1), new THREE.MeshStandardMaterial({ color: '#d9a43b', side: THREE.DoubleSide, roughness: 0.5, fog: false }), 0, 0.5, 0.33, dl); shade.rotation.x = 0.5;
  const deskL = new THREE.PointLight('#ffcf8a', 2.5, 3.5, 1.6); deskL.position.set(3.78, 1.15, -3.15); scene.add(deskL);
  const dlHit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.75, 10), new THREE.MeshBasicMaterial({ visible: false })); dlHit.position.set(0, 0.3, 0.1); dl.add(dlHit);
  dl.traverse(m => { m.userData.item = 'lamp3'; });
  add(cyl(0.06, 0.05, 0.09, 14), terracotta, -0.86, 0.82, -0.25, desk); for (let i = 0; i < 5; i++) add(new THREE.IcosahedronGeometry(0.045, 0), leaf2, -0.86 + Math.cos(i * 1.3) * 0.04, 0.9 + (i % 2) * 0.03, -0.25 + Math.sin(i * 1.3) * 0.04, desk);
  // sticky notes on the wall right of window
  [['#f2d16b', 4.62, 1.95, 0.08], ['#f0a3a3', 4.8, 1.8, -0.1], ['#9fd3c9', 4.66, 1.62, 0.05], ['#f2d16b', 4.82, 1.5, 0.12]].forEach(([c, x, y, r]) => { const n = add(new THREE.PlaneGeometry(0.12, 0.12), M(c, { roughness: 1 }), x, y, -3.995, scene, false); n.rotation.z = r; });
  tag(desk, 'desk'); C(1.98, 4.02, -3.92, -3.08);
  // chair
  const ch = group(3, 0, -2.62); ch.rotation.y = 0.12;
  add(rbox(0.5, 0.07, 0.48, 0.03), dark, 0, 0.47, 0, ch); add(rbox(0.48, 0.52, 0.06, 0.03), dark, 0, 0.82, 0.22, ch);
  add(cyl(0.025, 0.025, 0.38, 8), M('#8a8580', { metalness: 0.6, roughness: 0.3 }), 0, 0.26, 0, ch);
  for (let i = 0; i < 5; i++) { const leg = add(B(0.03, 0.025, 0.28), M('#8a8580', { metalness: 0.6, roughness: 0.3 }), Math.sin(i * 1.2566) * 0.14, 0.05, Math.cos(i * 1.2566) * 0.14, ch); leg.rotation.y = i * 1.2566; }
  C(2.72, 3.28, -2.92, -2.32);
  /* ---------- display shelf: ONE unit, 6 open compartments + 3 closed cabinets ---------- */
  const SH = group(4.8, 0, 1.7); SH.rotation.y = -Math.PI / 2;
  const metal = M('#1d1c1b', { roughness: 0.45, metalness: 0.55 });
  const oak = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#d6a36a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(120,70,30,' + (0.05 + Math.random() * 0.08) + ')'; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * h; x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + Math.random() * 10 - 5, w * 0.6, y + Math.random() * 10 - 5, w, y + Math.random() * 8 - 4); x.stroke(); } });
  const oakM = M('#ffffff', { map: oak, roughness: 0.62 });
  const HW = 0.85, HD = 0.19, TT = 0.022;
  const post = (x, y0, y1) => [-HD, HD].forEach(z => add(B(TT, y1 - y0, TT), metal, x, (y0 + y1) / 2, z, SH));
  const railX = (x0, x1, y) => [-HD, HD].forEach(z => add(B(x1 - x0, TT, TT), metal, (x0 + x1) / 2, y, z, SH));
  const railZ = (x, y) => add(B(TT, TT, HD * 2), metal, x, y, 0, SH);
  const board = (x0, x1, y) => add(B(x1 - x0 - 0.012, 0.022, HD * 2 - 0.012), oakM, (x0 + x1) / 2, y + 0.011, 0, SH);
  [-HW, HW].forEach(x => post(x, 0, 2.1)); railX(-HW, HW, 2.1); railZ(-HW, 2.1); railZ(HW, 2.1);
  [0.04, 0.55, 1.05].forEach(y => { railX(-HW, HW, y); railZ(-HW, y); railZ(HW, y); board(-HW, HW, y); });
  railX(-0.1, HW, 1.6); board(-0.1, HW, 1.6);
  post(-0.1, 1.05, 2.1); post(0.38, 1.05, 1.6); post(0.05, 0.55, 1.05); post(-0.283, 0.04, 0.55); post(0.283, 0.04, 0.55);
  [[-0.1, 2.1], [-0.1, 1.6], [-0.1, 1.05], [0.38, 1.6], [0.38, 1.05], [0.05, 1.05], [0.05, 0.55], [-0.283, 0.55], [0.283, 0.55]].forEach(([x, y]) => railZ(x, y));
  // compartment A: wood-lined box
  add(B(0.73, 0.98, 0.014), oakM, -0.475, 1.56, -HD + 0.012, SH); add(B(0.014, 0.98, 0.36), oakM, -0.832, 1.56, 0, SH); add(B(0.014, 0.98, 0.36), oakM, -0.118, 1.56, 0, SH); add(B(0.73, 0.014, 0.36), oakM, -0.475, 2.045, 0, SH);
  // three closed cabinets
  add(B(1.68, 0.5, 0.012), oakM, 0, 0.3, -HD + 0.01, SH);
  [-0.567, 0, 0.567].forEach(x => { add(rbox(0.54, 0.47, 0.02, 0.004, 2), oakM, x, 0.3, HD - 0.012, SH); add(rbox(0.09, 0.016, 0.022, 0.004, 2), M('#8a5a32', { roughness: 0.5 }), x, 0.49, HD + 0.004, SH); });
  C(4.58, 5, 0.83, 2.57);
  const FE = 0.572, FC = 1.072, FB = 1.622; // compartment floor heights
  const shelfPick = [], shelfTex = [];
  const markItem = (obj, id) => { obj.traverse(m => { m.userData.item = id; }); shelfPick.push(obj); };
  const movers = [];
  const mover = (obj, poses, dur) => { const o0 = poses[0]; const ps = poses.map(p => ({ x: o0.x, y: o0.y, z: o0.z, rx: 0, ry: 0, rz: 0, ...p })); const m = { obj, poses: ps, dur, t: 0, target: 0, hover: 0, hovered: false, prev: 0 }; movers.push(m); poseMover(m); return m; };
  function poseMover(m) { const ps = m.poses, n = ps.length - 1, f = clamp(m.t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = sstep(0, 1, f - i), a = ps[i], b = ps[i + 1]; const L = k => a[k] + (b[k] - a[k]) * u; m.obj.position.set(L('x'), L('y'), L('z') + m.hover * 0.014); m.obj.rotation.set(L('rx'), L('ry'), L('rz')); }
  // E: six books, spines facing out
  const BOOKS = [
    { t: 'Start with Why', a: 'Simon Sinek', bg: '#f4f1ea', ink: '#1b1b1b', acc: '#e2492d', th: 0.044, h: 0.235, d: 0.155 },
    { t: 'The Almanack of Naval Ravikant', a: 'Eric Jorgenson', bg: '#e7eef3', ink: '#1d2b45', acc: '#c9a24a', th: 0.038, h: 0.228, d: 0.152 },
    { t: 'The Design of Everyday Things', a: 'Don Norman', bg: '#d63c2a', ink: '#ffffff', acc: '#1b1b1b', th: 0.05, h: 0.232, d: 0.155 },
    { t: 'Zero to One', a: 'Peter Thiel', bg: '#2d6cb4', ink: '#ffffff', acc: '#9fd3f2', th: 0.036, h: 0.24, d: 0.16 },
    { t: 'The 5 AM Club', a: 'Robin Sharma', bg: '#f2a531', ink: '#2a1a0a', acc: '#ffffff', th: 0.048, h: 0.235, d: 0.155 },
    { t: 'The Boy, the Mole, the Fox and the Horse', a: 'Charlie Mackesy', bg: '#f3ece0', ink: '#3d2a1a', acc: '#7aa0b8', th: 0.034, h: 0.255, d: 0.2 }
  ];
  const pagesTex = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#f3ead6'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 2) { x.fillStyle = 'rgba(150,130,100,' + (0.08 + Math.random() * 0.1) + ')'; x.fillRect(i, 0, 1, h); } });
  const fitFont = (x, text, weight, fam, maxW, maxPx) => { let px = maxPx; do { x.font = weight + ' ' + px + 'px ' + fam; px -= 1; } while (x.measureText(text).width > maxW && px > 8); return px + 1; };
  const books = BOOKS.map((bk, i) => {
    const cw = 720 * bk.th / bk.h;
    const spine = canvasTex(Math.round(Math.max(96, cw * 1.6)), 1152, (x, w, h) => {
      x.fillStyle = bk.bg; x.fillRect(0, 0, w, h); x.fillStyle = bk.acc; x.fillRect(0, 40, w, 10); x.fillRect(0, h - 50, w, 10);
      x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 2); x.textAlign = 'left'; x.textBaseline = 'middle';
      const L = h * 0.86, x0 = -L / 2; const twoLine = bk.t.length > 24;
      const aW = L * 0.26; x.fillStyle = bk.ink;
      if (twoLine) { const parts = bk.t.split(', '); const l1 = parts[0] + ',', l2 = parts.slice(1).join(', '); const px = Math.min(fitFont(x, l1, 600, FONT_D, L * 0.68, w * 0.34), fitFont(x, l2, 600, FONT_D, L * 0.68, w * 0.34)); x.font = '600 ' + px + 'px ' + FONT_D; x.fillText(l1, x0, -px * 0.55); x.fillText(l2, x0, px * 0.55); }
      else { fitFont(x, bk.t, 600, FONT_D, L * 0.68, w * 0.56); x.fillText(bk.t, x0, 0); }
      const ap = fitFont(x, bk.a, 500, FONT_T, aW, w * 0.3); x.font = '500 ' + ap + 'px ' + FONT_T; x.textAlign = 'right'; x.globalAlpha = 0.85; x.fillText(bk.a, L / 2, 0); x.restore();
    });
    const cover = canvasTex(512, Math.round(512 * bk.h / bk.d), (x, w, h) => {
      x.fillStyle = bk.bg; x.fillRect(0, 0, w, h); x.fillStyle = bk.acc;
      if (i === 0) { x.beginPath(); x.arc(w * 0.5, h * 0.42, w * 0.3, 0, Math.PI * 2); x.fill(); }
      else if (i === 3) { x.fillRect(w * 0.12, h * 0.36, w * 0.76, 6); x.beginPath(); x.arc(w * 0.62, h * 0.36, 26, 0, Math.PI * 2); x.fill(); }
      else if (i === 4) { const g = x.createRadialGradient(w / 2, h * 0.75, 10, w / 2, h * 0.75, w * 0.6); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, 'rgba(255,243,196,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
      else if (i === 5) { x.strokeStyle = bk.acc; x.lineWidth = 6; x.beginPath(); x.arc(w * 0.5, h * 0.62, w * 0.22, 0, Math.PI * 2); x.stroke(); }
      else { x.fillRect(w * 0.1, h * 0.1, w * 0.8, 8); x.fillRect(w * 0.1, h * 0.9, w * 0.8, 8); }
      x.fillStyle = bk.ink; x.textAlign = 'center';
      const lines = []; x.font = '600 64px ' + FONT_D; bk.t.split(' ').forEach(wd => { const l = lines.length ? lines[lines.length - 1] : null; if (l !== null && x.measureText(l + ' ' + wd).width < w * 0.8) lines[lines.length - 1] = l + ' ' + wd; else lines.push(wd); });
      const fs = lines.length > 4 ? 48 : 64; x.font = '600 ' + fs + 'px ' + FONT_D;
      const y0 = i === 0 ? h * 0.42 - (lines.length - 1) * fs * 0.55 : h * 0.2;
      if (i === 0) x.fillStyle = '#ffffff';
      lines.forEach((l, k) => x.fillText(l, w / 2, y0 + k * fs * 1.1 + fs * 0.35));
      x.fillStyle = bk.ink; x.font = '500 30px ' + FONT_T; x.fillText(bk.a.toUpperCase(), w / 2, h * 0.86);
    });
    shelfTex.push(spine, cover);
    const cM = M(bk.bg, { roughness: 0.6 }), sM = M('#ffffff', { map: spine, roughness: 0.55 }), fM = M('#ffffff', { map: cover, roughness: 0.55 }), pM = M('#ffffff', { map: pagesTex, roughness: 0.9 });
    const g = new THREE.Group(); SH.add(g);
    add(B(bk.th, bk.h, 0.004), [cM, cM, cM, cM, sM, cM], 0, 0, bk.d / 2 - 0.002, g);
    add(B(0.004, bk.h, bk.d), [fM, cM, cM, cM, cM, cM], bk.th / 2 - 0.002, 0, 0, g);
    add(B(0.004, bk.h, bk.d), cM, -bk.th / 2 + 0.002, 0, 0, g);
    add(B(bk.th - 0.008, bk.h - 0.008, bk.d - 0.006), pM, 0, 0, -0.003, g);
    return { g, mats: [cM, sM, fM] };
  });
  { let x = -0.79; books.forEach((b, i) => { const bk = BOOKS[i]; const ox = x + bk.th / 2, oy = FE + bk.h / 2 + 0.001, oz = HD - bk.d / 2 - 0.012; x += bk.th + 0.004;
      b.m = mover(b.g, [{ x: ox, y: oy, z: oz }, { z: oz + 0.25, y: oy + 0.02 }, { x: ox + 0.04, z: oz + 0.37, y: oy + 0.05, ry: -Math.PI / 2 }], 1.0); markItem(b.g, 'book:' + i); }); }
  // F: three albums + record player
  const ALBUMS = [
    { t: 'Midnights', a: 'Taylor Swift', bg: '#e5762a', bg2: '#1e8c86', ink: '#fff7e8' },
    { t: 'Coke Studio', a: 'Various Artists', bg: '#151019', bg2: '#c08bff', ink: '#f5ecdc' },
    { t: 'Blackbird', a: 'The Beatles', bg: '#efe9dc', bg2: '#111111', ink: '#111111' }
  ];
  const AS = 0.29, AT = 0.03;
  const albCover = (al, i) => canvasTex(512, 512, (x, w, h) => {
    if (i === 0) { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, al.bg); g.addColorStop(1, al.bg2); x.fillStyle = g; x.fillRect(0, 0, w, h); for (let k = 0; k < 140; k++) { x.fillStyle = 'rgba(255,240,210,' + Math.random() * 0.8 + ')'; const r = Math.random() * 2.5 + 0.5; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); x.fill(); } }
    else if (i === 1) { x.fillStyle = al.bg; x.fillRect(0, 0, w, h); const g = x.createRadialGradient(w / 2, h * 0.45, 60, w / 2, h * 0.45, 200); g.addColorStop(0, 'rgba(192,139,255,0)'); g.addColorStop(0.55, 'rgba(192,139,255,0.9)'); g.addColorStop(0.62, 'rgba(255,214,150,0.9)'); g.addColorStop(0.75, 'rgba(192,139,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    else { x.fillStyle = al.bg; x.fillRect(0, 0, w, h); x.fillStyle = al.bg2; x.beginPath(); x.moveTo(w * 0.22, h * 0.5); x.quadraticCurveTo(w * 0.4, h * 0.28, w * 0.55, h * 0.44); x.quadraticCurveTo(w * 0.68, h * 0.22, w * 0.82, h * 0.3); x.quadraticCurveTo(w * 0.66, h * 0.42, w * 0.6, h * 0.55); x.quadraticCurveTo(w * 0.45, h * 0.6, w * 0.22, h * 0.5); x.fill(); }
    x.fillStyle = al.ink; x.textAlign = 'left'; x.font = '600 ' + (al.t.length > 12 ? 46 : 76) + 'px ' + FONT_D; x.fillText(al.t, 34, h - 92); x.font = '500 28px ' + FONT_T; x.fillText(al.a.toUpperCase(), 36, h - 46);
  });
  const albums = ALBUMS.map((al, i) => {
    const cv = albCover(al, i);
    const sp = canvasTex(64, 620, (x, w, h) => { x.fillStyle = i === 2 ? '#e6dfd0' : al.bg; x.fillRect(0, 0, w, h); x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 2); x.fillStyle = al.ink; x.textBaseline = 'middle'; x.textAlign = 'center'; const txt = al.a + ' — ' + al.t; fitFont(x, txt, 600, FONT_T, h * 0.9, 30); x.fillText(txt, 0, 0); x.restore(); });
    shelfTex.push(cv, sp);
    const eM = M(i === 2 ? '#e6dfd0' : al.bg, { roughness: 0.5 });
    const g = new THREE.Group(); SH.add(g);
    add(B(AT, AS, AS), [M('#ffffff', { map: cv, roughness: 0.45 }), eM, eM, eM, M('#ffffff', { map: sp, roughness: 0.5 }), eM], 0, 0, 0, g);
    return { g, al };
  });
  const PX = 0.62, PB = FE + 0.065; // player centre & top of base
  const placedY = PB + 0.014 + AS / 2;
  albums.forEach((a, i) => { const ox = 0.1 + i * (AT + 0.006), oy = FE + AS / 2 + 0.001, oz = HD - AS / 2 - 0.03;
    a.m = mover(a.g, [{ x: ox, y: oy, z: oz }, { z: oz + 0.3, y: oy + 0.02 }, { x: ox + 0.12, z: oz + 0.38, y: oy + 0.06, ry: -Math.PI / 2 }, { x: PX, y: placedY + 0.09, z: 0.25, ry: -Math.PI / 2 }, { x: PX, y: placedY, z: -0.115, ry: -Math.PI / 2, rz: 0.12 }], 2.2);
    markItem(a.g, 'album:' + i); });
  const player = new THREE.Group(); SH.add(player);
  add(rbox(0.34, 0.065, 0.3, 0.01, 2), M('#7a5232', { roughness: 0.5 }), PX, FE + 0.0325, 0, player);
  add(B(0.32, 0.004, 0.28), M('#2b2826', { roughness: 0.6 }), PX, PB + 0.002, 0, player);
  add(cyl(0.112, 0.112, 0.01, 40), silverM, PX - 0.03, PB + 0.009, 0.04, player);
  let recCol = '#d9a43b';
  const recTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#121212'; x.beginPath(); x.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.07)'; for (let r = 40; r < 126; r += 4) { x.beginPath(); x.arc(w / 2, h / 2, r, 0, Math.PI * 2); x.stroke(); } x.fillStyle = recCol; x.beginPath(); x.arc(w / 2, h / 2, 36, 0, Math.PI * 2); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(w / 2, h / 2, 4, 0, Math.PI * 2); x.fill(); });
  const record = add(new THREE.CircleGeometry(0.106, 48), new THREE.MeshStandardMaterial({ map: recTex, roughness: 0.35, fog: false }), PX - 0.03, PB + 0.0145, 0.04, player, false); record.rotation.x = -Math.PI / 2;
  const arm = add(cyl(0.004, 0.004, 0.17, 8), silverM, PX + 0.11, PB + 0.03, 0.02, player); arm.rotation.x = Math.PI / 2; arm.rotation.z = 0.3;
  add(cyl(0.014, 0.016, 0.03, 12), silverM, PX + 0.125, PB + 0.017, -0.06, player);
  const btnM = new THREE.MeshStandardMaterial({ color: '#efe7d8', emissive: '#000000', roughness: 0.4, fog: false });
  add(cyl(0.012, 0.012, 0.008, 16), btnM, PX + 0.13, PB + 0.006, 0.11, player);
  add(B(0.3, 0.018, 0.02), M('#1d1c1b', { roughness: 0.4 }), PX, PB + 0.009, -0.125, player);
  markItem(player, 'player');
  // B (top): photo frame
  const PW = 0.199, PH = 0.259; // fills the frame's inner opening (0.205 x 0.265 liner) with a 3 mm black lip
  const photoTex = canvasTex(380, 500, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efe7da'); g.addColorStop(1, '#dccfb9'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#b9a888'; x.beginPath(); x.arc(w / 2, h * 0.4, 62, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(w / 2, h * 0.86, 120, 90, 0, Math.PI, 0); x.fill(); x.fillStyle = '#5e5244'; x.textAlign = 'center'; x.font = '500 28px ' + FONT_T; x.fillText('Your photo', w / 2, h - 30); });
  shelfTex.push(photoTex);
  const photoM = new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.92, metalness: 0, fog: false });
  // headphones resting on the shelf, in place of the photo frame
  const hpM = M('#2b2621', { roughness: 0.5 }), hpCushM = M('#8a8580', { roughness: 0.75 });
  const hp = group(0.24, FB + 0.012, -0.02, SH);
  add(new THREE.TorusGeometry(0.095, 0.011, 10, 28, Math.PI), hpM, 0, 0.1, 0, hp);
  [-0.095, 0.095].forEach(hx => {
    const cup = group(hx, 0.1, 0, hp);
    add(cyl(0.012, 0.012, 0.05, 10), hpM, 0, -0.02, 0, cup);
    add(cyl(0.042, 0.042, 0.03, 20), hpM, 0, -0.065, 0, cup).rotation.x = Math.PI / 2;
    add(cyl(0.034, 0.034, 0.018, 20), hpCushM, 0, -0.065, hx > 0 ? 0.018 : -0.018, cup).rotation.x = Math.PI / 2;
  });
  let photoLoaded = null;
  function setPhoto(url) {
    if (!url || url === photoLoaded) return; photoLoaded = url;
    new THREE.TextureLoader().load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; const ia = t.image.width / t.image.height, pa = PW / PH; t.repeat.set(1, 1); t.offset.set(0, 0); if (ia > pa) { t.repeat.x = pa / ia; t.offset.x = (1 - t.repeat.x) / 2; } else { t.repeat.y = ia / pa; t.offset.y = (1 - t.repeat.y) / 2; } photoM.map = t; photoM.needsUpdate = true; o.onPhoto && o.onPhoto('ok'); }, undefined, () => { photoLoaded = null; o.onPhoto && o.onPhoto('error'); });
  }
  setPhoto('./assets/shruti-photo-v2.webp'); // guaranteed default so the frame never shows the placeholder
  // A: money plant in a ceramic vase
  const vase = add(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.078, 0.05], [0.072, 0.14], [0.046, 0.19], [0.04, 0.215], [0.047, 0.23]].map(([a, b]) => new THREE.Vector2(a, b)), 32), M('#f0ebe1', { roughness: 0.3 }), -0.475, FC, 0, SH);
  add(cyl(0.0765, 0.0775, 0.03, 32, 1), M('#3F746E', { roughness: 0.35 }), -0.475, FC + 0.08, 0, SH);
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(0.034, 0.008, 0.04, 0.05, 0, 0.078); leafShape.bezierCurveTo(-0.04, 0.05, -0.034, 0.008, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 8); const leafMs = ['#4f8a3f', '#6aa84f', '#86b85e', '#3f7434'].map(c => M(c, { roughness: 0.6, side: THREE.DoubleSide }));
  const vineM = M('#5a7a3a');
  const vines = [[[0, 0.23, 0], [-0.05, 0.4, 0.02], [-0.12, 0.6, 0.04], [-0.1, 0.78, 0.02]], [[0, 0.23, 0], [0.06, 0.38, 0.03], [0.14, 0.52, 0.05], [0.2, 0.66, 0.02]], [[0, 0.23, 0], [0.05, 0.25, 0.08], [0.12, 0.15, 0.13], [0.18, 0.02, 0.15]], [[0, 0.23, 0], [-0.05, 0.24, 0.08], [-0.13, 0.12, 0.14], [-0.2, 0.0, 0.15]], [[0, 0.23, 0], [0.0, 0.42, -0.05], [0.04, 0.62, -0.08]]];
  vines.forEach((pts, vi) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([a, b, c]) => new THREE.Vector3(-0.475 + a, FC + b, c)));
    add(new THREE.TubeGeometry(curve, 24, 0.003, 5), vineM, 0, 0, 0, SH, false);
    const n = 6 + (vi % 2);
    for (let k = 1; k <= n; k++) { const p = curve.getPoint(k / (n + 0.4)), tg = curve.getTangent(k / (n + 0.4)); const l = add(leafGeo, leafMs[(k + vi) % 4], p.x, p.y, p.z, SH); const sc = 0.7 + ((k * 7 + vi) % 5) * 0.12; l.scale.setScalar(sc); l.rotation.set(Math.atan2(tg.z, tg.y) + (k % 2 ? 0.5 : -0.5), (k % 2 ? 1 : -1) * 0.9 + vi, (k % 2 ? 1 : -1) * 1.1); }
  });
  // C: potpourri bowl
  const speck = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#4c6876'; x.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(240,230,210,' + Math.random() * 0.4 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } });
  add(new THREE.LatheGeometry([[0.0, 0], [0.05, 0], [0.09, 0.02], [0.112, 0.05], [0.116, 0.066], [0.108, 0.067], [0.1, 0.052], [0.06, 0.024], [0, 0.021]].map(([a, b]) => new THREE.Vector2(a, b)), 40), M('#ffffff', { map: speck, roughness: 0.55, side: THREE.DoubleSide }), 0.14, FC, 0, SH);
  const petalCols = ['#8a2f2f', '#b5562f', '#d8a24a', '#6b3b52', '#a0703f', '#5b6b3a', '#c27a5a'].map(c => M(c, { roughness: 0.9 }));
  const petalGeo = new THREE.SphereGeometry(0.014, 7, 5);
  for (let i = 0; i < 46; i++) { const a = i * 2.399, r = Math.sqrt((i + 0.5) / 46) * 0.088; const p = add(petalGeo, petalCols[i % petalCols.length], 0.14 + Math.cos(a) * r, FC + 0.052 + (1 - r / 0.09) * 0.012 + (i % 3) * 0.003, Math.sin(a) * r, SH); p.scale.set(1, 0.32, 0.7 + (i % 4) * 0.12); p.rotation.set(i * 0.7, i * 1.3, i * 0.4); }
  [[0.11, 0.03, 0.4], [0.17, -0.02, 1.6]].forEach(([x, z, r]) => { const c = add(cyl(0.006, 0.006, 0.08, 8), M('#7a4a2a', { roughness: 0.9 }), x, FC + 0.07, z, SH); c.rotation.set(Math.PI / 2, 0, r); });
  // D: shuttlecock tube + red cricket ball (decorative)
  const tubeTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#f7f6f2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0f5a3c'; x.fillRect(0, h * 0.62, w, h * 0.3); x.fillRect(0, h * 0.06, w, 14);
    x.fillStyle = '#7cc142'; x.fillRect(0, h * 0.6, w, 8);
    for (let i = 0; i < 2; i++) { const cx = w * (0.25 + i * 0.5); x.save(); x.translate(cx, h * 0.36); x.fillStyle = '#0f5a3c'; x.beginPath(); x.moveTo(-34, 30); x.lineTo(0, -40); x.lineTo(34, 30); x.closePath(); x.fill(); x.fillStyle = '#f7f6f2'; x.beginPath(); x.arc(0, 30, 12, 0, Math.PI * 2); x.fill(); x.restore();
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.font = '600 34px ' + FONT_D; x.fillText('FEATHER', cx, h * 0.73); x.font = '500 22px ' + FONT_T; x.fillText('SHUTTLECOCKS · 12', cx, h * 0.8); }
  });
  shelfTex.push(tubeTex);
  const tubeG = group(0.56, FC, -0.01, SH); tubeG.rotation.y = 0.5;
  add(cyl(0.038, 0.038, 0.27, 32, 1), [M('#ffffff', { map: tubeTex, roughness: 0.45 }), M('#f7f6f2'), M('#f7f6f2')], 0, 0.135, 0, tubeG);
  add(cyl(0.0405, 0.0405, 0.032, 32), M('#0f5a3c', { roughness: 0.4 }), 0, 0.282, 0, tubeG);
  add(cyl(0.041, 0.041, 0.004, 32), M('#7cc142', { roughness: 0.4 }), 0, 0.266, 0, tubeG);
  add(cyl(0.0395, 0.0395, 0.012, 32), M('#0f5a3c', { roughness: 0.4 }), 0, 0.006, 0, tubeG);
  const leather = canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#9b1c1f'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(60,0,0,0.18)' : 'rgba(255,120,110,0.08)'; x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); } });
  const ballG = group(0.7, FC + 0.036, 0.07, SH); ballG.rotation.set(0.3, 0.8, 0.5);
  add(new THREE.SphereGeometry(0.036, 32, 20), M('#ffffff', { map: leather, roughness: 0.48 }), 0, 0, 0, ballG);
  [-0.006, 0.006].forEach(o2 => { const seam = add(new THREE.TorusGeometry(0.0358, 0.0011, 6, 64), M('#efe3cf', { roughness: 0.7 }), 0, o2, 0, ballG, false); seam.rotation.x = Math.PI / 2; seam.scale.setScalar(Math.cos(Math.asin(Math.abs(o2) / 0.036))); });
  add(new THREE.TorusGeometry(0.0362, 0.0015, 6, 64), M('#7a1416', { roughness: 0.6 }), 0, 0, 0, ballG, false).rotation.x = Math.PI / 2;
  tag(SH, 'shelf');
  // cricket bat leaning beside the shelf, badminton racket hung on the wall
  const batLean = group(4.8, 0, 2.8); batLean.rotation.z = -0.17;
  const bat = group(0, 0, 0, batLean); bat.rotation.y = Math.PI / 2;
  add(rbox(0.108, 0.56, 0.04, 0.012, 3), M('#e3c896', { roughness: 0.6 }), 0, 0.3, 0, bat);
  add(rbox(0.06, 0.44, 0.03, 0.012, 2), M('#d6b980', { roughness: 0.6 }), 0, 0.32, -0.022, bat);
  add(cyl(0.017, 0.017, 0.3, 12), M('#2b2621', { roughness: 0.7 }), 0, 0.73, 0, bat);
  for (let i = 0; i < 5; i++) add(cyl(0.0178, 0.0178, 0.012, 12), M('#3F746E'), 0, 0.62 + i * 0.05, 0, bat);
  add(new THREE.SphereGeometry(0.019, 12, 8), M('#2b2621'), 0, 0.885, 0, bat);
  C(4.62, 5, 2.65, 2.95);
  const rk = group(4.975, 1.88, 3.15); rk.rotation.y = -Math.PI / 2;
  add(cyl(0.006, 0.006, 0.04, 8), silverM, 0, 0, 0.0, rk).rotation.x = Math.PI / 2; add(new THREE.SphereGeometry(0.008, 8, 6), silverM, 0, 0.004, 0.02, rk);
  const rh = add(new THREE.TorusGeometry(0.1, 0.008, 8, 48), M('#d23a2c', { roughness: 0.4 }), 0, -0.14, 0.03, rk); rh.scale.set(1, 1.3, 1);
  const strings = canvasTex(128, 160, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(245,240,232,0.95)'; x.lineWidth = 1.5; for (let i = 6; i < w; i += 9) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let j = 6; j < h; j += 9) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); } });
  const sm = add(new THREE.CircleGeometry(0.096, 36), new THREE.MeshStandardMaterial({ map: strings, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, fog: false }), 0, -0.14, 0.03, rk, false); sm.scale.set(1, 1.3, 1);
  add(cyl(0.006, 0.01, 0.04, 8), M('#d23a2c'), 0, -0.285, 0.03, rk);
  add(cyl(0.004, 0.004, 0.26, 6), silverM, 0, -0.43, 0.03, rk);
  add(cyl(0.014, 0.012, 0.2, 10), M('#f0ebe1', { roughness: 0.8 }), 0, -0.66, 0.03, rk);
  add(cyl(0.015, 0.015, 0.01, 10), M('#2b2621'), 0, -0.765, 0.03, rk);

  /* heading on the wall above the shelf */
  const headTex = canvasTex(2048, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#2b2621'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '500 150px ' + FONT_D; x.fillText('A few of my favorite things', w / 2, h / 2 + 8); });
  headTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); shelfTex.push(headTex);
  const head0 = add(new THREE.PlaneGeometry(1.5, 0.1875), new THREE.MeshStandardMaterial({ map: headTex, transparent: true, alphaTest: 0.05, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false }), 4.996, 2.4, 1.7, scene, false);
  head0.rotation.y = -Math.PI / 2;

  /* elephant plush beside the photo frame (top shelf, decorative) */
  const fuzz = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c9c8c6'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? 'rgba(255,255,255,' + (0.05 + Math.random() * 0.12) + ')' : 'rgba(60,60,60,' + (0.04 + Math.random() * 0.08) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1); } });
  fuzz.wrapS = fuzz.wrapT = THREE.RepeatWrapping; fuzz.repeat.set(2, 2);
  const plushM = M('#ffffff', { map: fuzz, roughness: 1 }), plushIn = M('#f1ebe8', { map: fuzz, roughness: 1 }), stitchM = M('#2a2522', { roughness: 0.8 });
  const el = group(0.545, FB + 0.0, 0.01, SH); el.rotation.y = -0.22; el.scale.setScalar(1.12);
  const sph = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const q = add(new THREE.SphereGeometry(r, 28, 20), m, x, y, z, el); q.scale.set(sx, sy, sz); return q; };
  sph(0.056, plushM, 0, 0.06, -0.005, 1, 1.05, 0.92);
  sph(0.046, plushM, 0, 0.128, 0.018, 1.02, 0.96, 0.95);
  [-1, 1].forEach(sx => {
    const ear = sph(0.042, plushM, sx * 0.05, 0.132, 0.0, 1, 1.05, 0.26); ear.rotation.y = sx * 0.55; ear.rotation.z = sx * 0.2;
    const inn = sph(0.032, plushIn, sx * 0.054, 0.13, 0.009, 1, 1.05, 0.15); inn.rotation.y = sx * 0.55; inn.rotation.z = sx * 0.2;
    const fl = add(cyl(0.018, 0.019, 0.05, 18), plushM, sx * 0.026, 0.018, 0.046, el); fl.rotation.x = Math.PI / 2 - 0.15;
    add(new THREE.CircleGeometry(0.0175, 18), plushIn, sx * 0.026, 0.022, 0.0715, el, false).rotation.x = -0.15;
    const hl = add(cyl(0.02, 0.021, 0.05, 18), plushM, sx * 0.05, 0.02, 0.012, el); hl.rotation.set(Math.PI / 2 - 0.1, 0, sx * -0.55);
    sph(0.0042, stitchM, sx * 0.019, 0.142, 0.058, 1, 1.15, 0.6);
    const lid = add(new THREE.TorusGeometry(0.006, 0.0011, 5, 12, Math.PI), stitchM, sx * 0.019, 0.149, 0.0575, el, false); lid.rotation.z = 0;
  });
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.12, 0.05), new THREE.Vector3(0, 0.1, 0.075), new THREE.Vector3(0, 0.08, 0.086), new THREE.Vector3(0, 0.068, 0.096), new THREE.Vector3(0, 0.072, 0.108)]);
  const tg = new THREE.TubeGeometry(trunk, 24, 0.012, 14); const tp = tg.attributes.position, tv = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) { tv.fromBufferAttribute(tp, i); const k = Math.floor(i / 15) / 24, c = trunk.getPoint(k), f = 1 - k * 0.35; tp.setXYZ(i, c.x + (tv.x - c.x) * f, c.y + (tv.y - c.y) * f, c.z + (tv.z - c.z) * f); }
  tg.computeVertexNormals(); add(tg, plushM, 0, 0, 0, el);
  add(new THREE.CircleGeometry(0.0078, 16), plushIn, 0, 0.072, 0.1125, el, false).rotation.y = 0.2;
  const tail = add(cyl(0.003, 0.003, 0.03, 6), plushM, 0, 0.04, -0.062, el); tail.rotation.x = 0.6;

  /* black Yamaha acoustic, wall-mounted between the lounge chair and the cricket bat */
  const gW = group(4.94, 2.22, 0.2); gW.rotation.y = -Math.PI / 2;
  const satin = M('#141414', { roughness: 0.32, metalness: 0.05 }), satinSide = M('#101010', { roughness: 0.4 }), neckM = M('#24170f', { roughness: 0.55 }), boardM = M('#16100c', { roughness: 0.6 }), creamM = M('#efe6d2', { roughness: 0.45 }), fretM = M('#cfcac2', { roughness: 0.3, metalness: 0.85 });
  const bodyS = new THREE.Shape(), RP = [[0.12, 0.012], [0.178, 0.06], [0.195, 0.13], [0.18, 0.2], [0.138, 0.258], [0.126, 0.29], [0.138, 0.335], [0.146, 0.4], [0.124, 0.46], [0.065, 0.494], [0, 0.5]];
  bodyS.moveTo(0, 0); bodyS.splineThru(RP.map(([a, b]) => new THREE.Vector2(a, b))); bodyS.splineThru(RP.slice(0, -1).reverse().map(([a, b]) => new THREE.Vector2(-a, b)).concat([new THREE.Vector2(0, 0)]));
  add(new THREE.ExtrudeGeometry(bodyS, { depth: 0.095, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 3, curveSegments: 48 }), [satin, satinSide], 0, -1.0, 0.002, gW);
  const outline = bodyS.getSpacedPoints(120).map(p => new THREE.Vector3(p.x, p.y - 1.0, 0.102));
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 160, 0.0028, 6, true), creamM, 0, 0, 0, gW, false);
  add(new THREE.CircleGeometry(0.045, 40), M('#050505', { roughness: 1 }), 0, -0.72, 0.1035, gW, false);
  add(new THREE.RingGeometry(0.051, 0.06, 48), creamM, 0, -0.72, 0.1036, gW, false);
  add(new THREE.RingGeometry(0.063, 0.066, 48), creamM, 0, -0.72, 0.1036, gW, false);
  add(rbox(0.15, 0.026, 0.008, 0.004, 2), boardM, 0, -0.885, 0.106, gW);
  add(B(0.075, 0.003, 0.004), creamM, 0, -0.879, 0.111, gW, false);
  add(B(0.05, 0.48, 0.034), neckM, 0, -0.43, 0.084, gW);
  add(B(0.054, 0.48, 0.006), boardM, 0, -0.42, 0.104, gW);
  for (let i = 0; i < 15; i++) add(B(0.054, 0.0018, 0.0018), fretM, 0, -0.19 - i * 0.031 * Math.pow(0.97, i), 0.1075, gW, false);
  [3, 5, 7, 9, 12].forEach(n => { let y = -0.19; for (let k = 0; k < n; k++) y -= 0.031 * Math.pow(0.97, k); add(new THREE.CircleGeometry(0.003, 10), creamM, 0, y + 0.014, 0.1075, gW, false); });
  add(B(0.054, 0.005, 0.012), creamM, 0, -0.182, 0.104, gW);
  const yTex = canvasTex(256, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#d8c58e'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 40px ' + FONT_T; x.fillText('YAMAHA', w / 2, h / 2 + 2); });
  shelfTex.push(yTex);
  const hs = add(rbox(0.085, 0.18, 0.018, 0.008, 2), satin, 0, -0.09, 0.075, gW);
  add(new THREE.PlaneGeometry(0.066, 0.0165), new THREE.MeshStandardMaterial({ map: yTex, transparent: true, alphaTest: 0.1, roughness: 0.4, fog: false }), 0, -0.04, 0.0846, gW, false);
  for (let i = 0; i < 6; i++) { const sx = i < 3 ? -1 : 1, y = -0.06 - (i % 3) * 0.045; const post = add(cyl(0.004, 0.004, 0.02, 8), fretM, sx * 0.025, y, 0.092, gW, false); post.rotation.x = Math.PI / 2; const peg = add(cyl(0.004, 0.004, 0.03, 8), fretM, sx * 0.055, y, 0.068, gW, false); peg.rotation.z = Math.PI / 2; add(rbox(0.012, 0.018, 0.006, 0.002, 1), fretM, sx * 0.075, y, 0.068, gW, false); }
  const strM = M('#e9e4da', { roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 6; i++) { const x0 = -0.02 + i * 0.008, x1 = -0.03 + i * 0.012, y0 = -0.182, y1 = -0.879, len = Math.hypot(x1 - x0, y1 - y0); const str = add(cyl(0.0006 + (5 - i) * 0.00012, 0.0006 + (5 - i) * 0.00012, len, 4), strM, (x0 + x1) / 2, (y0 + y1) / 2, 0.1115, gW, false); str.rotation.z = Math.atan2(x1 - x0, -(y1 - y0)) * -1; }
  const hookM = M('#1d1c1b', { roughness: 0.4, metalness: 0.5 });
  add(rbox(0.05, 0.08, 0.014, 0.004, 2), M('#6b4a33', { roughness: 0.55 }), 0, -0.2, -0.053, gW);
  [-1, 1].forEach(sx => { const arm = add(cyl(0.005, 0.005, 0.14, 10), hookM, sx * 0.034, -0.198, 0.023, gW); arm.rotation.x = Math.PI / 2; const tip = add(cyl(0.006, 0.006, 0.02, 10), hookM, sx * 0.034, -0.188, 0.092, gW); });
  /* reading corner: lounge chair + brass floor lamp (left of the shelf) */
  const boucle = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#4a4542'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? 'rgba(20,18,16,0.35)' : 'rgba(150,140,130,0.18)'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.6, 0, Math.PI * 2); x.fill(); } });
  boucle.wrapS = boucle.wrapT = THREE.RepeatWrapping; boucle.repeat.set(3, 3);
  const fab = M('#ffffff', { map: boucle, roughness: 0.98 }), fab2 = M('#e8e4e0', { map: boucle, roughness: 0.98 }), legM = M('#6b4429', { roughness: 0.5 });
  const chairG = group(4.42, 0, -1.22); chairG.rotation.y = -Math.PI / 2 + 0.22;
  add(rbox(0.84, 0.2, 0.8, 0.07, 5), fab, 0, 0.32, 0, chairG);
  add(rbox(0.6, 0.13, 0.62, 0.06, 5), fab2, 0, 0.48, 0.07, chairG);
  const back = add(rbox(0.8, 0.6, 0.17, 0.08, 5), fab, 0, 0.73, -0.31, chairG); back.rotation.x = -0.2;
  const backTop = add(rbox(0.82, 0.12, 0.2, 0.06, 5), fab, 0, 1.02, -0.37, chairG); backTop.rotation.x = -0.2;
  [-1, 1].forEach(sx => { const a = add(rbox(0.14, 0.38, 0.74, 0.07, 5), fab, sx * 0.37, 0.53, 0.0, chairG); a.rotation.z = sx * 0.07; add(rbox(0.16, 0.08, 0.7, 0.04, 4), fab, sx * 0.385, 0.71, 0.02, chairG).rotation.z = sx * 0.07; });
  const lumbar = add(rbox(0.42, 0.24, 0.1, 0.05, 5), fab2, 0, 0.67, -0.17, chairG); lumbar.rotation.x = -0.22;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const l = add(cyl(0.022, 0.012, 0.24, 10), legM, sx * 0.33, 0.11, sz * 0.3, chairG); l.rotation.set(sz * 0.18, 0, -sx * 0.14); });
  C(3.98, 4.88, -1.68, -0.76);
  const lampG = group(4.74, 0, -1.98);
  const brassL = M('#c9a14e', { roughness: 0.28, metalness: 0.85 });
  add(cyl(0.15, 0.16, 0.025, 32), brassL, 0, 0.0125, 0, lampG); add(cyl(0.035, 0.05, 0.04, 16), brassL, 0, 0.045, 0, lampG);
  add(cyl(0.011, 0.011, 1.5, 12), brassL, 0, 0.8, 0, lampG);
  const dx = -0.34, dz = 0.94;
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.54, 0), new THREE.Vector3(dx * 0.05, 1.68, dz * 0.05), new THREE.Vector3(dx * 0.16, 1.75, dz * 0.16), new THREE.Vector3(dx * 0.28, 1.7, dz * 0.28)]);
  add(new THREE.TubeGeometry(neck, 24, 0.011, 10), brassL, 0, 0, 0, lampG);
  const head = group(dx * 0.32, 1.64, dz * 0.32, lampG); head.rotation.set(0.45 * dz, 0, -0.45 * dx);
  add(new THREE.CylinderGeometry(0.04, 0.115, 0.17, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#c9a14e', roughness: 0.28, metalness: 0.85, side: THREE.FrontSide, fog: false }), 0, 0, 0, head);
  const innerM = new THREE.MeshStandardMaterial({ color: '#f3e4c4', emissive: '#ffcf8a', emissiveIntensity: 0, roughness: 0.6, side: THREE.BackSide, fog: false });
  add(new THREE.CylinderGeometry(0.039, 0.113, 0.168, 32, 1, true), innerM, 0, 0, 0, head, false);
  add(cyl(0.04, 0.04, 0.02, 20), brassL, 0, 0.09, 0, head);
  const bulbM = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd59a', emissiveIntensity: 0, roughness: 0.3, fog: false });
  add(new THREE.SphereGeometry(0.03, 16, 12), bulbM, 0, 0.02, 0, head, false);
  const lampHit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.75, 10), new THREE.MeshBasicMaterial({ visible: false })); lampHit.position.set(0, 0.88, 0); lampG.add(lampHit);
  const headHit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); headHit.position.copy(head.position); lampG.add(headHit);
  lampG.traverse(m => { m.userData.item = 'lamp'; });
  const lampLight = new THREE.SpotLight('#ffc27a', 0, 5.5, 0.85, 0.65, 1.6);
  lampLight.position.set(4.74 + dx * 0.32, 1.6, -1.98 + dz * 0.32); lampLight.target.position.set(4.35, 0.35, -1.15); scene.add(lampLight); scene.add(lampLight.target);
  C(4.56, 4.92, -2.16, -1.8);
  let lampOn = false, lampT = 0, lampHover = false;
  let lamp3On = true, lamp3T = 1, lamp3E = 1;
  const toggleLamp = (id = 'lamp') => { if (id === 'lamp2') { lamp2On = !lamp2On; o.onLamp && o.onLamp(lamp2On, 'lamp2'); return lamp2On; } if (id === 'lamp3') { lamp3On = !lamp3On; o.onLamp && o.onLamp(lamp3On, 'lamp3'); return lamp3On; } lampOn = !lampOn; o.onLamp && o.onLamp(lampOn, 'lamp'); return lampOn; };
  const isOn = id => id === 'lamp2' ? lamp2On : id === 'lamp3' ? lamp3On : lampOn;
  const lampTip = id => isOn(id) ? 'Click to turn off' : 'Click to turn on';
  const updateLamp = dt => {
    const tgt = lampOn ? 1 : 0; if (lampT !== tgt) lampT = reduce ? tgt : (tgt > lampT ? Math.min(1, lampT + dt / 0.45) : Math.max(0, lampT - dt / 0.45));
    const e = sstep(0, 1, lampT); lampLight.intensity = e * 13; bulbM.emissiveIntensity = e * 3.2; innerM.emissiveIntensity = e * 1.1 + (lampHover && !lampOn ? 0.12 : 0);
    brassL.emissive.set(lampHover === 'lamp' ? '#3a2a10' : '#000000');
    const t2 = lamp2On ? 1 : 0; if (lamp2T !== t2) lamp2T = reduce ? t2 : (t2 > lamp2T ? Math.min(1, lamp2T + dt / 0.45) : Math.max(0, lamp2T - dt / 0.45));
    lamp2E = sstep(0, 1, lamp2T);
    const t3 = lamp3On ? 1 : 0; if (lamp3T !== t3) lamp3T = reduce ? t3 : (t3 > lamp3T ? Math.min(1, lamp3T + dt / 0.45) : Math.max(0, lamp3T - dt / 0.45));
    lamp3E = sstep(0, 1, lamp3T);
  };


  /* shelf interaction state */
  let selBook = null, pendBook = null, onPlayer = null, queueAlb = null, playState = 'idle', hoverItem = null;
  const albBusy = () => albums.some(a => a.m.t !== a.m.target);
  function openBook(i) { selBook = i; books[i].m.target = 1; o.onBook && o.onBook(i, BOOKS[i]); }
  function closeBook() { if (selBook != null) books[selBook].m.target = 0; selBook = null; pendBook = null; o.onBook && o.onBook(null); }
  function clickBook(i) {
    if (selBook === i) { closeBook(); return; }
    if (selBook != null) { books[selBook].m.target = 0; selBook = null; pendBook = i; o.onBook && o.onBook(null); return; }
    if (books.some(b => b.m.t > 0)) { pendBook = i; return; }
    openBook(i);
  }
  function placeAlbum(i) { albums[i].m.target = 1; recCol = ALBUMS[i].bg2 === '#111111' ? '#d9a43b' : ALBUMS[i].bg2; recTex.userData.redraw(); o.onAlbum && o.onAlbum('placing', i, ALBUMS[i]); }
  function clickAlbum(i) {
    if (albBusy()) { o.onShelfTip && o.onShelfTip('One moment, the album is still moving.'); return; }
    if (onPlayer === i) { o.onAlbum && o.onAlbum('stop', i, ALBUMS[i]); albums[i].m.target = 0; onPlayer = null; return; }
    if (onPlayer != null) { o.onAlbum && o.onAlbum('stop', onPlayer, ALBUMS[onPlayer]); albums[onPlayer].m.target = 0; onPlayer = null; queueAlb = i; return; }
    placeAlbum(i);
  }
  function clickPlayer() {
    if (onPlayer != null && !albBusy()) o.onAlbum && o.onAlbum('toggle', onPlayer, ALBUMS[onPlayer]);
    else if (onPlayer == null && !albBusy()) o.onShelfTip && o.onShelfTip('Pick an album from the shelf first.');
  }
  function handleItem(id) { const [k, n] = id.split(':'); if (k === 'book') clickBook(+n); else if (k === 'album') clickAlbum(+n); else if (k === 'player') clickPlayer(); }
  function itemTip(id) { const [k, n] = id.split(':'); if (k === 'book') return selBook === +n ? 'Click to put it back' : BOOKS[+n].t + ' · Click to explore'; if (k === 'album') return onPlayer === +n ? 'Click to put it back' : ALBUMS[+n].t + ' · Click to play'; return onPlayer != null ? 'Click the player to pause or resume' : 'Pick an album first'; }
  function resetShelf() { pendBook = null; queueAlb = null; selBook = null; onPlayer = null; playState = 'idle'; movers.forEach(m => { m.t = 0; m.target = 0; m.prev = 0; m.hover = 0; m.hovered = false; poseMover(m); }); }
  function updateShelf(dt) {
    movers.forEach(m => {
      m.hovered = hoverItem != null && m.obj.children.length && m.obj.children[0].userData.item === hoverItem;
      if (m.t !== m.target) { const st = dt / m.dur; m.t = m.target > m.t ? Math.min(m.target, m.t + st) : Math.max(m.target, m.t - st); }
      const ht = m.hovered && m.t === 0 ? 1 : 0; m.hover += (ht - m.hover) * Math.min(1, dt * 12);
      poseMover(m);
      if (m.t === 1 && m.prev < 1) { const ai = albums.findIndex(a => a.m === m); if (ai >= 0) { onPlayer = ai; o.onAlbum && o.onAlbum('placed', ai, ALBUMS[ai]); } }
      m.prev = m.t;
    });
    if (pendBook != null && books.every(b => b.m.t === 0)) { const i = pendBook; pendBook = null; openBook(i); }
    if (queueAlb != null && albums.every(a => a.m.t === 0)) { const i = queueAlb; queueAlb = null; placeAlbum(i); }
    if (playState === 'playing' && !reduce) record.rotation.z -= dt * 3.4;
    btnM.emissive.set(playState === 'playing' ? '#3fbf7a' : playState === 'paused' ? '#e0a33a' : playState === 'unavailable' ? '#b8443a' : '#000000'); btnM.emissiveIntensity = playState === 'idle' ? 0 : 1.4;
  }
  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight('#fff3e0', '#6b4a33', 0.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9c7', 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  sun.target.position.set(1.5, 0, -1); scene.add(sun); scene.add(sun.target);

  const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), new THREE.MeshBasicMaterial({ color: '#9fd3c9', transparent: true, opacity: 0, depthWrite: false, fog: false }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; scene.add(marker); let markerT = 0;
  const LABEL_POS = { sofa: [-2, 1.22, -0.25], desk: [3, 1.62, -3.5], shelf: [4.85, 2.68, 1.7], lamp: [4.63, 1.98, -1.68], lamp2: [-3.78, 1.86, -0.35], lamp3: [3.78, 1.65, -3.62], bell: [3.86, 1.47, 4.23] };
  let labelEls = null; const lv = new THREE.Vector3();
  /* ---------- spots (interactions) ---------- */
  const S = (id, x, z, r, sx, sz) => { spots[id] = { id, x, z, r, sx, sz }; };
  S('sofa', -2, -0.3, 2.1, -2, -1.3); S('desk', 3, -3.4, 2.0, 3, -1.9);
  S('shelf', 4.75, 1.7, 2.4, 3.35, 1.7);
  S('lamp', 4.68, -1.9, 1.35, 4.1, -2.4); S('lamp2', -3.78, -0.35, 1.3, -3.6, -1.2);

  /* ---------- state ---------- */
  const GATE = { x: 3.0, y: 1.6, z: 6.75, yaw: 0, pitch: -0.2 };
  const P = { ...GATE };
  let mode = 'gate', inputOn = true, tw = null, queue = [], doorT = 0, doorV = 0, bellT = 0;
  const keys = {}; let joy = { x: 0, y: 0 };
  const vel = new THREE.Vector2();
  let prompt = null, hoverSpot = null, rectOn = false, tvRectOn = false;
  const doorCol = C(3.35, 3.72, 3.1, 4.05); doorCol.on = false;
  const T = {}; const cur = {};
  CK.forEach(k => { T[k] = new THREE.Color(); cur[k] = new THREE.Color(); });
  let snap = true;
  function setTime(name, instant) { const t = TIMES[name] || TIMES.morning; CK.forEach(k => T[k].set(t[k])); NK.forEach(k => T[k] = t[k]); T.sunP = t.sunP; if (instant) snap = true; }
  setTime('morning', true);

  function emit(m) { mode = m; if (m === 'explore') { try { canvas.focus({ preventScroll: true }); } catch (e) {} } for (const k in keys) keys[k] = false; vel.set(0, 0); joy = { x: 0, y: 0 }; down = null; hoverSpot = null; hoverItem = null; lampHover = false; lamp2Hover = false; canvas.style.cursor = 'grab'; prompt = null; o.onHover && o.onHover(null); o.onShelfHover && o.onShelfHover(null); o.onPrompt && o.onPrompt(null); o.onState && o.onState(m); }
  function tweenTo(to, dur, done) { tw = { from: { ...P }, to: { ...P, ...to }, t: 0, dur: reduce ? Math.min(dur, 0.3) : dur, done }; }
  function chain(steps, done) {
    let i = 0;
    const next = () => { if (i >= steps.length) { done && done(); return; } const s = steps[i++]; tweenTo(s, s.dur, next); };
    next();
  }
  const blocked = (x, z, pad = 0.22) => cols.some(c => c.on && x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad) || x < -4.75 || x > 4.75 || z < -3.75 || z > 3.75;
  const clear = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(d / 0.15)); for (let i = 1; i < n; i++) { const t = i / n; if (blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; } return true; };
  const NODES = [[0.6, 0.9], [-0.3, -1.25], [-2, -1.3], [3, -1.9], [-3.4, 1.0], [2.6, 2.6], [0.5, -2.2], [3.35, 0.5], [3.35, 1.7]];
  function route(from, to) {
    if (clear(from, to)) return [to];
    const nodes = [from, ...NODES, to], n = nodes.length, dist = Array(n).fill(1e9), prev = Array(n).fill(-1), done = Array(n).fill(false);
    dist[0] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] >= 1e9) break; done[u] = true;
      for (let v = 0; v < n; v++) if (!done[v] && v !== u && clear(nodes[u], nodes[v])) { const d = dist[u] + Math.hypot(nodes[v][0] - nodes[u][0], nodes[v][1] - nodes[u][1]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
    }
    if (prev[n - 1] < 0) return [to];
    const path = []; for (let v = n - 1; v > 0; v = prev[v]) path.unshift(nodes[v]); return path;
  }
  function walkSteps(points, finalYaw) {
    const steps = []; let px = P.x, pz = P.z;
    points.forEach((p, i) => {
      const d = Math.hypot(p[0] - px, p[1] - pz), last = i === points.length - 1;
      steps.push({ x: p[0], z: p[1], y: 1.6, pitch: -0.04, yaw: last && finalYaw !== undefined ? finalYaw : (d > 0.05 ? yawTo(px, pz, p[0], p[1]) : P.yaw), dur: Math.max(0.6, d / 1.5) });
      px = p[0]; pz = p[1];
    });
    return steps;
  }
  function standIfNeeded() {
    if (mode === 'seated' || mode === 'sitting') return [{ x: -2, z: -1.3, y: 1.6, yaw: Math.PI, pitch: -0.05, dur: 1.2 }];
    if (mode === 'desk') return [{ x: 3, z: -1.9, y: 1.6, yaw: 0, pitch: -0.05, dur: 1.8 }];
    if (mode === 'shelf' || mode === 'toShelf') { closeBook(); return [{ x: 3.35, z: 1.7, y: 1.6, yaw: -Math.PI / 2, pitch: -0.05, dur: 0.9 }]; }
    return [];
  }
  function startFromGate(after) {
    if (mode !== 'gate') return false;
    emit('ringing');
    bellT = 1; o.onSound && o.onSound('bell');
    const wait = reduce ? 200 : 1100;
    setTimeout(() => {
      doorV = 1; doorCol.on = true;
      setTimeout(() => {
        emit('entering');
        chain([{ x: 3, z: 3.45, y: 1.6, yaw: 0, pitch: -0.04, dur: 2.6 }], () => { if (after) after(); else emit('explore'); });
      }, reduce ? 100 : 700);
    }, wait);
    return true;
  }

  /* ---------- API actions ---------- */
  function sit() {
    if (mode === 'walking') { tw = null; mode = 'explore'; }
    if (!['explore'].includes(mode)) return;
    emit('sitting');
    tweenTo({ x: -2, z: -0.42, y: 1.1, yaw: 0, pitch: 0.15 }, reduce ? 0.3 : 1.5, () => { emit('seated'); setTimeout(() => tvOn(), reduce ? 100 : 900); });
  }
  function stand() {
    if (mode !== 'seated' && mode !== 'sitting') return;
    tw = null; tvTarget = 0; movie.playing = false; o.onTv && o.onTv(false); emit('standing');
    // stand up in front of the sofa but keep looking at the TV, so the
    // "Have a seat" prompt is right there if they want to watch again
    chain([{ x: -2, z: -1.3, y: 1.6, yaw: 0, pitch: -0.05, dur: 1.0 }], () => emit('explore'));
  }
  function toDesk() {
    if (mode === 'desk') return;
    if (mode === 'gate') { startFromGate(() => { mode = 'explore'; toDesk(); }); return; }
    if (!['explore', 'seated', 'sitting', 'shelf'].includes(mode)) return;
    const pre = standIfNeeded(); const start = pre.length ? [pre[0].x, pre[0].z] : [P.x, P.z];
    const sv = { ...P }; if (pre.length) { P.x = start[0]; P.z = start[1]; }
    const path = route(start, [3, -1.9]); P.x = sv.x; P.z = sv.z;
    emit('deskEnter');
    const go = () => {
      const pts = [{ x: P.x, y: P.y, z: P.z }];
      path.forEach(p => { if (Math.hypot(p[0] - 3, p[1] + 1.9) > 0.05) pts.push({ x: p[0], y: 1.6, z: p[1] }); });
      pts.push({ x: 3, y: 1.45, z: -1.9 }, { x: DESK_VIEW.x, y: DESK_VIEW.y, z: DESK_VIEW.z }, { x: SCREEN.x, y: SCREEN.y, z: deskEnterZ() });
      const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
      const L = cum[cum.length - 1];
      tw = { path: pts, cum, L, yaw0: P.yaw, pitch0: P.pitch, t: 0, dur: reduce ? 0.4 : clamp(1.4 + L / 1.5, 2.2, 6), done: () => emit('desk') };
    };
    if (pre.length) chain(pre, go); else go();
  }
  // Opening shot: from the front door, one unbroken glide through the open
  // door and straight into the desk monitor (no bell, no stops).
  function intro() {
    if (mode !== 'gate') return;
    doorV = 1; doorCol.on = true;
    const path = route([3, 3.45], [3, -1.9]);
    emit('deskEnter');
    const pts = [{ x: P.x, y: P.y, z: P.z }, { x: 3, y: 1.6, z: 3.45 }];
    path.forEach(p => { if (Math.hypot(p[0] - 3, p[1] + 1.9) > 0.05) pts.push({ x: p[0], y: 1.6, z: p[1] }); });
    pts.push({ x: 3, y: 1.45, z: -1.9 }, { x: DESK_VIEW.x, y: DESK_VIEW.y, z: DESK_VIEW.z }, { x: SCREEN.x, y: SCREEN.y, z: deskEnterZ() });
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
    tw = { path: pts, cum, L: cum[cum.length - 1], yaw0: P.yaw, pitch0: P.pitch, t: 0, dur: reduce ? 0.4 : 4.6, done: () => emit('desk') };
  }
  const DESK_VIEW = { x: 3, z: -2.82, y: 1.2, yaw: 0, pitch: 0 }, SCREEN = { x: 3, y: 1.2, z: -3.6, w: 0.86, h: 0.5 };
  let deskT = 0;
  function deskEnterZ() {
    const t = Math.tan(camera.fov * Math.PI / 360), d = 0.9 * Math.min(SCREEN.h / 2 / t, SCREEN.w / 2 / (t * camera.aspect));
    return SCREEN.z + Math.max(0.06, d);
  }
  function leaveDesk() {
    if (mode !== 'desk' && mode !== 'deskEnter') return;
    tw = null;
    emit('deskExit');
    tweenTo({ x: 3, z: -1.9, y: 1.6, yaw: 0, pitch: -0.05 }, reduce ? 0.3 : 1.8, () => emit('explore'));
  }
  function goTo(id) {
    if (id === 'sofa') { if (mode === 'gate') { startFromGate(() => { mode = 'explore'; sit(); }); } else if (mode === 'desk') { leaveDesk(); setTimeout(() => sit(), 2300); } else if (mode === 'shelf') { leaveShelf(); setTimeout(() => sit(), 1100); } else sit(); return; }
    if (id === 'shelf') { toShelf(); return; }
    if (id === 'desk') { toDesk(); return; }
    if (id === 'lamp' || id === 'lamp2' || id === 'lamp3') { if (lampModes()) toggleLamp(id); return; }
    const sp = spots[id]; if (!sp) return;
    if (mode === 'gate') { startFromGate(() => { mode = 'explore'; goTo(id); }); return; }
    const pre = standIfNeeded();
    if (mode === 'walking') { tw = null; mode = 'explore'; }
    if (!['explore', 'seated', 'desk', 'shelf'].includes(mode)) return;
    const start = pre.length ? [pre[0].x, pre[0].z] : [P.x, P.z];
    const sv = { ...P }; if (pre.length) { P.x = start[0]; P.z = start[1]; }
    const steps = walkSteps(route(start, [sp.sx, sp.sz]), yawTo(sp.sx, sp.sz, sp.x, sp.z)); P.x = sv.x; P.z = sv.z;
    if (pre.length && mode === 'seated') pauseMovie();
    emit('walking');
    chain([...pre, ...steps], () => emit('explore'));
  }
  function toShelf() {
    if (mode === 'shelf' || mode === 'toShelf') return;
    if (mode === 'gate') { startFromGate(() => { mode = 'explore'; toShelf(); }); return; }
    if (mode === 'walking') { tw = null; mode = 'explore'; }
    if (!['explore', 'seated', 'sitting', 'desk'].includes(mode)) return;
    if (mode === 'seated' || mode === 'sitting') pauseMovie();
    const pre = standIfNeeded(); const start = pre.length ? [pre[0].x, pre[0].z] : [P.x, P.z];
    const sv = { ...P }; if (pre.length) { P.x = start[0]; P.z = start[1]; }
    const walk = walkSteps(route(start, [3.35, 1.7]), -Math.PI / 2); P.x = sv.x; P.z = sv.z;
    const hh = Math.atan(Math.tan(baseFov * Math.PI / 360) * camera.aspect), dist = clamp(1.0 / Math.tan(hh), 2.0, 2.9);
    emit('toShelf');
    chain([...pre, ...walk, { x: 4.6 - dist - 0.25, z: 1.7, y: 1.55, yaw: -Math.PI / 2, pitch: -0.02, dur: 1.2 }], () => emit('shelf'));
  }
  function leaveShelf() { if (mode !== 'shelf') return; closeBook(); hoverItem = null; o.onShelfHover && o.onShelfHover(null); emit('standing'); chain([{ x: 3.35, z: 1.7, y: 1.6, yaw: -Math.PI / 2 + 0.35, pitch: -0.05, dur: 1.0 }], () => emit('explore')); }
  function walkToPoint(x, z) {
    if (mode === 'walking') { tw = null; mode = 'explore'; }
    if (mode !== 'explore') return;
    let tx = clamp(x, -4.6, 4.6), tz = clamp(z, -3.6, 3.6);
    if (blocked(tx, tz, 0.3)) { let best = null, bd = 1e9; for (let a = 0; a < 16; a++) for (let r = 0.2; r <= 1.4; r += 0.2) { const px = tx + Math.cos(a * 0.3927) * r, pz = tz + Math.sin(a * 0.3927) * r; if (!blocked(px, pz, 0.3) && r < bd) { bd = r; best = [px, pz]; } } if (!best) return; tx = best[0]; tz = best[1]; }
    marker.position.x = tx; marker.position.z = tz; markerT = 1;
    emit('walking');
    chain(walkSteps(route([P.x, P.z], [tx, tz])), () => emit('explore'));
  }
  function restart() {
    tw = null; tvPower = 0; tvTarget = 0; o.onTv && o.onTv(false); movie.playing = false; movie.t = 0; movie.idx = -1; movie.ended = false;
    doorV = 0; doorCol.on = false; resetShelf(); Object.assign(P, GATE); emit('gate');
  }
  function interact() {
    if (!inputOn) return;
    if (mode === 'gate') { startFromGate(); return; }
    if (mode === 'explore' && prompt) o.onInteract && o.onInteract(prompt);
  }

  /* ---------- film ---------- */
  let tvPower = 0, tvTarget = 0;
  const movie = { playing: false, t: 0, idx: -1, ended: false };
  const starts = []; { let a = 0; FILM.forEach(s => { starts.push(a); a += s.dur; }); }
  function tvOn() { if (mode !== 'seated') return; tvTarget = 1; o.onSound && o.onSound('tv'); movie.t = 0; movie.idx = -1; movie.ended = false; movie.playing = false; o.onTv && o.onTv(true); }
  function pauseMovie() { if (!movie.playing) return; movie.playing = false; o.onMovie && o.onMovie({ playing: false, ended: movie.ended }); }
  function playMovie() { if (tvPower < 0.5) { tvOn(); return; } if (movie.ended) { replay(); return; } movie.playing = true; o.onMovie && o.onMovie({ playing: true, ended: false }); }
  function skipMovie() { movie.t = starts[FILM.length - 1]; movie.playing = true; tvTarget = 1; }
  function replay() { movie.t = 0; movie.idx = -1; movie.ended = false; movie.playing = true; tvTarget = 1; o.onMovie && o.onMovie({ playing: true, ended: false }); }

  const grain = (x) => { for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,240,220,${Math.random() * 0.05})`; x.fillRect(Math.random() * TVW, Math.random() * TVH, 2, 2); } };
  function drawFilm() {
    const x = tvx, W = TVW, H = TVH;
    x.save(); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    if (tvPower < 0.02) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#16171a'); g.addColorStop(0.45, '#0b0c0e'); g.addColorStop(0.5, '#1d1f23'); g.addColorStop(0.56, '#0b0c0e'); g.addColorStop(1, '#0a0a0b'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore(); return; }
    if (!movie.playing && !movie.ended) {
      const g2 = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7); g2.addColorStop(0, '#24201b'); g2.addColorStop(1, '#100e0c'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
      if (tvPower < 1) { const pw = tvPower; if (pw < 0.35) { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); const lw = (pw / 0.35) * W; x.fillStyle = '#fff'; x.fillRect(W / 2 - lw / 2, H / 2 - 2, lw, 4); } else { const hh = ((pw - 0.35) / 0.65) * H; x.fillStyle = '#000'; x.fillRect(0, 0, W, H / 2 - hh / 2); x.fillRect(0, H / 2 + hh / 2, W, H / 2 - hh / 2); x.fillStyle = 'rgba(255,255,255,' + ((1 - pw) * 0.8) + ')'; x.fillRect(0, H / 2 - hh / 2, W, hh); } }
      x.restore(); return;
    }
    const t = movie.t; let idx = 0; for (let i = 0; i < FILM.length; i++) if (t >= starts[i]) idx = i;
    const s = FILM[idx], lt = t - starts[idx], p = clamp(lt / s.dur, 0, 1);
    const fade = s.k === 'end' ? sstep(0, 0.6, lt) : sstep(0, 0.7, lt) * (1 - sstep(s.dur - 0.6, s.dur, lt));
    const mo = reduce ? 0 : 1;
    // background
    const bg = x.createRadialGradient(W * (0.3 + 0.4 * Math.sin(idx * 1.7)), H * 0.4, 40, W * 0.5, H * 0.5, W * 0.8);
    bg.addColorStop(0, ['#3a2a20', '#21332f', '#2d2440', '#3a2a20', '#1f2b33', '#33291f', '#2a3330', '#2b2333', '#3d2d1f', '#21332f'][idx]); bg.addColorStop(1, '#0e0c0b');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.globalAlpha = fade;
    const cream = '#f5ecdc', mint = '#9fd3c9', amber = '#f2b86b';
    if (s.k === 'title') {
      x.textAlign = 'center'; x.fillStyle = cream;
      x.font = `500 104px ${FONT_D}`; x.fillText('The Life of Shruti', W / 2, H / 2 + 10 - mo * (1 - sstep(0, 1.5, lt)) * 20);
      x.globalAlpha = fade * sstep(1.2, 2.2, lt); x.fillStyle = amber; x.font = `500 26px ${FONT_T}`;
      x.fillText('D I R E C T E D   B Y   S H R U T I   T O M A R', W / 2, H / 2 + 84);
      x.fillStyle = 'rgba(245,236,220,0.35)'; x.fillRect(W / 2 - 140 * sstep(0.5, 2, lt), H / 2 - 92, 280 * sstep(0.5, 2, lt), 2);
    } else if (s.k === 'hello') {
      x.fillStyle = cream; x.font = `400 64px ${FONT_D}`; x.fillText('Hello,', 120, 300);
      x.font = `500 104px ${FONT_D}`; x.fillText("I'm ", 120, 420); const w0 = x.measureText("I'm ").width;
      x.fillStyle = mint; x.globalAlpha = fade * sstep(0.4, 1.2, lt); x.fillText('Shruti Tomar.', 120 + w0, 420);
    } else if (s.k === 'line' || s.k === 'interests') {
      const right = s.k === 'line' && s.vis !== 'none';
      const tw2 = right ? 560 : 1000, tx = right ? 100 : 140;
      if (s.label) { x.fillStyle = amber; x.font = `500 20px ${FONT_T}`; x.fillText(s.label.toUpperCase().split('').join(' '), tx, 170); }
      if (s.k === 'interests') {
        x.fillStyle = cream; x.font = `500 46px ${FONT_D}`;
        wrap(x, "And when I'm not designing, you'll probably find me…", 1000).forEach((l, i) => x.fillText(l, tx, 200 + i * 56));
        const chips = ['playing guitar', 'watching or playing cricket', 'playing badminton', 'reading something interesting', 'or looking for my next coffee.'];
        x.font = `500 30px ${FONT_T}`;
        let cx = tx, cy = 380;
        chips.forEach((c, i) => {
          const a = sstep(0.12 + i * 0.13, 0.22 + i * 0.13, p); if (a <= 0) return;
          const w = x.measureText(c).width + 52; if (cx + w > W - 120) { cx = tx; cy += 84; }
          x.globalAlpha = fade * a; x.fillStyle = ['#3F746E', '#b8643f', '#d9a43b', '#2b3a55', '#6b4a33'][i];
          const yy = cy + (1 - a) * 18 * mo; x.beginPath(); x.roundRect(cx, yy - 44, w, 64, 32); x.fill();
          x.fillStyle = '#ffffff'; x.fillText(c, cx + 26, yy - 2); cx += w + 16;
        });
      } else {
        x.fillStyle = cream; x.font = `500 ${right ? 42 : 52}px ${FONT_D}`;
        const lines = wrap(x, s.text, tw2), lh = right ? 54 : 66, y0 = H / 2 - (lines.length * lh) / 2 + lh * 0.75;
        lines.forEach((l, i) => { x.globalAlpha = fade * sstep(i * 0.04, i * 0.04 + 0.12, p); x.fillText(l, tx, y0 + i * lh); });
        x.globalAlpha = fade;
        const rx = 760, rw = 420, ry = 170, rh = 380;
        if (s.vis === 'untangle') {
          const e = sstep(0.25, 0.8, p); x.strokeStyle = mint; x.lineWidth = 5; x.lineJoin = 'round'; x.beginPath();
          for (let i = 0; i <= 80; i++) { const u = i / 80, n = Math.sin(u * 23) * 0.6 + Math.sin(u * 7 + 1) * 0.8 + Math.cos(u * 41) * 0.4; const px = rx + u * rw, py = ry + rh / 2 + n * 90 * (1 - e) + Math.sin(u * 60 + lt * 3) * 18 * (1 - e) * mo; i ? x.lineTo(px, py) : x.moveTo(px, py); }
          x.stroke(); x.fillStyle = amber; x.beginPath(); x.arc(rx + rw, ry + rh / 2, 10 * e, 0, Math.PI * 2); x.fill();
        } else if (s.vis === 'dots') {
          const e = sstep(0.3, 0.75, p);
          for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) {
            const k = i + j * 8, px = rx + 20 + i * 54, py = ry + 20 + j * 54, hit = k === 27;
            x.fillStyle = hit ? amber : 'rgba(245,236,220,0.35)'; x.beginPath(); x.arc(px, py, hit ? 6 + 30 * e : 5 + Math.max(0, 3 * e - Math.hypot(i - 3, j - 3) * 0.6), 0, Math.PI * 2); x.fill();
          }
        } else if (s.vis === 'code') {
          const code = ['<div class="app">', '  const why = ask();', '  if (why) build();', '  <Screen idea={why} />', '</div>'];
          const typed = Math.floor(sstep(0.05, 0.5, p) * code.join('').length);
          const ui = sstep(0.55, 0.8, p);
          x.font = `400 26px ui-monospace, Menlo, monospace`; let n = 0;
          x.globalAlpha = fade * (1 - ui);
          code.forEach((l, i) => { const vis = l.slice(0, Math.max(0, typed - n)); n += l.length; x.fillStyle = i % 2 ? mint : cream; x.fillText(vis, rx, ry + 60 + i * 52); });
          x.globalAlpha = fade * ui;
          x.fillStyle = cream; x.beginPath(); x.roundRect(rx, ry + 10, rw, 300, 18); x.fill();
          x.fillStyle = '#3F746E'; x.beginPath(); x.roundRect(rx + 24, ry + 34, rw - 48, 110, 12); x.fill();
          x.fillStyle = '#d9cbb4'; [170, 210, 250].forEach((yy, i) => { x.beginPath(); x.roundRect(rx + 24, ry + yy, (rw - 48) * [1, 0.7, 0.5][i], 22, 11); x.fill(); });
        } else if (s.vis === 'cards') {
          ['#5b3fd0', '#1d1e23', '#c9a982'].forEach((c, i) => {
            const a = sstep(0.1 + i * 0.12, 0.35 + i * 0.12, p); x.globalAlpha = fade * a;
            x.fillStyle = c; x.beginPath(); x.roundRect(rx + i * 70, ry + 40 + i * 60 + (1 - a) * 40 * mo, 260, 190, 16); x.fill();
            x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(rx + i * 70 + 22, ry + 70 + i * 60 + (1 - a) * 40 * mo, 120, 12);
          });
        }
      }
    } else if (s.k === 'big') {
      x.textAlign = 'center';
      const g = x.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 380 * sstep(0, 3, lt) + 40); g.addColorStop(0, 'rgba(242,184,107,0.35)'); g.addColorStop(1, 'rgba(242,184,107,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = cream; x.font = `500 104px ${FONT_D}`; x.fillText('Welcome to my world.', W / 2, H / 2 + 34);
    } else if (s.k === 'end') {
      x.textAlign = 'center'; x.fillStyle = cream; x.font = `500 64px ${FONT_D}`;
      wrap(x, s.text, 1000).forEach((l, i, a) => x.fillText(l, W / 2, H / 2 - (a.length - 1) * 38 + i * 76));
      x.globalAlpha = fade * (0.6 + 0.4 * Math.sin(lt * 2.4)); x.fillStyle = amber; x.font = `500 24px ${FONT_T}`; x.fillText('Choose below  ↓', W / 2, H / 2 + 150);
    }
    x.globalAlpha = 1;
    grain(x);
    x.fillStyle = '#000'; x.fillRect(0, 0, W, 46); x.fillRect(0, H - 46, W, 46);
    if (tvPower < 1) {
      const pw = tvPower;
      if (pw < 0.35) { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); const lw = (pw / 0.35) * W; x.fillStyle = '#fff'; x.fillRect(W / 2 - lw / 2, H / 2 - 2, lw, 4); }
      else { const hh = ((pw - 0.35) / 0.65) * H; x.fillStyle = '#000'; x.fillRect(0, 0, W, H / 2 - hh / 2); x.fillRect(0, H / 2 + hh / 2, W, H / 2 - hh / 2); x.fillStyle = `rgba(255,255,255,${(1 - pw) * 0.8})`; x.fillRect(0, H / 2 - hh / 2, W, hh); }
    }
    x.restore();
    if (idx !== movie.idx) { movie.idx = idx; o.onMovieLine && o.onMovieLine(idx, FILM[idx].text, FILM[idx].k); if (FILM[idx].k === 'end' && !movie.ended) { movie.ended = true; o.onMovie && o.onMovie({ playing: true, ended: true }); } }
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(pickables, true)[0];
    return h ? h.object.userData.spot : null;
  };
  var down = null;
  const lampAt = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects([lampG, chairG, SH, fl, sofa, dl], true)[0]; return h && (h.object.userData.item === 'lamp' || h.object.userData.item === 'lamp2' || h.object.userData.item === 'lamp3') && h.distance < 12 ? h.object.userData.item : null; };
  const lampModes = () => mode === 'explore' || mode === 'walking' || mode === 'shelf' || mode === 'seated';
  const pickItem = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(shelfPick, true)[0]; return h ? h.object.userData.item : null; };
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), fhit = new THREE.Vector3();
  const floorAt = (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(floorPlane, fhit)) return null; if (fhit.x < -5 || fhit.x > 5 || fhit.z < -4 || fhit.z > 4) return null; return { x: fhit.x, z: fhit.z }; };
  const onDown = e => { try { canvas.focus({ preventScroll: true }); } catch (er) {} if (!inputOn) return; down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, type: e.pointerType }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} };
  const onMove = e => {
    if (down && e.pointerType === 'mouse' && e.buttons === 0) down = null;
    if (down) {
      const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) down.moved = true;
      if (down.moved && down.type !== 'touch') canvas.style.cursor = 'grabbing';
      if (down.moved && (mode === 'explore' || mode === 'gate' || mode === 'seated') && !tw) {
        const k = down.type === 'touch' ? 0.006 : 0.0042;
        P.yaw += dx * k; P.pitch = clamp(P.pitch + dy * k, -0.75, 0.6);
        if (mode === 'gate') P.yaw = clamp(P.yaw, -0.5, 0.5);
        if (mode === 'seated') P.yaw = clamp(P.yaw, -0.9, 0.9);
      }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const lh = (lampModes() && lampAt(e.clientX, e.clientY)) || false;
    if (lh !== lampHover) { lampHover = lh; lamp2Hover = lh; if (!lh) o.onShelfHover && o.onShelfHover(null); }
    if (lh) { canvas.style.cursor = 'pointer'; o.onShelfHover && o.onShelfHover({ text: lampTip(lh), x: e.clientX, y: e.clientY }); return; }
    if (mode === 'shelf') {
      const it = pickItem(e.clientX, e.clientY);
      if (it !== hoverItem) { hoverItem = it; canvas.style.cursor = it ? 'pointer' : 'default'; }
      o.onShelfHover && o.onShelfHover(it ? { text: itemTip(it), x: e.clientX, y: e.clientY } : null);
      return;
    }
    if (hoverItem) { hoverItem = null; o.onShelfHover && o.onShelfHover(null); }
    const s = pickAt(e.clientX, e.clientY);
    const usable = s && (mode === 'gate' ? (s === 'bell' || s === 'door-out') : mode === 'explore' && s !== 'bell' && s !== 'door-out');
    if ((usable ? s : null) !== hoverSpot) { hoverSpot = usable ? s : null; canvas.style.cursor = hoverSpot ? 'pointer' : 'grab'; o.onHover && o.onHover(hoverSpot); }
  };
  const onUp = e => {
    if (!down) return; const d = down; down = null;
    if (d.moved && d.type !== 'touch') canvas.style.cursor = 'grab';
    if (d.moved || !inputOn) return;
    { const lh = lampModes() && lampAt(e.clientX, e.clientY); if (lh) { toggleLamp(lh); if (e.pointerType === 'mouse') o.onShelfHover && o.onShelfHover({ text: lampTip(lh), x: e.clientX, y: e.clientY }); return; } }
    if (mode === 'shelf') { const it = pickItem(e.clientX, e.clientY); if (it) handleItem(it); else closeBook(); if (it && e.pointerType === 'mouse') o.onShelfHover && o.onShelfHover({ text: itemTip(it), x: e.clientX, y: e.clientY }); return; }
    const s = pickAt(e.clientX, e.clientY);
    if (mode === 'gate' && !s) return;
    if (mode === 'gate') { if (s === 'bell' || s === 'door-out') startFromGate(); return; }
    if (mode !== 'explore' && mode !== 'walking') return;
    if (s && spots[s]) { if (prompt === s && mode === 'explore') { o.onInteract && o.onInteract(s); return; } goTo(s); return; }
    const fh = floorAt(e.clientX, e.clientY); if (fh) walkToPoint(fh.x, fh.z);
  };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.style.cursor = 'grab';
  const KM = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', KeyQ: 'tl' };
  const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const onKD = e => {
    if (e.repeat && !KM[e.code]) return;
    if (!inputOn || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const onCtl = e.target && /^(BUTTON|A)$/.test(e.target.tagName);
    if (KM[e.code]) { keys[KM[e.code]] = true; if (mode === 'explore' || mode === 'seated') e.preventDefault(); return; }
    if (e.code === 'KeyE' || (e.code === 'Enter' && !onCtl)) { e.preventDefault(); interact(); }
  };
  const onKU = e => { if (KM[e.code]) keys[KM[e.code]] = false; };
  const onBlur = () => { for (const k in keys) keys[k] = false; down = null; joy = { x: 0, y: 0 }; vel.set(0, 0); };
  const onWinUp = () => { down = null; };
  const onVis = () => { if (document.hidden) onBlur(); };
  window.addEventListener('keydown', onKD); window.addEventListener('keyup', onKU); window.addEventListener('blur', onBlur);
  window.addEventListener('pointerup', onWinUp); document.addEventListener('visibilitychange', onVis);

  /* ---------- loop ---------- */
  let baseFov = 60, fovZoom = 0;
  function resize() { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; const asp = w / h; baseFov = clamp(2 * Math.atan(Math.tan(32 * Math.PI / 180) / asp) * 180 / Math.PI, 60, 84); camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const clock = new THREE.Clock(); let raf = 0, time = 0, flash = 0, nextFlash = 6;
  const fwd = new THREE.Vector2(), rgt = new THREE.Vector2(), corner = new THREE.Vector3();
  function frame() {
    raf = requestAnimationFrame(frame);
    const rawDt = Math.min(0.25, clock.getDelta()), dt = Math.min(0.05, rawDt); time += dt;
    // environment
    const k = snap || reduce ? 1 : Math.min(1, dt * 1.6); snap = false;
    CK.forEach(c => cur[c].lerp(T[c], k)); NK.forEach(n => { cur[n] = cur[n] === undefined ? T[n] : cur[n] + (T[n] - cur[n]) * k; });
    skyMat.uniforms.top.value.copy(cur.top); skyMat.uniforms.bot.value.copy(cur.bot);
    scene.fog.color.copy(cur.fog); scene.fog.near = cur.fogN; scene.fog.far = cur.fogF;
    sun.color.copy(cur.sun); sun.intensity = cur.sunI; sun.position.lerp(new THREE.Vector3(...T.sunP), k);
    if (!reduce && T.rain > 0.5) { nextFlash -= dt; if (nextFlash < 0) { flash = 1; nextFlash = 8 + Math.random() * 10; } }
    flash *= 0.85;
    hemi.intensity = cur.hemi + flash * 1.4;
    const tvDim = 1 - tvPower * 0.35;
    ceilLights.forEach(l => { l.intensity = cur.ceil * tvDim; }); ceilM.emissiveIntensity = 0.6 + cur.ceil * 0.25;
    floorL.intensity = (0.25 + cur.lamp * 0.9) * lamp2E; deskL.intensity = cur.lamp * 0.8 * lamp3E; shadeM.emissiveIntensity = 0.04 + (0.3 + cur.lamp * 0.25) * lamp2E + (lamp2Hover === 'lamp2' && !lamp2On ? 0.1 : 0);
    renderer.toneMappingExposure = cur.exp;
    rainMat.opacity = cur.rain * 0.5; starMat.opacity = cur.stars;
    if (cur.rain > 0.01 && !reduce) { for (let i = 0; i < RN; i++) { const q = i * 6; let y = rPos[q + 1] - rSpd[i] * dt; if (y < 0) y += 9; rPos[q + 1] = y; rPos[q + 4] = y - 0.28; } rainGeo.attributes.position.needsUpdate = true; }
    // door + bell
    doorT += ((doorV) - doorT) * (reduce ? 1 : Math.min(1, rawDt * 1.3));
    doorPivot.rotation.y = -ease(clamp(doorT, 0, 1)) * 1.72; entryL.intensity = clamp(doorT, 0, 1) * 4.5;
    updateShelf(rawDt); updateLamp(rawDt);
    gap.visible = doorT < 0.05;
    bellT = Math.max(0, bellT - dt * 1.6);
    bellBtn.position.z = 0.015 - Math.sin(Math.min(1, bellT) * Math.PI) * 0.008; bellBtnM.emissiveIntensity = 0.4 + bellT * 2.5 + (mode === 'gate' ? Math.sin(time * 2.5) * 0.25 + 0.25 : 0);
    // tv
    tvPower += (tvTarget - tvPower) * (reduce ? 1 : Math.min(1, rawDt * 1.4)); if (Math.abs(tvTarget - tvPower) < 0.002) tvPower = tvTarget;
    tvLight.intensity = tvPower * 2.2;
    if (movie.playing && tvPower > 0.3) movie.t += rawDt;
    if (tvPower > 0.001 || movie.playing) { drawFilm(); tvTex.needsUpdate = true; } else if (!drawFilm.idle) { drawFilm(); tvTex.needsUpdate = true; drawFilm.idle = true; }
    if (tvPower > 0.001) drawFilm.idle = false;
    // camera
    if (tw) {
      tw.t += rawDt; const e = ease(clamp(tw.t / tw.dur, 0, 1));
      if (tw.path) {
        const d = e * tw.L, c = tw.cum, q = tw.path; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
        const k = c[i] > c[i - 1] ? clamp((d - c[i - 1]) / (c[i] - c[i - 1]), 0, 1) : 1;
        P.x = q[i - 1].x + (q[i].x - q[i - 1].x) * k; P.y = q[i - 1].y + (q[i].y - q[i - 1].y) * k; P.z = q[i - 1].z + (q[i].z - q[i - 1].z) * k;
        const dx = SCREEN.x - P.x, dz = SCREEN.z - P.z, hd = Math.max(0.05, Math.hypot(dx, dz)), lookYaw = Math.atan2(-dx, -dz), lookPitch = Math.atan2(SCREEN.y - P.y, hd);
        const w = sstep(0, 0.3, tw.t / tw.dur), fin = sstep(0.75, 1, tw.t / tw.dur);
        P.yaw = tw.yaw0 + angDiff(tw.yaw0, lookYaw) * w; P.yaw = P.yaw + angDiff(P.yaw, 0) * fin;
        P.pitch = tw.pitch0 + (lookPitch - tw.pitch0) * w; P.pitch = P.pitch * (1 - fin);
      } else {
      const a = tw.from, b = tw.to;
      P.x = a.x + (b.x - a.x) * e; P.y = a.y + (b.y - a.y) * e; P.z = a.z + (b.z - a.z) * e;
      P.yaw = a.yaw + angDiff(a.yaw, b.yaw) * e; P.pitch = a.pitch + (b.pitch - a.pitch) * e;
      }
      if (tw.t >= tw.dur) { const d = tw.done; tw = null; d && d(); }
    }
    if (tw && mode === 'walking' && (keys.f || keys.b || keys.l || keys.r || keys.tl || keys.tr || joy.x || joy.y || joy.t)) { tw = null; mode = 'explore'; o.onState && o.onState('explore'); }
    if (tw) {} else if (mode === 'explore' && inputOn) {
      const ix = (keys.r ? 1 : 0) - (keys.l ? 1 : 0) + joy.x, iz = (keys.f ? 1 : 0) - (keys.b ? 1 : 0) + joy.y;
      if (!ix && !iz && Math.hypot(vel.x, vel.y) < 0.02) vel.set(0, 0);
      P.yaw += ((keys.tl ? 1 : 0) - (keys.tr ? 1 : 0) + (joy.t || 0)) * 1.9 * dt;
      fwd.set(-Math.sin(P.yaw), -Math.cos(P.yaw)); rgt.set(Math.cos(P.yaw), -Math.sin(P.yaw));
      let mx = fwd.x * iz + rgt.x * ix, mz = fwd.y * iz + rgt.y * ix; const ml = Math.hypot(mx, mz);
      if (ml > 1) { mx /= ml; mz /= ml; }
      const tk = Math.min(1, dt * 9); vel.x += (mx * 1.9 - vel.x) * tk; vel.y += (mz * 1.9 - vel.y) * tk;
      let nx = P.x + vel.x * dt, nz = P.z + vel.y * dt;
      const stuck = blocked(P.x, P.z, 0.28);
      if (stuck || !blocked(nx, P.z, 0.28)) P.x = nx; else vel.x = 0;
      if (stuck || !blocked(P.x, nz, 0.28)) P.z = nz; else vel.y = 0;
      P.x = clamp(P.x, -4.7, 4.7); P.z = clamp(P.z, -3.7, 3.7);
    }
    // prompt
    let best = null;
    if (mode === 'explore' && !tw) {
      let bd = 1e9; const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
      Object.values(spots).forEach(s => { const dx = s.x - P.x, dz = s.z - P.z, d = Math.hypot(dx, dz); if (d < s.r && ((dx * fx + dz * fz) / (d || 1) > 0.35 || (s.id === 'sofa' && d < 1.3)) && d < bd) { bd = d; best = s.id; } });
    }
    if (best !== prompt) { prompt = best; o.onPrompt && o.onPrompt(prompt); }
    const zt = mode === 'seated' ? 1 : 0; fovZoom += (zt - fovZoom) * (reduce ? 1 : Math.min(1, rawDt * 1.5));
    const seatFov = clamp(2 * Math.atan(Math.tan(16.5 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 34, 80);
    const fz = baseFov + (seatFov - baseFov) * ease(fovZoom); if (Math.abs(camera.fov - fz) > 0.01) { camera.fov = fz; camera.updateProjectionMatrix(); }
    markerT = Math.max(0, markerT - rawDt * 0.9); marker.material.opacity = mode === 'walking' ? 0.9 : markerT * 0.9; marker.scale.setScalar(1 + (1 - markerT) * 0.3);
    camera.position.set(P.x, P.y, P.z); camera.rotation.set(P.pitch, P.yaw, 0); camera.updateMatrixWorld();
    updClock();
    // desk screen rect
    // screen is on (showing the project carousel) from the moment you step inside; off only at the front door
    const atDesk = mode === 'desk' || mode === 'deskEnter' || mode === 'deskExit';
    if (atDesk !== monChrome) { monChrome = atDesk; drawMon(); }
    monScreen.material.color.setScalar(mode === 'gate' || mode === 'ringing' ? 0 : 1);
    if (mode === 'desk' || mode === 'deskEnter' || mode === 'deskExit') {
      let scrBehind = false; const r = canvas.getBoundingClientRect(), pts = [[-0.43, 0.25], [0.43, 0.25], [-0.43, -0.25], [0.43, -0.25]].map(([dx, dy]) => { corner.set(SCREEN.x + dx, SCREEN.y + dy, SCREEN.z).project(camera); if (corner.z > 1 || corner.z < -1) scrBehind = true; return [(corner.x + 1) / 2 * r.width + r.left, (1 - corner.y) / 2 * r.height + r.top]; });
      const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
      o.onScreenRect && o.onScreenRect(scrBehind ? { x: 0, y: 0, w: 0, h: 0, phase: mode } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0, phase: mode }); rectOn = true;
    } else if (rectOn) { rectOn = false; o.onScreenRect && o.onScreenRect(null); }
    if (mode === 'seated' && tvPower > 0.98) {
      let behind = false; const r = canvas.getBoundingClientRect(), pts = [[-0.8, 0.45], [0.8, 0.45], [-0.8, -0.45], [0.8, -0.45]].map(([dx, dy]) => { corner.set(-2 + dx, 1.45 + dy, -3.926).project(camera); if (corner.z > 1 || corner.z < -1) behind = true; return [(corner.x + 1) / 2 * r.width + r.left, (1 - corner.y) / 2 * r.height + r.top]; });
      const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
      o.onTvRect && o.onTvRect(behind ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0, pts }); tvRectOn = true;
    } else if (tvRectOn) { tvRectOn = false; o.onTvRect && o.onTvRect(null); }
    if (labelEls) {
      camera.updateMatrixWorld(); const r = canvas.getBoundingClientRect(), showL = (mode === 'explore' || mode === 'walking') && inputOn, showB = mode === 'gate' && inputOn;
      for (const id in labelEls) {
        const el = labelEls[id], p = LABEL_POS[id]; if (!p) continue; lv.set(p[0], p[1], p[2]); const d = Math.hypot(p[0] - P.x, p[2] - P.z);
        lv.project(camera); const vis = (id === 'bell' ? showB : showL && d > 0.7) && lv.z < 1 && Math.abs(lv.x) < 0.97 && Math.abs(lv.y) < 0.94;
        const act = id === prompt || id === hoverSpot || (id === lampHover);
        el.style.opacity = vis ? (act ? '1' : '0.85') : '0'; el.style.pointerEvents = vis ? 'auto' : 'none';
        if (vis) el.style.transform = 'translate(' + ((lv.x + 1) / 2 * r.width).toFixed(1) + 'px,' + ((1 - lv.y) / 2 * r.height).toFixed(1) + 'px) translate(-50%,-50%) scale(' + (act ? 1.3 : 1) + ')';
      }
    }
    renderer.render(scene, camera);
  }
  drawFilm();
  frame();
  setTimeout(() => o.onReady && o.onReady(), 50);

  return {
    ring: () => startFromGate(), intro, sit, stand, toDesk, leaveDesk, goTo, restart, interact,
    setTime: (n, i) => setTime(n, i), setInput: v => { inputOn = v; if (!v) onBlur(); }, setJoy: (x, y, t = 0) => { joy = { x, y, t }; },
    play: playMovie, pause: pauseMovie, skip: skipMovie, replay, tvOff: () => { tvTarget = 0; movie.playing = false; },
    redrawMon: () => drawMon(),
    refreshText: () => { shelfTexLate.forEach(t => t.userData.redraw()); plateTex.userData.redraw(); monTex.userData.redraw(); poster1.userData.redraw(); shelfTex.forEach(t => t.userData.redraw()); },
    toShelf, leaveShelf, closeBook, clickItem: handleItem, toggleLamp, isLampOn: (id) => isOn(id || 'lamp'), setPhoto, ejectAlbum: () => { if (onPlayer != null && !albBusy()) { albums[onPlayer].m.target = 0; onPlayer = null; } queueAlb = null; }, setPlayback: st => { playState = st; }, hasOpenBook: () => selBook != null || pendBook != null, books: BOOKS, albums: ALBUMS,
    getMode: () => mode, getPrompt: () => prompt, film: FILM, setLabels: (m) => { labelEls = m; }, walkTo: walkToPoint, debug: () => ({ x: +P.x.toFixed(2), z: +P.z.toFixed(2), yaw: +P.yaw.toFixed(2), vx: +vel.x.toFixed(2), vz: +vel.y.toFixed(2), keys: { ...keys }, joy: { ...joy }, down: !!down, tw: !!tw, inputOn, blocked: blocked(P.x, P.z, 0.28) }), 
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU); window.removeEventListener('blur', onBlur); window.removeEventListener('pointerup', onWinUp); document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      renderer.dispose();
    }
  };
}

window.createApartment = async function (canvas, o) { if (!THREE) THREE = window.THREE_LIB || await import(THREE_URL); return createApartment(canvas, o); };
window.dispatchEvent(new Event('apartment-module-ready'));
})();
