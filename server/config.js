import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Chargé en premier par tous les modules serveur : le .env est à la racine du projet
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const int = (name, defaultValue, min, max) => {
  const value = parseInt(process.env[name], 10);
  if (!Number.isFinite(value)) return defaultValue;
  return Math.min(max, Math.max(min, value));
};

const list = (name) => String(process.env[name] || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);

const budgetMin = int('BUDGET_MIN', 15, 1, 1000);
const bonusMin = int('MINIGAME_BONUS_MIN', 5, 0, 1000);
const totalRounds = int('TOTAL_ROUNDS', 16, 1, 30);
const imageMode = String(process.env.IMAGE_MODE || 'both').trim();

export const config = {
  port: int('PORT', 3100, 1, 65535),
  host: process.env.HOST || '0.0.0.0',

  // API Ollama (ollama_api) : le token ne quitte jamais le serveur du jeu
  apiUrl: (process.env.API_URL || 'http://127.0.0.1:3000').replace(/\/+$/, ''),
  apiToken: process.env.API_TOKEN || '',
  judgeModel: (process.env.JUDGE_MODEL || '').trim(),
  judgeTimeoutMs: int('JUDGE_TIMEOUT_MS', 180000, 10000, 900000),
  imageMode: ['both', 'winner', 'none'].includes(imageMode) ? imageMode : 'both',
  imageSize: int('IMAGE_SIZE', 1024, 512, 1536),
  imageRequestTimeoutMs: int('IMAGE_REQUEST_TIMEOUT_MS', 600000, 30000, 1800000),

  // Règles du jeu
  budgetMin,
  budgetMax: int('BUDGET_MAX', 30, budgetMin, 1000),
  totalRounds,
  minigameRound: int('MINIGAME_ROUND', 7, 1, totalRounds),
  bonusMin,
  bonusMax: int('MINIGAME_BONUS_MAX', 10, bonusMin, 1000),
  // Mini-jeux tirés au sort (vide = tous) : chop, memory, quiz, hangman, reflex, anagram (+ les surprises)
  minigames: list('MINIGAMES'),
  // Jokers choisis par chaque joueur en début de partie (0 = pas de jokers)
  jokersPerPlayer: int('JOKERS_PER_PLAYER', 3, 0, 9),
  // Mode étoile : rounds d'enchères par manche (plus court qu'une partie normale)
  starRounds: int('STAR_ROUNDS', 8, 2, totalRounds)
};
