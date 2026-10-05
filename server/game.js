import { randomBytes, randomInt } from 'crypto';
import WebSocket from 'ws';
import { config } from './config.js';
import { pickTheme, buildRoundItems, publicItem, publicTheme } from './foods.js';
import { judgeDishes, generateDishImage, buildImagePrompt } from './ai.js';

const MAX_PLAYERS = 2;
const INTRO_MS = 6000;
const RESULT_PAUSE_MS = 3500;
const MINIGAME_INTRO_MS = 6000;
const MINIGAME_DURATION_MS = 8000;
const MINIGAME_RESULT_MS = 5000;
const MINIGAME_BROADCAST_MS = 200;
const CHOP_MIN_INTERVAL_MS = 50; // 20 coupes/s maximum (anti-script)
const LOG_SIZE = 8;

export class GameError extends Error {}

export const sanitizeName = (value) => {
  const name = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!name) throw new GameError('Choisissez un pseudo');
  return name;
};

// Remplace « le candidat A » par le pseudo dans les textes du juge
const LABEL_PATTERN = /\b(?:([Ll]e|[Ll]a|[Dd]u|[Aa]u)\s+)?(?:[Cc]andidat(?:e)?|[Jj]oueur(?:se)?|[Pp]articipant(?:e)?)\s+([AB])\b/g;
const withNames = (text, nameOf) => String(text || '').replace(LABEL_PATTERN, (match, article, label) => {
  const name = nameOf[label];
  if (!name) return match;
  const lower = (article || '').toLowerCase();
  if (lower === 'du') return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? `d'${name}` : `de ${name}`;
  if (lower === 'au') return `à ${name}`;
  return name;
});

export class Room {
  constructor(code, onDestroy) {
    this.code = code;
    this.onDestroy = onDestroy;
    this.players = [];
    this.hostId = null;
    this.phase = 'lobby';
    this.gameSeq = 0;
    this.round = 0;
    this.theme = null;
    this.items = [];
    this.auction = null;
    this.lastResult = null;
    this.minigame = null;
    this.results = null;
    this.images = {};
    this.imageStatus = {};
    this.abandonedReason = null;
    this.log = [];
    this.logSeq = 0;
    this.timer = null;
    this.deadline = null;
    this.timerTotal = 0;
    this.ticker = null;
    this.chopDirty = false;
    this.destroyed = false;
    this.lastActivity = Date.now();
  }

  // --- Joueurs et connexions ---

  addPlayer(name, ws) {
    if (this.phase !== 'lobby') throw new GameError('La partie a déjà commencé');
    // Dans le salon, une place tenue par un joueur déconnecté peut être reprise
    this.players = this.players.filter((p) => p.connected);
    if (!this.players.some((p) => p.id === this.hostId)) this.hostId = this.players[0]?.id || null;
    if (this.players.length >= MAX_PLAYERS) throw new GameError('Partie complète (2 joueurs maximum)');

    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      name = `${name.slice(0, 18)} 2`;
    }
    const player = {
      id: randomBytes(8).toString('hex'),
      secret: randomBytes(16).toString('hex'),
      name,
      ws,
      connected: true,
      left: false,
      budget: 0,
      startBudget: 0,
      plate: [],
      chops: 0,
      lastChopAt: 0,
      rematch: false
    };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    this.addLog(`👋 ${name} a rejoint la salle`);
    return player;
  }

  resume(playerId, secret, ws) {
    const player = this.players.find((p) => p.id === playerId && p.secret === secret && !p.left);
    if (!player) return null;
    if (player.ws && player.ws !== ws) {
      const previous = player.ws;
      previous.ctx = null;
      previous.close(4000, 'Session reprise ailleurs');
    }
    const wasConnected = player.connected;
    player.ws = ws;
    player.connected = true;
    this.touch();
    if (!wasConnected) this.addLog(`🔌 ${player.name} est de retour`);
    return player;
  }

  detach(player, ws) {
    if (player.ws !== ws) return; // ancienne connexion déjà remplacée
    player.ws = null;
    player.connected = false;
    this.touch();
    if (!player.left) this.addLog(`📴 ${player.name} s'est déconnecté`);
    this.broadcast();
  }

  leave(player) {
    this.touch();
    if (this.phase === 'lobby') {
      this.players = this.players.filter((p) => p !== player);
      if (!this.players.length) return this.onDestroy(this);
      if (this.hostId === player.id) this.hostId = this.players[0].id;
      this.addLog(`👋 ${player.name} a quitté la salle`);
      return this.broadcast();
    }

    player.left = true;
    player.connected = false;
    player.ws = null;
    player.rematch = false;
    this.addLog(`🚪 ${player.name} a quitté la partie`);
    if (this.players.every((p) => p.left)) return this.onDestroy(this);
    if (this.phase !== 'results' && this.phase !== 'abandoned') {
      this.abandon(`${player.name} a quitté la partie`);
    }
    this.broadcast();
  }

  handle(player, msg) {
    this.touch();
    switch (msg.type) {
      case 'start': return this.start(player);
      case 'bid': return this.bid(player, Number(msg.amount));
      case 'pass': return this.pass(player);
      case 'chop': return this.chop(player);
      case 'rematch': return this.voteRematch(player);
      default: throw new GameError('Action inconnue');
    }
  }

  // --- Déroulement de la partie ---

  start(player) {
    if (this.phase !== 'lobby') throw new GameError('La partie a déjà commencé');
    if (player.id !== this.hostId) throw new GameError('Seul l\'hôte peut lancer la partie');
    if (this.players.length < MAX_PLAYERS || !this.players.every((p) => p.connected)) {
      throw new GameError('Il faut deux joueurs connectés pour commencer');
    }
    this.startGame();
  }

  startGame() {
    this.clearTimers();
    this.gameSeq++;
    this.theme = pickTheme();
    this.items = buildRoundItems(this.theme, config.totalRounds);
    this.round = 0;
    this.auction = null;
    this.lastResult = null;
    this.minigame = null;
    this.results = null;
    this.images = {};
    this.imageStatus = {};
    this.abandonedReason = null;
    this.log = [];
    const startBudget = randomInt(config.budgetMin, config.budgetMax + 1); // même budget pour tous
    for (const p of this.players) {
      p.startBudget = startBudget;
      p.budget = startBudget;
      p.plate = [];
      p.chops = 0;
      p.rematch = false;
    }
    this.addLog(`🎲 Nouvelle partie : ${this.theme.emoji} ${this.theme.name} !`);
    this.addLog(`💰 Budget de départ : ${this.players[0].budget} € chacun`);
    this.phase = 'intro';
    this.setPhaseTimer(INTRO_MS, () => this.nextRound());
    this.broadcast();
  }

  nextRound() {
    this.round++;
    if (this.round > config.totalRounds) {
      this.round = config.totalRounds;
      return this.startJudging();
    }
    if (this.round === config.minigameRound && !this.minigame) return this.startMinigame();
    this.startAuction();
  }

  startAuction() {
    const item = this.items[this.round - 1];
    this.clearPhaseTimer(); // enchère sans limite de temps
    this.phase = 'auction';
    this.lastResult = null;
    this.auction = { item, bid: 0, leaderId: null, passed: new Set() };
    for (const p of this.players) {
      if (p.budget < 1) this.auction.passed.add(p.id);
    }
    this.addLog(`🛎️ Round ${this.round} : ${item.emoji} ${item.name} aux enchères !`);
    if (this.checkAuctionEnd()) return;
    this.broadcast(); // pas de chrono : l'enchère se termine quand les joueurs passent
  }

  bid(player, amount) {
    const auction = this.auction;
    if (this.phase !== 'auction' || !auction) throw new GameError('Aucune enchère en cours');
    if (auction.passed.has(player.id)) throw new GameError('Vous avez passé sur cet aliment');
    if (auction.leaderId === player.id) throw new GameError('Vous avez déjà la meilleure offre');
    if (!Number.isInteger(amount) || amount < 1) throw new GameError('Montant invalide (euros entiers)');
    if (amount <= auction.bid) {
      const leader = this.players.find((p) => p.id === auction.leaderId);
      throw new GameError(leader
        ? `Trop tard : ${leader.name} a déjà proposé ${auction.bid} €`
        : `Il faut proposer plus de ${auction.bid} €`);
    }
    if (amount > player.budget) throw new GameError(`Budget insuffisant (${player.budget} €)`);

    auction.bid = amount;
    auction.leaderId = player.id;
    this.addLog(`💶 ${player.name} : « Je prends pour ${amount} € ! »`);

    for (const other of this.players) {
      if (other !== player && !auction.passed.has(other.id) && other.budget <= amount) {
        auction.passed.add(other.id);
        this.addLog(`💸 ${other.name} ne peut pas suivre`);
      }
    }
    if (this.checkAuctionEnd()) return;
    this.broadcast();
  }

  pass(player) {
    const auction = this.auction;
    if (this.phase !== 'auction' || !auction) throw new GameError('Aucune enchère en cours');
    if (auction.leaderId === player.id) throw new GameError('Vous menez l\'enchère, impossible de passer');
    if (auction.passed.has(player.id)) return;

    // Chaque aliment doit être pris par un joueur : si personne n'a misé, passer le laisse à l'adversaire
    if (auction.leaderId === null) {
      const other = this.players.find((p) => p.id !== player.id);
      if (!other || auction.passed.has(other.id)) {
        throw new GameError('Vous devez prendre cet aliment (misez au moins 1 €)');
      }
      auction.passed.add(player.id);
      auction.leaderId = other.id;
      auction.bid = Math.min(1, other.budget);
      this.addLog(`🙅 ${player.name} passe : ${other.name} doit prendre l'aliment pour ${auction.bid} €`);
      return this.endAuction();
    }

    auction.passed.add(player.id);
    this.addLog(`🙅 ${player.name} passe`);
    if (!this.checkAuctionEnd()) this.broadcast();
  }

  // Fin anticipée : plus aucun joueur ne peut ou ne veut surenchérir
  checkAuctionEnd() {
    const auction = this.auction;
    const active = this.players.filter((p) => !auction.passed.has(p.id));
    if (active.length === 0 || (active.length === 1 && active[0].id === auction.leaderId)) {
      this.endAuction();
      return true;
    }
    return false;
  }

  endAuction() {
    this.clearPhaseTimer();
    const auction = this.auction;
    if (!auction) return;
    if (!auction.leaderId) {
      // Aucun joueur n'a pu miser (budgets à 0) : l'aliment est tiré au sort, gratuitement
      auction.leaderId = this.players[randomInt(this.players.length)].id;
      auction.bid = 0;
    }
    const winner = this.players.find((p) => p.id === auction.leaderId);
    winner.budget -= auction.bid;
    winner.plate.push(auction.item);
    this.addLog(`✅ ${winner.name} remporte ${auction.item.emoji} ${auction.item.name} pour ${auction.bid} €`);
    this.lastResult = { item: auction.item, winnerId: winner.id, price: auction.bid };
    this.auction = null;
    this.phase = 'auction_result';
    this.setPhaseTimer(RESULT_PAUSE_MS, () => this.nextRound());
    this.broadcast();
  }

  // --- Mini-jeu : « La Découpe Express » (le plus de coupes en 8 s) ---

  startMinigame() {
    this.phase = 'minigame_intro';
    this.minigame = {
      bonus: randomInt(config.bonusMin, config.bonusMax + 1),
      durationSeconds: MINIGAME_DURATION_MS / 1000,
      winnerIds: [],
      gain: 0
    };
    for (const p of this.players) {
      p.chops = 0;
      p.lastChopAt = 0;
    }
    this.addLog(`🔪 Mini-jeu ! Le gagnant empoche ${this.minigame.bonus} €`);
    this.setPhaseTimer(MINIGAME_INTRO_MS, () => this.runMinigame());
    this.broadcast();
  }

  runMinigame() {
    this.phase = 'minigame';
    this.setPhaseTimer(MINIGAME_DURATION_MS, () => this.endMinigame());
    this.ticker = setInterval(() => {
      if (this.chopDirty) {
        this.chopDirty = false;
        this.broadcast();
      }
    }, MINIGAME_BROADCAST_MS);
    this.broadcast();
  }

  chop(player) {
    if (this.phase !== 'minigame') return;
    const now = Date.now();
    if (now - player.lastChopAt < CHOP_MIN_INTERVAL_MS) return;
    player.lastChopAt = now;
    player.chops++;
    this.chopDirty = true;
  }

  endMinigame() {
    clearInterval(this.ticker);
    this.ticker = null;
    const best = Math.max(...this.players.map((p) => p.chops));
    const winners = best > 0 ? this.players.filter((p) => p.chops === best) : [];
    const gain = winners.length > 1 ? Math.ceil(this.minigame.bonus / 2) : this.minigame.bonus;
    for (const w of winners) w.budget += gain;
    this.minigame.winnerIds = winners.map((w) => w.id);
    this.minigame.gain = winners.length ? gain : 0;

    if (winners.length === 1) this.addLog(`🏅 ${winners[0].name} gagne le mini-jeu (+${gain} €)`);
    else if (winners.length > 1) this.addLog(`🤝 Égalité au mini-jeu, +${gain} € chacun`);
    else this.addLog('😴 Personne n\'a coupé de légume…');

    this.phase = 'minigame_result';
    this.setPhaseTimer(MINIGAME_RESULT_MS, () => this.startAuction());
    this.broadcast();
  }

  // --- Jugement et photos ---

  isCurrent(seq) {
    return !this.destroyed && seq === this.gameSeq && (this.phase === 'judging' || this.phase === 'results');
  }

  async startJudging() {
    this.clearTimers();
    this.phase = 'judging';
    this.auction = null;
    this.lastResult = null;
    const seq = this.gameSeq;
    this.addLog('👨‍🍳 Le chef goûte les plats…');
    this.broadcast();

    const plates = this.players.map((player, index) => ({ label: index === 0 ? 'A' : 'B', player }));
    const verdict = await judgeDishes({
      theme: this.theme,
      plates: plates.map(({ label, player }) => ({ label, items: player.plate }))
    });
    if (!this.isCurrent(seq)) return;

    const nameOf = Object.fromEntries(plates.map(({ label, player }) => [label, player.name]));
    const idOf = Object.fromEntries(plates.map(({ label, player }) => [label, player.id]));
    this.results = {
      judge: verdict.source,
      notice: verdict.notice || null,
      verdict: withNames(verdict.verdict, nameOf),
      winnerIds: verdict.winners.map((label) => idOf[label]),
      dishes: Object.fromEntries(plates.map(({ label, player }) => {
        const dish = verdict.dishes[label];
        return [player.id, { name: withNames(dish.name, nameOf), score: dish.score, comment: withNames(dish.comment, nameOf) }];
      }))
    };
    this.phase = 'results';
    const winners = this.players.filter((p) => this.results.winnerIds.includes(p.id));
    this.addLog(winners.length > 1 ? '🤝 Égalité !' : `🏆 ${winners[0].name} remporte la partie !`);

    await this.generateImages(seq, winners);
  }

  async generateImages(seq, winners) {
    let targets = [];
    if (config.imageMode === 'winner') targets = winners;
    if (config.imageMode === 'both') targets = [...winners, ...this.players.filter((p) => !winners.includes(p))];

    for (const p of this.players) {
      this.imageStatus[p.id] = { status: targets.includes(p) ? 'queued' : 'skipped' };
    }
    this.broadcast();

    for (const player of targets) {
      this.imageStatus[player.id] = { status: 'pending' };
      this.broadcast();
      try {
        const image = await generateDishImage(buildImagePrompt(this.theme, player.plate));
        if (!this.isCurrent(seq)) return;
        this.images[player.id] = image;
        this.imageStatus[player.id] = { status: 'done' };
        for (const p of this.players) this.sendImage(p, player.id);
        console.log(`📸 Photo du plat de la salle ${this.code} prête`);
      } catch (error) {
        if (!this.isCurrent(seq)) return;
        this.imageStatus[player.id] = { status: 'error', message: error.message };
        console.warn(`⚠️  Photo impossible (salle ${this.code}) : ${error.message}`);
      }
      this.broadcast();
    }
  }

  voteRematch(player) {
    if (this.phase !== 'results') throw new GameError('La partie n\'est pas terminée');
    if (this.players.some((p) => p.left)) throw new GameError('Votre adversaire a quitté la partie');
    player.rematch = true;
    if (this.players.every((p) => p.rematch && p.connected)) return this.startGame();
    this.addLog(`🔁 ${player.name} veut rejouer`);
    this.broadcast();
  }

  abandon(reason) {
    this.clearTimers();
    this.phase = 'abandoned';
    this.abandonedReason = reason;
    this.auction = null;
  }

  // --- Outils ---

  touch() {
    this.lastActivity = Date.now();
  }

  addLog(text) {
    this.log.push({ id: ++this.logSeq, text });
    if (this.log.length > LOG_SIZE) this.log.shift();
  }

  setPhaseTimer(ms, callback) {
    clearTimeout(this.timer);
    this.deadline = Date.now() + ms;
    this.timerTotal = ms;
    this.timer = setTimeout(callback, ms);
  }

  clearPhaseTimer() {
    clearTimeout(this.timer);
    this.timer = null;
    this.deadline = null;
    this.timerTotal = 0;
  }

  clearTimers() {
    this.clearPhaseTimer();
    clearInterval(this.ticker);
    this.ticker = null;
  }

  isIdle(now, idleMs) {
    return this.players.every((p) => !p.connected) && now - this.lastActivity > idleMs;
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
  }

  sendTo(player, payload) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(payload));
    }
  }

  sendImage(player, ownerId) {
    if (this.images[ownerId]) {
      this.sendTo(player, { type: 'image', gameSeq: this.gameSeq, playerId: ownerId, image: this.images[ownerId] });
    }
  }

  // État complet + photos déjà prêtes (connexion ou reconnexion)
  sendFullState(player) {
    this.sendTo(player, { type: 'state', state: this.stateFor(player) });
    for (const ownerId of Object.keys(this.images)) this.sendImage(player, ownerId);
  }

  broadcast() {
    if (this.destroyed) return;
    for (const p of this.players) this.sendTo(p, { type: 'state', state: this.stateFor(p) });
  }

  stateFor(player) {
    const auction = this.auction;
    return {
      code: this.code,
      gameSeq: this.gameSeq,
      phase: this.phase,
      you: player.id,
      hostId: this.hostId,
      round: this.round,
      totalRounds: config.totalRounds,
      minigameRound: config.minigameRound,
      theme: publicTheme(this.theme),
      timer: this.deadline ? { remainingMs: Math.max(0, this.deadline - Date.now()), totalMs: this.timerTotal } : null,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        left: p.left,
        budget: p.budget,
        startBudget: p.startBudget,
        plate: p.plate.map(publicItem),
        chops: p.chops,
        rematch: p.rematch
      })),
      auction: auction && {
        item: publicItem(auction.item),
        bid: auction.bid,
        leaderId: auction.leaderId,
        passed: [...auction.passed]
      },
      lastResult: this.lastResult && { ...this.lastResult, item: publicItem(this.lastResult.item) },
      minigame: this.minigame,
      results: this.results,
      imageStatus: this.imageStatus,
      abandonedReason: this.abandonedReason,
      log: this.log
    };
  }
}
