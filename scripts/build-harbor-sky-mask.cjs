// Builds public/images/harbor/sky-mask.png from public/images/lighthouse-harbor.jpg (read only): white everywhere the
// storm sky may draw (sky, and sea down to just past the horizon), clear over the island, house and lighthouse, so
// the storm never paints over land. Covers the picture's top 1000 rows, matching the storm sky canvas (SKY_H).
// Run from the repo root after changing the picture:
//   node scripts/build-harbor-sky-mask.cjs [preview.png]
const sharp = require("sharp");
const ROOT = process.cwd();
const SRC = ROOT + "/public/images/lighthouse-harbor.jpg";
const OUT = ROOT + "/public/images/harbor/sky-mask.png";
const PREVIEW = process.argv[2];

const HORIZON = 919;
const SKY_H = 1000;

(async () => {
  const { data, info } = await sharp(SRC)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const rgb = (x, y) => {
    const i = (y * W + x) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // the same tests the main build uses: sky is blue-dominant above the horizon, land is anything else
  const isSky = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return y < HORIZON && b >= r + 8 && b >= g - 4;
  };
  // the illustration's own clouds: bright and white to lilac (the lighthouse's cream is warmer, red above blue)
  const isCloud = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return y < HORIZON && r > 196 && g > 196 && b > 205 && b >= r - 2;
  };
  const isLand = (x, y) => {
    const [r, g, b] = rgb(x, y);
    return y < HORIZON ? !isSky(x, y) && !isCloud(x, y) : r >= b - 6;
  };

  // Where the island meets the water: its left and right ends set a fence, so the fill can climb the rock, house and
  // tower but never wander off into the illustration's own white clouds
  let x0 = W;
  let x1 = 0;
  for (let x = 0; x < W; x++)
    if (isLand(x, HORIZON + 4) && !isSky(x, HORIZON - 4)) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }

  const land = new Uint8Array(W * SKY_H);
  const stack = [[1242, 969 < SKY_H ? 969 : SKY_H - 1]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < x0 - 4 || x > x1 + 4 || y < 0 || y >= SKY_H) continue;
    const p = y * W + x;
    if (land[p] || !isLand(x, y)) continue;
    land[p] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // close pinholes (windows, specks): the island is solid from its top down to the horizon in every column it reaches
  for (let x = 0; x < W; x++) {
    let top = -1;
    for (let y = 0; y < HORIZON; y++)
      if (land[y * W + x]) {
        top = y;
        break;
      }
    if (top >= 0) for (let y = top; y < HORIZON; y++) land[y * W + x] = 1;
  }

  const buf = Buffer.alloc(W * SKY_H * 4);
  for (let y = 0; y < SKY_H; y++)
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      buf[o] = buf[o + 1] = buf[o + 2] = 255;
      buf[o + 3] = land[y * W + x] ? 0 : 255;
    }
  const img = sharp(buf, {
    raw: { width: W, height: SKY_H, channels: 4 },
  }).blur(1.2);
  await img.clone().png().toFile(OUT);
  console.log(`sky-mask.png ${W}x${SKY_H}, island x ${x0}-${x1}`);

  if (PREVIEW) {
    // the picture with the masked-out land tinted red, to check the cut
    const over = Buffer.alloc(W * SKY_H * 4);
    for (let i = 0; i < W * SKY_H; i++) {
      over[i * 4] = 255;
      over[i * 4 + 3] = land[i] ? 140 : 0;
    }
    const top = await sharp(SRC)
      .extract({ left: 0, top: 0, width: W, height: SKY_H })
      .toBuffer();
    // sharp resizes before it composites, so composite first and shrink the result
    const full = await sharp(top)
      .composite([
        { input: over, raw: { width: W, height: SKY_H, channels: 4 } },
      ])
      .png()
      .toBuffer();
    await sharp(full).resize(1600).toFile(PREVIEW);
  }
})();
