// Packaging generated art into the engine's existing 32px animation frames.
// No gameplay geometry or collision metadata is changed.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const art = 'public/vladcat';
const images = 'public/game/images';
await fs.mkdir(art, { recursive: true });
// Optional new generated inputs; without arguments, use the editable artwork
// committed in the project, independently of the generation cache.
const [heroInput, spritesInput] = process.argv.slice(2);
if (heroInput) await fs.copyFile(heroInput, `${art}/vladcat-hero.png`);
if (spritesInput) await fs.copyFile(spritesInput, `${art}/vladcat-generated-sprites.png`);
await sharp(`${art}/vladcat-hero.png`).resize({ width: 800 }).webp({ quality: 92 }).toFile(`${art}/vladcat-hero.webp`);
const sheet = `${art}/vladcat-generated-sprites.png`;
const { width, height } = await sharp(sheet).metadata();
const poses = [];
for (let index = 0; index < 16; index++) {
  const x = index % 4, y = Math.floor(index / 4);
  const left = Math.round(x * width / 4), top = Math.round(y * height / 4);
  const w = Math.round((x + 1) * width / 4) - left, h = Math.round((y + 1) * height / 4) - top;
  const { data, info } = await sharp(sheet).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (data[(py * w + px) * 4 + 3] > 96) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); }
  }
  poses.push({ data, info, crop: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 } });
}
const scale = Math.min(24 / Math.max(...poses.map(p => p.crop.height)), 28 / Math.max(...poses.map(p => p.crop.width)));
const frames = [];
for (const pose of poses) {
  const w = Math.max(1, Math.round(pose.crop.width * scale)), h = Math.max(1, Math.round(pose.crop.height * scale));
  const pixels = await sharp(pose.data, { raw: pose.info }).extract(pose.crop).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  frames.push(await sharp({ create: { width: 32, height: 32, channels: 4, background: '#00000000' } }).composite([{ input: pixels, left: Math.floor((32 - w) / 2), top: 24 - h }]).png().toBuffer());
}
await sharp({ create: { width: 128, height: 128, channels: 4, background: '#00000000' } }).composite(frames.map((input, i) => ({ input, left: i % 4 * 32, top: Math.floor(i / 4) * 32 }))).png().toFile(`${images}/vladcat-sprites.png`);
await fs.writeFile(`${art}/vladcat-idle.png`, frames[0]);
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#c7fa52"/><path d="M12 13L26 22L38 22L52 13L49 40L40 51L24 51L15 40Z" fill="#131512"/><path d="M22 32L29 35L21 37ZM42 32L35 35L43 37Z" fill="#c7fa52"/><path d="M28 42L32 46L36 42" fill="none" stroke="#c7fa52" stroke-width="3"/></svg>`;
await fs.writeFile(`${art}/mark.svg`, mark);
await sharp(Buffer.from(mark)).resize(180, 180).png().toFile(`${art}/apple-icon.png`);
const key = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M2 3h6v6H2zM8 5h6v3h-2v3h-2V8H8z" fill="#151910" stroke="#151910" stroke-width="2"/><path d="M3 4h4v4H3zM7 5h7v2h-2v3h-2V7H7z" fill="#c7fa52"/><rect x="4" y="5" width="2" height="2" fill="#151910"/></svg>`;
await sharp(Buffer.from(key)).png().toFile(`${images}/vladcat-key.png`);
const panel = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="1" y="1" width="30" height="30" rx="3" fill="#161c13" stroke="#c7fa52" stroke-width="2"/><rect x="4" y="4" width="24" height="24" fill="none" stroke="#394a28"/></svg>`;
await sharp(Buffer.from(panel)).png().toFile(`${images}/vladcat-panel.png`);

const glyphs = {
  V:['10001','10001','10001','10001','10001','01010','00100'], L:['10000','10000','10000','10000','10000','10000','11111'],
  A:['01110','10001','10001','11111','10001','10001','10001'], D:['11110','10001','10001','10001','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'], T:['11111','00100','00100','00100','00100','00100','00100'],
  E:['11111','10000','10000','11110','10000','10000','11111'], S:['01111','10000','10000','01110','00001','00001','11110'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
};
const pixelsFor = (text, y, color) => [...text].map((letter, i) => glyphs[letter].map((row, py) => [...row].map((bit, px) => bit === '1' ? `<rect x="${(142 - (text.length * 6 - 1) * 3) / 2 + i * 18 + px * 3}" y="${y + py * 3}" width="3" height="3" fill="${color}"/>` : '').join('')).join('')).join('');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="142" height="58">${pixelsFor('VLADCAT', 4, '#f5f4e8')}${pixelsFor('ESCAPE', 32, '#c7fa52')}</svg>`)).png().toFile(`${images}/vladcat-title.png`);
const hero = (await fs.readFile(`${art}/vladcat-hero.png`)).toString('base64');
const stories = [
  ['MEET VLADCAT.', 'Trapped in a room that keeps changing.', 'A catguy with sharp instincts.', 'An escape with fifty twists.'],
  ['GET THE KEY.', 'Dodge the traps. Find the way out.', 'Every stage changes the rules.', 'Stay curious. Keep moving.'],
  ['BEAT THE CLOCK.', 'Your escape. Your time. Your place.', 'Finish the challenge to get ranked.', 'Click to begin VLADCAT ESCAPE.'],
];
for (const [i, [title, ...lines]] of stories.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="1536" height="1024" fill="#141713"/><rect x="34" y="34" width="1468" height="956" rx="28" fill="none" stroke="#495336" stroke-width="4"/><circle cx="1190" cy="475" r="305" fill="#26311b"/><image href="data:image/png;base64,${hero}" x="850" y="80" width="650" height="975"/><text x="100" y="185" font-family="monospace" font-size="28" fill="#c7fa52">VLADCAT ESCAPE / 0${i + 1}</text><text x="100" y="370" font-family="sans-serif" font-weight="bold" font-size="66" fill="#f4f5e9">${title}</text>${lines.map((line, n) => `<text x="100" y="${480 + n * 62}" font-family="sans-serif" font-size="31" fill="#b9c0af">${line}</text>`).join('')}<text x="100" y="870" font-family="monospace" font-size="26" fill="#c7fa52">CLICK TO CONTINUE →</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${images}/vladcat-story-${i + 1}.png`);
}
const objects = JSON.parse(await fs.readFile('src/game/objects.json', 'utf8'));
for (const name of ['spr_player_graphic', 'Player_Clone']) {
  const animations = objects.find(o => o.name === name).animations;
  for (const animation of animations) {
    const indices = { Idle: [0, 1, 2, 3, 2, 1, 0], Run: [4, 5, 6, 7, 8, 9, 10], Jump: [12, 13, 14], Fall: [15] }[animation.name];
    animation.frames.forEach((frame, i) => { frame.asset = 'images/vladcat-sprites.png'; frame.x = indices[i] % 4 * 32; frame.y = Math.floor(indices[i] / 4) * 32; });
  }
}
const title = objects.find(o => o.name === 'Sprite').animations[0].frames[0];
Object.assign(title, { asset: 'images/vladcat-title.png', x: 0, y: 0 });
// The old title was stored rotated in a packed atlas. The new standalone
// title texture is upright, so clear its packed-texture rotation flag.
title.engine[6] = false;
for (const name of ['spr_key', 'spr_player_key']) Object.assign(objects.find(o => o.name === name).animations[0].frames[0], { asset: 'images/vladcat-key.png', x: 0, y: 0 });
Object.assign(objects.find(o => o.name === '9patch').texture, { asset: 'images/vladcat-panel.png', x: 0, y: 0 });
objects.find(o => o.name === 'Scene').animations[0].frames.forEach((frame, i) => Object.assign(frame, { asset: `images/vladcat-story-${i + 1}.png`, x: 0, y: 0 }));
await fs.writeFile('src/game/objects.json', JSON.stringify(objects, null, 2) + '\n');
const settings = JSON.parse(await fs.readFile('src/game/settings.json', 'utf8'));
settings[0] = 'VLADCAT ESCAPE';
await fs.writeFile('src/game/settings.json', JSON.stringify(settings, null, 2) + '\n');
for (const file of (await fs.readdir('src/game/layouts')).filter(f => /^level-\d+\.json$/.test(f))) {
  const location = `src/game/layouts/${file}`, layout = JSON.parse(await fs.readFile(location, 'utf8'));
  let changed = false;
  for (const instance of layout.layers.flatMap(l => l.instances)) if (instance.type === 'UITip') {
    const previous = instance.properties[0];
    instance.properties[0] = previous.replace(/Electronic Waste/gi, 'key').replace(/e-waste/gi, 'key').replace(/robot/gi, 'VLADCAT');
    if (file === 'level-50.json') instance.properties[0] = 'VLADCAT ESCAPED! Thanks for playing :)';
    changed ||= previous !== instance.properties[0];
  }
  if (changed) await fs.writeFile(location, JSON.stringify(layout, null, 2) + '\n');
}
// Preserve the latest comic/ending packaging when rebuilding character art.
await fs.access(`${art}/vladcat-comic-01.png`).then(() => import('./prepare-vladcat-story.mjs'), () => {});
console.log('VLADCAT hero, 16-frame atlas, title and cat mark are ready.');
