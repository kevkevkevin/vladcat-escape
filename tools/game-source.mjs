import fs from "node:fs/promises";
import path from "node:path";
import { encodeObjects } from "../src/game/codec.mjs";

export const sourceRoot = path.join(process.cwd(), "src/game");
const read = async (file) => JSON.parse(await fs.readFile(path.join(sourceRoot, file), "utf8"));
export async function loadSource() {
  const [settings, objects, references, manifest] = await Promise.all([
    read("settings.json"), read("objects.json"), read("references.json"), read("layouts/manifest.json"),
  ]);
  const [layouts, events] = await Promise.all([
    Promise.all(manifest.map((entry) => read(`layouts/${entry.file}`))),
    Promise.all(["esLevels", "esAudio", "esMenu", "esScene"].map((name) => read(`events/${name}.json`))),
  ]);
  return { settings, types: encodeObjects(objects, references), references, layouts, events };
}
