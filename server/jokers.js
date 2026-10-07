import { randomInt } from 'crypto';
import { itemLabel as label } from './foods.js';

// Jokers : chaque joueur en choisit quelques-uns en début de partie, chacun s'utilise une fois, quand il veut.
// target  : ingrédient à désigner dans son plat ("mine"), dans le plat adverse ("theirs") ou un de chaque ("swap")
// hostile : bloqué par le Bouclier de l'adversaire
// check() : raison pour laquelle le joker est inutilisable maintenant (null s'il est utilisable)
// apply() : effet du joker, renvoie la phrase annoncée aux deux joueurs ; peut refuser (GameError)
//           tant qu'il n'a rien modifié, le joker n'est alors pas consommé

const STEAL_RATIO = 0.2;
const SPY_COUNT = 3;
export const DRAFT_OFFER = 9; // jokers proposés à chaque partie, tirés parmi tous ceux qui existent

// Moments où l'on peut sortir un joker (pas pendant le choix des jokers ni le jugement)
const JOKER_PHASES = new Set(['intro', 'auction', 'auction_result', 'minigame_intro', 'minigame', 'minigame_result']);

const removeFrom = (plate, item) => plate.splice(plate.indexOf(item), 1);
// Un aliment mystère qui change de plat est découvert par son nouveau propriétaire
const giveTo = (player, item) => {
  player.plate.push(item);
  item.knownBy?.add(player.id);
};
const auctionsLeft = (room) => room.nextAuctionRound() <= room.totalRounds;

// Argent que l'on peut prendre à un joueur : s'il mène l'enchère en cours, son offre reste due
const freeMoney = (room, player) => player.budget - (room.auction?.leaderId === player.id ? room.auction.bid : 0);
const stealAmount = (room, opponent) => Math.min(Math.max(2, Math.round(opponent.startBudget * STEAL_RATIO)), freeMoney(room, opponent));

// Coupe-file : l'offre actuelle + 1 € (ou l'offre actuelle si on mène déjà)
const cutPrice = (auction, player) => (auction.leaderId === player.id ? auction.bid : auction.bid + 1);

export const JOKERS = [
  {
    id: 'chapardeur',
    emoji: '🫳',
    name: 'Chapardeur',
    description: 'Volez l\'ingrédient de votre choix dans le plat adverse.',
    target: 'theirs',
    hostile: true,
    check: (room, player, opponent) => (opponent.plate.length ? null : 'Le plat adverse est vide'),
    apply: (room, player, opponent, item) => {
      removeFrom(opponent.plate, item);
      giveTo(player, item);
      return `🫳 ${player.name} chaparde ${label(item)} dans le plat de ${opponent.name} !`;
    }
  },
  {
    id: 'pickpocket',
    emoji: '💰',
    name: 'Pickpocket',
    description: 'Volez 20 % du budget de départ dans le porte-monnaie adverse.',
    hostile: true,
    check: (room, player, opponent) => (stealAmount(room, opponent) > 0 ? null : `${opponent.name} n'a pas d'argent à voler`),
    detail: (room, player, opponent) => `Butin : ${Math.max(0, stealAmount(room, opponent))} €`,
    apply: (room, player, opponent) => {
      const amount = stealAmount(room, opponent);
      opponent.budget -= amount;
      player.budget += amount;
      return `💰 ${player.name} fait les poches de ${opponent.name} : ${amount} € volés !`;
    }
  },
  {
    id: 'cadeau',
    emoji: '🎁',
    name: 'Cadeau empoisonné',
    description: 'Refilez un ingrédient de votre plat dans le plat adverse.',
    target: 'mine',
    hostile: true,
    check: (room, player) => (player.plate.length ? null : 'Votre plat est vide'),
    apply: (room, player, opponent, item) => {
      removeFrom(player.plate, item);
      giveTo(opponent, item);
      return `🎁 ${player.name} refile ${label(item)} à ${opponent.name}. Cadeau !`;
    }
  },
  {
    id: 'poubelle',
    emoji: '🗑️',
    name: 'Poubelle',
    description: 'Jetez un ingrédient de votre plat qui gâche tout.',
    target: 'mine',
    check: (room, player) => (player.plate.length ? null : 'Votre plat est vide'),
    apply: (room, player, opponent, item) => {
      removeFrom(player.plate, item);
      return `🗑️ ${player.name} jette ${label(item)} à la poubelle`;
    }
  },
  {
    id: 'coupefile',
    emoji: '⚡',
    name: 'Coupe-file',
    description: 'Remportez immédiatement l\'aliment aux enchères, pour l\'offre actuelle + 1 €.',
    endsAuction: true,
    check: (room, player) => {
      if (room.phase !== 'auction' || !room.auction) return 'Seulement pendant une enchère';
      const price = cutPrice(room.auction, player);
      return price > player.budget ? `Il vous faut ${price} € pour couper la file` : null;
    },
    detail: (room, player) => (room.phase === 'auction' && room.auction ? `Prix : ${cutPrice(room.auction, player)} €` : null),
    apply: (room, player) => {
      const auction = room.auction;
      auction.bid = cutPrice(auction, player);
      auction.leaderId = player.id;
      return `⚡ ${player.name} coupe la file et rafle ${label(auction.item)} !`;
    }
  },
  {
    id: 'soldes',
    emoji: '🏷️',
    name: 'Soldes',
    description: 'Le prochain aliment que vous remportez est à moitié prix.',
    check: (room, player) => {
      if (player.discount) return 'Vos soldes sont déjà actives';
      return room.phase === 'auction' || auctionsLeft(room) ? null : 'Plus aucune enchère à venir';
    },
    apply: (room, player) => {
      player.discount = true;
      return `🏷️ ${player.name} sort sa carte de fidélité : prochain aliment à moitié prix !`;
    }
  },
  {
    id: 'espion',
    emoji: '👀',
    name: 'Espion',
    description: `Découvrez en secret les ${SPY_COUNT} prochains aliments mis aux enchères.`,
    check: (room) => (auctionsLeft(room) ? null : 'Plus aucun aliment à venir'),
    apply: (room, player) => {
      const from = room.nextAuctionRound();
      player.spy = { from, to: Math.min(room.totalRounds, from + SPY_COUNT - 1) };
      // À l'aveugle, l'espion perce aussi les aliments mystère
      for (let round = from; round <= player.spy.to; round++) room.items[round - 1].knownBy?.add(player.id);
      return `👀 ${player.name} jette un œil discret dans le garde-manger…`;
    }
  },
  {
    id: 'bouclier',
    emoji: '🛡️',
    name: 'Bouclier',
    description: 'Bloque le prochain joker que l\'adversaire lance contre vous (vol d\'ingrédient ou d\'argent, cadeau, troc).',
    check: (room, player) => (player.shield ? 'Votre bouclier est déjà levé' : null),
    apply: (room, player) => {
      player.shield = true;
      return `🛡️ ${player.name} lève son bouclier`;
    }
  },
  {
    id: 'minijeu',
    emoji: '🎮',
    name: 'Mini-jeu surprise',
    description: 'Lancez un mini-jeu bonus, juste après l\'enchère en cours.',
    check: (room) => (auctionsLeft(room) ? null : 'Trop tard : plus aucune enchère ensuite'),
    apply: (room, player) => {
      room.queueMinigame(player);
      return `🎮 ${player.name} lance un mini-jeu surprise !`;
    }
  },
  {
    id: 'troc',
    emoji: '🔄',
    name: 'Troc',
    description: 'Échangez de force un ingrédient de votre plat contre un ingrédient du plat adverse.',
    target: 'swap',
    hostile: true,
    check: (room, player, opponent) => {
      if (!player.plate.length) return 'Votre plat est vide';
      return opponent.plate.length ? null : 'Le plat adverse est vide';
    },
    apply: (room, player, opponent, mine, theirs) => {
      removeFrom(player.plate, mine);
      removeFrom(opponent.plate, theirs);
      giveTo(player, theirs);
      giveTo(opponent, mine);
      return `🔄 ${player.name} échange ${label(mine)} contre ${label(theirs)} avec ${opponent.name} !`;
    }
  },
  {
    id: 'pileouface',
    emoji: '🎲',
    name: 'Pile ou face',
    description: 'Pile : +50 % de votre argent disponible. Face : −50 %. Vous tentez ?',
    check: (room, player) => (freeMoney(room, player) >= 2 ? null : 'Il vous faut au moins 2 € disponibles'),
    detail: (room, player) => `Mise : ${Math.floor(freeMoney(room, player) / 2)} €`,
    apply: (room, player) => {
      const stake = Math.floor(freeMoney(room, player) / 2);
      if (randomInt(2)) {
        player.budget += stake;
        return `🎲 Pile ! ${player.name} gagne ${stake} € au jeu`;
      }
      player.budget -= stake;
      return `🎲 Face… ${player.name} perd ${stake} € au jeu`;
    }
  },
  {
    id: 'magie',
    emoji: '🪄',
    name: 'Tour de magie',
    description: 'Avant la première offre, faites disparaître l\'aliment aux enchères : un autre apparaît à sa place.',
    check: (room) => {
      if (room.phase !== 'auction' || !room.auction) return 'Seulement pendant une enchère';
      return room.auction.leaderId ? 'Seulement avant la première offre' : null;
    },
    apply: (room, player) => {
      const { old, fresh } = room.swapAuctionItem();
      return `🪄 ${player.name} fait disparaître ${label(old)}… et apparaître ${label(fresh)} !`;
    }
  }
];

export const JOKERS_BY_ID = Object.fromEntries(JOKERS.map((joker) => [joker.id, joker]));

export const publicJoker = ({ id, emoji, name, description, target, hostile }) => ({
  id,
  emoji,
  name,
  description,
  target: target || null,
  hostile: !!hostile
});

export const jokerBlockReason = (room, player, joker) => {
  if (!JOKER_PHASES.has(room.phase)) return 'Pas maintenant';
  const opponent = room.opponentOf(player);
  if (!opponent || opponent.left) return 'Aucun adversaire';
  return joker.check(room, player, opponent);
};

// Tirage au hasard parmi les jokers proposés, pour compléter une sélection inachevée à la fin du temps
export const completeJokers = (picked, count, offer, random) => {
  const result = [...picked];
  const pool = offer.filter((id) => !result.includes(id));
  while (result.length < count && pool.length) {
    result.push(pool.splice(random(pool.length), 1)[0]);
  }
  return result;
};
