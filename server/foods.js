import { randomInt } from 'crypto';

// Plat à composer (tiré au sort à chaque partie). "imageLead" sert au prompt d'image (en anglais).
export const THEMES = [
  { id: 'burger', name: 'Burger', emoji: '🍔', base: 'pain brioché', imageLead: 'a gourmet burger in a toasted brioche bun' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', base: 'pâte à pizza et sauce tomate', imageLead: 'a Neapolitan pizza on a tomato sauce base' },
  { id: 'sandwich', name: 'Sandwich', emoji: '🥖', base: 'baguette croustillante', imageLead: 'a French baguette sandwich' },
  { id: 'tacos', name: 'Tacos', emoji: '🌮', base: 'tortillas de maïs', imageLead: 'three tacos in soft corn tortillas' },
  { id: 'bowl', name: 'Poke bowl', emoji: '🥗', base: 'riz vinaigré', imageLead: 'a poke bowl with seasoned sushi rice' },
  { id: 'hotdog', name: 'Hot-dog', emoji: '🌭', base: 'pain à hot-dog', imageLead: 'a loaded hot dog in a soft bun' }
];

export const CATEGORY_LABELS = {
  proteine: 'Protéine',
  legume: 'Légume',
  fromage: 'Fromage',
  sauce: 'Sauce',
  extra: 'Extra',
  surprise: 'Surprise !'
};

const item = (id, name, emoji, en) => ({ id, name, emoji, en });

export const INGREDIENTS = {
  proteine: [
    item('steak', 'Steak haché', '🥩', 'a juicy beef patty'),
    item('poulet', 'Poulet croustillant', '🍗', 'crispy fried chicken'),
    item('bacon', 'Bacon grillé', '🥓', 'crispy bacon strips'),
    item('saumon', 'Saumon fumé', '🐟', 'smoked salmon'),
    item('crevettes', 'Crevettes', '🦐', 'grilled shrimp'),
    item('oeuf', 'Œuf au plat', '🍳', 'a fried egg'),
    item('falafel', 'Falafels', '🧆', 'falafel'),
    item('saucisse', 'Saucisse fumée', '🌭', 'smoked sausage'),
    item('jambon', 'Jambon cru', '🍖', 'cured ham'),
    item('thon', 'Thon mi-cuit', '🍣', 'seared tuna'),
    item('vegetal', 'Steak végétal', '🌱', 'a plant-based patty')
  ],
  legume: [
    item('salade', 'Salade', '🥬', 'crisp lettuce'),
    item('tomate', 'Tomate', '🍅', 'fresh tomato slices'),
    item('oignon', 'Oignons rouges', '🧅', 'red onion rings'),
    item('cornichon', 'Cornichons', '🥒', 'pickles'),
    item('avocat', 'Avocat', '🥑', 'sliced avocado'),
    item('champignon', 'Champignons poêlés', '🍄', 'sautéed mushrooms'),
    item('poivron', 'Poivrons grillés', '🫑', 'grilled bell peppers'),
    item('mais', 'Maïs', '🌽', 'sweet corn'),
    item('roquette', 'Roquette', '🌿', 'arugula'),
    item('jalapeno', 'Jalapeños', '🌶️', 'jalapeño slices'),
    item('concombre', 'Concombre', '🥒', 'cucumber slices'),
    item('olive', 'Olives noires', '🫒', 'black olives'),
    item('chou', 'Chou rouge', '🥬', 'shredded red cabbage')
  ],
  fromage: [
    item('cheddar', 'Cheddar fondu', '🧀', 'melted cheddar'),
    item('mozzarella', 'Mozzarella', '🧀', 'fresh mozzarella'),
    item('chevre', 'Chèvre', '🐐', 'goat cheese'),
    item('raclette', 'Raclette', '🫕', 'melted raclette cheese'),
    item('bleu', 'Bleu d\'Auvergne', '🧀', 'blue cheese'),
    item('parmesan', 'Parmesan', '🧀', 'shaved parmesan'),
    item('feta', 'Feta', '🧀', 'crumbled feta')
  ],
  sauce: [
    item('ketchup', 'Ketchup', '🍅', 'ketchup'),
    item('mayo', 'Mayonnaise', '🥚', 'mayonnaise'),
    item('moutarde', 'Moutarde', '🟡', 'mustard'),
    item('bbq', 'Sauce barbecue', '🔥', 'smoky barbecue sauce'),
    item('samourai', 'Sauce samouraï', '🌶️', 'spicy samurai sauce'),
    item('pesto', 'Pesto', '🌿', 'basil pesto'),
    item('guacamole', 'Guacamole', '🥑', 'guacamole'),
    item('blanche', 'Sauce blanche à l\'ail', '🥛', 'garlic yogurt sauce'),
    item('sriracha', 'Sriracha', '🌶️', 'sriracha sauce'),
    item('miel', 'Miel', '🍯', 'a honey drizzle')
  ],
  extra: [
    item('frites', 'Frites', '🍟', 'french fries'),
    item('oignonsfrits', 'Oignons frits', '🧅', 'crispy fried onions'),
    item('chips', 'Chips', '🥔', 'potato chips'),
    item('rosti', 'Galette de pommes de terre', '🥔', 'a hash brown'),
    item('ananas', 'Ananas grillé', '🍍', 'grilled pineapple'),
    item('truffe', 'Truffe noire', '✨', 'black truffle shavings'),
    item('foiegras', 'Foie gras', '🦆', 'seared foie gras'),
    item('sesame', 'Graines de sésame', '🌾', 'sesame seeds'),
    item('cacahuetes', 'Cacahuètes', '🥜', 'crushed peanuts')
  ],
  surprise: [
    item('chocolat', 'Chocolat fondu', '🍫', 'melted chocolate'),
    item('fraise', 'Fraises', '🍓', 'strawberries'),
    item('bonbons', 'Bonbons', '🍬', 'gummy candies'),
    item('tartiner', 'Pâte à tartiner', '🌰', 'chocolate hazelnut spread'),
    item('chantilly', 'Chantilly', '🍦', 'whipped cream'),
    item('banane', 'Banane', '🍌', 'banana slices'),
    item('anchois', 'Anchois', '🐟', 'anchovies'),
    item('wasabi', 'Wasabi', '🟢', 'wasabi'),
    item('popcorn', 'Pop-corn', '🍿', 'popcorn'),
    item('cereales', 'Céréales du petit-déj', '🥣', 'breakfast cereal'),
    item('marshmallow', 'Marshmallows', '☁️', 'marshmallows'),
    item('glace', 'Glace vanille', '🍨', 'vanilla ice cream')
  ]
};

// Répartition des 10 rounds : de quoi faire un vrai plat, plus un piège
const ROUND_TEMPLATE = ['proteine', 'proteine', 'legume', 'legume', 'legume', 'fromage', 'sauce', 'sauce', 'extra', 'surprise'];

const pick = (list) => list[randomInt(list.length)];

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const pickTheme = () => pick(THEMES);

export const buildRoundItems = (rounds) => {
  const categories = shuffle([...ROUND_TEMPLATE]);
  while (categories.length < rounds) categories.push(pick(Object.keys(INGREDIENTS)));

  const used = new Set();
  return categories.slice(0, rounds).map((category) => {
    const available = INGREDIENTS[category].filter((i) => !used.has(i.id));
    const chosen = pick(available.length ? available : INGREDIENTS[category]);
    used.add(chosen.id);
    return { ...chosen, category, categoryLabel: CATEGORY_LABELS[category] };
  });
};

// Ce qui est envoyé aux navigateurs (sans les champs internes)
export const publicItem = ({ id, name, emoji, category, categoryLabel }) => ({ id, name, emoji, category, categoryLabel });
export const publicTheme = (theme) => theme && { id: theme.id, name: theme.name, emoji: theme.emoji, base: theme.base };
