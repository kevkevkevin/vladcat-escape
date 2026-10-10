import type { GameInstance, GameLayout, GameProject, EngineValue } from "./types";

export type ImageBank = Map<string, HTMLImageElement>;
export async function loadImages(project: GameProject): Promise<ImageBank> {
  const files = new Set<string>();
  for (const type of project.types) {
    if (type[6]?.[0]) files.add(type[6][0]);
    for (const animation of type[7] ?? []) for (const frame of animation[7]) files.add(frame[0]);
  }
  const bank: ImageBank = new Map();
  await Promise.all([...files].map((file) => new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => { bank.set(file, image); resolve(); };
    image.onerror = () => resolve();
    image.src = `/game/${file}`;
  })));
  return bank;
}

function frameFor(instance: GameInstance, type: EngineValue[]) {
  if (type[7]) {
    const animation = type[7].find((a: EngineValue[]) => a[0] === instance.properties[1]) ?? type[7][0];
    return animation?.[7]?.[Number(instance.properties[2]) || 0] ?? animation?.[7]?.[0];
  }
  return type[6];
}

export function bounds(instance: GameInstance) {
  return { x: instance.x - instance.width * instance.originX, y: instance.y - instance.height * instance.originY, width: instance.width, height: instance.height };
}

export function drawLayout(ctx: CanvasRenderingContext2D, layout: GameLayout, project: GameProject, images: ImageBank, selected: number | null, layerName: string, grid: boolean) {
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#181425";
  ctx.fillRect(0, 0, layout.width, layout.height);
  for (const layer of layout.layers) {
    if (!layer.visible || ["Pause", "Fade", "Touch Screen"].includes(layer.name)) continue;
    for (const instance of layer.instances) {
      const type = project.types.find((t) => t[0] === instance.type);
      if (!type) continue;
      const frame = frameFor(instance, type);
      const rect = bounds(instance);
      ctx.save();
      ctx.translate(instance.x, instance.y);
      ctx.rotate(instance.angle);
      ctx.translate(-instance.width * instance.originX, -instance.height * instance.originY);
      if (instance.tiles && frame) {
        const image = images.get(frame[0]);
        const tw = Number(instance.properties[1]) || 16;
        const th = Number(instance.properties[2]) || 16;
        const columns = Math.floor(frame[4] / tw);
        if (image) instance.tiles.forEach((row, y) => row.forEach((value, x) => {
          if (value < 0) return;
          const tile = value & 0x1fffffff;
          ctx.drawImage(image, frame[2] + tile % columns * tw, frame[3] + Math.floor(tile / columns) * th, tw, th, x * tw, y * th, tw, th);
        }));
      } else if (instance.type === "UITip") {
        ctx.fillStyle = "#f0e6d6";
        ctx.font = "7px monospace";
        ctx.textBaseline = "top";
        const words = String(instance.properties[0]).split(" ");
        let line = ""; let y = 0;
        for (const word of words) {
          if (ctx.measureText(`${line} ${word}`).width > instance.width && line) { ctx.fillText(line, 0, y); y += 10; line = word; }
          else line += `${line ? " " : ""}${word}`;
        }
        ctx.fillText(line, 0, y);
      } else if (frame && images.has(frame[0])) {
        if (["spr_player_base", "Camera", "GameManager", "spr_Clock", "hidden_solid", "spr_border"].includes(instance.type)) {
          if (instance.id === selected) {
            ctx.fillStyle = "#9fe87040"; ctx.fillRect(0, 0, instance.width, instance.height);
          }
        } else {
          ctx.drawImage(images.get(frame[0])!, frame[2], frame[3], frame[4], frame[5], 0, 0, instance.width, instance.height);
        }
      } else if (instance.id === selected) {
        ctx.fillStyle = "#9fe87040"; ctx.fillRect(0, 0, rect.width, rect.height);
      }
      ctx.restore();
    }
  }
  if (grid) {
    ctx.strokeStyle = "#b9d5aa22"; ctx.lineWidth = 0.3;
    ctx.beginPath();
    for (let x = 0; x < layout.width; x += 16) { ctx.moveTo(x, 0); ctx.lineTo(x, layout.height); }
    for (let y = 0; y < layout.height; y += 16) { ctx.moveTo(0, y); ctx.lineTo(layout.width, y); }
    ctx.stroke();
  }
  const instance = layout.layers.find((l) => l.name === layerName)?.instances.find((i) => i.id === selected);
  if (instance) {
    const rect = bounds(instance);
    ctx.strokeStyle = "#b0f27c"; ctx.lineWidth = 1;
    ctx.strokeRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
    ctx.fillStyle = "#b0f27c";
    for (const x of [rect.x - 2, rect.x + rect.width - 1]) for (const y of [rect.y - 2, rect.y + rect.height - 1]) ctx.fillRect(x, y, 3, 3);
  }
}

export function drawTilePalette(ctx: CanvasRenderingContext2D, project: GameProject, images: ImageBank, selected: number) {
  const frame = project.types.find((t) => t[0] === "Tilemap")?.[6];
  if (!frame || !images.has(frame[0])) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 240, 288);
  ctx.drawImage(images.get(frame[0])!, frame[2], frame[3], frame[4], frame[5], 0, 0, 240, 288);
  if (selected >= 0) {
    ctx.strokeStyle = "#b0f27c"; ctx.lineWidth = 2;
    ctx.strokeRect(selected % 15 * 16 + 1, Math.floor(selected / 15) * 16 + 1, 14, 14);
  }
}
