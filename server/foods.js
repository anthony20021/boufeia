import { randomInt } from 'crypto';

// Un plat est tiré au sort à chaque partie, avec son propre catalogue d'ingrédients.
// "base" : ce que chaque joueur a d'office. "imageLead" : début du prompt d'image (en anglais).
// "possessive" : pour les phrases de l'interface ("dans sa pizza").

export const CATEGORY_LABELS = {
  base: 'Base',
  viande: 'Viande',
  poisson: 'Poisson',
  fromage: 'Fromage',
  sauce: 'Sauce',
  legume: 'Légume',
  feculent: 'Féculent',
  fruit: 'Fruit',
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
  }
];

const MIN_MEAT = 2;
const MAX_BASE = 1; // un seul pain / une seule base mise aux enchères par partie

const pick = (list) => list[randomInt(list.length)];

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

export const pickTheme = () => pick(THEMES);

// Au moins 2 viandes, le reste tiré au hasard (catégorie d'abord, pour garder de la variété)
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
    items.push({ ...chosen, category, categoryLabel: CATEGORY_LABELS[category] });
  };

  for (let i = 0; i < Math.min(MIN_MEAT, rounds); i++) draw('viande');

  while (items.length < rounds) {
    const categories = Object.keys(remaining).filter(
      (c) => remaining[c].length > 0 && !(c === 'base' && baseCount >= MAX_BASE)
    );
    if (!categories.length) break;
    draw(pick(categories));
  }
  return shuffle(items);
};

// Ce qui est envoyé aux navigateurs (sans les champs internes)
export const publicItem = ({ id, name, emoji, category, categoryLabel }) => ({ id, name, emoji, category, categoryLabel });
export const publicTheme = (theme) => theme && {
  id: theme.id,
  name: theme.name,
  emoji: theme.emoji,
  base: theme.base,
  possessive: theme.possessive
};
