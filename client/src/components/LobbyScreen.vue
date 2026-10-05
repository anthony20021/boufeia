<script setup>
import { computed, ref } from 'vue';
import { useGame } from '../composables/useGame.js';

const { state, me, startGame, leave } = useGame();
const game = computed(() => state.game);
const isHost = computed(() => game.value.hostId === me.value?.id);
const ready = computed(() => game.value.players.length === 2 && game.value.players.every((p) => p.connected));
const copied = ref(false);

async function copyCode() {
  try {
    await navigator.clipboard.writeText(game.value.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch {
    // presse-papiers indisponible en HTTP sur le réseau local : le code reste affiché
  }
}
</script>

<template>
  <section class="lobby">
    <div class="card center-card">
      <p class="stage-kicker">Code de la partie</p>
      <button class="room-code" title="Copier le code" @click="copyCode">{{ game.code }}</button>
      <p class="muted">{{ copied ? 'Code copié !' : 'Donnez ce code à votre adversaire pour qu\'il vous rejoigne.' }}</p>

      <ul class="lobby-players">
        <li v-for="player in game.players" :key="player.id" :class="{ offline: !player.connected }">
          <span class="avatar">{{ player.name.charAt(0).toUpperCase() }}</span>
          <span class="lobby-name">{{ player.name }}</span>
          <span v-if="player.id === game.hostId" class="badge">hôte</span>
          <span v-if="player.id === me?.id" class="badge badge-you">vous</span>
          <span v-if="!player.connected" class="badge badge-off">déconnecté</span>
        </li>
        <li v-if="game.players.length < 2" class="waiting">
          <span class="avatar avatar-empty">?</span>
          <span class="lobby-name muted">En attente d'un adversaire<span class="dots"></span></span>
        </li>
      </ul>

      <button v-if="isHost" class="btn btn-primary btn-lg btn-block" :disabled="!ready" @click="startGame">
        {{ ready ? 'Lancer la partie 🔥' : 'En attente du 2e joueur…' }}
      </button>
      <p v-else class="muted">L'hôte va lancer la partie…</p>

      <button class="btn btn-ghost" @click="leave">Quitter</button>
    </div>
  </section>
</template>
