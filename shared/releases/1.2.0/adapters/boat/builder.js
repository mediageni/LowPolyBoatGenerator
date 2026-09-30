// Pure builder: params -> THREE.Group (a real, flat-shaded low-poly boat/ship).
// The HULL is a parametric shell built from cross-section stations from a transom
// stern to a pointed bow (plan-view taper + keel rocker + sheer line). On top sits
// a per-type SUPERSTRUCTURE: thwarts (rowboat), mast+sail (sailboat), wheelhouse
// (fishing/tug), a sleek deckhouse (yacht) or container stacks + bridge + funnel
// (cargo ship). No UI, no globals. Deterministic from the seed.

import * as THREE from "three";
import { makeRng } from "@engine/rng.js";
import { detailed } from "@engine/options.js";
import { addBoatDetails } from "./details.js";
import { tube as detailTube } from "@engine/geometry.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

// --- low-level mesh assembly --------------------------------------------------
function tri(pos, a, b, c) {
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}
function quad(pos, a, b, c, d) {
  tri(pos, a, b, c);
  tri(pos, a, c, d);
}
function meshFrom(positions, material, dbl) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, dbl ? material : material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function box(w, h, d, mat, cx, cy, cz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(cx, cy + h / 2, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// --- hull cross-section at station t in [0 (stern) .. 1 (bow)] ----------------
function station(p, t) {
  const z = lerp(-p.length / 2, p.length / 2, t);
  const amid = 0.55 + 0.45 * Math.sin(Math.PI * Math.pow(t, 0.85)); // fullness, wide amidships
  const bowTaper = t > 0.78 ? Math.max(0, 1 - (t - 0.78) / 0.22) : 1; // shrink to a point at the bow
  const hw = (p.beam / 2) * amid * bowTaper + 0.001;
  let by = -p.draft * (0.35 + 0.65 * Math.sin(Math.PI * Math.pow(t, 0.9)));
  if (t > 0.8) by += ((t - 0.8) / 0.2) * p.draft * 0.85; // bow lifts toward the waterline
  const dy = p.freeboard * (0.82 + 0.34 * Math.pow(t, 1.4)); // sheer: deck rises toward the bow
  return { z, hw, by, dy };
}

// the hull shell (sides + bottom + transom) and a separate deck cap
function buildHull(p, mats) {
  const N = 12;
  const S = [];
  for (let i = 0; i <= N; i++) S.push(station(p, i / N));
  const hull = [],
    deck = [];
  for (let i = 0; i < N; i++) {
    const a = S[i],
      b = S[i + 1];
    const aTL = [-a.hw, a.dy, a.z],
      aTR = [a.hw, a.dy, a.z],
      aBL = [-a.hw, a.by, a.z],
      aBR = [a.hw, a.by, a.z];
    const bTL = [-b.hw, b.dy, b.z],
      bTR = [b.hw, b.dy, b.z],
      bBL = [-b.hw, b.by, b.z],
      bBR = [b.hw, b.by, b.z];
    quad(hull, aTR, aBR, bBR, bTR); // starboard side
    quad(hull, aTL, bTL, bBL, aBL); // port side
    quad(hull, aBL, bBL, bBR, aBR); // bottom
    quad(deck, aTL, aTR, bTR, bTL); // deck cap
  }
  const t = S[0]; // transom (flat stern)
  quad(
    hull,
    [-t.hw, t.dy, t.z],
    [-t.hw, t.by, t.z],
    [t.hw, t.by, t.z],
    [t.hw, t.dy, t.z],
  );
  const g = new THREE.Group();
  if (detailed(p))
    for (const positions of [hull, deck])
      for (let i = 0; i < positions.length; i += 9) {
        for (let j = 0; j < 3; j++)
          [positions[i + 3 + j], positions[i + 6 + j]] = [
            positions[i + 6 + j],
            positions[i + 3 + j],
          ];
      }
  g.add(meshFrom(hull, mats.hull));
  if (detailed(p) && p.form === "open") {
    // An open dinghy has an interior floor and inward-facing sides, not a deck cap.
    const inside = [];
    for (let i = 0; i < N; i++) {
      const a = S[i],
        b = S[i + 1],
        ay = Math.max(a.by + p.draft * 0.24, p.freeboard * 0.12),
        by = Math.max(b.by + p.draft * 0.24, p.freeboard * 0.12);
      quad(
        inside,
        [-a.hw * 0.91, ay, a.z],
        [-b.hw * 0.91, by, b.z],
        [b.hw * 0.91, by, b.z],
        [a.hw * 0.91, ay, a.z],
      );
      for (const side of [-1, 1]) {
        const A = [side * a.hw * 0.97, a.dy, a.z],
          B = [side * b.hw * 0.97, b.dy, b.z],
          C = [side * b.hw * 0.91, by, b.z],
          D = [side * a.hw * 0.91, ay, a.z];
        if (side === 1) quad(inside, A, D, C, B);
        else quad(inside, A, B, C, D);
      }
    }
    g.add(meshFrom(inside, mats.deck));
    for (let i = 0; i < N; i++)
      for (const side of [-1, 1])
        detailTube(
          g,
          mats.trim,
          [side * S[i].hw, S[i].dy, S[i].z],
          [side * S[i + 1].hw, S[i + 1].dy, S[i + 1].z],
          p.beam * 0.025,
        );
  } else g.add(meshFrom(deck, mats.deck));
  g.name = "Hull and deck";
  return g;
}

// deck height at a station t (to seat the superstructure on the deck)
const deckY = (p, t) => station(p, t).dy;
const beamAt = (p, t) => station(p, t).hw * 2;

// --- superstructures ----------------------------------------------------------
// Heights are sized off the BEAM (a boat's beam is the natural scale), so a small
// boat gets a small deckhouse and a wide ship a tall one — never a tower.
function cabin(p, mats, { t, w, h, len, glass = true, rise = 0 }) {
  const g = new THREE.Group();
  const cz = lerp(-p.length / 2, p.length / 2, t);
  const y = deckY(p, t) + rise;
  g.name = "Cabin";
  if (p.cabinOn === false) return g;
  g.add(box(w, h, len, mats.cabin, 0, y, cz));
  if (glass && detailed(p)) {
    const wy = y + h * 0.4,
      wh = h * 0.42;
    for (const side of [-1, 1]) {
      g.add(
        box(
          w * 0.84,
          wh,
          0.02,
          mats.glass,
          0,
          wy,
          cz + side * (len / 2 + 0.012),
        ),
      );
      g.add(
        box(0.02, wh, len * 0.8, mats.glass, side * (w / 2 + 0.012), wy, cz),
      );
      for (const x of [-w * 0.42, 0, w * 0.42])
        g.add(
          box(
            w * 0.025,
            wh,
            0.03,
            mats.trim,
            x,
            wy,
            cz + side * (len / 2 + 0.025),
          ),
        );
      for (const z of [-len * 0.4, 0, len * 0.4])
        g.add(
          box(
            0.03,
            wh,
            len * 0.025,
            mats.trim,
            side * (w / 2 + 0.025),
            wy,
            cz + z,
          ),
        );
    }
    g.add(box(w * 1.04, h * 0.07, len * 1.04, mats.cabin, 0, y + h, cz));
  } else if (glass)
    g.add(box(w * 1.01, h * 0.42, len * 0.84, mats.glass, 0, y + h * 0.4, cz)); // window band
  return g;
}

function mastSail(p, mats, { t, height, boom }) {
  const g = new THREE.Group();
  g.name = "Mast and sails";
  if (p.mastOn === false) return g;
  const cz = lerp(-p.length / 2, p.length / 2, t),
    y = deckY(p, t);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(p.beam * 0.03, p.beam * 0.04, height, 6),
    mats.trim,
  );
  mast.position.set(0, y + height / 2, cz);
  mast.castShadow = true;
  g.add(mast);
  if (boom && p.sailsOn !== false) {
    const top = y + height * 0.92,
      foot = y + p.freeboard * 0.5 + 0.3;
    const sail = [];
    tri(
      sail,
      [0.02, top, cz],
      [0.02, foot, cz],
      [0.02, foot, cz - p.length * 0.32],
    ); // mainsail
    g.add(meshFrom(sail, mats.sail, true));
    const jib = [];
    tri(
      jib,
      [-0.02, top * 0.9, cz],
      [-0.02, foot, cz],
      [-0.02, foot, cz + p.length * 0.36],
    ); // jib
    g.add(meshFrom(jib, mats.sail, true));
    const boomM = new THREE.Mesh(
      new THREE.CylinderGeometry(
        p.beam * 0.02,
        p.beam * 0.02,
        p.length * 0.34,
        5,
      ),
      mats.trim,
    );
    boomM.rotation.x = Math.PI / 2;
    boomM.position.set(0, foot, cz - p.length * 0.16);
    g.add(boomM);
  }
  return g;
}

function funnel(p, mats, { t, h, r }) {
  const cz = lerp(-p.length / 2, p.length / 2, t),
    y = deckY(p, t);
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 1.12, h, 8),
    mats.funnel,
  );
  m.position.set(0, y + h / 2, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function containers(p, mats, r) {
  const g = new THREE.Group();
  g.name = "Cargo";
  if (p.cargoOn === false) return g;
  const dy = deckY(p, 0.5);
  const cl = p.length * 0.08,
    ch = p.beam * 0.4,
    cw = p.beam * 0.26;
  const startZ = -p.length * 0.16,
    bayLen = p.length * 0.6;
  const rows = Math.max(3, Math.round(bayLen / (cl + 0.3)));
  const cols = Math.max(2, Math.round((p.beam * 0.82) / (cw + 0.2)));
  const palette = mats.containers;
  for (let rI = 0; rI < rows; rI++) {
    const cz = startZ + rI * (cl + 0.3);
    const stack = 1 + Math.floor(r() * 3);
    for (let s = 0; s < stack; s++)
      for (let c = 0; c < cols; c++) {
        if (r() < 0.12) continue;
        const cx = (c - (cols - 1) / 2) * (cw + 0.18);
        g.add(
          box(
            cw,
            ch,
            cl,
            palette[Math.floor(r() * palette.length)],
            cx,
            dy + s * (ch + 0.05),
            cz,
          ),
        );
      }
  }
  return g;
}

const FORMS = {
  open(g, p, mats) {
    // rowboat / dinghy: a few thwarts
    for (const t of [0.3, 0.5, 0.7]) {
      const cz = lerp(-p.length / 2, p.length / 2, t);
      g.add(
        box(
          beamAt(p, t) * 0.82,
          0.1,
          0.42,
          mats.deck,
          0,
          deckY(p, t) - p.freeboard * (detailed(p) ? 0.22 : 0.4),
          cz,
        ),
      );
    }
  },
  sail(g, p, mats) {
    g.add(
      cabin(p, mats, {
        t: 0.4,
        w: p.beam * 0.6,
        h: p.beam * 0.4,
        len: p.length * 0.16,
      }),
    );
    g.add(mastSail(p, mats, { t: 0.5, height: p.length * 0.85, boom: true }));
  },
  fishing(g, p, mats) {
    g.add(
      cabin(p, mats, {
        t: 0.3,
        w: p.beam * 0.72,
        h: p.beam * 0.62,
        len: p.length * 0.2,
      }),
    );
    g.add(mastSail(p, mats, { t: 0.44, height: p.beam * 1.5, boom: false }));
  },
  yacht(g, p, mats) {
    g.add(
      cabin(p, mats, {
        t: 0.46,
        w: p.beam * 0.82,
        h: p.beam * 0.34,
        len: p.length * 0.4,
      }),
    );
    g.add(
      cabin(p, mats, {
        t: 0.52,
        w: p.beam * 0.58,
        h: p.beam * 0.3,
        len: p.length * 0.2,
        rise: detailed(p) ? p.beam * 0.34 : 0,
      }),
    );
    g.add(mastSail(p, mats, { t: 0.46, height: p.beam * 1.1, boom: false }));
  },
  cargo(g, p, mats, r) {
    g.add(containers(p, mats, r));
    g.add(
      cabin(p, mats, {
        t: 0.13,
        w: p.beam * 0.72,
        h: p.beam * 0.7,
        len: p.length * 0.1,
      }),
    );
    g.add(funnel(p, mats, { t: 0.1, h: p.beam * 0.6, r: p.beam * 0.1 }));
  },
  tug(g, p, mats) {
    g.add(
      cabin(p, mats, {
        t: 0.42,
        w: p.beam * 0.72,
        h: p.beam * 0.55,
        len: p.length * 0.26,
      }),
    );
    g.add(funnel(p, mats, { t: 0.28, h: p.beam * 0.5, r: p.beam * 0.15 }));
  },
};

export function buildBoat(p, mats) {
  const g = new THREE.Group();
  g.name = "boat";
  const r = makeRng((p.seed ^ 0xb0a7c0de) >>> 0);
  g.add(buildHull(p, mats));
  (FORMS[p.form] || FORMS.sail)(g, p, mats, r);
  addBoatDetails(g, p, mats, station);

  const box3 = new THREE.Box3().setFromObject(g);
  const size = new THREE.Vector3(),
    center = new THREE.Vector3();
  box3.getSize(size);
  box3.getCenter(center);
  g.userData.size = size;
  g.userData.center = center;
  return g;
}
