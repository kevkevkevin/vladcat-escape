export type EngineValue = any; // Lossless metadata from the original engine.
export interface GameInstance {
  id: number; type: string; x: number; y: number; width: number; height: number;
  angle: number; originX: number; originY: number;
  properties: EngineValue[]; variables: Record<string, EngineValue>;
  behaviors: Record<string, EngineValue[]>; engine: EngineValue[];
  tiles?: number[][];
}
export interface GameLayer {
  name: string; visible: boolean; background: number[]; transparent: boolean;
  engine: EngineValue[]; instances: GameInstance[];
}
export interface GameLayout {
  name: string; width: number; height: number; eventSheet: string | null;
  engine: EngineValue[]; layers: GameLayer[];
}
export interface GameProject {
  settings: EngineValue[]; types: EngineValue[][]; references: string[];
  layouts: GameLayout[]; events: EngineValue[];
}

export const labelFor = (name: string) => ({ spr_player_graphic: "VLADCAT", spr_player_base: "VLADCAT collision", Player_Clone: "VLADCAT clone", spr_player_key: "carried key" } as Record<string, string>)[name] ?? name.replace(/^spr_/, "").replaceAll("_", " ");
export const levelNumber = (name: string) => Number(name.replace("Level_", ""));
