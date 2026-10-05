<script setup>
defineProps({
  player: { type: Object, required: true },
  theme: { type: Object, required: true },
  title: { type: String, required: true }
});
</script>

<template>
  <div class="plate card">
    <h3>{{ theme.emoji }} {{ title }}</h3>
    <transition-group v-if="player.plate.length" tag="ul" name="chip" class="chips">
      <li v-for="item in player.plate" :key="item.id" class="chip" :class="`cat-${item.category}`">
        <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
      </li>
    </transition-group>
    <p v-else class="muted">Pour l'instant : {{ theme.base }}, et c'est tout…</p>
  </div>
</template>
