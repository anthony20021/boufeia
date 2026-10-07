// Données des mini-jeux (aucune ne vient des joueurs)

// Faces du mémo : 8 paires tirées au sort parmi ces aliments
export const MEMORY_FACES = [
  '🍅', '🥕', '🧀', '🍄', '🥑', '🌶️', '🍋', '🥓', '🍤', '🧅', '🍆', '🥦',
  '🍓', '🍍', '🥐', '🥚', '🍇', '🍉', '🥨', '🍩', '🌽', '🍒', '🥥', '🍌'
];

// Mots du pendu (sans accents, 4 à 12 lettres)
export const FOOD_WORDS = [
  'FROMAGE', 'CHOCOLAT', 'BAGUETTE', 'CROISSANT', 'RATATOUILLE', 'CAMEMBERT', 'TARTIFLETTE', 'BROCOLI',
  'AUBERGINE', 'COURGETTE', 'CORNICHON', 'MAYONNAISE', 'MOUTARDE', 'VINAIGRETTE', 'PISTACHE', 'FRAMBOISE',
  'MYRTILLE', 'CHAMPIGNON', 'POIVRON', 'ARTICHAUT', 'ASPERGE', 'CITROUILLE', 'PAMPLEMOUSSE', 'CLEMENTINE',
  'ANANAS', 'BANANE', 'CERISE', 'ABRICOT', 'CAROTTE', 'OIGNON', 'ECHALOTE', 'CIBOULETTE', 'BASILIC',
  'PERSIL', 'ROMARIN', 'SAUCISSON', 'JAMBON', 'CHORIZO', 'MERGUEZ', 'LASAGNE', 'SPAGHETTI', 'RAVIOLI',
  'RISOTTO', 'PAELLA', 'COUSCOUS', 'QUICHE', 'GAUFRE', 'BRIOCHE', 'MACARON', 'MERINGUE', 'PRALINE',
  'CARAMEL', 'VANILLE', 'CANNELLE', 'MUSCADE', 'PAPRIKA', 'CURCUMA', 'SAFRAN', 'AVOCAT', 'CONCOMBRE',
  'EPINARD', 'LENTILLE', 'HARICOT', 'TOMATE', 'KETCHUP', 'BARBECUE', 'FONDUE', 'RACLETTE', 'CASSOULET',
  'CHOUCROUTE', 'PROFITEROLE', 'TIRAMISU', 'NOUGAT', 'CHANTILLY', 'YAOURT', 'PASTEQUE', 'MANGUE',
  'POTIRON', 'BETTERAVE', 'PANAIS', 'GINGEMBRE', 'WASABI', 'KEBAB', 'BURGER', 'PIZZA', 'SUSHI'
];

// Mots mélangés : 5 à 9 lettres, sans autre anagramme courante (pas d'ASPERGE/PRÉSAGE ni HARICOT/CHARIOT)
export const ANAGRAM_WORDS = [
  'FROMAGE', 'CHOCOLAT', 'BAGUETTE', 'CROISSANT', 'BROCOLI', 'AUBERGINE', 'COURGETTE', 'CORNICHON',
  'MOUTARDE', 'PISTACHE', 'FRAMBOISE', 'MYRTILLE', 'POIVRON', 'ARTICHAUT', 'ANANAS', 'BANANE', 'ABRICOT',
  'CAROTTE', 'OIGNON', 'BASILIC', 'ROMARIN', 'SAUCISSON', 'JAMBON', 'CHORIZO', 'MERGUEZ', 'SPAGHETTI',
  'RAVIOLI', 'RISOTTO', 'PAELLA', 'COUSCOUS', 'QUICHE', 'GAUFRE', 'BRIOCHE', 'MACARON', 'MERINGUE',
  'CARAMEL', 'VANILLE', 'CANNELLE', 'MUSCADE', 'PAPRIKA', 'CURCUMA', 'AVOCAT', 'CONCOMBRE', 'LENTILLE',
  'TOMATE', 'KETCHUP', 'BARBECUE', 'FONDUE', 'RACLETTE', 'CASSOULET', 'TIRAMISU', 'NOUGAT', 'CHANTILLY',
  'YAOURT', 'PASTEQUE', 'MANGUE', 'POTIRON', 'GINGEMBRE', 'WASABI', 'BURGER', 'PIZZA', 'SUSHI', 'KEBAB'
];

// Questions de secours du quiz (IA indisponible) : la première réponse est la bonne, l'ordre est mélangé au tirage
export const QUIZ_BANK = [
  { q: 'De quel pays la pizza Margherita est-elle originaire ?', a: ['L\'Italie', 'L\'Espagne', 'La Grèce', 'La France'] },
  { q: 'Quel fromage garnit traditionnellement une pizza Margherita ?', a: ['La mozzarella', 'L\'emmental', 'Le comté', 'Le roquefort'] },
  { q: 'Quel fruit est l\'ingrédient principal du guacamole ?', a: ['L\'avocat', 'La mangue', 'Le kiwi', 'La poire'] },
  { q: 'Le roquefort est fabriqué avec du lait de…', a: ['Brebis', 'Vache', 'Chèvre', 'Bufflonne'] },
  { q: 'Quelle épice, la plus chère du monde, provient d\'une fleur de crocus ?', a: ['Le safran', 'Le curcuma', 'Le paprika', 'La cannelle'] },
  { q: 'Quel est l\'ingrédient de base du houmous ?', a: ['Le pois chiche', 'La lentille', 'Le haricot rouge', 'Le petit pois'] },
  { q: 'Le croque-monsieur classique associe pain de mie, fromage et…', a: ['Jambon', 'Poulet', 'Saumon', 'Thon'] },
  { q: 'Avec quelle céréale prépare-t-on un risotto ?', a: ['Le riz', 'Le blé', 'L\'avoine', 'Le millet'] },
  { q: 'D\'où le poke bowl est-il originaire ?', a: ['D\'Hawaï', 'Du Japon', 'Du Pérou', 'De Thaïlande'] },
  { q: 'Quel fruit sert à fabriquer le cidre ?', a: ['La pomme', 'La poire', 'Le raisin', 'La prune'] },
  { q: 'La tapenade est principalement à base de…', a: ['Olives', 'Tomates séchées', 'Poivrons', 'Aubergines'] },
  { q: 'Combien de temps cuit environ un œuf à la coque ?', a: ['3 minutes', '10 minutes', '30 secondes', '20 minutes'] },
  { q: 'Quelle sauce associe jaunes d\'œufs, beurre, échalote et estragon ?', a: ['La béarnaise', 'La béchamel', 'La bolognaise', 'La vinaigrette'] },
  { q: 'La béchamel se prépare avec du beurre, de la farine et du…', a: ['Lait', 'Vin blanc', 'Bouillon', 'Jus de citron'] },
  { q: 'Quel gâteau breton est célèbre pour sa quantité de beurre ?', a: ['Le kouign-amann', 'Le baba au rhum', 'Le paris-brest', 'Le fraisier'] },
  { q: 'Quelle ville française est célèbre pour sa moutarde ?', a: ['Dijon', 'Lyon', 'Nice', 'Lille'] },
  { q: 'Avec quoi sert-on traditionnellement le wasabi ?', a: ['Les sushis', 'Les crêpes', 'La pizza', 'Le couscous'] },
  { q: 'Hormis les œufs, quel est l\'ingrédient principal de la tortilla espagnole ?', a: ['Les pommes de terre', 'Le riz', 'Le maïs', 'Le chorizo'] },
  { q: 'Les tortillas des tacos mexicains traditionnels sont faites avec de la farine de…', a: ['Maïs', 'Riz', 'Seigle', 'Sarrasin'] },
  { q: 'Les galettes bretonnes sont faites avec de la farine de…', a: ['Sarrasin', 'Maïs', 'Riz', 'Châtaigne'] },
  { q: 'Quel fromage est indispensable à une vraie tartiflette ?', a: ['Le reblochon', 'Le comté', 'Le camembert', 'La mozzarella'] },
  { q: 'Dans quel pays le french tacos a-t-il été inventé ?', a: ['La France', 'Le Mexique', 'Les États-Unis', 'L\'Espagne'] },
  { q: 'Quelle est la base du tzatziki grec ?', a: ['Le yaourt', 'La mayonnaise', 'La crème fraîche', 'Le fromage blanc'] },
  { q: 'Le pesto genovese contient basilic, ail, parmesan, huile d\'olive et…', a: ['Pignons de pin', 'Noix de cajou', 'Amandes', 'Cacahuètes'] },
  { q: 'Quel vin utilise-t-on pour cuisiner un bœuf bourguignon ?', a: ['Du vin rouge', 'Du vin blanc', 'Du champagne', 'Du rosé'] },
  { q: 'De quelle région le camembert est-il originaire ?', a: ['La Normandie', 'La Bretagne', 'L\'Alsace', 'La Savoie'] },
  { q: 'Avec quelle plante fabrique-t-on le tofu ?', a: ['Le soja', 'Le pois chiche', 'Le riz', 'La pomme de terre'] },
  { q: 'Quel légume est la base du gaspacho ?', a: ['La tomate', 'La carotte', 'Le poireau', 'Le potiron'] },
  { q: 'Qu\'est-ce que la « nori » qui entoure les makis ?', a: ['Une algue', 'Une feuille de riz', 'Un champignon', 'Une feuille de bananier'] },
  { q: 'Qu\'est-ce qui fait lever la pâte à pain ?', a: ['La levure', 'Le sel', 'Le sucre', 'L\'huile'] },
  { q: 'La crème chantilly, c\'est de la crème…', a: ['Fouettée', 'Cuite', 'Salée', 'Congelée'] },
  { q: 'Le gorgonzola est un fromage…', a: ['Italien', 'Espagnol', 'Suisse', 'Grec'] },
  { q: 'De quel pays la feta est-elle originaire ?', a: ['La Grèce', 'L\'Italie', 'L\'Espagne', 'Le Portugal'] },
  { q: 'Quelle épice donne traditionnellement sa couleur jaune à la paella ?', a: ['Le safran', 'Le curry', 'La moutarde', 'Le gingembre'] },
  { q: 'Le parmesan (Parmigiano Reggiano) est fabriqué avec du lait de…', a: ['Vache', 'Brebis', 'Chèvre', 'Bufflonne'] },
  { q: 'À quelle température l\'eau bout-elle au niveau de la mer ?', a: ['100 °C', '90 °C', '120 °C', '80 °C'] },
  { q: 'Combien de cuillères à café faut-il pour faire une cuillère à soupe ?', a: ['3', '2', '4', '5'] },
  { q: 'De quel pays la raclette est-elle originaire ?', a: ['La Suisse', 'La Belgique', 'Les Pays-Bas', 'Le Danemark'] },
  { q: 'Quel champignon surnomme-t-on le « diamant noir » ?', a: ['La truffe noire', 'Le cèpe', 'La morille', 'La girolle'] },
  { q: 'Que mange-t-on traditionnellement en France à l\'Épiphanie ?', a: ['La galette des rois', 'La bûche', 'Des crêpes', 'Des œufs en chocolat'] },
  { q: 'Que mange-t-on traditionnellement à la Chandeleur ?', a: ['Des crêpes', 'La galette des rois', 'La bûche', 'Des marrons glacés'] },
  { q: 'Le cheddar est un fromage originaire de quel pays ?', a: ['L\'Angleterre', 'L\'Irlande', 'Les États-Unis', 'Les Pays-Bas'] },
  { q: 'Quel est l\'aliment préféré du panda géant ?', a: ['Le bambou', 'L\'eucalyptus', 'Le riz', 'Le poisson'] },
  { q: 'Quelles pâtes ont la forme de petits papillons ?', a: ['Les farfalle', 'Les penne', 'Les fusilli', 'Les rigatoni'] },
  { q: 'Quel fromage est indispensable au tiramisu ?', a: ['Le mascarpone', 'La ricotta', 'Le fromage blanc', 'La mozzarella'] },
  { q: 'Quel légume donne sa couleur au bortsch ?', a: ['La betterave', 'Le chou rouge', 'Le radis', 'L\'aubergine'] },
  { q: 'Le chorizo est une charcuterie d\'origine…', a: ['Espagnole', 'Italienne', 'Allemande', 'Polonaise'] },
  { q: 'Le jambon de Parme vient de quel pays ?', a: ['L\'Italie', 'L\'Espagne', 'La France', 'Le Portugal'] },
  { q: 'Quelle épice donne sa couleur jaune au curry ?', a: ['Le curcuma', 'Le safran', 'Le paprika', 'Le cumin'] },
  { q: 'Avec quoi assaisonne-t-on le riz des sushis ?', a: ['Du vinaigre de riz', 'Du lait de coco', 'Du curry', 'Du beurre'] },
  { q: 'Avec quoi fabrique-t-on la moutarde ?', a: ['Des graines de moutarde', 'Des racines de raifort', 'Des piments', 'Des graines de sésame'] },
  { q: 'Quelle partie de l\'artichaut mange-t-on ?', a: ['La fleur', 'La racine', 'La tige', 'La graine'] },
  { q: 'De quel continent la pomme de terre est-elle originaire ?', a: ['L\'Amérique du Sud', 'L\'Europe', 'L\'Asie', 'L\'Afrique'] },
  { q: 'Le chocolat est fabriqué à partir des fèves du…', a: ['Cacaoyer', 'Caféier', 'Vanillier', 'Cocotier'] },
  { q: 'De quel pays le kimchi est-il originaire ?', a: ['La Corée', 'Le Japon', 'La Chine', 'Le Vietnam'] },
  { q: 'Quelle région est le berceau de la ratatouille ?', a: ['La Provence', 'L\'Alsace', 'La Bretagne', 'La Normandie'] },
  { q: 'La choucroute est une spécialité de quelle région française ?', a: ['L\'Alsace', 'La Provence', 'La Normandie', 'La Corse'] },
  { q: 'Lequel de ces aliments est un fruit pour les botanistes ?', a: ['La tomate', 'La carotte', 'La pomme de terre', 'Le poireau'] },
  { q: 'Le nem est une spécialité de quel pays ?', a: ['Le Vietnam', 'Le Japon', 'L\'Inde', 'La Corée'] },
  { q: 'Comment cuit-on traditionnellement les petits pains bao ?', a: ['À la vapeur', 'Au four', 'À la friteuse', 'Au barbecue'] },
  { q: 'Dans quel massif fabrique-t-on le comté ?', a: ['Le Jura', 'Les Pyrénées', 'Le Massif central', 'Les Vosges'] },
  { q: 'Quel ingrédient sucre traditionnellement le pain d\'épices ?', a: ['Le miel', 'Le sirop d\'érable', 'La confiture', 'Le caramel'] }
];
