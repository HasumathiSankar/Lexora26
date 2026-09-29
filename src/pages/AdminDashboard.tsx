import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import type {
  Round,
  Challenge,
  Submission,
  ProctoringEvent,
  Announcement,
  AuditLog,
  AdminStats,
  LeaderboardEntry,
  StudentProfile,
  RoundParticipant,
} from '../shared/types.ts';
import {
  ShieldAlert,
  Users,
  Play,
  Pause,
  StopCircle,
  CheckCircle,
  Eye,
  FileEdit,
  Activity,
  Award,
  Bell,
  Sliders,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  Lock,
  Unlock,
  Radio,
  FileCode2,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'rounds'
  | 'challenges'
  | 'submissions'
  | 'evaluation'
  | 'proctoring'
  | 'participants'
  | 'leaderboard'
  | 'announcements'
  | 'audit';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Selected round for editing / challenge config
  const [selectedRoundId, setSelectedRoundId] = useState<string>('round_1');
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);

  // Modal / drawer states
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [overrideScoreInput, setOverrideScoreInput] = useState<string>('');
  const [overrideNotesInput, setOverrideNotesInput] = useState<string>('');

  // Search & filters
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionRoundFilter, setSubmissionRoundFilter] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');

  // Announcement form
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPriority, setNewAnnPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  // Feedback alerts
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllAdminData = useCallback(async () => {
    try {
      const [
        statsData,
        roundsData,
        subsData,
        procData,
        annsData,
        logsData,
        partsData,
        lbData,
      ] = await Promise.all([
        api.getAdminStats(),
        api.getRounds(),
        api.getSubmissions(),
        api.getProctoringEvents(),
        api.getAnnouncements(),
        api.getAuditLogs(),
        api.getParticipants(),
        api.getLeaderboard(),
      ]);

      setStats(statsData);
      setRounds(roundsData);
      setSubmissions(subsData);
      setProctoringEvents(procData);
      setAnnouncements(annsData);
      setAuditLogs(logsData);
      setParticipants(partsData);
      setLeaderboard(lbData.entries || []);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAdminData();
    const interval = setInterval(fetchAllAdminData, 20000);
    return () => clearInterval(interval);
  }, [fetchAllAdminData]);

  // Load challenge whenever selectedRoundId changes
  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await api.getChallenge(selectedRoundId);
        setCurrentChallenge(res.challenge);
      } catch (err) {
        console.warn('Failed to load challenge for round:', selectedRoundId);
      }
    }
    loadChallenge();
  }, [selectedRoundId]);

  // Round activation controls
  const handleRoundAction = async (roundId: string, action: string) => {
    try {
      setActionMessage(null);
      setErrorMessage(null);
      const res = await api.controlRound(roundId, action);
      setActionMessage(`Round action ${action} executed successfully.`);
      await fetchAllAdminData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Round action failed.');
    }
  };

  const handleSaveScoringConfig = async (round: Round) => {
    const weights = round.scoringWeights || {
      promptQuality: 50,
      taskAchievement: 30,
      timeEfficiency: 10,
      attemptEfficiency: 10,
    };
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value), 0);
    if (Math.abs(totalWeight - 100) >= 0.001) {
      setErrorMessage('Scoring weights must total exactly 100%.');
      return;
    }
    try {
      const response = await api.updateRoundSettings(round.id, {
        durationMinutes: Number(round.durationMinutes),
        maxAttempts: Number(round.maxAttempts),
        scoringWeights: weights,
        completionThreshold: Number(round.completionThreshold ?? 80),
        leaderboardEligible: round.leaderboardEligible !== false,
      });
      setRounds((current) => current.map((item) => item.id === round.id ? response.round : item));
      setActionMessage(`Scoring settings saved for ${round.title}.`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save scoring settings.');
    }
  };

  // Score override submission
  const handleScoreOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    try {
      const score = Number(overrideScoreInput);
      if (isNaN(score) || score < 0 || score > selectedSubmission.maxScore) {
        alert(`Score must be between 0 and ${selectedSubmission.maxScore}`);
        return;
      }
      await api.overrideScore(selectedSubmission.id, {
        score,
        adminNotes: overrideNotesInput,
      });
      setActionMessage(`Score updated to ${score} for ${selectedSubmission.studentName}.`);
      setSelectedSubmission(null);
      await fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to override score');
    }
  };

  // Re-instate disqualified participant
  const handleReinstate = async (participantId: string) => {
    if (!confirm('Reinstate this participant and clear active disqualification?')) return;
    try {
      await api.reinstateParticipant(participantId);
      setActionMessage('Participant successfully reinstated.');
      await fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to reinstate');
    }
  };

  // Create announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      await api.createAnnouncement({
        title: newAnnTitle,
        content: newAnnContent,
        priority: newAnnPriority,
      });
      setNewAnnTitle('');
      setNewAnnContent('');
      setActionMessage('Official announcement broadcasted.');
      await fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to post announcement');
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((s) => {
    const matchesRound = !submissionRoundFilter || s.roundId === submissionRoundFilter;
    const matchesSearch =
      !submissionSearch ||
      s.studentName.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.collegeName.toLowerCase().includes(submissionSearch.toLowerCase()) ||
      s.promptSubmission.toLowerCase().includes(submissionSearch.toLowerCase());
    return matchesRound && matchesSearch;
  });

  // Filtered participants
  const filteredParticipants = participants.filter((p) => {
    if (!participantSearch) return true;
    const q = participantSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.collegeName.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.registrationNumber.toLowerCase().includes(q)
    );
  });

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  return (
    <div className="min-h-screen bg-[#FCF8F5] pb-24">
      {/* Top Header */}
      <section className="bg-white border-b border-[#F9DBBD] pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A53860] mb-1">
                <ShieldAlert className="w-4 h-4 text-[#DA627D]" />
                <span>Executive Championship Control Center</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#220914]">
                LEXORA Competition Operations
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAllAdminData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#A53860] bg-[#FCF4EB] hover:bg-[#F9DBBD] border border-[#FFA5AB] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Live Data</span>
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="font-bold">×</button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="font-bold">×</button>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#F9DBBD]/60 text-xs font-bold">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'rounds', label: 'Round Controls', icon: Play },
              { id: 'challenges', label: 'Challenge Editor', icon: FileEdit },
              { id: 'submissions', label: 'Submission Monitor', icon: Eye },
              { id: 'evaluation', label: 'Evaluation Center', icon: Award },
              { id: 'proctoring', label: 'Proctoring & DQ', icon: ShieldAlert },
              { id: 'participants', label: 'Participants Directory', icon: Users },
              { id: 'leaderboard', label: 'Leaderboard & Results', icon: Trophy },
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'audit', label: 'Audit Trail', icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#220914] text-[#F9DBBD] shadow-sm'
                      : 'text-gray-600 hover:text-[#A53860] hover:bg-[#FCF4EB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Tab Views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#F9DBBD] shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Registered Students</span>
                <span className="font-serif text-3xl font-bold text-[#A53860] mt-1 block">{stats?.totalRegisteredStudents || 0}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Across participating colleges</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#F9DBBD] shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Active Round</span>
                <span className="font-serif text-lg font-bold text-[#DA627D] mt-2 block truncate">
                  {stats?.activeRoundTitle || 'None Active'}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">Administrator controlled</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#F9DBBD] shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Submissions</span>
                <span className="font-serif text-3xl font-bold text-[#A53860] mt-1 block">{stats?.totalSubmissions || 0}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Attempt 1 & 2 records</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#FFA5AB] shadow-sm">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Disqualified Flags</span>
                <span className="font-serif text-3xl font-bold text-red-600 mt-1 block">{stats?.disqualifiedParticipantsCount || 0}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Proctoring infractions</span>
              </div>
            </div>

            {/* Live Round Status Cards */}
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#F9DBBD]/60 pb-3">
                <h3 className="font-serif text-lg font-bold text-[#220914]">
                  Official Championship Rounds Status
                </h3>
                <span className="text-xs text-gray-500">
                  Click 'Round Controls' tab to toggle activation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rounds.map((r) => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      r.status === 'ACTIVE'
                        ? 'border-[#DA627D] bg-[#FCF4EB]'
                        : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono text-[#DA627D]">Round 0{r.roundNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        r.status === 'ACTIVE' ? 'bg-[#DA627D] text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-bold text-[#220914]">{r.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1">{r.durationMinutes} mins · Max 2 attempts</p>
                    <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Results:</span>
                      <span className={r.isResultsPublished ? 'text-emerald-700 font-bold' : 'text-gray-400'}>
                        {r.isResultsPublished ? 'Published' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Activity Feeds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Submissions */}
              <div className="p-6 rounded-2xl bg-white border border-[#F9DBBD] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#F9DBBD]/60 pb-3">
                  <h4 className="font-serif text-base font-bold text-[#220914]">Recent Submissions</h4>
                  <button onClick={() => setActiveTab('submissions')} className="text-xs text-[#DA627D] font-bold hover:underline">
                    View All ({submissions.length}) →
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  {submissions.slice(0, 5).map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-[#FCF8F5] border border-[#F9DBBD] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#220914]">{s.studentName}</span>
                        <div className="text-[11px] text-gray-500">{s.collegeName} · {s.roundTitle}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-serif text-base font-bold text-[#DA627D]">{s.score}/100</span>
                        <span className="text-[10px] text-gray-400 block">Attempt {s.attemptNumber}</span>
                      </div>
                    </div>
                  ))}
                  {submissions.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">No submissions received yet.</p>}
                </div>
              </div>

              {/* Recent Proctoring Alerts */}
              <div className="p-6 rounded-2xl bg-white border border-[#FFA5AB] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#FFA5AB]/40 pb-3">
                  <h4 className="font-serif text-base font-bold text-[#220914]">Recent Proctoring Events</h4>
                  <button onClick={() => setActiveTab('proctoring')} className="text-xs text-[#A53860] font-bold hover:underline">
                    Monitor ({proctoringEvents.length}) →
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  {proctoringEvents.slice(0, 5).map((e) => (
                    <div key={e.id} className="p-3 rounded-xl bg-red-50/50 border border-red-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-red-900">{e.studentName}</span>
                        <div className="text-[11px] text-gray-600">{e.eventType} · {e.eventDetails}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        e.actionTaken === 'AUTO_DISQUALIFIED' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {e.actionTaken}
                      </span>
                    </div>
                  ))}
                  {proctoringEvents.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">Zero proctoring infractions logged.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ROUND CONTROLS TAB */}
        {activeTab === 'rounds' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#220914]">
                  Administrator Round Lifecycle Management
                </h3>
                <p className="text-xs text-gray-500">
                  Control the start, pause, resumption, closure, and publication of all 4 competition stages.
                </p>
              </div>

              <div className="space-y-6">
                {rounds.map((round) => (
                  <div
                    key={round.id}
                    className={`p-6 rounded-2xl border-2 transition-all space-y-4 ${
                      round.status === 'ACTIVE'
                        ? 'border-[#DA627D] bg-white shadow-md'
                        : 'border-[#F9DBBD] bg-[#FCF8F5]/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F9DBBD]/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#DA627D] font-mono">Round 0{round.roundNumber}</span>
                          <span aria-hidden="true" className="text-gray-300">·</span>
                          <span className="font-serif text-lg font-bold text-[#220914]">{round.title}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            round.status === 'ACTIVE' ? 'bg-[#DA627D] text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {round.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{round.subtitle}</p>
                      </div>

                      {/* Control Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {round.status !== 'ACTIVE' ? (
                          <button
                            onClick={() => handleRoundAction(round.id, 'START')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start Round</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRoundAction(round.id, 'PAUSE')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white transition-all"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Pause</span>
                            </button>
                            <button
                              onClick={() => handleRoundAction(round.id, 'END')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white transition-all"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                              <span>End Round</span>
                            </button>
                          </>
                        )}

                        {/* Publish / Unpublish Toggle */}
                        {round.isResultsPublished ? (
                          <button
                            onClick={() => handleRoundAction(round.id, 'UNPUBLISH_RESULTS')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Retract Public Results</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoundAction(round.id, 'PUBLISH_RESULTS')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#A53860] hover:bg-[#822446] text-white shadow-sm transition-all"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Publish Official Results</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500 block">Duration:</span>
                        <span className="font-bold text-[#A53860]">{round.durationMinutes} Minutes</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Timing Mode:</span>
                        <span className="font-bold text-[#220914] capitalize">{round.timingMode} Timer</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Max Attempts:</span>
                        <span className="font-bold text-[#220914]">{round.maxAttempts} Attempts</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Strict Proctoring:</span>
                        <span className="font-bold text-red-600">
                          {round.strictTabSwitchDisqualification ? `Enabled (Max ${round.maxTabSwitchWarnings} warnings)` : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#F9DBBD]/60 pt-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Time limit (min)
                          <input type="number" min={1} step={1} value={round.durationMinutes} onChange={(e) => setRounds((current) => current.map((item) => item.id === round.id ? { ...item, durationMinutes: Number(e.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                        </label>
                        <label className="text-[10px] font-bold uppercase text-gray-600">
                          Max attempts
                          <input type="number" min={1} step={1} value={round.maxAttempts} onChange={(e) => setRounds((current) => current.map((item) => item.id === round.id ? { ...item, maxAttempts: Number(e.target.value) } : item))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                        </label>
                        {([
                          ['promptQuality', 'Prompt quality'],
                          ['taskAchievement', 'Achievement'],
                          ['timeEfficiency', 'Time'],
                          ['attemptEfficiency', 'Attempts'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="text-[10px] font-bold uppercase text-gray-600">
                            {label} (%)
                            <input type="number" min={0} max={100} step={0.1} value={round.scoringWeights?.[key] ?? ({ promptQuality: 50, taskAchievement: 30, timeEfficiency: 10, attemptEfficiency: 10 }[key])} onChange={(e) => setRounds((current) => current.map((item) => item.id === round.id ? { ...item, scoringWeights: { ...(item.scoringWeights || { promptQuality: 50, taskAchievement: 30, timeEfficiency: 10, attemptEfficiency: 10 }), [key]: Number(e.target.value) } } : item))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                          <label className="inline-flex items-center gap-2 font-medium text-gray-700">
                            <input type="checkbox" checked={round.leaderboardEligible !== false} onChange={(e) => setRounds((current) => current.map((item) => item.id === round.id ? { ...item, leaderboardEligible: e.target.checked } : item))} />
                            Eligible for leaderboard
                          </label>
                          <label className="inline-flex items-center gap-2 font-medium text-gray-700">
                            Completion threshold
                            <input type="number" min={1} max={100} step={0.1} value={round.completionThreshold ?? 80} onChange={(e) => setRounds((current) => current.map((item) => item.id === round.id ? { ...item, completionThreshold: Number(e.target.value) } : item))} className="w-20 rounded-lg border border-gray-300 p-2 text-xs" />
                          </label>
                          <span className="text-[10px] text-gray-500">Weight total: {Object.values(round.scoringWeights || { promptQuality: 50, taskAchievement: 30, timeEfficiency: 10, attemptEfficiency: 10 }).reduce((sum, value) => sum + Number(value), 0)}%</span>
                        </div>
                        <button onClick={() => handleSaveScoringConfig(round)} className="rounded-lg bg-[#A53860] px-4 py-2 text-xs font-bold text-white hover:bg-[#822446]">Save Scoring Settings</button>
                      </div>
                      <p className="text-[10px] text-gray-500">Last scoring update: {round.scoringConfigUpdatedAt ? new Date(round.scoringConfigUpdatedAt).toLocaleString() : 'Default settings'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. CHALLENGE MANAGEMENT TAB */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#220914]">
                    Challenge Specification & Rubric Configuration
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure tasks, expected outputs, negative constraints, and AI evaluation scoring weights.
                  </p>
                </div>

                {/* Round Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#A53860]">Select Stage:</span>
                  <select
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    className="p-2 rounded-xl border border-gray-300 text-xs font-bold text-[#220914] bg-white"
                  >
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>
                        Round 0{r.roundNumber}: {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentChallenge ? (
                <div className="space-y-5 border-t border-[#F9DBBD]/60 pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Challenge Title
                      </label>
                      <input
                        type="text"
                        value={currentChallenge.title}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, title: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:border-[#DA627D]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Task Overview Kicker
                      </label>
                      <input
                        type="text"
                        value={currentChallenge.taskOverview}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, taskOverview: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#DA627D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Detailed Task Instructions
                    </label>
                    <textarea
                      rows={4}
                      value={currentChallenge.detailedTask}
                      onChange={(e) => setCurrentChallenge({ ...currentChallenge, detailedTask: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#DA627D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Target Scenario / Benchmark Output (Shown to student in workspace)
                    </label>
                    <textarea
                      rows={5}
                      value={currentChallenge.targetScenario}
                      onChange={(e) => setCurrentChallenge({ ...currentChallenge, targetScenario: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-300 font-mono text-xs focus:outline-none focus:border-[#DA627D]"
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-[#F9DBBD] p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A53860]">Round-specific evaluation criteria</h4>
                    {currentChallenge.rubric.map((criterion, index) => (
                      <div key={criterion.id} className="grid grid-cols-1 gap-2 border-t border-[#F9DBBD]/60 pt-3 sm:grid-cols-12">
                        <label className="text-[10px] font-bold text-gray-600 sm:col-span-3">
                          Criterion
                          <input value={criterion.criterion} onChange={(e) => setCurrentChallenge({ ...currentChallenge, rubric: currentChallenge.rubric.map((item, itemIndex) => itemIndex === index ? { ...item, criterion: e.target.value } : item) })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                        </label>
                        <label className="text-[10px] font-bold text-gray-600 sm:col-span-5">
                          Evaluation guidance
                          <input value={criterion.description} onChange={(e) => setCurrentChallenge({ ...currentChallenge, rubric: currentChallenge.rubric.map((item, itemIndex) => itemIndex === index ? { ...item, description: e.target.value } : item) })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                        </label>
                        <label className="text-[10px] font-bold text-gray-600 sm:col-span-2">
                          Weight
                          <input type="number" min={0} step={0.1} value={criterion.weight} onChange={(e) => setCurrentChallenge({ ...currentChallenge, rubric: currentChallenge.rubric.map((item, itemIndex) => itemIndex === index ? { ...item, weight: Number(e.target.value) } : item) })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900" />
                        </label>
                        <label className="text-[10px] font-bold text-gray-600 sm:col-span-2">
                          Score component
                          <select value={criterion.category || 'task_achievement'} onChange={(e) => setCurrentChallenge({ ...currentChallenge, rubric: currentChallenge.rubric.map((item, itemIndex) => itemIndex === index ? { ...item, category: e.target.value as 'prompt_quality' | 'task_achievement' } : item) })} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal text-gray-900">
                            <option value="prompt_quality">Prompt quality</option>
                            <option value="task_achievement">Task achievement</option>
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A53860] mb-1">
                      Hidden Expected Answer / Secret Criteria (Admin & AI Judge ONLY - Never exposed to student)
                    </label>
                    <textarea
                      rows={3}
                      value={currentChallenge.hiddenExpectedAnswerOrCriteria || ''}
                      onChange={(e) => setCurrentChallenge({ ...currentChallenge, hiddenExpectedAnswerOrCriteria: e.target.value })}
                      className="w-full p-3 rounded-xl border border-[#DA627D] bg-[#FCF8F5] text-xs font-mono text-[#220914] focus:outline-none"
                    />
                  </div>

                  {currentChallenge.referenceImages?.map((image, index) => (
                    <div key={`${image.title}-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[#F9DBBD] p-3">
                      <label className="text-[11px] font-bold text-gray-700">
                        Reference image title
                        <input
                          type="text"
                          value={image.title}
                          onChange={(e) => setCurrentChallenge({
                            ...currentChallenge,
                            referenceImages: currentChallenge.referenceImages?.map((item, itemIndex) => itemIndex === index ? { ...item, title: e.target.value } : item),
                          })}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal"
                        />
                      </label>
                      <label className="text-[11px] font-bold text-gray-700">
                        Image asset path
                        <input
                          type="text"
                          value={image.src}
                          onChange={(e) => setCurrentChallenge({
                            ...currentChallenge,
                            referenceImages: currentChallenge.referenceImages?.map((item, itemIndex) => itemIndex === index ? { ...item, src: e.target.value } : item),
                          })}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal"
                          placeholder="/reference-images/image-1.svg"
                        />
                      </label>
                      <label className="text-[11px] font-bold text-gray-700">
                        Accessible image description
                        <input
                          type="text"
                          value={image.alt}
                          onChange={(e) => setCurrentChallenge({
                            ...currentChallenge,
                            referenceImages: currentChallenge.referenceImages?.map((item, itemIndex) => itemIndex === index ? { ...item, alt: e.target.value } : item),
                          })}
                          className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs font-normal"
                        />
                      </label>
                    </div>
                  ))}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          await api.updateChallenge(currentChallenge.id, currentChallenge);
                          setActionMessage(`Challenge for ${selectedRound?.title} saved successfully.`);
                        } catch (err: any) {
                          alert(err.message || 'Failed to save challenge');
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#DA627D] hover:bg-[#A53860] text-white shadow transition-all"
                    >
                      Save Challenge Changes
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-6 text-center">Loading challenge data...</p>
              )}
            </div>
          </div>
        )}

        {/* 4. SUBMISSION MONITOR TAB */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#220914]">
                    Real-time Submission Monitor
                  </h3>
                  <p className="text-xs text-gray-500">
                    Inspect all accepted candidate submissions, AI score breakdowns, and execution timestamps.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search candidate / college..."
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D]"
                    />
                  </div>

                  <select
                    value={submissionRoundFilter}
                    onChange={(e) => setSubmissionRoundFilter(e.target.value)}
                    className="p-1.5 text-xs rounded-xl border border-gray-300 bg-white"
                  >
                    <option value="">All Rounds</option>
                    {rounds.map((r) => (
                      <option key={r.id} value={r.id}>Round 0{r.roundNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FCF8F5] text-gray-600 uppercase text-[10px] tracking-wider border-b border-[#F9DBBD]">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">College & Dept</th>
                      <th className="p-3">Round</th>
                      <th className="p-3">Attempt</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Evaluator</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-[#220914]">{sub.studentName}</td>
                        <td className="p-3 text-gray-600">
                          <div>{sub.collegeName}</div>
                          <span className="text-[10px] text-gray-400">{sub.department}</span>
                        </td>
                        <td className="p-3 font-medium text-[#A53860]">{sub.roundTitle}</td>
                        <td className="p-3 font-mono">Attempt {sub.attemptNumber}</td>
                        <td className="p-3 text-gray-500">{sub.timeTakenSeconds}s</td>
                        <td className="p-3">
                          <span className="font-serif font-bold text-sm text-[#DA627D]">
                            {sub.score !== null ? sub.score.toFixed(2) : '—'}
                          </span>
                          <span className="text-gray-400 text-[10px]">/100</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F9DBBD]/50 text-[#A53860]">
                            {sub.evaluatedBy}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setOverrideScoreInput(String(sub.score || ''));
                              setOverrideNotesInput(sub.adminOverrideNotes || '');
                            }}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#DA627D] hover:bg-[#A53860] text-white transition-colors"
                          >
                            Inspect & Grade
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSubmissions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          No submissions matching current criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Submission Detail Modal */}
            {selectedSubmission && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border-2 border-[#DA627D] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#A53860]">
                        Submission Detail: {selectedSubmission.studentName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {selectedSubmission.collegeName} · {selectedSubmission.roundTitle} (Attempt {selectedSubmission.attemptNumber})
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                      Submitted Prompt Content:
                    </label>
                    <pre className="p-4 rounded-xl bg-[#220914] text-[#F9DBBD] font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-56">
                      {selectedSubmission.promptSubmission}
                    </pre>
                  </div>

                  {selectedSubmission.feedback && (
                    <div className="p-3 rounded-xl bg-[#FCF8F5] border border-[#F9DBBD] text-xs">
                      <span className="font-bold text-[#A53860] block mb-0.5">Automated Rubric Feedback:</span>
                      <p>{selectedSubmission.feedback}</p>
                    </div>
                  )}

                  {/* Manual Score Override Form */}
                  <form onSubmit={handleScoreOverride} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <span className="font-bold text-xs text-[#220914] block">Administrator Grade Override</span>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase">Score (Max 100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={overrideScoreInput}
                          onChange={(e) => setOverrideScoreInput(e.target.value)}
                          className="w-full p-2 rounded-lg border border-gray-300 font-bold text-[#DA627D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase">Audit Justification</label>
                        <input
                          type="text"
                          value={overrideNotesInput}
                          onChange={(e) => setOverrideNotesInput(e.target.value)}
                          placeholder="Reason for manual adjustment"
                          className="w-full p-2 rounded-lg border border-gray-300 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission(null)}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#DA627D] text-white hover:bg-[#A53860]"
                      >
                        Save Grade Override
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. EVALUATION CENTER TAB */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#220914]">
                  AI & Rubric Evaluation Control Center
                </h3>
                <p className="text-xs text-gray-500">
                  Every submission is automatically parsed against deterministic rubric criteria using Gemini 3.8 Flash.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[#FCF8F5] border border-[#F9DBBD] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A53860] block">Automated Model</span>
                  <h4 className="font-serif text-base font-bold text-[#220914]">gemini-3.8-flash</h4>
                  <p className="text-xs text-gray-600">Deterministic temperature (0.1) with structured JSON rubric schema.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCF8F5] border border-[#F9DBBD] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A53860] block">Fallback Protocol</span>
                  <h4 className="font-serif text-base font-bold text-[#220914]">Rule & Token Heuristic</h4>
                  <p className="text-xs text-gray-600">Deterministic constraint scoring if offline or API limit encountered.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCF8F5] border border-[#F9DBBD] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A53860] block">Integrity Seal</span>
                  <h4 className="font-serif text-base font-bold text-[#220914]">Audit Preserved</h4>
                  <p className="text-xs text-gray-600">All original candidate prompts and model responses retained.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. PROCTORING & DQ TAB */}
        {activeTab === 'proctoring' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-red-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-red-900">
                    Proctoring & Disqualification Monitor
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live logs of focus losses, tab switches, and candidates flagged or disqualified.
                  </p>
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  {proctoringEvents.length} Recorded Infractions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-50/50 text-gray-600 uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">College</th>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Warning Count</th>
                      <th className="p-3">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proctoringEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-red-50/30">
                        <td className="p-3 font-bold text-gray-900">{e.studentName}</td>
                        <td className="p-3 text-gray-600">{e.collegeName}</td>
                        <td className="p-3 font-mono font-semibold text-red-700">{e.eventType}</td>
                        <td className="p-3 text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</td>
                        <td className="p-3 font-bold">Warning #{e.warningNumber}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            e.actionTaken === 'AUTO_DISQUALIFIED' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {e.actionTaken}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {proctoringEvents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          No proctoring violations recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. PARTICIPANTS DIRECTORY TAB */}
        {activeTab === 'participants' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#220914]">
                    Registered Candidate Directory
                  </h3>
                  <p className="text-xs text-gray-500">
                    Comprehensive roster of all registered students, colleges, and round participation states.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search candidates or colleges..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FCF8F5] text-gray-600 uppercase text-[10px] tracking-wider border-b border-[#F9DBBD]">
                    <tr>
                      <th className="p-3">Reg ID</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Institution</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Year</th>
                      <th className="p-3">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono font-bold text-[#A53860]">{p.registrationNumber}</td>
                        <td className="p-3 font-bold text-[#220914]">{p.fullName}</td>
                        <td className="p-3 text-gray-600">{p.collegeName}</td>
                        <td className="p-3 text-gray-500">{p.department}</td>
                        <td className="p-3 text-gray-500">{p.academicYear}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            p.eligibilityStatus === 'eligible'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-red-50 text-red-800'
                          }`}>
                            {p.eligibilityStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. LEADERBOARD & RESULTS TAB */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#220914]">
                    Championship Leaderboard & Standings
                  </h3>
                  <p className="text-xs text-gray-500">
                    Official ranking calculated by Score (desc), Elapsed Time (asc), Attempts used (asc).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {leaderboard.length} candidates in contention
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FCF8F5] text-gray-600 uppercase text-[10px] tracking-wider border-b border-[#F9DBBD]">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">College</th>
                      <th className="p-3">Rounds Done</th>
                      <th className="p-3">Total Time</th>
                      <th className="p-3">Total Score</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaderboard.map((e) => (
                      <tr key={e.studentId} className={e.isTopThree ? 'bg-[#FCF4EB]/40 font-semibold' : ''}>
                        <td className="p-3 font-serif font-bold text-sm text-[#A53860]">#{e.rank}</td>
                        <td className="p-3 font-bold text-[#220914]">{e.studentName}</td>
                        <td className="p-3 text-gray-600">{e.collegeName}</td>
                        <td className="p-3">{e.roundsCompleted}/4</td>
                        <td className="p-3 text-gray-500">{e.totalTimeSeconds}s</td>
                        <td className="p-3 font-serif text-base font-bold text-[#DA627D]">{e.totalScore.toFixed(2)} pts</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            e.qualificationStatus === 'DISQUALIFIED' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {e.qualificationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 9. ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Announcement form */}
              <div className="lg:col-span-5 p-6 rounded-3xl bg-white border-2 border-[#FFA5AB] shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#A53860]">
                  Broadcast Official Notice
                </h3>
                <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Bulletin Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newAnnTitle}
                      onChange={(e) => setNewAnnTitle(e.target.value)}
                      placeholder="e.g. Round 1 Window Extended by 5 Mins"
                      className="w-full p-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#DA627D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={newAnnPriority}
                      onChange={(e) => setNewAnnPriority(e.target.value as any)}
                      className="w-full p-2 rounded-xl border border-gray-300 text-xs bg-white"
                    >
                      <option value="NORMAL">Normal Advisory</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Detailed Content *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={newAnnContent}
                      onChange={(e) => setNewAnnContent(e.target.value)}
                      placeholder="Enter announcement text for contestants..."
                      className="w-full p-3 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#DA627D]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#DA627D] hover:bg-[#A53860] text-white shadow transition-all"
                  >
                    Broadcast to All Contestants
                  </button>
                </form>
              </div>

              {/* Existing notices */}
              <div className="lg:col-span-7 p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#220914]">
                  Active Announcements
                </h3>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl bg-[#FCF8F5] border border-[#F9DBBD] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#A53860] text-xs">{a.title}</span>
                        <button
                          onClick={async () => {
                            if (confirm('Delete announcement?')) {
                              await api.deleteAnnouncement(a.id);
                              await fetchAllAdminData();
                            }
                          }}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-xs text-gray-700">{a.content}</p>
                      <span className="text-[10px] text-gray-400 block">
                        {new Date(a.createdAt).toLocaleString()} · {a.author}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. AUDIT TRAIL TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-serif text-xl font-bold text-[#220914]">
                  Tamper-Evident Administrative Audit Log
                </h3>
                <p className="text-xs text-gray-500">
                  Every state transition, round activation, score override, and disqualification is immutable and logged.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FCF8F5] text-gray-600 uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Operation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-semibold text-[#A53860]">{log.actorName}</td>
                        <td className="p-3 font-bold text-[#220914]">{log.action}</td>
                        <td className="p-3 text-gray-600">{log.targetEntity}</td>
                        <td className="p-3 text-gray-700 font-sans text-xs">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
