import { initialData } from "../data/initialData.js";
import { localDateKey } from "./constants.js";
import { t } from "./i18n.js";

const STORAGE_KEY = "cap-pilote-v1";
const legacySeedPrompts = {
  "ma-01": "Un avion vole à 240 km/h pendant 1 h 30 min. Quelle distance parcourt-il sans vent ?",
  "ma-02": "Un avion vole à 300 km/h dans un vent de face de 40 km/h. Quelle est sa vitesse sol ?",
  "ma-03": "Un trajet de 600 km est effectué à 200 km/h à l’aller, puis 300 km/h au retour. Quelle est la vitesse moyenne sur l'aller-retour ?",
  "ph-01": "Un objet part du repos avec une accélération constante de 3 m/s² pendant 4 s. Quelle est sa vitesse finale ?",
  "ph-02": "Un véhicule roule à 20 m/s puis freine avec une décélération constante de 5 m/s². Quelle distance parcourt-il avant l'arrêt ?",
  "ph-03": "Une force de 18 N agit sur une masse de 6 kg. Quelle est l'accélération ?",
  "me-01": "Une poulie fixe idéale est utilisée pour soulever une charge de 200 N. Quelle force faut-il appliquer ?",
  "me-02": "Un engrenage de 12 dents entraîne un engrenage de 36 dents. Si le petit engrenage tourne à 900 tr/min, quelle est la vitesse du grand ?",
  "me-03": "Une poulie mobile idéale soutient une charge de 400 N avec deux brins de corde. Quelle force minimale faut-il exercer ?",
  "fc-ma-01": "Distance, vitesse, temps",
  "fc-ma-02": "Vitesse sol avec vent",
  "fc-ph-01": "Relation fondamentale de la dynamique",
  "fc-ph-02": "Équation de la vitesse en accélération constante",
  "fc-me-01": "Avantage mécanique d'une poulie mobile idéale",
  "fc-me-02": "Rapport de vitesse de deux engrenages",
};

export function loadAppState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.bank)) {
      const cardProgress = saved.cardProgress && typeof saved.cardProgress === "object"
        ? saved.cardProgress
        : Object.fromEntries((Array.isArray(saved.masteredCards) ? saved.masteredCards : []).map((id) => [id, {
            intervalDays: 1,
            repetitions: 1,
            dueAt: Date.now() + 24 * 60 * 60 * 1000,
          }]));
      const currentSeeds = new Map(initialData.map((item) => [item.id, item]));
      const bank = saved.bank.map((item) => (
        item.question === legacySeedPrompts[item.id] && currentSeeds.has(item.id)
          ? currentSeeds.get(item.id)
          : item
      ));
      const deletedContentIds = [...new Set([
        ...(Array.isArray(saved.deletedContentIds) ? saved.deletedContentIds : []),
        ...(Array.isArray(saved.deletedQuestionIds) ? saved.deletedQuestionIds : []),
      ].filter((id) => typeof id === "string"))];
      const questionIds = new Set(bank.filter((item) => item.type === "qcm").map((item) => item.id));
      const generatedCardIds = new Set(bank
        .filter((item) => item.type === "flashcard"
          && (questionIds.has(item.sourceQuestionId)
            || questionIds.has(item.id.replace(/-flashcard(?:-\d+)?$/, ""))
            || deletedContentIds.includes(item.sourceQuestionId)
            || deletedContentIds.some((id) => item.id === `${id}-flashcard`)))
        .map((item) => item.id));
      const independentBank = bank.filter((item) => !generatedCardIds.has(item.id));
      const visibleSeeds = initialData.filter((item) => !deletedContentIds.includes(item.id));
      return {
        bank: mergeQuestions(visibleSeeds, independentBank),
        deletedContentIds,
        mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : [],
        masteredCards: (Array.isArray(saved.masteredCards) ? saved.masteredCards : [])
          .filter((id) => !generatedCardIds.has(id)),
        cardProgress: Object.fromEntries(
          Object.entries(cardProgress).filter(([id]) => !generatedCardIds.has(id)),
        ),
        language: saved.language === "fr" ? "fr" : "en",
        theme: saved.theme === "light" ? "light" : "dark",
        planStartDate: typeof saved.planStartDate === "string" ? saved.planStartDate : localDateKey(new Date()),
        activity: saved.activity && typeof saved.activity === "object" ? saved.activity : {},
        stats: saved.stats && typeof saved.stats === "object" ? saved.stats : { answered: 0, correct: 0 },
        dailyStats: saved.dailyStats && typeof saved.dailyStats === "object" ? saved.dailyStats : {},
      };
    }
  } catch (error) {
    console.error("Could not read local app data:", error);
  }
  return { bank: initialData, deletedContentIds: [], mistakes: [], masteredCards: [], cardProgress: {}, language: "en", theme: "dark", planStartDate: localDateKey(new Date()), activity: {}, stats: { answered: 0, correct: 0 }, dailyStats: {} };
}

export function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save local app data:", error);
    throw new Error(t(state.language, "Local save failed. Check your browser's available storage.", "La sauvegarde locale a échoué. Vérifiez l'espace disponible de votre navigateur."));
  }
}

export function mergeQuestions(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export function resetProgress(state) {
  return {
    ...state,
    mistakes: [],
    masteredCards: [],
    cardProgress: {},
    planStartDate: localDateKey(new Date()),
    activity: {},
    stats: { answered: 0, correct: 0 },
    dailyStats: {},
  };
}
