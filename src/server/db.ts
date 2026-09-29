import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import type {
  User,
  StudentProfile,
  AdminProfile,
  Round,
  Challenge,
  RoundParticipant,
  Attempt,
  Submission,
  ProctoringEvent,
  RoundResult,
  LeaderboardEntry,
  Announcement,
  AppNotification,
  AuditLog,
  AdminStats,
} from '../shared/types.ts';
import { DEFAULT_COMPLETION_THRESHOLD, DEFAULT_SCORING_WEIGHTS } from './scoring.ts';
import { rankLeaderboardEntries, roundToTwo } from './scoring.ts';

// Password hashing utility using PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

interface DatabaseSchema {
  users: User[];
  studentProfiles: StudentProfile[];
  adminProfiles: AdminProfile[];
  rounds: Round[];
  challenges: Challenge[];
  roundParticipants: RoundParticipant[];
  attempts: Attempt[];
  submissions: Submission[];
  proctoringEvents: ProctoringEvent[];
  roundResults: RoundResult[];
  announcements: Announcement[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'lexora_db.json');

function getInitialData(): DatabaseSchema {
  const adminId = 'usr_admin_01';
  const adminUser: User = {
    id: adminId,
    email: 'admin@lexora.edu',
    username: 'admin',
    role: 'admin',
    passwordHash: hashPassword(process.env.ADMIN_INITIAL_PASSWORD || 'Secure_Password_123!'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adminProfile: AdminProfile = {
    id: 'adm_prof_01',
    userId: adminId,
    fullName: 'Dr. Evelyn Vance',
    departmentOrOffice: 'Chair, Inter-College Technical Board',
    permissions: ['ALL'],
    createdAt: new Date().toISOString(),
  };

  // Sample student demo removed per Issue 3

  // Seed 4 official rounds
  const rounds: Round[] = [
    {
      id: 'round_1',
      roundNumber: 1,
      title: 'Reverse Prompting',
      subtitle: 'Describe What You See',
      description: 'Study two reference images and write prompts that describe their visual details.',
      instructions: 'For each reference image, write a prompt that could generate a similar image. Describe its subject, lighting, colours, background, composition, visual details, and style.',
      status: 'LOCKED', // Default per specification: initially locked until admin starts it
      durationMinutes: 30,
      maxAttempts: 2,
      timingMode: 'individual',
      evaluationMethod: 'ai_assisted',
      maxScore: 100,
      qualificationRules: 'Top 70% of scoring participants qualify for Round 2. Minimum score: 60/100.',
      startTimestamp: null,
      endTimestamp: null,
      isResultsPublished: false,
      resultsPublishedAt: null,
      strictTabSwitchDisqualification: true,
      maxTabSwitchWarnings: 2,
    },
    {
      id: 'round_2',
      roundNumber: 2,
      title: 'Prompt Compression',
      subtitle: 'Shorten the Prompt, Keep the Meaning',
      description: 'Shorten a simple instruction while preserving every important requirement.',
      instructions: 'Read the passage and write a clear, shorter prompt of no more than 50 words. Keep all essential instructions and request the final timetable as a simple table.',
      status: 'LOCKED',
      durationMinutes: 25,
      maxAttempts: 2,
      timingMode: 'individual',
      evaluationMethod: 'ai_assisted',
      maxScore: 100,
      qualificationRules: 'Top 50% of participants qualify for Round 3. Strict token ceiling enforced.',
      startTimestamp: null,
      endTimestamp: null,
      isResultsPublished: false,
      resultsPublishedAt: null,
      strictTabSwitchDisqualification: true,
      maxTabSwitchWarnings: 2,
    },
    {
      id: 'round_3',
      roundNumber: 3,
      title: 'Prompt Relay',
      subtitle: 'Three-Step Study Planner',
      description: 'Create three connected prompts where each step uses the previous step’s output.',
      instructions: 'Write a prompt for each step: identify a student’s subjects and exam dates, create a daily study timetable from that information, then use the timetable to suggest three practical revision tips.',
      status: 'LOCKED',
      durationMinutes: 35,
      maxAttempts: 2,
      timingMode: 'individual',
      evaluationMethod: 'ai_assisted',
      maxScore: 100,
      qualificationRules: 'Top 15 finalists qualify for the Championship Round 4.',
      startTimestamp: null,
      endTimestamp: null,
      isResultsPublished: false,
      resultsPublishedAt: null,
      strictTabSwitchDisqualification: true,
      maxTabSwitchWarnings: 2,
    },
    {
      id: 'round_4',
      roundNumber: 4,
      title: 'Prompt Chaining',
      subtitle: 'Create a College Event Announcement',
      description: 'Build a three-stage workflow to draft, review, and improve a college event announcement.',
      instructions: 'Create connected prompts to draft an announcement from supplied event details, check it for required information, then use the review to correct gaps and unclear wording.',
      status: 'LOCKED',
      durationMinutes: 40,
      maxAttempts: 2,
      timingMode: 'individual',
      evaluationMethod: 'ai_assisted',
      maxScore: 100,
      qualificationRules: 'Top 3 podium winners determined by cumulative championship score.',
      startTimestamp: null,
      endTimestamp: null,
      isResultsPublished: false,
      resultsPublishedAt: null,
      strictTabSwitchDisqualification: true,
      maxTabSwitchWarnings: 2,
    },
  ];

  rounds.forEach((round) => {
    round.scoringWeights = { ...DEFAULT_SCORING_WEIGHTS };
    round.completionThreshold = DEFAULT_COMPLETION_THRESHOLD;
    round.leaderboardEligible = true;
    round.scoringConfigUpdatedAt = null;
  });

  // Configurable Challenge templates for each round
  const challenges: Challenge[] = [
    {
      id: 'ch_r1',
      roundId: 'round_1',
      title: 'Recreate the Reference Images',
      promptType: 'prompt_submission',
      taskOverview: 'Study each reference image and describe it in a prompt that could generate a similar image.',
      detailedTask: 'Write one prompt for each image. Be specific about the visible subject, lighting, dominant and supporting colours, background, composition, visual details, and style. Use relevant details only; exact wording is not required.',
      targetScenario: '',
      inputConstraints: [
        'Submit a separate prompt for each reference image.',
        'Describe the image accurately; equivalent wording is accepted.',
        'Include useful visual details without adding unrelated filler.',
      ],
      maxTokensOrChars: 1200,
      rubric: [
        { id: 'r1_c1', criterion: 'Lighting', weight: 10, category: 'task_achievement', description: 'Accurately captures the light source, softness, brightness, shadows, and highlights where visible.' },
        { id: 'r1_c2', criterion: 'Colour Pattern', weight: 10, category: 'task_achievement', description: 'Identifies dominant and secondary colours and their warm or cool relationships.' },
        { id: 'r1_c3', criterion: 'Subject Identification', weight: 10, category: 'task_achievement', description: 'Names the main subject or scene correctly.' },
        { id: 'r1_c4', criterion: 'Background', weight: 10, category: 'task_achievement', description: 'Describes relevant background objects, colour, texture, and setting.' },
        { id: 'r1_c5', criterion: 'Composition', weight: 10, category: 'task_achievement', description: 'Captures subject placement, framing, perspective, or camera angle.' },
        { id: 'r1_c6', criterion: 'Visual Details', weight: 10, category: 'task_achievement', description: 'Includes distinctive shapes, textures, objects, and small visible details.' },
        { id: 'r1_c7', criterion: 'Style', weight: 10, category: 'task_achievement', description: 'Recognizes the image style, such as realistic, illustrated, cinematic, or minimal.' },
        { id: 'r1_c8', criterion: 'Clarity and Completeness', weight: 10, category: 'prompt_quality', description: 'Gives clear, complete instructions for generating the described image.' },
        { id: 'r1_c9', criterion: 'Specificity and Relationships', weight: 10, category: 'prompt_quality', description: 'Uses specific visual details and accurately describes spatial relationships.' },
        { id: 'r1_c10', criterion: 'Structure and Relevance', weight: 10, category: 'prompt_quality', description: 'Organizes relevant details logically and avoids ambiguity or unrelated filler.' },
      ],
      referenceImages: [
        { title: 'Recreate the Reference Image — Question 1', src: '/reference-images/reverse-prompting-1.svg', alt: 'Reference image for question 1.' },
        { title: 'Recreate the Reference Image — Question 2', src: '/reference-images/reverse-prompting-2.svg', alt: 'Reference image for question 2.' },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Evaluate both labeled answers for semantic visual accuracy; do not require exact wording and do not reward irrelevant length. Image 1: hand-painted editorial still life in a wide landscape composition; a white ceramic bowl holding three yellow lemons sits slightly right of center on a warm honey-brown wooden table; one loose lemon and a leafy green branch sit to the left; muted sage-green wall; soft natural morning light enters from upper left and casts gentle shadows to the right; visible brush texture and calm minimal composition. Image 2: cozy illustrated night-time study desk; an amber glowing brass desk lamp on the left illuminates an open cream book at center; a small leafy plant on the right; deep navy window and cool blue night outside; warm/cool colour contrast, angled tabletop perspective, soft pools of light and shadows, clean storybook illustration. Award credit for semantically equivalent descriptions across both answers.',
      aiEvaluationSystemPrompt:
        'Score the two separate image descriptions together. Compare each answer semantically to its matching hidden image specification and explain visual details included or missed. Do not demand exact wording or reward irrelevant length.',
    },
    {
      id: 'ch_r2',
      roundId: 'round_2',
      title: 'Shorten the Prompt, Keep the Meaning',
      promptType: 'prompt_submission',
      taskOverview: 'Write a short, clear prompt that keeps every important instruction from the passage.',
      detailedTask: 'Read the passage, then write a compressed prompt of no more than 50 words. Preserve the essential requirements, use understandable wording, and do not add unrelated instructions.',
      targetScenario: 'You are helping a first-year college student prepare a study timetable for the coming week. The student has classes from Monday to Friday and wants to study three subjects every day. Create a timetable with three study sessions per day. Include a short break between each session. Give extra study time to difficult subjects. Keep the timetable simple and easy to understand. Present the final timetable in a table. Include a revision session on Friday.',
      inputConstraints: [
        'Maximum 50 words.',
        'Keep the Monday-to-Friday schedule and three daily study sessions.',
        'Keep short breaks, extra time for difficult subjects, and Friday revision.',
        'Request a simple, easy-to-understand timetable in a table.',
      ],
      maxTokensOrChars: 50,
      rubric: [
        { id: 'r2_c1', criterion: 'Within 50 Words', weight: 15, category: 'task_achievement', description: 'The compressed prompt is no more than 50 words.' },
        { id: 'r2_c2', criterion: 'Monday–Friday Schedule', weight: 12, category: 'task_achievement', description: 'Retains the weekday schedule for the coming week.' },
        { id: 'r2_c3', criterion: 'Three Daily Sessions', weight: 12, category: 'task_achievement', description: 'Requests three subjects or study sessions each day.' },
        { id: 'r2_c4', criterion: 'Short Breaks', weight: 12, category: 'task_achievement', description: 'Includes a short break between study sessions.' },
        { id: 'r2_c5', criterion: 'Difficult Subjects', weight: 12, category: 'task_achievement', description: 'Allocates extra study time to difficult subjects.' },
        { id: 'r2_c6', criterion: 'Friday Revision', weight: 12, category: 'task_achievement', description: 'Includes a revision session on Friday.' },
        { id: 'r2_c7', criterion: 'Simple Table', weight: 12, category: 'task_achievement', description: 'Requests a simple and understandable timetable presented as a table.' },
        { id: 'r2_c8', criterion: 'Clear and Concise', weight: 13, category: 'prompt_quality', description: 'Uses clear, concise wording without unrelated requirements.' },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Check semantic retention of every instruction in the passage. Accept equivalent phrasing; do not require literal wording. A response must remain within 50 words.',
      aiEvaluationSystemPrompt:
        'Count words strictly and score every retained requirement. Accept equivalent meaning; penalize omissions and unrelated additions. The 50-word maximum is mandatory.',
    },
    {
      id: 'ch_r3',
      roundId: 'round_3',
      title: 'Three-Step Study Planner',
      promptType: 'multi_step_workflow',
      taskOverview: 'Create three connected prompts that help a student prepare for an examination.',
      detailedTask: 'Write all three prompts. Step 1 asks an AI to identify the student’s subjects and exam dates from supplied information. Step 2 uses those subjects and dates to create a daily study timetable. Step 3 uses that timetable to suggest three practical revision tips.',
      targetScenario: 'Use the student’s supplied study and examination information as the input to Step 1.',
      inputConstraints: [
        'Submit a separate prompt for each of the three steps.',
        'Step 2 must use the subjects and exam dates from Step 1.',
        'Step 3 must use the timetable from Step 2 and suggest three practical tips.',
        'Keep the workflow understandable, relevant, and logically connected.',
      ],
      maxTokensOrChars: 3000,
      rubric: [
        { id: 'r3_c1', criterion: 'Three Prompts Submitted', weight: 20, category: 'task_achievement', description: 'Provides a distinct prompt for each of the three steps.' },
        { id: 'r3_c2', criterion: 'Step 1 Purpose', weight: 15, category: 'task_achievement', description: 'Asks the AI to identify subjects and exam dates from supplied information.' },
        { id: 'r3_c3', criterion: 'Step 2 Uses Step 1', weight: 20, category: 'task_achievement', description: 'Uses the subjects and exam dates identified in Step 1 to create a daily timetable.' },
        { id: 'r3_c4', criterion: 'Step 3 Uses Step 2', weight: 20, category: 'task_achievement', description: 'Uses the timetable from Step 2 to suggest three practical revision tips.' },
        { id: 'r3_c5', criterion: 'Connected Workflow', weight: 15, category: 'task_achievement', description: 'Clearly passes each step’s output into the next step.' },
        { id: 'r3_c6', criterion: 'Clarity and Relevance', weight: 10, category: 'prompt_quality', description: 'Prompts are understandable and relevant to exam preparation.' },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Award credit for clear purpose and semantic handoff between each step. All three prompts must be present.',
      aiEvaluationSystemPrompt:
        'Evaluate the three labeled prompts as a connected student study-planning workflow. Verify each handoff; do not require a particular output schema.',
    },
    {
      id: 'ch_r4',
      roundId: 'round_4',
      title: 'Create a College Event Announcement',
      promptType: 'multi_step_workflow',
      taskOverview: 'Write three connected prompts to draft, review, and improve a college technical event announcement.',
      detailedTask: 'Stage 1 drafts an announcement from the supplied details. Stage 2 checks whether all required details are present. Stage 3 uses the review results to fix missing information and unclear wording, then produces the final announcement.',
      targetScenario: 'Event Name: LEXORA Prompt Engineering Challenge\nDate: 15 October\nTime: 10:00 AM\nVenue: College Auditorium\nRegistration: Online registration required',
      inputConstraints: [
        'Submit three connected prompts: Draft, Review, and Improve.',
        'The review checks event name, date, time, venue, and registration instructions.',
        'The improve stage uses the review results and does not invent event information.',
      ],
      maxTokensOrChars: 3000,
      rubric: [
        { id: 'r4_c1', criterion: 'Three Stages Submitted', weight: 15, category: 'task_achievement', description: 'Includes a distinct draft, review, and improve prompt.' },
        { id: 'r4_c2', criterion: 'Draft Uses Event Details', weight: 15, category: 'task_achievement', description: 'Uses the supplied event details to request an announcement.' },
        { id: 'r4_c3', criterion: 'Review Checks Required Details', weight: 20, category: 'task_achievement', description: 'Checks event name, date, time, venue, and registration instructions.' },
        { id: 'r4_c4', criterion: 'Improve Uses Review', weight: 20, category: 'task_achievement', description: 'Uses review findings to address omissions and unclear wording.' },
        { id: 'r4_c5', criterion: 'Complete Final Announcement', weight: 20, category: 'task_achievement', description: 'Requests a clear, complete final announcement without inventing missing information.' },
        { id: 'r4_c6', criterion: 'Logical Prompt Chain', weight: 10, category: 'prompt_quality', description: 'Each stage is relevant and passes useful output to the next.' },
      ],
      hiddenExpectedAnswerOrCriteria:
        'The required details are LEXORA Prompt Engineering Challenge, 15 October, 10:00 AM, College Auditorium, and online registration required. Do not reward invented details.',
      aiEvaluationSystemPrompt:
        'Evaluate the three prompts as a connected announcement workflow. Confirm all five supplied facts are checked and do not accept fabricated event details.',
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'ann_01',
      title: 'Welcome to LEXORA 2026',
      content:
        'Welcome delegates and participants from over 45 collegiate institutions! Please verify your profile details and review the championship rules prior to Round 1 activation.',
      priority: 'HIGH',
      author: 'Championship Organizing Committee',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann_02',
      title: 'Proctoring & Integrity Advisory',
      content:
        'During active challenge attempts, full window focus is required. Browser tab switching or minimizing the contest window will trigger automated warnings and may result in immediate round disqualification.',
      priority: 'URGENT',
      author: 'Technical Integrity Division',
      createdAt: new Date().toISOString(),
    },
  ];

  const notifications: AppNotification[] = [];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_init_01',
      actorId: adminId,
      actorName: 'System Setup',
      actorRole: 'system',
      action: 'SYSTEM_INITIALIZED',
      targetEntity: 'EVENT',
      targetId: 'LEXORA-2026',
      details: 'Championship initialized with 4 official rounds and default constraints.',
      timestamp: new Date().toISOString(),
    },
  ];

  return {
    users: [adminUser],
    studentProfiles: [],
    adminProfiles: [adminProfile],
    rounds,
    challenges,
    roundParticipants: [],
    attempts: [],
    submissions: [],
    proctoringEvents: [],
    roundResults: [],
    announcements,
    notifications,
    auditLogs,
  };
}

class DatabaseManager {
  private data!: DatabaseSchema;
  private isSaving = false;
  private isInitialized = false;

  constructor() {
    // We must load data asynchronously before accepting queries.
    // However, since the legacy interface is synchronous, we pre-fill 
    // with defaults and then fetch from PostgreSQL asynchronously.
    this.data = getInitialData();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Connect to Prisma and ensure state is synced
      const state = await prisma.appState.findUnique({ where: { id: 'singleton' } });
      if (state) {
        const parsed = JSON.parse(state.data) as DatabaseSchema;
        this.data = {
          users: parsed.users || [],
          studentProfiles: parsed.studentProfiles || [],
          adminProfiles: parsed.adminProfiles || [],
          rounds: parsed.rounds || [],
          challenges: parsed.challenges || [],
          roundParticipants: parsed.roundParticipants || [],
          attempts: parsed.attempts || [],
          submissions: parsed.submissions || [],
          proctoringEvents: parsed.proctoringEvents || [],
          roundResults: parsed.roundResults || [],
          announcements: parsed.announcements || [],
          notifications: parsed.notifications || [],
          auditLogs: parsed.auditLogs || [],
        };
        if (this.migrateLegacyChallenges()) {
          await this.persistAsync(this.data);
        }
      } else {
        // First run: save initial schema to DB
        await this.persistAsync(this.data);
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('[DB] Failed to initialize from PostgreSQL:', err);
    }
  }

  private migrateLegacyChallenges(): boolean {
    const legacyTitles: Record<string, string> = {
      ch_r1: 'Target Architecture Deconstruction: Resilient Distributed Cache',
      ch_r2: 'Enterprise Audit Gateway Specification Compression',
      ch_r3: 'Tri-Stage Prompt Relay: Financial Anomaly Forensic Pipeline',
      ch_r4: 'Autonomous Cybersecurity Incident Remediation Chain',
    };
    const defaults = getInitialData();
    const roundsToUpdate = new Set<string>();
    let migrated = false;

    for (const round of this.data.rounds) {
      if (!round.scoringWeights) {
        round.scoringWeights = { ...DEFAULT_SCORING_WEIGHTS };
        migrated = true;
      }
      if (round.completionThreshold === undefined) {
        round.completionThreshold = DEFAULT_COMPLETION_THRESHOLD;
        migrated = true;
      }
      if (round.leaderboardEligible === undefined) {
        round.leaderboardEligible = true;
        migrated = true;
      }
      if (round.scoringConfigUpdatedAt === undefined) {
        round.scoringConfigUpdatedAt = null;
        migrated = true;
      }
    }

    for (const challenge of this.data.challenges) {
      for (const criterion of challenge.rubric || []) {
        if (criterion.category) continue;
        criterion.category = (challenge.roundId === 'round_2' && criterion.id === 'r2_c8') ||
          (challenge.roundId === 'round_3' && criterion.id === 'r3_c6') ||
          (challenge.roundId === 'round_4' && criterion.id === 'r4_c6')
          ? 'prompt_quality'
          : 'task_achievement';
        migrated = true;
      }
    }

    const roundOne = this.data.challenges.find((challenge) => challenge.id === 'ch_r1');
    const defaultRoundOne = defaults.challenges.find((challenge) => challenge.id === 'ch_r1');
    if (roundOne && defaultRoundOne) {
      roundOne.rubric ||= [];
      for (const criterion of defaultRoundOne.rubric.filter((item) => item.category === 'prompt_quality')) {
        if (roundOne.rubric.some((item) => item.id === criterion.id)) continue;
        roundOne.rubric.push(criterion);
        migrated = true;
      }
    }

    for (const [challengeId, legacyTitle] of Object.entries(legacyTitles)) {
      const existing = this.data.challenges.find((challenge) => challenge.id === challengeId);
      if (existing?.title !== legacyTitle) continue;

      const replacement = defaults.challenges.find((challenge) => challenge.id === challengeId);
      if (!replacement) continue;
      Object.assign(existing, replacement);
      roundsToUpdate.add(replacement.roundId);
      migrated = true;
    }

    for (const roundId of roundsToUpdate) {
      const existing = this.data.rounds.find((round) => round.id === roundId);
      const replacement = defaults.rounds.find((round) => round.id === roundId);
      if (!existing || !replacement) continue;
      existing.title = replacement.title;
      existing.subtitle = replacement.subtitle;
      existing.description = replacement.description;
      existing.instructions = replacement.instructions;
    }

    return migrated;
  }

  private async persistAsync(data: DatabaseSchema): Promise<void> {
    try {
      const dataStr = JSON.stringify(data);
      await prisma.appState.upsert({
        where: { id: 'singleton' },
        update: { data: dataStr },
        create: { id: 'singleton', data: dataStr },
      });
    } catch (err) {
      console.error('[DB] PostgreSQL persist error:', err);
    }
  }

  public save(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    
    // Fire and forget async persistence to eliminate blocking synchronous writes
    this.persistAsync(this.data)
      .finally(() => {
        this.isSaving = false;
      });
  }

  // Accessors
  get users(): User[] {
    return this.data.users;
  }
  get studentProfiles(): StudentProfile[] {
    return this.data.studentProfiles;
  }
  get adminProfiles(): AdminProfile[] {
    return this.data.adminProfiles;
  }
  get rounds(): Round[] {
    return this.data.rounds;
  }
  get challenges(): Challenge[] {
    return this.data.challenges;
  }
  get roundParticipants(): RoundParticipant[] {
    return this.data.roundParticipants;
  }
  get attempts(): Attempt[] {
    return this.data.attempts;
  }
  get submissions(): Submission[] {
    return this.data.submissions;
  }
  get proctoringEvents(): ProctoringEvent[] {
    return this.data.proctoringEvents;
  }
  get roundResults(): RoundResult[] {
    return this.data.roundResults;
  }
  get announcements(): Announcement[] {
    return this.data.announcements;
  }
  get notifications(): AppNotification[] {
    return this.data.notifications;
  }
  get auditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // Helper methods
  public logAudit(actorId: string, actorName: string, actorRole: any, action: string, targetEntity: string, targetId: string, details: string): void {
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorId,
      actorName,
      actorRole,
      action,
      targetEntity,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public addNotification(userId: string, title: string, message: string, type: any): void {
    const notif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.save();
  }

  public getAdminStats(): AdminStats {
    const totalRegisteredStudents = this.data.studentProfiles.length;
    const activeParticipants = new Set(this.data.roundParticipants.map((p) => p.studentId)).size;
    const activeRound = this.data.rounds.find((r) => r.status === 'ACTIVE');
    const totalSubmissions = this.data.submissions.length;
    const completedRoundsCount = this.data.rounds.filter((r) => r.status === 'ENDED' || r.status === 'CLOSED').length;
    const pendingEvaluationsCount = this.data.submissions.filter((s) => s.status === 'PENDING_EVALUATION').length;
    const disqualifiedParticipantsCount = this.data.roundParticipants.filter((p) => p.isDisqualified).length;
    const publishedResultsCount = this.data.rounds.filter((r) => r.isResultsPublished).length;

    return {
      totalRegisteredStudents,
      activeParticipants,
      activeRoundTitle: activeRound ? activeRound.title : null,
      activeRoundId: activeRound ? activeRound.id : null,
      totalSubmissions,
      completedRoundsCount,
      pendingEvaluationsCount,
      disqualifiedParticipantsCount,
      publishedResultsCount,
    };
  }

  public computeLeaderboard(roundId?: string, publishedOnly = false): LeaderboardEntry[] {
    const studentsMap = new Map<string, StudentProfile>();
    this.data.studentProfiles.forEach((p) => studentsMap.set(p.userId, p));

    // Aggregate submissions and scores per student
    const scores = new Map<
      string,
      {
        studentId: string;
        r1: number | null;
        r2: number | null;
        r3: number | null;
        r4: number | null;
        totalScore: number;
        totalTimeSeconds: number;
        totalAttempts: number;
        roundsCompleted: number;
        isDisqualified: boolean;
        taskAchievementScore: number;
        promptQualityScore: number;
        hasPartialCompletion: boolean;
      }
    >();

    this.data.users
      .filter((u) => u.role === 'student')
      .forEach((u) => {
        scores.set(u.id, {
          studentId: u.id,
          r1: null,
          r2: null,
          r3: null,
          r4: null,
          totalScore: 0,
          totalTimeSeconds: 0,
          totalAttempts: 0,
          roundsCompleted: 0,
          isDisqualified: false,
          taskAchievementScore: 0,
          promptQualityScore: 0,
          hasPartialCompletion: false,
        });
      });

    // Process participant records
    this.data.roundParticipants.forEach((rp) => {
      const record = scores.get(rp.studentId);
      if (!record) return;

      if (rp.isDisqualified) {
        const round = this.data.rounds.find((item) => item.id === rp.roundId);
        if ((!roundId || roundId === rp.roundId) && (!publishedOnly || round?.isResultsPublished)) {
          record.isDisqualified = true;
        }
      }

      if (rp.finalScore !== null) {
        if (rp.roundId === 'round_1') record.r1 = rp.finalScore;
        if (rp.roundId === 'round_2') record.r2 = rp.finalScore;
        if (rp.roundId === 'round_3') record.r3 = rp.finalScore;
        if (rp.roundId === 'round_4') record.r4 = rp.finalScore;

        const round = this.data.rounds.find((item) => item.id === rp.roundId);
        const rankingEligible = round?.leaderboardEligible !== false && (!publishedOnly || round?.isResultsPublished === true);
        const inSelectedScope = roundId ? roundId === rp.roundId : rankingEligible;

        const breakdown = rp.scoringBreakdown || this.data.submissions
          .filter((submission) => submission.roundId === rp.roundId && submission.studentId === rp.studentId)
          .find((submission) => submission.score === rp.finalScore)?.scoringBreakdown;
        if (inSelectedScope && rankingEligible) {
          record.taskAchievementScore += breakdown?.taskAchievementScore || 0;
          record.promptQualityScore += breakdown?.promptQualityScore || 0;
          if (breakdown?.completionStatus === 'PARTIALLY_COMPLETED' && !rp.completionAt) record.hasPartialCompletion = true;
        }

        if (inSelectedScope && rankingEligible) {
          record.totalScore += rp.finalScore;
          record.totalTimeSeconds += rp.timeTakenSeconds || 0;
          record.totalAttempts += rp.attemptsCount;
          if (!breakdown || breakdown.completionStatus === 'COMPLETED' || rp.completionAt) record.roundsCompleted += 1;
        }
      }
    });

    const entries: LeaderboardEntry[] = [];
    scores.forEach((sc) => {
      const prof = studentsMap.get(sc.studentId);
      if (!prof) return;

      // Ranking eligibility: disqualified participants cannot be ranked as eligible winners
      const qualificationStatus: 'QUALIFIED' | 'DISQUALIFIED' | 'IN_CONTENTION' = sc.isDisqualified
        ? 'DISQUALIFIED'
        : sc.roundsCompleted > 0
          ? 'QUALIFIED'
          : 'IN_CONTENTION';

      entries.push({
        rank: 0,
        studentId: sc.studentId,
        studentName: prof.fullName,
        collegeName: prof.collegeName,
        department: prof.department,
        academicYear: prof.academicYear,
        totalScore: roundId
          ? (this.data.rounds.find((round) => round.id === roundId)?.leaderboardEligible === false
            ? 0
            : (roundId === 'round_1' ? sc.r1 : roundId === 'round_2' ? sc.r2 : roundId === 'round_3' ? sc.r3 : sc.r4) || 0)
          : roundToTwo(sc.totalScore),
        round1Score: publishedOnly && !this.data.rounds.find((round) => round.id === 'round_1')?.isResultsPublished ? null : sc.r1,
        round2Score: publishedOnly && !this.data.rounds.find((round) => round.id === 'round_2')?.isResultsPublished ? null : sc.r2,
        round3Score: publishedOnly && !this.data.rounds.find((round) => round.id === 'round_3')?.isResultsPublished ? null : sc.r3,
        round4Score: publishedOnly && !this.data.rounds.find((round) => round.id === 'round_4')?.isResultsPublished ? null : sc.r4,
        roundsCompleted: sc.roundsCompleted,
        totalTimeSeconds: sc.totalTimeSeconds,
        totalAttempts: sc.totalAttempts,
        qualificationStatus,
        isTopThree: false,
        taskAchievementScore: roundToTwo(sc.taskAchievementScore),
        promptQualityScore: roundToTwo(sc.promptQualityScore),
        completionStatus: sc.roundsCompleted === 0 ? 'NOT_STARTED' : sc.hasPartialCompletion ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
      });
    });

    return rankLeaderboardEntries(entries);
  }
}

export const db = new DatabaseManager();
