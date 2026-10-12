import fs from 'node:fs/promises';
import sharp from 'sharp';

const original = 'public/mewventure/challenge-banner.png';
if (process.argv[2]) await fs.copyFile(process.argv[2],original);
await sharp(original).resize({width:800,withoutEnlargement:true}).webp({quality:92}).toFile('public/mewventure/challenge-banner.webp');
console.log('Mewventure challenge banner optimized without cropping.');
