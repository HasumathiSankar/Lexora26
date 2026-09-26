import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Trophy, Cpu, Mail, MapPin, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#220914] text-[#F9DBBD] border-t border-[#A53860]/40 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#A53860]/30">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#A53860] via-[#DA627D] to-[#FFA5AB] p-[2px]">
                <div className="w-full h-full bg-[#220914] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#FFA5AB]" />
                </div>
              </div>
              <span className="font-serif text-2xl font-bold tracking-wider text-white">LEXORA</span>
            </div>
            <p className="text-xs text-[#FFA5AB] font-medium tracking-wide">
              Think Beyond Words. Engineer the Future.
            </p>
            <p className="text-xs text-[#F9DBBD]/70 leading-relaxed">
              The premier inter-collegiate prompt engineering championship uniting student innovators, AI practitioners, and systems engineers across academic departments.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#DA627D]">
              <Award className="w-4 h-4" />
              <span>Accredited Academic Technical Event 2026</span>
            </div>
          </div>

          {/* Official Championship Rounds */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Competition Rounds
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F9DBBD]/80">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFA5AB]" />
                <span>Round 01: Reverse Prompting</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DA627D]" />
                <span>Round 02: Prompt Compression</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A53860]" />
                <span>Round 03: Prompt Relay</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFA5AB]" />
                <span>Round 04: Upskilling — Prompt Chaining</span>
              </li>
            </ul>
          </div>

          {/* Quick Links & Portals */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Direct Access
            </h4>
            <ul className="space-y-2.5 text-xs text-[#F9DBBD]/80">
              <li>
                <Link to="/register" className="hover:text-[#FFA5AB] transition-colors">
                  Student Registration Form
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#FFA5AB] transition-colors">
                  Participant Portal Login
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-[#FFA5AB] transition-colors">
                  Official Public Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#FFA5AB] transition-colors flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-[#DA627D]" />
                  Administrator Control Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Competition Operations & Rules */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Organizing Secretariat
            </h4>
            <div className="space-y-3 text-xs text-[#F9DBBD]/70">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#DA627D] shrink-0 mt-0.5" />
                <span>Central Engineering & Computing Quadrangle, University Council Secretariat</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#DA627D] shrink-0" />
                <span>organizers@lexora.edu</span>
              </p>
              <div className="pt-2 text-[11px] text-[#FFA5AB]/80 border-t border-[#A53860]/20">
                Official Proctoring Protocol strictly enforced. Max 2 submission attempts per candidate.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#F9DBBD]/50 gap-4">
          <p>© 2026 LEXORA Championship Steering Committee. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Server Authoritative Timers</span>
            <span>·</span>
            <span>Zero Hallucination Rubric</span>
            <span>·</span>
            <span>Strict Browser Proctoring</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
