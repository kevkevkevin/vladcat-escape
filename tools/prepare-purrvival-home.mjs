import fs from 'node:fs/promises';
import sharp from 'sharp';

const directory = 'public/purrvival';
await fs.mkdir(directory,{recursive:true});
const [hero,rewards] = process.argv.slice(2);
for (const [input,name,width] of [[hero,'hero-banner',1920],[rewards,'rewards-banner',1200]]) {
  if (input) await fs.copyFile(input,`${directory}/${name}.png`);
  await sharp(`${directory}/${name}.png`).resize({width,withoutEnlargement:true}).webp({quality:92}).toFile(`${directory}/${name}.webp`);
}
// On phones show the complete characters on the right half of the panorama;
// the real headline and buttons sit above the picture instead of covering it.
const size = await sharp(`${directory}/hero-banner.png`).metadata();
await sharp(`${directory}/hero-banner.png`).extract({left:Math.floor(size.width*.35),top:0,width:size.width-Math.floor(size.width*.35),height:size.height}).resize({width:900,withoutEnlargement:true}).webp({quality:92}).toFile(`${directory}/hero-mobile.webp`);
console.log('Purrvival hero, mobile character composition and reward artwork prepared.');
