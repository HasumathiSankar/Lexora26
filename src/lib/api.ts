import type {
  AuthSession,
  Round,
  Challenge,
  RoundParticipant,
  StudentProfile,
  Submission,
  ProctoringEvent,
  LeaderboardEntry,
  CompetitionStatistics,
  Announcement,
  AppNotification,
  AuditLog,
  AdminStats,
} from '../shared/types.ts';

const TOKEN_KEY = 'lexora_auth_token';
const USER_KEY = 'lexora_auth_user';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveApiUrl(endpoint: string): string {
  if (!endpoint) return endpoint;
  if (/^https?:\/\//.test(endpoint)) return endpoint;
  return `${API_BASE_URL}${endpoint}`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthSession['user'] | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(resolveApiUrl(endpoint), {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Authentication
  register: (payload: {
    fullName: string;
    collegeName: string;
    department: string;
    academicYear: string;
    phoneNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => request<AuthSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { identifier: string; password: string; role?: 'student' | 'admin' }) =>
    request<AuthSession>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  getCurrentUser: () => request<{ user: AuthSession['user'] }>('/api/auth/me'),

  logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Rounds
  getRounds: () => request<Round[]>('/api/rounds'),
  getRound: (id: string) => request<Round>(`/api/rounds/${id}`),

  // Admin Round Control
  controlRound: (id: string, action: string, data?: { timingMode?: string; durationMinutes?: number }) =>
    request<{ success: boolean; round: Round }>(`/api/admin/rounds/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    }),

  updateRoundSettings: (id: string, payload: Partial<Round>) =>
    request<{ success: boolean; round: Round }>(`/api/admin/rounds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Challenge & Workspace
  getChallenge: (roundId: string) => request<{ challenge: Challenge; round: Round }>(`/api/rounds/${roundId}/challenge`),

  updateChallenge: (id: string, payload: Partial<Challenge>) =>
    request<{ success: boolean; challenge: Challenge }>(`/api/admin/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  startAttempt: (roundId: string) =>
    request<{
      participant: RoundParticipant;
      remainingSeconds: number;
      durationSeconds: number;
      serverTimestamp: string;
    }>(`/api/rounds/${roundId}/start-attempt`, { method: 'POST' }),

  getMyRoundStatus: (roundId: string) =>
    request<{
      participant?: RoundParticipant;
      submissions: Submission[];
      remainingSeconds: number;
      roundStatus: string;
      isResultsPublished: boolean;
    }>(`/api/rounds/${roundId}/my-status`),

  submitChallenge: (roundId: string, payload: { promptSubmission: string; secondaryOutput?: string; idempotencyKey?: string }) =>
    request<{
      success: boolean;
      submission: Submission;
      participant: RoundParticipant;
      message: string;
    }>(`/api/rounds/${roundId}/submit`, { method: 'POST', body: JSON.stringify(payload) }),

  // Proctoring
  reportProctoringEvent: (roundId: string, eventType: string, eventDetails: string) =>
    request<{
      warningNumber: number;
      maxWarnings: number;
      actionTaken: string;
      isDisqualified: boolean;
      message: string;
    }>('/api/proctoring/event', {
      method: 'POST',
      body: JSON.stringify({ roundId, eventType, eventDetails }),
    }),

  getProctoringEvents: () => request<ProctoringEvent[]>('/api/admin/proctoring-events'),

  disqualifyParticipant: (id: string, reason: string) =>
    request<{ success: boolean; participant: RoundParticipant }>(`/api/admin/participants/${id}/disqualify`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  reinstateParticipant: (id: string) =>
    request<{ success: boolean; participant: RoundParticipant }>(`/api/admin/participants/${id}/reinstate`, {
      method: 'POST',
    }),

  // Submissions & Evaluations
  getSubmissions: (params?: { roundId?: string; college?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.roundId) query.set('roundId', params.roundId);
    if (params?.college) query.set('college', params.college);
    if (params?.search) query.set('search', params.search);
    return request<Submission[]>(`/api/admin/submissions?${query.toString()}`);
  },

  overrideScore: (id: string, payload: { score: number; adminNotes: string }) =>
    request<{ success: boolean; submission: Submission }>(`/api/admin/submissions/${id}/override`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Leaderboard & Results
  getLeaderboard: (roundId?: string) => {
    const query = roundId ? `?roundId=${roundId}` : '';
    return request<{ published: boolean; entries: LeaderboardEntry[]; message?: string }>(`/api/leaderboard${query}`);
  },

  getPublicResults: () =>
    request<{
      publishedRounds: Round[];
      topWinners: LeaderboardEntry[];
      competitionStatistics: CompetitionStatistics;
      collegeStandings: { college: string; totalScore: number; participantsCount: number; gold: number; silver: number; bronze: number }[];
      overallLeaderboard: LeaderboardEntry[];
    }>('/api/results/public'),

  // Announcements & Notifications
  getAnnouncements: () => request<Announcement[]>('/api/announcements'),
  createAnnouncement: (payload: { title: string; content: string; priority?: string; roundId?: string }) =>
    request<Announcement>('/api/admin/announcements', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAnnouncement: (id: string) => request<{ success: boolean }>(`/api/admin/announcements/${id}`, { method: 'DELETE' }),

  getNotifications: () => request<AppNotification[]>('/api/notifications'),
  markNotificationRead: (id: string) => request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  // Admin stats, participants & logs
  getAdminStats: () => request<AdminStats>('/api/admin/stats'),
  getAuditLogs: () => request<AuditLog[]>('/api/admin/audit-logs'),
  getParticipants: () =>
    request<
      (StudentProfile & {
        email?: string;
        username?: string;
        roundActivities: RoundParticipant[];
      })[]
    >('/api/admin/participants'),
};
