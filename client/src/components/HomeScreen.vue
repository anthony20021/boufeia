<script setup>
import { computed, onMounted, ref } from 'vue';
import { useGame } from '../composables/useGame.js';

const { state, createRoom, joinRoom, savedName } = useGame();
const name = ref(savedName());
const code = ref('');
const rules = ref({
  budgetMin: 15, budgetMax: 30, totalRounds: 16, minigameRound: 7, bonusMin: 5, bonusMax: 10,
  jokersPerPlayer: 3, minigames: [], secretMinigames: 0, modes: [], starRounds: 8
});

const canPlay = computed(() => name.value.trim().length > 0 && state.connection === 'open');
const minigameNames = computed(() => {
  const names = rules.value.minigames.map((m) => `${m.emoji} ${m.title}`);
  const secrets = rules.value.secretMinigames;
  if (secrets) names.push(`${secrets} surprise${secrets > 1 ? 's' : ''} 🤫`);
  return names.join(', ');
});

onMounted(async () => {
  try {
    const response = await fetch('/api/rules');
    if (response.ok) rules.value = { ...rules.value, ...(await response.json()) };
  } catch {
    // valeurs par défaut affichées
  }
});

function create() {
  if (canPlay.value) createRoom(name.value.trim());
}

function join() {
  const cleaned = code.value.trim().toUpperCase();
  if (canPlay.value && cleaned) joinRoom(cleaned, name.value.trim());
}
</script>

<template>
  <section class="home">
    <div class="hero">
      <div class="hero-emojis" aria-hidden="true">
        <span>🥬</span><span>🍔</span><span>🧀</span>
      </div>
      <h1>GenNourriture</h1>
      <p class="tagline">Enchérissez sur les ingrédients, composez le meilleur plat, et laissez le chef IA trancher.</p>
    </div>

    <div class="card home-card">
      <label class="field">
        <span>Votre pseudo</span>
        <input v-model="name" maxlength="20" placeholder="Chef Patate" autocomplete="nickname" @keyup.enter="create" />
      </label>

      <button class="btn btn-primary btn-lg btn-block" :disabled="!canPlay" @click="create">
        Créer une partie
      </button>

      <div class="divider"><span>ou rejoindre avec un code</span></div>

      <form class="join-row" @submit.prevent="join">
        <input
          v-model="code"
          class="code-input"
          maxlength="5"
          placeholder="CODE"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          @input="code = code.toUpperCase()"
        />
        <button class="btn" type="submit" :disabled="!canPlay || code.trim().length < 5">Rejoindre</button>
      </form>
    </div>

    <div class="card rules">
      <h2>Comment on joue ?</h2>
      <ol>
        <li>Les deux chefs partent avec le même budget, tiré au sort entre <strong>{{ rules.budgetMin }} et {{ rules.budgetMax }} €</strong>, et un plat à composer est imposé (burger, pizza, pâtes, french tacos, tasty crousty, tarte, sandwich, salade, kebab, poke bowl, hot-dog, croque-monsieur, McFlurry, boisson chaude, gaufre… et quelques surprises).</li>
        <li>À chaque round, un aliment est mis aux enchères : « Je le prends pour 1 € ! — Non, moi 2 € ! ». Le plus offrant l'ajoute à son plat.</li>
        <li>Pas de chrono : on surenchérit tant qu'on veut, et l'enchère se termine quand un joueur « laisse tomber ». Chaque aliment doit être pris : si personne n'a misé et qu'on passe, l'adversaire doit le prendre pour 1 € (0 € s'il n'a plus d'argent).</li>
        <li v-if="rules.jokersPerPlayer > 0">Avant la première enchère, chacun choisit en secret <strong>{{ rules.jokersPerPlayer }} jokers parmi 9</strong> (chiper un ingrédient, voler de l'argent, jeter un ingrédient, lancer un mini-jeu…), utilisables une fois, quand on veut.</li>
        <li>Au round {{ rules.minigameRound }}, mini-jeu tiré au sort<template v-if="minigameNames"> ({{ minigameNames }})</template> : le gagnant empoche <strong>{{ rules.bonusMin }} à {{ rules.bonusMax }} €</strong> de plus.</li>
        <li>Après {{ rules.totalRounds }} rounds, le chef IA désigne le meilleur plat, puis l'IA le prend en photo.</li>
      </ol>
      <template v-if="rules.modes.length">
        <h2 class="rules-sub">Les modes de jeu</h2>
        <ul class="rules-modes">
          <li v-for="mode in rules.modes" :key="mode.id"><strong>{{ mode.emoji }} {{ mode.name }}</strong> : {{ mode.description }}</li>
        </ul>
        <p class="muted">L'hôte choisit le mode dans le salon. En mode étoile, chaque manche dure {{ rules.starRounds }} rounds.</p>
      </template>
      <p class="muted">Dans le tchat 💬, défiez votre adversaire au chifoumi ✊ quand vous voulez.</p>
      <p class="muted">L'argent restant ne rapporte rien : seul le plat compte !</p>
    </div>
  </section>
</template>
