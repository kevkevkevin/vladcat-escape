// A visual cue only. The engine still owns each key's size, collision and pickup.
// Layer coordinates keep the halo aligned through scaling, scrolling and drag.
export function installKeyGlow(game) {
  const root = document.createElement('div');
  root.className = 'key-glow-layer';
  root.setAttribute('aria-hidden', 'true');
  document.body.append(root);
  const halos = new Map();
  const clear = () => { for (const halo of halos.values()) halo.remove(); halos.clear(); };
  game.addEventListener('beforeanylayoutend', clear);
  game.addEventListener('tick', () => {
    const keys = /^Level_([1-9]|[1-4][0-9])$/.test(game.layout.name)
      ? ['spr_key', 'spr_player_key'].flatMap(name => game.objects[name]?.getAllInstances() ?? [])
      : [];
    const active = new Set(keys);
    for (const [key, halo] of halos) if (!active.has(key)) { halo.remove(); halos.delete(key); }
    for (const key of keys) {
      let halo = halos.get(key);
      if (!halo) { halo = document.createElement('div'); halo.className = 'key-glow'; root.append(halo); halos.set(key, halo); }
      halo.hidden = !key.isVisible || !key.layer.isSelfAndParentsVisible;
      const [x, y] = key.layer.layerToCssPx(key.x, key.y);
      const [edgeX, edgeY] = key.layer.layerToCssPx(key.x + 16, key.y);
      const diameter = Math.hypot(edgeX - x, edgeY - y) * 2;
      halo.style.left = `${x}px`; halo.style.top = `${y}px`;
      halo.style.width = `${diameter}px`; halo.style.height = `${diameter}px`;
      halo.style.opacity = String(key.opacity * key.layer.opacity);
    }
  });
}
