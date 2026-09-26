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
      subtitle: 'Target Reconstruction & System Intent Extraction',
      description:
        'Analyze a complex synthetic AI output and reverse-engineer the exact system prompt, constraints, role framing, and formatting directives needed to reproduce it deterministically.',
      instructions:
        'Examine the target benchmark output below. Construct a single comprehensive prompt that instructs an LLM to generate output matching the structure, tone, constraints, and specific technical parameters of the target output without extraneous conversational filler.',
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
      subtitle: 'Extreme Token Economy & Lossless Distillation',
      description:
        'Distill a sprawling 1,200-word enterprise requirement document into a hyper-condensed prompt under 180 words while retaining 100% of functional requirements and negative constraints.',
      instructions:
        'Given the extensive specification for a distributed microservice audit logger, engineer a high-density prompt strictly under 180 words/tokens that produces the exact required output schema without losing a single edge-case handling constraint.',
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
      subtitle: 'Context Serialization & Zero-Drift Intermediate Handoff',
      description:
        'Architect a sequence of 3 interconnected prompts where the structured output of Stage 1 cleanly feeds Stage 2 and culminates in Stage 3 without hallucination or contextual degradation.',
      instructions:
        'Design a 3-stage relay pipeline: Stage 1 (Data Decomposition), Stage 2 (Analytical Synthesis), and Stage 3 (Actionable Decision Matrix). Your submission must define the prompt templates and handoff token contracts.',
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
      title: 'Upskilling — Prompt Chaining',
      subtitle: 'Dynamic Agentic Orchestration & Verification Loops',
      description:
        'Engineer a master multi-step prompt chain with automated self-critique, deterministic rollback on schema violations, and adaptive tool-routing instructions.',
      instructions:
        'Construct an autonomous prompt chain designed for a real-time cybersecurity incident response system. The chain must handle triage, forensic synthesis, and containment action generation with explicit self-verification gates.',
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

  // Configurable Challenge templates for each round
  const challenges: Challenge[] = [
    {
      id: 'ch_r1',
      roundId: 'round_1',
      title: 'Target Architecture Deconstruction: Resilient Distributed Cache',
      promptType: 'prompt_submission',
      taskOverview:
        'Reverse-engineer the prompt that generated the high-precision technical specification below.',
      detailedTask:
        'Below is an excerpt from a verified target LLM output specifying a Fault-Tolerant Distributed Cache Engine with exact YAML configuration schema, latency SLAs (<1.2ms p99), and quorum policies. Your goal is to write the system prompt that reproduces this output structure, semantic fidelity, and constraint compliance without hallucinating arbitrary extra commentary.',
      targetScenario:
        'TARGET BENCHMARK OUTPUT:\n```yaml\nsystem: HyperCache-v4\narchitecture:\n  topology: hybrid-raft-ring\n  node_capacity_gib: 64\n  replication_factor: 3\n  read_consistency: eventual_bounded_150ms\n  write_consistency: quorum_strict\nbenchmarks:\n  p95_read_latency_ms: 0.8\n  p99_write_latency_ms: 1.15\n  max_tps_per_node: 45000\nfailover:\n  heartbeat_interval_ms: 200\n  leader_election_timeout_ms: 600\n  degradation_mode: read_only_stale_allowed\n```\nTASK: Write the system prompt that will instruct an AI to generate an identically formatted, rigorous distributed architecture specification for any high-throughput memory engine.',
      inputConstraints: [
        'Submission must be a complete, self-contained prompt.',
        'Must specify strict YAML format requirement with no preamble or markdown fences inside the response.',
        'Must enforce explicit SLA numbers and failover timeout properties.',
        'Must instruct the model to adopt the persona of a Principal Distributed Systems Architect.',
      ],
      maxTokensOrChars: 1500,
      rubric: [
        {
          id: 'r1_c1',
          criterion: 'Role Definition & Intent Accuracy',
          weight: 25,
          description:
            'Clarity of role framing, domain expertise level, and task directive.',
        },
        {
          id: 'r1_c2',
          criterion: 'Structural & Output Format Enforcement',
          weight: 30,
          description:
            'Explicit directives enforcing exact schema structure and preventing conversational fluff.',
        },
        {
          id: 'r1_c3',
          criterion: 'Constraint Precision & Parameter Coverage',
          weight: 25,
          description:
            'Completeness of latency metrics, quorum requirements, and failover constraints.',
        },
        {
          id: 'r1_c4',
          criterion: 'Generalizability & Determinism',
          weight: 20,
          description:
            'How reliably the prompt produces deterministic, zero-drift results across runs.',
        },
      ],
      sampleInput: 'Memory Engine Type: Distributed Key-Value Store with Raft consensus',
      expectedOutputFormat: 'Pure YAML key-value hierarchy matching specification schema',
      hiddenExpectedAnswerOrCriteria:
        'A high-scoring prompt specifies: Persona (Principal Systems Architect), Format Directive (Respond ONLY with valid YAML, no introductory text), Exact Keys (topology, node_capacity_gib, replication_factor, latency SLAs, failover parameters), and Negative Constraints (Zero conversational filler).',
      aiEvaluationSystemPrompt:
        'Evaluate the student prompt on how effectively it reverse-engineers the target architecture output. Score out of 100 based on the 4 rubric criteria.',
    },
    {
      id: 'ch_r2',
      roundId: 'round_2',
      title: 'Enterprise Audit Gateway Specification Compression',
      promptType: 'prompt_submission',
      taskOverview:
        'Compress a comprehensive 1,200-word enterprise security compliance prompt into under 180 words.',
      detailedTask:
        'An enterprise financial auditing service needs an automated prompt to review transaction payloads. The raw specification document spans 1,200 words covering SOC2 Type II compliance, PII masking (regex for credit cards/SSNs), multi-currency validation, and cryptographic HMAC-SHA256 signature verification. Compress this into an ultra-dense, unambiguous prompt under 180 words that maintains 100% constraint satisfaction.',
      targetScenario:
        'RAW SPECIFICATION HIGHLIGHTS:\n- Mask all 16-digit PANs with format "XXXX-XXXX-XXXX-1234"\n- Redact Tax IDs (SSN/EIN) completely to "[REDACTED]"\n- Reject any transaction exceeding $100,000 without 2FA biometric token flag\n- Output strictly RFC-7946 GeoJSON + JSON-LD audit log\n- Return HTTP 400 for unverified HMAC signature.',
      inputConstraints: [
        'Strict length limit: Maximum 180 words (enforced by submission counter).',
        'Must retain all 5 core security & formatting constraints.',
        'No loss of semantic fidelity or schema rules.',
      ],
      maxTokensOrChars: 180, // word limit
      rubric: [
        {
          id: 'r2_c1',
          criterion: 'Token & Word Economy',
          weight: 35,
          description: 'Staying strictly under 180 words with minimal lexical redundancy.',
        },
        {
          id: 'r2_c2',
          criterion: 'Constraint Preservation',
          weight: 35,
          description: 'Accurate preservation of all 5 critical enterprise audit constraints.',
        },
        {
          id: 'r2_c3',
          criterion: 'Semantic Density & Clarity',
          weight: 30,
          description: 'Use of high-density technical syntax, shorthand, and direct notation.',
        },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Target compressed prompt leverages dense imperative syntax, compact regex definitions, and clear output spec while honoring the 180-word ceiling.',
      aiEvaluationSystemPrompt:
        'Analyze word count strictly. If word count > 180, deduct 20 points. Evaluate constraint preservation and density.',
    },
    {
      id: 'ch_r3',
      roundId: 'round_3',
      title: 'Tri-Stage Prompt Relay: Financial Anomaly Forensic Pipeline',
      promptType: 'multi_step_workflow',
      taskOverview:
        'Design a 3-stage prompt relay pipeline where output of Stage 1 directly drives Stage 2, which feeds Stage 3.',
      detailedTask:
        'Develop an end-to-end prompt relay system for suspicious transaction analysis. Stage 1 extracts anomalous vectors from raw logs. Stage 2 computes risk scores and correlation clusters. Stage 3 drafts the formal Suspicious Activity Report (SAR) for regulatory submission. Clearly define the prompt for each stage and the intermediate JSON schema bridge.',
      targetScenario:
        'Input: Unstructured core banking transaction logs with timestamps, IP addresses, geolocations, and wire amounts.',
      inputConstraints: [
        'Must define Stage 1, Stage 2, and Stage 3 prompts.',
        'Must define the exact JSON payload contract between Stage 1 -> Stage 2 and Stage 2 -> Stage 3.',
        'Must include error-handling directive for ambiguous data.',
      ],
      maxTokensOrChars: 3000,
      rubric: [
        {
          id: 'r3_c1',
          criterion: 'Pipeline Architecture & Interface Contracts',
          weight: 30,
          description: 'Completeness and robustness of JSON handoff schemas between stages.',
        },
        {
          id: 'r3_c2',
          criterion: 'Context Retention & Hallucination Prevention',
          weight: 35,
          description: 'Guarantees against drift, loss of original data, or hallucinated facts.',
        },
        {
          id: 'r3_c3',
          criterion: 'Domain Depth & Regulatory Compliance',
          weight: 35,
          description: 'Fidelity of forensic risk scoring and SAR reporting logic.',
        },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Complete 3-prompt sequence with explicit markdown/JSON delimiter tags for reliable machine consumption.',
      aiEvaluationSystemPrompt:
        'Evaluate the multi-stage relay pipeline. Verify that intermediate data formats match between stages.',
    },
    {
      id: 'ch_r4',
      roundId: 'round_4',
      title: 'Autonomous Cybersecurity Incident Remediation Chain',
      promptType: 'multi_step_workflow',
      taskOverview:
        'Build an advanced multi-step prompt chain with self-critique, deterministic rollback, and verification loops.',
      detailedTask:
        'Design a comprehensive prompt orchestration chain for zero-day vulnerability containment. The system must autonomously triage threat intelligence, synthesize firewall/kernel patch commands, test the patch in a virtual simulation check, verify zero business disruption, and trigger automatic rollback if side-effects are detected.',
      targetScenario:
        'Target incident: Active CVE exploitation attempting memory corruption on edge load balancers.',
      inputConstraints: [
        'Must specify triage step, containment generation, validation loop, and rollback trigger.',
        'Must incorporate self-critique prompt with explicit pass/fail threshold.',
        'Must include a human-in-the-loop authorization gate before production execution.',
      ],
      maxTokensOrChars: 4000,
      rubric: [
        {
          id: 'r4_c1',
          criterion: 'Orchestration & Verification Loop Design',
          weight: 35,
          description: 'Elegance and resilience of automated self-critique and validation loops.',
        },
        {
          id: 'r4_c2',
          criterion: 'Safety Guards & Rollback Logic',
          weight: 35,
          description: 'Deterministic rollback triggers, simulation isolation, and guardrails.',
        },
        {
          id: 'r4_c3',
          criterion: 'Operational Feasibility & Prompt Engineering Rigor',
          weight: 30,
          description: 'Precision of prompt directives, negative prompts, and edge-case handling.',
        },
      ],
      hiddenExpectedAnswerOrCriteria:
        'Full prompt chaining specification with cycle limits to prevent infinite loops, schema validations, and fallback states.',
      aiEvaluationSystemPrompt:
        'Score the prompt chaining architecture based on loop safety, self-verification rigor, and rollback mechanics.',
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
      } else {
        // First run: save initial schema to DB
        await this.persistAsync(this.data);
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('[DB] Failed to initialize from PostgreSQL:', err);
    }
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

  public computeLeaderboard(roundId?: string): LeaderboardEntry[] {
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
        });
      });

    // Process participant records
    this.data.roundParticipants.forEach((rp) => {
      const record = scores.get(rp.studentId);
      if (!record) return;

      if (rp.isDisqualified) {
        if (!roundId || roundId === rp.roundId) {
          record.isDisqualified = true;
        }
      }

      if (rp.finalScore !== null) {
        if (rp.roundId === 'round_1') record.r1 = rp.finalScore;
        if (rp.roundId === 'round_2') record.r2 = rp.finalScore;
        if (rp.roundId === 'round_3') record.r3 = rp.finalScore;
        if (rp.roundId === 'round_4') record.r4 = rp.finalScore;

        if (!roundId || roundId === rp.roundId) {
          record.totalScore += rp.finalScore;
          record.totalTimeSeconds += rp.timeTakenSeconds || 0;
          record.totalAttempts += rp.attemptsCount;
          record.roundsCompleted += 1;
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
          ? (roundId === 'round_1' ? sc.r1 : roundId === 'round_2' ? sc.r2 : roundId === 'round_3' ? sc.r3 : sc.r4) || 0
          : sc.totalScore,
        round1Score: sc.r1,
        round2Score: sc.r2,
        round3Score: sc.r3,
        round4Score: sc.r4,
        roundsCompleted: sc.roundsCompleted,
        totalTimeSeconds: sc.totalTimeSeconds,
        totalAttempts: sc.totalAttempts,
        qualificationStatus,
        isTopThree: false,
      });
    });

    // Official ranking rules:
    // 1. Eligibility (Non-disqualified first)
    // 2. Higher official score
    // 3. Lower completion time
    // 4. Fewer attempts used
    entries.sort((a, b) => {
      if (a.qualificationStatus === 'DISQUALIFIED' && b.qualificationStatus !== 'DISQUALIFIED') return 1;
      if (b.qualificationStatus === 'DISQUALIFIED' && a.qualificationStatus !== 'DISQUALIFIED') return -1;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalTimeSeconds !== b.totalTimeSeconds) return a.totalTimeSeconds - b.totalTimeSeconds;
      return a.totalAttempts - b.totalAttempts;
    });

    // Assign ranks
    entries.forEach((item, index) => {
      item.rank = index + 1;
      item.isTopThree = index < 3 && item.qualificationStatus !== 'DISQUALIFIED' && item.totalScore > 0;
    });

    return entries;
  }
}

export const db = new DatabaseManager();
