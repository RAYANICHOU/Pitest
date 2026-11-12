import { localDateKey } from "./constants.js";

export const SUBJECT_DAILY_QUESTION_GOAL = 10;
export const SUBJECT_WEEKLY_QUESTION_GOAL = 60;
export const SUBJECT_MONTHLY_QUESTION_GOAL = 240;

function dayAtNoon(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

export function getSubjectQuestionGoal(period, now = new Date()) {
  if (period === "day") return SUBJECT_DAILY_QUESTION_GOAL;
  if (period === "week") return SUBJECT_WEEKLY_QUESTION_GOAL;
  if (period === "month") return SUBJECT_MONTHLY_QUESTION_GOAL;
  throw new RangeError(`Unsupported progress period: ${period}`);
}

export function getGoalProgress(answered, goal) {
  return goal > 0 ? Math.min(100, Math.round((answered / goal) * 100)) : 0;
}

export function getProgressPeriod(period, now = new Date()) {
  const todayKey = localDateKey(now);
  if (period === "day") return { start: todayKey, end: todayKey };

  const start = dayAtNoon(todayKey);
  if (period === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: localDateKey(start), end: localDateKey(end) };
  }

  start.setDate(1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  return { start: localDateKey(start), end: localDateKey(end) };
}

export function summarizeProgress(dailyStats = {}, period = "day", now = new Date()) {
  const range = getProgressPeriod(period, now);
  const summary = {
    answered: 0,
    correct: 0,
    durationSeconds: 0,
    sessions: 0,
    mockExams: 0,
    dailyPlans: 0,
    dailyCheckIns: 0,
    flashcardsReviewed: 0,
    activeDays: 0,
    byCategory: {},
  };
  const cursor = dayAtNoon(range.start);
  const lastDay = dayAtNoon(range.end);

  while (cursor <= lastDay) {
    const dateKey = localDateKey(cursor);
    const day = dailyStats[dateKey];
    if (day) {
      summary.answered += day.answered || 0;
      summary.correct += day.correct || 0;
      summary.durationSeconds += day.durationSeconds || 0;
      summary.sessions += day.sessions || 0;
      summary.mockExams += day.mockExams || 0;
      summary.dailyPlans += day.dailyPlans || 0;
      summary.dailyCheckIns += day.dailyCheckIns || 0;
      summary.flashcardsReviewed += day.flashcardsReviewed || 0;
      if ((day.answered || 0) > 0 || (day.flashcardsReviewed || 0) > 0) summary.activeDays += 1;
      for (const [category, stats] of Object.entries(day.byCategory || {})) {
        const total = summary.byCategory[category] || { answered: 0, correct: 0 };
        summary.byCategory[category] = {
          answered: total.answered + (stats.answered || 0),
          correct: total.correct + (stats.correct || 0),
        };
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  summary.accuracy = summary.answered
    ? Math.round((summary.correct / summary.answered) * 100)
    : null;
  return { ...summary, ...range };
}

export function addDailyAnswer(dailyStats, dateKey, question, isCorrect) {
  const day = dailyStats[dateKey] || {};
  const category = day.byCategory?.[question.category] || { answered: 0, correct: 0 };
  return {
    ...dailyStats,
    [dateKey]: {
      ...day,
      answered: (day.answered || 0) + 1,
      correct: (day.correct || 0) + (isCorrect ? 1 : 0),
      byCategory: {
        ...(day.byCategory || {}),
        [question.category]: {
          answered: category.answered + 1,
          correct: category.correct + (isCorrect ? 1 : 0),
        },
      },
    },
  };
}

export function addDailySession(dailyStats, dateKey, session) {
  const day = dailyStats[dateKey] || {};
  return {
    ...dailyStats,
    [dateKey]: {
      ...day,
      sessions: (day.sessions || 0) + Number(session.completed),
      durationSeconds: (day.durationSeconds || 0) + session.durationSeconds,
      mockExams: (day.mockExams || 0) + Number(session.mode === "exam" && session.completed),
      dailyPlans: (day.dailyPlans || 0) + Number(session.mode === "daily-plan" && session.completed),
      dailyCheckIns: (day.dailyCheckIns || 0) + Number(session.mode === "daily-check-in" && session.completed),
    },
  };
}

export function addDailyFlashcardReview(dailyStats, dateKey) {
  const day = dailyStats[dateKey] || {};
  return {
    ...dailyStats,
    [dateKey]: { ...day, flashcardsReviewed: (day.flashcardsReviewed || 0) + 1 },
  };
}
