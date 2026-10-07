// Modes de jeu choisis par l'hôte dans le salon (ou entre deux parties)
export const MODES = [
  {
    id: 'classic',
    emoji: '🍽️',
    name: 'Classique',
    description: 'Un aliment à la fois aux enchères, avec jokers et mini-jeux.'
  },
  {
    id: 'blind',
    emoji: '🙈',
    name: 'À l\'aveugle',
    description: 'Un ingrédient de départ chacun, et un aliment sur deux est mystère : on ne le découvre qu\'une fois payé.'
  },
  {
    id: 'market',
    emoji: '🛒',
    name: 'Supermarché étoilé',
    description: 'Tout est en rayon, en un seul exemplaire, et le plat reste secret. Remplissez votre chariot, puis composez et échangez.'
  },
  {
    id: 'stars',
    emoji: '⭐',
    name: 'Mode étoile',
    description: 'Une manche par mode tiré au sort : chaque manche gagnée rapporte une étoile, le premier à 3 l\'emporte.'
  }
];

export const MODES_BY_ID = Object.fromEntries(MODES.map((mode) => [mode.id, mode]));

// Mode étoile : étoiles à gagner, et modes possibles pour une manche
export const STAR_TARGET = 3;
export const SERIES_MODES = ['classic', 'blind', 'market'];
