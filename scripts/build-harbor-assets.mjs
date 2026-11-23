// Builds the attendance board's harbor layers from public/images/lighthouse-harbor.jpg (read only): the base scene,
// the island cut into depth bands so boats can pass behind it, a water mask, the sky strip, and harborMap.ts (the
// water grid and shoreline the layout uses). Run from the repo root after changing the picture:
//   node scripts/build-harbor-assets.mjs
import sharp from "sharp";
import fs from "fs";
const ROOT = process.cwd();
const SRC = ROOT + "/public/images/lighthouse-harbor.jpg";
const OUT = ROOT + "/public/images/harbor";
const LIB = ROOT + "/app/(authenticated)/(active)/attendance/_lib/harborMap.ts";
const DEBUG = process.argv[2]; // optional path for a mask preview PNG

const HORIZON = 919;
const EXTEND = 900; // rows of extra sea drawn below the picture
const CUT_TOP = 760; // nothing above this can ever overlap a boat

(async () => {
  const { data, info } = await sharp(SRC)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width,
    H = info.height;
  const rgb = (x, y) => {
    const i = (y * W + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const isSky = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return y < HORIZON && b >= r + 8 && b >= g - 4;
  };
  const isLand = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return y < HORIZON ? !isSky(x, y) : r >= b - 6;
  };

  // The island: land connected to a point on its rock face
  const island = new Uint8Array(W * H);
  const stack = [[1242, 969]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < CUT_TOP - 40 || x >= W || y >= H) continue;
    const p = y * W + x;
    if (island[p] || !isLand(x, y)) continue;
    island[p] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // Close pinholes inside the island (windows of glass, specks) column by column between its top and waterline
  for (let x = 0; x < W; x++) {
    let top = -1,
      bottom = -1;
    for (let y = CUT_TOP; y < H; y++)
      if (island[y * W + x]) {
        if (top < 0) top = y;
        bottom = y;
      }
    if (top >= 0) for (let y = top; y <= bottom; y++) island[y * W + x] = 1;
  }

  const water = (x, y) => y >= HORIZON && !island[y * W + x];

  // Depth of each island pixel: the waterline below it
  const depth = new Int16Array(W * H).fill(-1);
  let zMin = H,
    zMax = 0;
  for (let x = 0; x < W; x++) {
    let z = -1;
    for (let y = H - 1; y >= CUT_TOP; y--) {
      const p = y * W + x;
      if (!island[p]) {
        z = y;
        continue;
      }
      if (z > 0) {
        depth[p] = z;
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
      }
    }
  }

  // Island cut-outs, one per depth band
  const BAND = 10;
  const layers = [];
  for (let lo = zMin; lo <= zMax; lo += BAND) {
    const hi = lo + BAND;
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = CUT_TOP; y < H; y++)
      for (let x = 0; x < W; x++) {
        const z = depth[y * W + x];
        if (z >= lo && z < hi) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    if (x1 < 0) continue;
    const w = x1 - x0 + 1,
      h = y1 - y0 + 1;
    const buf = Buffer.alloc(w * h * 4);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const z = depth[y * W + x];
        if (z >= lo && z < hi) {
          const [r, g, b] = rgb(x, y),
            o = ((y - y0) * w + (x - x0)) * 4;
          buf[o] = r;
          buf[o + 1] = g;
          buf[o + 2] = b;
          buf[o + 3] = 255;
        }
      }
    const name = `island-${hi}.webp`;
    await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(`${OUT}/${name}`);
    layers.push({ src: `/images/harbor/${name}`, x: x0, y: y0, w, h, z: hi });
  }

  // Water mask: white where the animated water may draw, and open sea all the way down the extension below
  {
    const TH = H + EXTEND;
    const buf = Buffer.alloc(W * TH * 4);
    for (let y = 0; y < TH; y++)
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        buf[o] = buf[o + 1] = buf[o + 2] = 255;
        buf[o + 3] = y >= H || water(x, y) ? 255 : 0;
      }
    await sharp(buf, { raw: { width: W, height: TH, channels: 4 } })
      .blur(1.5)
      .png()
      .toFile(`${OUT}/water-mask.png`);
  }

  await sharp(SRC).webp({ quality: 90 }).toFile(`${OUT}/scene.webp`);
  // More sea below the picture: plain open water in the colour of the picture's own bottom edge (taken from the clear
  // water at either side, so the island's reflection isn't smeared downward), deepening toward the viewer. Its top
  // edge fades in over the picture's last rows, so the island's reflection fades out with distance and there is no
  // seam where the two meet. The animated swell, glints and whitecaps give it its detail.
  {
    const FADE = 120;
    const edge = await sharp(SRC)
      .extract({ left: 0, top: H - 6, width: W, height: 6 })
      .removeAlpha()
      .raw()
      .toBuffer();
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let row = 0; row < 6; row++)
      for (const x of [...Array(260).keys()].flatMap((i) => [
        i + 20,
        W - 20 - i,
      ])) {
        const o = (row * W + x) * 3;
        r += edge[o];
        g += edge[o + 1];
        b += edge[o + 2];
        n++;
      }
    const top = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
    const sea = `<svg width="${W}" height="${EXTEND}"><defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${top}"/><stop offset="0.35" stop-color="#0a7fc4"/><stop offset="1" stop-color="#04408c"/>
      </linearGradient>
      <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${FADE / EXTEND}" stop-color="#fff" stop-opacity="1"/>
      </linearGradient>
      <mask id="m"><rect width="${W}" height="${EXTEND}" fill="url(#f)"/></mask></defs>
      <rect width="${W}" height="${EXTEND}" fill="url(#g)" mask="url(#m)"/></svg>`;
    await sharp(Buffer.from(sea))
      .webp({ quality: 90 })
      .toFile(`${OUT}/sea-extension.webp`);
  }

  // Coarse water grid, run-length encoded per row (alternating land/water counts of CELL-wide cells)
  const CELL = 8;
  const rows = [];
  for (let y = HORIZON; y < H; y += CELL) {
    let s = "";
    for (let x = 0; x < W; x += CELL) {
      let all = 1;
      for (let dy = 0; dy < CELL && y + dy < H; dy++)
        for (let dx = 0; dx < CELL; dx++) if (!water(x + dx, y + dy)) all = 0;
      s += all ? "1" : "0";
    }
    const out = [];
    let cur = "0",
      n = 0;
    for (const c of s) {
      if (c === cur) n++;
      else {
        out.push(n);
        cur = c;
        n = 1;
      }
    }
    out.push(n);
    rows.push(out.join("."));
  }

  // Where the island meets the water, left to right
  const shore = [];
  for (let x = 0; x < W; x += 8)
    for (let y = HORIZON; y < H - 1; y++) {
      if (island[y * W + x] && !island[(y + 1) * W + x]) {
        shore.push([x, y + 1]);
        break;
      }
    }

  if (DEBUG) {
    const dbg = Buffer.from(data);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (island[p] && y >= CUT_TOP) {
          dbg[p * 3] = 255;
          dbg[p * 3 + 1] = 0;
          dbg[p * 3 + 2] = 255;
        } else if (water(x, y)) {
          dbg[p * 3 + 1] = 255;
        }
      }
    await sharp(dbg, { raw: { width: W, height: H, channels: 3 } })
      .extract({ left: 0, top: 700, width: W, height: 580 })
      .resize(1600)
      .png()
      .toFile(DEBUG);
  }

  fs.writeFileSync(
    LIB,
    `// Generated by scripts/build-harbor-assets.mjs from public/images/lighthouse-harbor.jpg. Do not edit by hand.
// Everything is in the illustration's own pixels: ${W} x ${H}.

export const SCENE_W = ${W}
export const SCENE_H = ${H}
/** Extra sea drawn below the picture, in the same units */
export const EXTEND_H = ${EXTEND}
export const HORIZON_Y = ${HORIZON}

/** Water grid: one run-length row per ${CELL} units of y from the horizon down, alternating land/water counts of ${CELL}-unit cells */
export const WATER_CELL = ${CELL}
export const WATER_ROWS = ${JSON.stringify(rows)}

/** The island cut into depth bands; each band sits in front of any boat further back than its z */
export const ISLAND_LAYERS = ${JSON.stringify(layers)}

/** Where the island meets the water, as SVG polyline points */
export const SHORE = ${JSON.stringify(shore.map(([x, y]) => `${x},${y}`).join(" "))}
`,
  );
  console.log({
    W,
    H,
    zMin,
    zMax,
    layers: layers.length,
    shore: shore.length,
    rows: rows.length,
  });
})();
