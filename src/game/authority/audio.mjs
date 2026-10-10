import { SOUND_FILES } from './protocol.mjs';
// Playback mirrors sound events from the trusted engine. It never affects a
// puzzle or score. The player cannot choose arbitrary files or external URLs.
export class GameAudio {
  constructor(make = url => new Audio(url)) {
    this.make = make; this.items = []; this.lastId = 0; this.master = 1; this.silent = false; this.muted = new Set();
  }
  volume(item) { item.audio.volume = Math.min(1, Math.max(0, item.volume * this.master)); item.audio.muted = this.silent || this.muted.has(item.tag); }
  play(item) { item.audio.play().catch(() => { item.pending = true; }); }
  unlock() { for (const item of this.items) if (item.pending) { item.pending = false; this.play(item); } }
  receive(events) {
    for (const event of events) {
      if (!Number.isSafeInteger(event.id) || event.id <= this.lastId) continue;
      this.lastId = event.id;
      if (event.type === 'play' && SOUND_FILES.includes(event.name)) {
        this.items = this.items.filter(item => !item.audio.ended);
        if (this.items.length >= 32) { this.items.shift().audio.pause(); }
        const item = { audio: this.make(`/game/media/${event.name}.webm`), tag: String(event.tag), volume: Math.min(1, Math.max(0, event.volume)), pending: false };
        item.audio.loop = Boolean(event.loop); this.volume(item); this.items.push(item); this.play(item);
      } else if (event.type === 'stopAll') this.close();
      else if (event.type === 'stop') { for (const item of this.items) if (item.tag === event.tag) item.audio.pause(); this.items = this.items.filter(item => item.tag !== event.tag); }
      else if (event.type === 'mute') { if (event.muted) this.muted.add(event.tag); else this.muted.delete(event.tag); }
      else if (event.type === 'silent') this.silent = Boolean(event.silent);
      else if (event.type === 'master') this.master = Math.min(1, Math.max(0, event.volume));
      for (const item of this.items) this.volume(item);
    }
  }
  close() { for (const item of this.items) item.audio.pause(); this.items = []; }
}
