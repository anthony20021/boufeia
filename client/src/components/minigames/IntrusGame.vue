<script setup>
import { computed } from 'vue';
import { useGame } from '../../composables/useGame.js';
import TimerBar from '../TimerBar.vue';
import ScoreBoard from '../ScoreBoard.vue';

const props = defineProps({
  view: { type: Object, required: true },
  finished: Boolean
});

const { me, opponent, mg } = useGame();
const v = computed(() => props.view);
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');
const lockedOut = computed(() => v.value.locked.includes(me.value.id));
const canPick = computed(() => !props.finished && v.value.stage === 'play' && !lockedOut.value);

const status = computed(() => {
  if (v.value.stage === 'point') {
    const winnerId = v.value.lastPoint?.winnerId;
    if (winnerId === me.value.id) return { text: 'Bien vu ! +1 point', tone: 'win' };
    if (winnerId) return { text: `${opponentName.value} l'a repéré avant vous`, tone: 'lose' };
    return { text: 'Personne ne l\'a trouvé…', tone: '' };
  }
  if (lockedOut.value) return { text: 'Raté ! Bloqué jusqu\'à la grille suivante', tone: 'lose' };
  return { text: 'Trouvez l\'aliment différent !', tone: '' };
});

function pick(index) {
  if (canPick.value) mg('pick', { index });
}
</script>

<template>
  <p class="mg-status">Grille {{ view.round }} · premier à {{ view.target }} points</p>
  <TimerBar v-if="!finished && view.stage === 'play'" label="Temps restant" :urgent-below="3" />
  <div class="intrus-grid" :class="{ locked: lockedOut }">
    <button
      v-for="(emoji, index) in view.grid"
      :key="`${view.round}-${index}`"
      type="button"
      class="intrus-cell"
      :class="{ odd: view.stage === 'point' && view.lastPoint?.odd === index }"
      :disabled="!canPick"
      @pointerdown.prevent="pick(index)"
    >{{ emoji }}</button>
  </div>
  <p class="mg-status" :class="status.tone">{{ status.text }}</p>
  <ScoreBoard :scores="view.scores" />
</template>
