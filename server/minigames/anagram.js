import { Minigame, normalizeWord, shuffle } from './base.js';
import { ANAGRAM_WORDS } from './data.js';

const WORDS = 3;
const WORD_MS = 30000;
const HINT_AFTER_MS = 15000;
const REVEAL_MS = 3000;
const GUESS_MIN_INTERVAL_MS = 300;

const scramble = (word) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const letters = shuffle([...word]);
    if (letters.join('') !== word) return letters;
  }
  return [...word].reverse();
};

// « Les Mots Mélangés » : le premier qui remet les lettres dans l'ordre marque le point
export class AnagramGame extends Minigame {
  static id = 'anagram';
  static title = 'Les Mots Mélangés';
  static emoji = '🔤';
  static rules = `${WORDS} mots de cuisine aux lettres mélangées. Le premier qui retrouve le mot marque un point (un indice tombe au bout de ${HINT_AFTER_MS / 1000} s). Le plus de points empoche le bonus !`;

  constructor(ctx) {
    super(ctx);
    this.words = shuffle([...ANAGRAM_WORDS]).slice(0, WORDS);
    this.scores = this.zeroScores();
    this.attempts = this.zeroScores();
    this.lastGuessAt = {};
    this.index = -1;
    this.letters = [];
    this.stage = 'open'; // 'open' | 'reveal'
    this.hint = false;
    this.lastWinner = null;
  }

  start() {
    this.nextWord();
  }

  nextWord() {
    // Dernier mot joué : on termine en le laissant affiché
    if (this.index + 1 >= this.words.length) return this.end(this.leaders(this.scores));
    this.index++;
    this.letters = scramble(this.words[this.index]);
    this.stage = 'open';
    this.hint = false;
    this.lastWinner = null;
    this.ctx.setTimer(WORD_MS, () => this.reveal(null));
    this.timers.after(HINT_AFTER_MS, () => {
      this.hint = true;
      this.ctx.broadcast();
    });
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (msg.action !== 'guess' || this.over || this.stage !== 'open') return;
    const now = Date.now();
    if (now - (this.lastGuessAt[playerId] || 0) < GUESS_MIN_INTERVAL_MS) return;
    this.lastGuessAt[playerId] = now;

    if (normalizeWord(msg.text) === this.words[this.index]) {
      this.scores[playerId]++;
      return this.reveal(playerId);
    }
    this.attempts[playerId]++; // le client secoue le champ, l'adversaire ne voit que le nombre d'essais
    this.ctx.broadcast();
  }

  reveal(winnerId) {
    this.timers.clear(); // l'indice n'a plus lieu d'être
    this.stage = 'reveal';
    this.lastWinner = winnerId;
    this.ctx.setTimer(REVEAL_MS, () => this.nextWord());
    this.ctx.broadcast();
  }

  view() {
    const word = this.words[this.index] || '';
    return {
      index: Math.max(0, this.index),
      total: WORDS,
      letters: this.letters,
      stage: this.stage,
      hint: this.hint || this.stage === 'reveal' ? word[0] : null,
      word: this.stage === 'reveal' ? word : null, // jamais envoyé avant la révélation
      lastWinner: this.lastWinner,
      attempts: this.attempts,
      scores: this.scores
    };
  }
}
