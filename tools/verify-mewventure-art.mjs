// Isolated engine QA only: no account, network API or database writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { loadSource } from './game-source.mjs';
import { decodeObjects } from '../src/game/codec.mjs';
import { createEngine, closeServerBrowser } from '../src/game/authority/browser.mjs';

const source = await loadSource();
const objects = JSON.parse(await fs.readFile('src/game/objects.json', 'utf8'));
const original = JSON.parse(await fs.readFile('legacy-export/data.json', 'utf8'));
const legacyObjects = decodeObjects(original.project[3], source.references);
const cave = objects.find(o => o.name === 'Tilemap');
assert.deepEqual(cave.engine, legacyObjects.find(o => o.name === 'Tilemap').engine, 'Tile collision polygons and brush metadata changed');
assert.deepEqual(objects.find(o => o.name === 'spr_player_base'), legacyObjects.find(o => o.name === 'spr_player_base'), 'Physical player object changed');
for (const [asset, width, height] of [['mewventure-sprites.png',128,128], ['mewventure-cave-tiles.png',240,288]]) {
  const meta = await sharp(`public/game/images/${asset}`).metadata();
  assert.equal(meta.width, width); assert.equal(meta.height, height); assert.equal(meta.hasAlpha, true);
}
assert.equal(source.settings[12], 4, 'Integer scaling would shrink the game inside its viewport');
const tiles = await sharp('public/game/images/mewventure-cave-tiles.png').ensureAlpha().raw().toBuffer();
const key = await sharp('public/game/images/mewventure-key.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(key.info.width,16); assert.equal(key.info.height,16);
for (let pixel=0;pixel<16;pixel++) {
  for (const [x,y] of [[pixel,0],[pixel,15],[0,pixel],[15,pixel]]) assert.equal(key.data[(y*16+x)*4+3],0,'Key artwork touches a frame edge and may be cut');
}
for (let row=0;row<16;row++) {
  assert.deepEqual(tiles.subarray(((144+row)*240+176)*4,((144+row)*240+192)*4),key.data.subarray(row*16*4,(row+1)*16*4),'Tilemap and collectible key artwork differ');
}
for (const tile of [16,17,18,31,32,33,46,47,48,76,77,78,91,92,93,106,107,108]) {
  for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++) {
    assert.equal(tiles[((Math.floor(tile/15)*16+row)*240+tile%15*16+col)*4+3],255,'Solid wall tile has a transparent seam');
  }
}
for (let variant = 0; variant < 3; variant++) {
  const x = 64 + variant * 16, y = 208;
  for (let row = 0; row < 16; row++) {
    assert.equal(tiles[((y + row) * 240 + x) * 4 + 3], 0, 'Mushroom crosses its left tile edge');
    assert.equal(tiles[((y + row) * 240 + x + 15) * 4 + 3], 0, 'Mushroom crosses its right tile edge');
  }
  assert.ok(Array.from({length:16}, (_, col) => tiles[((y + 15) * 240 + x + col) * 4 + 3]).some(alpha => alpha > 128), 'Mushroom stem floats above the ground');
}
const crystals = await sharp('public/game/images/mewventure-crystals.png').ensureAlpha().raw().toBuffer();
for (let variant = 0; variant < 6; variant++) {
  const base = Array.from({length:16}, (_, col) => crystals[(15 * 96 + variant * 16 + col) * 4 + 3]);
  assert.ok(base.every(alpha => alpha > 96), 'Crystal base leaves a transparent gap against ground/ceiling');
}
for (const name of ['spr_player_graphic', 'Player_Clone']) {
  for (const animation of objects.find(o => o.name === name).animations) {
    const legacy = legacyObjects.find(o => o.name === name).animations.find(a => a.name === animation.name);
    assert.equal(animation.frames.length, legacy.frames.length);
    assert.equal(animation.speed, legacy.speed);
    for (let i = 0; i < animation.frames.length; i++) {
      const frame = animation.frames[i];
      assert.equal(frame.width, 32); assert.equal(frame.height, 32);
      assert.equal(frame.originX, .5); assert.equal(frame.originY, .75);
      assert.equal(frame.duration, legacy.frames[i].duration);
      assert.deepEqual(frame.engine[11], legacy.frames[i].engine[11]);
    }
  }
}
for (const name of ['spr_spike', 'spr_key', 'spr_player_key']) {
  const actual = objects.find(o => o.name === name).animations[0].frames;
  const previous = legacyObjects.find(o => o.name === name).animations[0].frames;
  assert.equal(actual.length, previous.length);
  actual.forEach((frame, i) => {
    for (const field of ['width', 'height', 'originX', 'originY', 'duration']) assert.equal(frame[field], previous[i][field], `${name}: ${field} changed`);
    assert.deepEqual(frame.engine[11], previous[i].engine[11], `${name}: hazard/key collision changed`);
  });
}
console.log('Atlas dimensions, frame origins/timing, physical player and tile collisions verified.');
if (process.argv.includes('--assets-only')) process.exit(0);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixture = stage => ({ stage, name: '@artQA', stageMs: 0, splits: Array.from({ length: stage - 1 }, (_, i) => ({ stage: i + 1, milliseconds: 1 })) });
async function until(check, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await check()) return; await wait(30); }
  throw new Error('Engine verification timed out');
}
let engine;
await fs.mkdir('.data/mewventure', { recursive: true });
try {
  engine = await createEngine(source, fixture(1));
  await engine.pause(false); await wait(400);
  await fs.writeFile('.data/mewventure/game-stage-1.jpg', Buffer.from(await engine.frame(), 'base64'));
  const input = keys => engine.input({ keys, pointer: null, paused: false });
  const reachX = x => until(async () => (await engine.inspect()).spr_player_base[0]?.x >= x);
  await input(['ArrowRight']); await reachX(36);
  await input(['ArrowRight','ArrowUp']); await reachX(114);
  await input(['ArrowRight']); await reachX(122);
  await input(['ArrowRight','ArrowUp']);
  await until(async () => (await engine.inspect()).spr_key.length === 0);
  assert.equal((await engine.snapshot()).events.length, 0, 'Key pickup alone completed stage');
  await engine.pause(true);
  const before = (await engine.inspect()).spr_player_base[0]; await wait(200);
  assert.deepEqual((await engine.inspect()).spr_player_base[0], before);
  await engine.close(); engine = null;
  console.log('Stage 1: movement, jumps, key pickup and pause passed with PUR PUR.');
  engine = await createEngine(source, fixture(5));
  await engine.pause(false); await wait(500);
  await fs.writeFile('.data/mewventure/game-stage-5.jpg', Buffer.from(await engine.frame(), 'base64'));
  for (const [x,y,down] of [[32,336,true],[758,300,true],[758,300,false]]) {
    await engine.input({ keys: [], pointer: { x,y,down }, paused: false }); await wait(150);
  }
  await until(async () => (await engine.snapshot()).events.length === 1);
  assert.equal((await engine.snapshot()).events[0].stage, 5);
  await engine.close(); engine = null;
  console.log('Stage 5: dragging PUR PUR to the exit still completes the puzzle.');
  engine = await createEngine(source, fixture(27));
  await engine.pause(false); await wait(350);
  assert.equal((await engine.snapshot()).layout, 'Level_27');
  await fs.writeFile('.data/mewventure/game-stage-27.jpg', Buffer.from(await engine.frame(), 'base64'));
  console.log('Stage 27: cave artwork loads in a later-stage layout.');
} finally { if (engine) await engine.close(); await closeServerBrowser(); }
