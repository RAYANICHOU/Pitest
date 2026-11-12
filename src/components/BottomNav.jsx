import { BookOpenCheck, Brain, House, Settings2 } from "lucide-react";
import { t } from "../lib/i18n.js";

const items = [
  { id: "home", en: "Home", fr: "Accueil", Icon: House },
  { id: "training", en: "Practice", fr: "Entraînement", Icon: BookOpenCheck },
  { id: "cards", en: "Flashcards", fr: "Flashcards", Icon: Brain },
  { id: "settings", en: "Settings", fr: "Paramètres", Icon: Settings2 },
];

export default function BottomNav({ active, onChange, language }) {
  return (
    <nav aria-label={t(language, "Main navigation", "Navigation principale")} className="app-bottom-nav safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[520px] -translate-x-1/2 border-t border-white/[0.07] bg-[#0d1626]/95 px-2 pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ id, en, fr, label, Icon }) => {
          const selected = active === id;
          return (
            <button key={id} type="button" onClick={() => onChange(id)} aria-current={selected ? "page" : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${selected ? "text-sky-300" : "text-slate-500 hover:text-slate-300"}`}>
              <Icon size={20} strokeWidth={selected ? 2.4 : 1.8} />
              <span>{label || (language === "fr" ? fr : en)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
