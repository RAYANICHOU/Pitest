import { ArrowRight, Check, ChevronRight, Clock3, RotateCcw, Target, Zap } from "lucide-react";
import { CATEGORIES, localDateKey } from "../lib/constants.js";
import { categoryLabel, locale, t } from "../lib/i18n.js";

const subjectStyle = {
  Anglais: { icon: "EN", color: "text-violet-300", bar: "bg-violet-400", panel: "border-violet-300/10" },
  Maths: { icon: "∑", color: "text-sky-300", bar: "bg-sky-400", panel: "border-sky-300/10" },
  Physique: { icon: "Φ", color: "text-amber-300", bar: "bg-amber-400", panel: "border-amber-300/10" },
  Mécanique: { icon: "⚙", color: "text-emerald-300", bar: "bg-emerald-400", panel: "border-emerald-300/10" },
};

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

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
  const stats = data.stats || { answered: 0, correct: 0 };
  const overall = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0;
  const days = getPlanDays(data.activity || {}, data.planStartDate || localDateKey(new Date()));
  const start = Date.parse(`${data.planStartDate || localDateKey(new Date())}T00:00:00Z`);
  const today = Date.parse(`${localDateKey(new Date())}T00:00:00Z`);
  const dayNumber = Math.max(1, Math.min(30, Math.floor((today - start) / 86_400_000) + 1));
  const dateLabel = new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "long" }).format(new Date());
  const express = shuffle(questions).slice(0, 10).map((question) => question.id);
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

      <section className="dashboard-hero relative overflow-hidden rounded-[26px] border border-sky-300/15 bg-gradient-to-br from-[#163254] via-[#142a47] to-[#132238] p-5">
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border border-sky-200/[0.08]" />
        <div className="absolute -right-2 -top-6 h-32 w-32 rounded-full border border-sky-200/[0.08]" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-sky-200/75"><Target size={14} /> {t(language, "Overall accuracy", "Réussite globale")}</p>
            <p className="mt-2 text-[42px] font-bold leading-none tracking-tight text-white">{overall}<span className="text-2xl text-sky-200">%</span></p>
            <p className="mt-2 text-xs text-slate-300">{stats.answered} {t(language, stats.answered === 1 ? "answer recorded" : "answers recorded", stats.answered === 1 ? "réponse enregistrée" : "réponses enregistrées")}</p>
          </div>
          <div className="grid h-[102px] w-[102px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#38bdf8 ${overall * 3.6}deg, var(--progress-track) 0deg)` }}>
            <div className="grid h-[82px] w-[82px] place-items-center rounded-full bg-[#142a47]"><span className="text-2xl">✈</span></div>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300 transition-all duration-700" style={{ width: `${overall}%` }} /></div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
        <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-bold text-white">{t(language, "30-day flight plan", "Cap sur 30 jours")}</h2><p className="mt-1 text-[11px] text-slate-500">{t(language, `Day ${dayNumber} of 30 · ${days.filter((day) => day.active).length} study sessions`, `Jour ${dayNumber} sur 30 · ${days.filter((day) => day.active).length} séances`)}</p></div>
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
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-sm font-bold text-white">{t(language, "Subjects", "Vos matières")}</h2><p className="mt-1 text-[11px] text-slate-500">{t(language, "Accuracy by subject", "Précision par domaine")}</p></div><button onClick={onOpenTraining} className="flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-300">{t(language, "Practice all", "Tout réviser")} <ChevronRight size={15} /></button></div>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((category) => {
            const subject = stats.byCategory?.[category] || { answered: 0, correct: 0 };
            const mastery = subject.answered ? Math.round((subject.correct / subject.answered) * 100) : 0;
            const style = subjectStyle[category];
            return <article key={category} className={`rounded-2xl border ${style.panel} bg-white/[0.025] p-3.5`}>
              <div className="flex items-center justify-between"><span className={`grid h-8 min-w-8 place-items-center rounded-lg bg-white/[0.06] px-1 text-xs font-bold ${style.color}`}>{style.icon}</span><span className="text-xs font-bold text-slate-300">{mastery}%</span></div>
              <h3 className="mt-3 text-sm font-bold text-white">{categoryLabel(language, category)}</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">{subject.answered} {t(language, "answers", "réponses")}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]"><div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${mastery}%` }} /></div>
            </article>;
          })}
        </div>
      </section>

      <section className="space-y-3 pb-2">
        <button onClick={() => onStart(express, "practice")} className="group flex min-h-[62px] w-full items-center gap-3 rounded-2xl bg-sky-400 px-4 text-left text-navy-950 shadow-lg shadow-sky-950/25 transition hover:bg-sky-300 active:scale-[.99]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/[0.09]"><Zap size={20} fill="currentColor" /></span>
          <span className="flex-1"><span className="block text-sm font-extrabold">{t(language, "Quick session", "Session Express")}</span><span className="mt-0.5 block text-[11px] font-medium text-navy-950/70">{t(language, "10 mixed questions", "10 questions mixtes")}</span></span><ArrowRight size={18} />
        </button>
        <button onClick={() => onStart(errorIds, "practice")} disabled={!errorIds.length} className="flex min-h-[62px] w-full items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.025] px-4 text-left transition hover:bg-white/[0.05] active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/10 text-rose-300"><RotateCcw size={19} /></span>
          <span className="flex-1"><span className="block text-sm font-bold text-white">{t(language, "Review my mistakes", "Réviser mes erreurs")}</span><span className="mt-0.5 block text-[11px] text-slate-500">{errorIds.length ? t(language, `${errorIds.length} question${errorIds.length > 1 ? "s" : ""} to revisit`, `${errorIds.length} question${errorIds.length > 1 ? "s" : ""} à retravailler`) : t(language, "Your queue is clear. Great work!", "Votre file est vide, bravo !")}</span></span><ChevronRight size={17} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-600"><Clock3 size={12} /> {t(language, "Questions leave the queue after a correct answer.", "Les erreurs disparaissent de la file après une bonne réponse.")}</div>
      </section>
    </div>
  );
}
