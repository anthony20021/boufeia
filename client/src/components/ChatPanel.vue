<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';

const QUICK = ['😂', '👏', '😱', '🔥', '🤢'];

const { state, me, sendChat } = useGame();
const open = ref(false);
const text = ref('');
const list = ref(null);
const lastSeenId = ref(0);

const messages = computed(() => state.chat);
const lastId = computed(() => (messages.value.length ? messages.value[messages.value.length - 1].id : 0));
const unread = computed(() => messages.value.filter((m) => m.id > lastSeenId.value && m.playerId !== me.value?.id).length);

function scrollDown() {
  nextTick(() => {
    if (list.value) list.value.scrollTop = list.value.scrollHeight;
  });
}

watch(lastId, () => {
  if (open.value) {
    lastSeenId.value = lastId.value;
    scrollDown();
  }
});

// Nouvelle salle : l'historique repart de zéro
watch(() => state.game?.code, () => {
  lastSeenId.value = 0;
});

function toggle() {
  open.value = !open.value;
  if (open.value) {
    lastSeenId.value = lastId.value;
    scrollDown();
  }
}

function submit() {
  const value = text.value.trim();
  if (!value) return;
  if (sendChat(value)) text.value = '';
}
</script>

<template>
  <div class="chat" :class="{ open }">
    <section v-if="open" class="chat-panel" aria-label="Tchat">
      <header class="chat-head">
        <strong>💬 Tchat</strong>
        <button class="btn btn-ghost btn-sm" type="button" aria-label="Fermer le tchat" @click="toggle">✕</button>
      </header>

      <ul ref="list" class="chat-list">
        <li v-if="!messages.length" class="chat-empty">Dites bonjour à votre adversaire 👋</li>
        <li v-for="m in messages" :key="m.id" class="chat-msg" :class="{ mine: m.playerId === me?.id }">
          <span v-if="m.playerId !== me?.id" class="chat-author">{{ m.name }}</span>
          <span class="chat-bubble">{{ m.text }}</span>
        </li>
      </ul>

      <div class="chat-quick">
        <button v-for="emoji in QUICK" :key="emoji" type="button" class="chat-emoji" @click="sendChat(emoji)">{{ emoji }}</button>
      </div>

      <form class="chat-form" @submit.prevent="submit">
        <input v-model="text" maxlength="200" placeholder="Votre message…" autocomplete="off" enterkeyhint="send" />
        <button class="btn btn-primary" type="submit" :disabled="!text.trim()">Envoyer</button>
      </form>
    </section>

    <button class="chat-toggle" type="button" :aria-label="open ? 'Fermer le tchat' : 'Ouvrir le tchat'" @click="toggle">
      <span>{{ open ? '✕' : '💬' }}</span>
      <span v-if="!open && unread" class="chat-badge">{{ unread > 9 ? '9+' : unread }}</span>
    </button>
  </div>
</template>
