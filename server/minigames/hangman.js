import { randomInt } from 'crypto';
import { GameError } from '../errors.js';
import { Minigame, normalizeWord, shuffle } from './base.js';
import { FOOD_WORDS } from './data.js';

const CHOOSE_MS = 30000;
const GUESS_MS = 90000;
const MAX_ERRORS = 8;
const MIN_LENGTH = 4;
const MAX_LENGTH = 12;

const validateWord = (raw) => {
  const text = String(raw ?? '').trim();
  const word = normalizeWord(text);
  if (/[^\p{L}]/u.test(text)) throw new GameError('Un seul mot, sans espace, tiret ni chiffre');
  if (word.length < MIN_LENGTH || word.length > MAX_LENGTH) throw new GameError(`Le mot doit faire de ${MIN_LENGTH} à ${MAX_LENGTH} lettres`);
  if (!/[AEIOUY]/.test(word)) throw new GameError('Ce mot n\'a pas de voyelle…');
  if (new Set(word).size < 3) throw new GameError('Choisissez un vrai mot !');
  return word;
};

// « Le Pendu Gourmand » : rôles tirés au sort, l'un choisit le mot, l'autre le devine
export class HangmanGame extends Minigame {
  static id = 'hangman';
  static title = 'Le Pendu Gourmand';
  static emoji = '🪢';
  static rules = `Les rôles sont tirés au sort : l'un choisit un mot secret, l'autre doit le deviner lettre par lettre avant ${MAX_ERRORS} erreurs. Le gagnant empoche le bonus !`;

  constructor(ctx) {
    super(ctx);
    this.chooserId = this.ids[randomInt(this.ids.length)];
    this.guesserId = this.other(this.chooserId);
    this.suggestions = shuffle(FOOD_WORDS.filter((w) => w.length >= 5 && w.length <= 11)).slice(0, 3);
    this.stage = 'choose'; // 'choose' | 'guess' | 'done'
    this.word = null;
    this.auto = false;
    this.guessed = [];
    this.errors = 0;
    this.found = null;
  }

  introNote(playerId) {
    return playerId === this.chooserId
      ? 'Vous choisirez le mot secret 🤫'
      : `Vous devinerez le mot secret de ${this.ctx.nameOf(this.chooserId)} 🔍`;
  }

  start() {
    // Pas de mot à temps : un mot du catalogue est tiré pour lui
    this.ctx.setTimer(CHOOSE_MS, () => this.setWord(this.suggestions[0], true));
    this.ctx.broadcast();
  }

  setWord(word, auto = false) {
    this.word = word;
    this.auto = auto;
    this.stage = 'guess';
    this.guessed = [word[0]]; // la première lettre est offerte
    if (this.isFound()) return this.finish(true);
    this.ctx.setTimer(GUESS_MS, () => this.finish(false));
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (this.over) return;
    if (msg.action === 'word') {
      if (this.stage !== 'choose' || playerId !== this.chooserId) return;
      return this.setWord(validateWord(msg.word));
    }
    if (msg.action !== 'letter' || this.stage !== 'guess' || playerId !== this.guesserId) return;

    const letter = String(msg.letter || '').toUpperCase();
    if (!/^[A-Z]$/.test(letter) || this.guessed.includes(letter)) return;
    this.guessed.push(letter);
    if (this.word.includes(letter)) {
      if (this.isFound()) return this.finish(true);
    } else if (++this.errors >= MAX_ERRORS) {
      return this.finish(false);
    }
    this.ctx.broadcast();
  }

  isFound() {
    return [...this.word].every((letter) => this.guessed.includes(letter));
  }

  finish(found) {
    this.found = found;
    this.stage = 'done';
    this.end([found ? this.guesserId : this.chooserId]);
  }

  view(playerId) {
    const word = this.word || '';
    const showWord = this.over || playerId === this.chooserId; // le devineur ne reçoit jamais le mot
    return {
      stage: this.stage,
      chooserId: this.chooserId,
      guesserId: this.guesserId,
      suggestions: this.stage === 'choose' && playerId === this.chooserId ? this.suggestions : [],
      pattern: [...word].map((letter) => (this.guessed.includes(letter) ? letter : null)),
      word: showWord && word ? word : null,
      guessed: this.guessed,
      wrong: this.guessed.filter((letter) => !word.includes(letter)),
      errors: this.errors,
      maxErrors: MAX_ERRORS,
      auto: this.auto,
      found: this.found
    };
  }
}
