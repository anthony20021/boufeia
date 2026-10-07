<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useGame } from '../../composables/useGame.js';
import TimerBar from '../TimerBar.vue';
import ScoreBoard from '../ScoreBoard.vue';

const LETTERS = ['A', 'B', 'C', 'D'];

const props = defineProps({
  view: { type: Object, required: true },
  finished: Boolean
});

const { me, opponent, mg } = useGame();
const v = computed(() => props.view);
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');
const iHaveHand = computed(() => !props.finished && v.value.stage === 'answer' && v.value.hand === me.value.id);
const canBuzz = computed(() => !props.finished && v.value.stage === 'open' && !v.value.tried.includes(me.value.id));

const status = computed(() => {
  const view = v.value;
  if (view.stage === 'reveal') {
    if (view.lastWinner === me.value.id) return { text: 'Bonne réponse ! +1 point', tone: 'win' };
    if (view.lastWinner) return { text: `${opponentName.value} marque le point`, tone: 'lose' };
    return { text: 'Personne n\'a trouvé…', tone: '' };
  }
  if (view.stage === 'answer') {
    const second = view.tried.length > 0; // la main est passée après une erreur
    if (view.hand === me.value.id) return { text: second ? `Raté pour ${opponentName.value} : à vous !` : 'À vous ! Choisissez une réponse', tone: 'win' };
    return { text: second ? `Raté… ${opponentName.value} a la main` : `${opponentName.value} a buzzé !`, tone: 'lose' };
  }
  return { text: view.tried.includes(me.value.id) ? 'Vous avez déjà répondu' : '', tone: '' };
});

const timerLabel = computed(() => {
  if (v.value.stage === 'open') return 'Buzzer ouvert';
  if (v.value.stage === 'answer') return iHaveHand.value ? 'Répondez vite !' : 'Temps de réponse';
  return 'Question suivante dans';
});

function buzz() {
  if (canBuzz.value) mg('buzz');
}

function answer(index) {
  if (iHaveHand.value && !v.value.excluded.includes(index)) mg('answer', { option: index });
}

// Clavier : espace pour buzzer, 1-4 ou A-D pour répondre
function onKey(event) {
  if (event.target instanceof HTMLInputElement || event.repeat) return;
  if (event.key === ' ') {
    if (canBuzz.value) event.preventDefault();
    return buzz();
  }
  const key = event.key.toUpperCase();
  const index = '1234'.includes(key) ? Number(key) - 1 : LETTERS.indexOf(key);
  if (index >= 0 && index < v.value.options.length) answer(index);
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <p class="quiz-progress">Question {{ view.index + 1 }} / {{ view.total }}</p>
  <h3 :key="view.index" class="quiz-question">{{ view.question }}</h3>
  <TimerBar v-if="!finished" :label="timerLabel" :urgent-below="view.stage === 'answer' ? 2 : 3" />

  <button v-if="canBuzz" type="button" class="buzzer" @pointerdown.prevent="buzz">BUZZ !</button>
  <p v-else class="mg-status" :class="status.tone">{{ status.text }}</p>

  <div class="quiz-options">
    <button
      v-for="(option, index) in view.options"
      :key="`${view.index}-${index}`"
      type="button"
      class="quiz-option"
      :class="{ correct: view.answer === index, wrong: view.excluded.includes(index), active: iHaveHand }"
      :disabled="!iHaveHand || view.excluded.includes(index)"
      @click="answer(index)"
    >
      <span class="quiz-letter">{{ LETTERS[index] }}</span>{{ option }}
    </button>
  </div>

  <ScoreBoard :scores="view.scores" :highlight="view.hand" />
  <p class="quiz-source muted">{{ view.source === 'ia' ? '🤖 Questions écrites par le Chef IA' : '📚 Questions de la maison' }}</p>
</template>
