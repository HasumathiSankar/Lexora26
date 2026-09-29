import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import type { Round, LeaderboardEntry, Announcement, Submission, RoundParticipant } from '../shared/types.ts';
import {
  Trophy,
  Timer,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  Clock,
  Award,
  Zap,
  ShieldAlert,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardPublished, setIsLeaderboardPublished] = useState<boolean>(false);
  const [roundStatuses, setRoundStatuses] = useState<Record<string, { participant?: RoundParticipant; submissions: Submission[] }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const profile = user?.studentProfile;

  const loadData = useCallback(async () => {
    try {
      const [roundsData, annsData, lbData] = await Promise.all([
        api.getRounds(),
        api.getAnnouncements(),
        api.getLeaderboard(),
      ]);

      setRounds(roundsData);
      setAnnouncements(annsData);
      setIsLeaderboardPublished(lbData.published);
      setLeaderboard(lbData.entries || []);

      // Fetch student status for each round
      const statusMap: Record<string, { participant?: RoundParticipant; submissions: Submission[] }> = {};
      for (const r of roundsData) {
        try {
          const st = await api.getMyRoundStatus(r.id);
          statusMap[r.id] = {
            participant: st.participant,
            submissions: st.submissions || [],
          };
        } catch {
          // ignore
        }
      }
      setRoundStatuses(statusMap);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeRound = rounds.find((r) => r.status === 'ACTIVE');
  const completedRoundsCount = Object.values(roundStatuses).filter(
    (s) => s.participant && (s.participant.attemptsCount > 0 || s.participant.status === 'EVALUATED')
  ).length;

  return (
    <div className="min-h-screen bg-[#FCF8F5] pb-20">
      {/* Top Banner / Welcome Panel */}
      <section className="bg-white border-b border-[#F9DBBD] pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A53860] mb-2">
                <Sparkles className="w-4 h-4 text-[#DA627D]" />
                <span>Student Championship Dashboard</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#DA627D] font-mono">{profile?.registrationNumber || 'LEX-2026'}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#220914]">
                Welcome back, {profile?.fullName || user?.username}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#220914]/80 mt-2">
                <span className="flex items-center gap-1.5 font-medium text-[#A53860]">
                  <Building className="w-3.5 h-3.5 text-[#DA627D]" />
                  {profile?.collegeName || 'Collegiate Affiliation'}
                </span>
                <span aria-hidden="true" className="text-gray-300">·</span>
                <span>{profile?.department}</span>
                <span aria-hidden="true" className="text-gray-300">·</span>
                <span className="bg-[#FCF4EB] text-[#DA627D] font-semibold px-2 py-0.5 rounded">
                  {profile?.academicYear}
                </span>
              </div>
            </div>

            {/* Overall Progress Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#FCF4EB] border border-[#FFA5AB]/60 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#A53860] shadow-sm">
                <Trophy className="w-6 h-6 text-[#DA627D]" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Contest Progress
                </span>
                <span className="text-lg font-bold text-[#A53860]">
                  {completedRoundsCount} of 4 Rounds
                </span>
                <div className="w-36 h-2 bg-white rounded-full mt-1 overflow-hidden border border-[#FFA5AB]/40">
                  <div
                    className="h-full bg-[#DA627D] transition-all"
                    style={{ width: `${(completedRoundsCount / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Rounds & Workspace Entrance */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT 8 COLUMNS: FOUR OFFICIAL ROUND CARDS */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#F9DBBD]">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#220914]">
                  Championship Rounds
                </h2>
                <p className="text-xs text-[#220914]/70">
                  Only rounds activated by the administrator can be entered. Max 2 attempts per candidate.
                </p>
              </div>
              {activeRound && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A53860] bg-[#FFA5AB]/30 px-3 py-1 rounded-full animate-pulse border border-[#FFA5AB]">
                  <span className="w-2 h-2 rounded-full bg-[#DA627D]" />
                  Round {activeRound.roundNumber} is LIVE
                </span>
              )}
            </div>

            <div className="space-y-4">
              {rounds.map((round) => {
                const statusInfo = roundStatuses[round.id];
                const participant = statusInfo?.participant;
                const attemptsUsed = participant?.attemptsCount || 0;
                const remainingAttempts = Math.max(0, round.maxAttempts - attemptsUsed);
                const isDisqualified = participant?.isDisqualified || false;

                // Determine card visual state
                let cardBadgeText: string = round.status;
                let cardBadgeClass = 'bg-gray-100 text-gray-600 border-gray-200';

                if (isDisqualified) {
                  cardBadgeText = 'DISQUALIFIED';
                  cardBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                } else if (attemptsUsed >= round.maxAttempts) {
                  cardBadgeText = 'COMPLETED';
                  cardBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                } else if (attemptsUsed > 0 && round.status === 'ACTIVE') {
                  cardBadgeText = '1 ATTEMPT REMAINING';
                  cardBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                } else if (round.status === 'ACTIVE') {
                  cardBadgeText = 'ACTIVE · READY';
                  cardBadgeClass = 'bg-[#FFA5AB]/40 text-[#A53860] border-[#DA627D] font-bold';
                } else if (round.status === 'LOCKED') {
                  cardBadgeText = 'LOCKED BY ADMIN';
                  cardBadgeClass = 'bg-[#F9DBBD]/40 text-gray-500 border-[#F9DBBD]';
                }

                const canEnterWorkspace = round.status === 'ACTIVE' && !isDisqualified && remainingAttempts > 0;

                return (
                  <div
                    key={round.id}
                    className={`rounded-2xl border-2 transition-all p-6 bg-white ${
                      round.status === 'ACTIVE'
                        ? 'border-[#DA627D] shadow-md'
                        : 'border-[#F9DBBD] opacity-90'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#DA627D] uppercase tracking-wider font-mono">
                            Round 0{round.roundNumber}
                          </span>
                          <span aria-hidden="true" className="text-gray-300">·</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cardBadgeClass}`}>
                            {cardBadgeText}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[#220914]">
                          {round.title}
                        </h3>
                        <p className="text-xs font-medium text-[#A53860]">
                          {round.subtitle}
                        </p>
                        <p className="text-xs text-[#220914]/80 leading-relaxed pt-1">
                          {round.description}
                        </p>
                      </div>

                      {/* Right metadata box */}
                      <div className="sm:text-right shrink-0 space-y-1 text-xs">
                        <div className="flex sm:justify-end items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-[#DA627D]" />
                          <span>{round.durationMinutes} Minutes</span>
                        </div>
                        <div className="flex sm:justify-end items-center gap-1.5 text-gray-600">
                          <Layers className="w-3.5 h-3.5 text-[#DA627D]" />
                          <span>{remainingAttempts} of {round.maxAttempts} Attempts Left</span>
                        </div>
                        {participant?.highestScore !== null && participant?.highestScore !== undefined && (
                          <div className="text-sm font-bold text-[#A53860]">
                            Best Score: {participant.highestScore.toFixed(2)}/{round.maxScore}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Disqualification alert */}
                    {isDisqualified && (
                      <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Round Disqualification Enforced</p>
                          <p>{participant?.disqualificationReason || 'Proctoring focus threshold exceeded.'}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="mt-5 pt-4 border-t border-[#F9DBBD]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-gray-500">
                        {round.status === 'LOCKED' && 'Challenge workspace will open when administrator starts the round.'}
                        {round.status === 'ACTIVE' && canEnterWorkspace && 'Timer starts immediately upon entering the workspace.'}
                        {round.status === 'ACTIVE' && remainingAttempts === 0 && 'You have completed all attempts for this round.'}
                        {round.status === 'ENDED' && 'This round has concluded. Awaiting results publication.'}
                      </div>

                      {canEnterWorkspace ? (
                        <Link
                          to={`/workspace/${round.id}`}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#DA627D] hover:bg-[#A53860] text-white shadow transition-all hover:shadow-md"
                        >
                          <span>{attemptsUsed === 0 ? 'Enter Challenge Workspace' : 'Submit Final Attempt'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{round.status === 'LOCKED' ? 'Round Locked' : isDisqualified ? 'Disqualified' : 'Attempts Exhausted'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: PERFORMANCE & ANNOUNCEMENTS */}
          <div className="lg:col-span-4 space-y-6">
            {/* My Performance Card */}
            <div className="p-6 rounded-2xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#F9DBBD]/60 pb-3">
                <Award className="w-5 h-5 text-[#A53860]" />
                <h3 className="font-serif text-lg font-bold text-[#220914]">
                  My Performance
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {rounds.map((r) => {
                  const p = roundStatuses[r.id]?.participant;
                  const score = p?.highestScore;
                  return (
                    <div key={r.id} className="p-3 rounded-xl bg-[#FCF8F5] border border-[#F9DBBD]/60 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#A53860] block">Round 0{r.roundNumber}</span>
                        <span className="text-[11px] text-gray-500">{r.title}</span>
                      </div>
                      <div className="text-right">
                        {p?.isDisqualified ? (
                          <span className="text-red-600 font-bold">DQ</span>
                        ) : score !== null && score !== undefined ? (
                          <div>
                            <span className="text-base font-bold text-[#DA627D]">{score}</span>
                            <span className="text-[10px] text-gray-500">/100</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-[11px] text-gray-500 leading-relaxed border-t border-[#F9DBBD]/60">
                Official ranking eligibility requires adhering to zero-disqualification integrity guidelines.
              </div>
            </div>

            {/* Official Announcements */}
            <div className="p-6 rounded-2xl bg-white border-2 border-[#FFA5AB] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#FFA5AB]/40 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#DA627D]" />
                  <h3 className="font-serif text-lg font-bold text-[#220914]">
                    Announcements
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#A53860] uppercase tracking-wider bg-[#FFA5AB]/30 px-2 py-0.5 rounded">
                  Official
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto">
                {announcements.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 text-center">No official notices right now.</p>
                ) : (
                  announcements.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl text-xs space-y-1 border ${
                        a.priority === 'URGENT'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : a.priority === 'HIGH'
                          ? 'bg-[#FCF4EB] border-[#FFA5AB] text-[#220914]'
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#A53860]">{a.title}</span>
                        {a.priority === 'URGENT' && (
                          <span className="text-[9px] font-bold text-red-600 uppercase">URGENT</span>
                        )}
                      </div>
                      <p className="leading-relaxed">{a.content}</p>
                      <span className="text-[10px] text-gray-400 block pt-1">
                        {new Date(a.createdAt).toLocaleDateString()} · {a.author}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Leaderboard Preview */}
            <div className="p-6 rounded-2xl bg-white border border-[#F9DBBD] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#220914]">
                  Leaderboard Preview
                </h3>
                <Link to="/leaderboard" className="text-xs text-[#DA627D] font-bold hover:underline">
                  Full Board →
                </Link>
              </div>

              {!isLeaderboardPublished ? (
                <div className="p-4 rounded-xl bg-[#FCF8F5] border border-dashed border-[#F9DBBD] text-center text-xs text-gray-500">
                  <Lock className="w-5 h-5 text-[#DA627D] mx-auto mb-1 opacity-70" />
                  Official competition standings will be published once Round 1 results are verified by the secretariat.
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {leaderboard.slice(0, 3).map((entry) => (
                    <div
                      key={entry.studentId}
                      className="p-2.5 rounded-lg bg-[#FCF8F5] border border-[#F9DBBD] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-[#DA627D]">#{entry.rank}</span>
                        <div>
                          <span className="font-semibold text-[#220914] block">{entry.studentName}</span>
                          <span className="text-[10px] text-gray-500">{entry.collegeName}</span>
                        </div>
                      </div>
                      <span className="font-bold text-[#A53860]">{entry.totalScore.toFixed(2)} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
