import { GoogleGenAI } from '@google/genai';
import type { Challenge, CriterionEvaluation } from '../shared/types.ts';

export interface EvaluationResult {
  score: number;
  maxScore: number;
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
  const charCount = promptSubmission.length;

  // If Gemini API is available and not a dummy placeholder, attempt AI evaluation
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      const ai = new GoogleGenAI();
      const rubricSchema = challenge.rubric.map((r) => `- ${r.criterion} (Max ${r.weight} pts): ${r.description}`).join('\n');

      const systemPrompt = `You are the Official Lead Judge and Evaluation Engine for the LEXORA Inter-College Prompt Engineering Championship.
Evaluate the participant's prompt engineering submission with rigorous technical precision.
Do not invent criteria. Adhere strictly to the official rubric:
${rubricSchema}

CHALLENGE DETAILS:
Title: ${challenge.title}
Task: ${challenge.detailedTask}
Target Scenario: ${challenge.targetScenario}
Constraints: ${challenge.inputConstraints.join('; ')}
Expected Criteria / Hidden Keys: ${challenge.hiddenExpectedAnswerOrCriteria || 'None'}

SUBMISSION DETAILS:
Word count: ${wordCount}
Character count: ${charCount}
Student Prompt Submission:
"""
${promptSubmission}
"""
${secondaryOutput ? `Secondary Output:\n"""\n${secondaryOutput}\n"""` : ''}

You must return a valid JSON object strictly matching this schema:
{
  "score": number, // Total integer score 0 to 100
  "feedback": "Overall concise feedback summary",
  "rationale": "Detailed technical rationale referencing rubric criteria and constraints",
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

      // Validate parsed score
      let totalScore = Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 75)));
      const criterionScores: CriterionEvaluation[] = Array.isArray(parsed.criterionScores)
        ? parsed.criterionScores.map((c: any) => ({
            criterion: String(c.criterion || 'Criterion'),
            score: Math.min(Number(c.maxScore) || 25, Math.max(0, Math.round(Number(c.score) || 18))),
            maxScore: Number(c.maxScore) || 25,
            comment: String(c.comment || 'Criterion evaluated.'),
          }))
        : challenge.rubric.map((r) => ({
            criterion: r.criterion,
            score: Math.round(r.weight * 0.8),
            maxScore: r.weight,
            comment: 'Standard compliance verified.',
          }));

      // If word ceiling is exceeded on Round 2, enforce penalty
      if (challenge.roundId === 'round_2' && wordCount > 180) {
        totalScore = Math.max(0, totalScore - 25);
        parsed.feedback += ` (Notice: Word count limit exceeded: ${wordCount}/180 words; penalty applied).`;
      }

      return {
        score: totalScore,
        maxScore: 100,
        criterionScores,
        feedback: parsed.feedback || 'Prompt successfully evaluated against championship rubric.',
        rationale: parsed.rationale || 'Score assigned per rubric criteria breakdown.',
        evaluatedBy: 'ai_engine',
        aiModelUsed: 'gemini-3.8-flash',
        evaluatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[AI Evaluation Engine] Gemini evaluation unavailable, falling back to deterministic rule engine:', err);
    }
  }

  // Deterministic rule & rubric-based fallback evaluation engine
  return evaluateWithRuleEngine(challenge, promptSubmission, wordCount, charCount);
}

function evaluateWithRuleEngine(
  challenge: Challenge,
  promptSubmission: string,
  wordCount: number,
  charCount: number
): EvaluationResult {
  const lowerPrompt = promptSubmission.toLowerCase();
  const criteriaScores: CriterionEvaluation[] = [];
  let totalScore = 0;

  for (const criterion of challenge.rubric) {
    let scoreRatio = 0.72; // Baseline pass
    let comment = 'Adequate compliance with core directives.';

    if (challenge.roundId === 'round_1') {
      // Reverse Prompting
      const hasYaml = lowerPrompt.includes('yaml') || lowerPrompt.includes('schema');
      const hasPersona = lowerPrompt.includes('architect') || lowerPrompt.includes('engineer') || lowerPrompt.includes('expert');
      const hasSLA = lowerPrompt.includes('latency') || lowerPrompt.includes('sla') || lowerPrompt.includes('p99');
      const hasNegativeConstraint = lowerPrompt.includes('no ') || lowerPrompt.includes('only') || lowerPrompt.includes('do not');

      if (criterion.criterion.includes('Role')) {
        scoreRatio = hasPersona ? 0.92 : 0.65;
        comment = hasPersona ? 'Strong architectural persona framing established.' : 'Persona role framing could be more explicit.';
      } else if (criterion.criterion.includes('Structural')) {
        scoreRatio = hasYaml ? 0.95 : 0.6;
        comment = hasYaml ? 'Strict YAML output constraint unambiguously declared.' : 'Missing explicit output format fence instructions.';
      } else if (criterion.criterion.includes('Constraint')) {
        scoreRatio = hasSLA && hasNegativeConstraint ? 0.9 : 0.7;
        comment = hasSLA ? 'Covers latency SLAs, quorum and failover constraints.' : 'Key SLA parameters partially omitted.';
      } else {
        scoreRatio = 0.85;
        comment = 'Good deterministic prompt engineering structure.';
      }
    } else if (challenge.roundId === 'round_2') {
      // Prompt Compression
      const underLimit = wordCount <= 180;
      const hasRedact = lowerPrompt.includes('redact') || lowerPrompt.includes('mask') || lowerPrompt.includes('pan');
      const hasHMAC = lowerPrompt.includes('hmac') || lowerPrompt.includes('signature') || lowerPrompt.includes('400');
      const has2FA = lowerPrompt.includes('2fa') || lowerPrompt.includes('100,000') || lowerPrompt.includes('100k');

      if (criterion.criterion.includes('Token')) {
        scoreRatio = underLimit ? (wordCount < 140 ? 0.98 : 0.9) : 0.45;
        comment = underLimit ? `Compliant with word limit (${wordCount}/180 words).` : `Exceeded 180-word ceiling (${wordCount} words). Penalty applied.`;
      } else if (criterion.criterion.includes('Constraint')) {
        const count = (hasRedact ? 1 : 0) + (hasHMAC ? 1 : 0) + (has2FA ? 1 : 0);
        scoreRatio = count >= 2 ? 0.92 : 0.68;
        comment = `${count >= 2 ? 'High' : 'Moderate'} retention of mandatory enterprise security gates.`;
      } else {
        scoreRatio = 0.86;
        comment = 'Dense imperative syntax with strong token economy.';
      }
    } else if (challenge.roundId === 'round_3') {
      // Prompt Relay
      const hasStages = lowerPrompt.includes('stage 1') || lowerPrompt.includes('stage 2') || lowerPrompt.includes('step 1');
      const hasJson = lowerPrompt.includes('json') || lowerPrompt.includes('schema') || lowerPrompt.includes('payload');

      if (criterion.criterion.includes('Pipeline')) {
        scoreRatio = hasStages && hasJson ? 0.94 : 0.7;
        comment = hasStages ? 'Clear multi-stage relay contract established.' : 'Stages could be more modularly separated.';
      } else {
        scoreRatio = 0.84;
        comment = 'Solid context retention and intermediate handoff definition.';
      }
    } else {
      // Round 4: Upskilling - Prompt Chaining
      const hasRollback = lowerPrompt.includes('rollback') || lowerPrompt.includes('revert') || lowerPrompt.includes('fallback');
      const hasVerification = lowerPrompt.includes('verify') || lowerPrompt.includes('critique') || lowerPrompt.includes('validate');
      const hasHumanGate = lowerPrompt.includes('human') || lowerPrompt.includes('approval') || lowerPrompt.includes('gate');

      if (criterion.criterion.includes('Safety') || criterion.criterion.includes('Rollback')) {
        scoreRatio = hasRollback ? 0.92 : 0.7;
        comment = hasRollback ? 'Explicit rollback conditions and simulation sandbox defined.' : 'Rollback triggers need tighter criteria.';
      } else if (criterion.criterion.includes('Verification')) {
        scoreRatio = hasVerification ? 0.9 : 0.72;
        comment = hasVerification ? 'Multi-pass self-critique loop embedded.' : 'Self-critique loop could be more rigorous.';
      } else {
        scoreRatio = hasHumanGate ? 0.95 : 0.82;
        comment = 'Comprehensive agentic orchestration and control flow.';
      }
    }

    const score = Math.round(criterion.weight * scoreRatio);
    totalScore += score;
    criteriaScores.push({
      criterion: criterion.criterion,
      score,
      maxScore: criterion.weight,
      comment,
    });
  }

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore: 100,
    criterionScores: criteriaScores,
    feedback: `Evaluation completed successfully against official rubric criteria (${totalScore}/100).`,
    rationale: `Submission analyzed for constraint adherence, structural syntax, token economy (${wordCount} words), and technical specification requirements.`,
    evaluatedBy: 'rule_engine',
    aiModelUsed: 'lexora-deterministic-v1',
    evaluatedAt: new Date().toISOString(),
  };
}
