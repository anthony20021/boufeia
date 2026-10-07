import { randomBytes, randomInt } from 'crypto';
import WebSocket from 'ws';
import { config } from './config.js';
import { GameError } from './errors.js';
import { pickTheme, buildRoundItems, pickReplacement, publicItem, publicTheme, shuffleItems, itemLabel } from './foods.js';
import { judgeDishes, generateDishImage, buildImagePrompt, generateQuizQuestions } from './ai.js';
import { JOKERS, JOKERS_BY_ID, DRAFT_OFFER, publicJoker, jokerBlockReason, completeJokers } from './jokers.js';
import { getMinigame, pickMinigame, QUIZ_QUESTIONS, localQuestions, shuffleOptions } from './minigames/index.js';
import { MODES, MODES_BY_ID, STAR_TARGET, SERIES_MODES } from './modes.js';
import { Market, MARKET_BUDGET } from './market.js';
import { Chifoumi } from './chifoumi.js';

export { GameError };

const MAX_PLAYERS = 2;
const DRAFT_MS = 60000;
const INTRO_MS = 6000;
const RESULT_PAUSE_MS = 3500;
const MINIGAME_INTRO_MS = 6000;
const MINIGAME_RESULT_MS = 5000;
const FLASH_MS = 5000;
const LOG_SIZE = 8;
const CHAT_HISTORY = 50;
const CHAT_MAX_LENGTH = 200;
const CHAT_MIN_INTERVAL_MS = 400;
const MYSTERY = { name: 'Ingrédient mystère', emoji: '❓', category: 'mystere', categoryLabel: 'Mystère', mystery: true };

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

// Tout ce qu'une nouvelle partie remet à zéro chez un joueur
const resetPlayer = (player, budget) => Object.assign(player, {
  startBudget: budget,
  budget,
  plate: [],
  cart: [],
  selected: new Set(),
  marketDone: false,
  jokers: [],
  draftPicks: [],
  draftReady: false,
  shield: false,
  discount: false,
  spy: null,
  rematch: false
});

export class Room {
  constructor(code, onDestroy) {
    this.code = code;
    this.onDestroy = onDestroy;
    this.players = [];
    this.hostId = null;
    this.phase = 'lobby';
    this.mode = 'classic'; // choisi dans le salon
    this.gameMode = null; // mode de la partie en cours (tiré au sort en mode étoile)
    this.series = null; // mode étoile : étoiles et manches jouées
    this.gameSeq = 0;
    this.totalRounds = config.totalRounds;
    this.minigameRound = config.minigameRound;
    this.round = 0;
    this.auctionDone = false;
    this.theme = null;
    this.lastThemeId = null;
    this.items = [];
    this.auction = null;
    this.lastResult = null;
    this.market = null;
    this.draftOffer = [];
    this.minigame = null;
    this.scheduledMinigame = null;
    this.pendingMinigames = [];
    this.playedMinigames = [];
    this.quizPrep = null;
    this.usedQuestions = new Set();
    this.results = null;
    this.images = {};
    this.imageStatus = {};
    this.abandonedReason = null;
    this.log = [];
    this.logSeq = 0;
    this.flashes = {};
    this.flashSeq = 0;
    this.chat = [];
    this.chatSeq = 0;
    this.chifoumi = new Chifoumi({
      broadcast: () => this.broadcast(),
      announce: (text, actorId) => this.announce(text, actorId)
    });
    this.timer = null;
    this.deadline = null;
    this.timerTotal = 0;
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
    const player = resetPlayer({
      id: randomBytes(8).toString('hex'),
      secret: randomBytes(16).toString('hex'),
      name,
      ws,
      connected: true,
      left: false,
      lastChatAt: 0
    }, 0);
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
    this.chifoumi.playerLeft(player);
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

  opponentOf(player) {
    return this.players.find((p) => p.id !== player.id) || null;
  }

  nameOf(playerId) {
    return this.players.find((p) => p.id === playerId)?.name || '?';
  }

  handle(player, msg) {
    this.touch();
    switch (msg.type) {
      case 'start': return this.start(player);
      case 'mode': return this.setMode(player, String(msg.mode || ''));
      case 'draft': return this.chooseJokers(player, msg.jokers, msg.ready === true);
      case 'bid': return this.bid(player, Number(msg.amount));
      case 'pass': return this.pass(player);
      case 'joker': return this.useJoker(player, String(msg.joker || ''), String(msg.target || ''), String(msg.target2 || ''));
      case 'mg': return this.minigameAction(player, msg);
      case 'market':
        if (!this.market) throw new GameError('Pas de supermarché dans ce mode');
        return this.market.handle(player, msg);
      case 'rematch': return this.voteRematch(player);
      case 'chat': return this.say(player, msg.text);
      case 'rps': return this.chifoumi.handle(player, this.opponentOf(player), msg);
      default: throw new GameError('Action inconnue');
    }
  }

  // --- Mode de jeu ---

  setMode(player, mode) {
    if (!MODES_BY_ID[mode]) throw new GameError('Mode de jeu inconnu');
    if (player.id !== this.hostId) throw new GameError('Seul l\'hôte choisit le mode de jeu');
    if (this.phase !== 'lobby' && this.phase !== 'results') throw new GameError('Le mode se choisit entre deux parties');
    if (this.mode === mode) return;
    this.mode = mode;
    this.series = null; // changer de mode abandonne la série d'étoiles en cours
    for (const p of this.players) p.rematch = false;
    this.addLog(`🎛️ Mode choisi : ${MODES_BY_ID[mode].emoji} ${MODES_BY_ID[mode].name}`);
    this.broadcast();
  }

  // Mode de la partie qui commence : en mode étoile, tiré au sort pour chaque manche
  nextGameMode() {
    if (this.mode !== 'stars') {
      this.series = null;
      return this.mode;
    }
    if (!this.series || this.series.winnerId) {
      this.series = {
        target: STAR_TARGET,
        manche: 0,
        stars: Object.fromEntries(this.players.map((p) => [p.id, 0])),
        history: [],
        winnerId: null
      };
    }
    this.series.manche++;
    const previous = this.series.history.at(-1)?.mode;
    const choices = SERIES_MODES.filter((mode) => mode !== previous);
    return choices[randomInt(choices.length)];
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
    const mode = this.nextGameMode();
    this.gameMode = mode;
    // Mode étoile : manches plus courtes, budget et mini-jeu ramenés à la même échelle
    const scale = this.series ? config.starRounds / config.totalRounds : 1;
    this.totalRounds = this.series ? config.starRounds : config.totalRounds;
    this.minigameRound = Math.min(this.totalRounds, Math.max(1, Math.round(config.minigameRound * scale)));
    this.theme = pickTheme(this.lastThemeId); // jamais deux fois le même plat d'affilée
    this.lastThemeId = this.theme.id;
    this.items = [];
    this.round = 0;
    this.auctionDone = false;
    this.auction = null;
    this.lastResult = null;
    this.market = null;
    this.draftOffer = [];
    this.minigame = null;
    this.scheduledMinigame = null;
    this.pendingMinigames = [];
    this.playedMinigames = [];
    this.quizPrep = null;
    this.results = null;
    this.images = {};
    this.imageStatus = {};
    this.abandonedReason = null;
    this.flashes = {};
    this.log = [];

    const startBudget = mode === 'market'
      ? randomInt(MARKET_BUDGET[0], MARKET_BUDGET[1] + 1)
      : Math.max(5, Math.round(randomInt(config.budgetMin, config.budgetMax + 1) * scale)); // même budget pour tous
    for (const p of this.players) resetPlayer(p, startBudget);

    if (this.series) this.addLog(`⭐ Manche ${this.series.manche} : ${MODES_BY_ID[mode].emoji} ${MODES_BY_ID[mode].name}`);
    if (mode === 'market') {
      this.addLog('🎲 Nouvelle partie : le plat est secret !');
      this.addLog(`💰 Budget de départ : ${startBudget} € chacun`);
      this.market = new Market(this);
      return this.market.open();
    }

    // Classique ou à l'aveugle : enchères, jokers et mini-jeux
    const starters = mode === 'blind' ? this.players.length : 0;
    const drawn = buildRoundItems(this.theme, this.totalRounds + starters);
    this.items = drawn.slice(0, this.totalRounds);
    if (mode === 'blind') {
      drawn.slice(this.totalRounds).forEach((item, index) => this.players[index].plate.push(item)); // ingrédient de départ
      this.items.forEach((item, index) => {
        if (index % 2 === 1) Object.assign(item, { hidden: true, knownBy: new Set() }); // rounds 2, 4, 6…
      });
    }
    this.scheduledMinigame = pickMinigame();
    // L'IA a jusqu'au mini-jeu pour écrire les questions
    if (getMinigame(this.scheduledMinigame).usesQuiz) this.prepareQuiz();
    this.addLog(`🎲 Nouvelle partie : ${this.theme.emoji} ${this.theme.name} !`);
    this.addLog(`💰 Budget de départ : ${startBudget} € chacun`);
    if (mode === 'blind') this.addLog('🙈 À l\'aveugle : un aliment sur deux est un mystère !');

    if (config.jokersPerPlayer > 0) {
      this.draftOffer = shuffleItems(JOKERS.map((joker) => joker.id)).slice(0, DRAFT_OFFER);
      this.phase = 'draft';
      this.setPhaseTimer(DRAFT_MS, () => this.finishDraft());
      return this.broadcast();
    }
    this.startIntro();
  }

  startIntro() {
    this.phase = 'intro';
    this.setPhaseTimer(INTRO_MS, () => this.step());
    this.broadcast();
  }

  // Enchaînement : mini-jeux surprise en attente, puis enchère du round, puis round suivant (ou jugement)
  step() {
    this.clearPhaseTimer();
    if (this.pendingMinigames.length) {
      if (this.nextAuctionRound() <= this.totalRounds) return this.startMinigame(this.pendingMinigames.shift());
      this.pendingMinigames = []; // plus aucune enchère : le bonus ne servirait à rien
    }
    if (this.round === 0 || this.auctionDone) {
      this.round++;
      this.auctionDone = false;
      if (this.round > this.totalRounds) {
        this.round = this.totalRounds;
        this.auctionDone = true;
        return this.startJudging();
      }
      if (this.round === this.minigameRound) return this.startMinigame({ type: this.scheduledMinigame, by: null });
    }
    this.startAuction();
  }

  // Numéro de la prochaine enchère qui n'a pas encore commencé
  nextAuctionRound() {
    return this.phase === 'auction' || this.auctionDone ? this.round + 1 : Math.max(1, this.round);
  }

  // Ce qui suit la phase en cours (libellés « Mini-jeu dans… », « Le chef arrive dans… »)
  upcoming() {
    const next = this.nextAuctionRound();
    if (next > this.totalRounds) return 'judging';
    if (this.pendingMinigames.length) return 'minigame';
    if (next === this.minigameRound && this.round < next) return 'minigame';
    return 'auction';
  }

  // --- Mode à l'aveugle : un aliment mystère reste caché à qui ne l'a pas acheté (tout est révélé au jugement) ---

  canSee(item, player) {
    return !item.hidden || item.knownBy.has(player.id) || this.phase === 'judging' || this.phase === 'results';
  }

  itemFor(item, player) {
    return this.canSee(item, player) ? publicItem(item) : { id: item.uid, ...MYSTERY };
  }

  // --- Choix des jokers ---

  // Sélection provisoire (envoyée à chaque clic, complétée au hasard si le temps s'écoule) ou validée
  chooseJokers(player, ids, ready) {
    if (this.phase !== 'draft') throw new GameError('Le choix des jokers est terminé');
    if (player.draftReady) throw new GameError('Vos jokers sont déjà validés');
    const count = config.jokersPerPlayer;
    const picks = Array.isArray(ids) ? [...new Set(ids.map(String))] : [];
    if (picks.some((id) => !this.draftOffer.includes(id))) throw new GameError('Ce joker n\'est pas proposé dans cette partie');
    if (picks.length > count) throw new GameError(`${count} jokers maximum`);
    if (ready && picks.length !== count) throw new GameError(`Choisissez ${count} jokers`);

    player.draftPicks = picks;
    if (!ready) return;
    player.draftReady = true;
    this.addLog(`🃏 ${player.name} a choisi ses jokers`);
    if (this.players.every((p) => p.draftReady)) return this.finishDraft();
    this.broadcast();
  }

  finishDraft() {
    if (this.phase !== 'draft') return;
    for (const p of this.players) {
      if (!p.draftReady) this.addLog(`🎲 Jokers de ${p.name} complétés au hasard`);
      p.jokers = completeJokers(p.draftPicks, config.jokersPerPlayer, this.draftOffer, randomInt).map((id) => ({ id, used: false }));
      p.draftReady = true;
    }
    this.startIntro();
  }

  // --- Jokers ---

  useJoker(player, jokerId, targetId, target2Id) {
    const joker = JOKERS_BY_ID[jokerId];
    const slot = player.jokers.find((j) => j.id === jokerId && !j.used);
    if (!joker || !slot) throw new GameError('Vous n\'avez pas (ou plus) ce joker');
    const reason = jokerBlockReason(this, player, joker);
    if (reason) throw new GameError(reason);

    const opponent = this.opponentOf(player);
    const mine = (uid) => player.plate.find((i) => i.uid === uid) || null;
    const theirs = (uid) => opponent.plate.find((i) => i.uid === uid) || null;
    let item = null;
    let item2 = null;
    if (joker.target === 'mine') item = mine(targetId);
    if (joker.target === 'theirs') item = theirs(targetId);
    if (joker.target === 'swap') {
      item = mine(targetId);
      item2 = theirs(target2Id);
    }
    if (joker.target && (!item || (joker.target === 'swap' && !item2))) throw new GameError('Choisissez un ingrédient');

    if (joker.hostile && opponent.shield) {
      slot.used = true;
      opponent.shield = false;
      this.announceJoker(`🛡️ Le bouclier de ${opponent.name} bloque le ${joker.name} de ${player.name} !`);
      return this.broadcast();
    }
    const text = joker.apply(this, player, opponent, item, item2); // peut refuser sans rien avoir changé
    slot.used = true;
    this.announceJoker(text);
    if (joker.endsAuction) return this.endAuction();
    if (!this.refreshAuction()) this.broadcast(); // un gain ou une perte d'argent change qui peut suivre
  }

  announceJoker(text) {
    this.addLog(text);
    this.flashTo(this.players, text);
  }

  // Bandeau affiché quelques secondes chez les joueurs concernés
  flashTo(players, text) {
    const flash = { id: ++this.flashSeq, text, at: Date.now() };
    for (const p of players) this.flashes[p.id] = flash;
  }

  queueMinigame(player) {
    const planned = [this.scheduledMinigame, ...this.playedMinigames, ...this.pendingMinigames.map((m) => m.type)];
    const type = pickMinigame(planned);
    this.pendingMinigames.push({ type, by: player.id });
    if (getMinigame(type).usesQuiz) this.prepareQuiz();
  }

  // Joker « Tour de magie » : un autre aliment du plat remplace celui aux enchères (mystère s'il l'était)
  swapAuctionItem() {
    const old = this.auction.item;
    const used = new Set([...this.items, ...this.players.flatMap((p) => p.plate)].map((i) => i.id));
    const fresh = pickReplacement(this.theme, used, old.category);
    if (!fresh) throw new GameError('Plus aucun aliment de rechange pour ce plat');
    if (old.hidden) Object.assign(fresh, { hidden: true, knownBy: new Set() });
    this.items[this.round - 1] = fresh;
    this.auction.item = fresh;
    return { old, fresh };
  }

  // Les prochains aliments révélés par l'Espion (seulement ceux qui ne sont pas encore passés)
  spyFor(player) {
    if (!player.spy) return [];
    const list = [];
    for (let round = Math.max(player.spy.from, this.nextAuctionRound()); round <= player.spy.to; round++) {
      list.push({ round, item: this.itemFor(this.items[round - 1], player) });
    }
    return list;
  }

  // --- Enchères ---

  startAuction() {
    const item = this.items[this.round - 1];
    this.clearPhaseTimer(); // enchère sans limite de temps
    this.phase = 'auction';
    this.lastResult = null;
    this.auction = { item, bid: 0, leaderId: null, passed: new Set(), broke: new Set() };
    this.addLog(`🛎️ Round ${this.round} : ${itemLabel(item)} aux enchères !`);
    if (this.refreshAuction()) return;
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
    if (!this.refreshAuction()) this.broadcast();
  }

  pass(player) {
    const auction = this.auction;
    if (this.phase !== 'auction' || !auction) throw new GameError('Aucune enchère en cours');
    if (auction.leaderId === player.id) throw new GameError('Vous menez l\'enchère, impossible de passer');
    if (auction.passed.has(player.id)) return;

    // Chaque aliment doit être pris par un joueur : si personne n'a misé, passer le laisse à l'adversaire
    if (auction.leaderId === null) {
      const other = this.opponentOf(player);
      if (!other) throw new GameError('Aucun adversaire');
      auction.passed.add(player.id);
      auction.leaderId = other.id;
      auction.bid = Math.min(1, other.budget);
      this.addLog(`🙅 ${player.name} passe : ${other.name} doit prendre l'aliment pour ${auction.bid} €`); // 0 € si l'adversaire est à sec
      return this.endAuction();
    }

    auction.passed.add(player.id);
    this.addLog(`🙅 ${player.name} passe`);
    if (!this.checkAuctionEnd()) this.broadcast();
  }

  // Qui n'a plus de quoi surenchérir passe d'office (et revient si un joker lui rend de l'argent)
  refreshAuction() {
    const auction = this.auction;
    if (this.phase !== 'auction' || !auction) return false;
    for (const p of this.players) {
      if (p.id === auction.leaderId) continue;
      const canFollow = p.budget > auction.bid;
      if (!canFollow && !auction.passed.has(p.id)) {
        auction.passed.add(p.id);
        auction.broke.add(p.id);
        if (auction.leaderId) this.addLog(`💸 ${p.name} ne peut pas suivre`);
      } else if (canFollow && auction.broke.has(p.id)) {
        auction.passed.delete(p.id);
        auction.broke.delete(p.id);
      }
    }
    return this.checkAuctionEnd();
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
    const item = auction.item;
    let price = auction.bid;
    const discounted = winner.discount && price > 0;
    if (discounted) {
      price = Math.floor(price / 2); // joker Soldes
      winner.discount = false;
    }
    winner.budget -= price;
    winner.plate.push(item);
    if (item.hidden) {
      item.knownBy.add(winner.id);
      this.flashTo([winner], `🔍 Mystère révélé : ${item.emoji} ${item.name} !`);
    }
    this.addLog(`✅ ${winner.name} remporte ${itemLabel(item)} pour ${price} €${discounted ? ` (soldes, au lieu de ${auction.bid} €)` : ''}`);
    this.lastResult = { item, winnerId: winner.id, price, fullPrice: auction.bid };
    this.auction = null;
    this.auctionDone = true;
    this.phase = 'auction_result';
    this.setPhaseTimer(RESULT_PAUSE_MS, () => this.step());
    this.broadcast();
  }

  // --- Mini-jeux (tirés au sort au round prévu, ou lancés par un joker) ---

  startMinigame({ type, by }) {
    this.clearPhaseTimer();
    this.minigame?.game.dispose();
    const Game = getMinigame(type);
    const bonus = Math.max(1, Math.round(randomInt(config.bonusMin, config.bonusMax + 1) * (this.totalRounds / config.totalRounds)));
    const minigame = { type, by, bonus, winnerIds: [], gain: 0, game: null };
    // Un jeu terminé (ou remplacé) ne peut plus toucher au chrono ni à la partie
    const live = () => this.minigame === minigame && this.phase === 'minigame' && !this.destroyed;
    minigame.game = new Game({
      players: this.players.map((p) => ({ id: p.id, name: p.name })),
      nameOf: (id) => this.nameOf(id),
      broadcast: () => live() && this.broadcast(),
      setTimer: (ms, callback) => live() && this.setPhaseTimer(ms, () => live() && callback()),
      clearTimer: () => live() && this.clearPhaseTimer(),
      finish: (winnerIds) => live() && this.finishMinigame(winnerIds),
      quizQuestions: (count) => this.takeQuizQuestions(count)
    });
    this.minigame = minigame;
    this.playedMinigames.push(type);
    this.phase = 'minigame_intro';

    const launcher = this.players.find((p) => p.id === by);
    this.addLog(launcher
      ? `🎮 Mini-jeu surprise de ${launcher.name} : ${Game.emoji} ${Game.title} (+${bonus} €)`
      : `🎮 Mini-jeu : ${Game.emoji} ${Game.title} ! Le gagnant empoche ${bonus} €`);
    this.setPhaseTimer(MINIGAME_INTRO_MS, () => this.runMinigame());
    this.broadcast();
  }

  runMinigame() {
    this.clearPhaseTimer();
    this.phase = 'minigame';
    this.minigame.game.start();
    this.broadcast();
  }

  minigameAction(player, msg) {
    if (this.phase !== 'minigame' || !this.minigame) return; // clic tardif : ignoré
    this.minigame.game.handle(player.id, msg);
  }

  finishMinigame(winnerIds) {
    const minigame = this.minigame;
    this.clearPhaseTimer();
    minigame.game.dispose();
    const winners = this.players.filter((p) => winnerIds.includes(p.id));
    const gain = winners.length > 1 ? Math.ceil(minigame.bonus / 2) : minigame.bonus;
    for (const w of winners) w.budget += gain;
    minigame.winnerIds = winners.map((w) => w.id);
    minigame.gain = winners.length ? gain : 0;

    if (winners.length === 1) this.addLog(`🏅 ${winners[0].name} gagne le mini-jeu (+${gain} €)`);
    else if (winners.length > 1) this.addLog(`🤝 Égalité au mini-jeu, +${gain} € chacun`);
    else this.addLog('😴 Personne ne remporte le mini-jeu');

    this.phase = 'minigame_result';
    this.setPhaseTimer(MINIGAME_RESULT_MS, () => this.step());
    this.broadcast();
  }

  // Questions du quiz demandées à l'IA dès que l'on sait qu'un quiz va être joué
  prepareQuiz() {
    if (this.quizPrep) return;
    const prep = { questions: null };
    this.quizPrep = prep;
    generateQuizQuestions({ theme: this.theme, count: QUIZ_QUESTIONS })
      .then((questions) => {
        prep.questions = questions;
      })
      .catch((error) => console.warn(`⚠️  Quiz IA indisponible, questions de secours : ${error.message}`));
  }

  // Questions de l'IA si elles sont prêtes, complétées par la banque locale
  takeQuizQuestions(count) {
    const ai = (this.quizPrep?.questions || []).slice(0, count);
    this.quizPrep = null;
    const questions = [...ai, ...localQuestions(count - ai.length, this.usedQuestions)];
    return { questions: questions.map(shuffleOptions), source: ai.length ? 'ia' : 'local' };
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
      plates: plates.map(({ label, player }) => ({ label, items: player.plate })),
      origin: this.gameMode === 'market' ? 'market' : 'auction'
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
    if (this.series) this.awardStar(winners);

    await this.generateImages(seq, winners); // diffuse aussitôt le verdict
  }

  // Mode étoile : le gagnant de la manche prend une étoile (aucune en cas d'égalité)
  awardStar(winners) {
    const series = this.series;
    const winnerId = winners.length === 1 ? winners[0].id : null;
    series.history.push({ manche: series.manche, mode: this.gameMode, theme: publicTheme(this.theme), winnerId });
    if (!winnerId) return this.addLog('🤝 Égalité : aucune étoile pour cette manche');
    const stars = ++series.stars[winnerId];
    this.addLog(`⭐ ${winners[0].name} gagne la manche (${stars}/${series.target})`);
    if (stars >= series.target) {
      series.winnerId = winnerId;
      this.addLog(`🌟 ${winners[0].name} remporte le mode étoile !`);
    }
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

  // --- Tchat (le texte est nettoyé ici ; le client l'affiche sans HTML) ---

  say(player, text) {
    const clean = String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LENGTH);
    if (!clean) return;
    const now = Date.now();
    if (now - player.lastChatAt < CHAT_MIN_INTERVAL_MS) throw new GameError('Doucement, vous écrivez trop vite');
    player.lastChatAt = now;
    this.pushChat({ id: ++this.chatSeq, playerId: player.id, name: player.name, text: clean });
  }

  // Message du jeu dans le tchat (chifoumi…) ; actorId : joueur à l'origine, qui ne le compte pas comme non lu
  announce(text, actorId = null) {
    this.pushChat({ id: ++this.chatSeq, system: true, playerId: actorId, text });
  }

  pushChat(message) {
    this.chat.push(message);
    if (this.chat.length > CHAT_HISTORY) this.chat.shift();
    for (const p of this.players) this.sendTo(p, { type: 'chat', message });
  }

  voteRematch(player) {
    if (this.phase !== 'results') throw new GameError('La partie n\'est pas terminée');
    if (this.players.some((p) => p.left)) throw new GameError('Votre adversaire a quitté la partie');
    player.rematch = true;
    if (this.players.every((p) => p.rematch && p.connected)) return this.startGame();
    this.addLog(this.series && !this.series.winnerId ? `▶️ ${player.name} est prêt pour la manche suivante` : `🔁 ${player.name} veut rejouer`);
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
    this.minigame?.game.dispose();
    this.market?.dispose();
  }

  isIdle(now, idleMs) {
    return this.players.every((p) => !p.connected) && now - this.lastActivity > idleMs;
  }

  destroy() {
    this.destroyed = true;
    this.clearTimers();
    this.chifoumi.dispose();
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
    this.sendTo(player, { type: 'chat_history', messages: this.chat });
  }

  broadcast() {
    if (this.destroyed) return;
    for (const p of this.players) this.sendTo(p, { type: 'state', state: this.stateFor(p) });
  }

  // Ce que voit un joueur : jamais les jokers de l'adversaire, ni ce que cachent un mini-jeu ou un aliment mystère
  stateFor(player) {
    const auction = this.auction;
    const minigame = this.phase.startsWith('minigame') ? this.minigame : null;
    const Game = minigame && getMinigame(minigame.type);
    const opponent = this.opponentOf(player);
    const flash = this.flashes[player.id];
    const betweenGames = this.phase === 'lobby' || this.phase === 'results';
    return {
      code: this.code,
      gameSeq: this.gameSeq,
      phase: this.phase,
      you: player.id,
      hostId: this.hostId,
      mode: this.mode,
      gameMode: this.gameMode,
      modes: betweenGames ? MODES : null,
      series: this.series,
      round: this.round,
      totalRounds: this.totalRounds,
      minigameRound: this.minigameRound,
      upcoming: this.upcoming(),
      // Supermarché : le plat reste secret pendant les courses
      theme: this.gameMode === 'market' && this.phase === 'shop' ? null : publicTheme(this.theme),
      timer: this.deadline ? { remainingMs: Math.max(0, this.deadline - Date.now()), totalMs: this.timerTotal } : null,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        left: p.left,
        budget: p.budget,
        startBudget: p.startBudget,
        plate: p.plate.map((item) => this.itemFor(item, player)),
        jokersLeft: p.jokers.filter((j) => !j.used).length,
        jokersTotal: p.jokers.length,
        shield: p.shield,
        discount: p.discount,
        rematch: p.rematch
      })),
      draft: this.phase === 'draft' ? {
        count: config.jokersPerPlayer,
        catalog: this.draftOffer.map((id) => publicJoker(JOKERS_BY_ID[id])),
        picks: player.draftPicks,
        ready: this.players.filter((p) => p.draftReady).map((p) => p.id)
      } : null,
      jokers: player.jokers.map((slot) => {
        const joker = JOKERS_BY_ID[slot.id];
        return {
          ...publicJoker(joker),
          used: slot.used,
          blocked: slot.used ? null : jokerBlockReason(this, player, joker),
          detail: !slot.used && opponent ? joker.detail?.(this, player, opponent) || null : null
        };
      }),
      spy: this.spyFor(player),
      auction: auction && {
        item: this.itemFor(auction.item, player),
        bid: auction.bid,
        leaderId: auction.leaderId,
        passed: [...auction.passed]
      },
      lastResult: this.lastResult && { ...this.lastResult, item: this.itemFor(this.lastResult.item, player) },
      market: this.market && (this.phase === 'shop' || this.phase === 'compose') ? this.market.view(player) : null,
      minigame: minigame && {
        type: minigame.type,
        title: Game.title,
        emoji: Game.emoji,
        rules: Game.rules,
        bonus: minigame.bonus,
        by: minigame.by,
        winnerIds: minigame.winnerIds,
        gain: minigame.gain,
        note: minigame.game.introNote(player.id),
        view: minigame.game.view(player.id)
      },
      flash: flash && Date.now() - flash.at < FLASH_MS ? { id: flash.id, text: flash.text } : null,
      results: this.results,
      imageStatus: this.imageStatus,
      abandonedReason: this.abandonedReason,
      log: this.log,
      rps: this.chifoumi.stateFor(player.id)
    };
  }
}
