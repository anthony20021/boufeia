<script setup>
import { computed, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';
import TimerBar from './TimerBar.vue';

const VEGGIES = ['🥕', '🥒', '🧅', '🍅', '🫑', '🥬'];

const { state, me, chop } = useGame();
const game = computed(() => state.game);
const minigame = computed(() => game.value.minigame);
const taps = ref(0);
const particles = ref([]);
let particleId = 0;

watch(() => game.value.phase, (phase) => {
  if (phase === 'minigame') taps.value = 0;
});

// Change de légume toutes les 10 coupes
const veggie = computed(() => VEGGIES[Math.floor(taps.value / 10) % VEGGIES.length]);

function onChop(event) {
  if (game.value.phase !== 'minigame') return;
  chop();
  taps.value++;
  const rect = event.currentTarget.getBoundingClientRect();
  const id = ++particleId;
  particles.value.push({ id, x: event.clientX - rect.left, y: event.clientY - rect.top });
  setTimeout(() => {
    particles.value = particles.value.filter((p) => p.id !== id);
  }, 700);
}

const ranking = computed(() => [...game.value.players].sort((a, b) => b.chops - a.chops));
const maxChops = computed(() => Math.max(1, ...game.value.players.map((p) => p.chops)));
const winners = computed(() => game.value.players.filter((p) => minigame.value?.winnerIds.includes(p.id)));
const iWon = computed(() => winners.value.some((p) => p.id === me.value.id));
</script>

<template>
  <section class="minigame card">
    <p class="stage-kicker">Mini-jeu · round {{ game.round }}</p>
    <h2 class="stage-title">🔪 La Découpe Express</h2>

    <template v-if="game.phase === 'minigame_intro'">
      <p class="stage-sub">
        Tapez le plus vite possible sur le légume pendant {{ minigame.durationSeconds }} secondes.
        Le meilleur commis empoche <strong class="bonus">+{{ minigame.bonus }} €</strong> !
      </p>
      <div class="intro-veggie bounce">🥕</div>
      <TimerBar label="Ça commence dans" />
    </template>

    <template v-else-if="game.phase === 'minigame'">
      <TimerBar label="Temps restant" :urgent-below="3" />
      <button class="chop-target" type="button" aria-label="Couper" @pointerdown.prevent="onChop">
        <span :key="taps" class="veggie">{{ veggie }}</span>
        <span
          v-for="particle in particles"
          :key="particle.id"
          class="particle"
          :style="{ left: `${particle.x}px`, top: `${particle.y}px` }"
        >🔪</span>
      </button>
      <p class="tap-count">{{ taps }} coupe{{ taps > 1 ? 's' : '' }}</p>
    </template>

    <template v-else>
      <div class="stage-emoji">{{ winners.length ? (iWon ? '🏅' : '😤') : '😴' }}</div>
      <p v-if="winners.length > 1" class="result-line">Égalité ! +{{ minigame.gain }} € chacun</p>
      <p v-else-if="winners.length" class="result-line" :class="iWon ? 'win' : 'lose'">
        {{ iWon ? 'Vous gagnez' : `${winners[0].name} gagne` }} <strong>+{{ minigame.gain }} €</strong>
      </p>
      <p v-else class="result-line">Personne n'a rien coupé…</p>
      <TimerBar label="Retour aux enchères dans" />
    </template>

    <div class="race">
      <div v-for="player in ranking" :key="player.id" class="race-row" :class="{ me: player.id === me.id }">
        <span class="race-name">{{ player.id === me.id ? 'Vous' : player.name }}</span>
        <div class="race-track">
          <div class="race-fill" :style="{ width: `${(player.chops / maxChops) * 100}%` }"></div>
        </div>
        <span class="race-count">{{ player.chops }}</span>
      </div>
    </div>
  </section>
</template>
