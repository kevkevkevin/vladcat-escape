// One-time migration. The original export remains in legacy-export/.
import fs from "node:fs/promises";
import path from "node:path";
import { decodeLayout, decodeSheet, decodeObjects } from "../src/game/codec.mjs";

const root = process.cwd();
const legacy = path.join(root, "legacy-export");
await fs.mkdir(legacy, { recursive: true });
const exportFiles = ["index.html", "data.json", "style.css", "appmanifest.json", "offline.json", "sw.js", "workermain.js", "scripts", "images", "media", "icons"];
for (const name of exportFiles) {
  try { await fs.access(path.join(legacy, name)); } catch { await fs.rename(path.join(root, name), path.join(legacy, name)); }
}
const original = JSON.parse(await fs.readFile(path.join(legacy, "data.json"), "utf8"));
const p = original.project;
const referenceCode = await fs.readFile(path.join(legacy, "scripts/objRefTable.js"), "utf8");
const references = referenceCode.slice(referenceCode.indexOf("return ["), referenceCode.indexOf("];"))
  .match(/C3\.[A-Za-z0-9_.]+/g);
const write = async (relative, data) => {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n");
};
await write("src/game/settings.json", p.map((v, i) => [3, 5, 6].includes(i) ? [] : v));
await write("src/game/objects.json", decodeObjects(p[3], references));
await write("src/game/references.json", references);
const layouts = p[5].map((l) => decodeLayout(l, p[3]));
const manifest = layouts.map((l) => ({ name: l.name, file: /^Level_/.test(l.name) ? `level-${l.name.slice(6).padStart(2, "0")}.json` : `${l.name.toLowerCase()}.json` }));
for (let i = 0; i < layouts.length; i++) await write(`src/game/layouts/${manifest[i].file}`, layouts[i]);
await write("src/game/layouts/manifest.json", manifest);
for (const sheet of p[6]) await write(`src/game/events/${sheet[0]}.json`, decodeSheet(sheet, p[3], references));
const game = path.join(root, "public/game");
await fs.mkdir(game, { recursive: true });
for (const name of ["scripts", "images", "media", "icons", "style.css", "workermain.js"]) await fs.cp(path.join(legacy, name), path.join(game, name), { recursive: true });
// Normalize case: the export refers to Music.webm but ships music.webm.
await fs.copyFile(path.join(legacy, "media/music.webm"), path.join(game, "media/Music.webm"));
const runtime = await fs.readFile(path.join(game, "scripts/c3runtime.js"), "utf8");
const expressionsStart = runtime.lastIndexOf("// scripts/expTable.js");
if (expressionsStart < 0) throw new Error("Expression table not found");
await write("src/game/expressions.js", runtime.slice(expressionsStart));
await fs.writeFile(path.join(game, "scripts/c3runtime.js"), runtime.slice(0, expressionsStart));
await write("public/game/scripts/c3main.js", 'import "./c3runtime.js";\nimport "./expressions.js";\nimport "./objRefTable.js";\n');
const main = await fs.readFile(path.join(game, "scripts/main.js"), "utf8");
await fs.writeFile(path.join(game, "scripts/main.js"), main.slice(0, main.lastIndexOf("// start-export.js")));
console.log(`Extracted ${layouts.length} layouts, ${p[3].length} object types, and ${p[6].length} event sheets. Original export preserved.`);
