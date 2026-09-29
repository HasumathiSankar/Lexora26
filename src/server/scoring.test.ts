import assert from 'node:assert/strict';
import test from 'node:test';
import type { Challenge, LeaderboardEntry, RubricCriterion } from '../shared/types.ts';
import {
  calculateCompetitionScore,
  createInFlightSubmissionLock,
  evaluateSubmissionFallback,
  rankLeaderboardEntries,
} from './scoring.ts';

const defaultRubric: RubricCriterion[] = [
  { id: 'r2_c1', criterion: 'Within 50 Words', weight: 15, category: 'task_achievement', description: 'Keep the prompt within 50 words.' },
  { id: 'r2_c2', criterion: 'Weekday Schedule', weight: 12, category: 'task_achievement', description: 'Keep the Monday-to-Friday schedule.' },
  { id: 'r2_c3', criterion: 'Daily Sessions', weight: 12, category: 'task_achievement', description: 'Plan three subjects or sessions each day.' },
  { id: 'r2_c4', criterion: 'Breaks', weight: 12, category: 'task_achievement', description: 'Include short breaks.' },
  { id: 'r2_c5', criterion: 'Difficult Subjects', weight: 12, category: 'task_achievement', description: 'Allocate extra time to hard subjects.' },
  { id: 'r2_c6', criterion: 'Friday Revision', weight: 12, category: 'task_achievement', description: 'Include Friday revision.' },
  { id: 'r2_c7', criterion: 'Simple Table', weight: 12, category: 'task_achievement', description: 'Use a simple timetable table.' },
  { id: 'r2_c8', criterion: 'Clear and Concise', weight: 13, category: 'prompt_quality', description: 'Use clear, concise wording.' },
];

const compressionChallenge: Challenge = {
  id: 'ch_r2',
  roundId: 'round_2',
  title: 'Shorten the Prompt, Keep the Meaning',
  promptType: 'prompt_submission',
  taskOverview: 'Compress a study timetable request.',
  detailedTask: 'Create a simple weekday study timetable with breaks, extra time for difficult subjects, and Friday revision.',
  targetScenario: 'Three daily study sessions, Monday to Friday.',
  inputConstraints: ['No more than 50 words.', 'Output a table.'],
  maxTokensOrChars: 50,
  rubric: defaultRubric,
};

function makeChallenge(roundId: Challenge['roundId'], rubric: RubricCriterion[]): Challenge {
  return {
    ...compressionChallenge,
    id: `ch_${roundId}`,
    roundId,
    title: roundId,
    maxTokensOrChars: null,
    rubric,
  };
}

function score(overrides: Partial<Parameters<typeof calculateCompetitionScore>[0]> = {}) {
  return calculateCompetitionScore({
    promptQualityScore: 80,
    taskAchievementScore: 90,
    elapsedSeconds: 300,
    timeLimitMinutes: 20,
    attemptsUsed: 1,
    ...overrides,
  });
}

function entry(overrides: Partial<LeaderboardEntry> & Pick<LeaderboardEntry, 'studentId' | 'studentName'>): LeaderboardEntry {
  return {
    rank: 0,
    collegeName: 'Example College',
    department: 'Computing',
    academicYear: '2nd Year',
    totalScore: 0,
    round1Score: null,
    round2Score: null,
    round3Score: null,
    round4Score: null,
    roundsCompleted: 1,
    totalTimeSeconds: 100,
    totalAttempts: 1,
    qualificationStatus: 'QUALIFIED',
    isTopThree: false,
    ...overrides,
  };
}

test('prompt quality produces continuous differentiated final scores', () => {
  const lower = score({ promptQualityScore: 51.25 });
  const higher = score({ promptQualityScore: 82.75 });
  assert.ok(higher.score > lower.score);
  assert.equal(higher.breakdown.promptQualityPoints, 41.38);
});

test('complete task achievement scores higher than partial achievement', () => {
  const partial = score({ taskAchievementScore: 42 });
  const complete = score({ taskAchievementScore: 95 });
  assert.ok(complete.score > partial.score);
  assert.equal(complete.breakdown.completionStatus, 'COMPLETED');
  assert.equal(partial.breakdown.completionStatus, 'PARTIALLY_COMPLETED');
});

test('a successful first attempt gets full attempt points and repeated attempts decline', () => {
  const first = score({ taskAchievementScore: 100, attemptsUsed: 1 });
  const second = score({ taskAchievementScore: 100, attemptsUsed: 2 });
  assert.equal(first.breakdown.attemptEfficiencyScore, 100);
  assert.equal(first.breakdown.attemptEfficiencyPoints, 10);
  assert.equal(second.breakdown.attemptEfficiencyScore, 50);
  assert.equal(second.breakdown.attemptEfficiencyPoints, 5);
});

test('time changes the total by at most its configured ten percent', () => {
  const instant = score({ elapsedSeconds: 0, timeLimitMinutes: 10 });
  const atLimit = score({ elapsedSeconds: 600, timeLimitMinutes: 10 });
  assert.equal(instant.score - atLimit.score, 10);
  assert.equal(instant.breakdown.timeEfficiencyPoints, 10);
  assert.equal(atLimit.breakdown.timeEfficiencyPoints, 0);
});

test('a fast but poor task cannot beat a complete high-quality submission', () => {
  const fastPoor = score({ promptQualityScore: 100, taskAchievementScore: 10, elapsedSeconds: 0 });
  const slowerComplete = score({ promptQualityScore: 80, taskAchievementScore: 100, elapsedSeconds: 450 });
  assert.ok(slowerComplete.score > fastPoor.score);
});

test('semantically equivalent compression prompts receive equivalent achievement scores', () => {
  const promptA = 'Plan study sessions from Monday to Friday. Arrange three subjects each day, add short breaks between sessions, give extra time to difficult subjects, reserve Friday for revision, and show a simple timetable in a table.';
  const promptB = 'Build a learning schedule on weekdays: three daily courses, with brief pauses between each session. Give harder subjects longer study blocks, include a Friday recap, and present the simple plan as a clear table.';
  const evaluationA = evaluateSubmissionFallback(compressionChallenge, promptA);
  const evaluationB = evaluateSubmissionFallback(compressionChallenge, promptB);
  assert.equal(evaluationA.taskAchievementScore, 100);
  assert.equal(evaluationB.taskAchievementScore, 100);
});

test('reverse prompting grades visual coverage separately from prompt quality', () => {
  const challenge = makeChallenge('round_1', [
    ...['r1_c1', 'r1_c2', 'r1_c3', 'r1_c4', 'r1_c5', 'r1_c6', 'r1_c7'].map((id) => ({
      id,
      criterion: id,
      weight: 10,
      category: 'task_achievement' as const,
      description: id,
    })),
    { id: 'r1_c8', criterion: 'Prompt Clarity', weight: 10, category: 'prompt_quality', description: 'Clear prompt.' },
  ]);
  const detailed = 'Question 1: A white ceramic bowl of yellow lemons sits at center on a wooden table, with a loose lemon and green leafy branch to the left. Soft morning window light casts shadows on a sage wall. Question 2: An open book and small plant sit beside a glowing lamp on a desk; a navy night window adds cool blue tones to the warm room. Storybook illustration with visible brush texture and angled perspective.';
  const vague = 'Question 1: A nice bowl on a table. Question 2: A nice room at night.';
  assert.ok(evaluateSubmissionFallback(challenge, detailed).taskAchievementScore > evaluateSubmissionFallback(challenge, vague).taskAchievementScore);
});

test('prompt relay rewards explicit output handoffs between all three steps', () => {
  const challenge = makeChallenge('round_3', [
    ...['r3_c1', 'r3_c2', 'r3_c3', 'r3_c4', 'r3_c5'].map((id) => ({ id, criterion: id, weight: 18, category: 'task_achievement' as const, description: id })),
    { id: 'r3_c6', criterion: 'Clarity', weight: 10, category: 'prompt_quality', description: 'Clear prompts.' },
  ]);
  const connected = 'Step 1: Identify the student subjects and exam dates from supplied notes and return that output. Step 2: Use the output from Step 1 to build a daily timetable. Step 3: Use the output from Step 2, the timetable, to suggest three revision tips.';
  const disconnected = 'Step 1: Identify subjects. Step 2: Make a timetable. Step 3: Give tips.';
  assert.ok(evaluateSubmissionFallback(challenge, connected).taskAchievementScore > evaluateSubmissionFallback(challenge, disconnected).taskAchievementScore);
});

test('prompt chaining evaluates draft, review, and improvement as distinct stages', () => {
  const challenge = makeChallenge('round_4', [
    ...['r4_c1', 'r4_c2', 'r4_c3', 'r4_c4', 'r4_c5'].map((id) => ({ id, criterion: id, weight: 18, category: 'task_achievement' as const, description: id })),
    { id: 'r4_c6', criterion: 'Chain Quality', weight: 10, category: 'prompt_quality', description: 'Clear stages.' },
  ]);
  const complete = 'Stage 1: Draft an announcement using the supplied event details. Stage 2: Review the draft and check event name, date, time, venue, and online registration instructions. Stage 3: Use the review output to correct missing details and unclear wording, produce the final announcement, and do not invent information.';
  const partial = 'Stage 1: Draft an announcement. Stage 2: Review it. Stage 3: Improve it.';
  assert.ok(evaluateSubmissionFallback(challenge, complete).taskAchievementScore > evaluateSubmissionFallback(challenge, partial).taskAchievementScore);
});

test('identical performance scores deterministically', () => {
  const first = score();
  const second = score();
  assert.deepEqual(first, second);
});

test('submission lock blocks concurrent attempts and permits retry after release', () => {
  const lock = createInFlightSubmissionLock();
  assert.equal(lock.acquire('student-1:round_1'), true);
  assert.equal(lock.acquire('student-1:round_1'), false);
  lock.release('student-1:round_1');
  assert.equal(lock.acquire('student-1:round_1'), true);
});

test('leaderboard applies score, achievement, quality, attempts, and time tie-breakers without name ranking', () => {
  const ranked = rankLeaderboardEntries([
    entry({ studentId: 'achievement', studentName: 'Zed', totalScore: 100, taskAchievementScore: 80, promptQualityScore: 40, totalAttempts: 4 }),
    entry({ studentId: 'quality', studentName: 'Yara', totalScore: 100, taskAchievementScore: 80, promptQualityScore: 50, totalAttempts: 8 }),
    entry({ studentId: 'attempts', studentName: 'Xander', totalScore: 100, taskAchievementScore: 80, promptQualityScore: 50, totalAttempts: 1, totalTimeSeconds: 150 }),
    entry({ studentId: 'fastest', studentName: 'Zoe', totalScore: 100, taskAchievementScore: 80, promptQualityScore: 50, totalAttempts: 1, totalTimeSeconds: 50 }),
    entry({ studentId: 'same', studentName: 'Aaron', totalScore: 100, taskAchievementScore: 80, promptQualityScore: 50, totalAttempts: 1, totalTimeSeconds: 50 }),
    entry({ studentId: 'score', studentName: 'Ari', totalScore: 99, taskAchievementScore: 100, promptQualityScore: 100, totalAttempts: 1, totalTimeSeconds: 1 }),
  ]);
  assert.equal(ranked[0].studentId, 'fastest');
  assert.equal(ranked[0].rank, ranked[1].rank);
  assert.equal(ranked[2].studentId, 'attempts');
  assert.equal(ranked[3].studentId, 'quality');
  assert.equal(ranked[4].studentId, 'achievement');
  assert.equal(ranked[5].studentId, 'score');
});

test('scoring weights must sum to one hundred', () => {
  assert.throws(() => score({ weights: { promptQuality: 50, taskAchievement: 30, timeEfficiency: 15, attemptEfficiency: 10 } }));
});
