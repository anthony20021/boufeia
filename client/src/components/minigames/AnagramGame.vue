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
const guess = ref('');
const shake = ref(false);
const input = ref(null);
const opponentMisses = computed(() => (opponent.value ? v.value.attempts[opponent.value.id] || 0 : 0));

const outcome = computed(() => {
  if (v.value.lastWinner === me.value.id) return { text: 'Trouvé ! +1 point', tone: 'win' };
  if (v.value.lastWinner) return { text: `${opponentName.value} a trouvé le mot`, tone: 'lose' };
  return { text: 'Personne n\'a trouvé…', tone: '' };
});

function focus() {
  nextTick(() => input.value?.focus());
}

// Nouveau mot : champ vidé
watch(() => v.value.index, () => {
  guess.value = '';
  focus();
});

// Mauvaise réponse : le champ tremble
watch(() => v.value.attempts[me.value.id], (now, before) => {
  if (now > before) {
    shake.value = false;
    nextTick(() => {
      shake.value = true;
    });
  }
});

onMounted(focus);

function submit() {
  const text = guess.value.trim();
  if (text && open.value) mg('guess', { text });
}
</script>

<template>
  <p class="quiz-progress">Mot {{ view.index + 1 }} / {{ view.total }}</p>
  <div :key="view.index" class="anagram-letters">
    <span v-for="(letter, index) in view.letters" :key="index" class="letter-tile" :style="{ animationDelay: `${index * 40}ms` }">
      {{ letter }}
    </span>
  </div>

  <template v-if="open">
    <p v-if="view.hint" class="mg-note">💡 Le mot commence par <strong>{{ view.hint }}</strong></p>
    <form class="word-form" :class="{ shake }" @submit.prevent="submit" @animationend="shake = false">
      <input ref="input" v-model="guess" maxlength="20" placeholder="Votre réponse…" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="send" />
      <button class="btn btn-primary" type="submit" :disabled="!guess.trim()">Valider</button>
    </form>
    <p v-if="opponentMisses" class="muted small">{{ opponentName }} : {{ opponentMisses }} essai{{ opponentMisses > 1 ? 's' : '' }} raté{{ opponentMisses > 1 ? 's' : '' }}</p>
    <TimerBar label="Temps restant" :urgent-below="5" />
  </template>
  <template v-else-if="view.word">
    <p class="anagram-answer">{{ view.word }}</p>
    <p class="mg-status" :class="outcome.tone">{{ outcome.text }}</p>
  </template>

  <ScoreBoard :scores="view.scores" />
</template>
