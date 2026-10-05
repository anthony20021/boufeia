import { ref, onMounted, onUnmounted } from 'vue';

// Horloge réactive pour les comptes à rebours
export function useNow(intervalMs = 100) {
  const now = ref(Date.now());
  let id = null;
  onMounted(() => {
    id = setInterval(() => {
      now.value = Date.now();
    }, intervalMs);
  });
  onUnmounted(() => clearInterval(id));
  return now;
}
