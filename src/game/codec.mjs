/** Lossless conversion between editable game source and the Construct export. */
const copy = (value) => structuredClone(value);

export function decodeObjects(types, references) {
  const texture = (raw) => raw ? { asset: raw[0], x: raw[2], y: raw[3], width: raw[4], height: raw[5], engine: copy(raw) } : null;
  return types.map((raw) => ({
    name: raw[0], plugin: references[raw[1]],
    variables: raw[3].map((v) => ({ name: v[2], engine: copy(v) })),
    behaviors: raw[8].map((b) => ({ name: b[0], engine: copy(b) })),
    texture: texture(raw[6]),
    animations: raw[7]?.map((a) => ({
      name: a[0], speed: a[1], loop: a[2],
      frames: a[7].map((f) => ({ ...texture(f), duration: f[7], originX: f[8], originY: f[9] })),
      engine: copy(a.map((v, i) => i === 7 ? [] : v)),
    })) ?? null,
    engine: copy(raw.map((v, i) => [3, 6, 7, 8].includes(i) ? null : v)),
  }));
}

export function encodeObjects(objects, references) {
  const texture = (source) => {
    if (!source) return null;
    const raw = copy(source.engine);
    raw[0] = source.asset; raw[2] = source.x; raw[3] = source.y; raw[4] = source.width; raw[5] = source.height;
    return raw;
  };
  return objects.map((source) => {
    const raw = copy(source.engine);
    raw[0] = source.name; raw[1] = references.indexOf(source.plugin);
    if (raw[1] === -1) throw new Error(`Unknown object plugin: ${source.plugin}`);
    raw[3] = source.variables.map((v) => { const result = copy(v.engine); result[2] = v.name; return result; });
    raw[8] = source.behaviors.map((b) => { const result = copy(b.engine); result[0] = b.name; return result; });
    raw[6] = texture(source.texture);
    raw[7] = source.animations?.map((a) => {
      const result = copy(a.engine);
      result[0] = a.name; result[1] = a.speed; result[2] = a.loop;
      result[7] = a.frames.map((f) => { const frame = texture(f); frame[7] = f.duration; frame[8] = f.originX; frame[9] = f.originY; return frame; });
      return result;
    }) ?? null;
    return raw;
  });
}

export function decodeTiles(encoded, columns, rows) {
  const tiles = [];
  for (const token of encoded.split(",")) {
    const parts = token.split("x");
    const count = parts.length === 2 ? Number(parts[0]) : 1;
    const tile = Number(parts.at(-1));
    if (!Number.isInteger(count) || count < 1 || count > columns * rows || !Number.isInteger(tile)) throw new Error("Invalid tile data");
    for (let i = 0; i < count; i++) tiles.push(tile);
  }
  if (tiles.length !== columns * rows) throw new Error(`Expected ${columns * rows} tiles, found ${tiles.length}`);
  return Array.from({ length: rows }, (_, y) => tiles.slice(y * columns, (y + 1) * columns));
}

export function encodeTiles(grid) {
  const flat = grid.flat();
  const tokens = [];
  for (let i = 0; i < flat.length;) {
    let count = 1;
    while (i + count < flat.length && flat[i + count] === flat[i]) count++;
    tokens.push(count === 1 ? String(flat[i]) : `${count}x${flat[i]}`);
    i += count;
  }
  return tokens.join(",");
}

export function decodeLayout(raw, types) {
  return {
    name: raw[0], width: raw[1], height: raw[2], eventSheet: raw[7],
    engine: copy(raw.map((v, i) => i === 9 ? [] : v)),
    layers: raw[9].map((layer) => ({
      name: layer[0], visible: layer[3], background: layer[4], transparent: layer[5],
      engine: copy(layer.map((v, i) => i === 14 ? [] : v)),
      instances: layer[14].map((instance) => {
        const world = instance[0];
        const type = types[instance[1]];
        const result = {
          id: instance[2], type: type[0], x: world[0], y: world[1],
          width: world[3], height: world[4], angle: world[6],
          originX: world[8], originY: world[9],
          properties: copy(instance[5]),
          variables: Object.fromEntries(type[3].map((v, i) => [v[2], instance[3][i]])),
          behaviors: Object.fromEntries(type[8].map((b, i) => [b[0], copy(instance[4][i])])),
          engine: copy(instance),
        };
        if (world[13] && type[0] === "Tilemap") {
          result.tiles = decodeTiles(world[13][2], world[13][0], world[13][1]);
        }
        return result;
      }),
    })),
  };
}

export function encodeLayout(layout, types) {
  const raw = copy(layout.engine);
  raw[0] = layout.name; raw[1] = layout.width; raw[2] = layout.height; raw[7] = layout.eventSheet;
  raw[9] = layout.layers.map((layer) => {
    const encoded = copy(layer.engine);
    encoded[0] = layer.name; encoded[3] = layer.visible; encoded[4] = layer.background; encoded[5] = layer.transparent;
    encoded[14] = layer.instances.map((instance) => {
      const typeIndex = types.findIndex((t) => t[0] === instance.type);
      if (typeIndex === -1) throw new Error(`Unknown object type: ${instance.type}`);
      const type = types[typeIndex];
      const result = copy(instance.engine);
      result[1] = typeIndex; result[2] = instance.id;
      Object.entries({ x: 0, y: 1, width: 3, height: 4, angle: 6, originX: 8, originY: 9 }).forEach(([key, index]) => result[0][index] = instance[key]);
      // Family variables/behaviors follow object-specific ones in the export.
      // Keep those inherited slots even when this type has no direct behaviors.
      result[3] = [...type[3].map((v) => instance.variables[v[2]]), ...result[3].slice(type[3].length)];
      result[4] = [...type[8].map((b) => copy(instance.behaviors[b[0]])), ...result[4].slice(type[8].length)];
      result[5] = copy(instance.properties);
      if (instance.tiles) {
        result[0][13] = [instance.tiles[0].length, instance.tiles.length, encodeTiles(instance.tiles)];
      }
      return result;
    });
    return encoded;
  });
  return raw;
}

export function decodeSheet(sheet, types, references) {
  const names = types.map((t) => t[0]);
  const objectName = (index) => index === -1 ? "System" : index === -2 ? "Function" : names[index];
  const call = (raw, isCondition) => {
    const parametersIndex = isCondition ? 9 : 6;
    return {
      object: objectName(raw[0]), method: typeof raw[1] === "number" ? references[raw[1]] : raw[1],
      behavior: raw[2], parameters: copy(raw[parametersIndex] ?? []),
      ...(isCondition ? { inverted: raw[5] } : {}),
      engine: copy(raw),
    };
  };
  const event = (raw) => {
    if (raw[0] === 1) return { kind: "variable", name: raw[1], initialValue: raw[3], engine: copy(raw) };
    if (raw[0] === 2) return { kind: "include", sheet: raw[1], engine: copy(raw) };
    return {
      kind: raw[0] === 3 ? "group" : raw[0] === 4 ? "function" : "event",
      ...(raw[0] === 3 ? { name: raw[1][1], active: raw[1][0] } : {}),
      ...(raw[0] === 4 ? { name: raw[1][0] } : {}),
      anyCondition: raw[2], line: raw[5],
      conditions: raw[6].map((c) => call(c, true)), actions: raw[7].map((c) => call(c, false)),
      children: (raw[8] ?? []).map(event), engine: copy(raw.slice(0, 6)),
      hasChildren: raw.length > 8,
    };
  };
  return { name: sheet[0], events: sheet[1].map(event) };
}

export function encodeSheet(sheet, types, references) {
  const objectIndex = (name) => {
    if (name === "System") return -1;
    if (name === "Function") return -2;
    const index = types.findIndex((t) => t[0] === name);
    if (index === -1) throw new Error(`Unknown event object: ${name}`);
    return index;
  };
  const call = (source, isCondition) => {
    const raw = copy(source.engine);
    raw[0] = objectIndex(source.object);
    raw[1] = source.object === "Function" ? source.method : references.indexOf(source.method);
    if (raw[1] === -1) throw new Error(`Unknown method: ${source.method}`);
    raw[2] = source.behavior;
    if (isCondition) raw[5] = source.inverted;
    const index = isCondition ? 9 : 6;
    if (raw.length > index || source.parameters.length) raw[index] = copy(source.parameters);
    return raw;
  };
  const event = (source) => {
    const raw = copy(source.engine);
    if (source.kind === "variable") { raw[1] = source.name; raw[3] = source.initialValue; return raw; }
    if (source.kind === "include") { raw[1] = source.sheet; return raw; }
    if (source.kind === "group") raw[1] = [source.active, source.name];
    if (source.kind === "function") raw[1][0] = source.name;
    raw[2] = source.anyCondition;
    raw[6] = source.conditions.map((c) => call(c, true));
    raw[7] = source.actions.map((c) => call(c, false));
    if (source.hasChildren || source.children.length) raw[8] = source.children.map(event);
    return raw;
  };
  return [sheet.name, sheet.events.map(event)];
}

export function validateLayout(layout, project) {
  const baseline = project.layouts.find((l) => l.name === layout?.name);
  if (!baseline) throw new Error("Unknown layout");
  if (!Number.isFinite(layout.width) || !Number.isFinite(layout.height) || layout.width < 1 || layout.height < 1 || layout.width > 4096 || layout.height > 4096) throw new Error("Invalid layout dimensions");
  if (!project.events.some((e) => e.name === layout.eventSheet) && layout.eventSheet !== null) throw new Error("Unknown event sheet");
  if (!Array.isArray(layout.layers) || layout.layers.length > 32) throw new Error("Invalid layers");
  const ids = new Set();
  for (const layer of layout.layers) {
    if (!Array.isArray(layer.instances) || layer.instances.length > 5000) throw new Error("Invalid instances");
    for (const instance of layer.instances) {
      if (!Number.isSafeInteger(instance.id) || instance.id < 0 || ids.has(instance.id)) throw new Error("Object IDs must be unique positive integers");
      ids.add(instance.id);
      const type = project.types.find((t) => t[0] === instance.type);
      if (!type) throw new Error("Unknown object type");
      for (const key of ["x", "y", "width", "height", "angle", "originX", "originY"]) {
        if (!Number.isFinite(instance[key]) || Math.abs(instance[key]) > 100000) throw new Error(`Invalid ${key}`);
      }
      if (instance.tiles && (!instance.tiles.length || instance.tiles.length > 256 || !instance.tiles[0].length || instance.tiles[0].length > 256 || instance.tiles.some((row) => row.length !== instance.tiles[0].length || row.some((tile) => !Number.isInteger(tile) || tile < -1 || tile > 0x7fffffff)))) throw new Error("Invalid tile grid");
      if (!Array.isArray(instance.engine) || !Array.isArray(instance.engine[0])) throw new Error("Missing engine metadata");
    }
  }
  // Also check the fields that the encoder needs before accepting a save.
  encodeLayout(layout, project.types);
  return layout;
}

export function compileProject(source, { startLayout, playerName, override } = {}) {
  const project = copy(source.settings);
  project[3] = copy(source.types);
  project[5] = source.layouts.map((layout) => encodeLayout(override?.name === layout.name ? override : layout, source.types));
  project[6] = source.events.map((sheet) => encodeSheet(sheet, source.types, source.references));
  if (startLayout) {
    if (!source.layouts.some((l) => l.name === startLayout)) throw new Error("Unknown starting layout");
    project[1] = startLayout;
    const number = Number(startLayout.replace("Level_", ""));
    for (const sheet of project[6]) for (const event of sheet[1]) {
      if (event[0] === 1 && event[1] === "Level" && Number.isFinite(number)) event[3] = number;
      if (event[0] === 1 && event[1] === "var_name_player" && playerName) event[3] = playerName;
    }
  }
  const maxId = Math.max(...project[5].flatMap((l) => l[9].flatMap((layer) => layer[14].map((i) => i[2]))));
  project[21] = Math.max(project[21], maxId + 1);
  return { project };
}
