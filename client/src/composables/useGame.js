import { reactive, computed } from 'vue';

// Connexion WebSocket unique et état de la partie (le serveur fait autorité, le client affiche)

const SESSION_KEY = 'gennourriture:session'; // par onglet : permet de jouer à 2 dans le même navigateur
const NAME_KEY = 'gennourriture:name';

const state = reactive({
  connection: 'connecting', // 'connecting' | 'open' | 'closed'
  game: null,
  images: {},
  chat: [],
  deadlineAt: null,
  timerTotal: 0,
  rpsDeadlineAt: null,
  rpsTotal: 0,
  flash: '', // annonce d'un joker, visible par les deux joueurs
  error: ''
});

const FLASH_MS = 4000;

let socket = null;
let retryDelay = 1000;
let errorTimer = null;
let flashTimer = null;
let lastFlashId = 0;

const storage = {
  get(store, key) {
    try {
      return JSON.parse(store.getItem(key));
    } catch {
      return null;
    }
  },
  set(store, key, value) {
    try {
      if (value == null) store.removeItem(key);
      else store.setItem(key, JSON.stringify(value));
    } catch {
      // stockage indisponible (navigation privée…) : la reprise après rechargement ne marchera pas
    }
  }
};

function showError(message) {
  state.error = message;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => {
    state.error = '';
  }, 4000);
}

function showFlash(text) {
  state.flash = text;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    state.flash = '';
  }, FLASH_MS);
}

function resetToHome() {
  storage.set(sessionStorage, SESSION_KEY, null);
  state.game = null;
  state.images = {};
  state.chat = [];
  state.deadlineAt = null;
  state.timerTotal = 0;
  state.rpsDeadlineAt = null;
  state.flash = '';
}

function applyState(game) {
  if (!state.game || state.game.code !== game.code) {
    state.chat = [];
    lastFlashId = 0;
  }
  if (!state.game || state.game.code !== game.code || state.game.gameSeq !== game.gameSeq) {
    state.images = {};
  }
  state.game = game;
  // Le serveur envoie un temps restant (pas une heure) : insensible au décalage d'horloge
  state.deadlineAt = game.timer ? Date.now() + game.timer.remainingMs : null;
  state.timerTotal = game.timer ? game.timer.totalMs : 0;
  state.rpsDeadlineAt = game.rps?.timer ? Date.now() + game.rps.timer.remainingMs : null;
  state.rpsTotal = game.rps?.timer ? game.rps.timer.totalMs : 0;
  if (game.flash && game.flash.id !== lastFlashId) {
    lastFlashId = game.flash.id;
    showFlash(game.flash.text);
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'session':
      storage.set(sessionStorage, SESSION_KEY, { code: msg.code, playerId: msg.playerId, secret: msg.secret });
      break;
    case 'state':
      applyState(msg.state);
      break;
    case 'image':
      if (state.game && msg.gameSeq === state.game.gameSeq) state.images[msg.playerId] = msg.image;
      break;
    case 'chat':
      if (!state.chat.some((m) => m.id === msg.message.id)) state.chat.push(msg.message);
      break;
    case 'chat_history':
      state.chat = msg.messages;
      break;
    case 'error':
      showError(msg.message);
      break;
    case 'session_expired':
      if (state.game) showError('Cette partie n\'existe plus.');
      resetToHome();
      break;
    case 'left':
      resetToHome();
      break;
  }
}

function connect() {
  state.connection = 'connecting';
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(`${protocol}://${location.host}/ws`);

  socket.onopen = () => {
    state.connection = 'open';
    retryDelay = 1000;
    const session = storage.get(sessionStorage, SESSION_KEY);
    if (session) send({ type: 'resume', ...session });
  };
  socket.onmessage = (event) => {
    try {
      handleMessage(JSON.parse(event.data));
    } catch {
      // message illisible ignoré
    }
  };
  socket.onclose = () => {
    state.connection = 'closed';
    socket = null;
    setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 10000);
  };
}

function send(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }
  showError('Connexion au serveur perdue, reconnexion en cours…');
  return false;
}

connect();

const me = computed(() => state.game?.players.find((p) => p.id === state.game.you) || null);
const opponent = computed(() => state.game?.players.find((p) => p.id !== state.game.you) || null);

export function useGame() {
  return {
    state,
    me,
    opponent,
    savedName: () => storage.get(localStorage, NAME_KEY) || '',
    createRoom(name) {
      storage.set(localStorage, NAME_KEY, name);
      send({ type: 'create', name });
    },
    joinRoom(code, name) {
      storage.set(localStorage, NAME_KEY, name);
      send({ type: 'join', code, name });
    },
    startGame: () => send({ type: 'start' }),
    setMode: (mode) => send({ type: 'mode', mode }),
    chooseJokers: (jokers, ready) => send({ type: 'draft', jokers, ready }),
    bid: (amount) => send({ type: 'bid', amount }),
    pass: () => send({ type: 'pass' }),
    useJoker: (joker, target, target2 = '') => send({ type: 'joker', joker, target, target2 }),
    mg: (action, data = {}) => send({ type: 'mg', action, ...data }), // action dans le mini-jeu en cours
    market: (action, data = {}) => send({ type: 'market', action, ...data }), // supermarché étoilé
    rematch: () => send({ type: 'rematch' }),
    sendChat: (text) => send({ type: 'chat', text }),
    rps: (action, data = {}) => send({ type: 'rps', action, ...data }), // chifoumi du tchat
    leave() {
      if (!send({ type: 'leave' })) resetToHome();
    }
  };
}
