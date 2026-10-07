<script setup>
import { computed, ref } from 'vue';
import { useGame } from '../../composables/useGame.js';
import TimerBar from '../TimerBar.vue';

const VEGGIES = ['🥕', '🥒', '🧅', '🍅', '🫑', '🥬'];

const props = defineProps({
  view: { type: Object, required: true },
  finished: Boolean
});

const { state, me, mg } = useGame();
const taps = ref(0);
const particles = ref([]);
let particleId = 0;

// Change de légume toutes les 10 coupes
const veggie = computed(() => VEGGIES[Math.floor(taps.value / 10) % VEGGIES.length]);

function onChop(event) {
  if (props.finished) return;
  mg('chop');
  taps.value++;
  const rect = event.currentTarget.getBoundingClientRect();
  const id = ++particleId;
  particles.value.push({ id, x: event.clientX - rect.left, y: event.clientY - rect.top });
  setTimeout(() => {
    particles.value = particles.value.filter((p) => p.id !== id);
  }, 700);
}

const counts = computed(() => props.view.counts);
const ranking = computed(() => [...state.game.players].sort((a, b) => (counts.value[b.id] || 0) - (counts.value[a.id] || 0)));
const maxChops = computed(() => Math.max(1, ...Object.values(counts.value)));
</script>

<template>
  <template v-if="!finished">
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

  <div class="race">
    <div v-for="player in ranking" :key="player.id" class="race-row" :class="{ me: player.id === me.id }">
      <span class="race-name">{{ player.id === me.id ? 'Vous' : player.name }}</span>
      <div class="race-track">
        <div class="race-fill" :style="{ width: `${((counts[player.id] || 0) / maxChops) * 100}%` }"></div>
      </div>
      <span class="race-count">{{ counts[player.id] || 0 }}</span>
    </div>
  </div>
</template>
