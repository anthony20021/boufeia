import { randomInt } from 'crypto';
import { GameError } from '../errors.js';
import { Minigame, shuffle } from './base.js';
import { MEMORY_FACES } from './data.js';

const PAIRS = 8; // 16 cartes
const TURN_MS = 12000;
const MISMATCH_MS = 1300;
const MAX_MS = 4 * 60 * 1000; // garde-fou si les joueurs laissent filer leurs tours

// « Le Mémo du Chef » : mémory à tour de rôle, une paire trouvée fait rejouer
export class MemoryGame extends Minigame {
  static id = 'memory';
  static title = 'Le Mémo du Chef';
  static emoji = '🃏';
  static rules = `Chacun son tour, retournez deux cartes parmi ${PAIRS * 2}. Une paire trouvée rapporte un point et vous rejouez. Le plus de paires empoche le bonus !`;

  constructor(ctx) {
    super(ctx);
    const faces = shuffle([...MEMORY_FACES]).slice(0, PAIRS);
    this.cards = shuffle([...faces, ...faces]).map((face) => ({ face, owner: null }));
    this.scores = this.zeroScores();
    this.turn = this.ids[randomInt(this.ids.length)];
    this.flipped = [];
    this.locked = false;
  }

  introNote(playerId) {
    return this.turn === playerId ? 'Vous commencez !' : `${this.ctx.nameOf(this.turn)} commence.`;
  }

  start() {
    this.timers.after(MAX_MS, () => this.end(this.leaders(this.scores)));
    this.startTurn(this.turn);
  }

  startTurn(playerId) {
    this.turn = playerId;
    this.flipped = [];
    this.locked = false;
    this.ctx.setTimer(TURN_MS, () => this.startTurn(this.other(playerId))); // trop lent : la main passe
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (msg.action !== 'flip' || this.over || this.locked) return;
    if (playerId !== this.turn) throw new GameError('Ce n\'est pas votre tour');
    const index = Number(msg.index);
    const card = this.cards[index];
    if (!Number.isInteger(index) || !card || card.owner || this.flipped.includes(index)) return;

    this.flipped.push(index);
    if (this.flipped.length < 2) return this.ctx.broadcast();

    const [first, second] = this.flipped.map((i) => this.cards[i]);
    if (first.face === second.face) {
      first.owner = playerId;
      second.owner = playerId;
      this.scores[playerId]++;
      if (this.cards.every((c) => c.owner)) return this.end(this.leaders(this.scores));
      return this.startTurn(playerId); // paire trouvée : on rejoue
    }

    // Raté : les deux cartes restent visibles un instant, puis la main passe
    this.locked = true;
    this.ctx.clearTimer();
    this.ctx.broadcast();
    this.timers.after(MISMATCH_MS, () => this.startTurn(this.other(playerId)));
  }

  view() {
    return {
      // Les faces cachées ne quittent jamais le serveur (sauf à la fin, pour montrer la grille)
      cards: this.cards.map((card, index) => ({
        face: this.over || card.owner || this.flipped.includes(index) ? card.face : null,
        owner: card.owner
      })),
      flipped: this.flipped,
      turn: this.turn,
      locked: this.locked,
      scores: this.scores,
      pairs: PAIRS
    };
  }
}
