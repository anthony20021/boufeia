<script setup>
defineProps({
  player: { type: Object, required: true },
  isMe: Boolean,
  leading: Boolean,
  passed: Boolean
});
</script>

<template>
  <div class="player-card" :class="{ me: isMe, leading, passed, offline: !player.connected }">
    <span class="avatar">{{ player.name.charAt(0).toUpperCase() }}</span>
    <div class="player-info">
      <div class="player-name">
        {{ player.name }}<span v-if="isMe" class="you-tag">vous</span>
      </div>
      <div class="player-meta">
        <span v-if="!player.connected" class="badge badge-off">{{ player.left ? 'parti' : 'déconnecté' }}</span>
        <span v-else-if="leading" class="badge badge-lead">en tête</span>
        <span v-else-if="passed" class="badge">a passé</span>
        <span>{{ player.plate.length }} ingrédient{{ player.plate.length > 1 ? 's' : '' }}</span>
        <span v-if="player.jokersTotal" class="meta-joker" :title="`${player.jokersLeft} joker(s) en main`">🃏 {{ player.jokersLeft }}</span>
        <span v-if="player.shield" class="badge badge-shield" title="Bouclier levé">🛡️ bouclier</span>
        <span v-if="player.discount" class="badge badge-sale" title="Prochain aliment à moitié prix">🏷️ -50 %</span>
      </div>
    </div>
    <div class="budget">
      <strong>{{ player.budget }} €</strong>
      <small>départ {{ player.startBudget }} €</small>
    </div>
  </div>
</template>
