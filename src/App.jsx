import { useEffect, useMemo, useState } from "react";
import { Plane, Sparkles } from "lucide-react";
import BottomNav from "./components/BottomNav.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Training from "./components/Training.jsx";
import Flashcards from "./components/Flashcards.jsx";
import Settings from "./components/Settings.jsx";
import { loadAppState, saveAppState, mergeQuestions } from "./lib/storage.js";
import { localDateKey } from "./lib/constants.js";
import { t } from "./lib/i18n.js";

function App() {
  const [data, setData] = useState(loadAppState);
  const [tab, setTab] = useState("home");
  const [trainingSession, setTrainingSession] = useState(null);
  const [trainingActive, setTrainingActive] = useState(false);
  const [notice, setNotice] = useState("");
  const language = data.language === "fr" ? "fr" : "en";
  const theme = data.theme === "light" ? "light" : "dark";

  useEffect(() => {
    try { saveAppState(data); } catch (error) { setNotice(error.message); }
  }, [data]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t(language, "Pilot Prep — Entrance Exam", "Pilot Prep — Concours d'entrée");
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "light" ? "#f8fafc" : "#0b1220",
    );
  }, [theme]);

  const questions = useMemo(() => data.bank.filter((item) => item.type === "qcm"), [data.bank]);
  const flashcards = useMemo(() => data.bank.filter((item) => item.type === "flashcard"), [data.bank]);

  const startSession = (ids, mode = "practice") => {
    setTrainingActive(true);
    setTrainingSession({ ids, mode, token: Date.now() });
    setTab("training");
  };

  const recordAnswer = (question, isCorrect) => {
    const today = localDateKey(new Date());
    setData((current) => {
      const byCategory = { ...(current.stats.byCategory || {}) };
      const subject = byCategory[question.category] || { answered: 0, correct: 0 };
      byCategory[question.category] = {
        answered: subject.answered + 1,
        correct: subject.correct + (isCorrect ? 1 : 0),
      };
      const mistakes = isCorrect
        ? current.mistakes.filter((mistake) => mistake.id !== question.id)
        : [
            { id: question.id, attempts: (current.mistakes.find((mistake) => mistake.id === question.id)?.attempts || 0) + 1, lastAt: today },
            ...current.mistakes.filter((mistake) => mistake.id !== question.id),
          ];
      return {
        ...current,
        mistakes,
        activity: { ...current.activity, [today]: true },
        stats: {
          ...current.stats,
          answered: (current.stats.answered || 0) + 1,
          correct: (current.stats.correct || 0) + (isCorrect ? 1 : 0),
          byCategory,
        },
      };
    });
  };

  const reviewCard = (id, rating) => setData((current) => {
    const previous = current.cardProgress?.[id] || { repetitions: 0, intervalDays: 0 };
    const repetitions = rating === "again" ? 0 : previous.repetitions + 1;
    const intervals = [1, 3, 7, 14, 30];
    const intervalDays = rating === "again" ? 0 : intervals[Math.min(repetitions - 1, intervals.length - 1)];
    const dueAt = rating === "again"
      ? Date.now() + 10 * 60 * 1000
      : Date.now() + intervalDays * 24 * 60 * 60 * 1000;
    const masteredCards = rating === "again"
      ? current.masteredCards.filter((cardId) => cardId !== id)
      : current.masteredCards.includes(id) ? current.masteredCards : [...current.masteredCards, id];
    return {
      ...current,
      masteredCards,
      cardProgress: {
        ...current.cardProgress,
        [id]: { repetitions, intervalDays, dueAt },
      },
    };
  });
  const saveQuestions = async (items) => {
    const currentById = new Map(data.bank.map((item) => [item.id, item]));
    const changedQuestionIds = new Set();
    const changedCardIds = new Set();
    for (const item of items) {
      const previous = currentById.get(item.id);
      if (!previous) continue;
      const changed = previous.category !== item.category
        || previous.question !== item.question
        || previous.answer !== item.answer
        || previous.explanation !== item.explanation
        || JSON.stringify(previous.options) !== JSON.stringify(item.options);
      if (!changed) continue;
      if (item.type === "qcm") changedQuestionIds.add(item.id);
      if (item.type === "flashcard") changedCardIds.add(item.id);
    }
    const cardProgress = { ...(data.cardProgress || {}) };
    changedCardIds.forEach((id) => delete cardProgress[id]);
    const next = {
      ...data,
      bank: mergeQuestions(data.bank, items),
      deletedContentIds: (data.deletedContentIds || []).filter(
        (id) => !items.some((item) => item.id === id),
      ),
      mistakes: data.mistakes.filter((mistake) => !changedQuestionIds.has(mistake.id)),
      masteredCards: data.masteredCards.filter((id) => !changedCardIds.has(id)),
      cardProgress,
    };
    saveAppState(next);
    setData(next);
    return { saved: true };
  };
  const updateManagedQuestion = (updatedQuestion) => {
    const previousQuestion = data.bank.find((item) => item.id === updatedQuestion.id && item.type === "qcm");
    if (!previousQuestion) return { saved: false };
    const changed = previousQuestion.category !== updatedQuestion.category
      || previousQuestion.question !== updatedQuestion.question
      || previousQuestion.answer !== updatedQuestion.answer
      || previousQuestion.explanation !== updatedQuestion.explanation
      || JSON.stringify(previousQuestion.options) !== JSON.stringify(updatedQuestion.options);
    if (!changed) return { saved: true, changed: false };
    const next = {
      ...data,
      bank: data.bank.map((item) => item.id === updatedQuestion.id ? updatedQuestion : item),
      mistakes: data.mistakes.filter((mistake) => mistake.id !== updatedQuestion.id),
    };
    saveAppState(next);
    setData(next);
    return { saved: true, changed: true };
  };
  const deleteManagedQuestion = (questionId) => {
    const next = {
      ...data,
      bank: data.bank.filter((item) => item.id !== questionId),
      deletedContentIds: [...new Set([...(data.deletedContentIds || []), questionId])],
      mistakes: data.mistakes.filter((mistake) => mistake.id !== questionId),
    };
    saveAppState(next);
    setData(next);
    return { saved: true };
  };
  const updateManagedFlashcard = (updatedCard) => {
    const previousCard = data.bank.find((item) => item.id === updatedCard.id && item.type === "flashcard");
    if (!previousCard) return { saved: false };
    const changed = previousCard.category !== updatedCard.category
      || previousCard.question !== updatedCard.question
      || previousCard.explanation !== updatedCard.explanation;
    if (!changed) return { saved: true, changed: false };
    const next = {
      ...data,
      bank: data.bank.map((item) => item.id === updatedCard.id ? updatedCard : item),
      masteredCards: data.masteredCards.filter((id) => id !== updatedCard.id),
      cardProgress: Object.fromEntries(
        Object.entries(data.cardProgress || {}).filter(([id]) => id !== updatedCard.id),
      ),
    };
    saveAppState(next);
    setData(next);
    return { saved: true, changed: true };
  };
  const deleteManagedFlashcard = (cardId) => {
    const next = {
      ...data,
      bank: data.bank.filter((item) => item.id !== cardId || item.type !== "flashcard"),
      deletedContentIds: [...new Set([...(data.deletedContentIds || []), cardId])],
      masteredCards: data.masteredCards.filter((id) => id !== cardId),
      cardProgress: Object.fromEntries(
        Object.entries(data.cardProgress || {}).filter(([id]) => id !== cardId),
      ),
    };
    saveAppState(next);
    setData(next);
    return { saved: true };
  };

  return (
    <div className="app-root min-h-screen bg-navy-950 text-slate-100">
      <div className="app-frame mx-auto min-h-screen w-full max-w-[520px] border-x border-white/[0.04] bg-[#0d1626] shadow-2xl">
        <header className="app-header sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/[0.06] bg-[#0d1626]/95 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-400/10 text-sky-300"><Plane size={20} strokeWidth={2.2} /></div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500">{t(language, "Pilot entrance exam", "Concours pilote")}</p>
              <p className="text-sm font-bold tracking-wide text-white">PILOT <span className="text-sky-300">PREP</span></p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-sky-300/10 bg-sky-300/[0.06] px-3 py-1.5 text-[11px] font-semibold text-sky-200"><Sparkles size={13} /> {t(language, "30-day goal", "Objectif 30 jours")}</div>
        </header>

        {notice && <div role="alert" className="mx-4 mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{notice}</div>}
        <main className="min-h-[calc(100vh-138px)] px-4 pb-28 pt-5">
          {tab === "home" && <Dashboard data={data} questions={questions} language={language} onStart={startSession} onOpenTraining={() => { setTrainingSession(null); setTab("training"); }} />}
          {tab === "training" && <Training key={trainingSession?.token || "lobby"} questions={questions} mistakes={data.mistakes} language={language} onAnswer={recordAnswer} onSessionActive={setTrainingActive} initialSession={trainingSession} />}
          {tab === "cards" && <Flashcards cards={flashcards} masteredCards={data.masteredCards} cardProgress={data.cardProgress || {}} language={language} onReview={reviewCard} />}
          {tab === "settings" && <Settings
            data={data}
            language={language}
            theme={theme}
            onLanguageChange={(next) => setData((current) => ({ ...current, language: next }))}
            onThemeChange={(next) => setData((current) => ({ ...current, theme: next }))}
            onSaveQuestions={saveQuestions}
            onUpdateQuestion={updateManagedQuestion}
            onDeleteQuestion={deleteManagedQuestion}
            onUpdateFlashcard={updateManagedFlashcard}
            onDeleteFlashcard={deleteManagedFlashcard}
            onReplace={setData}
          />}
        </main>
        {!trainingActive && <BottomNav active={tab} language={language} onChange={(next) => { setTab(next); if (next === "training") setTrainingSession(null); }} />}
      </div>
    </div>
  );
}

export default App;
