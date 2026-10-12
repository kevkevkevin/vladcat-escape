// Preserve the reference/generated originals; optimize copies for the website.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const directory = 'public/mewventure';
await fs.mkdir(directory, { recursive: true });
const [hero, cat, owner] = process.argv.slice(2);
for (const [input, name] of [[hero, 'eira-pur-pur'], [cat, 'pur-pur'], [owner, 'eira']]) {
  if (input) await fs.copyFile(input, `${directory}/${name}.png`);
  await sharp(`${directory}/${name}.png`).resize({ width: name === 'pur-pur' ? 640 : 800, withoutEnlargement: true }).webp({ quality: 92 }).toFile(`${directory}/${name}.webp`);
}
await sharp(`${directory}/pur-pur.png`).resize(128, 128, { fit: 'contain' }).webp({ quality: 92 }).toFile(`${directory}/pur-pur-icon.webp`);
await sharp(`${directory}/pur-pur.png`).resize(64, 64, { fit: 'contain' }).png().toFile(`${directory}/pur-pur-icon.png`);
await sharp(`${directory}/pur-pur.png`).resize(180, 180, { fit: 'contain' }).png().toFile(`${directory}/apple-icon.png`);
console.log('Mewventure character artwork and icons saved with alpha preserved.');
