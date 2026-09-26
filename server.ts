import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db, hashPassword, verifyPassword } from './src/server/db.ts';
import { evaluateSubmission } from './src/server/ai.ts';
import type { User, StudentProfile, RoundParticipant, Submission } from './src/shared/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  studentProfile?: StudentProfile;
}

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.users.find((u) => u.id === payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    if (user.role === 'student') {
      req.studentProfile = db.studentProfiles.find((p) => p.userId === user.id);
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid' });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privilege required' });
    return;
  }
  next();
}

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------

// POST /api/auth/register (Student Registration)
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const {
      fullName,
      collegeName,
      department,
      academicYear,
      phoneNumber,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (
      !fullName ||
      !collegeName ||
      !department ||
      !academicYear ||
      !phoneNumber ||
      !email ||
      !password
    ) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists' });
      return;
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const regNumber = `LEX-${new Date().getFullYear()}-${String(db.studentProfiles.length + 101).padStart(3, '0')}`;

    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      username: normalizedEmail.split('@')[0],
      role: 'student',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newProfile: StudentProfile = {
      id: `prof_${Date.now()}`,
      userId,
      fullName: fullName.trim(),
      collegeName: collegeName.trim(),
      department: department.trim(),
      academicYear,
      phoneNumber: phoneNumber.trim(),
      registrationNumber: regNumber,
      eligibilityStatus: 'eligible',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.studentProfiles.push(newProfile);

    db.addNotification(
      userId,
      'Registration Confirmed',
      `Welcome to LEXORA! Your registration number is ${regNumber}. Review championship rules prior to Round 1.`,
      'ROUND_ACTIVE'
    );

    db.logAudit(
      userId,
      newProfile.fullName,
      'student',
      'STUDENT_REGISTERED',
      'STUDENT_PROFILE',
      newProfile.id,
      `Registered from ${newProfile.collegeName} (${newProfile.academicYear})`
    );

    db.save();

    const token = generateToken(userId);
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        studentProfile: newProfile,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password, role } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/Email and password are required' });
      return;
    }

    const norm = identifier.toLowerCase().trim();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === norm ||
        u.username.toLowerCase() === norm
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (role && user.role !== role) {
      res.status(401).json({
        error: `Account role mismatch: expected ${role} login portal`,
      });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    const studentProfile = user.role === 'student' ? db.studentProfiles.find((p) => p.userId === user.id) : undefined;
    const adminProfile = user.role === 'admin' ? db.adminProfiles.find((p) => p.userId === user.id) : undefined;

    db.logAudit(
      user.id,
      studentProfile ? studentProfile.fullName : adminProfile ? adminProfile.fullName : user.username,
      user.role,
      'USER_LOGIN',
      'USER',
      user.id,
      `User logged in via ${user.role} portal`
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        studentProfile,
        adminProfile,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const studentProfile = user.role === 'student' ? db.studentProfiles.find((p) => p.userId === user.id) : undefined;
  const adminProfile = user.role === 'admin' ? db.adminProfiles.find((p) => p.userId === user.id) : undefined;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      studentProfile,
      adminProfile,
    },
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  // With JWT, logout is handled client-side by deleting the token.
  res.json({ success: true });
});

// ----------------------------------------------------
// ROUNDS & COMPETITION ROUTES
// ----------------------------------------------------

// GET /api/rounds
app.get('/api/rounds', (req: Request, res: Response) => {
  // If request has bearer token of admin, show full details; otherwise sanitize
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = db.users.find((u) => u.id === payload.userId);
      if (user && user.role === 'admin') isAdmin = true;
    } catch (e) {
      // Ignore invalid token for this non-authenticated endpoint
    }
  }

  res.json(db.rounds);
});

// GET /api/rounds/:id
app.get('/api/rounds/:id', (req: Request, res: Response) => {
  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }
  res.json(round);
});

// POST /api/admin/rounds/:id/action (Admin controls: START, PAUSE, RESUME, END, CLOSE, PUBLISH_RESULTS, UNPUBLISH_RESULTS)
app.post('/api/admin/rounds/:id/action', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  const { action, timingMode, durationMinutes } = req.body;
  const now = new Date().toISOString();
  const actorName = req.user?.username || 'Admin';

  switch (action) {
    case 'START':
      if (round.status === 'ACTIVE') {
        res.status(400).json({ error: 'Round is already active' });
        return;
      }
      if (timingMode) round.timingMode = timingMode;
      if (durationMinutes) round.durationMinutes = Number(durationMinutes);
      round.status = 'ACTIVE';
      round.startTimestamp = now;
      db.logAudit(req.user!.id, actorName, 'admin', 'ROUND_STARTED', 'ROUND', round.id, `Round ${round.roundNumber} (${round.title}) activated.`);
      // Broadcast notification
      db.users.filter((u) => u.role === 'student').forEach((s) => {
        db.addNotification(s.id, `Round ${round.roundNumber} Activated!`, `Round ${round.roundNumber}: ${round.title} is now ACTIVE. Enter the workspace to compete.`, 'ROUND_ACTIVE');
      });
      break;

    case 'PAUSE':
      round.status = 'PAUSED';
      db.logAudit(req.user!.id, actorName, 'admin', 'ROUND_PAUSED', 'ROUND', round.id, `Round ${round.roundNumber} paused.`);
      break;

    case 'RESUME':
      round.status = 'ACTIVE';
      db.logAudit(req.user!.id, actorName, 'admin', 'ROUND_RESUMED', 'ROUND', round.id, `Round ${round.roundNumber} resumed.`);
      break;

    case 'END':
      round.status = 'ENDED';
      round.endTimestamp = now;
      db.logAudit(req.user!.id, actorName, 'admin', 'ROUND_ENDED', 'ROUND', round.id, `Round ${round.roundNumber} ended by administrator.`);
      break;

    case 'CLOSE':
      round.status = 'CLOSED';
      db.logAudit(req.user!.id, actorName, 'admin', 'ROUND_CLOSED', 'ROUND', round.id, `Round ${round.roundNumber} closed.`);
      break;

    case 'PUBLISH_RESULTS':
      round.isResultsPublished = true;
      round.resultsPublishedAt = now;
      // Pre-compute official rankings for this round
      const leaderboard = db.computeLeaderboard(round.id);
      db.logAudit(req.user!.id, actorName, 'admin', 'RESULTS_PUBLISHED', 'ROUND', round.id, `Official results for Round ${round.roundNumber} published.`);
      db.users.filter((u) => u.role === 'student').forEach((s) => {
        db.addNotification(s.id, `Results Published: Round ${round.roundNumber}`, `Official results for ${round.title} are now live on the leaderboard.`, 'RESULTS_PUBLISHED');
      });
      break;

    case 'UNPUBLISH_RESULTS':
      round.isResultsPublished = false;
      round.resultsPublishedAt = null;
      db.logAudit(req.user!.id, actorName, 'admin', 'RESULTS_UNPUBLISHED', 'ROUND', round.id, `Results for Round ${round.roundNumber} retracted.`);
      break;

    default:
      res.status(400).json({ error: 'Invalid round action' });
      return;
  }

  db.save();
  res.json({ success: true, round });
});

// PUT /api/admin/rounds/:id (Update round settings)
app.put('/api/admin/rounds/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  const {
    title,
    subtitle,
    description,
    instructions,
    durationMinutes,
    maxAttempts,
    timingMode,
    evaluationMethod,
    maxScore,
    qualificationRules,
    strictTabSwitchDisqualification,
    maxTabSwitchWarnings,
  } = req.body;

  if (title) round.title = title;
  if (subtitle) round.subtitle = subtitle;
  if (description) round.description = description;
  if (instructions) round.instructions = instructions;
  if (durationMinutes !== undefined) round.durationMinutes = Number(durationMinutes);
  if (maxAttempts !== undefined) round.maxAttempts = Number(maxAttempts);
  if (timingMode) round.timingMode = timingMode;
  if (evaluationMethod) round.evaluationMethod = evaluationMethod;
  if (maxScore !== undefined) round.maxScore = Number(maxScore);
  if (qualificationRules) round.qualificationRules = qualificationRules;
  if (strictTabSwitchDisqualification !== undefined) round.strictTabSwitchDisqualification = Boolean(strictTabSwitchDisqualification);
  if (maxTabSwitchWarnings !== undefined) round.maxTabSwitchWarnings = Number(maxTabSwitchWarnings);

  db.logAudit(
    req.user!.id,
    req.user!.username,
    'admin',
    'ROUND_CONFIG_UPDATED',
    'ROUND',
    round.id,
    `Updated configuration for Round ${round.roundNumber}`
  );

  db.save();
  res.json({ success: true, round });
});

// ----------------------------------------------------
// CHALLENGE & WORKSPACE ROUTES
// ----------------------------------------------------

// GET /api/rounds/:id/challenge (Student & Admin workspace view)
app.get('/api/rounds/:id/challenge', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  // Student permission check: Round MUST be ACTIVE, PAUSED, or ENDED/CLOSED to view
  if (req.user?.role === 'student' && round.status === 'LOCKED') {
    res.status(403).json({ error: 'This challenge is locked until activated by the administrator.' });
    return;
  }

  const challenge = db.challenges.find((c) => c.roundId === round.id);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not configured for this round' });
    return;
  }

  // Sanitize for students (never expose hidden criteria or system prompts)
  if (req.user?.role === 'student') {
    const { hiddenExpectedAnswerOrCriteria, aiEvaluationSystemPrompt, ...safeChallenge } = challenge;
    res.json({ challenge: safeChallenge, round });
    return;
  }

  res.json({ challenge, round });
});

// PUT /api/admin/challenges/:id
app.put('/api/admin/challenges/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const challenge = db.challenges.find((c) => c.id === req.params.id);
  if (!challenge) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }

  const {
    title,
    taskOverview,
    detailedTask,
    targetScenario,
    inputConstraints,
    maxTokensOrChars,
    rubric,
    hiddenExpectedAnswerOrCriteria,
    aiEvaluationSystemPrompt,
  } = req.body;

  if (title) challenge.title = title;
  if (taskOverview) challenge.taskOverview = taskOverview;
  if (detailedTask) challenge.detailedTask = detailedTask;
  if (targetScenario) challenge.targetScenario = targetScenario;
  if (Array.isArray(inputConstraints)) challenge.inputConstraints = inputConstraints;
  if (maxTokensOrChars !== undefined) challenge.maxTokensOrChars = maxTokensOrChars ? Number(maxTokensOrChars) : null;
  if (Array.isArray(rubric)) challenge.rubric = rubric;
  if (hiddenExpectedAnswerOrCriteria !== undefined) challenge.hiddenExpectedAnswerOrCriteria = hiddenExpectedAnswerOrCriteria;
  if (aiEvaluationSystemPrompt !== undefined) challenge.aiEvaluationSystemPrompt = aiEvaluationSystemPrompt;

  db.logAudit(
    req.user!.id,
    req.user!.username,
    'admin',
    'CHALLENGE_MODIFIED',
    'CHALLENGE',
    challenge.id,
    `Admin modified challenge content for round ${challenge.roundId}`
  );

  db.save();
  res.json({ success: true, challenge });
});

// POST /api/rounds/:id/start-attempt (Student enters workspace, begins timer)
app.post('/api/rounds/:id/start-attempt', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only student participants can enter workspace' });
    return;
  }

  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  if (round.status !== 'ACTIVE') {
    res.status(400).json({ error: `Cannot start challenge: Round status is ${round.status}` });
    return;
  }

  const studentProfile = db.studentProfiles.find((p) => p.userId === user.id);
  if (!studentProfile) {
    res.status(400).json({ error: 'Student profile not found' });
    return;
  }

  let participant = db.roundParticipants.find((p) => p.roundId === round.id && p.studentId === user.id);
  const now = new Date();

  if (!participant) {
    // New participation record
    const expiresAt = new Date(now.getTime() + round.durationMinutes * 60 * 1000).toISOString();
    participant = {
      id: `rp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roundId: round.id,
      studentId: user.id,
      studentName: studentProfile.fullName,
      collegeName: studentProfile.collegeName,
      department: studentProfile.department,
      startedAt: now.toISOString(),
      expiresAt: round.timingMode === 'individual' ? expiresAt : round.endTimestamp || expiresAt,
      status: 'IN_PROGRESS',
      attemptsCount: 0,
      remainingAttempts: round.maxAttempts,
      highestScore: null,
      finalScore: null,
      timeTakenSeconds: 0,
      isDisqualified: false,
      disqualificationReason: null,
      disqualifiedAt: null,
      tabSwitchCount: 0,
    };
    db.roundParticipants.push(participant);
    db.save();
  } else {
    // Re-entering workspace
    if (participant.isDisqualified) {
      res.status(403).json({
        error: `Participant is disqualified: ${participant.disqualificationReason || 'Integrity violation'}`,
        participant,
      });
      return;
    }
  }

  // Calculate authoritative server time remaining in seconds
  const expiryTime = participant.expiresAt ? new Date(participant.expiresAt).getTime() : now.getTime();
  const remainingSeconds = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));

  res.json({
    participant,
    remainingSeconds,
    durationSeconds: round.durationMinutes * 60,
    serverTimestamp: new Date().toISOString(),
  });
});

// GET /api/rounds/:id/my-status (Get student's status for this round)
app.get('/api/rounds/:id/my-status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const round = db.rounds.find((r) => r.id === req.params.id);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  const participant = db.roundParticipants.find((p) => p.roundId === round.id && p.studentId === user.id);
  const userSubmissions = db.submissions.filter((s) => s.roundId === round.id && s.studentId === user.id);

  let remainingSeconds = 0;
  if (participant?.expiresAt) {
    remainingSeconds = Math.max(0, Math.floor((new Date(participant.expiresAt).getTime() - Date.now()) / 1000));
  }

  res.json({
    participant,
    submissions: userSubmissions,
    remainingSeconds,
    roundStatus: round.status,
    isResultsPublished: round.isResultsPublished,
  });
});

// POST /api/rounds/:id/submit (Enforce 2-attempt limit, timer expiration, evaluate submission)
app.post('/api/rounds/:id/submit', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== 'student') {
      res.status(403).json({ error: 'Only registered students can submit challenges' });
      return;
    }

    const round = db.rounds.find((r) => r.id === req.params.id);
    if (!round) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    if (round.status !== 'ACTIVE') {
      res.status(400).json({ error: `Submissions rejected: Round is currently ${round.status}` });
      return;
    }

    const participant = db.roundParticipants.find((p) => p.roundId === round.id && p.studentId === user.id);
    if (!participant) {
      res.status(400).json({ error: 'Participation session not initiated. Enter workspace first.' });
      return;
    }

    if (participant.isDisqualified) {
      res.status(403).json({ error: 'Submission rejected: Participant is disqualified.' });
      return;
    }

    // SERVER-AUTHORITATIVE TIMER CHECK
    if (participant.expiresAt && new Date() > new Date(participant.expiresAt)) {
      participant.status = 'TIMED_OUT';
      db.save();
      res.status(400).json({ error: 'Submission window has expired. Time limit exceeded.' });
      return;
    }

    // SERVER-AUTHORITATIVE ATTEMPT LIMIT CHECK (MAX 2 ATTEMPTS)
    if (participant.attemptsCount >= round.maxAttempts) {
      res.status(400).json({
        error: `Submission rejected: You have exhausted all ${round.maxAttempts} allowable attempts for this round.`,
      });
      return;
    }

    const { promptSubmission, secondaryOutput } = req.body;
    if (!promptSubmission || typeof promptSubmission !== 'string' || promptSubmission.trim().length === 0) {
      res.status(400).json({ error: 'Prompt submission cannot be empty' });
      return;
    }

    const challenge = db.challenges.find((c) => c.roundId === round.id);
    if (!challenge) {
      res.status(500).json({ error: 'Challenge definition unavailable' });
      return;
    }

    const attemptNumber = participant.attemptsCount + 1;
    const now = new Date();
    const startTime = participant.startedAt ? new Date(participant.startedAt).getTime() : now.getTime();
    const timeTakenSeconds = Math.max(1, Math.round((now.getTime() - startTime) / 1000));

    // Evaluate submission with AI / Rubric engine
    const evaluation = await evaluateSubmission(challenge, promptSubmission, secondaryOutput);

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const studentProfile = db.studentProfiles.find((p) => p.userId === user.id)!;

    const submission: Submission = {
      id: submissionId,
      roundId: round.id,
      roundTitle: round.title,
      studentId: user.id,
      studentName: studentProfile.fullName,
      collegeName: studentProfile.collegeName,
      department: studentProfile.department,
      academicYear: studentProfile.academicYear,
      attemptNumber,
      promptSubmission: promptSubmission.trim(),
      secondaryOutput: secondaryOutput ? secondaryOutput.trim() : undefined,
      submittedAt: now.toISOString(),
      timeTakenSeconds,
      status: 'EVALUATED',
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      feedback: evaluation.feedback,
      criterionScores: evaluation.criterionScores,
      evaluationMethodUsed: round.evaluationMethod,
      evaluatedBy: evaluation.evaluatedBy,
      evaluatedAt: evaluation.evaluatedAt,
    };

    db.submissions.push(submission);

    // Update participant record
    participant.attemptsCount = attemptNumber;
    participant.remainingAttempts = Math.max(0, round.maxAttempts - attemptNumber);
    participant.highestScore = Math.max(participant.highestScore || 0, evaluation.score);
    participant.finalScore = participant.highestScore;
    participant.timeTakenSeconds = timeTakenSeconds;
    participant.status = participant.remainingAttempts === 0 ? 'COMPLETED' as any : 'EVALUATED';

    db.addNotification(
      user.id,
      `Attempt ${attemptNumber} Evaluated`,
      `Your submission for ${round.title} (Attempt ${attemptNumber} of ${round.maxAttempts}) was scored. ${participant.remainingAttempts} attempt(s) remaining.`,
      'EVALUATED'
    );

    db.logAudit(
      user.id,
      studentProfile.fullName,
      'student',
      'SUBMISSION_RECORDED',
      'SUBMISSION',
      submissionId,
      `Attempt ${attemptNumber}/${round.maxAttempts} submitted for Round ${round.roundNumber}. Score: ${evaluation.score}/100.`
    );

    db.save();

    res.status(201).json({
      success: true,
      submission,
      participant,
      message:
        participant.remainingAttempts > 0
          ? `Attempt ${attemptNumber} recorded! You have ${participant.remainingAttempts} attempt remaining.`
          : `Final attempt ${attemptNumber} recorded. Round submission closed.`,
    });
  } catch (err) {
    console.error('Submission handling error:', err);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// ----------------------------------------------------
// PROCTORING & INTEGRITY MONITORING
// ----------------------------------------------------

// POST /api/proctoring/event (Tab switch, window blur, fullscreen exit)
app.post('/api/proctoring/event', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'student') {
    res.json({ ok: true });
    return;
  }

  const { roundId, eventType, eventDetails } = req.body;
  const round = db.rounds.find((r) => r.id === roundId);
  if (!round) {
    res.status(404).json({ error: 'Round not found' });
    return;
  }

  const participant = db.roundParticipants.find((p) => p.roundId === roundId && p.studentId === user.id);
  if (!participant || participant.isDisqualified) {
    res.json({ participant, disqualified: participant?.isDisqualified || false });
    return;
  }

  participant.tabSwitchCount = (participant.tabSwitchCount || 0) + 1;
  const warningNumber = participant.tabSwitchCount;

  let actionTaken: 'WARNING' | 'FLAGGED_FOR_REVIEW' | 'AUTO_DISQUALIFIED' = 'WARNING';

  // Configurable integrity policy
  if (round.strictTabSwitchDisqualification && warningNumber >= round.maxTabSwitchWarnings) {
    actionTaken = 'AUTO_DISQUALIFIED';
    participant.isDisqualified = true;
    participant.status = 'DISQUALIFIED';
    participant.disqualificationReason = `Automated proctoring violation: ${warningNumber} window blur/tab switch events detected.`;
    participant.disqualifiedAt = new Date().toISOString();

    db.addNotification(
      user.id,
      'Disqualification Notice',
      `You have been disqualified from ${round.title} due to exceeding allowable window focus violations (${warningNumber}/${round.maxTabSwitchWarnings}).`,
      'DISQUALIFIED'
    );

    db.logAudit(
      'system',
      'Proctoring Engine',
      'system',
      'PARTICIPANT_DISQUALIFIED',
      'ROUND_PARTICIPANT',
      participant.id,
      `Student ${participant.studentName} automatically disqualified for ${warningNumber} focus violations.`
    );
  } else if (warningNumber > 1) {
    actionTaken = 'FLAGGED_FOR_REVIEW';
  }

  const studentProfile = db.studentProfiles.find((p) => p.userId === user.id);
  const proctoringEvent = {
    id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roundId,
    studentId: user.id,
    studentName: studentProfile?.fullName || user.username,
    collegeName: studentProfile?.collegeName || 'Unknown',
    eventType: eventType || 'TAB_SWITCH',
    timestamp: new Date().toISOString(),
    eventDetails: eventDetails || `Window lost focus (Event #${warningNumber})`,
    warningNumber,
    actionTaken,
    isResolvedByAdmin: false,
  };

  db.proctoringEvents.push(proctoringEvent);
  db.save();

  res.json({
    warningNumber,
    maxWarnings: round.maxTabSwitchWarnings,
    actionTaken,
    isDisqualified: participant.isDisqualified,
    message: participant.isDisqualified
      ? 'Integrity threshold breached. Round access terminated.'
      : `Proctoring Warning (${warningNumber}/${round.maxTabSwitchWarnings}): Window focus required.`,
  });
});

// GET /api/admin/proctoring-events
app.get('/api/admin/proctoring-events', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json(db.proctoringEvents);
});

// POST /api/admin/participants/:id/disqualify (Admin manual disqualification)
app.post('/api/admin/participants/:id/disqualify', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const participant = db.roundParticipants.find((p) => p.id === req.params.id);
  if (!participant) {
    res.status(404).json({ error: 'Participant not found' });
    return;
  }

  const { reason } = req.body;
  participant.isDisqualified = true;
  participant.status = 'DISQUALIFIED';
  participant.disqualificationReason = reason || 'Disqualified by Competition Administrator';
  participant.disqualifiedAt = new Date().toISOString();

  db.logAudit(
    req.user!.id,
    req.user!.username,
    'admin',
    'PARTICIPANT_DISQUALIFIED_MANUAL',
    'ROUND_PARTICIPANT',
    participant.id,
    `Admin disqualified ${participant.studentName} from round ${participant.roundId}. Reason: ${reason}`
  );

  db.save();
  res.json({ success: true, participant });
});

// POST /api/admin/participants/:id/reinstate (Admin reinstatement after review)
app.post('/api/admin/participants/:id/reinstate', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const participant = db.roundParticipants.find((p) => p.id === req.params.id);
  if (!participant) {
    res.status(404).json({ error: 'Participant not found' });
    return;
  }

  participant.isDisqualified = false;
  participant.status = 'IN_PROGRESS';
  participant.disqualificationReason = null;
  participant.disqualifiedAt = null;

  db.logAudit(
    req.user!.id,
    req.user!.username,
    'admin',
    'PARTICIPANT_REINSTATED',
    'ROUND_PARTICIPANT',
    participant.id,
    `Admin reinstated ${participant.studentName} in round ${participant.roundId}`
  );

  db.save();
  res.json({ success: true, participant });
});

// ----------------------------------------------------
// SUBMISSIONS & EVALUATIONS (ADMIN)
// ----------------------------------------------------

// GET /api/admin/submissions
app.get('/api/admin/submissions', authenticate, requireAdmin, (req: Request, res: Response) => {
  const { roundId, college, search } = req.query;
  let list = [...db.submissions];

  if (roundId) {
    list = list.filter((s) => s.roundId === roundId);
  }
  if (college) {
    list = list.filter((s) => s.collegeName.toLowerCase().includes(String(college).toLowerCase()));
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.collegeName.toLowerCase().includes(q) ||
        s.promptSubmission.toLowerCase().includes(q)
    );
  }

  // Sort latest first
  list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  res.json(list);
});

// PUT /api/admin/submissions/:id/override (Admin score edit & note)
app.put('/api/admin/submissions/:id/override', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const submission = db.submissions.find((s) => s.id === req.params.id);
  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  const { score, adminNotes } = req.body;
  const previousScore = submission.score;
  submission.score = Math.min(submission.maxScore, Math.max(0, Number(score)));
  submission.adminOverrideNotes = adminNotes || 'Score adjusted by administrator.';
  submission.evaluatedBy = 'admin';

  // Update participant's highest score
  const participant = db.roundParticipants.find((p) => p.roundId === submission.roundId && p.studentId === submission.studentId);
  if (participant) {
    const allSubs = db.submissions.filter((s) => s.roundId === submission.roundId && s.studentId === submission.studentId);
    participant.highestScore = Math.max(...allSubs.map((s) => s.score || 0));
    participant.finalScore = participant.highestScore;
  }

  db.logAudit(
    req.user!.id,
    req.user!.username,
    'admin',
    'SCORE_OVERRIDDEN',
    'SUBMISSION',
    submission.id,
    `Admin updated score from ${previousScore} to ${submission.score} for ${submission.studentName}`
  );

  db.save();
  res.json({ success: true, submission });
});

// ----------------------------------------------------
// LEADERBOARD & RESULTS
// ----------------------------------------------------

// GET /api/leaderboard (Public & Student access controlled)
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const roundId = req.query.roundId as string | undefined;

  // Check if caller is admin
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = db.users.find((u) => u.id === payload.userId);
      if (user && user.role === 'admin') isAdmin = true;
    } catch (e) {
      // ignore
    }
  }

  // If not admin, check if results are published
  if (!isAdmin) {
    if (roundId) {
      const round = db.rounds.find((r) => r.id === roundId);
      if (!round || !round.isResultsPublished) {
        res.json({
          published: false,
          entries: [],
          message: 'Official results for this round have not been published yet.',
        });
        return;
      }
    } else {
      // Overall leaderboard: show if at least one round published
      const anyPublished = db.rounds.some((r) => r.isResultsPublished);
      if (!anyPublished) {
        res.json({
          published: false,
          entries: [],
          message: 'Championship standings will be published once Round 1 concludes.',
        });
        return;
      }
    }
  }

  const entries = db.computeLeaderboard(roundId);
  res.json({
    published: true,
    entries,
  });
});

// GET /api/results/public (Public results page data)
app.get('/api/results/public', (_req: Request, res: Response) => {
  const publishedRounds = db.rounds.filter((r) => r.isResultsPublished);
  const overallLeaderboard = db.computeLeaderboard();
  const topWinners = overallLeaderboard.filter((e) => e.isTopThree);

  // College medal standings
  const collegeMap = new Map<string, { college: string; totalScore: number; participantsCount: number; gold: number; silver: number; bronze: number }>();

  overallLeaderboard.forEach((e) => {
    if (!collegeMap.has(e.collegeName)) {
      collegeMap.set(e.collegeName, {
        college: e.collegeName,
        totalScore: 0,
        participantsCount: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
      });
    }
    const c = collegeMap.get(e.collegeName)!;
    c.totalScore += e.totalScore;
    c.participantsCount += 1;
    if (e.rank === 1) c.gold += 1;
    if (e.rank === 2) c.silver += 1;
    if (e.rank === 3) c.bronze += 1;
  });

  const collegeStandings = Array.from(collegeMap.values()).sort((a, b) => b.totalScore - a.totalScore);

  res.json({
    publishedRounds,
    topWinners,
    collegeStandings,
    overallLeaderboard: publishedRounds.length > 0 ? overallLeaderboard : [],
  });
});

// ----------------------------------------------------
// ANNOUNCEMENTS & NOTIFICATIONS
// ----------------------------------------------------

app.get('/api/announcements', (_req: Request, res: Response) => {
  res.json(db.announcements);
});

app.post('/api/admin/announcements', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { title, content, priority, roundId } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  const ann = {
    id: `ann_${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    priority: priority || 'NORMAL',
    roundId: roundId || null,
    author: req.user?.username || 'Championship Committee',
    createdAt: new Date().toISOString(),
  };

  db.announcements.unshift(ann);
  db.logAudit(req.user!.id, req.user!.username, 'admin', 'ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT', ann.id, `Created: "${ann.title}"`);
  db.save();
  res.status(201).json(ann);
});

app.delete('/api/admin/announcements/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const idx = db.announcements.findIndex((a) => a.id === req.params.id);
  if (idx !== -1) {
    db.announcements.splice(idx, 1);
    db.save();
  }
  res.json({ success: true });
});

app.get('/api/notifications', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const list = db.notifications.filter((n) => n.userId === req.user!.id);
  res.json(list);
});

app.post('/api/notifications/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.user!.id);
  if (notif) {
    notif.isRead = true;
    db.save();
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// ADMIN OVERVIEW & AUDIT LOGS
// ----------------------------------------------------

app.get('/api/admin/stats', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json(db.getAdminStats());
});

app.get('/api/admin/audit-logs', authenticate, requireAdmin, (_req: Request, res: Response) => {
  res.json(db.auditLogs);
});

app.get('/api/admin/participants', authenticate, requireAdmin, (_req: Request, res: Response) => {
  const list = db.studentProfiles.map((p) => {
    const user = db.users.find((u) => u.id === p.userId);
    const roundActivities = db.roundParticipants.filter((rp) => rp.studentId === p.userId);
    return {
      ...p,
      email: user?.email,
      username: user?.username,
      roundActivities,
    };
  });
  res.json(list);
});

// ----------------------------------------------------
// VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
// ----------------------------------------------------

async function startServer() {
  await db.initialize();
  
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LEXORA Championship Engine] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LEXORA] Server startup error:', err);
  process.exit(1);
});
