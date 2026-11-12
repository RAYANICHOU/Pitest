import { useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardCheck, RotateCcw } from "lucide-react";
import { CATEGORIES } from "../lib/constants.js";
import { categoryLabel, t } from "../lib/i18n.js";
import { shuffle } from "../lib/questionSelection.js";

const filters = ["Toutes", ...CATEGORIES];
const letters = ["A", "B", "C", "D"];
const EXAM_DURATION_SECONDS = 30 * 60;

export default function Training({ questions, mistakes, onAnswer, onSessionComplete, onSessionActive, initialSession, language }) {
  const [category, setCategory] = useState("Toutes");
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [exam, setExam] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionMode, setSessionMode] = useState("practice");
  const submitted = useRef(false);
  const startedAt = useRef(null);
  const completionRecorded = useRef(false);

  const recordSessionCompletion = (completed) => {
    if (completionRecorded.current || !session || startedAt.current === null) return;
    completionRecorded.current = true;
    const answered = exam
      ? Object.keys(answers).length
      : session.filter((question) => question._answered).length;
    const correct = exam
      ? session.filter((question) => answers[question.id] !== undefined && answers[question.id] === question.answer).length
      : session.filter((question) => question._answered && question._correct).length;
    if (answered > 0) {
      onSessionComplete({
        mode: sessionMode,
        startedAt: startedAt.current,
        durationSeconds: Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000)),
        questionCount: session.length,
        answered,
        correct,
        completed,
      });
    }
  };

  const begin = (items, isExam = false, mode = isExam ? "exam" : "practice") => {
    onSessionActive(true);
    setSession(items.map((item) => ({ ...item, _answered: false, _correct: false })));
    setIndex(0);
    setSelected(null);
    setAnswers({});
    setExam(isExam);
    setExamFinished(false);
    startedAt.current = Date.now();
    setSeconds(0);
    submitted.current = false;
    completionRecorded.current = false;
    setSessionMode(mode);
  };

  const finishExam = () => {
    if (submitted.current || !session) return;
    submitted.current = true;
    session.forEach((question) => {
      if (answers[question.id] !== undefined) onAnswer(question, answers[question.id] === question.answer);
    });
    recordSessionCompletion(true);
    onSessionActive(false);
    setExamFinished(true);
  };

  useEffect(() => {
    if (!initialSession?.ids?.length) return;
    const found = initialSession.ids.map((id) => questions.find((question) => question.id === id)).filter(Boolean);
    begin(found, initialSession.mode === "exam", initialSession.mode);
  }, [initialSession?.token]);

  useEffect(() => {
    if (!session || examFinished || (!exam && index >= session.length)) return undefined;
    const updateElapsed = () => {
      if (startedAt.current !== null) {
        setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    };
    const timer = window.setInterval(updateElapsed, 1000);
    document.addEventListener("visibilitychange", updateElapsed);
    updateElapsed();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateElapsed);
    };
  }, [session, index, exam, examFinished]);

  useEffect(() => {
    if (exam && session && !examFinished && seconds >= EXAM_DURATION_SECONDS) finishExam();
  }, [seconds, exam, session, examFinished, answers]);

  const filtered = useMemo(() => category === "Toutes" ? questions : questions.filter((question) => question.category === category), [category, questions]);
  const current = session?.[index];
  const complete = session && (exam ? examFinished : index >= session.length);
  const score = exam
    ? session?.reduce((total, question) => total + (answers[question.id] === question.answer ? 1 : 0), 0) || 0
    : session?.reduce((total, question) => total + (question._correct ? 1 : 0), 0) || 0;
  const remaining = Math.max(0, EXAM_DURATION_SECONDS - seconds);
  const time = exam
    ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
    : `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const answerQuestion = (choice) => {
    if (!current) return;
    if (exam) {
      setAnswers((value) => ({ ...value, [current.id]: choice }));
      return;
    }
    if (selected !== null) return;
    setSelected(choice);
    const correct = choice === current.answer;
    onAnswer(current, correct);
    setSession((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, _answered: true, _correct: correct } : item));
  };
  const next = () => {
    if (index >= session.length - 1) {
      recordSessionCompletion(true);
      onSessionActive(false);
    }
    setIndex((value) => value + 1);
    setSelected(null);
  };
  const exitSession = () => {
    if (exam && !examFinished && Object.keys(answers).length > 0
      && !window.confirm(t(language, "Exit the mock exam? Your answers so far will not be scored.", "Quitter l'examen blanc ? Vos réponses ne seront pas prises en compte."))) return;
    if (!exam) recordSessionCompletion(false);
    onSessionActive(false);
    setSession(null);
  };
  const startPractice = (items, mode = "practice") => begin(shuffle(items), false, mode);
  const startExam = () => begin(shuffle(questions).slice(0, Math.min(20, questions.length)), true);

  if (!session) {
    const missed = new Set(mistakes.map((item) => item.id));
    const mistakesById = new Map(mistakes.map((mistake) => [mistake.id, mistake]));
    const review = questions.filter((question) => missed.has(question.id)).sort((first, second) => {
      const firstMistake = mistakesById.get(first.id);
      const secondMistake = mistakesById.get(second.id);
      return (secondMistake.attempts || 0) - (firstMistake.attempts || 0)
        || (firstMistake.lastAt || "").localeCompare(secondMistake.lastAt || "");
    });
    const examQuestionCount = Math.min(20, questions.length);
    return <div className="space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-sky-300">{t(language, "Practice area", "Zone d'entraînement")}</p><h1 className="mt-1 text-2xl font-bold text-white">{t(language, "Your turn.", "À vous de jouer.")}</h1><p className="mt-1 text-sm text-slate-400">{t(language, "Choose a subject or start a mock exam.", "Choisissez une matière ou lancez un examen blanc.")}</p></div>
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <h2 className="text-sm font-bold text-white">{t(language, "Filter by subject", "Filtrer par matière")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setCategory(item)} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold transition ${category === item ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-white/[0.08] text-slate-400 hover:bg-white/[0.04]"}`}>{item === "Toutes" ? t(language, "All", "Toutes") : categoryLabel(language, item)}</button>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4"><div><p className="text-sm font-semibold text-white">{t(language, `${filtered.length} questions`, `${filtered.length} questions`)}</p><p className="mt-1 text-[11px] text-slate-500">{t(language, "Instant feedback and detailed explanations", "Feedback et explications détaillées")}</p></div><ClipboardCheck size={20} className="text-sky-300" /></div>
        <button onClick={() => startPractice(filtered)} disabled={!filtered.length} className="mt-4 min-h-[48px] w-full rounded-xl bg-sky-400 text-sm font-bold text-navy-950 transition hover:bg-sky-300 disabled:opacity-50">{t(language, "Start practice", "Démarrer l'entraînement")} <ArrowRight size={16} className="ml-1 inline" /></button>
      </section>
      <section className="mock-exam-panel rounded-2xl border border-sky-300/15 bg-gradient-to-br from-[#152a46] to-[#121f32] p-4">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-300/10 text-sky-300"><AlarmClock size={20} /></span><div><h2 className="text-sm font-bold text-white">{t(language, "Mock exam", "Examen blanc")}</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">{t(language, `${examQuestionCount} questions · 30 min limit · answers at the end`, `${examQuestionCount} question${examQuestionCount > 1 ? "s" : ""} · 30 min maximum · corrigé à la fin`)}</p></div></div>
        <button onClick={startExam} disabled={!questions.length} className="mt-4 min-h-[48px] w-full rounded-xl border border-sky-300/20 bg-sky-300/10 text-sm font-bold text-sky-200 transition hover:bg-sky-300/15 disabled:opacity-50">{t(language, "Start mock exam", "Lancer l'examen blanc")}</button>
      </section>
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-white">{t(language, "Review queue", "À retravailler")}</h2><p className="mt-1 text-xs text-slate-500">{t(language, `${review.length} pending questions`, `${review.length} question${review.length > 1 ? "s" : ""} en attente`)}</p></div><CircleAlert size={19} className="text-rose-300" /></div>
        <button disabled={!review.length} onClick={() => startPractice(review, "mistakes")} className="mt-4 min-h-11 w-full rounded-xl border border-white/[0.08] text-sm font-semibold text-slate-200 disabled:opacity-40">{t(language, "Review mistakes", "Réviser les erreurs")} <RotateCcw size={14} className="ml-1 inline" /></button>
      </section>
    </div>;
  }

  if (complete) return <div className="space-y-5 py-5">
    <div className="py-5 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Check size={30} /></div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-sky-300">{exam ? t(language, "Exam complete", "Examen terminé") : sessionMode === "daily-check-in" ? t(language, "Daily check-in complete", "Test du jour terminé") : t(language, "Session complete", "Session terminée")}</p>
      <h1 className="mt-2 text-3xl font-bold text-white">{score}<span className="text-lg text-slate-500">/{session.length}</span></h1>
      <p className="mt-2 text-sm text-slate-400">{exam ? t(language, "Time remaining", "Temps restant") : t(language, "Time elapsed", "Temps écoulé")} : {time}</p>
      <p className="mt-1 text-xs text-slate-500">{t(language, `${Math.round((score / session.length) * 100)}% score`, `${Math.round((score / session.length) * 100)}% de réussite`)}</p>
    </div>
    {exam && <section className="space-y-3">
      <h2 className="text-sm font-bold text-white">{t(language, "Answer review", "Corrigé détaillé")}</h2>
      {session.map((question, questionIndex) => {
        const answer = answers[question.id];
        const correct = answer === question.answer;
        return <article key={question.id} className={`rounded-2xl border p-4 ${correct ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-rose-400/20 bg-rose-400/[0.04]"}`}>
          <div className="flex items-start justify-between gap-3"><h3 className="text-xs font-bold leading-relaxed text-white">{questionIndex + 1}. {question.question}</h3><span className={`shrink-0 text-[10px] font-bold ${correct ? "text-emerald-300" : "text-rose-300"}`}>{correct ? t(language, "Correct", "Correct") : answer === undefined ? t(language, "Unanswered", "Sans réponse") : t(language, "Incorrect", "Incorrect")}</span></div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{t(language, "Your answer:", "Votre choix :")} {answer === undefined ? t(language, "none", "aucun") : `${letters[answer]}. ${question.options[answer]}`}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-200">{t(language, "Correct answer:", "Bonne réponse :")} {letters[question.answer]}. {question.options[question.answer]}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">{question.explanation}</p>
        </article>;
      })}
    </section>}
    <button onClick={() => { exitSession(); setCategory("Toutes"); }} className="min-h-12 w-full rounded-xl bg-sky-400 px-6 text-sm font-bold text-navy-950">{t(language, "Back to practice", "Retour à l'entraînement")}</button>
  </div>;

  const selectedChoice = exam ? answers[current.id] : selected;
  const unanswered = exam ? session.filter((question) => answers[question.id] === undefined).length : 0;

  return <div className="space-y-5">
    <div className="flex items-center justify-between">
      <button onClick={exitSession} className="flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-400"><ArrowLeft size={17} /> {t(language, "Exit", "Quitter")}</button>
      <span className="rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-300">{index + 1} / {session.length}</span>
      <span className={`flex min-w-[66px] items-center justify-end gap-1.5 text-xs font-semibold tabular-nums ${exam && remaining < 60 ? "text-rose-300" : "text-sky-200"}`}><AlarmClock size={15} />{time}</span>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${exam ? (Object.keys(answers).length / session.length) * 100 : ((index + (selected !== null ? 1 : 0)) / session.length) * 100}%` }} /></div>
    {exam && <div className="flex items-center justify-between text-[11px] text-slate-400"><span>{t(language, "Mock exam · answers shown at the end", "Examen blanc · corrigé après validation")}</span><span>{t(language, `${unanswered} unanswered`, `${unanswered} sans réponse`)}</span></div>}
    <div className="flex items-center gap-2"><span className="rounded-md bg-sky-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200">{categoryLabel(language, current.category)}</span>{exam && <span className="text-[10px] font-semibold text-amber-200">{t(language, "Mock exam", "Examen blanc")}</span>}</div>
    <h1 className="text-xl font-bold leading-relaxed text-white">{current.question}</h1>
    <div className="space-y-2.5">
      {current.options.map((option, choice) => {
        const correct = choice === current.answer;
        const chosen = selectedChoice === choice;
        let variant = "border-white/[0.08] bg-white/[0.025] text-slate-200 hover:border-sky-300/30 hover:bg-white/[0.05]";
        if (!exam && selected !== null && correct) variant = "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
        else if (!exam && selected !== null && chosen) variant = "border-rose-400/40 bg-rose-400/10 text-rose-100";
        else if (exam && chosen) variant = "border-sky-300/40 bg-sky-300/10 text-sky-100";
        return <button key={`${current.id}-${choice}`} onClick={() => answerQuestion(choice)} disabled={!exam && selected !== null} aria-pressed={chosen} className={`flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3.5 text-left text-sm leading-relaxed transition ${variant}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${chosen ? "bg-sky-300/15 text-sky-200" : "bg-white/[0.06] text-slate-400"}`}>{letters[choice]}</span><span className="flex-1">{option}</span>
          {!exam && selected !== null && correct && <Check size={17} className="text-emerald-300" />}
        </button>;
      })}
    </div>
    {!exam && selected !== null && <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${selected === current.answer ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-rose-400/20 bg-rose-400/[0.06]"}`}>
      <p className={`text-sm font-bold ${selected === current.answer ? "text-emerald-200" : "text-rose-200"}`}>{selected === current.answer ? t(language, "Correct!", "Bonne réponse !") : t(language, "Review this one", "À retravailler")}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{current.explanation}</p>
    </div>}
    <div className="flex gap-3">
      {exam && <button onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="min-h-12 flex-1 rounded-xl border border-white/[0.09] text-sm font-semibold text-slate-300 disabled:opacity-35"><ArrowLeft size={15} className="mr-1 inline" />{t(language, "Previous", "Précédente")}</button>}
      {exam
        ? index < session.length - 1
          ? <button onClick={() => setIndex((value) => value + 1)} className="min-h-12 flex-1 rounded-xl bg-sky-400 text-sm font-bold text-navy-950">{t(language, "Next", "Suivante")} <ArrowRight size={15} className="ml-1 inline" /></button>
          : <button onClick={() => { if (unanswered && !window.confirm(t(language, `${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish the exam anyway?`, `Il reste ${unanswered} question${unanswered > 1 ? "s" : ""} sans réponse. Terminer l'examen quand même ?`))) return; finishExam(); }} className="min-h-12 flex-1 rounded-xl bg-sky-400 text-sm font-bold text-navy-950">{t(language, "Finish exam", "Terminer l'examen")} <Check size={15} className="ml-1 inline" /></button>
        : selected !== null && <button onClick={next} className="min-h-12 flex-1 rounded-xl bg-sky-400 text-sm font-bold text-navy-950">{index === session.length - 1 ? t(language, "View results", "Voir mes résultats") : t(language, "Next question", "Question suivante")} <ArrowRight size={15} className="ml-1 inline" /></button>}
    </div>
  </div>;
}
