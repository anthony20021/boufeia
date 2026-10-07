# 🍔 GenNourriture

Jeu d'enchères culinaires à 2 joueurs, en temps réel (WebSocket), avec une interface Vue 3.

Déroulement du mode classique :

1. Les deux joueurs partent avec le même budget, tiré au sort (15 à 30 €), et un plat à composer est tiré au sort (burger, pizza, pâtes, french tacos, tasty crousty, tarte, sandwich, salade, kebab, poke bowl, hot-dog, croque-monsieur, McFlurry, boisson chaude, gaufre, et deux plats surprises). Le même plat ne tombe jamais deux parties de suite.
2. Chacun choisit ensuite en secret 3 jokers parmi les 9 proposés pour la partie (tirés parmi 12 ; 60 s, complétés au hasard si le temps s'écoule). Chaque joker s'utilise une fois, quand on veut pendant la partie (voir le tableau plus bas).
3. À chaque round (16 au total), un aliment est mis aux enchères, sans limite de temps : l'enchère se termine quand un joueur laisse tomber (« Passer »). Le plus offrant l'ajoute à son plat. Chaque aliment doit être pris : si personne n'a misé et qu'un joueur passe, l'adversaire doit le prendre pour 1 € (gratuit s'il n'a plus d'argent).
4. Au round 7, un mini-jeu tiré au sort rapporte 5 à 10 € au gagnant (partagés en cas d'égalité). Le joker « Mini-jeu surprise » en lance d'autres en cours de partie.
5. Un tchat (bouton 💬, adapté au mobile) permet de discuter pendant toute la partie, et de défier l'adversaire au chifoumi : s'il accepte, chacun choisit en secret pierre, feuille ou ciseaux, puis « 1, 2, 3 » et le résultat s'affiche (forfait pour celui qui ne joue pas dans les 15 s).
6. À la fin, un LLM (via `ollama_api`) juge les deux plats, puis la génération d'image (`/api/image`, ComfyUI) les photographie de façon réaliste.

### Modes de jeu

L'hôte choisit le mode dans le salon, et peut en changer entre deux parties depuis l'écran des résultats.

| Mode | Principe |
| --- | --- |
| 🍽️ Classique | Le déroulement ci-dessus |
| 🙈 À l'aveugle | Chacun démarre avec un ingrédient tiré au sort, et un aliment sur deux (rounds pairs) est mis aux enchères sans être montré. Seul l'acheteur le découvre ; l'adversaire voit « ❓ Ingrédient mystère » dans son plat jusqu'au verdict. Jokers et mini-jeux comme en classique (l'Espion perce aussi les mystères) |
| 🛒 Supermarché étoilé | Pas d'enchères : les 372 ingrédients de tous les plats sont en rayon, en un seul exemplaire, à prix aléatoire (budget de 25 à 40 €). Le plat reste secret pendant les courses (150 s, 15 articles maximum, on peut reposer un article). Le plat est ensuite révélé : chacun garde les articles qu'il veut (120 s) et peut proposer des échanges 1 contre 1. Pas de jokers ni de mini-jeux |
| ⭐ Mode étoile | Manches au mode tiré au sort (classique, aveugle ou supermarché, jamais deux fois le même d'affilée). Le gagnant de chaque manche gagne une étoile (aucune en cas d'égalité), le premier à 3 l'emporte. Les manches aux enchères durent `STAR_ROUNDS` rounds (8 par défaut), avec budget et bonus ramenés à la même échelle |

Dans tous les modes, le chef IA juge les plats et une photo est générée.

### Mini-jeux

| Mini-jeu | Principe |
| --- | --- |
| 🔪 La Découpe Express | Taper le plus vite possible sur le légume pendant 8 s |
| 🃏 Le Mémo du Chef | Mémory de 16 cartes à tour de rôle, une paire trouvée fait rejouer (12 s par tour) |
| 🛎️ Le Quiz du Chef | 3 questions écrites par l'IA. Le premier qui buzze a 5 s pour répondre, sinon la main passe à l'adversaire. Questions de secours si l'IA n'est pas prête |
| 🪢 Le Pendu Gourmand | Rôles tirés au sort : l'un choisit un mot (30 s), l'autre le devine lettre par lettre (8 erreurs, 90 s) |
| 🍳 Le Réflexe du Chef | Taper dès que la poêle s'enflamme ; taper trop tôt donne le point à l'adversaire. Premier à 3 |
| 🔤 Les Mots Mélangés | 3 mots de cuisine aux lettres mélangées, le premier qui trouve marque (indice au bout de 15 s) |

Deux mini-jeux surprises s'ajoutent au tirage (à découvrir en jeu, ou dans `server/minigames/`).

Les questions du quiz sont demandées à l'IA dès que l'on sait qu'un quiz sera joué (début de partie ou joker), pour qu'elles soient prêtes à temps. Comme pour le juge, aucun texte des joueurs n'est envoyé à l'IA.

### Jokers

| Joker | Effet |
| --- | --- |
| 🫳 Chapardeur | Prendre l'ingrédient de son choix dans le plat adverse |
| 💰 Pickpocket | Voler 20 % du budget de départ à l'adversaire (jamais l'argent engagé dans l'enchère qu'il mène) |
| 🎁 Cadeau empoisonné | Refiler un de ses ingrédients à l'adversaire |
| 🗑️ Poubelle | Jeter un ingrédient de son plat |
| ⚡ Coupe-file | Remporter immédiatement l'aliment aux enchères, pour l'offre actuelle + 1 € |
| 🏷️ Soldes | Le prochain aliment remporté est à moitié prix |
| 👀 Espion | Voir en secret les 3 prochains aliments mis aux enchères |
| 🛡️ Bouclier | Bloquer le prochain joker adverse qui vise votre plat ou votre argent |
| 🎮 Mini-jeu surprise | Lancer un mini-jeu bonus juste après l'enchère en cours |

Trois jokers surprises complètent la réserve (à découvrir lors du choix des jokers, ou dans `server/jokers.js`).

Les jokers de l'adversaire restent secrets (on ne voit que le nombre qu'il lui reste) jusqu'à ce qu'il les utilise : chaque utilisation est annoncée aux deux joueurs.

## Architecture

```
navigateur (Vue)  ──WebSocket /ws──►  server/ (Node, fait autorité sur la partie)
                                          │  Bearer API_TOKEN (jamais envoyé au navigateur)
                                          ▼
                                   ollama_api :3000  ──►  Ollama (juge) / ComfyUI (photos)
```

| Fichier | Rôle |
| --- | --- |
| `server/index.js` | HTTP (sert l'interface compilée), WebSocket, salles, codes, reconnexion |
| `server/game.js` | Règles : modes, choix des jokers, enchères (et aliments mystère), enchaînement des mini-jeux, jugement, photos, étoiles, revanche |
| `server/modes.js` | Les 4 modes de jeu |
| `server/market.js` | Supermarché étoilé : courses, composition du plat, échanges |
| `server/jokers.js` | Les jokers : conditions d'utilisation et effets |
| `server/minigames/` | Un fichier par mini-jeu (base commune dans `base.js`, questions et mots de secours dans `data.js`) |
| `server/chifoumi.js` | Chifoumi lancé depuis le tchat |
| `server/foods.js` | Plats et ingrédients (noms FR + descriptions EN pour les photos) |
| `server/ai.js` | Appels à `ollama_api` : `/api/chat` (juge, questions du quiz) et `/api/image` (photos) |
| `client/src/` | Interface Vue 3 (accueil, salon, jokers, enchères, mini-jeux, résultats, tchat) |

Le juge ne voit jamais les pseudos : les plats lui sont présentés comme « candidat A » et « candidat B », avec uniquement des ingrédients du catalogue. Si l'IA ne répond pas, un verdict automatique est calculé pour que la partie se termine quand même.

## Installation

Prérequis : Node.js 20.19 ou plus (Vite 8 ne compile pas l'interface avec une version plus ancienne), et `ollama_api` démarré avec la route `/api/image`.

```powershell
cd "C:\Program Files\ollama_api\gennourrituregame"
npm install
```

Dans `.env`, renseignez `API_TOKEN` avec la même valeur que dans le `.env` de `ollama_api`. Toutes les variables sont décrites dans `.env.example`.

## Lancer

Production (un seul port, l'interface est servie par le serveur Node) :

```powershell
npm run build
npm start
```

Ouvrez ensuite `http://localhost:3100`, ou `http://IP_DU_PC:3100` depuis un autre appareil du réseau.

Développement (rechargement automatique, interface sur le port 5173) :

```powershell
npm run dev
```

Pour tester seul, ouvrez deux onglets : chaque onglet est un joueur différent.

## Réseau local

Autorisez le port du jeu dans le pare-feu Windows (PowerShell administrateur) :

```powershell
New-NetFirewallRule -DisplayName "GenNourriture" -Direction Inbound -Protocol TCP -LocalPort 3100 -Action Allow
```

## Service Windows (facultatif, NSSM)

```powershell
nssm install GenNourriture "C:\Program Files\nodejs\node.exe" "server\index.js"
nssm set GenNourriture AppDirectory "C:\Program Files\ollama_api\gennourrituregame"
nssm start GenNourriture
```

Pensez à relancer `npm run build` puis `nssm restart GenNourriture` après chaque modification de l'interface.

## Points d'attention

- Le GPU (16 Go) ne peut pas tenir le juge et le modèle d'image en même temps : `ollama_api` décharge le LLM avant chaque photo. Le premier verdict d'une partie inclut donc le rechargement du modèle (jusqu'à une minute). C'est aussi pour cela que les questions du quiz sont demandées en avance ; si elles ne sont pas prêtes au début du quiz, les questions de secours (`server/minigames/data.js`) prennent le relais.
- Les photos consomment le quota de `ollama_api` (`IMAGE_PER_HOUR`, `IMAGE_PER_DAY`) : 2 par partie avec `IMAGE_MODE=both`, 1 avec `winner`. En mode étoile, chaque manche compte comme une partie (jusqu'à 5 manches, donc 10 photos par série) ; passer à la manche suivante avant la fin des photos les abandonne.
- Les salles sont en mémoire : un redémarrage du serveur termine les parties en cours. Une salle sans joueur connecté est supprimée après 10 minutes.
