import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { CATEGORIES } from "../lib/constants.js";
import { categoryLabel, locale, t } from "../lib/i18n.js";

const categories = ["Toutes", ...CATEGORIES];

export default function Flashcards({ cards, masteredCards, cardProgress, language, onReview }) {
  const [category, setCategory] = useState("Toutes");
  const [showMastered, setShowMastered] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const dueCards = useMemo(() => cards.filter((card) => {
    const inCategory = category === "Toutes" || card.category === category;
    return inCategory && (showMastered || !cardProgress[card.id] || cardProgress[card.id].dueAt <= now);
  }), [cards, category, cardProgress, showMastered, now]);
  const current = dueCards[index];
  const nextDue = cards
    .filter((card) => category === "Toutes" || card.category === category)
    .map((card) => cardProgress[card.id]?.dueAt)
    .filter((dueAt) => Number.isFinite(dueAt) && dueAt > now)
    .sort((first, second) => first - second)[0];
  const goTo = (nextIndex) => { setIndex((nextIndex + dueCards.length) % dueCards.length); setFlipped(false); };
  const changeFilter = (value) => { setCategory(value); setIndex(0); setFlipped(false); };
  const rateCard = (rating) => {
    if (!current) return;
    onReview(current.id, rating);
    setFlipped(false);
    if (showMastered) setIndex((value) => (value + 1) % dueCards.length);
    else if (index >= dueCards.length - 1) setIndex(0);
  };

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-300">{t(language, "Active recall", "Mémorisation active")}</p><h1 className="mt-1 text-2xl font-bold text-white">Flashcards</h1><p className="mt-1 text-sm text-slate-400">{t(language, "Tap a card to reveal the answer.", "Touchez la carte pour révéler la réponse.")}</p></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => changeFilter(item)} className={`min-h-11 shrink-0 rounded-xl border px-3 text-xs font-semibold ${category === item ? "border-violet-300/30 bg-violet-300/10 text-violet-200" : "border-white/[0.08] text-slate-400"}`}>{item === "Toutes" ? t(language, "All", "Toutes") : categoryLabel(language, item)}</button>)}</div>
    <div className="flex items-center justify-between text-xs text-slate-500"><span>{showMastered ? t(language, "All cards", "Toutes les cartes") : t(language, `${dueCards.length} due for review`, `${dueCards.length} à réviser maintenant`)}</span><button onClick={() => { setShowMastered((value) => !value); setIndex(0); setFlipped(false); }} className="min-h-11 text-sky-300">{showMastered ? t(language, "Review queue", "File de révision") : t(language, "View all cards", "Voir toutes les cartes")}</button></div>

    {current ? <>
      <button type="button" aria-label={t(language, "Flip flashcard", "Retourner la flashcard")} aria-pressed={flipped} onClick={() => setFlipped((value) => !value)} className={`card-flip block h-[310px] w-full text-left ${flipped ? "is-flipped" : ""}`}>
        <span className="card-flip-inner relative block h-full w-full">
          <span className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-violet-300/15 bg-gradient-to-br from-[#29234c] via-[#1d2142] to-[#15263e] p-7 text-center shadow-xl shadow-black/20">
            <span className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-violet-200">{categoryLabel(language, current.category)}</span>
            <span className="mt-7 text-xl font-bold leading-relaxed text-white">{current.question}</span>
            <span className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400"><RotateCcw size={14} /> {t(language, "Tap to flip", "Toucher pour retourner")}</span>
          </span>
          <span className="card-face card-back absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-sky-300/15 bg-gradient-to-br from-[#173852] via-[#142d43] to-[#13233b] p-7 text-center shadow-xl shadow-black/20">
            <span className="rounded-full bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-sky-200">{t(language, "Answer", "Réponse")}</span>
            <span className="mt-6 text-sm leading-7 text-slate-100">{current.explanation}</span>
            <span className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400"><Sparkles size={14} /> {t(language, "Rate your recall", "À vous de juger")}</span>
          </span>
        </span>
      </button>
      <div className="flex items-center justify-between">
        <button onClick={() => goTo(index - 1)} aria-label={t(language, "Previous card", "Carte précédente")} className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-white/[0.08] text-slate-300"><ChevronLeft size={20} /></button>
        <span className="text-xs font-semibold text-slate-500">{index + 1} / {dueCards.length}</span>
        <button onClick={() => goTo(index + 1)} aria-label={t(language, "Next card", "Carte suivante")} className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-white/[0.08] text-slate-300"><ChevronRight size={20} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => rateCard("again")} disabled={!flipped} className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] text-sm font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={16} /> {t(language, "Review again", "À revoir")}</button>
        <button onClick={() => rateCard("good")} disabled={!flipped} className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-400 text-sm font-bold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40"><Check size={17} /> {t(language, "Mastered", "Maîtrisé")}</button>
      </div>
      <p className="text-center text-[10px] text-slate-600">{flipped
        ? t(language, "Review again: back in 10 min · Mastered: next review follows your progress", "À revoir : revient dans 10 min · Maîtrisé : prochain rappel selon votre progression")
        : t(language, "Flip the card to reveal the answer before rating yourself.", "Retournez la carte pour révéler la réponse avant de vous évaluer.")}</p>
    </> : <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Check size={22} /></div>
      <h2 className="mt-4 text-base font-bold text-white">{cards.length ? t(language, "No cards due right now", "Aucune carte à réviser maintenant") : t(language, "No cards yet", "Aucune carte pour le moment")}</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{cards.length ? nextDue ? t(language, `Next review: ${new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(nextDue)}.`, `Prochaine révision prévue le ${new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(nextDue)}.`) : t(language, "You can browse all cards or import your own.", "Vous pouvez consulter toutes les cartes ou importer vos propres fiches.") : t(language, "Add questions in Settings to create your first flashcards.", "Ajoutez des questions dans les paramètres pour créer vos premières flashcards.")}</p>
      {cards.length > 0 && <button onClick={() => setShowMastered(true)} className="mt-4 min-h-11 text-sm font-bold text-sky-300">{t(language, "View all cards", "Voir toutes les cartes")}</button>}
    </div>}
    <p className="text-center text-[11px] text-slate-600">{t(language, `${masteredCards.length} mastered out of ${cards.length}`, `${masteredCards.length} maîtrisée${masteredCards.length > 1 ? "s" : ""} sur ${cards.length}`)}</p>
  </div>;
}
