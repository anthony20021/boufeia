import { Minigame } from './base.js';

const DURATION_MS = 8000;
const BROADCAST_MS = 200;
const CHOP_MIN_INTERVAL_MS = 50; // 20 coupes/s maximum (anti-script)

// « La Découpe Express » : le plus de coupes en 8 s
export class ChopGame extends Minigame {
  static id = 'chop';
  static title = 'La Découpe Express';
  static emoji = '🔪';
  static rules = `Tapez le plus vite possible sur le légume pendant ${DURATION_MS / 1000} secondes. Le meilleur commis empoche le bonus !`;

  constructor(ctx) {
    super(ctx);
    this.counts = this.zeroScores();
    this.lastChopAt = {};
    this.dirty = false;
  }

  start() {
    this.ctx.setTimer(DURATION_MS, () => this.end(this.leaders(this.counts)));
    this.timers.every(BROADCAST_MS, () => {
      if (!this.dirty) return;
      this.dirty = false;
      this.ctx.broadcast();
    });
  }

  handle(playerId, msg) {
    if (msg.action !== 'chop' || this.over) return;
    const now = Date.now();
    if (now - (this.lastChopAt[playerId] || 0) < CHOP_MIN_INTERVAL_MS) return;
    this.lastChopAt[playerId] = now;
    this.counts[playerId]++;
    this.dirty = true;
  }

  view() {
    return { counts: this.counts };
  }
}
