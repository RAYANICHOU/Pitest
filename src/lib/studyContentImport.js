import { CATEGORIES } from "./constants.js";

export function parseStudyContentImport(source) {
  const parsed = JSON.parse(source);
  const entries = Array.isArray(parsed) ? parsed : parsed?.bank;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { items: [], invalidEntries: [], empty: true };
  }

  const seenIds = new Set();
  const invalidEntries = [];
  const items = [];

  entries.forEach((entry, index) => {
    const validBase = entry && typeof entry === "object" && !Array.isArray(entry)
      && typeof entry.id === "string" && entry.id.trim()
      && CATEGORIES.includes(entry.category)
      && typeof entry.question === "string" && entry.question.trim()
      && typeof entry.explanation === "string";
    if (!validBase || !["qcm", "flashcard"].includes(entry.type)) {
      invalidEntries.push(index);
      return;
    }

    const id = entry.id.trim();
    if (seenIds.has(id)) {
      invalidEntries.push(index);
      return;
    }
    seenIds.add(id);

    if (entry.type === "qcm") {
      if (!Array.isArray(entry.options) || entry.options.length !== 4
        || entry.options.some((option) => typeof option !== "string" || !option.trim())
        || !Number.isInteger(entry.answer) || entry.answer < 0 || entry.answer > 3) {
        invalidEntries.push(index);
        return;
      }
      items.push({
        id,
        category: entry.category,
        type: "qcm",
        question: entry.question.trim(),
        options: entry.options.map((option) => option.trim()),
        answer: entry.answer,
        explanation: entry.explanation.trim(),
      });
      return;
    }

    if (!entry.explanation.trim()) {
      invalidEntries.push(index);
      return;
    }
    items.push({
      id,
      category: entry.category,
      type: "flashcard",
      question: entry.question.trim(),
      options: [],
      answer: 0,
      explanation: entry.explanation.trim(),
    });
  });

  return { items, invalidEntries, empty: false };
}
