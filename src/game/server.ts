import "server-only";
import generated from "./generated/source.json";
import { loadSource } from "../../tools/game-source.mjs";
import type { GameProject } from "./types";

export async function getGameSource(): Promise<GameProject> {
  if (process.env.NODE_ENV === "development") return await loadSource() as GameProject;
  return generated as unknown as GameProject;
}
