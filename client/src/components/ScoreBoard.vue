<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';

const props = defineProps({
  scores: { type: Object, required: true },
  unit: { type: String, default: 'point' },
  units: { type: String, default: 'points' },
  highlight: { type: String, default: null } // joueur dont c'est le tour (ou qui a la main)
});

const { me, opponent } = useGame();
const rows = computed(() => [me.value, opponent.value].filter(Boolean).map((player) => ({
  id: player.id,
  label: player.id === me.value.id ? 'Vous' : player.name,
  score: props.scores[player.id] ?? 0,
  mine: player.id === me.value.id
})));
</script>

<template>
  <div class="scoreboard">
    <div v-for="row in rows" :key="row.id" class="score-pill" :class="{ mine: row.mine, active: row.id === highlight }">
      <span class="score-name">{{ row.label }}</span>
      <strong>{{ row.score }}</strong>
      <span class="score-unit">{{ row.score > 1 ? units : unit }}</span>
    </div>
  </div>
</template>
