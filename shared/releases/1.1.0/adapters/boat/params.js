// Boat parameters: type presets + seed -> params, URL (de)serialization.
// Pure data, no Three.js. These drive a REAL flat-shaded low-poly boat mesh
// (parametric hull + per-`form` superstructure).

import { makeRng, rng } from "@engine/rng.js";

const r2 = (v) => Math.round(v * 1000) / 1000;

// Defaults every type inherits; types override the distinctive bits.
// [lo,hi] number pair = sampled range. Array = random pick. Scalar = fixed.
const BASE = {
  form: "sail", // open | sail | fishing | yacht | cargo | tug
  length: [9, 14],
  beam: [2.6, 3.8], // width
  draft: [1.0, 1.8], // depth below the waterline
  freeboard: [0.9, 1.5], // hull height above the waterline
};

export const ARCHETYPES = {
  rowboat: {
    label: "Rowboat",
    form: "open",
    length: [3.6, 5.2],
    beam: [1.3, 1.9],
    draft: [0.35, 0.55],
    freeboard: [0.7, 1.0],
  },
  sailboat: {
    label: "Sailboat",
    form: "sail",
    length: [8, 13],
    beam: [2.4, 3.4],
    draft: [1.0, 1.6],
    freeboard: [1.3, 1.9],
  },
  fishing: {
    label: "Fishing",
    form: "fishing",
    length: [9, 15],
    beam: [3.0, 4.4],
    draft: [1.0, 1.6],
    freeboard: [1.8, 2.6],
  },
  yacht: {
    label: "Yacht",
    form: "yacht",
    length: [14, 22],
    beam: [4.0, 6.0],
    draft: [1.2, 2.0],
    freeboard: [2.0, 3.0],
  },
  cargo: {
    label: "Cargo Ship",
    form: "cargo",
    length: [26, 40],
    beam: [6, 9],
    draft: [1.8, 2.8],
    freeboard: [3.4, 5.0],
  },
  tug: {
    label: "Tug",
    form: "tug",
    length: [7, 11],
    beam: [3.0, 4.2],
    draft: [1.1, 1.7],
    freeboard: [2.0, 3.0],
  },
};
export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

export const SLIDERS = [
  { key: "length", label: "Length", min: 3, max: 42, step: 0.5 },
  { key: "beam", label: "Beam", min: 1, max: 10, step: 0.1 },
  { key: "draft", label: "Draft", min: 0.3, max: 4, step: 0.1 },
  { key: "freeboard", label: "Freeboard", min: 0.4, max: 4, step: 0.1 },
];

function sample(r, spec) {
  if (Array.isArray(spec)) {
    if (
      spec.length === 2 &&
      typeof spec[0] === "number" &&
      typeof spec[1] === "number"
    )
      return r2(rng.range(r, spec[0], spec[1]));
    return rng.pick(r, spec);
  }
  return spec;
}
const PARAM_KEYS = Object.keys(BASE);

export function paramsFromSeed(seed, archetype) {
  const r = makeRng(seed);
  const key =
    archetype && ARCHETYPES[archetype]
      ? archetype
      : rng.pick(r, ARCHETYPE_KEYS);
  const a = { ...BASE, ...ARCHETYPES[key] };
  const p = { seed: seed >>> 0, archetype: key };
  for (const k of PARAM_KEYS) p[k] = sample(r, a[k]);
  p.color = {
    hull: {
      h: r2(r()),
      s: r2(rng.range(r, 0.45, 0.85)),
      l: r2(rng.range(r, 0.36, 0.56)),
    },
  };
  return p;
}

export function setDerived(p, key, value) {
  p[key] = value;
}
export const getDerived = (p, key) => p[key];

export { encodeConfig, decodeConfig } from "@engine/state.js";
