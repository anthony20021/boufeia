import { randomInt } from 'crypto';
import { config } from '../config.js';
import { ChopGame } from './chop.js';
import { MemoryGame } from './memory.js';
import { QuizGame } from './quiz.js';
import { HangmanGame } from './hangman.js';
import { ReflexGame } from './reflex.js';
import { AnagramGame } from './anagram.js';
import { IntrusGame } from './intrus.js';
import { AdditionGame } from './addition.js';

export { QUIZ_QUESTIONS, localQuestions, shuffleOptions } from './quiz.js';

const GAMES = [ChopGame, MemoryGame, QuizGame, HangmanGame, ReflexGame, AnagramGame, IntrusGame, AdditionGame];
const BY_ID = Object.fromEntries(GAMES.map((Game) => [Game.id, Game]));

// MINIGAMES dans le .env : sous-ensemble des jeux (ignoré s'il ne contient aucun jeu connu)
const enabledIds = () => {
  const ids = config.minigames.filter((id) => BY_ID[id]);
  return ids.length ? ids : GAMES.map((Game) => Game.id);
};

// Pour l'accueil : les jeux « secret » restent une surprise (seul leur nombre est donné)
export const minigameList = () => enabledIds().filter((id) => !BY_ID[id].secret).map((id) => ({ id, title: BY_ID[id].title, emoji: BY_ID[id].emoji }));
export const secretMinigameCount = () => enabledIds().filter((id) => BY_ID[id].secret).length;

export const getMinigame = (id) => BY_ID[id];

// Tirage au sort, en évitant si possible les jeux déjà joués dans la partie
export const pickMinigame = (played = []) => {
  const ids = enabledIds();
  const fresh = ids.filter((id) => !played.includes(id));
  const pool = fresh.length ? fresh : ids;
  return pool[randomInt(pool.length)];
};
