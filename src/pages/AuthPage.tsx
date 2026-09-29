import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import {
  GraduationCap,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Building,
  User,
  Phone,
  Mail,
  Lock,
  Calendar,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  initialRole?: 'student' | 'admin';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  initialRole = 'student',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(
    location.pathname === '/register' ? 'register' : initialMode
  );
  const [role, setRole] = useState<'student' | 'admin'>(initialRole);

  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('3rd Year');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Login form fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Status & error handling
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Sync mode with route if changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
      setRole('student');
    } else if (location.pathname === '/admin-login') {
      setMode('login');
      setRole('admin');
    } else if (location.pathname === '/login') {
      setMode('login');
      setRole('student');
    }
  }, [location.pathname]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!fullName.trim()) return setError('Please enter your full legal name.');
    if (!collegeName.trim()) return setError('Please enter your college/institution name.');
    if (!department.trim()) return setError('Please specify your academic department.');
    if (!phoneNumber.trim()) return setError('Please provide a valid contact number.');
    if (!regEmail.trim()) return setError('Please provide a valid email address.');
    if (regPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (regPassword !== confirmPassword) return setError('Passwords do not match. Please re-enter.');

    setIsSubmitting(true);
    try {
      await register({
        fullName,
        collegeName,
        department,
        academicYear,
        phoneNumber,
        email: regEmail,
        password: regPassword,
        confirmPassword,
      });
      setSuccessMessage('Registration successful! Redirecting to your student dashboard...');
      setTimeout(() => navigate('/student'), 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !loginPassword.trim()) {
      return setError('Please enter both your identifier and password.');
    }

    setIsSubmitting(true);
    try {
      await login(identifier, loginPassword, role);
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FCF8F5]">
      <div className="max-w-xl w-full">
        {/* Championship Card */}
        <div className="bg-white rounded-3xl border-2 border-[#F9DBBD] shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#220914] via-[#2A0815] to-[#A53860] px-8 py-7 text-white text-center relative">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FFA5AB] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFA5AB]" />
              <span>Championship Authentication</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              LEXORA 2026
            </h2>
            <p className="text-xs text-[#F9DBBD]/80 mt-1">
              Inter-College Prompt Engineering Championship Portal
            </p>
          </div>

          <div className="border-b border-[#F9DBBD] bg-[#FCF4EB]/60 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMode('login');
                setRole('admin');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login' && role === 'admin'
                  ? 'bg-[#A53860] text-white shadow-sm'
                  : 'bg-white text-[#A53860] border border-[#F9DBBD] hover:bg-[#FCF4EB]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Login</span>
            </button>

            <button
              onClick={() => {
                setMode('register');
                setRole('student');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#DA627D] text-white shadow-sm'
                  : 'bg-white text-[#A53860] border border-[#F9DBBD] hover:bg-[#FCF4EB]'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Register as Student</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* REGISTRATION FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="border-b border-[#F9DBBD]/60 pb-3 mb-2">
                  <h3 className="font-serif text-lg font-bold text-[#A53860]">
                    Student Championship Registration
                  </h3>
                  <p className="text-xs text-gray-500">
                    Enter your academic affiliation and contact details. Student accounts are assigned participant status automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Full Legal Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Maya Sundaram"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      College / University Name *
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. Anna University, CEG"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Department / Major *
                    </label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Engg."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Academic Year *
                    </label>
                    <div className="relative">
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D] bg-white"
                      >
                        <option value="1st Year">1st Year (Freshman)</option>
                        <option value="2nd Year">2nd Year (Sophomore)</option>
                        <option value="3rd Year">3rd Year (Junior)</option>
                        <option value="Final Year">Final Year (Senior)</option>
                        <option value="Post-Graduate">Post-Graduate (M.Tech/MS/PhD)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="student@college.edu"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type password"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#DA627D] hover:bg-[#A53860] text-white shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Registering Candidate...' : 'Complete Registration & Enter'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* LOGIN FORM (STUDENT OR ADMIN) */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="border-b border-[#F9DBBD]/60 pb-3 mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#A53860]">
                      {role === 'admin' ? 'Administrator Login' : 'Already registered? Sign in'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {role === 'admin'
                        ? 'Sign in to access the championship control center.'
                        : 'Sign in to access your challenge workspace and scores.'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      {role === 'admin' ? 'Admin Username or Email' : 'Username or email'} *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={role === 'admin' ? 'admin' : 'student@college.edu'}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      Password *
                    </label>
                    {role === 'student' && (
                      <span className="text-[11px] text-[#DA627D] cursor-pointer hover:underline" onClick={() => alert('Please contact the championship secretariat or your campus ambassador for credentials assistance.')}>
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#DA627D] focus:ring-1 focus:ring-[#DA627D]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                      role === 'admin'
                        ? 'bg-[#A53860] hover:bg-[#822446]'
                        : 'bg-[#DA627D] hover:bg-[#A53860]'
                    }`}
                  >
                    <span>{isSubmitting ? 'Authenticating...' : role === 'admin' ? 'Admin Sign In' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
