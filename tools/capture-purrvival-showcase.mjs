// Render the actual local game, without accounts or database writes.
import fs from 'node:fs/promises';
import { loadSource } from './game-source.mjs';
import { createEngine, closeServerBrowser } from '../src/game/authority/browser.mjs';

let engine;
try {
  engine = await createEngine(await loadSource(),{stage:1,name:'',stageMs:0,splits:[]});
  await engine.pause(false);
  await new Promise(resolve=>setTimeout(resolve,350));
  await engine.pause(true);
  await fs.mkdir('public/showcase',{recursive:true});
  await fs.writeFile('public/showcase/purrvival-gameplay.jpg',Buffer.from(await engine.frame(),'base64'));
  console.log('Captured current Purrvival stage 1: 768 × 432, actual game artwork.');
} finally { if(engine) await engine.close(); await closeServerBrowser(); }
