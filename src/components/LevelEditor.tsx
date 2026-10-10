"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GamePlayer } from "./GamePlayer";
import { bounds, drawLayout, drawTilePalette, loadImages, type ImageBank } from "@/game/render";
import { labelFor, type GameInstance, type GameLayout, type GameProject } from "@/game/types";

const clone = <T,>(value: T): T => structuredClone(value);
const protectedTypes = ["Tilemap", "GameManager", "Camera", "spr_player_base", "spr_player_graphic"];
const addableTypes = ["spr_key", "spr_spike", "spr_lava", "spr_ground_draggable", "Ghost", "spr_fire", "spr_gate", "spr_secret_wall"];
const physicsLabels = ["Max speed", "Acceleration", "Deceleration", "Jump strength", "Gravity", "Max fall speed"];

export function LevelEditor({ project, onSaved }: { project: GameProject; onSaved: (project: GameProject) => void }) {
  const [name, setName] = useState("Level_1");
  const baseline = project.layouts.find((l) => l.name === name)!;
  const [draft, setDraft] = useState<GameLayout>(() => clone(baseline));
  const [layerName, setLayerName] = useState("Game");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tool, setTool] = useState<"select" | "paint">("select");
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [tile, setTile] = useState(17);
  const [images, setImages] = useState<ImageBank>(new Map());
  const [history, setHistory] = useState<GameLayout[]>([]);
  const [future, setFuture] = useState<GameLayout[]>([]);
  const [preview, setPreview] = useState<GameLayout | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [addType, setAddType] = useState("spr_spike");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const palette = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const painting = useRef(false);
  const layer = draft.layers.find((l) => l.name === layerName) ?? draft.layers[0];
  const selected = layer?.instances.find((i) => i.id === selectedId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    let active = true;
    loadImages(project).then((bank) => { if (active) setImages(bank); });
    return () => { active = false; };
  }, [project]);

  useEffect(() => {
    const original = project.layouts.find((l) => l.name === name)!;
    let restored = clone(original);
    try {
      const stored = localStorage.getItem(`ecodroids:draft:${name}`);
      if (stored) { restored = JSON.parse(stored); setNotice("Restored your local draft."); }
      else setNotice("");
    } catch { setNotice("Local drafts are unavailable. Use Save source or Download JSON to keep changes."); }
    setDraft(restored);
    setLayerName(original.layers.find((l) => l.name === "Game")?.name ?? original.layers[0].name);
    setHistory([]); setFuture([]); setSelectedId(null); setPreview(null); setDraftLoaded(true);
    // Stage changes intentionally restore a draft; saving the project should not reset an in-progress edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    if (!draftLoaded || draft.name !== name) return;
    try {
      if (dirty) localStorage.setItem(`ecodroids:draft:${name}`, JSON.stringify(draft));
      else localStorage.removeItem(`ecodroids:draft:${name}`);
    } catch { /* Explicit save/download remain available when storage is full. */ }
  }, [draft, name, dirty, draftLoaded]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawLayout(ctx, draft, project, images, selectedId, layerName, grid);
    const tileCtx = palette.current?.getContext("2d");
    if (tileCtx) drawTilePalette(tileCtx, project, images, tile);
  }, [draft, project, images, selectedId, layerName, grid, tile, tool, preview]);

  const commit = useCallback((next: GameLayout) => {
    setHistory((items) => [...items.slice(-49), clone(draft)]);
    setFuture([]); setDraft(next); setNotice("");
  }, [draft]);

  const updateInstance = (mutate: (instance: GameInstance) => void) => {
    if (!selected) return;
    const next = clone(draft);
    const instance = next.layers.find((l) => l.name === layer.name)!.instances.find((i) => i.id === selected.id)!;
    mutate(instance);
    if (["spr_player_base", "spr_player_graphic"].includes(instance.type) && (instance.x !== selected.x || instance.y !== selected.y)) {
      for (const other of next.layers.flatMap((l) => l.instances)) {
        if (["spr_player_base", "spr_player_graphic"].includes(other.type)) { other.x = instance.x; other.y = instance.y; }
      }
    }
    commit(next);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [...items, clone(draft)]); setHistory(history.slice(0, -1)); setDraft(clone(previous));
  };
  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((items) => [...items, clone(draft)]); setFuture(future.slice(0, -1)); setDraft(clone(next));
  };

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * draft.width, y: (event.clientY - rect.top) / rect.height * draft.height };
  }
  function paint(x: number, y: number) {
    setDraft((current) => {
      const next = clone(current);
      const tilemap = next.layers.find((l) => l.name === layer.name)?.instances.find((i) => i.tiles);
      if (!tilemap?.tiles) return current;
      const p = bounds(tilemap);
      const col = Math.floor((x - p.x) / (Number(tilemap.properties[1]) || 16));
      const row = Math.floor((y - p.y) / (Number(tilemap.properties[2]) || 16));
      if (row >= 0 && row < tilemap.tiles.length && col >= 0 && col < tilemap.tiles[0].length) tilemap.tiles[row][col] = tile;
      return next;
    });
  }
  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    if (tool === "paint") {
      setHistory((items) => [...items.slice(-49), clone(draft)]); setFuture([]); painting.current = true; paint(p.x, p.y); return;
    }
    const hit = [...layer.instances].reverse().find((i) => {
      if (i.tiles) return false;
      const r = bounds(i);
      return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
    });
    setSelectedId(hit?.id ?? null);
    if (hit) {
      setHistory((items) => [...items.slice(-49), clone(draft)]); setFuture([]);
      drag.current = { id: hit.id, offsetX: p.x - hit.x, offsetY: p.y - hit.y };
    }
  }
  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const p = point(event);
    if (painting.current) { paint(p.x, p.y); return; }
    const active = drag.current;
    if (!active) return;
    setDraft((current) => {
      const next = clone(current);
      const instance = next.layers.find((l) => l.name === layer.name)!.instances.find((i) => i.id === active.id)!;
      const x = p.x - active.offsetX; const y = p.y - active.offsetY;
      instance.x = snap ? Math.round(x / 8) * 8 : Math.round(x);
      instance.y = snap ? Math.round(y / 8) * 8 : Math.round(y);
      // Move the collision body with the visible player and vice versa.
      if (["spr_player_base", "spr_player_graphic"].includes(instance.type)) {
        for (const other of next.layers.flatMap((l) => l.instances)) {
          if (["spr_player_base", "spr_player_graphic"].includes(other.type)) { other.x = instance.x; other.y = instance.y; }
        }
      }
      return next;
    });
  }

  async function save() {
    const snapshot = clone(draft);
    setSaving(true);
    try {
      const response = await fetch("/api/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onSaved({ ...project, layouts: project.layouts.map((l) => l.name === snapshot.name ? snapshot : l) });
      setNotice(`Saved to ${result.file}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save"); }
    finally { setSaving(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify(draft, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${draft.name.startsWith("Level_") ? `level-${draft.name.slice(6).padStart(2, "0")}` : draft.name.toLowerCase()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("This file is too large.");
      const next = JSON.parse(await file.text());
      if (next.name !== name) throw new Error("Choose the matching stage before importing its JSON.");
      const response = await fetch("/api/runtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      commit(next); setSelectedId(null); setNotice("Imported layout. Save source to keep it in the project.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Invalid layout file"); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }
  function addObject() {
    const prototype = project.layouts.flatMap((l) => l.layers.flatMap((layer) => layer.instances)).find((i) => i.type === addType);
    if (!prototype) return;
    const next = clone(draft); const instance = clone(prototype);
    instance.id = Math.max(...project.layouts.flatMap((l) => l.layers.flatMap((layer) => layer.instances.map((i) => i.id))), ...draft.layers.flatMap((l) => l.instances.map((i) => i.id))) + 1;
    instance.x = 192; instance.y = 120;
    next.layers.find((l) => l.name === layer.name)!.instances.push(instance);
    commit(next); setSelectedId(instance.id); setTool("select");
  }

  return <section className="editor-shell" aria-label="Level editor">
    <div className="editor-topbar"><div className="level-picker"><span className="eyebrow">EDITING</span><select aria-label="Choose level to edit" value={name} onChange={(e) => { setDraftLoaded(false); setName(e.target.value); }}>{project.layouts.filter((l) => l.name !== "Objects").map((l) => <option key={l.name} value={l.name}>{l.name.replace("Level_", "Level ")}</option>)}</select><span className={`save-indicator ${dirty ? "dirty" : ""}`}>{dirty ? "Unsaved changes" : "Source is up to date"}</span></div><div className="toolbar-actions"><button className="button secondary" onClick={() => setPreview(preview ? null : clone(draft))}>{preview ? "← Back to editing" : "▷ Playtest"}</button><button className="button primary" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save source ↗"}</button></div></div>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="editor-body">
      <aside className="layer-panel"><div className="panel-title">LAYERS <span>{draft.layers.length.toString().padStart(2, "0")}</span></div><div className="layer-list">{draft.layers.map((l) => <button key={l.name} className={layer.name === l.name ? "selected" : ""} onClick={() => { setLayerName(l.name); setSelectedId(null); }}><span>▱</span>{l.name}<small>{l.instances.length}</small></button>)}</div><div className="panel-title objects-title">OBJECTS <span>{layer.instances.length.toString().padStart(2, "0")}</span></div><div className="object-list">{layer.instances.map((i) => <button key={i.id} className={i.id === selectedId ? "selected" : ""} onClick={() => { setSelectedId(i.id); setTool("select"); }}><span>{i.tiles ? "▦" : "◇"}</span><span>{labelFor(i.type)}</span><small>{i.id}</small></button>)}</div><div className="add-object"><label className="eyebrow" htmlFor="add-object-type">ADD TO LAYER</label><select id="add-object-type" value={addType} onChange={(e) => setAddType(e.target.value)}>{addableTypes.map((t) => <option key={t} value={t}>{labelFor(t)}</option>)}</select><button className="button secondary" onClick={addObject}>+ Add object</button></div></aside>
      <div className="editor-center"><div className="canvas-toolbar"><div className="tool-switch"><button className={tool === "select" ? "selected" : ""} onClick={() => setTool("select")}>↖ Select</button><button className={tool === "paint" ? "selected" : ""} onClick={() => setTool("paint")}>▦ Tiles</button></div><div className="canvas-options"><label><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />Grid</label><label><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />Snap</label><button className="icon-button" aria-label="Undo" disabled={!history.length} onClick={undo}>↶</button><button className="icon-button" aria-label="Redo" disabled={!future.length} onClick={redo}>↷</button></div></div>
        <div className="canvas-area">{preview ? <div className="editor-preview"><GamePlayer key={preview.name} layout={preview.name} override={preview} /></div> : <canvas ref={canvas} width={draft.width} height={draft.height} aria-label="Level layout. Select an object in the list to edit its position, or drag it here." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; painting.current = false; }} onPointerCancel={() => { drag.current = null; painting.current = false; }} />}</div>
        <div className="canvas-caption"><span><span className="status-dot" />{preview ? "LIVE PLAYTEST · CLICK THE GAME TO FOCUS" : tool === "paint" ? "PAINT ON THE TILEMAP · SELECT A TILE IN THE INSPECTOR" : "DRAG OBJECTS TO MOVE · SELECT AN OBJECT TO EDIT"}</span><span>{draft.width} × {draft.height}</span></div>
        <div className="editor-note"><span>↗</span><div><h3>A little change can make a big puzzle.</h3><p>The layout view shows starting positions. Playtest runs the full game with your current draft, including every trap and level rule.</p></div></div>
        <div className="source-actions"><button onClick={download}>↓ Download JSON</button><button onClick={() => fileInput.current?.click()}>↑ Import JSON</button><button disabled={!dirty} onClick={() => { commit(clone(baseline)); setSelectedId(null); }}>↻ Reset to source</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} /></div>
      </div>
      <aside className="inspector"><div className="panel-title">INSPECTOR <span>⌘</span></div>{tool === "paint" ? <><div className="inspector-heading"><h3>Tile palette</h3><p>Choose a tile, then paint on the level.</p></div><button className={`button secondary ${tile === -1 ? "selected" : ""}`} onClick={() => setTile(-1)}>⌫ Erase tile</button><div className="tile-palette"><canvas ref={palette} width={240} height={288} aria-label="Tile palette" onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTile(Math.floor((e.clientX - r.left) / r.width * 15) + Math.floor((e.clientY - r.top) / r.height * 18) * 15); }} /></div><p className="muted">{tile === -1 ? "Eraser selected" : `Tile ${tile} selected`}</p>{!layer.instances.some((i) => i.tiles) && <div className="notice">Select the Game layer to paint its tilemap.</div>}</> : selected ? <>
        <div className="inspector-heading"><span className="object-type">OBJECT #{selected.id}</span><h3>{labelFor(selected.type)}</h3><p>{layer.name} layer</p></div>
        <div className="field-section"><span className="eyebrow">TRANSFORM</span><div className="field-grid">{(["x", "y", "width", "height"] as const).map((key) => <label key={key}><span>{key === "x" || key === "y" ? key.toUpperCase() : key}</span><input aria-label={`Object ${key}`} type="number" value={selected[key]} onChange={(e) => { if (e.target.value !== "") updateInstance((i) => { i[key] = Number(e.target.value); }); }} /></label>)}</div><label className="full-field"><span>Rotation (degrees)</span><input type="number" value={Math.round(selected.angle * 180 / Math.PI)} onChange={(e) => updateInstance((i) => { i.angle = Number(e.target.value) * Math.PI / 180; })} /></label></div>
        {selected.type === "UITip" && <div className="field-section"><label className="full-field"><span>Level hint</span><textarea aria-label="Level hint" value={String(selected.properties[0])} onChange={(e) => updateInstance((i) => { i.properties[0] = e.target.value; })} /></label></div>}
        {selected.behaviors.Platform && <div className="field-section"><span className="eyebrow">PLAYER PHYSICS</span>{physicsLabels.map((label, index) => <label className="full-field" key={label}><span>{label}</span><input aria-label={label} type="number" min="0" value={Number(selected.behaviors.Platform[index])} onChange={(e) => updateInstance((i) => { i.behaviors.Platform[index] = Number(e.target.value); })} /></label>)}</div>}
        {typeof selected.properties[1] === "string" && project.types.find((t) => t[0] === selected.type)?.[7] && <div className="field-section"><label className="full-field"><span>Animation</span><select value={selected.properties[1]} onChange={(e) => updateInstance((i) => { i.properties[1] = e.target.value; i.properties[2] = 0; })}>{project.types.find((t) => t[0] === selected.type)![7].map((a: any[]) => <option key={a[0]}>{a[0]}</option>)}</select></label><label className="full-field"><span>Frame</span><input type="number" min="0" value={Number(selected.properties[2])} onChange={(e) => updateInstance((i) => { i.properties[2] = Math.max(0, Number(e.target.value)); })} /></label></div>}
        {Object.keys(selected.variables).length > 0 && <div className="field-section"><span className="eyebrow">INSTANCE VARIABLES</span>{Object.entries(selected.variables).map(([key, value]) => <label className="full-field" key={key}><span>{key}</span>{typeof value === "boolean" ? <input type="checkbox" checked={value} onChange={(e) => updateInstance((i) => { i.variables[key] = e.target.checked; })} /> : <input value={String(value ?? "")} type={typeof value === "number" ? "number" : "text"} onChange={(e) => updateInstance((i) => { i.variables[key] = typeof value === "number" ? Number(e.target.value) : e.target.value; })} />}</label>)}</div>}
        <button className="button danger" disabled={protectedTypes.includes(selected.type)} onClick={() => { const next = clone(draft); next.layers.find((l) => l.name === layer.name)!.instances = layer.instances.filter((i) => i.id !== selectedId); commit(next); setSelectedId(null); }}>Remove object</button>
      </> : <div className="inspector-empty"><span>↖</span><h3>Shape VLADCAT’s world.</h3><p>Select an object in the scene or the list. Its position, artwork, and settings will appear here.</p><div className="inspector-tip">Try moving the key or changing VLADCAT’s jump strength.</div></div>}</aside>
    </div>
    <div className="editor-statusbar"><span>{name.startsWith("Level_") ? `src/game/layouts/level-${name.slice(6).padStart(2, "0")}.json` : `src/game/layouts/${name.toLowerCase()}.json`}</span><span>Rules: {draft.eventSheet ?? "none"} · {draft.layers.flatMap((l) => l.instances).length} objects</span></div>
  </section>;
}
