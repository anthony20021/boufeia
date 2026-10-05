# 🍔 GenNourriture

Jeu d'enchères culinaires à 2 joueurs, en temps réel (WebSocket), avec une interface Vue 3.

1. Les deux joueurs partent avec le même budget, tiré au sort (15 à 30 €), et un plat à composer est tiré au sort (burger, pizza, pâtes, french tacos, tasty crousty, tarte, sandwich, salade, kebab, poke bowl, hot-dog ou croque-monsieur).
2. À chaque round (16 au total), un aliment est mis aux enchères, sans limite de temps : l'enchère se termine quand un joueur laisse tomber (« Passer »). Le plus offrant l'ajoute à son plat. Chaque aliment doit être pris : si personne n'a misé et qu'un joueur passe, l'adversaire doit le prendre pour 1 € (gratuit s'il n'a plus d'argent).
3. Au round 7, un mini-jeu (« La Découpe Express », taper le plus vite possible pendant 8 s) rapporte 5 à 10 € au gagnant.
4. Un tchat (bouton 💬, adapté au mobile) permet de discuter pendant toute la partie.
5. À la fin, un LLM (via `ollama_api`) juge les deux plats, puis la génération d'image (`/api/image`, ComfyUI) les photographie de façon réaliste.

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
| `server/game.js` | Règles : enchères, mini-jeu, jugement, photos, revanche |
| `server/foods.js` | Plats et ingrédients (noms FR + descriptions EN pour les photos) |
| `server/ai.js` | Appels à `ollama_api` : `/api/chat` (juge) et `/api/image` (photos) |
| `client/src/` | Interface Vue 3 (écrans accueil, salon, enchères, mini-jeu, résultats) |

Le juge ne voit jamais les pseudos : les plats lui sont présentés comme « candidat A » et « candidat B », avec uniquement des ingrédients du catalogue. Si l'IA ne répond pas, un verdict automatique est calculé pour que la partie se termine quand même.

## Installation

Prérequis : Node.js 20 ou plus, et `ollama_api` démarré avec la route `/api/image`.

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

- Le GPU (16 Go) ne peut pas tenir le juge et le modèle d'image en même temps : `ollama_api` décharge le LLM avant chaque photo. Le premier verdict d'une partie inclut donc le rechargement du modèle (jusqu'à une minute).
- Les photos consomment le quota de `ollama_api` (`IMAGE_PER_HOUR`, `IMAGE_PER_DAY`) : 2 par partie avec `IMAGE_MODE=both`, 1 avec `winner`.
- Les salles sont en mémoire : un redémarrage du serveur termine les parties en cours. Une salle sans joueur connecté est supprimée après 10 minutes.
