import { config } from './config.js';
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';
import { WebSocketServer } from 'ws';
import { Room, GameError, sanitizeName } from './game.js';
import { checkApi } from './ai.js';
import { minigameList, secretMinigameCount } from './minigames/index.js';
import { MODES } from './modes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'client', 'dist');
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I/L
const CODE_LENGTH = 5;
const ROOM_IDLE_MS = 10 * 60 * 1000;
const MAX_MESSAGES_PER_SECOND = 40;

const rooms = new Map();

// --- HTTP : interface compilée + petites routes d'information ---

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur GenNourriture fonctionnel', rooms: rooms.size });
});

app.get('/api/rules', (req, res) => {
  res.json({
    budgetMin: config.budgetMin,
    budgetMax: config.budgetMax,
    totalRounds: config.totalRounds,
    minigameRound: config.minigameRound,
    bonusMin: config.bonusMin,
    bonusMax: config.bonusMax,
    jokersPerPlayer: config.jokersPerPlayer,
    minigames: minigameList(),
    secretMinigames: secretMinigameCount(),
    modes: MODES,
    starRounds: config.starRounds
  });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(DIST_DIR, 'index.html')) : next()));
} else {
  app.use((req, res) => {
    res.status(503).send('Interface non compilée : lancez "npm run build" (ou "npm run dev" pour le développement).');
  });
}

// --- WebSocket ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

const send = (ws, payload) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
};

const generateCode = () => {
  for (;;) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
};

const destroyRoom = (room) => {
  room.destroy();
  rooms.delete(room.code);
  console.log(`🧹 Salle ${room.code} fermée (${rooms.size} active(s))`);
};

const attach = (ws, room, player) => {
  ws.ctx = { room, player };
  send(ws, { type: 'session', code: room.code, playerId: player.id, secret: player.secret });
  room.sendFullState(player);
  room.broadcast();
};

const leaveCurrent = (ws) => {
  if (!ws.ctx) return;
  const { room, player } = ws.ctx;
  ws.ctx = null;
  room.leave(player);
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const handleMessage = (ws, msg) => {
  switch (msg.type) {
    case 'create': {
      const name = sanitizeName(msg.name);
      leaveCurrent(ws);
      const room = new Room(generateCode(), destroyRoom);
      rooms.set(room.code, room);
      attach(ws, room, room.addPlayer(name, ws));
      console.log(`🏠 Salle ${room.code} créée (${rooms.size} active(s))`);
      return;
    }
    case 'join': {
      const name = sanitizeName(msg.name);
      const room = rooms.get(normalizeCode(msg.code));
      if (!room) throw new GameError('Aucune partie avec ce code');
      if (ws.ctx?.room === room) throw new GameError('Vous êtes déjà dans cette partie');
      const player = room.addPlayer(name, ws);
      leaveCurrent(ws);
      attach(ws, room, player);
      console.log(`👥 Un joueur a rejoint la salle ${room.code}`);
      return;
    }
    case 'resume': {
      const room = rooms.get(normalizeCode(msg.code));
      const player = room?.resume(String(msg.playerId || ''), String(msg.secret || ''), ws);
      if (!player) return send(ws, { type: 'session_expired' });
      attach(ws, room, player);
      return;
    }
    case 'leave':
      leaveCurrent(ws);
      send(ws, { type: 'left' });
      return;
    default:
      if (!ws.ctx) throw new GameError('Vous n\'êtes dans aucune partie');
      ws.ctx.room.handle(ws.ctx.player, msg);
  }
};

// Limite grossière anti-flood par connexion
const isFlooding = (ws) => {
  const now = Date.now();
  if (now - ws.windowStart >= 1000) {
    ws.windowStart = now;
    ws.windowCount = 0;
  }
  return ++ws.windowCount > MAX_MESSAGES_PER_SECOND;
};

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.ctx = null;
  ws.windowStart = Date.now();
  ws.windowCount = 0;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    if (isFlooding(ws)) return;
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;

    try {
      handleMessage(ws, msg);
    } catch (error) {
      if (error instanceof GameError) {
        send(ws, { type: 'error', message: error.message });
      } else {
        console.error('❌ Erreur interne:', error);
        send(ws, { type: 'error', message: 'Erreur interne du serveur' });
      }
    }
  });

  ws.on('close', () => {
    if (ws.ctx) ws.ctx.room.detach(ws.ctx.player, ws);
  });
});

// Détection des connexions mortes (mobile en veille, Wi-Fi coupé…)
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

// Nettoyage des salles abandonnées
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.isIdle(now, ROOM_IDLE_MS)) destroyRoom(room);
  }
}, 60000);

wss.on('close', () => {
  clearInterval(heartbeat);
  clearInterval(cleanup);
});

server.listen(config.port, config.host, () => {
  console.log(`🍔 Serveur GenNourriture démarré sur le port ${config.port}`);
  console.log(`🤖 API IA : ${config.apiUrl}`);
  if (!fs.existsSync(DIST_DIR)) console.log('ℹ️  Interface non compilée : utilisez "npm run dev" ou "npm run build"');
  checkApi();
});
