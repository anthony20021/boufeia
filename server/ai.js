import { config } from './config.js';

// Appels à ollama_api (juge texte + génération d'image). Aucun texte saisi par les joueurs
// n'est envoyé à l'IA : les candidats sont anonymisés en "A" et "B", et les ingrédients
// viennent du catalogue du serveur (pas d'injection de prompt possible via les pseudos).

export class ApiError extends Error {
  constructor(message, status = 0, retryAfter = null) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const apiFetch = async (path, { method = 'GET', body, timeoutMs = 10000 } = {}) => {
  let response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken && { Authorization: `Bearer ${config.apiToken}` })
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? 'délai dépassé' : (error.cause?.code || error.message);
    throw new ApiError(`API IA injoignable (${reason})`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // réponse non JSON (ex : page 404 d'Express)
  }
  if (!response.ok) {
    const message = [data?.error, data?.details].filter(Boolean).join(' : ') || `HTTP ${response.status}`;
    const retryAfter = Number(data?.retry_after) || Number(response.headers.get('retry-after')) || null;
    throw new ApiError(message, response.status, retryAfter);
  }
  return data;
};

// --- Juge ---

let autoModel = null;
const resolveJudgeModel = async () => {
  if (config.judgeModel) return config.judgeModel;
  if (autoModel) return autoModel;
  const data = await apiFetch('/api/models');
  autoModel = data?.models?.[0]?.name;
  if (!autoModel) throw new ApiError('Aucun modèle Ollama installé');
  console.log(`🧑‍🍳 JUDGE_MODEL non défini, modèle utilisé : ${autoModel}`);
  return autoModel;
};

const describePlate = (theme, plate) => {
  const names = plate.items.map((i) => i.name.toLowerCase());
  return names.length
    ? `Plat du candidat ${plate.label} : ${theme.name} (base : ${theme.base}) avec ${names.join(', ')}.`
    : `Plat du candidat ${plate.label} : ${theme.name} avec seulement la base (${theme.base}), aucun ingrédient.`;
};

const buildJudgeMessages = (theme, plates) => [
  {
    role: 'system',
    content: [
      'Tu es « Chef Gustave », juge d\'un concours de cuisine télévisé, exigeant mais plein d\'humour.',
      `Deux candidats, A et B, ont chacun composé un plat de type « ${theme.name} » uniquement avec les ingrédients remportés aux enchères, en plus de la base fournie (${theme.base}).`,
      'Évalue chaque plat sur le goût probable, l\'harmonie des saveurs, l\'équilibre, la générosité et l\'originalité.',
      'Un plat avec très peu d\'ingrédients est décevant. Une association absurde (par exemple confiture de figues et poisson pané) est pénalisée, sauf si elle est vraiment audacieuse et cohérente.',
      'Désigne les candidats uniquement par « candidat A » et « candidat B ».',
      'Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, exactement dans ce format :',
      '{"A":{"nom":"nom créatif du plat","note":12,"commentaire":"deux phrases maximum"},"B":{"nom":"nom créatif du plat","note":15,"commentaire":"deux phrases maximum"},"gagnant":"B","verdict":"une phrase qui annonce le gagnant"}',
      '"note" est un entier de 0 à 20. "gagnant" vaut "A", "B" ou "egalite". Tout est en français.'
    ].join('\n')
  },
  {
    role: 'user',
    content: plates.map((plate) => describePlate(theme, plate)).join('\n')
  }
];

const cleanText = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const pickWinners = (dishes, labels, declared) => {
  const best = Math.max(...labels.map((l) => dishes[l].score));
  const top = labels.filter((l) => dishes[l].score === best);
  if (top.length === 1) return top;
  return labels.includes(declared) ? [declared] : top; // notes égales : le juge peut départager
};

const parseVerdict = (content, theme, plates) => {
  if (typeof content !== 'string') return null;
  const text = content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let raw;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const labels = plates.map((p) => p.label);
  const dishes = {};
  for (const label of labels) {
    const entry = raw?.[label];
    const score = Math.round(Number(entry?.note));
    if (!entry || typeof entry !== 'object' || !Number.isFinite(score)) return null;
    dishes[label] = {
      name: cleanText(entry.nom, 80) || `${theme.name} du candidat ${label}`,
      score: clamp(score, 0, 20),
      comment: cleanText(entry.commentaire, 400)
    };
  }

  const declared = String(raw.gagnant || '').trim().toUpperCase();
  const winners = pickWinners(dishes, labels, declared);
  let verdict = cleanText(raw.verdict, 300);
  // Si le texte du juge contredit ses propres notes, on ne l'affiche pas
  if (!verdict || (labels.includes(declared) && !winners.includes(declared))) {
    verdict = winners.length > 1
      ? 'Égalité parfaite, je ne peux pas vous départager !'
      : `Le candidat ${winners[0]} l'emporte !`;
  }
  return { dishes, winners, verdict };
};

// Verdict de secours si l'IA ne répond pas : variété des familles d'aliments
const fallbackVerdict = (theme, plates) => {
  const dishes = {};
  for (const plate of plates) {
    const families = new Set(plate.items.map((i) => i.category)).size;
    const score = plate.items.length
      ? clamp(4 + families * 2 + Math.min(plate.items.length, 6), 1, 20)
      : 1;
    dishes[plate.label] = {
      name: `${theme.name} du candidat ${plate.label}`,
      score,
      comment: plate.items.length
        ? `${plate.items.length} ingrédient(s), ${families} famille(s) d'aliments.`
        : 'Une assiette vide… difficile de juger.'
    };
  }
  const labels = plates.map((p) => p.label);
  const winners = pickWinners(dishes, labels, null);
  return {
    dishes,
    winners,
    verdict: winners.length > 1 ? 'Égalité parfaite !' : `Le candidat ${winners[0]} l'emporte aux points !`
  };
};

/**
 * plates : [{ label: 'A' | 'B', items: [ingrédients du catalogue] }]
 * Ne lève jamais d'erreur : en cas d'échec, renvoie un verdict calculé (source "auto").
 */
export const judgeDishes = async ({ theme, plates }) => {
  const deadline = Date.now() + config.judgeTimeoutMs;
  let lastError = null;
  let failures = 0;

  while (failures < 3 && Date.now() < deadline) {
    try {
      const model = await resolveJudgeModel();
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        body: {
          model,
          messages: buildJudgeMessages(theme, plates),
          stream: false,
          think: false,
          options: { temperature: 0.8, num_predict: 800 }
        },
        timeoutMs: Math.max(5000, deadline - Date.now())
      });
      const verdict = parseVerdict(data?.message?.content, theme, plates);
      if (verdict) {
        console.log(`🧑‍🍳 Verdict du juge IA reçu (${model})`);
        return { ...verdict, source: 'ia' };
      }
      failures++;
      lastError = new Error('réponse du juge illisible');
      console.warn('⚠️  Réponse du juge IA illisible, nouvelle tentative');
    } catch (error) {
      lastError = error;
      if (error.status === 503) {
        // Le GPU génère une image pour une autre partie : on patiente
        const wait = clamp((error.retryAfter || 15) * 1000, 2000, 30000);
        if (Date.now() + wait >= deadline) break;
        console.log(`⏳ GPU occupé, nouvel essai du juge dans ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      console.warn(`⚠️  Juge IA : ${error.message}`);
      if ([400, 401, 403, 404].includes(error.status)) break; // erreur de configuration
      failures++;
      await sleep(2000);
    }
  }

  const reason = lastError ? lastError.message : 'délai dépassé';
  console.warn(`⚠️  Juge IA indisponible, verdict automatique : ${reason}`);
  return {
    ...fallbackVerdict(theme, plates),
    source: 'auto',
    notice: `Le chef IA n'a pas pu juger (${reason}). Verdict calculé automatiquement.`
  };
};

// --- Image ---

export const buildImagePrompt = (theme, items) => {
  const style = 'Professional realistic food photography, appetizing close-up, served on a rustic wooden table, soft natural window light, shallow depth of field, highly detailed, photorealistic, 85mm lens.';
  const lead = theme.imageLead.charAt(0).toUpperCase() + theme.imageLead.slice(1);
  if (!items.length) {
    return `${lead}, with absolutely nothing else, plain and empty, alone on a white plate. ${style}`;
  }
  const names = items.map((i) => i.en);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `${lead}, with ${list}. Every ingredient is clearly visible. ${style}`.slice(0, 1000);
};

export const generateDishImage = async (prompt) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const data = await apiFetch('/api/image', {
        method: 'POST',
        body: { prompt, width: config.imageSize, height: config.imageSize },
        timeoutMs: config.imageRequestTimeoutMs
      });
      if (typeof data?.image !== 'string' || !data.image.startsWith('data:image/')) {
        throw new ApiError('Réponse de génération d\'image invalide', 502);
      }
      return data.image;
    } catch (error) {
      if (error.status === 503 && attempt < 3) {
        await sleep(clamp((error.retryAfter || 15) * 1000, 2000, 30000));
        continue;
      }
      if (error.status === 404) {
        throw new ApiError('La route /api/image est absente de l\'API (service OllamaAPI à redémarrer ?)', 404);
      }
      if (error.status === 429) {
        const minutes = error.retryAfter ? ` (réessayez dans ${Math.ceil(error.retryAfter / 60)} min)` : '';
        throw new ApiError(`Quota d'images atteint ou file pleine${minutes}`, 429);
      }
      throw error;
    }
  }
};

// Vérification au démarrage (n'empêche jamais le serveur de démarrer)
export const checkApi = async () => {
  try {
    await apiFetch('/health', { timeoutMs: 5000 });
  } catch (error) {
    console.warn(`⚠️  API IA injoignable sur ${config.apiUrl} : ${error.message}`);
    return;
  }
  if (!config.apiToken) console.warn('⚠️  API_TOKEN vide dans .env : les appels IA seront refusés si l\'API est protégée');

  try {
    const data = await apiFetch('/api/models', { timeoutMs: 5000 });
    const names = (data?.models || []).map((m) => m.name);
    if (config.judgeModel && !names.includes(config.judgeModel)) {
      console.warn(`⚠️  Modèle juge "${config.judgeModel}" introuvable. Disponibles : ${names.join(', ') || 'aucun'}`);
    } else {
      console.log(`🧑‍🍳 Juge IA : ${config.judgeModel || names[0] || 'aucun modèle'}`);
    }
  } catch (error) {
    console.warn(`⚠️  Liste des modèles indisponible : ${error.message}`);
  }

  try {
    const health = await apiFetch('/api/image/health', { timeoutMs: 8000 });
    if (health?.status === 'OK') {
      console.log(`🖼️  Génération d'image prête${health.comfyui?.gpu ? ` (${health.comfyui.gpu})` : ''}`);
    } else {
      console.warn('⚠️  Génération d\'image dégradée (ComfyUI ou workflow indisponible)');
    }
  } catch (error) {
    const hint = error.status === 404 ? ' : route absente, redémarrez le service OllamaAPI' : ` : ${error.message}`;
    console.warn(`⚠️  Génération d'image indisponible${hint}`);
  }
};
