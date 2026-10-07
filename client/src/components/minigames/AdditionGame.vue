<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
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
const open = computed(() => !props.finished && v.value.stage === 'open');
const value = ref('');
const shake = ref(false);
const waiting = ref(false); // petite pénalité après une erreur
const input = ref(null);

const outcome = computed(() => {
  if (v.value.lastWinner === me.value.id) return { text: 'Le compte est bon ! +1 point', tone: 'win' };
  if (v.value.lastWinner) return { text: `${opponentName.value} a payé l'addition le premier`, tone: 'lose' };
  return { text: 'Personne n\'a trouvé le total…', tone: '' };
});

function focus() {
  nextTick(() => input.value?.focus());
}

watch(() => v.value.index, () => {
  value.value = '';
  focus();
});

// Mauvais total : le champ tremble, se vide, et reste bloqué un instant
watch(() => v.value.attempts[me.value.id], (now, before) => {
  if (now > before) {
    value.value = '';
    shake.value = false;
    waiting.value = true;
    nextTick(() => {
      shake.value = true;
    });
    setTimeout(() => {
      waiting.value = false;
      focus();
    }, v.value.cooldownMs);
  }
});

onMounted(focus);

function submit() {
  const text = value.value.trim();
  if (text && open.value && !waiting.value) mg('answer', { value: text });
}
</script>

<template>
  <p class="quiz-progress">Note {{ view.index + 1 }} / {{ view.total }}</p>
  <div :key="view.index" class="bill">
    <div v-for="(line, index) in view.lines" :key="index" class="bill-line">
      <span>{{ line.qty }} × {{ line.emoji }} {{ line.name }}</span>
      <span class="muted">{{ line.price }} € pièce</span>
    </div>
    <div class="bill-total">
      <span>Total</span>
      <strong>{{ view.answer ?? '???' }} €</strong>
    </div>
  </div>

  <template v-if="open">
    <form class="word-form" :class="{ shake }" @submit.prevent="submit" @animationend="shake = false">
      <input ref="input" v-model="value" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Total en €" autocomplete="off" :disabled="waiting" enterkeyhint="send" />
      <button class="btn btn-primary" type="submit" :disabled="!value.trim() || waiting">Valider</button>
    </form>
    <TimerBar label="Temps restant" :urgent-below="5" />
  </template>
  <p v-else class="mg-status" :class="outcome.tone">{{ outcome.text }}</p>

  <ScoreBoard :scores="view.scores" />
</template>
