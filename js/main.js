// Low Poly Boat & Ship Generator — scene, state, render loop.
// Builds real flat-shaded 3D low-poly boats (builder.js) you can orbit + export.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { buildBoat } from './builder.js';
import { STYLES } from './styles.js';
import { paramsFromSeed, setDerived, encodeConfig, decodeConfig } from './params.js';
import { randomSeed, seedToString, stringToSeed } from './rng.js';
import { exportGLB, exportOBJ } from './exporter.js';
import { exportRotationGIF } from './gif-export.js';
import { createUI } from './ui.js?v=20260929-gif-panel';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 2000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.minDistance = 3;
controls.maxDistance = 400;
controls.maxPolarAngle = Math.PI * 0.495;
controls.addEventListener('start', () => { controls.autoRotate = false; });

let styleRig = null;
let boat = null;

const app = {
  params: null,
  styleKey: 'harbor',

  setStyle(key) { if (!STYLES[key]) return; this.styleKey = key; applyStyle(); rebuild(); this.sync(); },
  reroll() { this.params = paramsFromSeed(randomSeed(), null); rebuild(true); this.sync(); },
  setArchetype(key) { this.params = paramsFromSeed(this.params.seed, key); rebuild(true); this.sync(); },
  setSlider(key, value) { setDerived(this.params, key, value); rebuild(); this.sync(); },
  setHue(h) { this.params.color = { ...this.params.color, hull: { ...this.params.color.hull, h } }; rebuild(); this.sync(); },
  loadConfig(p) { this.params = p; rebuild(true); this.sync(); },
  exportGLB() { return exportGLB(boat, `boat-${seedToString(this.params.seed)}`); },
  exportOBJ() { exportOBJ(boat, `boat-${seedToString(this.params.seed)}`); },
  exportGIF(onProgress) {
    const name = document.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return exportRotationGIF({ scene, camera, controls, renderer,
      filename: `${name}-${seedToString(this.params.seed)}.gif`, onProgress, renderLoop: renderFrame });
  },
  shareURL() { const u = new URL(location.href); u.search = '?c=' + encodeConfig(this.params); return u.toString(); },
  get car() { return boat; },
  sync() {},
};

function applyStyle() {
  const style = STYLES[app.styleKey];
  scene.background = style.background;
  renderer.toneMappingExposure = style.exposure ?? 1;
  if (styleRig) { scene.remove(styleRig); disposeTree(styleRig); }
  styleRig = style.rig();
  scene.add(styleRig);
}

function rebuild(reframe = false) {
  const style = STYLES[app.styleKey];
  const m = style.materials(app.params);
  if (boat) { scene.remove(boat); disposeTree(boat); }
  boat = buildBoat(app.params, m);
  scene.add(boat);
  const c = boat.userData.center;
  controls.target.set(0, Math.max(0, c.y), 0);
  if (reframe) frameCamera(boat.userData.size, c);
  updateURL();
}

const STILL = new URLSearchParams(location.search).get('still') != null;
if (STILL) controls.autoRotate = false;

function frameCamera(size, center) {
  // broadside 3/4: the boat's long axis is Z, so sit the camera mostly on +X to
  // show the hull silhouette against the waterline. A LOW eye height reads as a
  // boat (a high angle just shows the deck); `?still=1` locks this for screenshots.
  const L = Math.max(size.x, size.z);
  const d = L * 1.15;
  const eye = STILL ? L * 0.34 : size.y * 0.55 + L * 0.12;
  camera.position.set(d * 1.0, eye, d * 0.34);   // broadside (mostly +X), modest height
  controls.target.set(0, Math.max(0.6, size.y * 0.2), 0);
  controls.update();
}

function updateURL() { history.replaceState(null, '', '?c=' + encodeConfig(app.params)); }

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

function initParams() {
  const q = new URLSearchParams(location.search);
  const c = q.get('c');
  if (c) { const p = decodeConfig(c); if (p) return p; }
  const seed = stringToSeed(q.get('seed'));
  return paramsFromSeed(seed != null ? seed : randomSeed(), q.get('type'));
}

app.params = initParams();
applyStyle();
rebuild(true);
createUI(app);
app.sync();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const renderFrame = () => { controls.update(); renderer.render(scene, camera); };
renderer.setAnimationLoop(renderFrame);

// expose for smoke tests
window.__app = app;
window.__rig = { camera, controls, scene, renderer };
