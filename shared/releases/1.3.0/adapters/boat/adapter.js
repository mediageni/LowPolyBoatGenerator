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
import { std } from "@engine/materials.js";
import { enrichBoat, BOAT_SCHEMA, BOAT_OPTIONS } from "./details.js";
const samples = Object.keys(ARCHETYPES).flatMap((key) =>
  [0, 1, 42, 12345, 4294967295].map((seed) => paramsFromSeed(seed, key)),
);
export const adapter = {
  id: "boat",
  path: "low-poly-boat-generator",
  label: "Boat & Ship",
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
  schema: schemaFromSamples(samples, SLIDERS, BOAT_SCHEMA),
  enrich: enrichBoat,
  legacyConfig: (params) => params?.detailVersion === undefined,
  options: BOAT_OPTIONS,
  optionsLabel: "Deck & parts",
  firstType: "sailboat",
  build: buildBoat,
  materials: (style, params) => ({
    ...style.materials(params),
    rescue: std({ color: 0xef7951, roughness: 0.8 }),
  }),
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
