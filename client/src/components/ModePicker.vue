<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';

// Choix du mode de jeu : l'hôte choisit, l'adversaire voit le choix en direct
const { state, me, setMode } = useGame();
const game = computed(() => state.game);
const isHost = computed(() => game.value.hostId === me.value?.id);
const modes = computed(() => game.value.modes || []);
</script>

<template>
  <div class="mode-picker">
    <p class="mode-picker-title">{{ isHost ? 'Choisissez le mode de jeu' : 'Mode de jeu choisi par l\'hôte' }}</p>
    <div class="mode-grid">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="mode-card"
        :class="{ selected: game.mode === mode.id }"
        :disabled="!isHost"
        :aria-pressed="game.mode === mode.id"
        @click="setMode(mode.id)"
      >
        <span class="mode-emoji">{{ mode.emoji }}</span>
        <strong>{{ mode.name }}</strong>
        <span class="mode-desc">{{ mode.description }}</span>
      </button>
    </div>
  </div>
</template>
