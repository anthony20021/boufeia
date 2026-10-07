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
const myTurn = computed(() => !props.finished && props.view.turn === me.value.id);
const canFlip = computed(() => myTurn.value && !props.view.locked && props.view.flipped.length < 2);

const status = computed(() => {
  if (props.view.locked) return 'Raté ! La main passe…';
  return myTurn.value ? 'À vous : retournez deux cartes' : `Au tour de ${opponent.value?.name}…`;
});

function flip(index) {
  if (canFlip.value && !props.view.cards[index].face) mg('flip', { index });
}
</script>

<template>
  <p v-if="!finished" class="mg-status" :class="{ mine: myTurn && !view.locked }">{{ status }}</p>
  <TimerBar v-if="!finished && !view.locked" :label="myTurn ? 'Votre tour' : 'Tour adverse'" :urgent-below="3" />

  <div class="memory-grid">
    <button
      v-for="(card, index) in view.cards"
      :key="index"
      type="button"
      class="memory-card"
      :class="{
        up: !!card.face,
        flipped: view.flipped.includes(index) && !card.owner,
        mine: card.owner === me.id,
        theirs: !!card.owner && card.owner !== me.id
      }"
      :disabled="!canFlip || !!card.face"
      :aria-label="card.face || 'Carte cachée'"
      @click="flip(index)"
    >
      <span v-if="card.face" class="memory-face">{{ card.face }}</span>
      <span v-else class="memory-back">🍴</span>
    </button>
  </div>

  <ScoreBoard :scores="view.scores" unit="paire" units="paires" :highlight="finished ? null : view.turn" />
</template>
