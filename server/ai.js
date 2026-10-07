import { randomInt } from 'crypto';
import { config } from './config.js';

// Appels à ollama_api (juge texte, questions du quiz, génération d'image). Aucun texte saisi par
// les joueurs n'est envoyé à l'IA : les candidats sont anonymisés en "A" et "B", et les ingrédients
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

// --- Modèle de langage (juge et quiz) ---

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

// Objet JSON contenu dans une réponse du modèle (balises <think> et blocs ``` ignorés)
const extractJson = (content) => {
  if (typeof content !== 'string') return null;
  const text = content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

/**
 * Interroge le modèle jusqu'à obtenir une réponse exploitable : parse() renvoie le résultat ou null.
 * Réessaie si la réponse est illisible ou si le GPU est occupé, lève la dernière erreur sinon.
 * label / who : pour les journaux (« Juge IA », « du juge »).
 */
const askModel = async ({ label, who, messages, parse, timeoutMs, temperature, maxTokens }) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  let failures = 0;

  while (failures < 3 && Date.now() < deadline) {
    try {
      const model = await resolveJudgeModel();
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        body: {
          model,
          messages,
          stream: false,
          think: false,
          options: { temperature, num_predict: maxTokens }
        },
        timeoutMs: Math.max(5000, deadline - Date.now())
      });
      const result = parse(data?.message?.content);
      if (result) return { result, model };
      failures++;
      lastError = new Error(`réponse ${who} illisible`);
      console.warn(`⚠️  Réponse ${who} illisible, nouvelle tentative`);
    } catch (error) {
      lastError = error;
      if (error.status === 503) {
        // Le GPU génère une image pour une autre partie : on patiente
        const wait = clamp((error.retryAfter || 15) * 1000, 2000, 30000);
        if (Date.now() + wait >= deadline) break;
        console.log(`⏳ GPU occupé, nouvel essai ${who} dans ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      console.warn(`⚠️  ${label} : ${error.message}`);
      if ([400, 401, 403, 404].includes(error.status)) break; // erreur de configuration
      failures++;
      await sleep(2000);
    }
  }
  throw lastError || new Error('délai dépassé');
};

// --- Juge ---

const describePlate = (theme, plate) => {
  const names = plate.items.map((i) => i.name.toLowerCase());
  return names.length
    ? `Plat du candidat ${plate.label} : ${theme.name} (base : ${theme.base}) avec ${names.join(', ')}.`
    : `Plat du candidat ${plate.label} : ${theme.name} avec seulement la base (${theme.base}), aucun ingrédient.`;
};

const ORIGINS = {
  auction: 'remportés aux enchères',
  market: 'achetés au supermarché avant de savoir quel plat préparer'
};

const buildJudgeMessages = (theme, plates, origin) => [
  {
    role: 'system',
    content: [
      'Tu es « Chef Gustave », juge d\'un concours de cuisine télévisé, exigeant mais plein d\'humour.',
      `Deux candidats, A et B, ont chacun composé un plat de type « ${theme.name} » uniquement avec les ingrédients ${ORIGINS[origin] || ORIGINS.auction}, en plus de la base fournie (${theme.base}).`,
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
  const raw = extractJson(content);
  if (!raw) return null;

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
 * origin : 'auction' (enchères) ou 'market' (supermarché, plat inconnu au moment des achats)
 * Ne lève jamais d'erreur : en cas d'échec, renvoie un verdict calculé (source "auto").
 */
export const judgeDishes = async ({ theme, plates, origin = 'auction' }) => {
  try {
    const { result, model } = await askModel({
      label: 'Juge IA',
      who: 'du juge',
      messages: buildJudgeMessages(theme, plates, origin),
      parse: (content) => parseVerdict(content, theme, plates),
      timeoutMs: config.judgeTimeoutMs,
      temperature: 0.8,
      maxTokens: 800
    });
    console.log(`🧑‍🍳 Verdict du juge IA reçu (${model})`);
    return { ...result, source: 'ia' };
  } catch (error) {
    console.warn(`⚠️  Juge IA indisponible, verdict automatique : ${error.message}`);
    return {
      ...fallbackVerdict(theme, plates),
      source: 'auto',
      notice: `Le chef IA n'a pas pu juger (${error.message}). Verdict calculé automatiquement.`
    };
  }
};

// --- Quiz ---

const QUIZ_TIMEOUT_MS = 120000;
const QUIZ_TOPICS = [
  'fromages', 'épices et aromates', 'pâtisserie', 'fruits et légumes', 'plats du monde', 'cuisine régionale française',
  'street food', 'boissons', 'techniques de cuisine', 'histoire des aliments', 'produits de la mer',
  'pain et viennoiseries', 'cuisine italienne', 'cuisine asiatique', 'desserts', 'charcuterie'
];

const pickSome = (list, count) => {
  const pool = [...list];
  return Array.from({ length: Math.min(count, pool.length) }, () => pool.splice(randomInt(pool.length), 1)[0]);
};

const buildQuizMessages = (theme, count) => [
  {
    role: 'system',
    content: [
      'Tu es l\'animateur d\'un quiz télévisé sur la cuisine, drôle et bienveillant.',
      `Écris ${count} questions de culture générale culinaire en français, de difficulté facile à moyenne.`,
      'Chaque question a exactement 4 réponses courtes (6 mots maximum) et une seule bonne réponse, qui doit être un fait certain et incontestable.',
      'Les mauvaises réponses sont plausibles mais clairement fausses. Pas de question piège, d\'opinion ou de chiffre approximatif.',
      'Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, exactement dans ce format :',
      '{"questions":[{"question":"…?","reponses":["…","…","…","…"],"bonne":2}]}',
      '"bonne" est l\'indice (de 0 à 3) de la bonne réponse dans "reponses".'
    ].join('\n')
  },
  {
    role: 'user',
    content: `Les deux joueurs composent un plat de type « ${theme.name} ». Thèmes de cette partie : ${pickSome(QUIZ_TOPICS, 3).join(', ')}, plus une question en lien avec « ${theme.name} » ou ses ingrédients. Écris les ${count} questions.`
  }
];

// Questions valides uniquement : 4 réponses distinctes, indice de la bonne réponse correct
const parseQuiz = (content, count) => {
  const raw = extractJson(content);
  const questions = [];
  for (const entry of Array.isArray(raw?.questions) ? raw.questions : []) {
    const question = cleanText(entry?.question, 200);
    const answers = Array.isArray(entry?.reponses) ? entry.reponses.map((a) => cleanText(String(a ?? ''), 80)) : [];
    const index = Number(entry?.bonne);
    if (!question || answers.length !== 4 || answers.some((a) => !a)) continue;
    if (new Set(answers.map((a) => a.toLowerCase())).size !== 4) continue;
    if (!Number.isInteger(index) || index < 0 || index > 3) continue;
    questions.push({ question, correct: answers[index], wrong: answers.filter((_, i) => i !== index) });
    if (questions.length === count) break;
  }
  return questions.length ? questions : null;
};

// Renvoie 1 à `count` questions { question, correct, wrong[] }, ou lève une erreur
export const generateQuizQuestions = async ({ theme, count }) => {
  const { result, model } = await askModel({
    label: 'Quiz IA',
    who: 'du quiz',
    messages: buildQuizMessages(theme, count),
    parse: (content) => parseQuiz(content, count),
    timeoutMs: QUIZ_TIMEOUT_MS,
    temperature: 1,
    maxTokens: 1200
  });
  console.log(`🛎️  Questions du quiz générées par l'IA (${model})`);
  return result;
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
