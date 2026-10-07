<script setup>
import { computed, ref, watch } from 'vue';
import { useGame } from '../composables/useGame.js';
import TimerBar from './TimerBar.vue';
import SeriesBar from './SeriesBar.vue';

const ALL = 'all';

const { state, me, opponent, market } = useGame();
const game = computed(() => state.game);
const shop = computed(() => game.value.market);
const shopping = computed(() => game.value.phase === 'shop');
const opponentName = computed(() => opponent.value?.name || 'L\'adversaire');
const iAmDone = computed(() => shop.value.done.includes(me.value.id));
const opponentDone = computed(() => !!opponent.value && shop.value.done.includes(opponent.value.id));

// --- Rayons (plat secret) ---

const category = ref(ALL);
const search = ref('');
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const categories = computed(() => {
  const counts = new Map();
  for (const item of shop.value.shelves) {
    const entry = counts.get(item.category) || { id: item.category, label: item.categoryLabel, count: 0 };
    entry.count++;
    counts.set(item.category, entry);
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
});

const shelves = computed(() => {
  const query = normalize(search.value.trim());
  return shop.value.shelves.filter((item) =>
    (category.value === ALL || item.category === category.value) && (!query || normalize(item.name).includes(query)));
});

const spent = computed(() => shop.value.cart.reduce((sum, item) => sum + item.price, 0));
const cartFull = computed(() => shop.value.cart.length >= shop.value.maxItems);

// Le rayon ne fait qu'acheter (un double-tap ne repose rien) : on repose depuis le chariot
function onShelf(item) {
  if (!iAmDone.value && !item.owner) market('buy', { item: item.id });
}

// --- Composition du plat ---

const selected = computed(() => new Set(shop.value.selected));
const dishCount = computed(() => shop.value.cart.filter((item) => selected.value.has(item.id)).length);

function toggle(item) {
  if (!iAmDone.value) market('toggle', { item: item.id });
}

// --- Échanges ---

const give = ref('');
const take = ref('');
const trade = computed(() => shop.value.trade);
const incoming = computed(() => !!trade.value && trade.value.toId === me.value.id);
const outgoing = computed(() => !!trade.value && trade.value.fromId === me.value.id);
const canPropose = computed(() => !trade.value && !iAmDone.value && !opponentDone.value && !!give.value && !!take.value);

// Un article parti (échangé) ne peut plus être proposé
watch(() => shop.value.cart.map((item) => item.id).join(), () => {
  if (!shop.value.cart.some((item) => item.id === give.value)) give.value = '';
});
watch(() => shop.value.opponentCart.map((item) => item.id).join(), () => {
  if (!shop.value.opponentCart.some((item) => item.id === take.value)) take.value = '';
});

function propose() {
  if (canPropose.value) market('propose', { give: give.value, take: take.value });
}

const tradeNotice = computed(() => {
  const last = shop.value.lastTrade;
  if (!last || trade.value) return '';
  if (last.status === 'accepted') return 'Échange conclu 🤝';
  if (last.status === 'declined' && last.fromId === me.value.id) return `${opponentName.value} a refusé votre échange`;
  if (last.status === 'expired') return 'La dernière proposition a expiré';
  return '';
});
</script>

<template>
  <section class="market">
    <SeriesBar />

    <!-- Courses : le plat est secret -->
    <template v-if="shopping">
      <div class="card center-card market-head">
        <p class="stage-kicker">🛒 Supermarché étoilé</p>
        <h2 class="stage-title">Le plat est secret !</h2>
        <p class="stage-sub">
          Tout est en rayon, en un seul exemplaire : ce que vous prenez, {{ opponentName }} ne l'aura pas.
          {{ shop.maxItems }} articles maximum, le plat sera révélé à la sortie.
        </p>
        <div class="market-stats">
          <span class="pill"><strong>{{ me.budget }} €</strong> restants</span>
          <span class="pill" :class="{ 'pill-strong': cartFull }">🛒 {{ shop.cart.length }}/{{ shop.maxItems }}</span>
          <span class="pill pill-soft">{{ opponentName }} : {{ shop.opponentCart.length }} article{{ shop.opponentCart.length > 1 ? 's' : '' }}</span>
        </div>
        <TimerBar label="Fermeture du magasin dans" :urgent-below="15" />
        <button class="btn btn-primary btn-lg" :disabled="iAmDone" @click="market('done')">
          {{ iAmDone ? 'Courses terminées ✓' : 'Terminer mes courses' }}
        </button>
        <p v-if="iAmDone" class="muted small">{{ opponentDone ? 'Ouverture des cuisines…' : `${opponentName} fait encore ses courses…` }}</p>
      </div>

      <div class="card cart">
        <h3>🧺 Votre chariot <span class="muted small">· {{ spent }} € dépensés</span></h3>
        <ul v-if="shop.cart.length" class="chips">
          <li v-for="item in shop.cart" :key="item.id">
            <button type="button" class="chip chip-btn" :class="`cat-${item.category}`" :disabled="iAmDone" title="Reposer en rayon" @click="market('return', { item: item.id })">
              <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }} <span class="chip-price">{{ item.price }} €</span>
            </button>
          </li>
        </ul>
        <p v-else class="muted">Vide pour l'instant. Touchez un article en rayon pour le prendre.</p>
        <p v-if="shop.cart.length && !iAmDone" class="muted small">Touchez un article du chariot pour le reposer en rayon (remboursé).</p>
      </div>

      <div class="card shelves">
        <div class="shelf-tools">
          <input v-model="search" type="search" placeholder="Chercher un article…" autocomplete="off" aria-label="Chercher un article" />
        </div>
        <div class="shelf-tabs" role="tablist">
          <button type="button" class="shelf-tab" :class="{ active: category === ALL }" @click="category = ALL">Tout · {{ shop.shelves.length }}</button>
          <button v-for="c in categories" :key="c.id" type="button" class="shelf-tab" :class="{ active: category === c.id }" @click="category = c.id">
            {{ c.label }} · {{ c.count }}
          </button>
        </div>
        <div class="product-grid">
          <button
            v-for="item in shelves"
            :key="item.id"
            type="button"
            class="product"
            :class="{
              mine: item.owner === 'me',
              taken: item.owner === 'them',
              pricey: !item.owner && (item.price > me.budget || cartFull)
            }"
            :disabled="iAmDone || item.owner === 'them'"
            @click="onShelf(item)"
          >
            <span class="product-emoji">{{ item.emoji }}</span>
            <span class="product-name">{{ item.name }}</span>
            <span class="product-price">{{ item.owner === 'them' ? `Pris par ${opponentName}` : item.owner === 'me' ? '✓ Dans le chariot' : `${item.price} €` }}</span>
          </button>
        </div>
        <p v-if="!shelves.length" class="muted">Aucun article ne correspond.</p>
      </div>
    </template>

    <!-- Composition : le plat est révélé -->
    <template v-else>
      <div class="card center-card market-head">
        <p class="stage-kicker">🎉 Le plat à préparer</p>
        <div class="draft-emoji pop">{{ game.theme.emoji }}</div>
        <h2 class="stage-title">{{ game.theme.name }}</h2>
        <p class="stage-sub">
          Base fournie : {{ game.theme.base }}. Gardez les articles qui vont avec (touchez pour retirer ou remettre),
          et proposez des échanges à {{ opponentName }} si ça vous arrange.
        </p>
        <TimerBar label="Envoi des plats dans" :urgent-below="15" />
        <button class="btn btn-primary btn-lg" :disabled="iAmDone" @click="market('done')">
          {{ iAmDone ? 'Plat validé ✓' : `Valider mon plat (${dishCount} ingrédient${dishCount > 1 ? 's' : ''})` }}
        </button>
        <p v-if="iAmDone" class="muted small">{{ opponentDone ? 'Le chef arrive…' : `${opponentName} termine son plat…` }}</p>
      </div>

      <div class="card cart">
        <h3>{{ game.theme.emoji }} Votre plat</h3>
        <ul v-if="shop.cart.length" class="chips">
          <li v-for="item in shop.cart" :key="item.id">
            <button
              type="button"
              class="chip chip-btn"
              :class="[`cat-${item.category}`, { off: !selected.has(item.id) }]"
              :disabled="iAmDone"
              :aria-pressed="selected.has(item.id)"
              @click="toggle(item)"
            >
              <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
            </button>
          </li>
        </ul>
        <p v-else class="muted">Chariot vide… seulement {{ game.theme.base }} pour le chef !</p>
      </div>

      <div class="card trade">
        <h3>🔄 Échanges avec {{ opponentName }}</h3>

        <div v-if="incoming" class="trade-offer">
          <p><strong>{{ opponentName }}</strong> vous propose son <strong>{{ trade.give.emoji }} {{ trade.give.name }}</strong> contre votre <strong>{{ trade.take.emoji }} {{ trade.take.name }}</strong>.</p>
          <div class="trade-actions">
            <button class="btn btn-primary" type="button" :disabled="iAmDone" @click="market('accept')">Accepter</button>
            <button class="btn btn-ghost" type="button" @click="market('decline')">Refuser</button>
          </div>
        </div>
        <div v-else-if="outgoing" class="trade-offer">
          <p>Proposition envoyée : votre <strong>{{ trade.give.emoji }} {{ trade.give.name }}</strong> contre son <strong>{{ trade.take.emoji }} {{ trade.take.name }}</strong>…</p>
          <button class="btn btn-ghost" type="button" @click="market('cancel')">Annuler</button>
        </div>
        <template v-else>
          <p v-if="tradeNotice" class="status-msg">{{ tradeNotice }}</p>
          <p class="muted small">Je donne :</p>
          <div class="target-list">
            <button v-for="item in shop.cart" :key="item.id" type="button" class="chip target-chip" :class="[`cat-${item.category}`, { selected: give === item.id }]" @click="give = item.id">
              <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
            </button>
          </div>
          <p class="muted small">Contre ({{ opponentName }}) :</p>
          <div class="target-list">
            <button v-for="item in shop.opponentCart" :key="item.id" type="button" class="chip target-chip" :class="[`cat-${item.category}`, { selected: take === item.id }]" @click="take = item.id">
              <span class="chip-emoji">{{ item.emoji }}</span>{{ item.name }}
            </button>
          </div>
          <p v-if="!shop.opponentCart.length" class="muted small">{{ opponentName }} n'a rien acheté.</p>
          <button class="btn btn-outline" type="button" :disabled="!canPropose" @click="propose">Proposer l'échange</button>
          <p v-if="opponentDone" class="muted small">{{ opponentName }} a validé son plat : plus d'échange possible.</p>
        </template>
      </div>
    </template>
  </section>
</template>
