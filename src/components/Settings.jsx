import { useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Download, FileText, FileUp, Github, Info, LoaderCircle, LockKeyhole, Moon, PenLine, Plus, Pencil, Search, Sun, Tags, Trash2, X } from "lucide-react";
import { CATEGORIES } from "../lib/constants.js";
import { findQuestionDuplicates, normalizeForComparison } from "../lib/duplicateDetection.js";
import { syncStudyBankToGitHub } from "../lib/githubSync.js";
import { parseStudyContentImport } from "../lib/studyContentImport.js";
import { resetProgress } from "../lib/storage.js";
import { categoryLabel, t } from "../lib/i18n.js";

const GITHUB_DESTINATION = {
  owner: "RAYANICHOU",
  repository: "Pitest",
  path: "public/data/study-bank.json",
  branch: "main",
};

function emptyManualQuestion() {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id: `manual-${id}`,
    category: CATEGORIES[0],
    question: "",
    options: ["", "", "", ""],
    answer: "",
    explanation: "",
  };
}

function emptyFlashcard() {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id: `flashcard-${id}`, category: CATEGORIES[0], question: "", explanation: "" };
}

export default function Settings({
  data,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onSaveQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onUpdateFlashcard,
  onDeleteFlashcard,
  onReplace,
}) {
  const [message, setMessage] = useState(null);
  const [pdfQuestions, setPdfQuestions] = useState([]);
  const [pdfName, setPdfName] = useState("");
  const [busy, setBusy] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonImportValue, setJsonImportValue] = useState("");
  const [jsonImporting, setJsonImporting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [entryMode, setEntryMode] = useState("manual");
  const [addQuestionsOpen, setAddQuestionsOpen] = useState(false);
  const [manualQuestion, setManualQuestion] = useState(emptyManualQuestion);
  const [manualVerified, setManualVerified] = useState(false);
  const [manualFlashcard, setManualFlashcard] = useState(emptyFlashcard);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageSearch, setManageSearch] = useState("");
  const [manageCategory, setManageCategory] = useState("all");
  const [manageType, setManageType] = useState("all");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [githubSyncOpen, setGithubSyncOpen] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubSyncMessage, setGithubSyncMessage] = useState(null);
  const fileRef = useRef(null);

  const showMessage = (kind, text) => setMessage({ kind, text });
  const importJson = async (event) => {
    event.preventDefault();
    setJsonImporting(true);
    try {
      const { items, invalidEntries, empty } = parseStudyContentImport(jsonImportValue);
      if (empty) {
        throw new Error(t(language, "Paste a non-empty question array or a backup object containing a bank array.", "Collez un tableau de questions non vide ou une sauvegarde contenant un tableau bank."));
      }
      if (invalidEntries.length) {
        const examples = invalidEntries.slice(0, 5).map((index) => t(language, `entry ${index + 1}`, `entrée ${index + 1}`)).join(", ");
        const remainder = invalidEntries.length > 5 ? t(language, ` and ${invalidEntries.length - 5} more`, ` et ${invalidEntries.length - 5} autre(s)`) : "";
        throw new Error(t(language,
          `Import cancelled: invalid or duplicate content in ${examples}${remainder}. Nothing was changed.`,
          `Import annulé : contenu invalide ou identifiant en doublon dans ${examples}${remainder}. Aucune donnée n'a été modifiée.`));
      }

      const result = await onSaveQuestions(items);
      if (!result?.saved) throw new Error(t(language, "The content could not be imported.", "Le contenu n'a pas pu être importé."));
      setJsonImportValue("");
      setJsonImportOpen(false);
      showMessage("success", t(language,
        `${items.length} study item${items.length === 1 ? "" : "s"} merged. Your scores and progress were preserved.`,
        `${items.length} élément${items.length > 1 ? "s" : ""} fusionné${items.length > 1 ? "s" : ""}. Vos scores et votre progression ont été conservés.`));
    } catch (error) {
      showMessage("error", error instanceof SyntaxError
        ? t(language, "Invalid JSON. Check the syntax and try again.", "JSON invalide. Vérifiez la syntaxe puis réessayez.")
        : error instanceof Error ? error.message : t(language, "Import failed.", "L'import a échoué."));
    } finally {
      setJsonImporting(false);
    }
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pilot-prep-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage("success", t(language, "Your data has been exported.", "Vos données ont été exportées."));
  };
  const syncToGitHub = async (event) => {
    event.preventDefault();
    setGithubSyncing(true);
    setGithubSyncMessage(null);
    try {
      const result = await syncStudyBankToGitHub({
        ...GITHUB_DESTINATION,
        token: githubToken,
        language,
        items: data.bank,
      });
      setGithubSyncMessage({
        kind: "success",
        text: t(language,
          `${result.count} questions and flashcards synced to ${GITHUB_DESTINATION.owner}/${GITHUB_DESTINATION.repository}.`,
          `${result.count} QCM et flashcards synchronisés vers ${GITHUB_DESTINATION.owner}/${GITHUB_DESTINATION.repository}.`),
        commitUrl: result.commitUrl,
      });
    } catch (error) {
      setGithubSyncMessage({
        kind: "error",
        text: error instanceof TypeError
          ? t(language, "Could not reach GitHub. Check your connection and try again.", "Impossible de joindre GitHub. Vérifiez votre connexion puis réessayez.")
          : error instanceof Error
            ? error.message
            : t(language, "GitHub sync failed. Try again.", "La synchronisation GitHub a échoué. Réessayez."),
      });
    } finally {
      setGithubSyncing(false);
    }
  };
  const readPdf = async (file) => {
    if (!file) return;
    setBusy(true);
    setPdfQuestions([]);
    setPdfName(file.name);
    showMessage(null, "");
    try {
      const { extractPdfQuestions } = await import("../lib/pdfParser.js");
      const questions = await extractPdfQuestions(file, null, language);
      if (!questions.length) {
        showMessage("error", t(language, "No four-option A–D multiple-choice questions were detected. The PDF may be scanned, use an unsupported layout, or contain open-ended questions.", "Aucun QCM à quatre choix A–D n'a été détecté. Le PDF peut être scanné, avoir une mise en page non reconnue ou contenir des questions ouvertes."));
      } else {
        setPdfQuestions(questions.map((question) => ({ ...question, included: true, verified: false })));
        const answerCount = questions.filter((question) => Number.isInteger(question.answer)).length;
        const categoryCount = questions.filter((question) => CATEGORIES.includes(question.category)).length;
        showMessage("success", t(language, `${questions.length} question${questions.length === 1 ? "" : "s"} detected · ${answerCount} answer${answerCount === 1 ? "" : "s"} identified · ${categoryCount} subject${categoryCount === 1 ? "" : "s"} suggested. Review the preview before importing.`, `${questions.length} question${questions.length > 1 ? "s" : ""} détectée${questions.length > 1 ? "s" : ""} · ${answerCount} réponse${answerCount > 1 ? "s" : ""} repérée${answerCount > 1 ? "s" : ""} · ${categoryCount} matière${categoryCount > 1 ? "s" : ""} proposée${categoryCount > 1 ? "s" : ""}. Vérifiez l'aperçu avant l'import.`));
      }
    } catch (error) {
      console.error("Failed to read PDF:", error);
      showMessage("error", t(language, "Could not read the PDF. Check that it is a valid, unprotected file.", "La lecture du PDF a échoué. Vérifiez qu'il s'agit d'un fichier valide et non protégé."));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const updatePdfQuestion = (id, patch) => {
    setPdfQuestions((current) => current.map((question) => {
      if (question.id !== id) return question;
      const needsVerification = Object.hasOwn(patch, "category") || Object.hasOwn(patch, "answer");
      const needsRepublish = needsVerification || Object.hasOwn(patch, "explanation");
      return {
        ...question,
        ...patch,
        ...(Object.hasOwn(patch, "category") ? { categorySource: "manual" } : {}),
        ...(Object.hasOwn(patch, "answer") ? { answerSource: "manual" } : {}),
        ...(needsVerification ? { verified: false } : {}),
        ...(needsRepublish ? { published: false } : {}),
      };
    }));
  };
  const publishQuestion = async (question, duplicateChoice = null, onPublished = () => {}) => {
    const ready = question.included
      && question.verified
      && CATEGORIES.includes(question.category)
      && Number.isInteger(question.answer)
      && question.answer >= 0
      && question.answer < 4;
    if (!ready || question.published) {
      showMessage("error", t(language, "Complete and verify the subject and answer before adding this question.", "Complétez et vérifiez la matière et la réponse avant d'ajouter cette question."));
      return;
    }
    const duplicates = findQuestionDuplicates(question, data.bank);
    const linkedEntry = question.publishedId && data.bank.find((item) => item.id === question.publishedId && item.type === "qcm");
    const exactDuplicate = duplicates.find((candidate) => candidate.exact);
    const duplicate = linkedEntry
      ? duplicates.find((candidate) => candidate.item.id === linkedEntry.id) || {
          item: linkedEntry,
          exact: false,
          sameOptions: linkedEntry.options.length === question.options.length
            && linkedEntry.options.every((option, index) => normalizeForComparison(option) === normalizeForComparison(question.options[index])),
          sameCategory: linkedEntry.category === question.category,
        }
      : exactDuplicate || duplicates[0];
    if (duplicate && !duplicateChoice) return;
    if (duplicate?.exact && question.answer !== duplicate.item.answer
      && !window.confirm(t(language, "This question already exists, but its correct answer differs. Update the existing answer? Previously recorded statistics cannot be recalculated.", "Cette question existe déjà, mais la bonne réponse diffère. Mettre à jour la réponse existante ? Les statistiques déjà enregistrées ne peuvent pas être recalculées."))) return;
    if (linkedEntry && linkedEntry.category !== question.category
      && !window.confirm(t(language, `This published question will move subjects (${categoryLabel(language, linkedEntry.category)} → ${categoryLabel(language, question.category)}). Previously recorded statistics will not be reassigned. Continue?`, `Cette question publiée va changer de matière (${linkedEntry.category} → ${question.category}). Les statistiques déjà enregistrées ne seront pas réattribuées. Continuer ?`))) return;
    if (duplicate && !duplicate.exact && !linkedEntry
      && !window.confirm(t(language, `A question with the same wording already exists in ${categoryLabel(language, duplicate.item.category)}, with different options. Publish this as a separate variant?`, `Une question avec le même énoncé existe déjà en ${duplicate.item.category}, avec des choix différents. Publier cette question comme variante distincte ?`))) return;

    const preferredId = linkedEntry?.id || (duplicate?.exact ? duplicate.item.id : question.id);
    const idCollision = data.bank.some((item) => item.id === preferredId)
      && !duplicates.some((candidate) => candidate.item.id === preferredId);
    const baseId = idCollision ? `${preferredId}-variant` : preferredId;
    let questionId = baseId;
    let suffix = 2;
    while (data.bank.some((item) => item.id === questionId)
      && !duplicates.some((candidate) => candidate.item.id === questionId)) {
      questionId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const qcm = {
      id: questionId,
      category: question.category,
      type: question.type,
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation || (question.source === "manual"
        ? t(language, "Manually added question. Explanation to be added.", "Question ajoutée manuellement. Explication à compléter.")
        : t(language, "Extracted from a PDF. Explanation to be added.", "Question extraite d'un PDF. Explication à compléter.")),
    };
    setPublishingId(question.id);
    try {
      const result = await onSaveQuestions([qcm]);
      if (!result?.saved) {
        throw new Error(t(language, "The question could not be saved on this device.", "La question n'a pas pu être enregistrée sur cet appareil."));
      }
      onPublished(questionId);
      showMessage("success", duplicate?.exact
        ? t(language, `Exact duplicate: the existing ${categoryLabel(language, question.category)} question was updated in your bank.`, `Doublon exact : la question existante en ${question.category} a été actualisée dans votre banque.`)
        : duplicate
          ? t(language, `Variant added to your bank in ${categoryLabel(language, question.category)}.`, `Variante ajoutée à votre banque en ${categoryLabel(language, question.category)}.`)
          : question.number
            ? t(language, `Question ${question.number} added to your practice bank.`, `Question ${question.number} ajoutée à votre banque d'entraînement.`)
            : t(language, "Manual question added to your practice bank.", "Question manuelle ajoutée à votre banque d'entraînement."));
    } catch (error) {
      showMessage("error", error.message);
    } finally {
      setPublishingId(null);
    }
  };
  const publishPdfQuestion = (question, duplicateChoice = null) => publishQuestion(
    question,
    duplicateChoice,
    (questionId) => updatePdfQuestion(question.id, { published: true, publishedId: questionId }),
  );
  const updateManualQuestion = (patch) => {
    setManualQuestion((current) => ({ ...current, ...patch }));
    setManualVerified(false);
  };
  const submitManualQuestion = async (event) => {
    event.preventDefault();
    const question = {
      ...manualQuestion,
      question: manualQuestion.question.trim(),
      options: manualQuestion.options.map((option) => option.trim()),
      answer: Number(manualQuestion.answer),
      explanation: manualQuestion.explanation.trim(),
      source: "manual",
      type: "qcm",
      included: true,
      verified: manualVerified,
    };
    const duplicates = findQuestionDuplicates(question, data.bank);
    await publishQuestion(question, duplicates.length ? (duplicates[0].exact ? "update" : "variant") : "new", () => {
      setManualQuestion(emptyManualQuestion());
      setManualVerified(false);
    });
  };
  const submitManualFlashcard = async (event) => {
    event.preventDefault();
    const card = {
      ...manualFlashcard,
      type: "flashcard",
      question: manualFlashcard.question.trim(),
      explanation: manualFlashcard.explanation.trim(),
      options: [],
      answer: 0,
    };
    if (!card.question || !card.explanation || !CATEGORIES.includes(card.category)) {
      showMessage("error", t(language, "Complete the subject, front, and definition or explanation.", "Renseignez la matière, le recto et la définition ou explication."));
      return;
    }
    try {
      const result = await onSaveQuestions([card]);
      if (!result?.saved) throw new Error(t(language, "The flashcard could not be saved.", "La flashcard n'a pas pu être enregistrée."));
      setManualFlashcard(emptyFlashcard());
      showMessage("success", t(language, "Flashcard added to your essential concepts.", "Flashcard ajoutée à vos notions essentielles."));
    } catch (error) {
      showMessage("error", error.message);
    }
  };
  const manualReady = CATEGORIES.includes(manualQuestion.category)
    && Boolean(manualQuestion.question.trim())
    && manualQuestion.options.every((option) => Boolean(option.trim()))
    && manualQuestion.answer !== ""
    && Number.isInteger(Number(manualQuestion.answer))
    && Number(manualQuestion.answer) >= 0
    && Number(manualQuestion.answer) < 4
    && manualVerified;
  const manualDuplicates = manualQuestion.question.trim() && manualQuestion.options.every((option) => option.trim())
    ? findQuestionDuplicates(manualQuestion, data.bank)
    : [];
  const manualDuplicate = manualDuplicates[0];
  const managedQuestions = data.bank.filter((item) => item.type === "qcm");
  const managedFlashcards = data.bank.filter((item) => item.type === "flashcard");
  const managedContent = data.bank.filter((item) => item.type === "qcm" || item.type === "flashcard");
  const filteredManagedContent = managedContent.filter((item) => {
    const matchesType = manageType === "all" || item.type === manageType;
    const matchesCategory = manageCategory === "all" || item.category === manageCategory;
    const search = manageSearch.trim().toLocaleLowerCase();
    const matchesSearch = !search || [item.question, item.explanation, ...(item.options || [])]
      .some((value) => String(value || "").toLocaleLowerCase().includes(search));
    return matchesType && matchesCategory && matchesSearch;
  });
  const beginEditingQuestion = (question) => setEditingQuestion({
    ...question,
    ...(question.type === "qcm" ? { options: [...question.options] } : {}),
  });
  const updateEditingQuestion = (patch) => setEditingQuestion((current) => ({ ...current, ...patch }));
  const saveManagedQuestion = async (event) => {
    event.preventDefault();
    try {
      let updated;
      let result;
      if (editingQuestion.type === "flashcard") {
        updated = {
          ...editingQuestion,
          question: editingQuestion.question.trim(),
          explanation: editingQuestion.explanation.trim(),
        };
        if (!updated.question || !updated.explanation || !CATEGORIES.includes(updated.category)) {
          showMessage("error", t(language, "Complete the subject, front, and definition or explanation.", "Renseignez la matière, le recto et la définition ou explication."));
          return;
        }
        result = await onUpdateFlashcard(updated);
      } else {
        updated = {
          ...editingQuestion,
          question: editingQuestion.question.trim(),
          options: editingQuestion.options.map((option) => option.trim()),
          explanation: editingQuestion.explanation.trim(),
        };
        if (!updated.question || updated.options.some((option) => !option)
          || !CATEGORIES.includes(updated.category) || !Number.isInteger(updated.answer)
          || updated.answer < 0 || updated.answer > 3) {
          showMessage("error", t(language, "Complete the question, all four choices, subject, and correct answer.", "Renseignez la question, les quatre choix, la matière et la bonne réponse."));
          return;
        }
        result = await onUpdateQuestion(updated);
      }
      if (!result?.saved) throw new Error(t(language, "The content could not be updated.", "Le contenu n'a pas pu être modifié."));
      setEditingQuestion(null);
      showMessage("success", result.changed === false
        ? t(language, "No changes to save.", "Aucune modification à enregistrer.")
        : editingQuestion.type === "flashcard"
          ? t(language, "Flashcard updated. Its review progress has been reset.", "Flashcard modifiée. Sa progression de révision a été réinitialisée.")
          : t(language, "Question updated.", "Question modifiée."));
    } catch (error) {
      showMessage("error", error.message);
    }
  };
  const removeManagedContent = async (item) => {
    const isFlashcard = item.type === "flashcard";
    const prompt = t(language,
      `Delete this ${isFlashcard ? "flashcard" : "question"}? This cannot be undone.`,
      `Supprimer ${isFlashcard ? "cette flashcard" : "cette question"} ? Cette action est irréversible.`);
    if (!window.confirm(prompt)) return;
    try {
      const result = isFlashcard ? await onDeleteFlashcard(item.id) : await onDeleteQuestion(item.id);
      if (!result?.saved) throw new Error(t(language, "The content could not be deleted.", "Le contenu n'a pas pu être supprimé."));
      if (editingQuestion?.id === item.id) setEditingQuestion(null);
      showMessage("success", t(language, `${isFlashcard ? "Flashcard" : "Question"} deleted from your bank.`, `${isFlashcard ? "Flashcard" : "Question"} supprimée de votre banque.`));
    } catch (error) {
      showMessage("error", error.message);
    }
  };
  const publishedPdfQuestions = pdfQuestions.filter((question) => question.published).length;
  const reset = () => {
    if (!window.confirm(t(language, "Reset scores, mistakes, and mastered cards? Your imported questions will be kept.", "Réinitialiser les scores, les erreurs et les cartes maîtrisées ? Vos questions importées seront conservées."))) return;
    onReplace(resetProgress(data));
    showMessage("success", t(language, "Progress reset. Your question bank has been kept.", "Progression réinitialisée. Votre banque de questions est conservée."));
  };

  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{t(language, "Your space", "Votre espace")}</p><h1 className="mt-1 text-2xl font-bold text-white">{t(language, "Settings", "Paramètres")}</h1><p className="mt-1 text-sm text-slate-400">{t(language, "Data stored on this device.", "Données enregistrées sur cet appareil.")}</p></div>
    {message?.text && <div role={message.kind === "error" ? "alert" : "status"} className={`flex gap-2 rounded-xl border p-3 text-xs leading-relaxed ${message.kind === "error" ? "border-rose-400/20 bg-rose-400/[0.07] text-rose-200" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"}`}>{message.kind === "error" ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}<span className="whitespace-pre-line">{message.text}</span></div>}

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <h2 className="text-sm font-bold text-white">{t(language, "Appearance", "Apparence")}</h2>
      <p className="mt-1 text-[11px] text-slate-500">{t(language, "Choose the theme that feels right for your study sessions.", "Choisissez le thème adapté à vos sessions de révision.")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t(language, "Color theme", "Thème de couleurs")}>
        {[
          { id: "light", label: t(language, "Light", "Clair"), Icon: Sun },
          { id: "dark", label: t(language, "Dark", "Sombre"), Icon: Moon },
        ].map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={theme === id} onClick={() => onThemeChange(id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${theme === id ? "border-sky-300/40 bg-sky-300/10 text-sky-200" : "border-white/[0.08] text-slate-400 hover:bg-white/[0.04]"}`}>
          <Icon size={16} />{label}
        </button>)}
      </div>
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <button type="button" aria-expanded={addQuestionsOpen} aria-controls="add-questions-panel" onClick={() => setAddQuestionsOpen((open) => !open)} className="flex min-h-12 w-full items-center gap-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><FileText size={18} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-white">{t(language, "Add study content", "Ajouter du contenu de révision")}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t(language, "Add practice questions or essential-concept flashcards.", "Ajoutez des QCM d'entraînement ou des flashcards de notions essentielles.")}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${addQuestionsOpen ? "rotate-180" : ""}`} />
      </button>
      <div id="add-questions-panel" hidden={!addQuestionsOpen} className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/10 p-1" role="group" aria-label={t(language, "Content entry method", "Mode d'ajout du contenu")}>
        <button id="manual-entry-tab" type="button" aria-pressed={entryMode === "manual"} aria-controls="manual-entry-panel" onClick={() => setEntryMode("manual")} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors ${entryMode === "manual" ? "bg-sky-400 text-navy-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
          <PenLine size={15} />{t(language, "Question", "QCM")}
        </button>
        <button id="pdf-entry-tab" type="button" aria-pressed={entryMode === "pdf"} aria-controls="pdf-entry-panel" onClick={() => setEntryMode("pdf")} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors ${entryMode === "pdf" ? "bg-sky-400 text-navy-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
          <FileUp size={15} />{t(language, "PDF exam", "Sujet PDF")}
        </button>
        <button id="flashcard-entry-tab" type="button" aria-pressed={entryMode === "flashcard"} aria-controls="flashcard-entry-panel" onClick={() => setEntryMode("flashcard")} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors ${entryMode === "flashcard" ? "bg-sky-400 text-navy-950 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}>
          <Tags size={14} />{t(language, "Flashcard", "Flashcard")}
        </button>
      </div>
      {entryMode === "manual" && <div id="manual-entry-panel" aria-labelledby="manual-entry-tab">
        <p className="mb-4 text-[11px] leading-relaxed text-slate-500">{t(language, "Add a multiple-choice question to your practice bank. Flashcards are managed separately.", "Ajoutez un QCM à votre banque d'entraînement. Les flashcards sont gérées séparément.")}</p>
      <form onSubmit={submitManualQuestion} className="space-y-3">
        <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Subject", "Matière")}
          <select value={manualQuestion.category} onChange={(event) => updateManualQuestion({ category: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200">
            {CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(language, item)}</option>)}
          </select>
        </label>
        <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Question", "Énoncé")}
          <textarea required rows={3} value={manualQuestion.question} onChange={(event) => updateManualQuestion({ question: event.target.value })} placeholder={t(language, "Write the question…", "Saisissez votre question…")} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600" />
        </label>
        <fieldset>
          <legend className="text-[10px] font-semibold text-slate-400">{t(language, "Answer choices", "Choix de réponse")}</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {manualQuestion.options.map((option, index) => <label key={index} className="block text-[10px] font-semibold text-slate-500">
              {t(language, `Choice ${String.fromCharCode(65 + index)}`, `Choix ${String.fromCharCode(65 + index)}`)}
              <input required value={option} onChange={(event) => updateManualQuestion({ options: manualQuestion.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200" />
            </label>)}
          </div>
        </fieldset>
        <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Correct answer", "Bonne réponse")}
          <select required value={manualQuestion.answer} onChange={(event) => updateManualQuestion({ answer: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200">
            <option value="">{t(language, "Select the correct answer…", "Sélectionnez la bonne réponse…")}</option>
            {manualQuestion.options.map((option, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)} — {option || t(language, `Choice ${String.fromCharCode(65 + index)}`, `Choix ${String.fromCharCode(65 + index)}`)}</option>)}
          </select>
        </label>
        <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Explanation (optional)", "Explication (facultative)")}
          <textarea rows={3} value={manualQuestion.explanation} onChange={(event) => setManualQuestion((current) => ({ ...current, explanation: event.target.value }))} placeholder={t(language, "Explain the answer or show the calculation…", "Expliquez la réponse ou détaillez le calcul…")} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600" />
        </label>
        {manualDuplicate && <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-[11px] leading-relaxed text-amber-100">
          <p className="font-bold">{manualDuplicate.exact ? t(language, "Exact duplicate detected", "Doublon exact détecté") : t(language, "Similar wording already exists", "Énoncé similaire déjà présent")}</p>
          <p className="mt-1">{t(language, "Existing entry:", "Entrée existante :")} {categoryLabel(language, manualDuplicate.item.category)} · {t(language, "answer", "réponse")} {String.fromCharCode(65 + manualDuplicate.item.answer)}{!manualDuplicate.sameOptions ? t(language, " · different options", " · choix différents") : ""}{!manualDuplicate.sameCategory ? t(language, " · different subject", " · matière différente") : ""}</p>
          {Number.isInteger(Number(manualQuestion.answer)) && Number(manualQuestion.answer) !== manualDuplicate.item.answer && <p className="mt-1 font-semibold">{t(language, "The selected correct answer differs from the saved version.", "La bonne réponse sélectionnée diffère de la version enregistrée.")}</p>}
          {!manualDuplicate.exact && <p className="mt-1">{t(language, "Publishing this variant will create a separate entry.", "La publication comme variante créera une entrée distincte.")}</p>}
        </div>}
        <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-300">
          <input type="checkbox" checked={manualVerified} onChange={(event) => setManualVerified(event.target.checked)} className="h-4 w-4 accent-sky-400" />
          {t(language, "I have verified the subject and correct answer", "J'ai vérifié la matière et la bonne réponse")}
        </label>
        <button type="submit" disabled={!manualReady || publishingId !== null} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 text-sm font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-40">
          <Plus size={16} />{publishingId === manualQuestion.id
            ? t(language, "Adding question…", "Ajout de la question…")
            : t(language, "Add question to my bank", "Ajouter à ma banque de questions")}
        </button>
      </form>
      </div>}

      {entryMode === "flashcard" && <div id="flashcard-entry-panel" aria-labelledby="flashcard-entry-tab">
        <p className="mb-4 text-[11px] leading-relaxed text-slate-500">{t(language, "Create a standalone card for a definition, formula, rule, or essential concept. The front is shown first; the definition or explanation appears on the back.", "Créez une carte autonome pour une définition, une formule, une règle ou une notion essentielle. Le recto s'affiche d'abord, puis la définition ou l'explication au verso.")}</p>
        <form onSubmit={submitManualFlashcard} className="space-y-3">
          <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Subject", "Matière")}
            <select value={manualFlashcard.category} onChange={(event) => setManualFlashcard((current) => ({ ...current, category: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200">
              {CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(language, item)}</option>)}
            </select>
          </label>
          <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Front · term or prompt", "Recto · terme ou question")}
            <textarea required rows={2} value={manualFlashcard.question} onChange={(event) => setManualFlashcard((current) => ({ ...current, question: event.target.value }))} placeholder={t(language, "e.g. Newton’s second law", "Ex. : deuxième loi de Newton")} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600" />
          </label>
          <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Back · definition or explanation", "Verso · définition ou explication")}
            <textarea required rows={4} value={manualFlashcard.explanation} onChange={(event) => setManualFlashcard((current) => ({ ...current, explanation: event.target.value }))} placeholder={t(language, "Write the definition, formula, or an example…", "Saisissez la définition, la formule ou un exemple…")} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600" />
          </label>
          <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 text-sm font-bold text-navy-950">
            <Plus size={16} />{t(language, "Add flashcard", "Ajouter la flashcard")}
          </button>
        </form>
      </div>}

      {entryMode === "pdf" && <div id="pdf-entry-panel" aria-labelledby="pdf-entry-tab">
      <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><FileText size={18} /></span><div><h3 className="text-sm font-bold text-white">{t(language, "Import a complete exam (PDF)", "Importer un sujet complet (PDF)")}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t(language, "A PDF may contain several subjects and its answer key. Detected sections and answers are suggested for each question, then reviewed before adding.", "Le PDF peut regrouper plusieurs matières et son corrigé. Les sections et réponses détectées sont proposées pour chaque question, puis vérifiées avant l'ajout.")}</p></div></div>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-300/10 bg-sky-300/[0.04] p-3 text-[11px] leading-relaxed text-slate-400"><Info size={15} className="mt-0.5 shrink-0 text-sky-300" />{t(language, "Text is extracted locally. Scanned PDFs require OCR. Questions without a detected subject or answer need review before they can be added.", "Le texte est extrait localement. Les PDF scannés nécessitent de l'OCR. Les questions sans matière ou réponse détectée doivent être vérifiées avant leur ajout.")}</div>
      <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={(event) => readPdf(event.target.files?.[0])} className="sr-only" id="pdf-file" />
      <label htmlFor="pdf-file" className={`mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-sm font-semibold text-slate-300 hover:bg-white/[0.05] ${busy ? "pointer-events-none opacity-50" : ""}`}><FileUp size={16} />{busy ? t(language, "Analyzing exam…", "Analyse du sujet…") : t(language, "Select an exam PDF", "Sélectionner un sujet PDF")}</label>
      {pdfQuestions.length > 0 && <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3">
          <p className="truncate text-xs font-bold text-white">{pdfName}</p>
          <p className="mt-1 text-[11px] text-slate-400">{t(language, `${pdfQuestions.length} detected · ${publishedPdfQuestions} added`, `${pdfQuestions.length} détectée${pdfQuestions.length > 1 ? "s" : ""} · ${publishedPdfQuestions} ajoutée${publishedPdfQuestions > 1 ? "s" : ""}`)}</p>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-200">{t(language, "Review each question, then add it to your bank. Exact duplicates update the existing entry; similar variants are flagged before adding.", "Vérifiez chaque question avant de l'ajouter à votre banque. Les doublons exacts actualisent l'entrée existante ; les variantes similaires sont signalées.")}</p>
        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">{pdfQuestions.map((question, index) => {
          const ready = CATEGORIES.includes(question.category) && Number.isInteger(question.answer);
          const linkedEntry = question.publishedId && data.bank.find((item) => item.id === question.publishedId && item.type === "qcm");
          const duplicates = findQuestionDuplicates(question, data.bank);
          const exactDuplicate = duplicates.find((duplicate) => duplicate.exact);
          const duplicate = exactDuplicate || duplicates[0];
          const currentEntry = question.publishedId && data.bank.find((item) => item.id === question.publishedId && item.type === "qcm");
          const answerConflict = duplicate && question.answer !== duplicate.item.answer;
          const explanationConflict = duplicate && normalizeForComparison(question.explanation) !== normalizeForComparison(duplicate.item.explanation);
          return <article key={question.id} className={`rounded-xl border p-3 ${ready ? "border-white/[0.07] bg-black/10" : "border-amber-300/20 bg-amber-300/[0.035]"}`}>
            <div className="flex items-start gap-2">
              <input aria-label={t(language, `Include question ${index + 1}`, `Inclure la question ${index + 1}`)} type="checkbox" checked={question.included} onChange={(event) => updatePdfQuestion(question.id, { included: event.target.checked })} className="mt-1 h-4 w-4 accent-sky-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t(language, `Question ${question.number} · page ${question.page}`, `Question ${question.number} · page ${question.page}`)}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-white">{question.question}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-[10px] font-semibold text-slate-500" htmlFor={`category-${question.id}`}>{t(language, "Subject", "Matière")} {question.categorySource === "section" ? t(language, "· suggested by section", "· suggérée par la section") : question.categorySource === "manual" ? t(language, "· selected manually", "· choisie manuellement") : t(language, "· needs classification", "· à classer")}
                <select id={`category-${question.id}`} value={question.category || ""} onChange={(event) => updatePdfQuestion(question.id, { category: event.target.value || null })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-2 text-xs text-slate-200">
                  <option value="">{t(language, "Unclassified…", "À classer…")}</option>{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(language, item)}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-semibold text-slate-500" htmlFor={`answer-${question.id}`}>{t(language, "Correct answer", "Bonne réponse")} {question.answerSource === "corrigé" ? t(language, "· found in answer key", "· repérée dans le corrigé") : question.answerSource === "manual" ? t(language, "· selected manually", "· choisie manuellement") : t(language, "· needs review", "· à vérifier")}
                <select id={`answer-${question.id}`} value={Number.isInteger(question.answer) ? question.answer : ""} onChange={(event) => updatePdfQuestion(question.id, { answer: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-2 text-xs text-slate-200">
                  <option value="">{t(language, "Select an answer…", "À déterminer…")}</option>{question.options.map((option, choice) => <option key={choice} value={choice}>{String.fromCharCode(65 + choice)} — {option}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-2 block text-[10px] font-semibold text-slate-500" htmlFor={`explanation-${question.id}`}>{t(language, "Explanation", "Explication")} {question.explanation ? t(language, "· detected/suggested", "· détectée/proposée") : t(language, "· optional", "· facultative")}
              <textarea id={`explanation-${question.id}`} rows={2} value={question.explanation} onChange={(event) => updatePdfQuestion(question.id, { explanation: event.target.value })} placeholder={t(language, "Add an explanation or calculation steps…", "Ajouter une explication ou une étape de calcul…")} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-2 text-xs leading-relaxed text-slate-200 placeholder:text-slate-700" />
            </label>
            {!ready && <p className="mt-2 text-[10px] font-semibold text-amber-200">{t(language, "Complete before adding", "À compléter avant l'ajout")}</p>}
            {duplicate && !question.published && <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-[11px] leading-relaxed text-amber-100">
              <p className="font-bold">{duplicate.exact ? t(language, "Exact duplicate detected", "Doublon exact détecté") : t(language, "Similar wording already exists", "Énoncé similaire déjà présent")}</p>
              <p className="mt-1">{t(language, "Existing entry:", "Entrée existante :")} {categoryLabel(language, duplicate.item.category)} · {t(language, "answer", "réponse")} {String.fromCharCode(65 + duplicate.item.answer)}{!duplicate.sameOptions ? t(language, " · different options", " · choix différents") : ""}{!duplicate.sameCategory ? t(language, " · different subject", " · matière différente") : ""}</p>
              {answerConflict && <p className="mt-1 font-semibold">{t(language, "Warning: the detected answer differs from the saved version.", "Attention : la réponse détectée diffère de la version enregistrée.")}</p>}
              {!duplicate.exact && <p className="mt-1">{t(language, "Adding this variant will create a separate entry.", "L'ajout de cette variante créera une entrée distincte.")}</p>}
            </div>}
            {!question.published && ready && <label className="mt-3 flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-300">
              <input type="checkbox" checked={Boolean(question.verified)} onChange={(event) => updatePdfQuestion(question.id, { verified: event.target.checked })} className="h-4 w-4 accent-sky-400" />
              {t(language, "I have verified the subject and answer", "J'ai vérifié la matière et la réponse")}
            </label>}
            {question.published && !currentEntry
              ? <div className="mt-3 flex min-h-11 items-center gap-2 rounded-lg bg-emerald-400/10 px-3 text-xs font-bold text-emerald-200"><Check size={15} />{t(language, "Added to the question bank", "Ajoutée à la banque de QCM")}</div>
              : question.published && currentEntry && !answerConflict && !explanationConflict
                ? <div className="mt-3 flex min-h-11 items-center gap-2 rounded-lg bg-emerald-400/10 px-3 text-xs font-bold text-emerald-200"><Check size={15} />{t(language, "Up to date · no duplicate added", "À jour dans la banque · aucun doublon ajouté")}</div>
                : <button onClick={() => publishPdfQuestion(question, duplicate ? (duplicate.exact || linkedEntry ? "update" : "variant") : "new")} disabled={!question.included || !ready || !question.verified || publishingId !== null} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-400 text-xs font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={14} />{publishingId === question.id
                  ? t(language, "Adding question…", "Ajout de la question…")
                  : linkedEntry
                      ? t(language, "Update published question", "Actualiser la question publiée")
                      : duplicate?.exact
                        ? t(language, "Update existing entry", "Actualiser l'entrée existante")
                        : duplicate
                          ? t(language, "Add as variant", "Ajouter comme variante")
                          : t(language, "Add this question to my bank", "Ajouter cette question à ma banque")}</button>}
          </article>;
        })}</div>
        <p className="text-center text-[10px] leading-relaxed text-slate-600">{t(language, "Questions are saved on this device for practice. Flashcards are separate study concepts that you add explicitly. Changes to a subject or answer require verification again.", "Les QCM sont enregistrés sur cet appareil pour l'entraînement. Les flashcards sont des notions distinctes à ajouter séparément. Tout changement de matière ou de réponse doit être vérifié à nouveau.")}</p>
      </div>}
      </div>}
      </div>
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">{t(language, "Manage study content", "Gérer le contenu de révision")}</h2>
          <p className="mt-1 text-[11px] text-slate-500">{t(language, `${managedQuestions.length} questions · ${managedFlashcards.length} flashcards`, `${managedQuestions.length} QCM · ${managedFlashcards.length} flashcards`)}</p>
        </div>
        <button type="button" aria-expanded={manageOpen} onClick={() => setManageOpen((open) => !open)} className="min-h-11 shrink-0 rounded-xl border border-white/[0.09] px-3 text-xs font-bold text-slate-200">
          {manageOpen ? t(language, "Close", "Fermer") : t(language, "Manage", "Gérer")}
        </button>
      </div>
      {manageOpen && <div className="mt-4 space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/10 p-1" role="group" aria-label={t(language, "Filter content type", "Filtrer par type de contenu")}>
          {[
            ["all", t(language, "All", "Tout")],
            ["qcm", t(language, "Questions", "QCM")],
            ["flashcard", t(language, "Flashcards", "Flashcards")],
          ].map(([type, label]) => <button key={type} type="button" aria-pressed={manageType === type} onClick={() => setManageType(type)} className={`min-h-10 rounded-lg px-1 text-[11px] font-semibold ${manageType === type ? "bg-sky-400 text-navy-950" : "text-slate-400"}`}>{label}</button>)}
        </div>
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="search" value={manageSearch} onChange={(event) => setManageSearch(event.target.value)} placeholder={t(language, "Search questions and concepts…", "Rechercher une question ou une notion…")} aria-label={t(language, "Search study content", "Rechercher dans le contenu")} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b1220] pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600" />
        </label>
        <select value={manageCategory} onChange={(event) => setManageCategory(event.target.value)} aria-label={t(language, "Filter by subject", "Filtrer par matière")} className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b1220] px-3 text-sm text-slate-200">
          <option value="all">{t(language, "All subjects", "Toutes les matières")}</option>
          {CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(language, category)}</option>)}
        </select>
        <p className="text-[11px] text-slate-500">{t(language, `${filteredManagedContent.length} of ${managedContent.length} items`, `${filteredManagedContent.length} élément${filteredManagedContent.length > 1 ? "s" : ""} sur ${managedContent.length}`)}</p>
        {filteredManagedContent.length === 0
          ? <p className="rounded-xl border border-white/[0.06] p-4 text-center text-xs text-slate-500">{t(language, "No content matches your search.", "Aucun contenu ne correspond à votre recherche.")}</p>
          : <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">{filteredManagedContent.map((question) => {
            const isEditing = editingQuestion?.id === question.id;
            const isFlashcard = question.type === "flashcard";
            return <article key={question.id} className="rounded-xl border border-white/[0.07] bg-black/10 p-3">
              {isEditing ? <form onSubmit={saveManagedQuestion} className="space-y-3">
                <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Subject", "Matière")}
                  <select value={editingQuestion.category} onChange={(event) => updateEditingQuestion({ category: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200">
                    {CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(language, category)}</option>)}
                  </select>
                </label>
                <label className="block text-[10px] font-semibold text-slate-400">{isFlashcard ? t(language, "Front · term or prompt", "Recto · terme ou question") : t(language, "Question", "Question")}
                  <textarea rows={3} value={editingQuestion.question} onChange={(event) => updateEditingQuestion({ question: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-xs leading-relaxed text-slate-200" />
                </label>
                {isFlashcard ? <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Back · definition or explanation", "Verso · définition ou explication")}
                  <textarea rows={4} value={editingQuestion.explanation || ""} onChange={(event) => updateEditingQuestion({ explanation: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-xs leading-relaxed text-slate-200" />
                </label> : <>
                <div className="grid grid-cols-2 gap-2">
                  {editingQuestion.options.map((option, index) => <label key={index} className="block text-[10px] font-semibold text-slate-400">{t(language, `Choice ${String.fromCharCode(65 + index)}`, `Choix ${String.fromCharCode(65 + index)}`)}
                    <input value={option} onChange={(event) => updateEditingQuestion({ options: editingQuestion.options.map((value, optionIndex) => optionIndex === index ? event.target.value : value) })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-2 text-xs text-slate-200" />
                  </label>)}
                </div>
                <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Correct answer", "Bonne réponse")}
                  <select value={editingQuestion.answer} onChange={(event) => updateEditingQuestion({ answer: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-white/[0.08] bg-[#0b1220] px-3 text-xs text-slate-200">
                    {editingQuestion.options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}
                  </select>
                </label>
                <label className="block text-[10px] font-semibold text-slate-400">{t(language, "Explanation", "Explication")}
                  <textarea rows={3} value={editingQuestion.explanation || ""} onChange={(event) => updateEditingQuestion({ explanation: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b1220] p-3 text-xs leading-relaxed text-slate-200" />
                </label>
                </>}
                <div className="flex gap-2">
                  <button type="submit" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-sky-400 text-xs font-bold text-navy-950"><Check size={14} />{t(language, "Save changes", "Enregistrer")}</button>
                  <button type="button" onClick={() => setEditingQuestion(null)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.1] text-xs font-bold text-slate-300"><X size={14} />{t(language, "Cancel", "Annuler")}</button>
                </div>
              </form> : <>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{isFlashcard ? t(language, "Flashcard", "Flashcard") : t(language, "Practice question", "Question d'entraînement")} · {categoryLabel(language, question.category)}{!isFlashcard && ` · ${t(language, `Answer ${String.fromCharCode(65 + question.answer)}`, `Réponse ${String.fromCharCode(65 + question.answer)}`)}`}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-white">{question.question}</p>
                    {isFlashcard && <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{question.explanation}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => beginEditingQuestion(question)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.09] text-xs font-bold text-slate-200"><Pencil size={14} />{t(language, "Edit", "Modifier")}</button>
                  <button type="button" onClick={() => removeManagedContent(question)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.04] text-xs font-bold text-rose-200"><Trash2 size={14} />{t(language, "Delete", "Supprimer")}</button>
                </div>
              </>}
            </article>;
          })}</div>}
      </div>}
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <h2 className="text-sm font-bold text-white">{t(language, "Language", "Langue")}</h2>
      <p className="mt-1 text-[11px] text-slate-500">{t(language, "Choose the language used throughout the app.", "Choisissez la langue utilisée dans toute l'application.")}</p>
      <select aria-label={t(language, "App language", "Langue de l'application")} value={language} onChange={(event) => onLanguageChange(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b1220] px-3 text-sm text-slate-200">
        <option value="en">English</option><option value="fr">Français</option>
      </select>
    </section>

    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <h2 className="text-sm font-bold text-white">{t(language, "Sync & backup", "Synchronisation & sauvegarde")}</h2>
      <p className="mt-1 text-[11px] text-slate-500">{t(language, `${data.bank.length} items · ${data.mistakes.length} mistakes · saved automatically on this device`, `${data.bank.length} éléments · ${data.mistakes.length} erreurs · sauvegarde automatique locale`)}</p>
      <button type="button" onClick={() => { setGithubSyncOpen(true); setGithubSyncMessage(null); }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-400 text-sm font-bold text-navy-950">
        <Github size={17} />{t(language, "Sync study bank to GitHub", "Synchroniser la banque avec GitHub")}
      </button>
      <button type="button" onClick={exportData} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] text-sm font-bold text-slate-200"><Download size={16} />{t(language, "Download backup (.json)", "Télécharger une sauvegarde (.json)")}</button>
      <div className="mt-3 border-t border-white/[0.07] pt-3">
        <button type="button" aria-expanded={jsonImportOpen} aria-controls="json-import-panel" onClick={() => setJsonImportOpen((open) => !open)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs font-semibold text-slate-300">
          <span>{t(language, "Import questions or a backup (.json)", "Importer des questions ou une sauvegarde (.json)")}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${jsonImportOpen ? "rotate-180" : ""}`} />
        </button>
        <form id="json-import-panel" hidden={!jsonImportOpen} onSubmit={importJson} className="mt-2 space-y-3">
          <p className="text-[11px] leading-relaxed text-slate-500">{t(language, "Paste a question array or a previously exported backup. Content is merged by ID; local scores and progress are never replaced.", "Collez un tableau de questions ou une sauvegarde exportée. Le contenu est fusionné par identifiant; les scores et la progression locale ne sont jamais remplacés.")}</p>
          <textarea required value={jsonImportValue} onChange={(event) => setJsonImportValue(event.target.value)} rows={7} spellCheck="false" placeholder={'[\n  {\n    "id": "unique-id",\n    "category": "Maths",\n    "type": "qcm",\n    "question": "...",\n    "options": ["A", "B", "C", "D"],\n    "answer": 0,\n    "explanation": "..."\n  }\n]'} className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0b1220] p-3 font-mono text-[11px] leading-relaxed text-slate-200 placeholder:text-slate-600" />
          <button type="submit" disabled={!jsonImportValue.trim() || jsonImporting} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] text-xs font-bold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
            {jsonImporting ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
            {jsonImporting ? t(language, "Validating and merging…", "Validation et fusion…") : t(language, "Validate and merge", "Valider et fusionner")}
          </button>
        </form>
      </div>
      <button type="button" onClick={reset} className="mt-3 min-h-12 w-full rounded-xl border border-rose-400/20 bg-rose-400/[0.04] text-sm font-bold text-rose-200 transition hover:bg-rose-400/[0.09]">{t(language, "Reset progress", "Réinitialiser la progression")}</button>
    </section>

    {githubSyncOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="github-sync-title" className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1626] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200"><Github size={20} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="github-sync-title" className="text-base font-bold text-white">{t(language, "Sync study bank to GitHub", "Synchroniser la banque avec GitHub")}</h2>
            <p className="mt-1 break-all text-[11px] leading-relaxed text-slate-400">{GITHUB_DESTINATION.owner}/{GITHUB_DESTINATION.repository} · {GITHUB_DESTINATION.branch} · {GITHUB_DESTINATION.path}</p>
          </div>
          <button type="button" aria-label={t(language, "Close", "Fermer")} onClick={() => setGithubSyncOpen(false)} disabled={githubSyncing} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.06] disabled:opacity-40"><X size={18} /></button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3 text-[11px] leading-relaxed text-amber-100">
          <p className="font-bold">{t(language, "This replaces the remote study-bank file with the current local bank.", "Cette action remplace le fichier distant par la banque locale actuelle.")}</p>
          <p className="mt-1">{t(language, "Adds, edits, and deletions are included. Scores and personal progress are not uploaded.", "Les ajouts, modifications et suppressions sont inclus. Les scores et la progression personnelle ne sont pas envoyés.")}</p>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">{t(language, "Use a fine-grained personal access token limited to this repository with Contents: Read and write. The token is used only in memory and is never saved to local storage.", "Utilisez un jeton d'accès personnel à granularité fine, limité à ce dépôt, avec Contents : Read and write. Le jeton reste en mémoire et n'est jamais enregistré localement.")}</p>
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-sky-300 underline underline-offset-2">{t(language, "Create a fine-grained token on GitHub", "Créer un jeton à granularité fine sur GitHub")}</a>
        <form onSubmit={syncToGitHub} className="mt-3 space-y-3">
          <label className="block text-xs font-semibold text-slate-300">{t(language, "GitHub token", "Jeton GitHub")}
            <input type="password" autoComplete="off" spellCheck="false" required value={githubToken} onChange={(event) => setGithubToken(event.target.value)} placeholder="github_pat_…" className="mt-1 min-h-12 w-full rounded-xl border border-white/[0.1] bg-[#080e19] px-3 text-sm text-slate-100 placeholder:text-slate-600" />
          </label>
          {githubSyncMessage && <div role={githubSyncMessage.kind === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-xs leading-relaxed ${githubSyncMessage.kind === "error" ? "border-rose-400/20 bg-rose-400/[0.07] text-rose-200" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"}`}>
            <p>{githubSyncMessage.text}</p>
            {githubSyncMessage.commitUrl && <a href={githubSyncMessage.commitUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold underline underline-offset-2">{t(language, "View GitHub commit", "Voir le commit GitHub")}</a>}
          </div>}
          <div className="flex gap-2">
            <button type="submit" disabled={githubSyncing || !githubToken.trim()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-3 text-sm font-bold text-navy-950 disabled:opacity-50">
              {githubSyncing ? <LoaderCircle size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
              {githubSyncing ? t(language, "Syncing…", "Synchronisation…") : t(language, "Push study bank", "Envoyer la banque")}
            </button>
            <button type="button" disabled={githubSyncing || !githubToken} onClick={() => { setGithubToken(""); setGithubSyncMessage(null); }} className="min-h-12 rounded-xl border border-white/[0.1] px-3 text-xs font-bold text-slate-300 disabled:opacity-40">{t(language, "Forget token", "Oublier le jeton")}</button>
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
