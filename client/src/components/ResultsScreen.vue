<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';
import PlateView from './PlateView.vue';

const { state, me, opponent, rematch, leave } = useGame();
const game = computed(() => state.game);
const results = computed(() => game.value.results);

// Vous d'abord, puis l'adversaire
const players = computed(() => [me.value, opponent.value].filter(Boolean));
const winners = computed(() => game.value.players.filter((p) => results.value?.winnerIds.includes(p.id)));
const isTie = computed(() => winners.value.length > 1);
const iWon = computed(() => !isTie.value && winners.value[0]?.id === me.value.id);
const opponentGone = computed(() => !!opponent.value?.left);

const banner = computed(() => {
  if (isTie.value) return '🤝 Égalité !';
  return iWon.value ? '🏆 Vous remportez la partie !' : `🏆 ${winners.value[0]?.name} remporte la partie`;
});

const imageStatus = (playerId) => game.value.imageStatus?.[playerId]?.status || 'skipped';
const imageError = (playerId) => game.value.imageStatus?.[playerId]?.message || '';
const fileName = (player) => `gennourriture-${player.name.replace(/[^\w-]+/g, '_')}.png`;
</script>

<template>
  <section class="results">
    <!-- Le juge réfléchit -->
    <template v-if="game.phase === 'judging'">
      <div class="card center-card">
        <div class="stage-emoji chef">👨‍🍳</div>
        <h2>Le Chef Gustave goûte vos plats…</h2>
        <p class="muted">Cela peut prendre une minute, le temps que le chef enfile son tablier.</p>
        <div class="spinner" aria-hidden="true"></div>
      </div>
      <div class="plates">
        <PlateView v-for="player in players" :key="player.id" :player="player" :theme="game.theme"
          :title="player.id === me.id ? 'Votre plat' : `Plat de ${player.name}`" />
      </div>
    </template>

    <!-- Verdict -->
    <template v-else-if="results">
      <div class="card center-card verdict-card" :class="{ win: iWon, tie: isTie }">
        <h2 class="banner">{{ banner }}</h2>
        <blockquote class="verdict">« {{ results.verdict }} »<cite>Chef Gustave</cite></blockquote>
        <p v-if="results.notice" class="notice">{{ results.notice }}</p>
      </div>

      <div class="dishes">
        <article
          v-for="player in players"
          :key="player.id"
          class="dish card"
          :class="{ winner: results.winnerIds.includes(player.id) }"
        >
          <div class="dish-photo">
            <img v-if="state.images[player.id]" :src="state.images[player.id]" :alt="results.dishes[player.id]?.name" />
            <div v-else-if="imageStatus(player.id) === 'pending'" class="photo-placeholder">
              <div class="spinner"></div>
              <span>📸 Le photographe shoote le plat…</span>
            </div>
            <div v-else-if="imageStatus(player.id) === 'queued'" class="photo-placeholder">
              <span>⏳ En attente du photographe…</span>
            </div>
            <div v-else-if="imageStatus(player.id) === 'error'" class="photo-placeholder error">
              <span>📷 Photo indisponible</span>
              <small>{{ imageError(player.id) }}</small>
            </div>
            <div v-else class="photo-placeholder">
              <span class="photo-emoji">{{ game.theme.emoji }}</span>
            </div>
            <span v-if="results.winnerIds.includes(player.id)" class="winner-ribbon">🏆</span>
          </div>

          <div class="dish-body">
            <p class="dish-owner">{{ player.id === me.id ? 'Votre plat' : `Plat de ${player.name}` }}</p>
            <h3 class="dish-name">{{ results.dishes[player.id]?.name }}</h3>
            <div class="score"><strong>{{ results.dishes[player.id]?.score }}</strong>/20</div>
            <p class="dish-comment">{{ results.dishes[player.id]?.comment }}</p>
            <ul v-if="player.plate.length" class="chips">
              <li v-for="item in player.plate" :key="item.id" class="chip" :class="`cat-${item.category}`">
                <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
              </li>
            </ul>
            <p v-else class="muted">Assiette vide : {{ game.theme.base }}, rien d'autre.</p>
            <div class="dish-footer">
              <span class="muted">Reste {{ player.budget }} € sur {{ player.startBudget }} €</span>
              <a v-if="state.images[player.id]" class="btn btn-ghost btn-sm" :href="state.images[player.id]" :download="fileName(player)">Télécharger</a>
            </div>
          </div>
        </article>
      </div>

      <div class="end-actions">
        <p v-if="opponentGone" class="muted">{{ opponent.name }} a quitté la partie.</p>
        <template v-else>
          <button class="btn btn-primary btn-lg" :disabled="me.rematch" @click="rematch">
            {{ me.rematch ? 'Prêt ! En attente de l\'adversaire…' : '🔁 Rejouer' }}
          </button>
          <p v-if="opponent?.rematch && !me.rematch" class="muted">{{ opponent.name }} veut une revanche !</p>
        </template>
        <button class="btn btn-ghost" @click="leave">Quitter</button>
      </div>
    </template>
  </section>
</template>
