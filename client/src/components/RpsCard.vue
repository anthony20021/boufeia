<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';
import { useNow } from '../composables/useNow.js';

const MOVES = {
  rock: { emoji: '✊', name: 'Pierre' },
  paper: { emoji: '✋', name: 'Feuille' },
  scissors: { emoji: '✌️', name: 'Ciseaux' }
};
const COUNT_WORDS = ['Chi…', 'Fou…', 'Mi !'];

const emit = defineEmits(['dismiss']);
const { state, me, opponent, rps } = useGame();
const now = useNow();

const match = computed(() => state.game.rps);
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');
const iChallenged = computed(() => match.value.fromId === me.value.id);
const remaining = computed(() => (state.rpsDeadlineAt ? Math.max(0, state.rpsDeadlineAt - now.value) : 0));
const ratio = computed(() => (state.rpsTotal ? Math.min(1, remaining.value / state.rpsTotal) : 0));
// « 1, 2, 3 » : une étape par seconde du compte à rebours
const step = computed(() => Math.min(2, Math.max(0, Math.floor((state.rpsTotal - remaining.value) / 1000))));

const myMove = computed(() => MOVES[match.value.moves?.[me.value.id]] || null);
const theirMove = computed(() => MOVES[match.value.moves?.[opponent.value?.id]] || null);
const outcome = computed(() => {
  const m = match.value;
  if (!m.winnerId) return { text: 'Égalité !', tone: '' };
  const won = m.winnerId === me.value.id;
  if (m.forfeit) {
    return won
      ? { text: `${opponentName.value} n'a pas joué : victoire par forfait !`, tone: 'win' }
      : { text: 'Trop lent… défaite par forfait', tone: 'lose' };
  }
  return won ? { text: 'Vous gagnez ! 🎉', tone: 'win' } : { text: `${opponentName.value} gagne !`, tone: 'lose' };
});
</script>

<template>
  <div class="rps" :class="`rps-${match.status}`">
    <!-- Invitation -->
    <template v-if="match.status === 'pending'">
      <template v-if="iChallenged">
        <p>⏳ Défi envoyé à {{ opponentName }}…</p>
        <button class="btn btn-ghost btn-sm" type="button" @click="rps('cancel')">Annuler</button>
      </template>
      <template v-else>
        <p>✊ <strong>{{ opponentName }}</strong> vous défie au chifoumi !</p>
        <div class="rps-actions">
          <button class="btn btn-primary btn-sm" type="button" @click="rps('accept')">Accepter</button>
          <button class="btn btn-ghost btn-sm" type="button" @click="rps('decline')">Refuser</button>
        </div>
      </template>
    </template>

    <!-- Choix secret -->
    <template v-else-if="match.status === 'choosing'">
      <template v-if="!match.myMove">
        <p>Pierre, feuille ou ciseaux ?</p>
        <div class="rps-moves">
          <button v-for="(move, id) in MOVES" :key="id" type="button" class="rps-move" @click="rps('choose', { move: id })">
            <span>{{ move.emoji }}</span><small>{{ move.name }}</small>
          </button>
        </div>
      </template>
      <p v-else>
        Vous jouez {{ MOVES[match.myMove].emoji }} {{ MOVES[match.myMove].name }}<br />
        <span class="muted">{{ opponentName }} réfléchit…</span>
      </p>
    </template>

    <!-- 1, 2, 3 ! -->
    <div v-else-if="match.status === 'countdown'" :key="step" class="rps-count">
      {{ step + 1 }}<small>{{ COUNT_WORDS[step] }}</small>
    </div>

    <!-- Résultat -->
    <template v-else-if="match.status === 'done'">
      <div class="rps-hands">
        <span :title="myMove?.name">{{ myMove?.emoji || '❔' }}</span>
        <small>contre</small>
        <span :title="theirMove?.name">{{ theirMove?.emoji || '❔' }}</span>
      </div>
      <p class="rps-outcome" :class="outcome.tone">{{ outcome.text }}</p>
      <div class="rps-actions">
        <button class="btn btn-primary btn-sm" type="button" :disabled="!opponent?.connected" @click="rps('challenge')">Revanche</button>
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('dismiss')">Fermer</button>
      </div>
    </template>

    <!-- Refusé ou expiré -->
    <template v-else>
      <p>{{ match.status === 'declined' ? (iChallenged ? `${opponentName} a refusé le défi` : 'Défi refusé') : 'Défi expiré' }}</p>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('dismiss')">Fermer</button>
    </template>

    <div v-if="match.timer && match.status !== 'countdown'" class="rps-timer" aria-hidden="true">
      <div :style="{ transform: `scaleX(${ratio})` }"></div>
    </div>
  </div>
</template>
