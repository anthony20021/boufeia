<script setup>
import { computed } from 'vue';
import { useGame } from '../composables/useGame.js';
import TimerBar from './TimerBar.vue';
import JokerBar from './JokerBar.vue';
import ChopGame from './minigames/ChopGame.vue';
import MemoryGame from './minigames/MemoryGame.vue';
import QuizGame from './minigames/QuizGame.vue';
import HangmanGame from './minigames/HangmanGame.vue';
import ReflexGame from './minigames/ReflexGame.vue';
import AnagramGame from './minigames/AnagramGame.vue';
import IntrusGame from './minigames/IntrusGame.vue';
import AdditionGame from './minigames/AdditionGame.vue';
import SeriesBar from './SeriesBar.vue';

const GAMES = {
  chop: ChopGame,
  memory: MemoryGame,
  quiz: QuizGame,
  hangman: HangmanGame,
  reflex: ReflexGame,
  anagram: AnagramGame,
  intrus: IntrusGame,
  addition: AdditionGame
};

const { state, me } = useGame();
const game = computed(() => state.game);
const minigame = computed(() => game.value.minigame);
const finished = computed(() => game.value.phase === 'minigame_result');
const launcher = computed(() => game.value.players.find((p) => p.id === minigame.value.by) || null);
const winners = computed(() => game.value.players.filter((p) => minigame.value.winnerIds.includes(p.id)));
const iWon = computed(() => winners.value.some((p) => p.id === me.value.id));

const kicker = computed(() => {
  if (!launcher.value) return `Mini-jeu · round ${game.value.round}`;
  return `Mini-jeu surprise · joker de ${launcher.value.id === me.value.id ? 'vous' : launcher.value.name}`;
});

const nextLabel = computed(() => ({
  judging: 'Le chef arrive dans',
  minigame: 'Mini-jeu suivant dans'
}[game.value.upcoming] || 'Retour aux enchères dans'));
</script>

<template>
  <section class="minigame-screen">
    <SeriesBar />
    <div class="minigame card">
      <p class="stage-kicker">{{ kicker }}</p>
      <h2 class="stage-title">{{ minigame.emoji }} {{ minigame.title }}</h2>

      <template v-if="game.phase === 'minigame_intro'">
        <p class="stage-sub">{{ minigame.rules }}</p>
        <p class="mg-bonus">Bonus en jeu : <strong class="bonus">+{{ minigame.bonus }} €</strong></p>
        <p v-if="minigame.note" class="mg-note">{{ minigame.note }}</p>
        <div class="intro-veggie bounce">{{ minigame.emoji }}</div>
        <TimerBar label="Ça commence dans" />
      </template>

      <template v-else>
        <div v-if="finished" class="mg-result">
          <div class="stage-emoji">{{ winners.length ? (iWon ? '🏅' : '😤') : '😴' }}</div>
          <p v-if="winners.length > 1" class="result-line">Égalité ! +{{ minigame.gain }} € chacun</p>
          <p v-else-if="winners.length" class="result-line" :class="iWon ? 'win' : 'lose'">
            {{ iWon ? 'Vous gagnez' : `${winners[0].name} gagne` }} <strong>+{{ minigame.gain }} €</strong>
          </p>
          <p v-else class="result-line">Personne ne remporte le bonus</p>
          <TimerBar :label="nextLabel" />
        </div>
        <component :is="GAMES[minigame.type]" :view="minigame.view" :finished="finished" />
      </template>
    </div>

    <JokerBar />
  </section>
</template>
