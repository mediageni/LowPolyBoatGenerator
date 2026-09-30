// Selectable visual styles: a rig (water/ground + lights with shadows), a sky, and
// a material set for the low-poly boat. The water plane sits on the waterline (y=0)
// so the hull floats; below it stays hidden.

import * as THREE from "three";

import {
  col,
  std,
  groundPlane,
  gradientSky,
  sunRig,
} from "@engine/materials.js";

const rig = (options) =>
  sunRig({ ...options, size: 800, extent: 40, far: 200, hemiIntensity: 0.8 });

const PALETTE = [
  0xd14b3a, 0x2f7fb5, 0x47925a, 0xe0922f, 0x8a8f96, 0x2bb0a6, 0xc23f6a,
];

function mats(p, opts = {}) {
  const hull = col(p.color.hull);
  // hull + deck are hand-built shells; DoubleSide avoids any see-through from a
  // back-wound quad (which otherwise shows up as a stray panel near the stern).
  return {
    hull: std({
      color: hull,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    deck: std({
      color: opts.deck ?? 0xb89a6a,
      roughness: 0.85,
      side: THREE.DoubleSide,
    }),
    cabin: std({ color: opts.cabin ?? 0xf0ece2, roughness: 0.8 }),
    glass: std({
      color: opts.glass ?? 0x3a6184,
      roughness: 0.22,
      metalness: 0.2,
      emissive: 0x15293c,
      emissiveIntensity: 0.5,
    }),
    sail: new THREE.MeshStandardMaterial({
      color: opts.sail ?? 0xffffff,
      emissive: 0xf2f4f8,
      emissiveIntensity: 0.72,
      roughness: 0.95,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    trim: std({ color: opts.trim ?? 0x5a4632, roughness: 0.85 }),
    funnel: std({ color: opts.funnel ?? 0xc8412f, roughness: 0.7 }),
    containers: PALETTE.map((c) => std({ color: c, roughness: 0.75 })),
  };
}

// --- Harbor: bright day, turquoise water (hero look) -------------------------
const harbor = {
  label: "Harbor",
  background: gradientSky([
    [0, "#7cc3ee"],
    [0.55, "#aeddf2"],
    [1, "#dceef7"],
  ]),
  exposure: 1.0,
  rig() {
    return rig({
      water: 0x2e8fb0,
      hemi: [0xffffff, 0x4f7f97],
      sun: [-26, 44, 28],
      sunColor: 0xfff3da,
      sunInt: 1.8,
      waterRough: 0.3,
      waterMetal: 0.15,
    });
  },
  materials(p) {
    return mats(p);
  },
};

// --- Sunset: golden hour on the water ----------------------------------------
const sunset = {
  label: "Sunset",
  background: gradientSky([
    [0, "#3a2a66"],
    [0.45, "#9a4a72"],
    [0.78, "#e0806a"],
    [1, "#f6cf8c"],
  ]),
  exposure: 1.12,
  rig() {
    return rig({
      water: 0x5a5a86,
      hemi: [0x8a6a9a, 0x2a2030],
      sun: [-30, 24, 18],
      sunColor: 0xffb070,
      sunInt: 1.95,
      waterRough: 0.22,
      waterMetal: 0.25,
    });
  },
  materials(p) {
    return mats(p, { deck: 0x9a7e54 });
  },
};

// --- Studio: clean neutral display, calm pale water --------------------------
const studio = {
  label: "Studio",
  background: new THREE.Color("#e9edf2"),
  exposure: 1.0,
  rig() {
    return rig({
      water: 0xdfe7ee,
      hemi: [0xffffff, 0xc4ccd4],
      sun: [-18, 42, 28],
      sunColor: 0xffffff,
      sunInt: 1.8,
      waterRough: 0.5,
      waterMetal: 0.05,
    });
  },
  materials(p) {
    return mats(p);
  },
};

export const STYLES = { harbor, sunset, studio };
export const STYLE_KEYS = Object.keys(STYLES);
