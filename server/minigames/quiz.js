import { Minigame, shuffle } from './base.js';
import { QUIZ_BANK } from './data.js';

export const QUIZ_QUESTIONS = 3;
const BUZZ_MS = 15000;
const ANSWER_MS = 5000;
const REVEAL_MS = 3500;

// { question, correct, wrong[] } → { question, options, answer } (indice de la bonne réponse)
export const shuffleOptions = ({ question, correct, wrong }) => {
  const options = shuffle([correct, ...wrong]);
  return { question, options, answer: options.indexOf(correct) };
};

// Questions de secours, sans répétition dans une salle tant que la banque n'est pas épuisée
export const localQuestions = (count, used) => {
  let pool = QUIZ_BANK.map((_, index) => index).filter((index) => !used.has(index));
  if (pool.length < count) {
    used.clear();
    pool = QUIZ_BANK.map((_, index) => index);
  }
  return shuffle(pool).slice(0, count).map((index) => {
    used.add(index);
    const [correct, ...wrong] = QUIZ_BANK[index].a;
    return { question: QUIZ_BANK[index].q, correct, wrong };
  });
};

// « Le Quiz du Chef » : le premier qui buzze a 5 s pour répondre, sinon la main passe à l'adversaire
export class QuizGame extends Minigame {
  static id = 'quiz';
  static title = 'Le Quiz du Chef';
  static emoji = '🛎️';
  static rules = `${QUIZ_QUESTIONS} questions de culture culinaire. Buzzez le premier : vous avez ${ANSWER_MS / 1000} secondes pour répondre. Mauvaise réponse ou trop lent ? La main passe à l'adversaire !`;
  static usesQuiz = true;

  constructor(ctx) {
    super(ctx);
    this.scores = this.zeroScores();
    this.questions = [];
    this.source = null;
    this.index = -1;
    this.stage = 'open'; // 'open' (buzzer libre) | 'answer' (un joueur a la main) | 'reveal'
    this.hand = null;
    this.tried = [];
    this.excluded = [];
    this.lastWinner = null;
  }

  start() {
    const { questions, source } = this.ctx.quizQuestions(QUIZ_QUESTIONS);
    this.questions = questions;
    this.source = source;
    this.nextQuestion();
  }

  nextQuestion() {
    // Dernière question jouée : on termine en la laissant affichée avec sa réponse
    if (this.index + 1 >= this.questions.length) return this.end(this.leaders(this.scores));
    this.index++;
    this.stage = 'open';
    this.hand = null;
    this.tried = [];
    this.excluded = [];
    this.lastWinner = null;
    this.ctx.setTimer(BUZZ_MS, () => this.reveal(null)); // personne n'a buzzé
    this.ctx.broadcast();
  }

  giveHand(playerId) {
    this.stage = 'answer';
    this.hand = playerId;
    this.ctx.setTimer(ANSWER_MS, () => this.miss(playerId, null));
    this.ctx.broadcast();
  }

  handle(playerId, msg) {
    if (this.over) return;
    if (msg.action === 'buzz') {
      if (this.stage === 'open' && !this.tried.includes(playerId)) this.giveHand(playerId);
      return;
    }
    if (msg.action !== 'answer' || this.stage !== 'answer' || this.hand !== playerId) return;

    const option = Number(msg.option);
    const question = this.questions[this.index];
    if (!Number.isInteger(option) || option < 0 || option >= question.options.length || this.excluded.includes(option)) return;
    if (option === question.answer) {
      this.scores[playerId]++;
      return this.reveal(playerId);
    }
    this.miss(playerId, option);
  }

  // Mauvaise réponse ou temps écoulé : l'adversaire a la main s'il n'a pas encore tenté sa chance
  miss(playerId, option) {
    this.tried.push(playerId);
    if (option !== null) this.excluded.push(option);
    const other = this.ids.find((id) => !this.tried.includes(id));
    if (other) return this.giveHand(other);
    this.reveal(null);
  }

  reveal(winnerId) {
    this.stage = 'reveal';
    this.hand = null;
    this.lastWinner = winnerId;
    this.ctx.setTimer(REVEAL_MS, () => this.nextQuestion());
    this.ctx.broadcast();
  }

  view() {
    const question = this.questions[this.index];
    return {
      index: Math.max(0, this.index),
      total: QUIZ_QUESTIONS,
      source: this.source,
      question: question?.question || null,
      options: question?.options || [],
      answer: this.stage === 'reveal' ? (question?.answer ?? null) : null, // jamais envoyée avant la révélation
      stage: this.stage,
      hand: this.hand,
      tried: this.tried,
      excluded: this.excluded,
      lastWinner: this.lastWinner,
      scores: this.scores
    };
  }
}
