import { GameError } from './errors.js';
import { buildShelves, itemLabel, publicItem } from './foods.js';

export const MARKET_MAX_ITEMS = 15;
export const MARKET_BUDGET = [25, 40];
const SHOP_MS = 150000;
const COMPOSE_MS = 120000;
const TRADE_MS = 30000;

/**
 * « Supermarché étoilé » : pas d'enchères. Tous les ingrédients sont en rayon, en un exemplaire,
 * à prix aléatoire. Les joueurs remplissent leur chariot sans connaître le plat (phase "shop"),
 * puis le plat est révélé : chacun garde ce qu'il veut et peut proposer des échanges (phase "compose").
 */
export class Market {
  constructor(room) {
    this.room = room;
    this.shelves = buildShelves();
    this.byUid = new Map(this.shelves.map((item) => [item.uid, item]));
    this.trade = null;
    this.tradeSeq = 0;
    this.tradeTimer = null;
    this.lastTrade = null;
  }

  open() {
    const room = this.room;
    room.phase = 'shop';
    room.addLog(`🛒 Le supermarché ouvre : ${this.shelves.length} articles, ${MARKET_MAX_ITEMS} maximum par chariot`);
    room.setPhaseTimer(SHOP_MS, () => this.closeShop());
    room.broadcast();
  }

  handle(player, msg) {
    switch (msg.action) {
      case 'buy': return this.buy(player, String(msg.item || ''));
      case 'return': return this.putBack(player, String(msg.item || ''));
      case 'done': return this.finish(player);
      case 'toggle': return this.toggle(player, String(msg.item || ''));
      case 'propose': return this.propose(player, String(msg.give || ''), String(msg.take || ''));
      case 'accept': return this.accept(player);
      case 'decline': return this.closeTrade(player, 'declined');
      case 'cancel': return this.closeTrade(player, 'cancelled');
      default: throw new GameError('Action inconnue');
    }
  }

  // --- Courses (plat secret) ---

  checkShopping(player) {
    if (this.room.phase !== 'shop') throw new GameError('Le magasin est fermé');
    if (player.marketDone) throw new GameError('Vos courses sont terminées');
  }

  buy(player, uid) {
    this.checkShopping(player);
    const item = this.byUid.get(uid);
    if (!item) throw new GameError('Article introuvable');
    if (item.ownerId === player.id) return;
    if (item.ownerId) throw new GameError(`Trop tard : ${this.room.nameOf(item.ownerId)} l'a déjà pris`);
    if (player.cart.length >= MARKET_MAX_ITEMS) throw new GameError(`Chariot plein (${MARKET_MAX_ITEMS} articles maximum)`);
    if (item.price > player.budget) throw new GameError(`Budget insuffisant (${player.budget} €)`);
    item.ownerId = player.id;
    player.cart.push(item);
    player.budget -= item.price;
    this.room.broadcast();
  }

  // Article reposé en rayon : remboursé, de nouveau disponible pour tout le monde
  putBack(player, uid) {
    this.checkShopping(player);
    const item = this.byUid.get(uid);
    if (!item || item.ownerId !== player.id) return;
    item.ownerId = null;
    player.cart.splice(player.cart.indexOf(item), 1);
    player.budget += item.price;
    this.room.broadcast();
  }

  // « Terminer mes courses », puis « Valider mon plat »
  finish(player) {
    const room = this.room;
    if ((room.phase !== 'shop' && room.phase !== 'compose') || player.marketDone) return;
    if (this.trade && (this.trade.fromId === player.id || this.trade.toId === player.id)) this.closeTrade(null, 'cancelled', true);
    player.marketDone = true;
    room.addLog(room.phase === 'shop'
      ? `🧾 ${player.name} passe en caisse (${player.cart.length} article${player.cart.length > 1 ? 's' : ''})`
      : `🍽️ ${player.name} a dressé son plat`);
    if (room.players.every((p) => p.marketDone)) return room.phase === 'shop' ? this.closeShop() : this.closeKitchen();
    room.broadcast();
  }

  closeShop() {
    const room = this.room;
    if (room.phase !== 'shop') return;
    for (const p of room.players) {
      p.marketDone = false;
      p.selected = new Set(p.cart.map((item) => item.uid)); // tout est gardé par défaut
    }
    room.phase = 'compose';
    const reveal = `🎉 Le plat à préparer : ${room.theme.emoji} ${room.theme.name} !`;
    room.addLog(reveal);
    room.flashTo(room.players, reveal);
    room.setPhaseTimer(COMPOSE_MS, () => this.closeKitchen());
    room.broadcast();
  }

  // --- Composition du plat et échanges ---

  checkKitchen(player) {
    if (this.room.phase !== 'compose') throw new GameError('Le plat n\'est pas encore révélé');
    if (player.marketDone) throw new GameError('Votre plat est déjà validé');
  }

  toggle(player, uid) {
    this.checkKitchen(player);
    if (!player.cart.some((item) => item.uid === uid)) return;
    if (player.selected.has(uid)) player.selected.delete(uid);
    else player.selected.add(uid);
    this.room.broadcast();
  }

  propose(player, giveUid, takeUid) {
    const room = this.room;
    this.checkKitchen(player);
    const opponent = room.opponentOf(player);
    if (!opponent || opponent.left) throw new GameError('Aucun adversaire');
    if (this.trade) throw new GameError('Un échange est déjà en discussion');
    if (opponent.marketDone) throw new GameError(`${opponent.name} a déjà validé son plat`);
    const give = player.cart.find((item) => item.uid === giveUid);
    const take = opponent.cart.find((item) => item.uid === takeUid);
    if (!give || !take) throw new GameError('Choisissez un ingrédient de chaque côté');

    this.trade = { id: ++this.tradeSeq, fromId: player.id, toId: opponent.id, give, take };
    this.tradeTimer = setTimeout(() => this.closeTrade(null, 'expired'), TRADE_MS);
    room.addLog(`🔄 ${player.name} propose ${itemLabel(give)} contre ${itemLabel(take)}`);
    room.broadcast();
  }

  accept(player) {
    const room = this.room;
    const trade = this.trade;
    if (!trade || trade.toId !== player.id || room.phase !== 'compose') return;
    const from = room.players.find((p) => p.id === trade.fromId);
    // Chaque ingrédient change de chariot et entre dans le plat de son nouveau propriétaire
    from.cart.splice(from.cart.indexOf(trade.give), 1);
    player.cart.splice(player.cart.indexOf(trade.take), 1);
    from.cart.push(trade.take);
    player.cart.push(trade.give);
    from.selected.delete(trade.give.uid);
    player.selected.delete(trade.take.uid);
    from.selected.add(trade.take.uid);
    player.selected.add(trade.give.uid);
    trade.give.ownerId = player.id;
    trade.take.ownerId = from.id;
    room.addLog(`🤝 Échange conclu : ${itemLabel(trade.give)} ↔ ${itemLabel(trade.take)}`);
    this.closeTrade(null, 'accepted', true);
    room.broadcast();
  }

  // player : celui qui refuse (destinataire) ou annule (auteur) ; null pour l'expiration ou la clôture
  closeTrade(player, status, silent = false) {
    const trade = this.trade;
    if (!trade) return;
    if (player && status === 'declined' && trade.toId !== player.id) return;
    if (player && status === 'cancelled' && trade.fromId !== player.id) return;
    clearTimeout(this.tradeTimer);
    this.tradeTimer = null;
    this.trade = null;
    this.lastTrade = { id: trade.id, status, fromId: trade.fromId, toId: trade.toId };
    if (silent) return;
    if (status === 'declined') this.room.addLog(`🙅 ${player.name} refuse l'échange`);
    if (status === 'expired') this.room.addLog('⌛ Proposition d\'échange expirée');
    this.room.broadcast();
  }

  closeKitchen() {
    const room = this.room;
    if (room.phase !== 'compose') return;
    this.dispose();
    for (const p of room.players) p.plate = p.cart.filter((item) => p.selected.has(item.uid));
    room.startJudging();
  }

  dispose() {
    clearTimeout(this.tradeTimer);
    this.tradeTimer = null;
    this.trade = null;
  }

  view(player) {
    const room = this.room;
    const opponent = room.opponentOf(player);
    const show = (item) => ({ ...publicItem(item), price: item.price });
    return {
      maxItems: MARKET_MAX_ITEMS,
      // Les rayons ne sont utiles (et envoyés) que pendant les courses
      shelves: room.phase === 'shop'
        ? this.shelves.map((item) => ({ ...show(item), owner: item.ownerId ? (item.ownerId === player.id ? 'me' : 'them') : null }))
        : [],
      cart: player.cart.map(show),
      opponentCart: opponent ? opponent.cart.map(show) : [],
      selected: [...player.selected],
      done: room.players.filter((p) => p.marketDone).map((p) => p.id),
      trade: this.trade && {
        id: this.trade.id,
        fromId: this.trade.fromId,
        toId: this.trade.toId,
        give: show(this.trade.give),
        take: show(this.trade.take)
      },
      lastTrade: this.lastTrade
    };
  }
}
