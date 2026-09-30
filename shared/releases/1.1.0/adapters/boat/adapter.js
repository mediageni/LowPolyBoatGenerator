import { buildBoat } from "./builder.js";
import {
  ARCHETYPES,
  SLIDERS,
  paramsFromSeed,
  getDerived,
  setDerived,
} from "./params.js";
import { STYLES } from "./styles.js";
import { schemaFromSamples } from "@engine/state.js";
const samples = Object.keys(ARCHETYPES).flatMap((key) =>
  [0, 1, 42, 12345, 4294967295].map((seed) => paramsFromSeed(seed, key)),
);
export const adapter = {
  id: "boat",
  path: "low-poly-boat-generator",
  label: "Low Poly Boat & Ship",
  noun: "boat",
  filePrefix: "boat",
  defaultLook: "harbor",
  defaultType: null,
  colorKey: "hull",
  colorLabel: "Hue",
  archetypes: ARCHETYPES,
  sliders: SLIDERS,
  styles: STYLES,
  paramsFromSeed,
  getDerived,
  setDerived,
  schema: schemaFromSamples(samples, SLIDERS),
  build: buildBoat,
  materials: (style, params) => style.materials(params),
  paletteSlots: {
    hull: "body",
    deck: "accent",
    cabin: "trim",
    glass: "glass",
    sail: "trim",
    trim: "roof",
    funnel: "accent",
    containers: "body",
  },
  camera: {
    fov: 44,
    near: 0.1,
    far: 2000,
    min: 3,
    max: 400,
    direction: [1, 0.38, 0.34],
  },
};
