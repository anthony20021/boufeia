<script setup>
import { computed, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';
import PlayerCard from './PlayerCard.vue';
import PlateView from './PlateView.vue';
import TimerBar from './TimerBar.vue';
import JokerBar from './JokerBar.vue';
import SeriesBar from './SeriesBar.vue';

const { state, me, opponent, bid, pass } = useGame();
const game = computed(() => state.game);
const auction = computed(() => game.value.auction);
const result = computed(() => game.value.lastResult);

const playerById = (id) => game.value.players.find((p) => p.id === id) || null;
const minBid = computed(() => (auction.value?.bid || 0) + 1);
const iLead = computed(() => !!auction.value && auction.value.leaderId === me.value.id);
const iPassed = computed(() => !!auction.value?.passed.includes(me.value.id));
const opponentLeads = computed(() => !!auction.value && !!opponent.value && auction.value.leaderId === opponent.value.id);
const opponentPassed = computed(() => !!auction.value && !!opponent.value && auction.value.passed.includes(opponent.value.id));
const opponentBroke = computed(() => !!auction.value && !auction.value.leaderId && opponentPassed.value && !iPassed.value);
const leader = computed(() => (auction.value?.leaderId ? playerById(auction.value.leaderId) : null));
const resultWinner = computed(() => (result.value?.winnerId ? playerById(result.value.winnerId) : null));

// Boutons rapides : mise minimale, +1, +4 (dans la limite du budget)
const quickBids = computed(() => {
  const base = minBid.value;
  return [...new Set([base, base + 1, base + 4])].filter((value) => value <= me.value.budget);
});

const customBid = ref(1);
watch(() => [auction.value?.item.id, minBid.value], () => {
  customBid.value = minBid.value;
}, { immediate: true });

function submitCustom() {
  const value = Math.floor(Number(customBid.value));
  if (value >= minBid.value && value <= me.value.budget) bid(value);
}

// Le serveur indique ce qui suit : enchère, mini-jeu (prévu ou lancé par un joker) ou jugement
const nextLabel = computed(() => ({
  judging: 'Le chef arrive dans',
  minigame: 'Mini-jeu dans'
}[game.value.upcoming] || (game.value.phase === 'intro' ? 'Premier aliment dans' : 'Prochain aliment dans')));

const logEntries = computed(() => [...game.value.log].reverse());
</script>

<template>
  <section class="auction-screen">
    <SeriesBar />
    <div class="round-header">
      <span class="pill pill-strong">Round {{ Math.max(game.round, 1) }} / {{ game.totalRounds }}</span>
      <span class="pill">{{ game.theme.emoji }} {{ game.theme.name }}</span>
      <span v-if="game.gameMode === 'blind'" class="pill pill-soft">🙈 À l'aveugle</span>
      <span v-if="game.round < game.minigameRound" class="pill pill-soft">🎮 Mini-jeu au round {{ game.minigameRound }}</span>
    </div>

    <div class="versus">
      <PlayerCard :player="me" is-me :leading="iLead" :passed="iPassed" />
      <span class="vs">VS</span>
      <PlayerCard v-if="opponent" :player="opponent" :leading="opponentLeads" :passed="opponentPassed" />
    </div>

    <div class="stage card">
      <!-- Annonce du plat -->
      <template v-if="game.phase === 'intro'">
        <p class="stage-kicker">Ce soir, on cuisine…</p>
        <div class="stage-emoji bounce">{{ game.theme.emoji }}</div>
        <h2 class="stage-title">{{ game.theme.name }}</h2>
        <p class="stage-sub">Base fournie : {{ game.theme.base }}. À vous de gagner la garniture !</p>
        <p v-if="game.gameMode === 'blind'" class="mg-note">🙈 Un aliment sur deux sera un mystère : on ne le découvre qu'après l'avoir payé.</p>
        <TimerBar :label="nextLabel" />
      </template>

      <!-- Enchère en cours -->
      <template v-else-if="game.phase === 'auction' && auction">
        <p class="stage-kicker">{{ auction.item.categoryLabel }}</p>
        <div :key="auction.item.id" class="stage-emoji pop" :class="{ mystery: auction.item.mystery }">{{ auction.item.emoji }}</div>
        <h2 class="stage-title">{{ auction.item.name }}</h2>
        <p class="stage-sub">{{ auction.item.mystery ? 'Personne ne sait ce que c\'est… Qui tente sa chance ?' : `Qui le veut dans ${game.theme.possessive} ?` }}</p>

        <div :key="auction.bid" class="current-bid" :class="{ mine: iLead, theirs: opponentLeads }">
          <template v-if="leader">
            <strong>{{ auction.bid }} €</strong>
            <span>{{ iLead ? 'vous menez' : `${leader.name} mène` }}</span>
          </template>
          <template v-else>Aucune offre · départ à 1 €</template>
        </div>

        <div class="bid-controls">
          <p v-if="opponentBroke" class="status-msg success">{{ opponent.name }} n'a plus d'argent : misez pour prendre l'aliment, ou passez pour le lui laisser gratuitement (0 €).</p>
          <p v-if="iPassed" class="status-msg">Vous avez passé sur cet aliment.</p>
          <p v-else-if="iLead" class="status-msg success">Vous menez avec {{ auction.bid }} €, à l'adversaire de suivre !</p>
          <p v-else-if="me.budget < minBid" class="status-msg">Budget insuffisant pour surenchérir.</p>
          <template v-else>
            <div class="quick-bids">
              <button
                v-for="(value, index) in quickBids"
                :key="value"
                class="btn"
                :class="index === 0 ? 'btn-primary btn-lg' : 'btn-outline'"
                @click="bid(value)"
              >
                {{ index === 0 ? `Je le prends pour ${value} € !` : `${value} €` }}
              </button>
            </div>
            <form class="custom-bid" @submit.prevent="submitCustom">
              <input v-model.number="customBid" type="number" inputmode="numeric" :min="minBid" :max="me.budget" step="1" aria-label="Montant" />
              <button class="btn btn-outline" type="submit">Miser</button>
              <button class="btn btn-ghost" type="button" @click="pass">
                {{ leader ? 'Passer' : (opponentBroke ? 'Passer (il le prend à 0 €)' : 'Passer (il le prend à 1 €)') }}
              </button>
            </form>
          </template>
          <p v-if="opponentPassed && !iPassed && opponent" class="status-msg muted">{{ opponent.name }} a passé.</p>
        </div>
      </template>

      <!-- Résultat de l'enchère -->
      <template v-else-if="game.phase === 'auction_result' && result">
        <p class="stage-kicker">{{ result.item.categoryLabel }}</p>
        <div class="stage-emoji">{{ result.item.emoji }}</div>
        <h2 class="stage-title">{{ result.item.name }}</h2>
        <p v-if="resultWinner" class="result-line" :class="resultWinner.id === me.id ? 'win' : 'lose'">
          {{ resultWinner.id === me.id ? 'Adjugé, pour vous !' : `Adjugé à ${resultWinner.name}` }}
          <strong>{{ result.price }} €</strong>
        </p>
        <p v-if="result.fullPrice !== result.price" class="status-msg success">🏷️ Soldes : au lieu de {{ result.fullPrice }} €</p>
        <TimerBar :label="nextLabel" />
      </template>
    </div>

    <JokerBar />

    <div class="plates">
      <PlateView :player="me" :theme="game.theme" title="Votre plat" />
      <PlateView v-if="opponent" :player="opponent" :theme="game.theme" :title="`Plat de ${opponent.name}`" />
    </div>

    <ul class="log card">
      <li v-for="entry in logEntries" :key="entry.id">{{ entry.text }}</li>
    </ul>
  </section>
</template>
