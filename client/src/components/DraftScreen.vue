<script setup>
import { computed, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';
import TimerBar from './TimerBar.vue';
import SeriesBar from './SeriesBar.vue';

const { state, me, opponent, chooseJokers } = useGame();
const game = computed(() => state.game);
const draft = computed(() => game.value.draft);
const picks = ref([...draft.value.picks]);
const ready = computed(() => draft.value.ready.includes(me.value.id));
const opponentReady = computed(() => !!opponent.value && draft.value.ready.includes(opponent.value.id));
const full = computed(() => picks.value.length >= draft.value.count);

// Revanche : la sélection repart de celle du serveur (vide)
watch(() => game.value.gameSeq, () => {
  picks.value = [...draft.value.picks];
});

function toggle(id) {
  if (ready.value) return;
  if (picks.value.includes(id)) picks.value = picks.value.filter((p) => p !== id);
  else if (!full.value) picks.value = [...picks.value, id];
  else return;
  chooseJokers(picks.value, false); // sélection provisoire : complétée au hasard si le temps s'écoule
}

function confirm() {
  if (picks.value.length === draft.value.count) chooseJokers(picks.value, true);
}
</script>

<template>
  <section class="draft">
    <SeriesBar />
    <div class="card center-card draft-head">
      <p class="stage-kicker">Ce soir, on cuisine…</p>
      <div class="draft-emoji bounce">{{ game.theme.emoji }}</div>
      <h2 class="stage-title">{{ game.theme.name }}</h2>
      <p class="stage-sub">
        Budget : <strong>{{ me.startBudget }} €</strong> chacun. Choisissez en secret <strong>{{ draft.count }} jokers</strong> :
        chacun s'utilise une fois, au moment de votre choix.
      </p>
      <TimerBar label="Choix des jokers" :urgent-below="10" />
    </div>

    <div class="joker-grid">
      <button
        v-for="joker in draft.catalog"
        :key="joker.id"
        type="button"
        class="joker-card"
        :class="{ picked: picks.includes(joker.id) }"
        :disabled="ready || (full && !picks.includes(joker.id))"
        :aria-pressed="picks.includes(joker.id)"
        @click="toggle(joker.id)"
      >
        <span class="joker-card-emoji">{{ joker.emoji }}</span>
        <strong>{{ joker.name }}</strong>
        <span class="joker-card-desc">{{ joker.description }}</span>
        <span v-if="picks.includes(joker.id)" class="joker-check">✓</span>
      </button>
    </div>

    <div class="draft-actions">
      <button class="btn btn-primary btn-lg" :disabled="ready || picks.length !== draft.count" @click="confirm">
        {{ ready ? 'Jokers validés ✓' : `Valider mes jokers (${picks.length}/${draft.count})` }}
      </button>
      <p class="muted small">
        <template v-if="opponent">{{ opponentReady ? `${opponent.name} a validé ses jokers !` : `${opponent.name} choisit ses jokers…` }}</template>
        À la fin du temps, les jokers manquants sont tirés au hasard.
      </p>
    </div>
  </section>
</template>
