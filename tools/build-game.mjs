import fs from "node:fs/promises";
import { loadSource } from "./game-source.mjs";
import { compileProject, validateLayout } from "../src/game/codec.mjs";

const source = await loadSource();
for (const layout of source.layouts) validateLayout(layout, source);
await fs.mkdir("src/game/generated", { recursive: true });
await fs.writeFile("src/game/generated/source.json", JSON.stringify(source));
await fs.writeFile("src/game/generated/runtime.json", JSON.stringify(compileProject(source)));
await fs.copyFile("src/game/expressions.js", "public/game/scripts/expressions.js");
// Windows accepts mismatched casing; Linux hosting doesn't. Normalize the
// actual directory entry through a temporary name for each exported sound.
const mediaFiles = await fs.readdir("public/game/media");
for (const [name, formats] of source.settings[7]) {
  for (const format of formats) {
    const expected = `${name}${format[1]}`;
    const existing = mediaFiles.find((file) => file.toLowerCase() === expected.toLowerCase());
    if (!existing) throw new Error(`Missing audio asset: ${expected}`);
    if (existing !== expected) {
      const temporary = `public/game/media/${expected}.case-tmp`;
      await fs.rename(`public/game/media/${existing}`, temporary);
      await fs.rename(temporary, `public/game/media/${expected}`);
    }
  }
}
console.log(`Game ready: ${source.layouts.filter((l) => l.name.startsWith("Level_")).length} levels.`);
