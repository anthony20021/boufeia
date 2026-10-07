<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';

const { state, me, opponent, useJoker } = useGame();
const jokers = computed(() => state.game.jokers || []);
const spy = computed(() => state.game.spy || []);
const openId = ref(null);
const target = ref('');
const target2 = ref(''); // Troc : l'ingrédient pris dans le plat adverse

const selected = computed(() => jokers.value.find((j) => j.id === openId.value) || null);
const myPlate = computed(() => me.value.plate);
const theirPlate = computed(() => opponent.value?.plate || []);
// Premier choix : dans le plat adverse pour un vol, dans le sien sinon (Poubelle, Cadeau, Troc)
const targetPlate = computed(() => (selected.value?.target === 'theirs' ? theirPlate.value : myPlate.value));
const willBeBlocked = computed(() => !!selected.value?.hostile && !!opponent.value?.shield);
const canConfirm = computed(() => {
  const joker = selected.value;
  if (!joker || joker.used || joker.blocked) return false;
  if (!joker.target) return true;
  const first = targetPlate.value.some((item) => item.id === target.value);
  return joker.target === 'swap' ? first && theirPlate.value.some((item) => item.id === target2.value) : first;
});

function open(joker) {
  if (joker.used) return;
  openId.value = joker.id;
  target.value = '';
  target2.value = '';
}

function close() {
  openId.value = null;
}

function confirm() {
  if (canConfirm.value && useJoker(selected.value.id, target.value, target2.value)) close();
}

// Joker utilisé ou cible disparue (chapardée, jetée…) pendant que la fenêtre est ouverte
watch(selected, (joker) => {
  if (openId.value && (!joker || joker.used)) close();
});
watch(targetPlate, (plate) => {
  if (target.value && !plate.some((item) => item.id === target.value)) target.value = '';
});
watch(theirPlate, (plate) => {
  if (target2.value && !plate.some((item) => item.id === target2.value)) target2.value = '';
});

function onKey(event) {
  if (event.key === 'Escape') close();
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <section v-if="jokers.length" class="jokers card">
    <header class="jokers-head">
      <h3>🃏 Vos jokers</h3>
      <span v-if="opponent" class="muted">
        {{ opponent.name }} : {{ opponent.jokersLeft }} joker{{ opponent.jokersLeft > 1 ? 's' : '' }} en main
      </span>
    </header>

    <div class="joker-list">
      <button
        v-for="joker in jokers"
        :key="joker.id"
        type="button"
        class="joker-chip"
        :class="{ used: joker.used, ready: !joker.used && !joker.blocked }"
        :disabled="joker.used"
        :title="joker.used ? 'Déjà utilisé' : joker.description"
        @click="open(joker)"
      >
        <span class="joker-chip-emoji">{{ joker.emoji }}</span>{{ joker.name }}
      </button>
    </div>

    <div v-if="spy.length" class="spy">
      <span class="spy-label">👀 À venir</span>
      <span v-for="entry in spy" :key="entry.round" class="spy-item">
        R{{ entry.round }} · {{ entry.item.emoji }} {{ entry.item.name }}
      </span>
    </div>

    <Teleport to="body">
      <div v-if="selected" class="modal-backdrop" @click.self="close">
        <div class="modal card" role="dialog" aria-modal="true" :aria-label="selected.name">
          <div class="modal-emoji">{{ selected.emoji }}</div>
          <h3>{{ selected.name }}</h3>
          <p>{{ selected.description }}</p>
          <p v-if="selected.detail" class="joker-detail">{{ selected.detail }}</p>

          <template v-if="selected.target && !selected.blocked">
            <p class="muted">
              {{ selected.target === 'theirs' ? `Quel ingrédient prendre à ${opponent?.name} ?` : selected.target === 'swap' ? 'Votre ingrédient à donner :' : 'Quel ingrédient de votre plat ?' }}
            </p>
            <div class="target-list">
              <button
                v-for="item in targetPlate"
                :key="item.id"
                type="button"
                class="chip target-chip"
                :class="[`cat-${item.category}`, { selected: target === item.id }]"
                :aria-pressed="target === item.id"
                @click="target = item.id"
              >
                <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
              </button>
            </div>
            <template v-if="selected.target === 'swap'">
              <p class="muted">Contre celui de {{ opponent?.name }} :</p>
              <div class="target-list">
                <button
                  v-for="item in theirPlate"
                  :key="item.id"
                  type="button"
                  class="chip target-chip"
                  :class="[`cat-${item.category}`, { selected: target2 === item.id }]"
                  :aria-pressed="target2 === item.id"
                  @click="target2 = item.id"
                >
                  <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
                </button>
              </div>
            </template>
          </template>

          <p v-if="selected.blocked" class="status-msg blocked">⛔ {{ selected.blocked }}</p>
          <p v-else-if="willBeBlocked" class="status-msg warn">
            🛡️ {{ opponent.name }} a levé son bouclier : ce joker sera bloqué (et perdu).
          </p>

          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" @click="close">Annuler</button>
            <button class="btn btn-primary" type="button" :disabled="!canConfirm" @click="confirm">Utiliser</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
