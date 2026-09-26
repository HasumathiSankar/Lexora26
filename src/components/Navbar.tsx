import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Sparkles,
  ShieldAlert,
  Bell,
  LogOut,
  UserCheck,
  ChevronDown,
  Trophy,
  Compass,
  FileCode2,
  Lock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isStudent, logout, notifications, unreadNotifsCount, refreshNotifications } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `group relative inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors duration-200 ${
      isActive(path) ? 'text-[#A53860]' : 'text-[#220914]/80 hover:text-[#A53860]'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#F9DBBD] bg-[#FCF8F5]/90 backdrop-blur-md">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div whileHover={{ y: -1, rotate: -3 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-[#A53860] via-[#DA627D] to-[#FFA5AB] p-[2px] shadow-sm">
            <div className="w-full h-full bg-[#220914] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-[18px] h-[18px] text-[#FFA5AB]" />
            </div>
          </motion.div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-[25px] font-bold leading-none text-[#A53860]">
                LEXORA
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#DA627D] bg-[#F9DBBD]/50 px-2 py-0.5 rounded">
                2026
              </span>
            </div>
            <p className="text-[11px] text-[#A53860]/80 tracking-tight hidden md:block">
              Inter-College Prompt Engineering Championship
            </p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-[#220914]/80">
          <Link to="/" className={navLinkClass('/')}>
            <span className="relative">Overview</span>
            <span className={`absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left transition-transform duration-200 ${isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
          </Link>

          <a href="/#rounds" className="group relative inline-flex items-center text-[14px] font-medium text-[#220914]/80 transition-colors duration-200 hover:text-[#A53860]">
            <span>Four Rounds</span>
            <span className="absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" />
          </a>

          <a href="/#schedule" className="group relative inline-flex items-center text-[14px] font-medium text-[#220914]/80 transition-colors duration-200 hover:text-[#A53860]">
            <span>Schedule</span>
            <span className="absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" />
          </a>

          <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
            <Trophy className="w-[16px] h-[16px] text-[#DA627D]" />
            <span className="relative">Leaderboard</span>
            <span className={`absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left transition-transform duration-200 ${isActive('/leaderboard') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
          </Link>

          {isStudent && (
            <Link to="/student" className={navLinkClass('/student')}>
              <Compass className="w-[16px] h-[16px] text-[#A53860]" />
              <span className="relative">My Dashboard</span>
              <span className={`absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left transition-transform duration-200 ${isActive('/student') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className={navLinkClass('/admin')}>
              <ShieldAlert className="w-[16px] h-[16px] text-[#A53860]" />
              <span className="relative">Admin Center</span>
              <span className={`absolute left-0 -bottom-[6px] h-[2px] w-full rounded bg-[#DA627D] origin-left transition-transform duration-200 ${isActive('/admin') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 rounded-lg text-[#220914]/80 hover:text-[#A53860] hover:bg-[#F9DBBD]/40 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#DA627D] ring-2 ring-[#FCF8F5]" />
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#F9DBBD] py-3 px-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F9DBBD]/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#A53860]">
                        Championship Bulletins
                      </span>
                      <button
                        onClick={() => {
                          refreshNotifications();
                          setShowNotifs(false);
                        }}
                        className="text-[11px] text-[#DA627D] hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-500 py-3 text-center">No alerts at this moment.</p>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-lg text-xs border ${
                              !n.isRead
                                ? 'bg-[#FCF4EB] border-[#FFA5AB]/60 text-[#220914]'
                                : 'bg-gray-50 border-gray-100 text-gray-600'
                            }`}
                          >
                            <div className="font-semibold text-[#A53860] mb-0.5">{n.title}</div>
                            <p className="leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-gray-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-[#F9DBBD] bg-white text-xs font-medium text-[#220914] hover:border-[#FFA5AB] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#DA627D] text-white flex items-center justify-center font-bold text-[11px]">
                    {user?.studentProfile?.fullName?.[0] || user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:inline font-semibold text-[#A53860]">
                    {user?.studentProfile?.fullName || user?.username}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#DA627D] bg-[#F9DBBD]/50 px-1.5 py-0.5 rounded">
                    {user?.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#F9DBBD] py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#F9DBBD]/40 text-xs">
                      <p className="font-semibold text-[#A53860]">
                        {user?.studentProfile?.fullName || user?.username}
                      </p>
                      <p className="text-gray-500 truncate">{user?.email}</p>
                      {user?.studentProfile?.collegeName && (
                        <p className="text-[11px] text-[#DA627D] font-medium mt-1 truncate">
                          {user.studentProfile.collegeName}
                        </p>
                      )}
                    </div>
                    {isStudent && (
                      <Link
                        to="/student"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-[#FCF4EB] hover:text-[#A53860]"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Student Portal
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-[#A53860] font-medium hover:bg-[#FCF4EB]"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Admin Control Center
                      </Link>
                    )}
                    <Link
                      to="/leaderboard"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-[#FCF4EB]"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Leaderboard Standings
                    </Link>
                    <div className="border-t border-[#F9DBBD]/40 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-[#A53860] hover:text-[#822446] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#DA627D] hover:bg-[#A53860] text-white shadow-sm transition-all hover:shadow"
              >
                Register as Student
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
