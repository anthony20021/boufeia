<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';

// Mode étoile : manche en cours et étoiles de chacun
const { state, me, opponent } = useGame();
const series = computed(() => state.game.series);
const rows = computed(() => [me.value, opponent.value].filter(Boolean).map((player) => {
  const stars = series.value.stars[player.id] || 0;
  return {
    id: player.id,
    label: player.id === me.value.id ? 'Vous' : player.name,
    full: '★'.repeat(stars),
    empty: '☆'.repeat(Math.max(0, series.value.target - stars))
  };
}));
</script>

<template>
  <div v-if="series" class="series-bar">
    <span class="series-manche">⭐ Manche {{ series.manche }}</span>
    <span v-for="row in rows" :key="row.id" class="series-player" :class="{ mine: row.id === me.id }">
      {{ row.label }}
      <span class="series-stars" :aria-label="`${row.full.length} étoile(s)`">{{ row.full }}<span class="series-empty">{{ row.empty }}</span></span>
    </span>
  </div>
</template>
