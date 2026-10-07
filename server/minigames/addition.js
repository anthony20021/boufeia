import { randomInt } from 'crypto';
import { Minigame, shuffle } from './base.js';

const QUESTIONS = 3;
const QUESTION_MS = 25000;
const REVEAL_MS = 3000;
const WRONG_COOLDOWN_MS = 1500;

const MENU = [
  { emoji: '🍕', name: 'Pizza' }, { emoji: '🍔', name: 'Burger' }, { emoji: '🍟', name: 'Frites' },
  { emoji: '🥤', name: 'Soda' }, { emoji: '🌭', name: 'Hot-dog' }, { emoji: '🍦', name: 'Glace' },
  { emoji: '🥗', name: 'Salade' }, { emoji: '🧇', name: 'Gaufre' }, { emoji: '☕', name: 'Café' },
  { emoji: '🥐', name: 'Croissant' }, { emoji: '🍩', name: 'Donut' }, { emoji: '🌯', name: 'Burrito' }
];

// Une note de plus en plus longue : 2 lignes, puis 3, puis 3 avec de plus grosses quantités
const buildBill = (level) => {
  const lines = shuffle([...MENU]).slice(0, level === 0 ? 2 : 3).map((dish) => ({
    ...dish,
    qty: randomInt(1, level === 2 ? 6 : 4),
    price: randomInt(1, 10)
  }));
  return { lines, total: lines.reduce((sum, line) => sum + line.qty * line.price, 0) };
};

// « L'addition, s'il vous plaît ! » : le premier qui donne le bon total de la note marque le point
export class AdditionGame extends Minigame {
  static id = 'addition';
  static title = 'L\'addition, s\'il vous plaît !';
  static emoji = '🧾';
  static secret = true; // à découvrir en jeu
  static rules = `${QUESTIONS} notes de restaurant à additionner de tête. Le premier qui tape le bon total marque le point (une erreur vous fait patienter un instant). Le plus de points empoche le bonus !`;

  constructor(ctx) {
    super(ctx);
    this.bills = Array.from({ length: QUESTIONS }, (_, level) => buildBill(level));
    this.scores = this.zeroScores();
    this.attempts = this.zeroScores();
    this.cooldownUntil = {};
    this.index = -1;
    this.stage = 'open'; // 'open' | 'reveal'
    this.lastWinner = null;
  }

  start() {
    this.next();
  }

  next() {
    if (this.index + 1 >= this.bills.length) return this.end(this.leaders(this.scores));
    this.index++;
    this.stage = 'open';
    this.lastWinner = null;
    this.ctx.setTimer(QUESTION_MS, () => this.reveal(null));
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (msg.action !== 'answer' || this.over || this.stage !== 'open') return;
    const now = Date.now();
    if (now < (this.cooldownUntil[playerId] || 0)) return;
    const value = Number(String(msg.value ?? '').trim());
    if (!Number.isInteger(value)) return;
    if (value === this.bills[this.index].total) {
      this.scores[playerId]++;
      return this.reveal(playerId);
    }
    this.attempts[playerId]++;
    this.cooldownUntil[playerId] = now + WRONG_COOLDOWN_MS;
    this.ctx.broadcast();
  }

  reveal(winnerId) {
    this.stage = 'reveal';
    this.lastWinner = winnerId;
    this.ctx.setTimer(REVEAL_MS, () => this.next());
    this.ctx.broadcast();
  }

  view() {
    const bill = this.bills[Math.max(0, this.index)];
    return {
      index: Math.max(0, this.index),
      total: QUESTIONS,
      lines: bill.lines,
      stage: this.stage,
      answer: this.stage === 'reveal' ? bill.total : null, // jamais envoyé avant la révélation
      lastWinner: this.lastWinner,
      attempts: this.attempts,
      cooldownMs: WRONG_COOLDOWN_MS,
      scores: this.scores
    };
  }
}
