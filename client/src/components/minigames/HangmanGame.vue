<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useGame } from '../../composables/useGame.js';
import TimerBar from '../TimerBar.vue';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const props = defineProps({
  view: { type: Object, required: true },
  finished: Boolean
});

const { me, opponent, mg } = useGame();
const v = computed(() => props.view);
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');
const isChooser = computed(() => v.value.chooserId === me.value.id);
const isGuesser = computed(() => v.value.guesserId === me.value.id);
const canGuess = computed(() => !props.finished && isGuesser.value && v.value.stage === 'guess');
const lives = computed(() => Math.max(0, v.value.maxErrors - v.value.errors));
const word = ref('');

const status = computed(() => {
  const view = v.value;
  if (view.stage === 'done') {
    if (isGuesser.value) return view.found ? { text: 'Bravo, mot trouvé !', tone: 'win' } : { text: 'Pendu !', tone: 'lose' };
    return view.found ? { text: `${opponentName.value} a trouvé votre mot…`, tone: 'lose' } : { text: 'Votre mot a résisté !', tone: 'win' };
  }
  return isGuesser.value
    ? { text: 'Trouvez le mot, lettre par lettre', tone: '' }
    : { text: `${opponentName.value} cherche votre mot…`, tone: '' };
});

function submitWord() {
  const value = word.value.trim();
  if (value) mg('word', { word: value });
}

function guess(letter) {
  if (canGuess.value && !v.value.guessed.includes(letter)) mg('letter', { letter });
}

// Clavier physique pour le devineur (sauf quand on écrit dans le tchat)
function onKey(event) {
  if (event.target instanceof HTMLInputElement || event.ctrlKey || event.metaKey || event.altKey) return;
  const letter = event.key.length === 1 ? event.key.toUpperCase() : '';
  if (/^[A-Z]$/.test(letter)) guess(letter);
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- Choix du mot secret -->
  <template v-if="view.stage === 'choose'">
    <template v-if="isChooser">
      <p class="mg-status mine">Choisissez un mot secret 🤫</p>
      <form class="word-form" @submit.prevent="submitWord">
        <input v-model="word" maxlength="12" placeholder="Ex. : FROMAGE" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="send" />
        <button class="btn btn-primary" type="submit" :disabled="word.trim().length < 4">Valider</button>
      </form>
      <p class="muted small">Un seul mot de 4 à 12 lettres. En panne d'idée ?</p>
      <div class="suggestions">
        <button v-for="suggestion in view.suggestions" :key="suggestion" type="button" class="btn btn-outline btn-sm" @click="mg('word', { word: suggestion })">
          {{ suggestion }}
        </button>
      </div>
      <TimerBar label="Mot tiré au hasard dans" :urgent-below="5" />
    </template>
    <template v-else>
      <div class="stage-emoji">🤫</div>
      <p class="mg-status">{{ opponentName }} choisit un mot secret…</p>
      <TimerBar label="Temps restant" />
    </template>
  </template>

  <!-- Partie -->
  <template v-else>
    <!-- Potence dessinée au fil des erreurs (8 au maximum) -->
    <svg class="gallows" viewBox="0 0 120 120" aria-hidden="true">
      <line class="part" :class="{ on: view.errors > 0 }" x1="10" y1="112" x2="70" y2="112" />
      <line class="part" :class="{ on: view.errors > 1 }" x1="25" y1="112" x2="25" y2="10" />
      <line class="part" :class="{ on: view.errors > 2 }" x1="25" y1="10" x2="82" y2="10" />
      <line class="part" :class="{ on: view.errors > 3 }" x1="82" y1="10" x2="82" y2="24" />
      <circle class="part" :class="{ on: view.errors > 4 }" cx="82" cy="34" r="10" />
      <line class="part" :class="{ on: view.errors > 5 }" x1="82" y1="44" x2="82" y2="74" />
      <path class="part" :class="{ on: view.errors > 6 }" d="M82 52 L68 64 M82 52 L96 64" />
      <path class="part" :class="{ on: view.errors > 7 }" d="M82 74 L70 96 M82 74 L94 96" />
    </svg>
    <p class="lives" :aria-label="`${lives} vies restantes`">{{ '❤️'.repeat(lives) }}{{ '🖤'.repeat(view.errors) }}</p>

    <div class="word-pattern">
      <span v-for="(letter, index) in view.pattern" :key="index" class="letter-box" :class="{ missing: !letter && view.word }">
        {{ letter || (view.word ? view.word[index] : '') }}
      </span>
    </div>
    <p v-if="view.auto && view.stage !== 'done'" class="muted small">Mot tiré au hasard (temps écoulé)</p>
    <p class="mg-status" :class="status.tone">{{ status.text }}</p>
    <TimerBar v-if="!finished && view.stage === 'guess'" label="Temps restant" :urgent-below="10" />

    <div v-if="canGuess" class="keyboard">
      <button
        v-for="letter in ALPHABET"
        :key="letter"
        type="button"
        class="key"
        :class="{ hit: view.guessed.includes(letter) && !view.wrong.includes(letter), miss: view.wrong.includes(letter) }"
        :disabled="view.guessed.includes(letter)"
        @click="guess(letter)"
      >{{ letter }}</button>
    </div>
    <p v-else-if="view.wrong.length" class="muted">Lettres ratées : {{ view.wrong.join(' ') }}</p>
  </template>
</template>
