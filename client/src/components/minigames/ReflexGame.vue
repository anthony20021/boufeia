<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGame } from '../../composables/useGame.js';
import ScoreBoard from '../ScoreBoard.vue';

const props = defineProps({
  view: { type: Object, required: true },
  finished: Boolean
});

const { me, opponent, mg } = useGame();
const v = computed(() => props.view);
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');

const point = computed(() => {
  const last = v.value.lastPoint;
  if (!last) return { emoji: '⏳', text: '' };
  const mine = last.winnerId === me.value.id;
  if (last.reason === 'early') {
    return last.byId === me.value.id
      ? { emoji: '😬', text: `Faux départ ! Point pour ${opponentName.value}` }
      : { emoji: '😏', text: `Faux départ de ${opponentName.value} : point pour vous` };
  }
  if (last.reason === 'fast') {
    return mine
      ? { emoji: '⚡', text: `Point pour vous ! (${last.reactionMs} ms)` }
      : { emoji: '🐢', text: `${opponentName.value} a été plus rapide (${last.reactionMs} ms)` };
  }
  return { emoji: '😴', text: 'Personne n\'a tapé…' };
});

function tap() {
  if (!props.finished) mg('tap');
}

// Espace ou Entrée sur ordinateur
function onKey(event) {
  if (event.target instanceof HTMLInputElement || event.repeat) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    tap();
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <p class="mg-status">Manche {{ view.round }} · premier à {{ view.target }} points</p>
  <button type="button" class="reflex-pad" :class="`is-${view.stage}`" :disabled="finished" @pointerdown.prevent="tap">
    <template v-if="view.stage === 'wait'">
      <span class="reflex-emoji">🍳</span>
      <span>Attendez la flamme…</span>
    </template>
    <template v-else-if="view.stage === 'go'">
      <span class="reflex-emoji">🔥</span>
      <span>TAPEZ !</span>
    </template>
    <template v-else>
      <span class="reflex-emoji">{{ point.emoji }}</span>
      <span class="reflex-text">{{ point.text }}</span>
    </template>
  </button>
  <ScoreBoard :scores="view.scores" />
</template>
