export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function randomQuestionIds(questions, limit = questions.length, random = Math.random) {
  return shuffle(questions, random)
    .slice(0, Math.max(0, limit))
    .map((question) => question.id);
}

export function randomQuestionIdsWithRepeats(questions, limit, random = Math.random) {
  if (!questions.length || limit <= 0) return [];

  const result = [];
  let previousId;
  while (result.length < limit) {
    const round = shuffle(questions, random);
    if (round.length > 1 && round[0].id === previousId) {
      const swapIndex = 1 + Math.floor(random() * (round.length - 1));
      [round[0], round[swapIndex]] = [round[swapIndex], round[0]];
    }
    for (const question of round) {
      if (result.length >= limit) break;
      result.push(question.id);
      previousId = question.id;
    }
  }
  return result;
}
