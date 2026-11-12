export function normalizeForComparison(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function similarity(first, second) {
  const longest = Math.max(first.length, second.length);
  if (longest < 30) return 0;
  let previous = Array.from({ length: second.length + 1 }, (_value, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const current = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + Number(first[firstIndex - 1] !== second[secondIndex - 1]),
      );
    }
    previous = current;
  }
  return 1 - previous[second.length] / longest;
}

export function findQuestionDuplicates(question, bank) {
  if (!question?.question) return [];
  const prompt = normalizeForComparison(question.question);
  const options = question.options.map(normalizeForComparison);
  return bank
    .map((item) => {
      if (item.type !== "qcm") return null;
      const itemPrompt = normalizeForComparison(item.question);
      const promptSimilarity = itemPrompt === prompt ? 1 : similarity(itemPrompt, prompt);
      if (promptSimilarity < 0.88) return null;
      const sameOptions = item.options.length === options.length
        && item.options.every((option, index) => normalizeForComparison(option) === options[index]);
      return {
        item,
        promptSimilarity,
        similarWording: itemPrompt !== prompt,
        sameOptions,
        sameCategory: item.category === question.category,
        exact: itemPrompt === prompt && sameOptions && item.category === question.category,
      };
    })
    .filter(Boolean)
    .sort((first, second) => Number(second.exact) - Number(first.exact) || Number(second.sameOptions) - Number(first.sameOptions));
}
