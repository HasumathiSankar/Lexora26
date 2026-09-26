import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import type { LeaderboardEntry, Round } from '../shared/types.ts';
import { Trophy, Medal, Award, Crown, Search, Lock, Sparkles, Building, Timer } from 'lucide-react';

export const PublicLeaderboardPage: React.FC = () => {
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('overall');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [roundsData, lbData] = await Promise.all([
          api.getRounds(),
          api.getLeaderboard(selectedRoundFilter === 'overall' ? undefined : selectedRoundFilter),
        ]);
        setRounds(roundsData);
        setIsPublished(lbData.published);
        setLeaderboard(lbData.entries || []);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedRoundFilter]);

  const filteredEntries = leaderboard.filter(
    (e) =>
      e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = leaderboard.filter((e) => e.isTopThree);

  return (
    <div className="min-h-screen bg-[#FCF8F5] pb-24">
      {/* Editorial Header */}
      <section className="bg-gradient-to-b from-[#220914] via-[#2A0815] to-[#A53860] text-white pt-16 pb-20 border-b border-[#DA627D]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FFA5AB] mb-3">
            <Trophy className="w-4 h-4 text-[#FFA5AB]" />
            <span>Official Championship Standings</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
            LEXORA Leaderboard & Honors
          </h1>
          <p className="text-sm text-[#F9DBBD]/80 max-w-xl mx-auto mt-3">
            Ranked by score precision, completion velocity, and attempt efficiency across participating collegiate institutions.
          </p>

          {/* Round Filter Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedRoundFilter('overall')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                selectedRoundFilter === 'overall'
                  ? 'bg-white text-[#A53860] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Overall Championship
            </button>
            {rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundFilter(r.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  selectedRoundFilter === r.id
                    ? 'bg-white text-[#A53860] shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Round 0{r.roundNumber}: {r.title}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {!isPublished ? (
          <div className="p-12 rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-xl text-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FCF4EB] text-[#DA627D] flex items-center justify-center mx-auto border border-[#FFA5AB]">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#220914]">
              Official Results Pending Publication
            </h3>
            <p className="text-xs text-[#220914]/80 leading-relaxed max-w-md mx-auto">
              Evaluation verification and proctoring audits are currently underway by the Championship Secretariat. Official leaderboard rankings will be published once approved.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* TOP 3 PODIUM CARDS */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Silver - 2nd */}
                {top3[1] && (
                  <div className="rounded-3xl bg-white border-2 border-[#FFA5AB] p-6 shadow-md md:mt-6 flex flex-col justify-between text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-slate-300" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 font-serif font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        2nd
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Silver Laureate
                      </span>
                      <h4 className="font-serif text-xl font-bold text-[#220914]">
                        {top3[1].studentName}
                      </h4>
                      <p className="text-xs text-[#DA627D] font-medium mt-1">
                        {top3[1].collegeName}
                      </p>
                      <p className="text-[11px] text-gray-500">{top3[1].department}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <span className="font-serif text-2xl font-bold text-[#A53860]">
                        {top3[1].totalScore} pts
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {top3[1].totalTimeSeconds}s elapsed · {top3[1].totalAttempts} attempts
                      </span>
                    </div>
                  </div>
                )}

                {/* Gold - 1st (Trophy) */}
                {top3[0] && (
                  <div className="rounded-3xl bg-white border-2 border-[#DA627D] p-7 shadow-xl flex flex-col justify-between text-center relative overflow-hidden ring-4 ring-[#DA627D]/20">
                    <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-md">
                        <Crown className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-600 block mb-1">
                        Championship Winner
                      </span>
                      <h4 className="font-serif text-2xl font-bold text-[#220914]">
                        {top3[0].studentName}
                      </h4>
                      <p className="text-xs text-[#DA627D] font-semibold mt-1">
                        {top3[0].collegeName}
                      </p>
                      <p className="text-[11px] text-gray-500">{top3[0].department}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-amber-100">
                      <span className="font-serif text-3xl font-bold text-[#A53860]">
                        {top3[0].totalScore} pts
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {top3[0].totalTimeSeconds}s elapsed · {top3[0].totalAttempts} attempts
                      </span>
                    </div>
                  </div>
                )}

                {/* Bronze - 3rd */}
                {top3[2] && (
                  <div className="rounded-3xl bg-white border-2 border-[#F9DBBD] p-6 shadow-md md:mt-8 flex flex-col justify-between text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-amber-700/60" />
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 font-serif font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        3rd
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                        Bronze Laureate
                      </span>
                      <h4 className="font-serif text-xl font-bold text-[#220914]">
                        {top3[2].studentName}
                      </h4>
                      <p className="text-xs text-[#DA627D] font-medium mt-1">
                        {top3[2].collegeName}
                      </p>
                      <p className="text-[11px] text-gray-500">{top3[2].department}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <span className="font-serif text-2xl font-bold text-[#A53860]">
                        {top3[2].totalScore} pts
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {top3[2].totalTimeSeconds}s elapsed · {top3[2].totalAttempts} attempts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FULL TABLE OF STANDINGS */}
            <div className="rounded-3xl bg-white border-2 border-[#F9DBBD] shadow-xl p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#220914]">
                    Official Competition Rankings
                  </h3>
                  <p className="text-xs text-gray-500">
                    Disqualified candidates are strictly excluded from winner ranking.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search candidate or college..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FCF8F5] text-gray-600 uppercase text-[10px] tracking-wider border-b border-[#F9DBBD]">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Candidate</th>
                      <th className="p-3">College & Department</th>
                      <th className="p-3">Rounds Completed</th>
                      <th className="p-3">Attempts Used</th>
                      <th className="p-3">Time Taken</th>
                      <th className="p-3">Official Score</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntries.map((e) => (
                      <tr
                        key={e.studentId}
                        className={`hover:bg-gray-50 transition-colors ${
                          e.isTopThree ? 'bg-[#FCF4EB]/30 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3 font-serif font-bold text-sm text-[#A53860]">
                          {e.qualificationStatus === 'DISQUALIFIED' ? '—' : `#${e.rank}`}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-[#220914]">{e.studentName}</span>
                          <span className="text-[10px] text-gray-400 block">{e.academicYear}</span>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-800 font-medium">{e.collegeName}</div>
                          <span className="text-[10px] text-gray-500">{e.department}</span>
                        </td>
                        <td className="p-3">{e.roundsCompleted}/4</td>
                        <td className="p-3">{e.totalAttempts}</td>
                        <td className="p-3 text-gray-500">{e.totalTimeSeconds}s</td>
                        <td className="p-3 font-serif font-bold text-base text-[#DA627D]">
                          {e.totalScore} pts
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              e.qualificationStatus === 'DISQUALIFIED'
                                ? 'bg-red-600 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {e.qualificationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          No candidates found matching query.
                        </td>
                      </tr>
                    )}
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
