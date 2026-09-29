import type { Challenge, CriterionEvaluation, LeaderboardEntry, ScoringBreakdown, ScoringWeights } from '../shared/types.ts';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  promptQuality: 50,
  taskAchievement: 30,
  timeEfficiency: 10,
  attemptEfficiency: 10,
};

export const DEFAULT_COMPLETION_THRESHOLD = 80;

export interface CompetitionScoreInput {
  promptQualityScore: number;
  taskAchievementScore: number;
  elapsedSeconds: number;
  timeLimitMinutes: number;
  attemptsUsed: number;
  weights?: ScoringWeights;
  completionThreshold?: number;
}

export interface CompetitionScoreResult {
  score: number;
  breakdown: ScoringBreakdown;
}

export interface SubmissionQualityResult {
  promptQualityScore: number;
  taskAchievementScore: number;
  criterionScores: CriterionEvaluation[];
  feedback: string;
}

const requirementSignals: Record<string, string[][]> = {
  r1_c1: [['soft light', 'soft lighting', 'natural light', 'sunlight', 'morning light', 'warm light', 'shadows', 'glowing lamp', 'lamp light']],
  r1_c2: [['yellow', 'golden', 'lemons'], ['green', 'sage', 'leaves'], ['warm and cool', 'warm-cool', 'blue night', 'navy']],
  r1_c3: [['bowl', 'lemons'], ['lamp', 'open book', 'desk'], ['plant', 'leaves']],
  r1_c4: [['sage wall', 'green wall', 'wall'], ['window', 'night sky', 'blue outside', 'room']],
  r1_c5: [['left', 'right', 'center', 'middle'], ['foreground', 'background', 'perspective', 'camera angle', 'viewed from']],
  r1_c6: [['ceramic', 'brush texture', 'painted', 'wood grain', 'leaves', 'branch', 'tabletop']],
  r1_c7: [['illustration', 'illustrated', 'painting', 'painted', 'storybook', 'realistic', 'cinematic', 'minimal']],
  r2_c1: [['under 50 words', '50 words', 'maximum 50', 'no more than 50']],
  r2_c2: [['monday to friday', 'monday through friday', 'weekdays', 'working week', 'each weekday']],
  r2_c3: [['three', '3', 'thrice'], ['each day', 'per day', 'daily']],
  r2_c4: [['break', 'rest', 'pause'], ['between sessions', 'between each', 'in between']],
  r2_c5: [['difficult', 'hard', 'challenging', 'tough', 'tougher'], ['extra time', 'more time', 'additional time', 'longer session', 'longer study block', 'longer blocks']],
  r2_c6: [['friday'], ['revision', 'revise', 'review', 'recap']],
  r2_c7: [['table', 'tabular'], ['simple', 'clear', 'easy to understand', 'straightforward']],
  r3_c1: [['step 1', 'step one'], ['step 2', 'step two'], ['step 3', 'step three']],
  r3_c2: [['identify', 'find', 'extract', 'list'], ['subjects', 'courses'], ['exam dates', 'examination dates', 'test dates']],
  r3_c3: [['step 1', 'previous step', 'identified subjects'], ['subjects', 'courses'], ['exam dates', 'dates'], ['daily timetable', 'study schedule', 'study plan']],
  r3_c4: [['step 2', 'previous timetable', 'study schedule', 'study plan'], ['three', '3'], ['revision tips', 'study tips', 'revision strategies']],
  r3_c5: [['output from step 1', 'step 1 output', 'previous step'], ['output from step 2', 'step 2 output', 'timetable']],
  r4_c1: [['stage 1', 'stage one', 'draft'], ['stage 2', 'stage two', 'review'], ['stage 3', 'stage three', 'improve']],
  r4_c2: [['event details', 'supplied details', 'provided details'], ['announcement', 'draft']],
  r4_c3: [['event name', 'name'], ['date', '15 october'], ['time', '10:00 am', '10 am'], ['venue', 'college auditorium'], ['registration', 'online registration']],
  r4_c4: [['review results', 'review output', 'review findings'], ['missing details', 'omissions', 'gaps'], ['unclear wording', 'clarity', 'unclear']],
  r4_c5: [['final announcement'], ['correct', 'complete', 'fix', 'improve'], ['do not invent', 'without inventing', 'only supplied details', 'no invented']],
};

const tokenAliases: Record<string, string[]> = {
  weekdays: ['weekday', 'weekdays', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  'exam dates': ['exam date', 'examination date', 'test date', 'assessment date'],
  'study schedule': ['study timetable', 'daily timetable', 'study plan', 'schedule'],
  'revision tips': ['revision tip', 'study tip', 'review strategy', 'revision strategy'],
  'soft light': ['soft lighting', 'diffused light', 'gentle sunlight'],
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function areScoringWeightsValid(weights: ScoringWeights): boolean {
  const values = [weights.promptQuality, weights.taskAchievement, weights.timeEfficiency, weights.attemptEfficiency];
  return values.every((value) => Number.isFinite(value) && value >= 0) && Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.001;
}

export function calculateTimeEfficiency(elapsedSeconds: number, timeLimitMinutes: number): number {
  const safeElapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const timeLimitSeconds = Math.max(1, timeLimitMinutes * 60);
  return clampScore(100 * (1 - safeElapsed / timeLimitSeconds));
}

export function calculateCompetitionScore(input: CompetitionScoreInput): CompetitionScoreResult {
  const weights = input.weights || DEFAULT_SCORING_WEIGHTS;
  if (!areScoringWeightsValid(weights)) throw new Error('Scoring weights must be non-negative and total 100%.');

  const promptQualityScore = clampScore(input.promptQualityScore);
  const taskAchievementScore = clampScore(input.taskAchievementScore);
  const timeEfficiencyScore = calculateTimeEfficiency(input.elapsedSeconds, input.timeLimitMinutes);
  const attemptsUsed = Math.max(1, Math.floor(input.attemptsUsed));
  const threshold = input.completionThreshold === undefined
    ? DEFAULT_COMPLETION_THRESHOLD
    : Math.max(1, clampScore(input.completionThreshold));
  const attemptEfficiencyScore = clampScore((100 / attemptsUsed) * Math.min(1, taskAchievementScore / threshold));

  const promptQualityPoints = roundToTwo(promptQualityScore * weights.promptQuality / 100);
  const taskAchievementPoints = roundToTwo(taskAchievementScore * weights.taskAchievement / 100);
  const timeEfficiencyPoints = roundToTwo(timeEfficiencyScore * weights.timeEfficiency / 100);
  const attemptEfficiencyPoints = roundToTwo(attemptEfficiencyScore * weights.attemptEfficiency / 100);

  const breakdown: ScoringBreakdown = {
    promptQualityScore: roundToTwo(promptQualityScore),
    taskAchievementScore: roundToTwo(taskAchievementScore),
    timeEfficiencyScore: roundToTwo(timeEfficiencyScore),
    attemptEfficiencyScore: roundToTwo(attemptEfficiencyScore),
    promptQualityPoints,
    taskAchievementPoints,
    timeEfficiencyPoints,
    attemptEfficiencyPoints,
    completionStatus: taskAchievementScore >= threshold ? 'COMPLETED' : 'PARTIALLY_COMPLETED',
  };

  return {
    score: roundToTwo(promptQualityPoints + taskAchievementPoints + timeEfficiencyPoints + attemptEfficiencyPoints),
    breakdown,
  };
}

function comparePerformance(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (a.qualificationStatus === 'DISQUALIFIED' && b.qualificationStatus !== 'DISQUALIFIED') return 1;
  if (b.qualificationStatus === 'DISQUALIFIED' && a.qualificationStatus !== 'DISQUALIFIED') return -1;
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if ((b.taskAchievementScore || 0) !== (a.taskAchievementScore || 0)) return (b.taskAchievementScore || 0) - (a.taskAchievementScore || 0);
  if ((b.promptQualityScore || 0) !== (a.promptQualityScore || 0)) return (b.promptQualityScore || 0) - (a.promptQualityScore || 0);
  if (a.totalAttempts !== b.totalAttempts) return a.totalAttempts - b.totalAttempts;
  return a.totalTimeSeconds - b.totalTimeSeconds;
}

export function rankLeaderboardEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const ranked = [...entries].sort(comparePerformance);
  let rank = 0;

  ranked.forEach((entry, index) => {
    if (index === 0 || comparePerformance(ranked[index - 1], entry) !== 0) rank = index + 1;
    entry.rank = rank;
    entry.isTopThree = rank <= 3 && entry.qualificationStatus !== 'DISQUALIFIED' && entry.totalScore > 0;
  });

  return ranked;
}

export function createInFlightSubmissionLock() {
  const lockedKeys = new Set<string>();
  return {
    acquire(key: string): boolean {
      if (lockedKeys.has(key)) return false;
      lockedKeys.add(key);
      return true;
    },
    release(key: string): void {
      lockedKeys.delete(key);
    },
  };
}

function hasSignal(text: string, alternatives: string[]): boolean {
  const normalized = text.toLowerCase().replace(/[^a-z0-9: ]/g, ' ').replace(/\s+/g, ' ').trim();
  return alternatives.some((alternative) => {
    const normalizedAlternative = alternative.toLowerCase().replace(/[^a-z0-9: ]/g, ' ').replace(/\s+/g, ' ').trim();
    const synonyms = tokenAliases[normalizedAlternative] || [normalizedAlternative];
    return synonyms.some((synonym) => normalized.includes(synonym));
  });
}

function criterionEvidence(text: string, challenge: Challenge, criterionId: string): number {
  if (challenge.roundId === 'round_2' && criterionId === 'r2_c1') {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    return wordCount <= (challenge.maxTokensOrChars ?? 50) ? 1 : 0;
  }
  const groups = requirementSignals[criterionId];
  if (!groups?.length) {
    const criterion = challenge.rubric.find((item) => item.id === criterionId);
    const words = criterion?.description.toLowerCase().match(/[a-z]{4,}/g) || [];
    const usefulWords = [...new Set(words)].filter((word) => !['must', 'with', 'from', 'that', 'this', 'where', 'each'].includes(word));
    if (!usefulWords.length) return 0;
    const normalized = text.toLowerCase();
    return usefulWords.filter((word) => normalized.includes(word)).length / usefulWords.length;
  }
  return groups.filter((group) => hasSignal(text, group)).length / groups.length;
}

function qualityHeuristic(text: string, challenge: Challenge): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const distinctWords = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ''))).size;
  const imperativeGroups = [
    ['create', 'write', 'describe', 'generate', 'make', 'produce', 'identify', 'check', 'review', 'use', 'include'],
    ['and', 'then', 'while', 'using', 'based on', 'from the', 'without'],
    ['step 1', 'step 2', 'step 3', 'stage 1', 'stage 2', 'stage 3', 'question 1', 'question 2'],
  ];
  const clarity = imperativeGroups.filter((group) => hasSignal(lower, group)).length / imperativeGroups.length;
  const structure = Math.min(1, (/[.!?;:\n]/.test(trimmed) ? 0.35 : 0) + (/:|\n|\d[.)]/.test(trimmed) ? 0.35 : 0) + (distinctWords / Math.max(1, words.length)) * 0.3);
  const contextWords: string[] = `${challenge.detailedTask} ${challenge.inputConstraints.join(' ')} ${challenge.targetScenario}`.toLowerCase().match(/[a-z]{4,}/g) || [];
  const relevantTokens = new Set(contextWords).size;
  const promptTokens = [...new Set(words.map((word) => word.toLowerCase().replace(/[^a-z]/g, '')).filter((word) => word.length >= 4))];
  const relevance = promptTokens.length ? promptTokens.filter((word) => contextWords.includes(word)).length / promptTokens.length : 0;
  const targetWords = challenge.roundId === 'round_2' ? 35 : challenge.roundId === 'round_1' ? 70 : 120;
  const lengthEfficiency = Math.min(1, words.length / Math.max(1, targetWords)) * Math.min(1, targetWords / Math.max(1, words.length));
  const contextFactor = relevantTokens ? relevance : 0.5;
  return clampScore((clarity * 0.3 + structure * 0.25 + contextFactor * 0.3 + lengthEfficiency * 0.15) * 100);
}

function weightedCategoryScore(challenge: Challenge, values: Map<string, number>, category: 'prompt_quality' | 'task_achievement'): number {
  const criteria = challenge.rubric.filter((criterion) => criterion.category === category);
  if (!criteria.length) return 0;
  const weights = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return weights ? criteria.reduce((sum, criterion) => sum + (values.get(criterion.id) || 0) * criterion.weight, 0) / weights : 0;
}

export function evaluateSubmissionFallback(challenge: Challenge, promptSubmission: string): SubmissionQualityResult {
  const evidenceById = new Map<string, number>();
  const criterionScores = challenge.rubric.map((criterion) => {
    const evidence = clampScore(criterionEvidence(promptSubmission, challenge, criterion.id) * 100);
    evidenceById.set(criterion.id, evidence);
    const score = roundToTwo(criterion.weight * evidence / 100);
    return {
      criterion: criterion.criterion,
      score,
      maxScore: criterion.weight,
      comment: evidence >= 99.99
        ? 'The requirement is represented clearly.'
        : evidence > 0
          ? `Partially demonstrated (${roundToTwo(evidence)}% of evidence groups found).`
          : 'Add relevant details or clarify how this requirement is met.',
    };
  });

  const categoryMap = new Map(challenge.rubric.map((criterion) => [criterion.id, evidenceById.get(criterion.id) || 0]));
  let taskAchievementScore = weightedCategoryScore(challenge, categoryMap, 'task_achievement');
  if (!challenge.rubric.some((criterion) => criterion.category === 'task_achievement')) {
    taskAchievementScore = challenge.rubric.length ? [...evidenceById.values()].reduce((sum, value) => sum + value, 0) / challenge.rubric.length : 0;
  }
  const promptQualityScore = qualityHeuristic(promptSubmission, challenge);
  const count = promptSubmission.trim().split(/\s+/).filter(Boolean).length;
  const limit = challenge.roundId === 'round_2' ? challenge.maxTokensOrChars ?? 50 : null;
  const missing = criterionScores.filter((item) => item.score < item.maxScore * 0.6).map((item) => item.criterion);
  const feedback = [
    `Prompt quality: ${roundToTwo(promptQualityScore)}/100; task achievement: ${roundToTwo(taskAchievementScore)}/100.`,
    limit ? `Word limit: ${count}/${limit}.` : '',
    missing.length ? `Review these areas: ${missing.slice(0, 4).join(', ')}.` : 'The required challenge elements are represented well.',
  ].filter(Boolean).join(' ');

  return {
    promptQualityScore: roundToTwo(promptQualityScore),
    taskAchievementScore: roundToTwo(taskAchievementScore),
    criterionScores,
    feedback,
  };
}
