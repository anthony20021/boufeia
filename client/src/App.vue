<script setup>
import { computed } from 'vue';
import { useGame } from './composables/useGame.js';
import HomeScreen from './components/HomeScreen.vue';
import LobbyScreen from './components/LobbyScreen.vue';
import DraftScreen from './components/DraftScreen.vue';
import MarketScreen from './components/MarketScreen.vue';
import AuctionScreen from './components/AuctionScreen.vue';
import MiniGameScreen from './components/MiniGameScreen.vue';
import ResultsScreen from './components/ResultsScreen.vue';
import ChatPanel from './components/ChatPanel.vue';

const { state, leave } = useGame();
const game = computed(() => state.game);
const phase = computed(() => game.value?.phase);

const connectionLabel = computed(() => ({
  open: 'Connecté',
  connecting: 'Connexion…',
  closed: 'Reconnexion…'
}[state.connection]));
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-emoji">🍔</span>
        <span class="brand-name">GenNourriture</span>
      </div>
      <div class="topbar-right">
        <span v-if="game" class="code-chip" title="Code de la partie">{{ game.code }}</span>
        <span class="connection" :class="state.connection">
          <span class="dot"></span>{{ connectionLabel }}
        </span>
      </div>
    </header>

    <main class="content">
      <HomeScreen v-if="!game" />
      <LobbyScreen v-else-if="phase === 'lobby'" />
      <DraftScreen v-else-if="phase === 'draft'" />
      <MarketScreen v-else-if="phase === 'shop' || phase === 'compose'" />
      <MiniGameScreen v-else-if="phase.startsWith('minigame')" />
      <ResultsScreen v-else-if="phase === 'judging' || phase === 'results'" />
      <section v-else-if="phase === 'abandoned'" class="card center-card">
        <div class="stage-emoji">🚪</div>
        <h2>Partie interrompue</h2>
        <p class="muted">{{ game.abandonedReason }}</p>
        <button class="btn btn-primary" @click="leave">Retour à l'accueil</button>
      </section>
      <AuctionScreen v-else />
    </main>

    <ChatPanel v-if="game" />

    <transition name="flash">
      <div v-if="state.flash" :key="state.flash" class="flash" role="status">{{ state.flash }}</div>
    </transition>

    <transition name="toast">
      <div v-if="state.error" class="toast" role="alert">{{ state.error }}</div>
    </transition>
  </div>
</template>
