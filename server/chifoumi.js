import { GameError } from './errors.js';

const MOVES = {
  rock: { name: 'Pierre', emoji: '✊', beats: 'scissors' },
  paper: { name: 'Feuille', emoji: '✋', beats: 'rock' },
  scissors: { name: 'Ciseaux', emoji: '✌️', beats: 'paper' }
};
const INVITE_MS = 30000;
const CHOOSE_MS = 15000;
const COUNTDOWN_MS = 3000;
const COOLDOWN_MS = 3000;
const ACTIVE = new Set(['pending', 'choosing', 'countdown']);

const moveLabel = (move) => `${MOVES[move].emoji} ${MOVES[move].name}`;

// Chifoumi lancé depuis le tchat : défi → acceptation → choix secrets → « 1, 2, 3 » → résultat.
// Indépendant de la partie : on peut jouer dans le salon, pendant les enchères ou après le verdict.
export class Chifoumi {
  constructor({ broadcast, announce }) {
    this.broadcast = broadcast;
    this.announce = announce; // message système dans le tchat
    this.match = null;
    this.seq = 0;
    this.timer = null;
    this.deadline = null;
    this.total = 0;
    this.lastChallengeAt = new Map();
  }

  get active() {
    return !!this.match && ACTIVE.has(this.match.status);
  }

  handle(player, opponent, msg) {
    switch (msg.action) {
      case 'challenge': return this.challenge(player, opponent);
      case 'accept': return this.accept(player);
      case 'decline': return this.decline(player);
      case 'cancel': return this.cancel(player);
      case 'choose': return this.choose(player, String(msg.move || ''));
      default: throw new GameError('Action inconnue');
    }
  }

  challenge(player, opponent) {
    if (!opponent || opponent.left || !opponent.connected) throw new GameError('Votre adversaire n\'est pas là');
    if (this.active) throw new GameError('Un chifoumi est déjà en cours');
    const now = Date.now();
    if (now - (this.lastChallengeAt.get(player.id) || 0) < COOLDOWN_MS) throw new GameError('Doucement, un défi à la fois');
    this.lastChallengeAt.set(player.id, now);

    this.match = { id: ++this.seq, from: player, to: opponent, status: 'pending', moves: {}, winnerId: null, forfeit: false };
    this.setTimer(INVITE_MS, () => this.close('expired'));
    this.announce(`✊ ${player.name} défie ${opponent.name} au chifoumi !`, player.id);
    this.broadcast();
  }

  accept(player) {
    const match = this.match;
    if (!this.active || match.status !== 'pending' || match.to !== player) return;
    match.status = 'choosing';
    this.setTimer(CHOOSE_MS, () => this.timeout());
    this.broadcast();
  }

  decline(player) {
    const match = this.match;
    if (!this.active || match.status !== 'pending' || match.to !== player) return;
    this.announce(`🙅 ${player.name} refuse le chifoumi`, player.id);
    this.close('declined');
  }

  cancel(player) {
    const match = this.match;
    if (!this.active || match.status !== 'pending' || match.from !== player) return;
    this.close('cancelled');
  }

  choose(player, move) {
    const match = this.match;
    if (!this.active || match.status !== 'choosing' || (match.from !== player && match.to !== player)) return;
    if (!MOVES[move] || match.moves[player.id]) return; // choix définitif
    match.moves[player.id] = move;
    if (match.moves[match.from.id] && match.moves[match.to.id]) {
      match.status = 'countdown'; // « 1, 2, 3 » puis on montre les mains
      this.setTimer(COUNTDOWN_MS, () => this.reveal());
    }
    this.broadcast();
  }

  // Temps écoulé : celui qui a joué gagne par forfait, sinon le défi tombe à l'eau
  timeout() {
    const match = this.match;
    const played = [match.from, match.to].filter((p) => match.moves[p.id]);
    if (played.length !== 1) {
      this.announce('⌛ Chifoumi annulé : personne n\'a joué', null);
      return this.close('expired');
    }
    const [winner] = played;
    const loser = winner === match.from ? match.to : match.from;
    match.winnerId = winner.id;
    match.forfeit = true;
    this.announce(`⌛ ${loser.name} n'a pas joué à temps : ${winner.name} gagne le chifoumi`, null);
    this.close('done');
  }

  reveal() {
    const match = this.match;
    const a = match.moves[match.from.id];
    const b = match.moves[match.to.id];
    const winner = a === b ? null : MOVES[a].beats === b ? match.from : match.to;
    match.winnerId = winner?.id || null;
    const outcome = winner ? `${winner.name} gagne !` : 'égalité !';
    this.announce(`✊ Chifoumi : ${match.from.name} ${moveLabel(a)} contre ${moveLabel(b)} ${match.to.name}, ${outcome}`, null);
    this.close('done');
  }

  close(status) {
    clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
    this.match.status = status;
    this.broadcast();
  }

  setTimer(ms, callback) {
    clearTimeout(this.timer);
    this.deadline = Date.now() + ms;
    this.total = ms;
    this.timer = setTimeout(callback, ms);
  }

  playerLeft(player) {
    if (this.active && (this.match.from === player || this.match.to === player)) this.close('cancelled');
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  // Les choix restent secrets jusqu'à la révélation
  stateFor(playerId) {
    const match = this.match;
    if (!match) return null;
    const opponentId = match.from.id === playerId ? match.to.id : match.from.id;
    return {
      id: match.id,
      fromId: match.from.id,
      toId: match.to.id,
      status: match.status,
      timer: this.active && this.deadline ? { remainingMs: Math.max(0, this.deadline - Date.now()), totalMs: this.total } : null,
      myMove: match.moves[playerId] || null,
      opponentReady: !!match.moves[opponentId],
      moves: match.status === 'done' ? match.moves : null,
      winnerId: match.winnerId,
      forfeit: match.forfeit
    };
  }
}
