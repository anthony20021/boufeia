import { randomBytes, randomInt } from 'crypto';

// Un plat est tiré au sort à chaque partie, avec son propre catalogue d'ingrédients.
// "base" : ce que chaque joueur a d'office. "imageLead" : début du prompt d'image (en anglais).
// "possessive" : pour les phrases de l'interface ("dans sa pizza").
// "minMeat" : viandes garanties parmi les aliments mis en jeu (2 par défaut si le plat en propose).

export const CATEGORY_LABELS = {
  base: 'Base',
  viande: 'Viande',
  poisson: 'Poisson',
  fromage: 'Fromage',
  sauce: 'Sauce',
  legume: 'Légume',
  feculent: 'Féculent',
  fruit: 'Fruit',
  sucre: 'Gourmandise',
  boisson: 'Boisson',
  autre: 'Autre'
};

const slug = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// [nom affiché, emoji, description anglaise pour la photo]
const ing = (name, emoji, en) => ({ id: slug(name), name, emoji, en });

export const THEMES = [
  {
    id: 'burger',
    name: 'Burger',
    emoji: '🍔',
    possessive: 'son burger',
    base: 'pain brioché',
    imageLead: 'a gourmet burger in a toasted brioche bun',
    ingredients: {
      viande: [
        ing('Steak haché', '🥩', 'a juicy beef patty'),
        ing('Poulet pané', '🍗', 'a crispy breaded chicken fillet'),
        ing('Bacon', '🥓', 'crispy bacon strips'),
        ing('Double smash', '🥩', 'a double smashed beef patty'),
        ing('Effiloché de porc', '🐖', 'pulled pork'),
        ing('Steak végétal', '🌱', 'a plant-based patty')
      ],
      poisson: [
        ing('Poisson pané', '🐟', 'a crispy breaded fish fillet'),
        ing('Crevettes panées', '🍤', 'crispy breaded shrimp')
      ],
      fromage: [
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Fromage de chèvre', '🐐', 'goat cheese'),
        ing('Camembert', '🧀', 'melted camembert'),
        ing('Raclette', '🫕', 'melted raclette cheese'),
        ing('Bleu', '🧀', 'blue cheese')
      ],
      sauce: [
        ing('Sauce Biggy', '🥫', 'creamy burger sauce'),
        ing('Sauce BBQ', '🔥', 'smoky barbecue sauce'),
        ing('Sauce fromagère', '🧀', 'cheese sauce'),
        ing('Sauce algérienne', '🌶️', 'spicy Algerian sauce'),
        ing('Sauce mangue fruit de la passion', '🥭', 'mango passion fruit sauce'),
        ing('Sauce samouraï', '🌶️', 'spicy samurai sauce'),
        ing('Mayonnaise', '🥚', 'mayonnaise'),
        ing('Ketchup', '🍅', 'ketchup')
      ],
      legume: [
        ing('Tomate', '🍅', 'fresh tomato slices'),
        ing('Salade', '🥬', 'crisp lettuce'),
        ing('Oignon caramélisé', '🧅', 'caramelized onions'),
        ing('Oignons frits', '🧅', 'crispy fried onions'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Poivron', '🫑', 'grilled bell pepper'),
        ing('Avocat', '🥑', 'sliced avocado'),
        ing('Champignons poêlés', '🍄', 'sautéed mushrooms'),
        ing('Jalapeños', '🌶️', 'jalapeño slices'),
        ing('Roquette', '🌿', 'arugula')
      ],
      feculent: [
        ing('Rösti', '🥔', 'a golden hash brown'),
        ing('Frites', '🍟', 'a few french fries'),
        ing('Potatoes', '🥔', 'potato wedges')
      ],
      fruit: [
        ing('Ananas grillé', '🍍', 'grilled pineapple'),
        ing('Confiture de figues', '🍯', 'fig jam')
      ],
      autre: [
        ing('Œuf au plat', '🍳', 'a fried egg'),
        ing('Miel', '🍯', 'a honey drizzle')
      ]
    }
  },
  {
    id: 'tacos',
    name: 'French tacos',
    emoji: '🌮',
    possessive: 'son french tacos',
    base: 'galette de tortilla',
    imageLead: 'a French-style tacos, a grilled tortilla wrap',
    ingredients: {
      viande: [
        ing('Viande hachée', '🥩', 'seasoned ground beef'),
        ing('Tenders', '🍗', 'crispy chicken tenders'),
        ing('Cordon bleu', '🍗', 'a breaded cordon bleu'),
        ing('Nuggets', '🍗', 'chicken nuggets'),
        ing('Viande kebab', '🥙', 'sliced kebab meat'),
        ing('Merguez', '🌭', 'grilled merguez sausage'),
        ing('Poulet mariné', '🍗', 'marinated grilled chicken')
      ],
      poisson: [
        ing('Crevettes', '🦐', 'grilled shrimp'),
        ing('Poisson pané', '🐟', 'crispy breaded fish')
      ],
      fromage: [
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Fromage à raclette', '🫕', 'melted raclette cheese'),
        ing('Mozzarella', '🧀', 'stretchy melted mozzarella')
      ],
      sauce: [
        ing('Sauce fromagère', '🧀', 'cheese sauce'),
        ing('Sauce BBQ', '🔥', 'barbecue sauce'),
        ing('Sauce burger', '🍔', 'burger sauce'),
        ing('Sauce curry', '🍛', 'curry sauce'),
        ing('Sauce blanche', '🥛', 'white garlic sauce'),
        ing('Sauce algérienne', '🌶️', 'spicy Algerian sauce'),
        ing('Harissa', '🌶️', 'harissa'),
        ing('Guacamole', '🥑', 'guacamole')
      ],
      legume: [
        ing('Tomate', '🍅', 'diced tomato'),
        ing('Salade', '🥬', 'shredded lettuce'),
        ing('Oignon', '🧅', 'sliced onion'),
        ing('Poivron', '🫑', 'bell pepper strips'),
        ing('Carottes', '🥕', 'grated carrots'),
        ing('Petits pois', '🫛', 'green peas'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Jalapeños', '🌶️', 'jalapeño slices'),
        ing('Haricots rouges', '🫘', 'red beans')
      ],
      feculent: [
        ing('Frites', '🍟', 'french fries stuffed inside'),
        ing('Rösti', '🥔', 'a hash brown'),
        ing('Riz', '🍚', 'seasoned rice')
      ],
      autre: [
        ing('Œuf', '🍳', 'a fried egg'),
        ing('Coriandre', '🌿', 'fresh cilantro')
      ]
    }
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    emoji: '🥖',
    possessive: 'son sandwich',
    base: 'pain basique',
    imageLead: 'a big deli sandwich',
    ingredients: {
      base: [
        ing('Pain de mie', '🍞', 'on sliced sandwich bread'),
        ing('Baguette blanche', '🥖', 'on a crusty white baguette'),
        ing('Pain complet', '🍞', 'on whole-grain bread'),
        ing('Pain ciabatta', '🥪', 'on a ciabatta roll')
      ],
      viande: [
        ing('Jambon', '🍖', 'sliced ham'),
        ing('Jambon de Bayonne', '🍖', 'thin slices of Bayonne ham'),
        ing('Blanc de poulet', '🍗', 'sliced chicken breast'),
        ing('Blanc de dinde', '🦃', 'sliced turkey breast'),
        ing('Steak haché', '🥩', 'a beef patty'),
        ing('Ventrèche', '🥓', 'grilled pork belly slices'),
        ing('Chipolata', '🌭', 'a grilled chipolata sausage'),
        ing('Saucisson', '🍖', 'sliced dry sausage'),
        ing('Bacon', '🥓', 'crispy bacon'),
        ing('Pastrami', '🥩', 'thick slices of pastrami')
      ],
      poisson: [
        ing('Thon', '🐟', 'flaked tuna'),
        ing('Poisson pané', '🐟', 'a crispy breaded fish fillet'),
        ing('Saumon fumé', '🍣', 'smoked salmon')
      ],
      fromage: [
        ing('Burrata', '🧀', 'creamy burrata'),
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Cheddar', '🧀', 'cheddar slices'),
        ing('Emmental', '🧀', 'emmental slices'),
        ing('Brie', '🧀', 'brie slices')
      ],
      sauce: [
        ing('Sauce Biggy', '🥫', 'creamy sauce'),
        ing('Moutarde', '🟡', 'mustard'),
        ing('Ketchup', '🍅', 'ketchup'),
        ing('Mayonnaise', '🥚', 'mayonnaise'),
        ing('Pesto vert', '🌿', 'green basil pesto'),
        ing('Pesto rouge', '🍅', 'red sun-dried tomato pesto'),
        ing('Houmous', '🫘', 'hummus')
      ],
      legume: [
        ing('Cornichons', '🥒', 'pickles'),
        ing('Salade', '🥬', 'crisp lettuce'),
        ing('Tomate', '🍅', 'tomato slices'),
        ing('Oignon', '🧅', 'thin onion rings'),
        ing('Poivrons', '🫑', 'roasted bell peppers'),
        ing('Champignons', '🍄', 'sliced mushrooms'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Betterave', '🟣', 'beetroot slices'),
        ing('Chou', '🥬', 'shredded cabbage'),
        ing('Avocat', '🥑', 'sliced avocado'),
        ing('Concombre', '🥒', 'cucumber slices')
      ],
      feculent: [
        ing('Frites', '🍟', 'french fries tucked inside'),
        ing('Chips', '🥔', 'potato chips')
      ],
      fruit: [
        ing('Pomme', '🍎', 'thin apple slices'),
        ing('Figue', '🟣', 'fresh fig slices')
      ],
      autre: [
        ing('Pâte à tartiner', '🌰', 'chocolate hazelnut spread'),
        ing('Œuf dur', '🥚', 'sliced hard-boiled egg'),
        ing('Beurre', '🧈', 'butter')
      ]
    }
  },
  {
    id: 'salade',
    name: 'Salade',
    emoji: '🥗',
    possessive: 'sa salade',
    base: 'un grand bol',
    imageLead: 'a big colorful composed salad in a bowl',
    ingredients: {
      viande: [
        ing('Blanc de poulet', '🍗', 'sliced grilled chicken breast'),
        ing('Tenders', '🍗', 'crispy chicken tenders'),
        ing('Jambon', '🍖', 'strips of ham'),
        ing('Lardons', '🥓', 'crispy bacon bits'),
        ing('Magret fumé', '🦆', 'thin slices of smoked duck breast'),
        ing('Gésiers', '🍖', 'confit gizzards')
      ],
      poisson: [
        ing('Thon', '🐟', 'flaked tuna'),
        ing('Moules', '🦪', 'cooked mussels'),
        ing('Saumon fumé', '🍣', 'smoked salmon'),
        ing('Crevettes', '🦐', 'shrimp')
      ],
      fromage: [
        ing('Burrata', '🧀', 'creamy burrata'),
        ing('Mozzarella', '🧀', 'mozzarella pearls'),
        ing('Emmental', '🧀', 'emmental cubes'),
        ing('Parmesan', '🧀', 'shaved parmesan'),
        ing('Cheddar', '🧀', 'cheddar cubes'),
        ing('Feta', '🧀', 'crumbled feta'),
        ing('Chèvre chaud', '🐐', 'warm goat cheese toast')
      ],
      sauce: [
        ing('Vinaigrette', '🫒', 'a light vinaigrette'),
        ing('Balsamique', '🍇', 'balsamic glaze'),
        ing('Ketchup', '🍅', 'a swirl of ketchup'),
        ing('Sauce césar', '🥛', 'creamy caesar dressing'),
        ing('Pesto', '🌿', 'basil pesto')
      ],
      legume: [
        ing('Salade', '🥬', 'fresh lettuce leaves'),
        ing('Tomate', '🍅', 'cherry tomatoes'),
        ing('Oignon', '🧅', 'red onion slices'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Poivrons', '🫑', 'bell pepper strips'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Oignons frits', '🧅', 'crispy fried onions'),
        ing('Aubergines', '🍆', 'grilled eggplant'),
        ing('Chou', '🥬', 'shredded red cabbage'),
        ing('Courgette', '🥒', 'grilled zucchini'),
        ing('Concombre', '🥒', 'cucumber slices'),
        ing('Avocat', '🥑', 'sliced avocado'),
        ing('Radis', '🌸', 'radish slices'),
        ing('Olives', '🫒', 'black olives')
      ],
      feculent: [
        ing('Pâtes', '🍝', 'cold pasta'),
        ing('Quinoa', '🌾', 'quinoa'),
        ing('Croûtons', '🍞', 'golden croutons'),
        ing('Pommes de terre', '🥔', 'boiled potato cubes')
      ],
      fruit: [
        ing('Ananas', '🍍', 'pineapple chunks'),
        ing('Fraises', '🍓', 'sliced strawberries'),
        ing('Pomme', '🍎', 'apple slices'),
        ing('Raisins', '🍇', 'grapes')
      ],
      autre: [
        ing('Œuf dur', '🥚', 'a halved boiled egg'),
        ing('Noix', '🌰', 'walnuts'),
        ing('Graines de sésame', '🌾', 'sesame seeds')
      ]
    }
  },
  {
    id: 'pizza',
    name: 'Pizza',
    emoji: '🍕',
    possessive: 'sa pizza',
    base: 'pâte à pizza nature',
    imageLead: 'a rustic pizza',
    ingredients: {
      base: [
        ing('Base crème', '🥛', 'on a creamy white base'),
        ing('Base tomate', '🍅', 'on a tomato sauce base')
      ],
      viande: [
        ing('Poulet', '🍗', 'grilled chicken pieces'),
        ing('Kebab', '🥙', 'sliced kebab meat'),
        ing('Ventrèche', '🥓', 'pork belly slices'),
        ing('Viande hachée', '🥩', 'ground beef'),
        ing('Lardons', '🥓', 'bacon bits'),
        ing('Merguez', '🌭', 'merguez sausage slices'),
        ing('Boudin', '🍖', 'black pudding slices'),
        ing('Chorizo', '🌶️', 'chorizo slices'),
        ing('Jambon', '🍖', 'ham slices'),
        ing('Magret fumé', '🦆', 'smoked duck breast slices'),
        ing('Pepperoni', '🍕', 'pepperoni slices')
      ],
      poisson: [
        ing('Saumon', '🍣', 'smoked salmon'),
        ing('Caviar', '⚫', 'a spoonful of caviar'),
        ing('Thon', '🐟', 'tuna'),
        ing('Anchois', '🐟', 'anchovies'),
        ing('Crevettes', '🦐', 'shrimp')
      ],
      fromage: [
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Parmesan', '🧀', 'shaved parmesan'),
        ing('Emmental', '🧀', 'melted emmental'),
        ing('Burrata', '🧀', 'creamy burrata'),
        ing('Bleu', '🧀', 'blue cheese'),
        ing('Raclette', '🫕', 'melted raclette cheese'),
        ing('Mozzarella', '🧀', 'stretchy mozzarella'),
        ing('Gorgonzola', '🧀', 'gorgonzola')
      ],
      sauce: [
        ing('Sauce pimentée', '🌶️', 'a drizzle of chili sauce'),
        ing('Pesto', '🌿', 'basil pesto'),
        ing('Sauce BBQ', '🔥', 'barbecue sauce'),
        ing('Huile pimentée', '🌶️', 'chili oil')
      ],
      legume: [
        ing('Oignon caramélisé', '🧅', 'caramelized onions'),
        ing('Poivrons', '🫑', 'bell pepper strips'),
        ing('Tomate', '🍅', 'tomato slices'),
        ing('Carotte', '🥕', 'carrot slices'),
        ing('Cornichon', '🥒', 'pickle slices'),
        ing('Olives', '🫒', 'black olives'),
        ing('Champignons', '🍄', 'sliced mushrooms'),
        ing('Roquette', '🌿', 'fresh arugula'),
        ing('Courgette', '🥒', 'zucchini slices'),
        ing('Artichauts', '🌿', 'artichoke hearts')
      ],
      feculent: [
        ing('Patate', '🥔', 'thin potato slices'),
        ing('Gnocchis', '🥟', 'gnocchi')
      ],
      fruit: [
        ing('Ananas', '🍍', 'pineapple chunks'),
        ing('Framboises', '🍓', 'fresh raspberries'),
        ing('Figues', '🟣', 'fig slices'),
        ing('Poire', '🍐', 'pear slices')
      ],
      autre: [
        ing('Miel', '🍯', 'a honey drizzle'),
        ing('Œuf', '🍳', 'a baked egg'),
        ing('Noix', '🌰', 'walnuts'),
        ing('Chocolat', '🍫', 'melted chocolate')
      ]
    }
  },
  {
    id: 'pates',
    name: 'Pâtes',
    emoji: '🍝',
    possessive: 'ses pâtes',
    base: 'pâtes nature',
    imageLead: 'a generous plate of pasta',
    ingredients: {
      base: [
        ing('Spaghettis', '🍝', 'spaghetti'),
        ing('Tagliatelles', '🍝', 'fresh tagliatelle'),
        ing('Penne', '🍝', 'penne pasta'),
        ing('Coquillettes', '🍝', 'elbow macaroni'),
        ing('Tortellinis', '🥟', 'stuffed tortellini'),
        ing('Gnocchis', '🥟', 'potato gnocchi')
      ],
      viande: [
        ing('Lardons', '🥓', 'crispy bacon bits'),
        ing('Jambon', '🍖', 'strips of ham'),
        ing('Poulet', '🍗', 'grilled chicken strips'),
        ing('Boulettes de bœuf', '🧆', 'beef meatballs'),
        ing('Chorizo', '🌶️', 'chorizo slices'),
        ing('Saucisse italienne', '🌭', 'sliced Italian sausage'),
        ing('Viande hachée', '🥩', 'a rich ground beef ragù'),
        ing('Pancetta', '🥓', 'crispy pancetta'),
        ing('Magret fumé', '🦆', 'smoked duck breast slices')
      ],
      poisson: [
        ing('Saumon', '🍣', 'chunks of salmon'),
        ing('Thon', '🐟', 'flaked tuna'),
        ing('Crevettes', '🦐', 'shrimp'),
        ing('Moules', '🦪', 'steamed mussels'),
        ing('Anchois', '🐟', 'anchovies')
      ],
      fromage: [
        ing('Parmesan', '🧀', 'grated parmesan'),
        ing('Mozzarella', '🧀', 'melted mozzarella'),
        ing('Emmental râpé', '🧀', 'grated emmental'),
        ing('Chèvre', '🐐', 'goat cheese crumbles'),
        ing('Gorgonzola', '🧀', 'creamy gorgonzola'),
        ing('Burrata', '🧀', 'creamy burrata'),
        ing('Mascarpone', '🥛', 'a dollop of mascarpone')
      ],
      sauce: [
        ing('Sauce tomate', '🍅', 'tomato sauce'),
        ing('Crème fraîche', '🥛', 'a creamy sauce'),
        ing('Sauce carbonara', '🥚', 'creamy carbonara sauce'),
        ing('Pesto vert', '🌿', 'green basil pesto'),
        ing('Pesto rouge', '🍅', 'red sun-dried tomato pesto'),
        ing('Sauce arrabbiata', '🌶️', 'spicy arrabbiata sauce'),
        ing('Sauce quatre fromages', '🧀', 'rich four-cheese sauce'),
        ing('Huile d\'olive pimentée', '🫒', 'chili olive oil')
      ],
      legume: [
        ing('Champignons', '🍄', 'sautéed mushrooms'),
        ing('Oignon', '🧅', 'sautéed onions'),
        ing('Poivrons', '🫑', 'roasted bell peppers'),
        ing('Courgette', '🥒', 'zucchini slices'),
        ing('Tomates cerises', '🍅', 'cherry tomatoes'),
        ing('Épinards', '🥬', 'wilted spinach'),
        ing('Olives', '🫒', 'black olives'),
        ing('Aubergines', '🍆', 'grilled eggplant'),
        ing('Brocoli', '🥦', 'broccoli florets'),
        ing('Basilic', '🌿', 'fresh basil leaves')
      ],
      feculent: [
        ing('Pain à l\'ail', '🍞', 'garlic bread on the side'),
        ing('Croûtons', '🍞', 'golden croutons')
      ],
      autre: [
        ing('Jaune d\'œuf', '🥚', 'a raw egg yolk on top'),
        ing('Miel', '🍯', 'a honey drizzle'),
        ing('Noix', '🌰', 'walnuts'),
        ing('Poivre noir', '⚫', 'cracked black pepper')
      ]
    }
  },
  {
    id: 'tasty-crousty',
    name: 'Tasty Crousty',
    emoji: '🍚',
    possessive: 'son tasty crousty',
    base: 'galette de riz croustillante',
    imageLead: 'a Tasty Crousty, a golden crispy fried rice-cake sandwich with two crunchy rice buns',
    ingredients: {
      viande: [
        ing('Poulet pané', '🍗', 'a crispy breaded chicken fillet'),
        ing('Steak haché', '🥩', 'a beef patty'),
        ing('Bacon', '🥓', 'crispy bacon strips'),
        ing('Tenders', '🍗', 'crispy chicken tenders'),
        ing('Nuggets', '🍗', 'chicken nuggets'),
        ing('Viande kebab', '🥙', 'sliced kebab meat'),
        ing('Cordon bleu', '🍗', 'a breaded cordon bleu'),
        ing('Merguez', '🌭', 'grilled merguez sausage')
      ],
      poisson: [
        ing('Poisson pané', '🐟', 'a crispy breaded fish fillet'),
        ing('Crevettes panées', '🍤', 'crispy breaded shrimp')
      ],
      fromage: [
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Raclette', '🫕', 'melted raclette cheese'),
        ing('Mozzarella', '🧀', 'stretchy mozzarella'),
        ing('Fromage fondu', '🧀', 'oozing melted cheese')
      ],
      sauce: [
        ing('Sauce algérienne', '🌶️', 'spicy Algerian sauce'),
        ing('Sauce samouraï', '🌶️', 'spicy samurai sauce'),
        ing('Sauce blanche', '🥛', 'white garlic sauce'),
        ing('Sauce BBQ', '🔥', 'barbecue sauce'),
        ing('Sauce curry', '🍛', 'curry sauce'),
        ing('Sauce Biggy', '🥫', 'creamy burger sauce'),
        ing('Sauce fromagère', '🧀', 'cheese sauce')
      ],
      legume: [
        ing('Salade', '🥬', 'crisp lettuce'),
        ing('Tomate', '🍅', 'tomato slices'),
        ing('Oignons frits', '🧅', 'crispy fried onions'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Poivron', '🫑', 'bell pepper strips'),
        ing('Carottes', '🥕', 'grated carrots'),
        ing('Jalapeños', '🌶️', 'jalapeño slices')
      ],
      feculent: [
        ing('Frites', '🍟', 'french fries'),
        ing('Rösti', '🥔', 'a hash brown')
      ],
      fruit: [
        ing('Ananas grillé', '🍍', 'grilled pineapple')
      ],
      autre: [
        ing('Œuf au plat', '🍳', 'a fried egg'),
        ing('Miel', '🍯', 'a honey drizzle')
      ]
    }
  },
  {
    id: 'tarte',
    name: 'Tarte salée',
    emoji: '🥧',
    possessive: 'sa tarte',
    base: 'pâte brisée nature',
    imageLead: 'a golden savory tart',
    ingredients: {
      base: [
        ing('Pâte brisée', '🥧', 'on a golden shortcrust pastry'),
        ing('Pâte feuilletée', '🥐', 'on a flaky puff pastry'),
        ing('Pâte à la moutarde', '🟡', 'on a mustard-brushed pastry crust')
      ],
      viande: [
        ing('Lardons', '🥓', 'smoked bacon bits'),
        ing('Jambon', '🍖', 'diced ham'),
        ing('Poulet', '🍗', 'chicken pieces'),
        ing('Chorizo', '🌶️', 'chorizo slices'),
        ing('Saucisse de Morteau', '🌭', 'smoked Morteau sausage slices'),
        ing('Magret fumé', '🦆', 'smoked duck breast slices'),
        ing('Jambon de Bayonne', '🍖', 'thin slices of Bayonne ham')
      ],
      poisson: [
        ing('Saumon', '🍣', 'flaked salmon'),
        ing('Thon', '🐟', 'flaked tuna'),
        ing('Saint-Jacques', '🦪', 'seared scallops'),
        ing('Crevettes', '🦐', 'shrimp')
      ],
      fromage: [
        ing('Chèvre', '🐐', 'goat cheese rounds'),
        ing('Emmental', '🧀', 'melted emmental'),
        ing('Comté', '🧀', 'grated comté'),
        ing('Roquefort', '🧀', 'crumbled roquefort'),
        ing('Mozzarella', '🧀', 'mozzarella'),
        ing('Brie', '🧀', 'brie slices'),
        ing('Maroilles', '🧀', 'strong maroilles cheese'),
        ing('Reblochon', '🫕', 'melted reblochon')
      ],
      sauce: [
        ing('Appareil à quiche', '🥚', 'a creamy egg custard filling'),
        ing('Crème fraîche', '🥛', 'a creamy filling'),
        ing('Moutarde à l\'ancienne', '🟡', 'whole-grain mustard'),
        ing('Pesto', '🌿', 'basil pesto'),
        ing('Sauce tomate', '🍅', 'tomato sauce')
      ],
      legume: [
        ing('Poireaux', '🥬', 'sautéed leeks'),
        ing('Oignons', '🧅', 'caramelized onions'),
        ing('Tomates', '🍅', 'tomato slices'),
        ing('Courgette', '🥒', 'zucchini slices'),
        ing('Champignons', '🍄', 'sliced mushrooms'),
        ing('Épinards', '🥬', 'wilted spinach'),
        ing('Poivrons', '🫑', 'roasted bell peppers'),
        ing('Olives', '🫒', 'black olives'),
        ing('Asperges', '🌱', 'asparagus tips'),
        ing('Brocoli', '🥦', 'broccoli florets')
      ],
      feculent: [
        ing('Pommes de terre', '🥔', 'thin potato slices')
      ],
      fruit: [
        ing('Figues', '🟣', 'fig slices'),
        ing('Poire', '🍐', 'pear slices'),
        ing('Pomme', '🍎', 'apple slices')
      ],
      autre: [
        ing('Œuf', '🍳', 'a baked egg'),
        ing('Noix', '🌰', 'walnuts'),
        ing('Miel', '🍯', 'a honey drizzle'),
        ing('Herbes de Provence', '🌿', 'herbes de Provence'),
        ing('Pignons de pin', '🌰', 'toasted pine nuts')
      ]
    }
  },
  {
    id: 'kebab',
    name: 'Kebab',
    emoji: '🥙',
    possessive: 'son kebab',
    base: 'pain kebab',
    imageLead: 'a stuffed kebab sandwich in warm flatbread',
    ingredients: {
      base: [
        ing('Pain kebab', '🥙', 'in a warm kebab bread'),
        ing('Galette', '🫓', 'in a folded flatbread galette'),
        ing('Pain pita', '🫓', 'in a pita pocket'),
        ing('Pain turc', '🥖', 'in a Turkish bread')
      ],
      viande: [
        ing('Viande kebab', '🥙', 'carved kebab meat'),
        ing('Poulet kebab', '🍗', 'sliced rotisserie chicken'),
        ing('Agneau', '🍖', 'tender sliced lamb'),
        ing('Steak haché', '🥩', 'a grilled beef patty'),
        ing('Merguez', '🌭', 'grilled merguez sausage'),
        ing('Brochette de poulet', '🍢', 'chicken skewer pieces'),
        ing('Köfte', '🧆', 'grilled köfte meatballs'),
        ing('Falafels', '🧆', 'crispy falafel')
      ],
      fromage: [
        ing('Feta', '🧀', 'crumbled feta'),
        ing('Mozzarella', '🧀', 'melted mozzarella'),
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Fromage fondu', '🧀', 'oozing melted cheese')
      ],
      sauce: [
        ing('Sauce blanche', '🥛', 'white garlic yogurt sauce'),
        ing('Sauce algérienne', '🌶️', 'spicy Algerian sauce'),
        ing('Sauce samouraï', '🌶️', 'spicy samurai sauce'),
        ing('Harissa', '🌶️', 'harissa'),
        ing('Ketchup', '🍅', 'ketchup'),
        ing('Mayonnaise', '🥚', 'mayonnaise'),
        ing('Sauce yaourt-menthe', '🌿', 'mint yogurt sauce'),
        ing('Houmous', '🫘', 'hummus')
      ],
      legume: [
        ing('Salade', '🥬', 'shredded lettuce'),
        ing('Tomate', '🍅', 'tomato slices'),
        ing('Oignon', '🧅', 'sliced onion'),
        ing('Chou rouge', '🥬', 'shredded red cabbage'),
        ing('Concombre', '🥒', 'cucumber slices'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Poivrons', '🫑', 'grilled bell peppers'),
        ing('Carottes', '🥕', 'grated carrots'),
        ing('Oignons marinés', '🧅', 'pickled red onions'),
        ing('Piments', '🌶️', 'pickled chili peppers')
      ],
      feculent: [
        ing('Frites', '🍟', 'french fries stuffed inside'),
        ing('Riz', '🍚', 'seasoned rice'),
        ing('Boulgour', '🌾', 'bulgur')
      ],
      autre: [
        ing('Œuf', '🍳', 'a fried egg'),
        ing('Olives', '🫒', 'olives'),
        ing('Persil', '🌿', 'fresh parsley')
      ]
    }
  },
  {
    id: 'poke',
    name: 'Poke bowl',
    emoji: '🍱',
    possessive: 'son poke bowl',
    base: 'un bol vide',
    imageLead: 'a colorful poke bowl with neatly arranged toppings',
    ingredients: {
      base: [
        ing('Riz vinaigré', '🍚', 'on seasoned sushi rice'),
        ing('Riz complet', '🍚', 'on brown rice'),
        ing('Quinoa', '🌾', 'on quinoa'),
        ing('Nouilles soba', '🍜', 'on cold soba noodles')
      ],
      viande: [
        ing('Poulet teriyaki', '🍗', 'teriyaki chicken'),
        ing('Bœuf mariné', '🥩', 'marinated sliced beef'),
        ing('Porc effiloché', '🐖', 'pulled pork'),
        ing('Canard laqué', '🦆', 'glazed duck slices'),
        ing('Tofu grillé', '🌱', 'grilled tofu cubes')
      ],
      poisson: [
        ing('Saumon cru', '🍣', 'raw salmon cubes'),
        ing('Thon cru', '🐟', 'raw tuna cubes'),
        ing('Crevettes', '🦐', 'cooked shrimp'),
        ing('Crabe', '🦀', 'crab meat'),
        ing('Saumon fumé', '🍣', 'smoked salmon'),
        ing('Surimi', '🍥', 'surimi sticks')
      ],
      fromage: [
        ing('Cream cheese', '🧀', 'cream cheese'),
        ing('Feta', '🧀', 'crumbled feta')
      ],
      sauce: [
        ing('Sauce soja', '🥢', 'soy sauce'),
        ing('Sauce teriyaki', '🍯', 'teriyaki glaze'),
        ing('Mayo épicée', '🌶️', 'spicy mayo drizzle'),
        ing('Sriracha', '🌶️', 'sriracha'),
        ing('Sauce sésame', '🌾', 'creamy sesame dressing'),
        ing('Wasabi', '🟢', 'a dab of wasabi'),
        ing('Ponzu', '🍋', 'citrus ponzu sauce')
      ],
      legume: [
        ing('Avocat', '🥑', 'sliced avocado'),
        ing('Concombre', '🥒', 'cucumber slices'),
        ing('Edamame', '🫛', 'edamame beans'),
        ing('Carottes', '🥕', 'julienned carrots'),
        ing('Radis', '🌸', 'thin radish slices'),
        ing('Chou rouge', '🥬', 'shredded red cabbage'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Oignons nouveaux', '🌱', 'sliced spring onions'),
        ing('Algues wakame', '🌿', 'wakame seaweed salad'),
        ing('Champignons shiitake', '🍄', 'shiitake mushrooms')
      ],
      fruit: [
        ing('Mangue', '🥭', 'mango cubes'),
        ing('Ananas', '🍍', 'pineapple chunks'),
        ing('Grenade', '🍎', 'pomegranate seeds')
      ],
      autre: [
        ing('Graines de sésame', '🌾', 'sesame seeds'),
        ing('Œuf mariné', '🥚', 'a marinated soft-boiled egg'),
        ing('Oignons frits', '🧅', 'crispy fried onions'),
        ing('Noix de cajou', '🥜', 'cashews'),
        ing('Gingembre mariné', '🌸', 'pickled ginger')
      ]
    }
  },
  {
    id: 'hotdog',
    name: 'Hot-dog',
    emoji: '🌭',
    possessive: 'son hot-dog',
    base: 'pain à hot-dog',
    imageLead: 'a loaded hot dog in a soft bun',
    ingredients: {
      base: [
        ing('Pain à hot-dog', '🌭', 'in a soft hot dog bun'),
        ing('Pain brioché', '🥐', 'in a toasted brioche bun'),
        ing('Baguette', '🥖', 'in a crusty baguette')
      ],
      viande: [
        ing('Saucisse de Francfort', '🌭', 'a Frankfurter sausage'),
        ing('Saucisse de Strasbourg', '🌭', 'a Strasbourg sausage'),
        ing('Merguez', '🌭', 'a grilled merguez'),
        ing('Chipolata', '🌭', 'a grilled chipolata'),
        ing('Bacon', '🥓', 'crispy bacon'),
        ing('Saucisse fumée', '🌭', 'a smoked sausage'),
        ing('Poulet pané', '🍗', 'crispy breaded chicken'),
        ing('Porc effiloché', '🐖', 'pulled pork'),
        ing('Chili con carne', '🌶️', 'beef chili con carne')
      ],
      poisson: [
        ing('Saumon fumé', '🍣', 'smoked salmon')
      ],
      fromage: [
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Raclette', '🫕', 'melted raclette cheese'),
        ing('Emmental', '🧀', 'melted emmental'),
        ing('Mozzarella', '🧀', 'mozzarella'),
        ing('Bleu', '🧀', 'blue cheese')
      ],
      sauce: [
        ing('Ketchup', '🍅', 'a zigzag of ketchup'),
        ing('Moutarde', '🟡', 'a zigzag of mustard'),
        ing('Mayonnaise', '🥚', 'mayonnaise'),
        ing('Sauce BBQ', '🔥', 'barbecue sauce'),
        ing('Sauce fromagère', '🧀', 'cheese sauce'),
        ing('Sauce piquante', '🌶️', 'hot sauce'),
        ing('Relish', '🥒', 'sweet pickle relish'),
        ing('Sauce Biggy', '🥫', 'creamy burger sauce'),
        ing('Sauce algérienne', '🌶️', 'spicy Algerian sauce')
      ],
      legume: [
        ing('Oignons frits', '🧅', 'crispy fried onions'),
        ing('Oignons crus', '🧅', 'diced raw onions'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Choucroute', '🥬', 'sauerkraut'),
        ing('Salade', '🥬', 'lettuce'),
        ing('Tomate', '🍅', 'diced tomato'),
        ing('Jalapeños', '🌶️', 'jalapeño slices'),
        ing('Poivrons', '🫑', 'grilled peppers'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Oignon caramélisé', '🧅', 'caramelized onions')
      ],
      feculent: [
        ing('Chips', '🥔', 'crushed potato chips'),
        ing('Frites', '🍟', 'french fries on the side'),
        ing('Rösti', '🥔', 'a hash brown')
      ],
      fruit: [
        ing('Ananas', '🍍', 'pineapple chunks')
      ],
      autre: [
        ing('Œuf', '🍳', 'a fried egg'),
        ing('Miel', '🍯', 'a honey drizzle')
      ]
    }
  },
  {
    id: 'croque',
    name: 'Croque-monsieur',
    emoji: '🥪',
    possessive: 'son croque-monsieur',
    base: 'pain de mie',
    imageLead: 'a golden grilled croque-monsieur with melted cheese on top',
    ingredients: {
      base: [
        ing('Pain de mie', '🍞', 'made with sliced white bread'),
        ing('Pain de campagne', '🍞', 'made with rustic country bread'),
        ing('Pain complet', '🍞', 'made with whole-grain bread'),
        ing('Pain brioché', '🥐', 'made with brioche bread')
      ],
      viande: [
        ing('Jambon blanc', '🍖', 'sliced ham'),
        ing('Jambon fumé', '🍖', 'smoked ham'),
        ing('Poulet', '🍗', 'sliced chicken'),
        ing('Bacon', '🥓', 'crispy bacon'),
        ing('Dinde', '🦃', 'sliced turkey'),
        ing('Pastrami', '🥩', 'pastrami slices'),
        ing('Chorizo', '🌶️', 'chorizo slices'),
        ing('Saucisson', '🍖', 'dry sausage slices')
      ],
      poisson: [
        ing('Saumon fumé', '🍣', 'smoked salmon'),
        ing('Thon', '🐟', 'tuna')
      ],
      fromage: [
        ing('Emmental', '🧀', 'melted emmental'),
        ing('Gruyère', '🧀', 'melted gruyère'),
        ing('Comté', '🧀', 'melted comté'),
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Raclette', '🫕', 'melted raclette cheese'),
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Mozzarella', '🧀', 'stretchy mozzarella'),
        ing('Reblochon', '🫕', 'melted reblochon'),
        ing('Brie', '🧀', 'melted brie')
      ],
      sauce: [
        ing('Béchamel', '🥛', 'creamy béchamel'),
        ing('Crème fraîche', '🥛', 'crème fraîche'),
        ing('Moutarde', '🟡', 'mustard'),
        ing('Pesto', '🌿', 'basil pesto'),
        ing('Sauce tomate', '🍅', 'tomato sauce'),
        ing('Sauce fromagère', '🧀', 'cheese sauce')
      ],
      legume: [
        ing('Tomate', '🍅', 'tomato slices'),
        ing('Champignons', '🍄', 'sautéed mushrooms'),
        ing('Oignons', '🧅', 'caramelized onions'),
        ing('Épinards', '🥬', 'wilted spinach'),
        ing('Poireaux', '🥬', 'sautéed leeks'),
        ing('Cornichons', '🥒', 'pickles'),
        ing('Poivrons', '🫑', 'roasted peppers'),
        ing('Roquette', '🌿', 'fresh arugula')
      ],
      feculent: [
        ing('Pommes de terre', '🥔', 'thin potato slices'),
        ing('Chips', '🥔', 'potato chips on the side')
      ],
      fruit: [
        ing('Poire', '🍐', 'pear slices'),
        ing('Figue', '🟣', 'fig slices'),
        ing('Pomme', '🍎', 'apple slices')
      ],
      autre: [
        ing('Œuf au plat', '🍳', 'a fried egg on top'),
        ing('Miel', '🍯', 'a honey drizzle'),
        ing('Noix', '🌰', 'walnuts'),
        ing('Herbes de Provence', '🌿', 'herbes de Provence')
      ]
    }
  },
  {
    id: 'mcflurry',
    name: 'McFlurry',
    emoji: '🍦',
    possessive: 'son McFlurry',
    base: 'glace vanille à l\'italienne',
    imageLead: 'a McFlurry-style soft serve vanilla ice cream dessert swirled in a clear cup with a long spoon',
    ingredients: {
      base: [
        ing('Glace chocolat', '🍫', 'chocolate soft serve instead of vanilla'),
        ing('Glace caramel', '🍮', 'caramel soft serve instead of vanilla'),
        ing('Sorbet fraise', '🍓', 'strawberry sorbet instead of vanilla')
      ],
      sauce: [
        ing('Coulis de chocolat', '🍫', 'a chocolate fudge drizzle'),
        ing('Caramel beurre salé', '🍯', 'a salted caramel drizzle'),
        ing('Coulis de fraise', '🍓', 'a strawberry coulis'),
        ing('Coulis de fruits rouges', '🫐', 'a red berry coulis'),
        ing('Sauce chocolat blanc', '🥛', 'a white chocolate sauce'),
        ing('Pâte à tartiner', '🌰', 'chocolate hazelnut spread'),
        ing('Lait concentré sucré', '🥛', 'sweetened condensed milk'),
        ing('Sauce pistache', '🟢', 'a pistachio cream drizzle')
      ],
      sucre: [
        ing('Bonbons chocolatés', '🍬', 'colorful candy-coated chocolates'),
        ing('Biscuits cacao', '🍪', 'crushed chocolate sandwich cookies'),
        ing('Morceaux de cookie', '🍪', 'chunks of chocolate chip cookie'),
        ing('Brownie', '🟫', 'brownie pieces'),
        ing('Spéculoos', '🍪', 'crushed speculoos biscuits'),
        ing('Gaufrettes chocolatées', '🍫', 'chocolate wafer pieces'),
        ing('Éclats de caramel croquant', '🍬', 'crunchy toffee pieces'),
        ing('Marshmallows', '🍡', 'mini marshmallows'),
        ing('Bonbons fraise', '🍓', 'strawberry gummy candies'),
        ing('Pépites de chocolat', '🍫', 'chocolate chips'),
        ing('Meringue', '🤍', 'crushed meringue'),
        ing('Pop-corn caramel', '🍿', 'caramel popcorn'),
        ing('Céréales croustillantes', '🥣', 'crunchy breakfast cereal')
      ],
      fruit: [
        ing('Fraises', '🍓', 'fresh strawberries'),
        ing('Banane', '🍌', 'banana slices'),
        ing('Myrtilles', '🫐', 'blueberries'),
        ing('Mangue', '🥭', 'mango cubes'),
        ing('Kiwi', '🥝', 'kiwi slices'),
        ing('Cerises', '🍒', 'cherries'),
        ing('Fruit de la passion', '🟡', 'passion fruit pulp')
      ],
      autre: [
        ing('Chantilly', '☁️', 'whipped cream'),
        ing('Amandes effilées', '🌰', 'toasted sliced almonds'),
        ing('Noisettes concassées', '🌰', 'crushed hazelnuts'),
        ing('Noix de coco râpée', '🥥', 'shredded coconut'),
        ing('Vermicelles colorés', '🌈', 'rainbow sprinkles'),
        ing('Feuilles de menthe', '🌿', 'fresh mint leaves'),
        ing('Fleur de sel', '🧂', 'a pinch of flaky sea salt'),
        ing('Cacahuètes caramélisées', '🥜', 'caramelized peanuts'),
        ing('Bacon caramélisé', '🥓', 'candied bacon bits'),
        ing('Frites', '🍟', 'french fries stuck in the ice cream'),
        ing('Piment d\'Espelette', '🌶️', 'a dusting of Espelette chili')
      ]
    }
  },
  {
    id: 'boisson-chaude',
    name: 'Boisson chaude',
    emoji: '☕',
    possessive: 'sa boisson chaude',
    base: 'grande tasse de lait chaud',
    imageLead: 'a steaming hot drink in a large ceramic mug, generously topped',
    ingredients: {
      base: [
        ing('Lait d\'avoine', '🥛', 'made with oat milk'),
        ing('Lait de coco', '🥥', 'made with coconut milk'),
        ing('Lait d\'amande', '🥛', 'made with almond milk')
      ],
      boisson: [
        ing('Espresso', '☕', 'a double shot of espresso'),
        ing('Chocolat noir fondu', '🍫', 'melted dark chocolate'),
        ing('Thé noir', '🫖', 'strong black tea'),
        ing('Thé matcha', '🍵', 'whisked matcha green tea'),
        ing('Chaï', '🫖', 'spiced chai tea'),
        ing('Rooibos', '🍂', 'rooibos tea'),
        ing('Cacao en poudre', '🟤', 'cocoa powder')
      ],
      sauce: [
        ing('Sirop de vanille', '🍶', 'vanilla syrup'),
        ing('Sirop de caramel', '🍯', 'caramel syrup'),
        ing('Sirop de noisette', '🌰', 'hazelnut syrup'),
        ing('Sirop d\'érable', '🍁', 'maple syrup'),
        ing('Sirop de menthe', '🌿', 'mint syrup'),
        ing('Caramel beurre salé', '🍯', 'a salted caramel drizzle'),
        ing('Sauce chocolat', '🍫', 'a chocolate sauce drizzle'),
        ing('Miel', '🍯', 'a spoon of honey')
      ],
      sucre: [
        ing('Marshmallows', '🍡', 'toasted marshmallows'),
        ing('Spéculoos', '🍪', 'a speculoos biscuit on the side'),
        ing('Copeaux de chocolat', '🍫', 'chocolate shavings'),
        ing('Sucre de canne', '🟫', 'cane sugar'),
        ing('Pain d\'épices', '🍞', 'a slice of gingerbread on the side'),
        ing('Biscuit sablé', '🍪', 'a butter shortbread cookie on the side'),
        ing('Sucre d\'orge', '🍭', 'a candy cane')
      ],
      fruit: [
        ing('Zeste d\'orange', '🍊', 'orange zest'),
        ing('Citron', '🍋', 'a lemon slice'),
        ing('Banane', '🍌', 'blended banana'),
        ing('Fruit de la passion', '🟡', 'passion fruit')
      ],
      fromage: [
        ing('Fromage à café', '🧀', 'cubes of Finnish coffee cheese')
      ],
      autre: [
        ing('Chantilly', '☁️', 'a tall swirl of whipped cream'),
        ing('Mousse de lait', '🥛', 'thick milk foam'),
        ing('Cannelle', '🟤', 'a cinnamon stick'),
        ing('Gingembre', '🌿', 'fresh ginger'),
        ing('Cardamome', '🌿', 'crushed cardamom'),
        ing('Badiane', '⭐', 'a star anise'),
        ing('Muscade', '🌰', 'grated nutmeg'),
        ing('Piment', '🌶️', 'a pinch of chili'),
        ing('Fleur de sel', '🧂', 'a pinch of sea salt'),
        ing('Beurre', '🧈', 'a knob of butter melted in'),
        ing('Jaune d\'œuf', '🥚', 'a whisked egg yolk'),
        ing('Feuilles de menthe', '🌿', 'fresh mint leaves')
      ]
    }
  },
  {
    id: 'gaufre',
    name: 'Gaufre',
    emoji: '🧇',
    possessive: 'sa gaufre',
    base: 'gaufre nature',
    imageLead: 'a golden crispy Belgian waffle on a plate',
    minMeat: 0, // une gaufre peut rester sucrée
    ingredients: {
      base: [
        ing('Gaufre de Liège', '🧇', 'made as a caramelized Liège waffle'),
        ing('Gaufre au chocolat', '🍫', 'made as a chocolate waffle'),
        ing('Gaufre de patate douce', '🍠', 'made as a sweet potato waffle')
      ],
      sauce: [
        ing('Pâte à tartiner', '🌰', 'chocolate hazelnut spread'),
        ing('Caramel beurre salé', '🍯', 'a salted caramel drizzle'),
        ing('Sirop d\'érable', '🍁', 'maple syrup'),
        ing('Coulis de fraise', '🍓', 'a strawberry coulis'),
        ing('Chocolat fondu', '🍫', 'melted chocolate'),
        ing('Miel', '🍯', 'a honey drizzle'),
        ing('Confiture de fraise', '🍓', 'strawberry jam'),
        ing('Crème de marrons', '🌰', 'chestnut cream'),
        ing('Lemon curd', '🍋', 'lemon curd')
      ],
      fruit: [
        ing('Fraises', '🍓', 'fresh strawberries'),
        ing('Banane', '🍌', 'banana slices'),
        ing('Myrtilles', '🫐', 'blueberries'),
        ing('Pomme caramélisée', '🍎', 'caramelized apple slices'),
        ing('Poire', '🍐', 'poached pear slices'),
        ing('Mangue', '🥭', 'mango cubes'),
        ing('Kiwi', '🥝', 'kiwi slices')
      ],
      sucre: [
        ing('Sucre glace', '❄️', 'a dusting of powdered sugar'),
        ing('Spéculoos', '🍪', 'crushed speculoos'),
        ing('Marshmallows', '🍡', 'toasted marshmallows'),
        ing('Pépites de chocolat', '🍫', 'chocolate chips'),
        ing('Nougatine', '🍬', 'crunchy nougatine'),
        ing('Meringue', '🤍', 'crushed meringue'),
        ing('Bonbons chocolatés', '🍬', 'colorful candy-coated chocolates')
      ],
      autre: [
        ing('Chantilly', '☁️', 'whipped cream'),
        ing('Boule de glace vanille', '🍨', 'a scoop of vanilla ice cream'),
        ing('Amandes effilées', '🌰', 'toasted sliced almonds'),
        ing('Noix de coco râpée', '🥥', 'shredded coconut'),
        ing('Cannelle', '🟤', 'a dusting of cinnamon'),
        ing('Fleur de sel', '🧂', 'a pinch of flaky sea salt'),
        ing('Œuf au plat', '🍳', 'a fried egg')
      ],
      viande: [
        ing('Poulet frit', '🍗', 'crispy fried chicken'),
        ing('Bacon', '🥓', 'crispy bacon'),
        ing('Jambon', '🍖', 'sliced ham')
      ],
      poisson: [
        ing('Saumon fumé', '🍣', 'smoked salmon')
      ],
      fromage: [
        ing('Cheddar', '🧀', 'melted cheddar'),
        ing('Chèvre', '🐐', 'goat cheese'),
        ing('Fromage frais', '🧀', 'herbed cream cheese')
      ]
    }
  },
  {
    id: 'ramen',
    name: 'Ramen',
    emoji: '🍜',
    possessive: 'son ramen',
    base: 'bouillon et nouilles de blé',
    imageLead: 'a steaming bowl of Japanese ramen with wheat noodles in broth',
    ingredients: {
      base: [
        ing('Bouillon tonkotsu', '🍲', 'in a rich creamy tonkotsu pork broth'),
        ing('Bouillon miso', '🍲', 'in a miso broth'),
        ing('Bouillon shoyu', '🍲', 'in a clear soy sauce broth'),
        ing('Bouillon épicé', '🌶️', 'in a spicy red broth')
      ],
      viande: [
        ing('Chashu de porc', '🐖', 'slices of braised chashu pork belly'),
        ing('Poulet karaage', '🍗', 'crispy karaage fried chicken'),
        ing('Bœuf émincé', '🥩', 'thinly sliced beef'),
        ing('Canard laqué', '🦆', 'slices of lacquered duck'),
        ing('Porc haché épicé', '🌶️', 'spicy minced pork'),
        ing('Gyoza', '🥟', 'pan-fried gyoza dumplings')
      ],
      poisson: [
        ing('Crevettes', '🍤', 'shrimp'),
        ing('Narutomaki', '🍥', 'narutomaki fish cake slices'),
        ing('Saumon grillé', '🐟', 'seared salmon'),
        ing('Calamar', '🦑', 'grilled squid')
      ],
      fromage: [
        ing('Cheddar fondu', '🧀', 'a melted slice of cheddar')
      ],
      sauce: [
        ing('Huile pimentée', '🌶️', 'chili oil'),
        ing('Sauce soja', '🥫', 'soy sauce'),
        ing('Huile de sésame', '🌰', 'sesame oil'),
        ing('Sriracha', '🌶️', 'sriracha'),
        ing('Ail noir', '🧄', 'black garlic oil'),
        ing('Pâte de miso', '🥣', 'a spoon of miso paste')
      ],
      legume: [
        ing('Ciboule', '🌱', 'sliced green onions'),
        ing('Pousses de bambou', '🎋', 'bamboo shoots'),
        ing('Shiitakés', '🍄', 'shiitake mushrooms'),
        ing('Pak choï', '🥬', 'baby bok choy'),
        ing('Germes de soja', '🌱', 'bean sprouts'),
        ing('Maïs', '🌽', 'sweet corn'),
        ing('Feuille de nori', '🟩', 'a sheet of nori'),
        ing('Épinards', '🥬', 'wilted spinach'),
        ing('Kimchi', '🌶️', 'kimchi'),
        ing('Radis', '🔴', 'sliced radish')
      ],
      feculent: [
        ing('Nouilles en plus', '🍜', 'an extra portion of noodles'),
        ing('Riz', '🍚', 'a side of rice')
      ],
      autre: [
        ing('Œuf mariné', '🥚', 'a soft-boiled marinated ramen egg cut in half'),
        ing('Graines de sésame', '⚪', 'toasted sesame seeds'),
        ing('Gingembre mariné', '🌿', 'pickled ginger'),
        ing('Beurre', '🧈', 'a knob of butter'),
        ing('Tofu frit', '⬜', 'fried tofu cubes'),
        ing('Citron vert', '🍋', 'a lime wedge')
      ]
    }
  },
  {
    id: 'burrito',
    name: 'Burrito',
    emoji: '🌯',
    possessive: 'son burrito',
    base: 'grande tortilla de blé',
    imageLead: 'a big stuffed burrito cut in half showing the filling',
    ingredients: {
      base: [
        ing('Tortilla complète', '🫓', 'wrapped in a whole wheat tortilla'),
        ing('Tortilla aux épinards', '🫓', 'wrapped in a green spinach tortilla'),
        ing('Tortilla de maïs', '🌽', 'wrapped in a corn tortilla')
      ],
      viande: [
        ing('Bœuf haché épicé', '🥩', 'spicy ground beef'),
        ing('Poulet grillé', '🍗', 'grilled chicken strips'),
        ing('Carnitas', '🐖', 'carnitas pulled pork'),
        ing('Chorizo', '🌶️', 'crumbled chorizo'),
        ing('Barbacoa', '🥩', 'barbacoa shredded beef'),
        ing('Chili con carne', '🌶️', 'chili con carne'),
        ing('Bacon', '🥓', 'crispy bacon')
      ],
      poisson: [
        ing('Crevettes grillées', '🍤', 'grilled shrimp'),
        ing('Poisson pané', '🐟', 'crispy fried fish')
      ],
      fromage: [
        ing('Cheddar', '🧀', 'shredded cheddar'),
        ing('Monterey Jack', '🧀', 'melted Monterey Jack'),
        ing('Queso fresco', '🧀', 'crumbled queso fresco')
      ],
      sauce: [
        ing('Salsa tomate', '🍅', 'tomato salsa'),
        ing('Guacamole', '🥑', 'guacamole'),
        ing('Crème aigre', '🥛', 'sour cream'),
        ing('Sauce chipotle', '🌶️', 'smoky chipotle sauce'),
        ing('Salsa verde', '🟢', 'salsa verde'),
        ing('Sauce fromagère', '🧀', 'cheese sauce'),
        ing('Sauce piquante', '🌶️', 'hot sauce')
      ],
      legume: [
        ing('Haricots noirs', '🫘', 'black beans'),
        ing('Haricots rouges', '🫘', 'refried red beans'),
        ing('Maïs grillé', '🌽', 'charred corn'),
        ing('Poivrons', '🫑', 'sautéed bell peppers'),
        ing('Oignons rouges', '🧅', 'pickled red onions'),
        ing('Jalapeños', '🌶️', 'jalapeño slices'),
        ing('Salade', '🥬', 'shredded lettuce'),
        ing('Tomates', '🍅', 'diced tomatoes'),
        ing('Coriandre', '🌿', 'fresh cilantro')
      ],
      feculent: [
        ing('Riz mexicain', '🍚', 'Mexican red rice'),
        ing('Riz à la coriandre', '🍚', 'cilantro lime rice'),
        ing('Frites', '🍟', 'french fries inside'),
        ing('Chips de maïs', '🌽', 'crushed tortilla chips')
      ],
      fruit: [
        ing('Ananas grillé', '🍍', 'grilled pineapple'),
        ing('Mangue', '🥭', 'mango salsa'),
        ing('Citron vert', '🍋', 'a squeeze of lime')
      ],
      autre: [
        ing('Œuf brouillé', '🍳', 'scrambled eggs'),
        ing('Graines de courge', '🎃', 'toasted pumpkin seeds')
      ]
    }
  }
];

const DEFAULT_MIN_MEAT = 2;
const MAX_BASE = 1; // un seul pain / une seule base mise aux enchères par partie

const pick = (list) => list[randomInt(list.length)];

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// Exemplaire d'un ingrédient dans une partie : "uid" est opaque (ne trahit pas un aliment mystère)
const gameItem = (ingredient, category) => ({
  ...ingredient,
  category,
  categoryLabel: CATEGORY_LABELS[category],
  uid: randomBytes(6).toString('hex')
});

export const pickTheme = (exclude = null) => pick(THEMES.filter((theme) => theme.id !== exclude));

// Au moins 2 viandes (selon le plat), le reste tiré au hasard (catégorie d'abord, pour garder de la variété)
export const buildRoundItems = (theme, rounds) => {
  const remaining = Object.fromEntries(
    Object.entries(theme.ingredients).map(([category, list]) => [category, [...list]])
  );
  let baseCount = 0;
  const items = [];

  const draw = (category) => {
    const list = remaining[category];
    const [chosen] = list.splice(randomInt(list.length), 1);
    if (category === 'base') baseCount++;
    items.push(gameItem(chosen, category));
  };

  const minMeat = theme.minMeat ?? (remaining.viande ? DEFAULT_MIN_MEAT : 0);
  for (let i = 0; i < Math.min(minMeat, rounds, remaining.viande?.length || 0); i++) draw('viande');

  while (items.length < rounds) {
    const categories = Object.keys(remaining).filter(
      (c) => remaining[c].length > 0 && !(c === 'base' && baseCount >= MAX_BASE)
    );
    if (!categories.length) break;
    draw(pick(categories));
  }
  return shuffle(items);
};

// Joker « Tour de magie » : un autre ingrédient du plat, pas encore en jeu (même catégorie si possible)
export const pickReplacement = (theme, usedIds, category) => {
  const candidates = Object.entries(theme.ingredients)
    .filter(([c]) => c !== 'base')
    .flatMap(([c, list]) => list.map((ingredient) => ({ ingredient, category: c })))
    .filter(({ ingredient }) => !usedIds.has(ingredient.id));
  if (!candidates.length) return null;
  const sameCategory = candidates.filter((c) => c.category === category);
  const chosen = pick(sameCategory.length ? sameCategory : candidates);
  return gameItem(chosen.ingredient, chosen.category);
};

// Supermarché : tous les ingrédients de tous les plats, en un exemplaire, à prix aléatoire
const PRICES = {
  viande: [2, 6], poisson: [2, 6], fromage: [1, 5], base: [1, 4], boisson: [1, 4],
  sauce: [1, 3], legume: [1, 3], feculent: [1, 4], fruit: [1, 4], sucre: [1, 3], autre: [1, 3]
};
// « in a soft bun », « made with… » : formulations propres à un plat, neutralisées pour la photo
const neutralEn = (en) => en.replace(/^(?:in|on|made with|made as|wrapped in)\s+/i, '');

export const buildShelves = () => {
  const seen = new Set();
  const shelves = [];
  for (const theme of THEMES) {
    for (const [category, list] of Object.entries(theme.ingredients)) {
      for (const ingredient of list) {
        if (seen.has(ingredient.id)) continue;
        seen.add(ingredient.id);
        const [min, max] = PRICES[category] || [1, 4];
        shelves.push({ ...gameItem({ ...ingredient, en: neutralEn(ingredient.en) }, category), price: randomInt(min, max + 1) });
      }
    }
  }
  return shelves.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

export const shuffleItems = (list) => shuffle([...list]);

// Pour les messages partagés : un aliment mystère n'est jamais nommé
export const itemLabel = (item) => (item.hidden ? '❓ un ingrédient mystère' : `${item.emoji} ${item.name}`);

// Ce qui est envoyé aux navigateurs (sans les champs internes) : l'id est l'uid de l'exemplaire
export const publicItem = ({ uid, name, emoji, category, categoryLabel }) => ({ id: uid, name, emoji, category, categoryLabel });
export const publicTheme = (theme) => theme && {
  id: theme.id,
  name: theme.name,
  emoji: theme.emoji,
  base: theme.base,
  possessive: theme.possessive
};
