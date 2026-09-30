export interface ResultEditValidation {
  score: number;
  reason: string;
}

export interface ResultEditAuditDetails {
  adminIdentifier: string;
  adminUsername: string;
  participantIdentifier: string;
  roundId: string;
  submissionId: string;
  oldValue: number | null;
  newValue: number;
  reason: string;
}

export function canEditResults(role: unknown): boolean {
  return role === 'admin';
}

export function validateResultEdit(score: unknown, maxScore: number, reason: unknown): ResultEditValidation | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > maxScore) return null;
  if (!Number.isFinite(maxScore) || maxScore < 0) return null;
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) return null;
  const roundedScore = Math.round((score + Number.EPSILON) * 100) / 100;
  if (roundedScore > maxScore) return null;
  return { score: roundedScore, reason: reason.trim() };
}

export function highestSubmissionScore(submissions: Array<{ score: number | null }>): number {
  return submissions.reduce((highest, submission) => Math.max(highest, submission.score ?? 0), 0);
}

export function resultEditAuditDetails(input: ResultEditAuditDetails): ResultEditAuditDetails {
  return { ...input };
}
