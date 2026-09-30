import {
  part,
  box,
  tube,
  cylinder,
  chamferedBox,
  mergePart,
} from "@engine/geometry.js";

// Every level sits on the previous deck; the base fits the full hull footprint.
export function buildCruise(root, p, mats, section) {
  if (p.cabinOn === false) return;
  const L = p.length,
    B = Math.min(p.beam, L * 0.25);
  const aft = -L * 0.32,
    fore = L * 0.24;
  const probes = [aft, fore];
  for (let i = 0; i <= 12; i++) {
    const z = L * (i / 12 - 0.5);
    if (z > aft && z < fore) probes.push(z);
  }
  const sections = probes.map((z) => section(p, z));
  const width = Math.min(...sections.map((s) => s.hw)) * 1.88;
  const minY = Math.min(...sections.map((s) => s.dy)),
    baseY = Math.max(...sections.map((s) => s.dy));
  const base = part(root, "Passenger decks");
  const foundation = box(
    base,
    mats.cabin,
    [width, baseY - minY + B * 0.025, fore - aft],
    [0, (baseY + minY) / 2, (fore + aft) / 2],
  );
  foundation.name = "Deck foundation";
  const floorH = Math.min(B * 0.2, L * 0.045);
  let y = baseY;
  let top;
  for (let level = 0; level < 4; level++) {
    const low = aft + level * L * 0.042,
      high = fore - level * L * 0.048;
    const len = high - low,
      w = width * (1 - level * 0.12),
      z = (high + low) / 2;
    const deck = part(base, "Passenger level " + (level + 1));
    box(deck, mats.cabin, [w, floorH, len], [0, y + floorH / 2, z]);
    // Thin projecting floor plates and repeating cabins read as separate decks.
    box(
      deck,
      mats.cabin,
      [w + B * 0.025, B * 0.035, len + B * 0.03],
      [0, y + floorH, z],
    );
    const count = Math.max(3, Math.min(22, Math.floor(len / (floorH * 0.85))));
    for (const side of [-1, 1]) {
      for (let k = 0; k < count; k++) {
        box(
          deck,
          mats.glass,
          [B * 0.008, floorH * 0.38, (len / count) * 0.55],
          [
            side * (w / 2 + B * 0.002),
            y + floorH * 0.55,
            low + ((k + 0.5) * len) / count,
          ],
        );
      }
      if (p.railsOn && level > 0) {
        const railY = y + floorH + B * 0.13;
        for (let k = 0; k <= count; k++) {
          const z0 = low + (k * len) / count;
          tube(
            deck,
            mats.trim,
            [(side * w) / 2, y + floorH, z0],
            [(side * w) / 2, railY, z0],
            B * 0.006,
          );
        }
        tube(
          deck,
          mats.trim,
          [(side * w) / 2, railY, low],
          [(side * w) / 2, railY, high],
          B * 0.007,
        );
      }
    }
    // Bridge glazing faces the bow on the highest passenger level.
    if (level === 3)
      box(
        deck,
        mats.glass,
        [w * 0.86, floorH * 0.43, B * 0.008],
        [0, y + floorH * 0.55, high + B * 0.002],
      );
    mergePart(deck);
    y += floorH;
    top = { w, low, high };
  }
  const equipment = part(root, "Cruise funnels");
  const roofZ = (top.low + top.high) / 2;
  for (const dz of [-L * 0.06, L * 0.06]) {
    chamferedBox(
      equipment,
      mats.funnel,
      [B * 0.25, B * 0.38, B * 0.28],
      [0, y + B * 0.19, roofZ + dz],
      0.2,
    );
    box(
      equipment,
      mats.trim,
      [B * 0.25, B * 0.045, B * 0.28],
      [0, y + B * 0.38, roofZ + dz],
    );
  }
  mergePart(equipment);
  if (p.poolOn) {
    const pool = part(root, "Sun deck pool");
    const w = top.w * 0.42,
      len = Math.min(L * 0.035, (top.high - top.low) * 0.13),
      h = B * 0.065;
    const z = top.high - len * 0.7;
    box(pool, mats.glass, [w, h * 0.55, len], [0, y + h * 0.275, z]);
    for (const side of [-1, 1]) {
      box(
        pool,
        mats.cabin,
        [B * 0.025, h, len + B * 0.04],
        [(side * w) / 2, y + h / 2, z],
      );
      box(
        pool,
        mats.cabin,
        [w, h, B * 0.025],
        [0, y + h / 2, z + (side * len) / 2],
      );
    }
    mergePart(pool);
  }
  if (p.lifeboatsOn) {
    const boats = part(root, "Rescue boats and davits");
    const count = Math.max(
      2,
      Math.min(5, Math.floor((fore - aft) / (B * 0.8))),
    );
    const boatLen = Math.min(B * 0.65, ((fore - aft) / count) * 0.8);
    for (const side of [-1, 1])
      for (let k = 0; k < count; k++) {
        const z = aft + ((k + 0.5) * (fore - aft)) / count;
        const x = side * (width * 0.5 - B * 0.05),
          by = baseY + floorH * 1.7;
        chamferedBox(
          boats,
          mats.rescue,
          [B * 0.12, B * 0.12, boatLen],
          [x, by, z],
          0.3,
        );
        chamferedBox(
          boats,
          mats.cabin,
          [B * 0.095, B * 0.075, boatLen * 0.73],
          [x, by + B * 0.07, z],
          0.3,
        );
        for (const dz of [-boatLen * 0.3, boatLen * 0.3]) {
          const anchor = [side * width * 0.44, baseY + floorH * 2, z + dz];
          tube(boats, mats.trim, anchor, [x, by + B * 0.06, z + dz], B * 0.012);
        }
      }
    mergePart(boats);
  }
}
