// Pack generated artwork into the existing engine atlas coordinates.
// Tile IDs, animation timing, origins and collision polygons stay unchanged.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const art = 'public/mewventure', images = 'public/game/images';
await fs.mkdir(art, { recursive: true });
const [spritesInput, caveInput, detailsInput, stoneInput] = process.argv.slice(2);
if (spritesInput) await fs.copyFile(spritesInput, `${art}/pur-pur-generated-sprites.png`);
if (caveInput) await fs.copyFile(caveInput, `${art}/cozy-cave-generated.png`);
if (detailsInput) await fs.copyFile(detailsInput, `${art}/cozy-cave-details.png`);
if (stoneInput) await fs.copyFile(stoneInput, `${art}/cozy-cave-solid.png`);
function bounds(data, width, height, threshold = 96) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > threshold) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  assert.ok(right >= left && bottom >= top, 'Empty generated component');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
const transparent = (width, height) => sharp({ create: { width, height, channels: 4, background: '#00000000' } });
const spriteSheet = `${art}/pur-pur-generated-sprites.png`;
const size = await sharp(spriteSheet).metadata();
const poses = [];
for (let index = 0; index < 16; index++) {
  const left = Math.round(index % 4 * size.width / 4), top = Math.round(Math.floor(index / 4) * size.height / 4);
  const width = Math.round((index % 4 + 1) * size.width / 4) - left;
  const height = Math.round((Math.floor(index / 4) + 1) * size.height / 4) - top;
  const { data, info } = await sharp(spriteSheet).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  poses.push({ data, info, crop: bounds(data, width, height) });
}
// One scale for every pose avoids a changing character size while animating.
const scale = Math.min(28 / Math.max(...poses.map(p => p.crop.width)), 24 / Math.max(...poses.map(p => p.crop.height)));
const frames = [];
for (const pose of poses) {
  const width = Math.round(pose.crop.width * scale), height = Math.round(pose.crop.height * scale);
  const input = await sharp(pose.data, { raw: pose.info }).extract(pose.crop).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
  frames.push(await transparent(32, 32).composite([{ input, left: Math.floor((32 - width) / 2), top: 24 - height }]).png().toBuffer());
}
await transparent(128, 128).composite(frames.map((input, index) => ({ input, left: index % 4 * 32, top: Math.floor(index / 4) * 32 }))).png().toFile(`${images}/mewventure-sprites.png`);
await fs.writeFile(`${art}/pur-pur-idle.png`, frames[0]);

// Generated objects need explicit repacking: a full-image resize would move
// decorative props into different tile IDs and break the authored maps.
const components = [
  [[60,60,268,266],[16,16,48,48]], [[363,60,196,258],[80,16,32,48]],
  [[60,366,268,258],[16,80,48,48]], [[365,366,194,100],[80,80,32,16]],
  [[603,64,482,390],[128,16,96,80]], [[454,450,554,174],[96,96,112,32]],
  [[1024,88,50,36],[80,128,16,16]],
  [[60,674,256,63],[16,144,48,16]], [[60,752,256,62],[16,160,48,16]],
  [[60,836,207,61],[16,176,32,16]], [[374,676,92,246],[80,144,16,48]],
  [[528,674,130,63],[112,144,48,16]], [[530,754,165,100],[112,160,32,16]],
  [[748,676,107,96],[160,144,16,16]], [[748,770,107,88],[160,160,16,16]],
  [[851,716,70,50],[176,144,16,16]], [[917,693,79,78],[192,144,16,16]],
  [[997,677,88,96],[208,144,16,16]], [[917,769,79,156],[192,160,16,32]],
  [[997,770,88,154],[208,160,16,32]], [[528,854,328,72],[112,176,64,16]],
  [[88,915,38,84],[16,192,16,16]], [[174,912,43,120],[32,192,16,32]],
  [[243,914,50,78],[48,192,16,16]], [[322,917,200,98],[64,192,48,16]],
  [[592,923,120,169],[112,192,48,32]], [[326,1039,184,58],[64,208,48,16]],
  [[762,924,89,86],[160,192,16,16]], [[852,924,66,86],[176,192,16,16]],
  [[918,923,89,87],[192,192,16,16]], [[60,1090,500,84],[16,224,96,16]],
  [[756,1064,326,93],[160,224,64,16]], [[546,1148,215,104],[112,240,48,16]],
  [[767,1153,242,92],[160,240,48,16]],
];
const originals = await sharp(`${images}/shared-0-sheet3.webp`).extract({ left: 1, top: 1, width: 240, height: 288 }).ensureAlpha().raw().toBuffer();
const composites = [];
for (const [source, destination] of components) {
  const [left, top, width, height] = source;
  const [x, y, w, h] = destination;
  const { data, info } = await sharp(`${art}/cozy-cave-generated.png`).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const crop = bounds(data, width, height);
  const input = await sharp(data, { raw: info }).extract(crop).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  composites.push({ input, left: x, top: y });
}
const pixels = await transparent(240, 288).composite(composites).raw().toBuffer();

// Each decoration is now an isolated complete sprite. Cutting one large
// mushroom group into cells sliced stems and picked up nearby crystal art.
const detailSheet = `${art}/cozy-cave-details.png`;
const detailSize = await sharp(detailSheet).metadata();
const details = [];
for (let i = 0; i < 9; i++) {
  const left = Math.round(i % 3 * detailSize.width / 3), top = Math.round(Math.floor(i / 3) * detailSize.height / 3);
  const width = Math.round((i % 3 + 1) * detailSize.width / 3) - left;
  const height = Math.round((Math.floor(i / 3) + 1) * detailSize.height / 3) - top;
  const { data, info } = await sharp(detailSheet).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  details.push({ data, info, crop: bounds(data, width, height) });
}
async function detailFrame(index, width, height, maxWidth, maxHeight, baseline = height) {
  const pose = details[index];
  const scale = Math.min(maxWidth / pose.crop.width, maxHeight / pose.crop.height);
  const w = Math.round(pose.crop.width * scale), h = Math.round(pose.crop.height * scale);
  const input = await sharp(pose.data, { raw: pose.info }).extract(pose.crop).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  return transparent(width, height).composite([{ input, left: Math.floor((width - w) / 2), top: baseline - h }]).raw().toBuffer();
}
function replaceRegion(data, x, y, width, height) {
  // Copy RGBA rather than overlaying it: clear the old image underneath too.
  for (let row = 0; row < height; row++) data.copy(pixels, ((y + row) * 240 + x) * 4, row * width * 4, (row + 1) * width * 4);
}
// The former 3×3 image was a hollow wall frame. Its top row also serves as
// one-tile-high platforms, exposing empty-looking backing beneath the stones.
// A dense stone face fills every solid cell, including the hazard mounting edge.
const stone = await sharp(`${art}/cozy-cave-solid.png`).resize(48,48,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
for (const ids of [[16,17,18,31,32,33,46,47,48], [76,77,78,91,92,93,106,107,108]]) {
  for (let i = 0; i < ids.length; i++) {
    const tile = ids[i];
    const data = await sharp(stone,{raw:{width:48,height:48,channels:4}}).extract({left:i%3*16,top:Math.floor(i/3)*16,width:16,height:16}).raw().toBuffer();
    replaceRegion(data,tile%15*16,Math.floor(tile/15)*16,16,16);
  }
}
for (let i = 0; i < 3; i++) replaceRegion(await detailFrame(i,16,16,14,12), 64 + i * 16, 208, 16,16);
// The four lantern tile IDs are always placed together as a 2×2 decoration.
replaceRegion(await detailFrame(3,32,32,24,30), 160,16,32,32);
replaceRegion(await detailFrame(3,48,32,20,30), 112,192,48,32);
// Separate stones replace the incorrectly sliced wall backing. These are
// non-solid decorative tile IDs; transparent surrounds remove dark boxes.
const rockTiles = [23,24,27,28,38,39,42,43,53,54,57,58,68,69,72,83,84,85,86,87,96,97,98,99,100,101,102,111,112,113,114,115,116,117,125];
for (const tile of rockTiles) replaceRegion(await detailFrame(4 + tile % 2,16,16,10 + tile % 3,7,11), tile % 15 * 16,Math.floor(tile / 15) * 16,16,16);
// The base reaches the final pixel row, so flipped hazards touch ceilings.
for (let i = 0; i < 6; i++) replaceRegion(await detailFrame(6 + i % 3,16,16,16,16), 16 + i * 16,224,16,16);
// Use the editable standalone pixel key. The former atlas crop picked up
// neighboring crate pixels and cut the key's bow and teeth.
const key = await sharp(`${art}/game-key.svg`).ensureAlpha().raw().toBuffer();
replaceRegion(key,176,144,16,16);
for (let tile = 0; tile < 270; tile++) {
  const x = tile % 15 * 16, y = Math.floor(tile / 15) * 16;
  let originalVisible = false, replacementVisible = false;
  for (let py = y; py < y + 16; py++) for (let px = x; px < x + 16; px++) {
    const offset = (py * 240 + px) * 4;
    originalVisible ||= originals[offset + 3] > 0;
    replacementVisible ||= pixels[offset + 3] > 0;
  }
  if (!originalVisible) {
    for (let py = y; py < y + 16; py++) for (let px = x; px < x + 16; px++) pixels.fill(0, (py * 240 + px) * 4, (py * 240 + px + 1) * 4);
  } else assert.ok(replacementVisible, `Original occupied tile ${tile} lost its artwork`);
}
await sharp(pixels, { raw: { width: 240, height: 288, channels: 4 } }).png().toFile(`${images}/mewventure-cave-tiles.png`);

// Reuse generated crystals for the separately animated hazard sprites too.
await sharp(`${images}/mewventure-cave-tiles.png`).extract({ left: 16, top: 224, width: 96, height: 16 }).png().toFile(`${images}/mewventure-crystals.png`);
await sharp(key,{raw:{width:16,height:16,channels:4}}).png().toFile(`${images}/mewventure-key.png`);

// These existing UI assets are code-native pixel lettering and a nine-patch.
const glyphs = {
  I:['11111','00100','00100','00100','00100','00100','11111'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10001','10001','10001','10001'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  W:['10001','10001','10001','10001','10101','11011','10001'],
  V:['10001','10001','10001','10001','10001','01010','00100'],
  N:['10001','11001','11001','10101','10011','10011','10001'],
  T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  C:['01111','10000','10000','10000','10000','10000','01111'],
  A:['01110','10001','10001','11111','10001','10001','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};
const lettering = (text, y, color) => [...text].map((letter, i) => glyphs[letter].map((row, py) => [...row].map((bit, px) => bit === '1' ? `<rect x="${(142 - (text.length * 6 - 1) * 2) / 2 + i * 12 + px * 2}" y="${y + py * 2}" width="2" height="2" fill="${color}"/>` : '').join('')).join('')).join('');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="142" height="58">${lettering('PURRVIVAL', 8, '#e2ddff')}${lettering('CAVE ESCAPE', 34, '#f5d7aa')}</svg>`)).png().toFile(`${images}/mewventure-title.png`);
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="1" y="1" width="30" height="30" rx="3" fill="#29233c" stroke="#b9b1e2" stroke-width="2"/><rect x="4" y="4" width="24" height="24" fill="none" stroke="#665c85"/></svg>')).png().toFile(`${images}/mewventure-panel.png`);

const objects = JSON.parse(await fs.readFile('src/game/objects.json', 'utf8'));
for (const name of ['spr_player_graphic', 'Player_Clone']) {
  for (const animation of objects.find(o => o.name === name).animations) {
    for (const frame of animation.frames) frame.asset = 'images/mewventure-sprites.png';
  }
}
Object.assign(objects.find(o => o.name === 'Tilemap').texture, { asset: 'images/mewventure-cave-tiles.png', x: 0, y: 0 });
objects.find(o => o.name === 'spr_spike').animations[0].frames.forEach((frame, i) => Object.assign(frame, { asset: 'images/mewventure-crystals.png', x: i * 16, y: 0 }));
for (const name of ['spr_key', 'spr_player_key']) Object.assign(objects.find(o => o.name === name).animations[0].frames[0], { asset: 'images/mewventure-key.png', x: 0, y: 0 });
Object.assign(objects.find(o => o.name === 'Sprite').animations[0].frames[0], { asset: 'images/mewventure-title.png', x: 0, y: 0 });
Object.assign(objects.find(o => o.name === '9patch').texture, { asset: 'images/mewventure-panel.png', x: 0, y: 0 });
await fs.writeFile('src/game/objects.json', JSON.stringify(objects, null, 2) + '\n');
const settings = JSON.parse(await fs.readFile('src/game/settings.json', 'utf8'));
settings[0] = 'Purrvival';
// Letterbox scale fills the available viewport. Integer-only scaling left
// a large black border when the next whole multiple could not fit.
settings[12] = 4;
await fs.writeFile('src/game/settings.json', JSON.stringify(settings, null, 2) + '\n');
const html = await fs.readFile('public/game/index.html', 'utf8');
await fs.writeFile('public/game/index.html', html.replace(/<title>[^<]*<\/title>/,'<title>Purrvival</title>').replace('href="/vladcat/mark.svg" type="image/svg+xml"', 'href="images/mewventure-sprites.png" type="image/png"'));
const stage5File = 'src/game/layouts/level-05.json';
const stage5 = JSON.parse(await fs.readFile(stage5File, 'utf8'));
for (const instance of stage5.layers.flatMap(layer => layer.instances)) {
  if (instance.type === 'UITip') instance.properties[0] = instance.properties[0].replace('Drag him', 'Drag her');
}
await fs.writeFile(stage5File, JSON.stringify(stage5, null, 2) + '\n');
console.log('PUR PUR: 128×128 (16 frames of 32×32); cozy cave: 240×288 (16×16 tiles). Gameplay metadata preserved.');
