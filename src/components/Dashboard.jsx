import { useState } from "react";
import { ArrowRight, BarChart3, Check, ChevronDown, ChevronRight, Clock3, RotateCcw, Target, Zap } from "lucide-react";
import { CATEGORIES, localDateKey } from "../lib/constants.js";
import { categoryLabel, locale, t } from "../lib/i18n.js";
import { randomQuestionIds } from "../lib/questionSelection.js";
import { getGoalProgress, getSubjectQuestionGoal, summarizeProgress } from "../lib/progress.js";

const subjectStyle = {
  Anglais: { icon: "EN", color: "text-violet-300", bar: "bg-violet-400", panel: "border-violet-300/10" },
  Maths: { icon: "∑", color: "text-sky-300", bar: "bg-sky-400", panel: "border-sky-300/10" },
  Physique: { icon: "Φ", color: "text-amber-300", bar: "bg-amber-400", panel: "border-amber-300/10" },
  Mécanique: { icon: "⚙", color: "text-emerald-300", bar: "bg-emerald-400", panel: "border-emerald-300/10" },
};

function getPlanDays(activity, startDate) {
  const days = [];
  const date = new Date(`${startDate}T12:00:00`);
  const todayKey = localDateKey(new Date());
  for (let index = 0; index < 30; index += 1) {
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + (index === 0 ? 0 : 1));
    const key = localDateKey(date);
    days.push({ key, day: index + 1, active: Boolean(activity[key]), today: key === todayKey, future: key > todayKey });
  }
  return days;
}

export default function Dashboard({ data, questions, language, onStart, onOpenTraining }) {
  const [progressPeriod, setProgressPeriod] = useState("day");
  const [reportExpanded, setReportExpanded] = useState(false);
  const stats = data.stats || { answered: 0, correct: 0 };
  const overall = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : null;
  const overallProgress = overall ?? 0;
  const days = getPlanDays(data.activity || {}, data.planStartDate || localDateKey(new Date()));
  const start = Date.parse(`${data.planStartDate || localDateKey(new Date())}T00:00:00Z`);
  const today = Date.parse(`${localDateKey(new Date())}T00:00:00Z`);
  const dayNumber = Math.max(1, Math.min(30, Math.floor((today - start) / 86_400_000) + 1));
  const dateLabel = new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "long" }).format(new Date());
  const periodStats = summarizeProgress(data.dailyStats || {}, progressPeriod);
  const subjectGoal = getSubjectQuestionGoal(progressPeriod);
  const periodLabels = {
    day: t(language, "Today", "Jour"),
    week: t(language, "This week", "Semaine"),
    month: t(language, "This month", "Mois"),
  };
  const periodCategories = Object.entries(periodStats.byCategory)
    .filter(([, subject]) => subject.answered > 0)
    .sort(([, first], [, second]) => first.correct / first.answered - second.correct / second.answered);
  const periodMinutes = Math.round(periodStats.durationSeconds / 60);
  const mistakesById = new Map((data.mistakes || []).map((mistake) => [mistake.id, mistake]));
  const errorIds = questions
    .filter((question) => mistakesById.has(question.id))
    .sort((first, second) => {
      const firstMistake = mistakesById.get(first.id);
      const secondMistake = mistakesById.get(second.id);
      return (secondMistake.attempts || 0) - (firstMistake.attempts || 0)
        || (firstMistake.lastAt || "").localeCompare(secondMistake.lastAt || "");
    })
    .map((question) => question.id);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-slate-400">{dateLabel} · {t(language, "Ready for take-off?", "Prêt pour le décollage ?")}</p>
        <h1 className="mt-1 text-[27px] font-bold leading-tight tracking-tight text-white">{t(language, "Your progress", "Votre progression")}<span className="text-sky-300">.</span></h1>
      </section>

      <section className="space-y-3">
        <button onClick={() => onStart(randomQuestionIds(questions, 10), "daily-check-in")} disabled={!questions.length} className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl bg-sky-400 px-4 text-left text-navy-950 shadow-lg shadow-sky-950/25 transition hover:bg-sky-300 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/[0.09]"><Zap size={21} fill="currentColor" /></span>
          <span className="flex-1"><span className="block text-base font-extrabold">{t(language, "Daily check-in", "Test du jour")}</span><span className="mt-0.5 block text-[11px] font-medium text-navy-950/70">{t(language, `${Math.min(10, questions.length)} random mixed questions · instant feedback`, `${Math.min(10, questions.length)} QCM mixtes aléatoires · correction immédiate`)}</span></span><ArrowRight size={19} />
        </button>
        <button onClick={() => onStart(errorIds, "mistakes")} disabled={!errorIds.length} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.025] px-4 text-left transition hover:bg-white/[0.05] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-400/10 text-rose-300"><RotateCcw size={19} /></span>
          <span className="flex-1"><span className="block text-sm font-bold text-white">{t(language, "Review my mistakes", "Réviser mes erreurs")}</span><span className="mt-0.5 block text-[11px] text-slate-500">{errorIds.length ? t(language, `${errorIds.length} question${errorIds.length > 1 ? "s" : ""} to revisit`, `${errorIds.length} question${errorIds.length > 1 ? "s" : ""} à retravailler`) : t(language, "Your queue is clear. Great work!", "Votre file est vide, bravo !")}</span></span><ChevronRight size={17} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-600"><Clock3 size={12} /> {t(language, "Questions leave the queue after a correct answer.", "Les erreurs disparaissent de la file après une bonne réponse.")}</div>
      </section>

      <section className="dashboard-hero relative overflow-hidden rounded-[26px] border border-sky-300/15 bg-gradient-to-br from-[#163254] via-[#142a47] to-[#132238] p-5">
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-sky-200/[0.08]" />
        <div className="absolute -right-2 -top-6 h-32 w-32 rounded-full border border-sky-200/[0.08]" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-sky-200/75"><Target size={14} /> {t(language, "All-time accuracy", "Réussite cumulée")}</p>
            <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-white">{overall === null ? "—" : <>{overall}<span className="text-2xl text-sky-200">%</span></>}</p>
            <p className="mt-2 text-xs text-slate-300">{stats.answered} {t(language, stats.answered === 1 ? "answer recorded" : "answers recorded", stats.answered === 1 ? "réponse enregistrée" : "réponses enregistrées")}</p>
          </div>
          <div className="grid h-[102px] w-[102px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#38bdf8 ${overallProgress * 3.6}deg, var(--progress-track) 0deg)` }}>
            <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-[#142a47]"><span className="text-2xl">✈</span></div>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300 transition-all duration-700" style={{ width: `${overallProgress}%` }} /></div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-bold text-white">{t(language, "30-day flight plan", "Cap sur 30 jours")}</h2><p className="mt-1 text-[11px] text-slate-500">{t(language, `Day ${dayNumber} of 30 · ${days.filter((day) => day.active).length} active study days`, `Jour ${dayNumber} sur 30 · ${days.filter((day) => day.active).length} jours de révision actifs`)}</p></div>
        <span className="rounded-lg bg-sky-400/10 px-2.5 py-1 text-[11px] font-bold text-sky-300">{dayNumber}/30</span>
        </div>
        <div className="mt-4 grid grid-cols-10 gap-x-2 gap-y-2.5">
        {days.map((day) => <div key={day.key} title={t(language, `Day ${day.day}`, `Jour ${day.day}`)} aria-label={t(language, `Day ${day.day}${day.active ? ", session completed" : ""}`, `Jour ${day.day}${day.active ? ", séance effectuée" : ""}`)}
          className={`grid aspect-square place-items-center rounded-[7px] text-[9px] font-semibold ${day.active ? "bg-sky-400 text-navy-950" : day.today ? "border border-sky-300/50 bg-sky-300/10 text-sky-200" : day.future ? "bg-white/[0.02] text-slate-700" : "bg-white/[0.055] text-slate-600"}`}>
            {day.active ? <Check size={11} strokeWidth={3} /> : day.day}
          </div>)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-bold text-white">{t(language, "Subjects", "Vos matières")}</h2><p className="mt-1 text-[11px] text-slate-500">{t(language, "Progress toward each subject goal", "Progression vers l'objectif de chaque matière")}</p></div><button onClick={onOpenTraining} className="flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-300">{t(language, "Practice all", "Tout réviser")} <ChevronRight size={15} /></button></div>
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.035] p-1" role="group" aria-label={t(language, "Subject progress period", "Période de progression des matières")}>
          {Object.entries(periodLabels).map(([period, label]) => <button key={period} type="button" aria-pressed={progressPeriod === period} onClick={() => setProgressPeriod(period)} className={`min-h-10 rounded-lg px-1 text-[10px] font-semibold transition-colors ${progressPeriod === period ? "bg-sky-400 text-navy-950" : "text-slate-400 hover:text-white"}`}>{label}</button>)}
        </div>
        <p className="mb-3 text-[10px] text-slate-500">{t(language, `Goal: ${subjectGoal} questions per subject ${progressPeriod === "day" ? "today" : progressPeriod === "week" ? "this week" : "this month"}.`, `Objectif : ${subjectGoal} questions par matière ${progressPeriod === "day" ? "aujourd'hui" : progressPeriod === "week" ? "cette semaine" : "ce mois-ci"}.`)}</p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((category) => {
            const subject = periodStats.byCategory[category] || { answered: 0, correct: 0 };
            const goalProgress = getGoalProgress(subject.answered, subjectGoal);
            const style = subjectStyle[category];
            const subjectQuestions = questions.filter((question) => question.category === category);
            return <button key={category} type="button" onClick={() => onStart(subjectQuestions.map((question) => question.id), "practice")} disabled={!subjectQuestions.length} aria-label={t(language, `${categoryLabel(language, category)}: ${subject.answered} of ${subjectGoal} goal questions completed. Start practice with ${subjectQuestions.length} questions.`, `${categoryLabel(language, category)} : ${subject.answered} sur ${subjectGoal} questions d'objectif terminées. Commencer une séance de ${subjectQuestions.length} questions.`)}
              className={`min-h-[142px] rounded-2xl border ${style.panel} bg-white/[0.025] p-3.5 text-left transition hover:bg-white/[0.055] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55`}>
              <div className="flex items-center justify-between"><span className={`grid h-8 min-w-8 place-items-center rounded-lg bg-white/[0.06] px-1 text-xs font-bold ${style.color}`}>{style.icon}</span><span className="text-xs font-bold text-slate-300">{goalProgress}%</span></div>
              <h3 className="mt-3 text-sm font-bold text-white">{categoryLabel(language, category)}</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">{subjectQuestions.length ? t(language, `${subject.answered} / ${subjectGoal} questions · ${subjectQuestions.length} available`, `${subject.answered} / ${subjectGoal} questions · ${subjectQuestions.length} disponibles`) : t(language, "No questions yet", "Aucune question")}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={subjectGoal} aria-valuenow={Math.min(subject.answered, subjectGoal)} aria-label={t(language, `${categoryLabel(language, category)} goal progress`, `Progression de l'objectif ${categoryLabel(language, category)}`)}><div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${goalProgress}%` }} /></div>
            </button>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left" aria-expanded={reportExpanded} onClick={() => setReportExpanded((expanded) => !expanded)}>
          <span>
            <span className="flex items-center gap-2 text-sm font-bold text-white"><BarChart3 size={16} className="text-sky-300" />{t(language, "Study report", "Bilan de révision")}</span>
            <p className="mt-1 text-[10px] text-slate-500">{progressPeriod === "day"
              ? new Intl.DateTimeFormat(locale(language), { dateStyle: "medium" }).format(new Date())
              : `${new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "short" }).format(new Date(`${periodStats.start}T12:00:00`))} – ${new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "short" }).format(new Date(`${periodStats.end}T12:00:00`))}`}</p>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-slate-400">{periodStats.answered} {t(language, "questions", "questions")}<ChevronDown size={16} className={`transition-transform ${reportExpanded ? "rotate-180" : ""}`} /></span>
        </button>
        {reportExpanded && <div className="mt-3 border-t border-white/[0.06] pt-3">
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: t(language, "Questions", "Questions"), value: periodStats.answered },
            { label: t(language, "Accuracy", "Réussite"), value: periodStats.accuracy === null ? "—" : `${periodStats.accuracy}%` },
            { label: t(language, "Quiz time", "Temps de QCM"), value: `${periodMinutes} ${t(language, "min", "min")}` },
            { label: t(language, "Active days", "Jours actifs"), value: `${periodStats.activeDays}${progressPeriod === "day" ? "" : `/${progressPeriod === "week" ? 7 : new Date().getDate()}`}` },
          ].map((item) => <div key={item.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] text-slate-500">{item.label}</p>
            <p className="mt-1 text-base font-bold text-white">{item.value}</p>
          </div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
          <span>{periodStats.sessions} {t(language, "sessions", "séances")}</span>
          <span>{periodStats.dailyCheckIns} {t(language, "daily tests", "tests du jour")}</span>
          <span>{periodStats.mockExams} {t(language, "mock exams", "examens blancs")}</span>
          <span>{periodStats.flashcardsReviewed} {t(language, "flashcards reviewed", "flashcards révisées")}</span>
        </div>
        {periodCategories.length > 0 && <div className="mt-4 border-t border-white/[0.06] pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t(language, "Needs attention", "À renforcer")}</p>
          <div className="space-y-2">{periodCategories.map(([category, subject]) => {
            const accuracy = Math.round((subject.correct / subject.answered) * 100);
            return <div key={category} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-slate-300">{categoryLabel(language, category)} <span className="text-slate-600">· {subject.answered}</span></span>
              <span className={accuracy < 70 ? "font-bold text-amber-300" : "text-slate-400"}>{accuracy}%</span>
            </div>;
          })}</div>
        </div>}
        {periodStats.answered === 0 && periodStats.flashcardsReviewed === 0 && <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{t(language, "No study activity recorded for this period yet. Complete a short test or review a flashcard to start your report.", "Aucune activité enregistrée pour cette période. Faites un test court ou révisez une flashcard pour commencer votre suivi.")}</p>}
        {(periodStats.answered > 0 || periodStats.flashcardsReviewed > 0) && <p className="mt-3 text-[10px] text-slate-600">{t(language, "Elapsed time for practice and mock-exam sessions; flashcard reviews are counted separately.", "Temps écoulé des sessions de QCM et d'examen; les flashcards sont comptées séparément.")}</p>}
        </div>}
      </section>

    </div>
  );
}
