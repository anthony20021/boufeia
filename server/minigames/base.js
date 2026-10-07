import { randomInt } from 'crypto';

export const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// « Crème brûlée » → « CREMEBRULEE » : comparaison sans accents, espaces ni tirets
export const normalizeWord = (text) => String(text ?? '')
  .toUpperCase()
  .replace(/Œ/g, 'OE')
  .replace(/Æ/g, 'AE')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^A-Z]/g, '');

// Minuteries internes d'un mini-jeu, toutes annulées d'un coup à la fin (ou si la partie s'arrête)
class Timers {
  constructor() {
    this.handles = new Set();
  }

  after(ms, callback) {
    const handle = setTimeout(() => {
      this.handles.delete(handle);
      callback();
    }, ms);
    this.handles.add(handle);
    return handle;
  }

  every(ms, callback) {
    const handle = setInterval(callback, ms);
    this.handles.add(handle);
    return handle;
  }

  clear() {
    for (const handle of this.handles) clearTimeout(handle); // clearTimeout arrête aussi les setInterval
    this.handles.clear();
  }
}

/**
 * Base des mini-jeux. La salle fournit `ctx` :
 *   players [{ id, name }], nameOf(id), broadcast(),
 *   setTimer(ms, callback) / clearTimer() : compte à rebours affiché aux joueurs (un seul à la fois),
 *   finish(winnerIds) : fin du jeu, les gagnants se partagent le bonus,
 *   quizQuestions(count) : questions du quiz (IA si prêtes, sinon banque locale).
 * Chaque jeu définit start(), handle(playerId, msg) et view(playerId) (ce que voit ce joueur).
 */
export class Minigame {
  constructor(ctx) {
    this.ctx = ctx;
    this.ids = ctx.players.map((p) => p.id);
    this.timers = new Timers();
    this.over = false;
  }

  other(playerId) {
    return this.ids.find((id) => id !== playerId);
  }

  zeroScores() {
    return Object.fromEntries(this.ids.map((id) => [id, 0]));
  }

  // Meilleur(s) score(s), personne si tout le monde est à 0
  leaders(scores) {
    const best = Math.max(...this.ids.map((id) => scores[id]));
    return best > 0 ? this.ids.filter((id) => scores[id] === best) : [];
  }

  end(winnerIds) {
    if (this.over) return;
    this.over = true;
    this.timers.clear();
    this.ctx.finish(winnerIds);
  }

  dispose() {
    this.over = true;
    this.timers.clear();
  }

  // Phrase affichée pendant l'annonce du jeu (rôles, premier joueur…)
  introNote() {
    return null;
  }
}
