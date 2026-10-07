import { randomInt } from 'crypto';
import { Minigame } from './base.js';

const TARGET = 3;
const MAX_ROUNDS = 7;
const WAIT_MIN_MS = 1500;
const WAIT_MAX_MS = 5000;
const GO_TIMEOUT_MS = 3000;
const POINT_PAUSE_MS = 2000;

// « Le Réflexe du Chef » : le premier qui tape après le signal marque, taper trop tôt donne le point à l'autre
export class ReflexGame extends Minigame {
  static id = 'reflex';
  static title = 'Le Réflexe du Chef';
  static emoji = '🍳';
  static rules = `Quand la poêle s'enflamme 🔥, tapez le plus vite possible ! Taper trop tôt donne le point à l'adversaire. Le premier à ${TARGET} points empoche le bonus.`;

  constructor(ctx) {
    super(ctx);
    this.scores = this.zeroScores();
    this.round = 0;
    this.stage = 'wait'; // 'wait' | 'go' | 'point'
    this.goAt = 0;
    this.lastPoint = null;
  }

  start() {
    this.ctx.clearTimer(); // aucun compte à rebours : il trahirait l'instant du signal
    this.nextRound();
  }

  nextRound() {
    this.round++;
    this.stage = 'wait';
    this.lastPoint = null;
    this.ctx.broadcast();
    this.timers.after(randomInt(WAIT_MIN_MS, WAIT_MAX_MS + 1), () => {
      this.stage = 'go';
      this.goAt = Date.now();
      this.ctx.broadcast();
      this.timers.after(GO_TIMEOUT_MS, () => this.point(null, 'slow'));
    });
  }

  handle(playerId, msg) {
    if (msg.action !== 'tap' || this.over) return;
    if (this.stage === 'wait') return this.point(this.other(playerId), 'early', playerId);
    if (this.stage === 'go') return this.point(playerId, 'fast', playerId, Date.now() - this.goAt);
  }

  point(winnerId, reason, byId = null, reactionMs = null) {
    this.timers.clear(); // annule le signal ou le délai en attente
    this.stage = 'point';
    this.lastPoint = { winnerId, reason, byId, reactionMs };
    if (winnerId) this.scores[winnerId]++;
    this.ctx.broadcast();
    const done = this.ids.some((id) => this.scores[id] >= TARGET) || this.round >= MAX_ROUNDS;
    this.timers.after(POINT_PAUSE_MS, () => (done ? this.end(this.leaders(this.scores)) : this.nextRound()));
  }

  view() {
    return {
      stage: this.stage,
      round: this.round,
      target: TARGET,
      lastPoint: this.lastPoint,
      scores: this.scores
    };
  }
}
