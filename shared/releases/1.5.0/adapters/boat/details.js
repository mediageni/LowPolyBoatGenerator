import {
  part,
  box,
  tube,
  ring,
  cylinder,
  mergePart,
} from "@engine/geometry.js";
import {
  detailOption,
  detailRule,
  booleanRule,
  detailed,
  toggle,
} from "@engine/options.js";
export function enrichBoat(params, legacy = false) {
  return {
    ...params,
    detailVersion: legacy ? 0 : 1,
    cabinOn: true,
    mastOn: true,
    sailsOn: true,
    cargoOn: true,
    railsOn: params.form !== "open",
    portholesOn: params.form !== "open",
    lifebuoyOn: params.form !== "open",
    riggingOn: params.form === "sail",
    oarsOn: params.form === "open",
    lifeboatsOn: true,
    poolOn: true,
  };
}
export const BOAT_SCHEMA = {
  detailVersion: detailRule,
  ...Object.fromEntries(
    [
      "cabinOn",
      "mastOn",
      "sailsOn",
      "cargoOn",
      "railsOn",
      "portholesOn",
      "lifebuoyOn",
      "riggingOn",
      "oarsOn",
      "lifeboatsOn",
      "poolOn",
    ].map((key) => [key, booleanRule]),
  ),
};
const closed = (p) => detailed(p) && p.form !== "open";
const hasMast = (p) => ["sail", "fishing", "yacht"].includes(p.form);
export const BOAT_OPTIONS = [
  detailOption,
  toggle("railsOn", "Deck railings", closed),
  toggle("portholesOn", "Hull portholes", closed),
  toggle("lifebuoyOn", "Lifebuoy & bollards", closed),
  toggle(
    "riggingOn",
    "Sail rigging",
    (p) => detailed(p) && p.form === "sail" && p.mastOn,
  ),
  toggle("oarsOn", "Oars", (p) => detailed(p) && p.form === "open"),
  toggle("cabinOn", "Cabin", (p) => p.form !== "open"),
  toggle("mastOn", "Mast", hasMast),
  toggle("sailsOn", "Sails", (p) => p.form === "sail" && p.mastOn),
  toggle("cargoOn", "Container cargo", (p) => p.form === "cargo"),
  toggle(
    "lifeboatsOn",
    "Rescue boats",
    (p) => p.form === "cruise" && p.cabinOn,
  ),
  toggle("poolOn", "Sun deck pool", (p) => p.form === "cruise" && p.cabinOn),
];
export function addBoatDetails(root, p, mats, station) {
  if (!detailed(p)) return;
  const L = p.length,
    B = p.beam;
  if (p.railsOn && p.form !== "open") {
    const group = part(root, "Railings"),
      h = Math.min(1.25, B * 0.22),
      r = B * 0.012;
    for (const side of [-1, 1]) {
      let previous = null;
      for (let i = 0; i <= 12; i++) {
        const s = station(p, 0.03 + (i * 0.93) / 12),
          base = [side * s.hw * 0.94, s.dy + 0.025, s.z];
        const top = [base[0], base[1] + h, base[2]];
        tube(group, mats.trim, base, top, r);
        if (previous) {
          tube(group, mats.trim, previous, top, r);
          tube(
            group,
            mats.trim,
            [previous[0], previous[1] - h * 0.45, previous[2]],
            [top[0], top[1] - h * 0.45, top[2]],
            r * 0.7,
          );
        }
        previous = top;
      }
    }
    mergePart(group);
  }
  if (p.portholesOn && p.form !== "open") {
    const group = part(root, "Portholes");
    for (const side of [-1, 1])
      for (let i = 0; i < 6; i++) {
        const s = station(p, 0.15 + i * 0.1),
          y = s.dy - p.freeboard * 0.33,
          x = side * (s.hw + 0.012),
          r = B * 0.045;
        const frame = ring(group, mats.trim, r, r * 0.14, [x, y, s.z]);
        frame.rotation.y = Math.PI / 2;
        const glass = cylinder(
          group,
          mats.glass,
          r * 0.83,
          0.018,
          [x + side * 0.003, y, s.z],
          12,
        );
        glass.rotation.z = Math.PI / 2;
      }
    mergePart(group);
  }
  if (p.lifebuoyOn && p.form !== "open") {
    const group = part(root, "Lifebuoy and bollards"),
      s = station(p, 0.34),
      r = B * 0.1;
    const buoy = ring(group, mats.rescue, r, r * 0.28, [
      s.hw + 0.05,
      s.dy + 0.16,
      s.z,
    ]);
    buoy.rotation.y = Math.PI / 2;
    for (const t of [0.08, 0.75])
      for (const side of [-1, 1]) {
        const s = station(p, t),
          pos = [side * s.hw * 0.62, s.dy + B * 0.045, s.z];
        cylinder(group, mats.trim, B * 0.025, B * 0.09, pos, 8);
        box(
          group,
          mats.trim,
          [B * 0.11, B * 0.025, B * 0.035],
          [pos[0], pos[1] + B * 0.035, pos[2]],
        );
      }
    mergePart(group);
  }
  if (p.riggingOn && p.form === "sail" && p.mastOn) {
    const group = part(root, "Rigging"),
      s = station(p, 0.5),
      top = [0, s.dy + L * 0.85, s.z];
    for (const t of [0.04, 0.89]) {
      const end = station(p, t);
      tube(group, mats.trim, top, [0, end.dy, end.z], B * 0.005, 4);
    }
    for (const side of [-1, 1])
      tube(group, mats.trim, top, [side * s.hw * 0.9, s.dy, s.z], B * 0.005, 4);
    mergePart(group);
  }
  if (p.oarsOn && p.form === "open") {
    const group = part(root, "Oars"),
      s = station(p, 0.46);
    for (const side of [-1, 1]) {
      const a = [side * B * 0.08, s.dy + 0.1, s.z],
        b = [side * B * 1.08, s.dy - B * 0.24, s.z - L * 0.13];
      tube(group, mats.deck, a, b, B * 0.024);
      const paddle = box(group, mats.deck, [B * 0.32, B * 0.055, B * 0.14], b);
      paddle.rotation.z = -side * 0.24;
    }
    mergePart(group);
  }
  if (p.form === "tug") {
    const group = part(root, "Tug fenders");
    for (const side of [-1, 1])
      for (const t of [0.13, 0.3, 0.5, 0.68]) {
        const s = station(p, t),
          f = ring(group, mats.trim, B * 0.12, B * 0.035, [
            side * (s.hw + 0.08),
            s.dy * 0.55,
            s.z,
          ]);
        f.rotation.y = Math.PI / 2;
        tube(
          group,
          mats.trim,
          [side * (s.hw + 0.08), s.dy, s.z],
          [side * (s.hw + 0.08), s.dy * 0.55 + B * 0.12, s.z],
          B * 0.009,
        );
      }
    mergePart(group);
  }
}
