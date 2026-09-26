/**
 * LEXORA - Inter-College Prompt Engineering Championship
 * Shared Data Types and Interface Contracts
 */

export type UserRole = 'student' | 'admin' | 'system';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  collegeName: string;
  department: string;
  academicYear: string; // e.g., '1st Year', '2nd Year', '3rd Year', 'Final Year'
  phoneNumber: string;
  registrationNumber: string;
  eligibilityStatus: 'eligible' | 'under_review' | 'disqualified';
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  userId: string;
  fullName: string;
  departmentOrOffice: string;
  permissions: string[];
  createdAt: string;
}

export type RoundStatus = 'LOCKED' | 'UPCOMING' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CLOSED';

export type TimingMode = 'individual' | 'fixed_window';

export type EvaluationMethod = 'rule_based' | 'rubric_based' | 'ai_assisted';

export interface RubricCriterion {
  id: string;
  criterion: string;
  weight: number; // e.g. 25 points
  description: string;
}

export interface Challenge {
  id: string;
  roundId: string;
  title: string;
  promptType: 'text_response' | 'prompt_submission' | 'prompt_and_output' | 'multi_step_workflow';
  taskOverview: string;
  detailedTask: string;
  targetScenario: string;
  inputConstraints: string[];
  maxTokensOrChars: number | null;
  rubric: RubricCriterion[];
  sampleInput?: string;
  expectedOutputFormat?: string;
  hiddenExpectedAnswerOrCriteria?: string; // Admin-only
  aiEvaluationSystemPrompt?: string; // Admin-only
}

export interface Round {
  id: string;
  roundNumber: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  description: string;
  instructions: string;
  status: RoundStatus;
  durationMinutes: number;
  maxAttempts: number;
  timingMode: TimingMode;
  evaluationMethod: EvaluationMethod;
  maxScore: number;
  qualificationRules: string;
  startTimestamp: string | null;
  endTimestamp: string | null;
  isResultsPublished: boolean;
  resultsPublishedAt: string | null;
  strictTabSwitchDisqualification: boolean;
  maxTabSwitchWarnings: number;
}

export type ParticipantRoundStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EVALUATED'
  | 'DISQUALIFIED'
  | 'TIMED_OUT';

export interface RoundParticipant {
  id: string;
  roundId: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  department: string;
  startedAt: string | null;
  expiresAt: string | null;
  status: ParticipantRoundStatus;
  attemptsCount: number;
  remainingAttempts: number;
  highestScore: number | null;
  finalScore: number | null;
  timeTakenSeconds: number | null;
  isDisqualified: boolean;
  disqualificationReason: string | null;
  disqualifiedAt: string | null;
  tabSwitchCount: number;
}

export interface Attempt {
  id: string;
  roundId: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  isSubmitted: boolean;
}

export interface CriterionEvaluation {
  criterion: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface Submission {
  id: string;
  roundId: string;
  roundTitle: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  department: string;
  academicYear: string;
  attemptNumber: number;
  promptSubmission: string;
  secondaryOutput?: string;
  submittedAt: string;
  timeTakenSeconds: number;
  status: 'PENDING_EVALUATION' | 'EVALUATED' | 'REJECTED';
  score: number | null;
  maxScore: number;
  feedback: string | null;
  criterionScores: CriterionEvaluation[];
  evaluationMethodUsed: EvaluationMethod;
  evaluatedBy: 'ai_engine' | 'admin' | 'rule_engine';
  evaluatedAt: string | null;
  adminOverrideNotes?: string | null;
}

export type ProctoringEventType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'DEVTOOLS_OPEN'
  | 'PAGE_RELOAD';

export interface ProctoringEvent {
  id: string;
  roundId: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  eventType: ProctoringEventType;
  timestamp: string;
  eventDetails: string;
  warningNumber: number;
  actionTaken: 'WARNING' | 'FLAGGED_FOR_REVIEW' | 'AUTO_DISQUALIFIED';
  isResolvedByAdmin: boolean;
}

export interface RoundResult {
  id: string;
  roundId: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  department: string;
  academicYear: string;
  finalScore: number;
  attemptsUsed: number;
  timeTakenSeconds: number;
  qualificationStatus: 'QUALIFIED' | 'DISQUALIFIED' | 'PARTICIPATED';
  officialRank: number | null;
  isPublished: boolean;
  publishedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  collegeName: string;
  department: string;
  academicYear: string;
  totalScore: number;
  round1Score: number | null;
  round2Score: number | null;
  round3Score: number | null;
  round4Score: number | null;
  roundsCompleted: number;
  totalTimeSeconds: number;
  totalAttempts: number;
  qualificationStatus: 'QUALIFIED' | 'DISQUALIFIED' | 'IN_CONTENTION';
  isTopThree: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  roundId?: string | null;
  author: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'ROUND_ACTIVE'
    | 'SUBMISSION_ACCEPTED'
    | 'ATTEMPT_LEFT'
    | 'TIME_EXPIRED'
    | 'EVALUATED'
    | 'DISQUALIFIED'
    | 'RESULTS_PUBLISHED';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    studentProfile?: StudentProfile;
    adminProfile?: AdminProfile;
  };
}

export interface AdminStats {
  totalRegisteredStudents: number;
  activeParticipants: number;
  activeRoundTitle: string | null;
  activeRoundId: string | null;
  totalSubmissions: number;
  completedRoundsCount: number;
  pendingEvaluationsCount: number;
  disqualifiedParticipantsCount: number;
  publishedResultsCount: number;
}
