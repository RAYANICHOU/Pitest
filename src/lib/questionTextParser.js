import { CATEGORIES } from "./constants.js";
import { normalizeForComparison } from "./duplicateDetection.js";

const categoryRules = [
  { category: "Anglais", pattern: /^(anglais|english|vocabulaire|vocabulary|grammar|grammaire|reading comprehension)(\s+(test|section|exam|examen))?$/i },
  { category: "Maths", pattern: /^(maths?|mathematics?|math[eé]matiques?|calcul|arithm[eé]tique|algebra|alg[eè]bre)(\s+(test|section|exam|examen))?$/i },
  { category: "Physique", pattern: /^(physique|physics|cin[eé]matique|dynamique|[eé]lectricit[eé])(\s+(test|section|exam|examen))?$/i },
  { category: "Mécanique", pattern: /^(m[eé]canique|mechanics|raisonnement m[eé]canique|mechanical reasoning|engrenages?|poulies?|leviers?|transmission)(\s+(test|section|exam|examen))?$/i },
];

const answerHeading = /(corrig[eé]s?|corrections?|r[eé]ponses?\s+aux?\s+questions|answer\s*key|solutions?\s+des?\s+questions|key\s+answers?)/i;
const questionStart = /^\s*(\d{1,3})\s*[.)]\s*(.*)$/;
const optionMarker = /(?:^|\s)([A-D])[.)]\s*/gi;

function getCategoryFromHeading(line) {
  const heading = line.trim()
    .replace(/^(?:(?:partie|section|mati[eè]re|subject)\s+)?(?:[ivx]+|\d+)\s*[-:.)]\s*/i, "")
    .replace(/^(?:partie|section|mati[eè]re|subject)(?:\s+|[-:]\s*)/i, "")
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "");
  if (heading.length > 65) return null;
  for (const rule of categoryRules) {
    if (rule.pattern.test(heading)) return rule.category;
  }
  return null;
}

function parseAnswerKey(lines) {
  const answers = new Map();
  let inAnswerKey = false;
  let answerCategory = null;
  let lastAnswerKey = null;
  for (const line of lines) {
    if (answerHeading.test(line)) {
      inAnswerKey = true;
    }
    if (!inAnswerKey) continue;
    const headingCategory = getCategoryFromHeading(line.replace(answerHeading, "").trim()) || getCategoryFromHeading(line);
    if (headingCategory) {
      answerCategory = headingCategory;
      lastAnswerKey = null;
    }
    const matcher = /(?:^|\s)Q?(?:uestion\s*)?(\d{1,3})\s*(?:[).:=-]\s*|\s+)([A-D])\b/gi;
    const matches = [...line.matchAll(matcher)];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const number = Number(match[1]);
      const next = matches[index + 1];
      const end = next ? next.index : line.length;
      const explanation = line.slice(match.index + match[0].length, end).replace(/^[\s).:–—-]+/, "").trim();
      lastAnswerKey = `${answerCategory || "*"}:${number}`;
      answers.set(lastAnswerKey, { letter: match[2].toUpperCase(), explanation });
    }
    if (!matches.length && lastAnswerKey !== null && line.length > 2) {
      const previous = answers.get(lastAnswerKey);
      if (previous && !previous.explanation) previous.explanation = line;
    }
  }
  return answers;
}

function parseQuestionBlock(block) {
  const text = block.lines.map((line) => line.text).join("\n").trim();
  const markers = [...text.matchAll(new RegExp(optionMarker.source, optionMarker.flags))];
  if (markers.length !== 4 || markers.map((marker) => marker[1].toUpperCase()).join("") !== "ABCD") return null;
  const firstOption = markers[0].index;
  const question = text.slice(0, firstOption).replace(/^\s*\d{1,3}\s*[.)]\s*/, "").trim();
  const options = markers.map((marker, index) => {
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? text.length;
    return text.slice(start, end).replace(/\s+/g, " ").trim();
  });
  if (!question || options.some((option) => !option)) return null;
  return {
    number: block.number,
    category: block.category,
    page: block.page,
    question,
    options,
  };
}

export function parseQuestionText(source, defaultCategory = null, language = "en") {
  const pages = Array.isArray(source)
    ? source
    : String(source).split(/\f/).map((text, index) => ({ page: index + 1, text }));
  const lines = pages.flatMap((page, index) => String(page.text || "").split(/\r?\n/).map((text) => ({
    text: text.replace(/[ \t]+/g, " ").trim(),
    page: page.page || index + 1,
  }))).filter((line) => line.text);
  const answers = parseAnswerKey(lines.map((line) => line.text));
  const numberCounts = new Map();
  const categoryNumberCounts = new Map();
  let currentCategory = null;
  let inAnswerKey = false;
  const blocks = [];
  let current = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const line of lines) {
    if (answerHeading.test(line.text)) {
      flush();
      inAnswerKey = true;
      continue;
    }
    if (inAnswerKey) continue;

    const headingCategory = getCategoryFromHeading(line.text);
    if (headingCategory) {
      flush();
      currentCategory = headingCategory;
      continue;
    }
    const start = line.text.match(questionStart);
    if (start) {
      flush();
      const number = Number(start[1]);
      numberCounts.set(number, (numberCounts.get(number) || 0) + 1);
      if (currentCategory) {
        const key = `${currentCategory}:${number}`;
        categoryNumberCounts.set(key, (categoryNumberCounts.get(key) || 0) + 1);
      }
      current = { number, category: currentCategory, page: line.page, lines: [{ ...line, text: start[0].replace(questionStart, "$2") }] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();

  const parsedBlocks = blocks.flatMap((block) => {
    const parsed = parseQuestionBlock(block);
    if (!parsed) return [];
    const category = parsed.category || (CATEGORIES.includes(defaultCategory) ? defaultCategory : null);
    const categoryKey = `${category || "*"}:${parsed.number}`;
    const categoryAnswerIsUnique = parsed.category && categoryNumberCounts.get(categoryKey) === 1;
    const answerEntry = categoryAnswerIsUnique
      ? answers.get(categoryKey) || (numberCounts.get(parsed.number) === 1 ? answers.get(`*:${parsed.number}`) : null)
      : numberCounts.get(parsed.number) === 1 ? answers.get(`*:${parsed.number}`) : null;
    const answerIndex = answerEntry ? answerEntry.letter.charCodeAt(0) - 65 : null;
    return [{
      category,
      suggestedCategory: parsed.category,
      categorySource: parsed.category ? "section" : null,
      type: "qcm",
      question: parsed.question,
      options: parsed.options,
      answer: answerIndex,
      answerSource: answerIndex === null ? null : "corrigé",
      page: parsed.page,
      number: parsed.number,
      explanation: answerIndex === null
        ? ""
        : answerEntry.explanation || (language === "fr"
          ? "Réponse repérée dans le corrigé ; explication détaillée non détectée."
          : "Answer found in the answer key; no detailed explanation detected."),
    }];
  });
  const occurrences = new Map();
  return parsedBlocks.map((question) => {
    const fingerprint = `${question.category || "unclassified"}|${normalizeForComparison(question.question)}|${question.options.map(normalizeForComparison).join("|")}`;
    let hash = 2166136261;
    for (let index = 0; index < fingerprint.length; index += 1) {
      hash ^= fingerprint.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const baseId = `pdf-${(hash >>> 0).toString(36)}`;
    const occurrence = (occurrences.get(baseId) || 0) + 1;
    occurrences.set(baseId, occurrence);
    return { ...question, id: occurrence === 1 ? baseId : `${baseId}-${occurrence}` };
  });
}
