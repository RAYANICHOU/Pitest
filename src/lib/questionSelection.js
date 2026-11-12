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
