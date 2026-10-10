import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadSource } from "../tools/game-source.mjs";
import { compileProject, decodeLayout, encodeLayout, encodeSheet, decodeSheet, validateLayout, encodeObjects, decodeObjects } from "../src/game/codec.mjs";

const original = JSON.parse(await fs.readFile("legacy-export/data.json", "utf8"));
const source = await loadSource();
const mediaFiles = await fs.readdir("public/game/media");

test("all original scenes and rule sheets round-trip independently of authored level edits", () => {
  const hash = (data) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
  // Editable source is allowed to differ from the original. Test the codec
  // against the immutable export so authoring changes don't break migration QA.
  const types = original.project[3];
  const fixture = {
    settings: original.project,
    types,
    references: source.references,
    layouts: original.project[5].map((layout) => decodeLayout(layout, types)),
    events: original.project[6].map((sheet) => decodeSheet(sheet, types, source.references)),
  };
  const rebuilt = compileProject(fixture);
  for (let i = 0; i < original.project.length; i++) assert.equal(hash(rebuilt.project[i]), hash(original.project[i]), `Project field ${i} changed`);
  assert.equal(source.layouts.filter((l) => /^Level_/.test(l.name)).length, 50);
});
test("stage 5 robot dragging is enabled without enabling it in ordinary stages", () => {
  const { project } = compileProject(source);
  const player = (level) => project[5].find((l) => l[0] === `Level_${level}`)[9][0][14].find((i) => i[1] === 2);
  assert.equal(player(5)[4][1][1], true);
  assert.equal(player(4)[4][1][1], false);
  assert.equal(player(6)[4][1][1], false);
  const events = [];
  const visit = (items) => { for (const event of items) { events.push(event); if (event.children) visit(event.children); } };
  visit(source.events.find((sheet) => sheet.name === "esLevels").events);
  for (const [trigger, enabled] of [["OnDragStart", 0], ["OnDrop", 1]]) {
    const event = events.find((event) => event.conditions?.some((condition) => condition.object === "spr_player_base" && condition.method === `C3.Behaviors.DragnDrop.Cnds.${trigger}`));
    assert.ok(event.actions.some((action) => action.object === "spr_player_base" && action.method === "C3.Behaviors.Platform.Acts.SetEnabled" && action.parameters[0][1] === enabled), `${trigger} must ${enabled ? 'resume' : 'suspend'} platform physics`);
  }
});
test("audio filenames match the exact runtime casing for Linux deployment", () => {
  for (const [name, formats] of source.settings[7]) for (const format of formats) assert.ok(mediaFiles.includes(`${name}${format[1]}`), `Missing ${name}${format[1]}`);
});
test("stage 5 unlocks the door when the dragged robot touches it", () => {
  const { project } = compileProject(source);
  const rule = project[6].find((sheet) => sheet[0] === "esLevels")[1].find((event) => event[5] === 91);
  const index = (name) => source.types.findIndex((type) => type[0] === name);
  assert.equal(rule[6][0][0], index("spr_player_base"));
  assert.equal(source.references[rule[6][0][1]], "C3.Plugins.Sprite.Cnds.OnCollision");
  assert.deepEqual(rule[6][0][9], [[4, index("spr_door")]]);
  assert.equal(rule[6][1][0], index("GameManager"));
  assert.deepEqual(rule[6][1][9][2], [7, [75]]); // Expression 75 is stage 5.
  assert.ok(rule[7].some((action) => action[0] === index("spr_door") && source.references[action[1]] === "C3.Plugins.Sprite.Acts.SetAnimFrame" && action[6][0][1][0] === 3)); // Expression 3 opens the door (frame 1).
  assert.ok(rule[7].some((action) => action[0] === index("spr_door") && source.references[action[1]] === "C3.Behaviors.solid.Acts.SetEnabled" && action[6][0][1] === 0));
});
test("editable position, text, platform physics and tiles reach the runtime", () => {
  const layout = structuredClone(source.layouts.find((l) => l.name === "Level_1"));
  const player = layout.layers.flatMap((l) => l.instances).find((i) => i.type === "spr_player_base");
  player.x = 48;
  player.behaviors.Platform[0] = 180;
  const tilemap = layout.layers[0].instances.find((i) => i.tiles);
  tilemap.tiles[3][3] = 17;
  const rebuilt = decodeLayout(encodeLayout(layout, source.types), source.types);
  assert.equal(rebuilt.layers.flatMap((l) => l.instances).find((i) => i.id === player.id).x, 48);
  assert.equal(rebuilt.layers.flatMap((l) => l.instances).find((i) => i.id === player.id).behaviors.Platform[0], 180);
  assert.equal(rebuilt.layers[0].instances.find((i) => i.tiles).tiles[3][3], 17);
});
test("preview launches the requested stage and initializes the matching level variable", () => {
  const { project } = compileProject(source, { startLayout: "Level_27" });
  assert.equal(project[1], "Level_27");
  assert.equal(project[6][0][1].find((e) => e[0] === 1 && e[1] === "Level")[3], 27);
  assert.throws(() => compileProject(source, { startLayout: "../../missing" }), /Unknown/);
});
test("named event actions recompile to the correct original object references", () => {
  for (const sheet of original.project[6]) assert.deepEqual(encodeSheet(decodeSheet(sheet, source.types, source.references), source.types, source.references), sheet);
});
test("readable sprite definitions preserve animations and support artwork edits", () => {
  const objects = decodeObjects(source.types, source.references);
  assert.deepEqual(encodeObjects(objects, source.references), source.types);
  const robot = objects.find((o) => o.name === "spr_player_graphic");
  robot.animations[0].speed = 20;
  robot.animations[0].frames[0].asset = "images/custom-robot.webp";
  const encoded = encodeObjects(objects, source.references);
  assert.equal(encoded[1][7][0][1], 20);
  assert.equal(encoded[1][7][0][7][0][0], "images/custom-robot.webp");
});
test("invalid coordinates, duplicate IDs, and malformed tile grids are rejected before saving", () => {
  const layout = structuredClone(source.layouts.find((l) => l.name === "Level_1"));
  layout.layers[0].instances[1].x = NaN;
  assert.throws(() => validateLayout(layout, source), /Invalid x/);
  layout.layers[0].instances[1].x = 5;
  layout.layers[0].instances[1].id = layout.layers[0].instances[0].id;
  assert.throws(() => validateLayout(layout, source), /unique/);
  layout.layers[0].instances[1].id = 5000;
  layout.layers[0].instances[0].tiles[0].pop();
  assert.throws(() => validateLayout(layout, source), /Invalid tile/);
});
