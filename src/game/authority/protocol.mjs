// The public protocol accepts controls only. Never accept positions, game
// variables, code, URLs, a stage number, or a completion claim.
export const WIDTH = 768;
export const HEIGHT = 432;
export const SOUND_FILES = Object.freeze(['Jump', 'Hurt', 'pickup', 'click', 'impactWood', 'Music']);
// Protect edge events (press/release/pause) from pointer-move coalescing.
export function enqueueControls(queue, controls, transition = false) {
  const next = { ...controls, transition };
  const last = queue.at(-1);
  if (last && !last.transition && !transition && JSON.stringify(last.keys) === JSON.stringify(next.keys) && last.pointer?.down === next.pointer?.down && last.paused === next.paused) queue[queue.length - 1] = next;
  else queue.push(next);
}
export const KEY_CODES = Object.freeze({
  ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
  Space: 'Space', Enter: 'Enter', Escape: 'Escape',
  ...Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => [`Key${c}`, c.toLowerCase()])),
  ...Object.fromEntries('0123456789'.split('').map(c => [`Digit${c}`, c])),
});
export function controls(input) {
  if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).some(k => !['sequence', 'keys', 'pointer', 'paused'].includes(k))) throw new Error('Invalid controls');
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1 || !Array.isArray(input.keys) || input.keys.length > 8 || new Set(input.keys).size !== input.keys.length || input.keys.some(k => !Object.hasOwn(KEY_CODES, k)) || typeof input.paused !== 'boolean') throw new Error('Invalid controls');
  let pointer = null;
  if (input.pointer !== null) {
    const p = input.pointer;
    if (!p || Object.keys(p).some(k => !['x','y','down'].includes(k)) || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > WIDTH || p.y > HEIGHT || typeof p.down !== 'boolean') throw new Error('Invalid pointer');
    pointer = { x: p.x, y: p.y, down: p.down };
  }
  return { sequence: input.sequence, keys: [...input.keys], pointer, paused: input.paused };
}
export function publicAction(action) {
  return ['start', 'resume', 'pause', 'abandon', 'finish'].includes(action);
}
