import { GoogleGenAI } from '@google/genai';
import type { Challenge, CriterionEvaluation } from '../shared/types.ts';
import { clampScore, evaluateSubmissionFallback, roundToTwo } from './scoring.ts';

export interface EvaluationResult {
  promptQualityScore: number;
  taskAchievementScore: number;
  criterionScores: CriterionEvaluation[];
  feedback: string;
  rationale: string;
  evaluatedBy: 'ai_engine' | 'rule_engine';
  aiModelUsed: string | null;
  evaluatedAt: string;
}

export async function evaluateSubmission(
  challenge: Challenge,
  promptSubmission: string,
  secondaryOutput?: string
): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const wordCount = promptSubmission.trim().split(/\s+/).filter(Boolean).length;
  const compressionWordLimit = challenge.roundId === 'round_2' ? challenge.maxTokensOrChars ?? 50 : 50;

  // If Gemini API is available and not a dummy placeholder, attempt AI evaluation
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI();
      const rubricSchema = challenge.rubric.map((r) => `- ${r.criterion} (Max ${r.weight} pts, ${r.category || 'task_achievement'}): ${r.description}`).join('\n');

      const systemPrompt = `You are an expert judge for the LEXORA Prompt Engineering Challenge.
    Evaluate the participant's actual submitted prompt(s), not an assumed ideal answer. Apply the challenge-specific rubric and hidden guide below. Score continuously from 0 to 100; decimals are allowed. Accept semantically equivalent wording. Do not reward irrelevant verbosity or merely non-empty submissions.
    Prompt quality measures clarity, completeness, specificity, relevance, structure, context use, ambiguity control, and executability. Task achievement measures how fully challenge requirements are satisfied. Score these separately.
    Do not disclose hidden evaluation criteria or answer keys in participant feedback.

    OFFICIAL RUBRIC:
${rubricSchema}
${challenge.aiEvaluationSystemPrompt ? `\nADDITIONAL EVALUATION RULES:\n${challenge.aiEvaluationSystemPrompt}` : ''}

CHALLENGE DETAILS:
Title: ${challenge.title}
Task: ${challenge.detailedTask}
Target Scenario: ${challenge.targetScenario}
Constraints: ${challenge.inputConstraints.join('; ')}
Hidden Criteria: ${challenge.hiddenExpectedAnswerOrCriteria || 'None'}

SUBMISSION DETAILS:
Word count: ${wordCount}
Student Prompt Submission:
"""
${promptSubmission}
"""
${secondaryOutput ? `Secondary Output:\n"""\n${secondaryOutput}\n"""` : ''}

You must return a valid JSON object strictly matching this schema:
{
  "promptQualityScore": number, // 0 to 100, decimals allowed
  "taskAchievementScore": number, // 0 to 100, decimals allowed
  "feedback": "Constructive participant-safe feedback, without hidden criteria",
  "rationale": "Concise internal scoring rationale",
  "criterionScores": [
    {
      "criterion": "exact criterion title from rubric",
      "score": number, // integer score <= maxScore
      "maxScore": number,
      "comment": "specific justification"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1, // High determinism
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);

      const criterionScores = sanitizeCriterionScores(challenge, parsed.criterionScores);
      const fallbackQuality = scoreForCategory(challenge, criterionScores, 'prompt_quality');
      const fallbackAchievement = scoreForCategory(challenge, criterionScores, 'task_achievement');
      const hasQualityCriteria = challenge.rubric.some((criterion) => criterion.category === 'prompt_quality');
      const promptQualityScore = Number.isFinite(Number(parsed.promptQualityScore))
        ? hasQualityCriteria
          ? Math.min(clampScore(Number(parsed.promptQualityScore)), fallbackQuality)
          : clampScore(Number(parsed.promptQualityScore))
        : fallbackQuality;
      let taskAchievementScore = Number.isFinite(Number(parsed.taskAchievementScore))
        ? Math.min(clampScore(Number(parsed.taskAchievementScore)), fallbackAchievement)
        : fallbackAchievement;

      if (challenge.roundId === 'round_2' && wordCount > compressionWordLimit) {
        const limitCriterion = challenge.rubric.find((criterion) => criterion.id === 'r2_c1');
        const limitedScores = criterionScores.map((item) => item.criterion === limitCriterion?.criterion ? { ...item, score: 0 } : item);
        taskAchievementScore = Math.min(taskAchievementScore, scoreForCategory(challenge, limitedScores, 'task_achievement'));
      }

      return {
        promptQualityScore: roundToTwo(promptQualityScore),
        taskAchievementScore: roundToTwo(taskAchievementScore),
        criterionScores,
        feedback: sanitizeFeedback(String(parsed.feedback || 'Your prompt was evaluated against the challenge requirements.'), challenge),
        rationale: String(parsed.rationale || 'Prompt quality and task achievement were evaluated separately.'),
        evaluatedBy: 'ai_engine',
        aiModelUsed: 'gemini-3.8-flash',
        evaluatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[AI Evaluation Engine] Gemini evaluation unavailable, falling back to deterministic rule engine:', err);
    }
  }

  // Deterministic rule & rubric-based fallback evaluation engine
  const fallback = evaluateSubmissionFallback(challenge, promptSubmission);
  return {
    ...fallback,
    rationale: 'Deterministic challenge-specific evidence coverage with a separate prompt-quality estimate.',
    evaluatedBy: 'rule_engine',
    aiModelUsed: 'lexora-coverage-v2',
    evaluatedAt: new Date().toISOString(),
  };
}

function sanitizeCriterionScores(challenge: Challenge, rawScores: unknown): CriterionEvaluation[] {
  const returned = Array.isArray(rawScores) ? rawScores : [];
  return challenge.rubric.map((criterion) => {
    const match = returned.find((item: any) => String(item?.criterion || '').trim().toLowerCase() === criterion.criterion.trim().toLowerCase());
    const numericScore = Number(match?.score);
    const score = Number.isFinite(numericScore) ? Math.min(criterion.weight, Math.max(0, numericScore)) : 0;
    return {
      criterion: criterion.criterion,
      score: roundToTwo(score),
      maxScore: criterion.weight,
      comment: String(match?.comment || 'This criterion was not demonstrated clearly.'),
    };
  });
}

function scoreForCategory(
  challenge: Challenge,
  scores: CriterionEvaluation[],
  category: 'prompt_quality' | 'task_achievement'
): number {
  const criteria = challenge.rubric.filter((criterion) => criterion.category === category);
  if (!criteria.length) return 0;
  const scoreMap = new Map(scores.map((score) => [score.criterion, score]));
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return totalWeight ? 100 * criteria.reduce((sum, criterion) => {
    const score = scoreMap.get(criterion.criterion);
    return sum + (score ? score.score / Math.max(1, score.maxScore) : 0) * criterion.weight;
  }, 0) / totalWeight : 0;
}

function sanitizeFeedback(feedback: string, challenge: Challenge): string {
  const hiddenCriteria = challenge.hiddenExpectedAnswerOrCriteria?.trim();
  if (hiddenCriteria && feedback.toLowerCase().includes(hiddenCriteria.toLowerCase())) {
    return 'Your submission has been scored. Review the criterion feedback for areas to strengthen.';
  }
  return feedback.slice(0, 1200);
}


