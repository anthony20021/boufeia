<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';
import { useNow } from '../composables/useNow.js';

const props = defineProps({
  label: { type: String, default: '' },
  urgentBelow: { type: Number, default: 0 }
});

const { state } = useGame();
const now = useNow();

const remaining = computed(() => (state.deadlineAt ? Math.max(0, state.deadlineAt - now.value) : 0));
const ratio = computed(() => (state.timerTotal ? Math.min(1, remaining.value / state.timerTotal) : 0));
const seconds = computed(() => Math.ceil(remaining.value / 1000));
const urgent = computed(() => props.urgentBelow > 0 && seconds.value <= props.urgentBelow);
</script>

<template>
  <div v-if="state.deadlineAt" class="timer" :class="{ urgent }">
    <div class="timer-track">
      <div class="timer-fill" :style="{ transform: `scaleX(${ratio})` }"></div>
    </div>
    <span class="timer-label">{{ label }} <strong>{{ seconds }} s</strong></span>
  </div>
</template>
