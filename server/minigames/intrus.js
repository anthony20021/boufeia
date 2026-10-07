import { randomInt } from 'crypto';
import { Minigame, shuffle } from './base.js';

const TARGET = 3;
const MAX_ROUNDS = 5;
const CELLS = 20;
const ROUND_MS = 12000;
const POINT_PAUSE_MS = 2200;

// Aliments qui se ressemblent : l'un remplit la grille, l'autre s'y cache une seule fois
const LOOKALIKES = [
  ['🍗', '🍖'], ['🍤', '🦐'], ['☕', '🍵'], ['🍦', '🍧'], ['🌮', '🌯'], ['🫓', '🥙'], ['🍊', '🍑'],
  ['🍏', '🍐'], ['🍎', '🍅'], ['🍜', '🍲'], ['🍙', '🍘'], ['🍩', '🥯'], ['🍇', '🫐'], ['🥤', '🧃'],
  ['🧁', '🍰'], ['🥟', '🥠'], ['🍈', '🍏'], ['🌶️', '🥕'], ['🍋', '🍌']
];

// « Cherchez l'intrus » : le premier qui touche l'aliment différent marque, une erreur bloque jusqu'à la grille suivante
export class IntrusGame extends Minigame {
  static id = 'intrus';
  static title = 'Cherchez l\'intrus';
  static emoji = '🔍';
  static secret = true; // à découvrir en jeu
  static rules = `Une grille d'aliments presque identiques… sauf un ! Le premier qui touche l'intrus marque le point, mais une erreur vous bloque jusqu'à la grille suivante. Le premier à ${TARGET} points empoche le bonus.`;

  constructor(ctx) {
    super(ctx);
    this.scores = this.zeroScores();
    this.pairs = shuffle([...LOOKALIKES]);
    this.round = 0;
    this.grid = [];
    this.odd = -1;
    this.locked = [];
    this.stage = 'play'; // 'play' | 'point'
    this.lastPoint = null;
  }

  start() {
    this.nextRound();
  }

  nextRound() {
    this.round++;
    const [a, b] = this.pairs[(this.round - 1) % this.pairs.length];
    const [common, intruder] = randomInt(2) ? [a, b] : [b, a];
    this.odd = randomInt(CELLS);
    this.grid = Array.from({ length: CELLS }, (_, index) => (index === this.odd ? intruder : common));
    this.locked = [];
    this.stage = 'play';
    this.lastPoint = null;
    this.ctx.setTimer(ROUND_MS, () => this.point(null));
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (msg.action !== 'pick' || this.over || this.stage !== 'play' || this.locked.includes(playerId)) return;
    const index = Number(msg.index);
    if (!Number.isInteger(index) || index < 0 || index >= CELLS) return;
    if (index === this.odd) return this.point(playerId);
    this.locked.push(playerId);
    if (this.locked.length >= this.ids.length) return this.point(null);
    this.ctx.broadcast();
  }

  point(winnerId) {
    this.stage = 'point';
    this.lastPoint = { winnerId, odd: this.odd };
    if (winnerId) this.scores[winnerId]++;
    this.ctx.clearTimer();
    this.ctx.broadcast();
    const done = this.ids.some((id) => this.scores[id] >= TARGET) || this.round >= MAX_ROUNDS;
    this.timers.after(POINT_PAUSE_MS, () => (done ? this.end(this.leaders(this.scores)) : this.nextRound()));
  }

  view() {
    return {
      grid: this.grid,
      round: this.round,
      target: TARGET,
      stage: this.stage,
      locked: this.locked,
      lastPoint: this.lastPoint,
      scores: this.scores
    };
  }
}
