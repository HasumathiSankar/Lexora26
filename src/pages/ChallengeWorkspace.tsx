import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import type { Challenge, Round, RoundParticipant, Submission } from '../shared/types.ts';
import { ProctoringAlertModal } from '../components/ProctoringAlertModal.tsx';
import {
  Timer,
  Clock,
  Layers,
  Send,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  FileCode,
  FileText,
  HelpCircle,
} from 'lucide-react';

export const ChallengeWorkspace: React.FC = () => {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [participant, setParticipant] = useState<RoundParticipant | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Submission inputs
  const [promptText, setPromptText] = useState('');
  const [secondaryText, setSecondaryText] = useState('');
  const [tertiaryText, setTertiaryText] = useState('');
  const [failedReferenceImages, setFailedReferenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingSubmissionKey = useRef<string | null>(null);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server-authoritative timer countdown state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  // Proctoring modal state
  const [proctoringAlertOpen, setProctoringAlertOpen] = useState(false);
  const [currentWarning, setCurrentWarning] = useState(0);
  const [maxWarnings, setMaxWarnings] = useState(2);
  const [isDisqualified, setIsDisqualified] = useState(false);

  // Track if initial attempt has been started
  const [isLoading, setIsLoading] = useState(true);

  // Word and character count computation
  const wordCount = promptText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = promptText.length + secondaryText.length + tertiaryText.length;
  const wordLimit = challenge?.maxTokensOrChars;
  const isOverWordLimit = wordLimit && challenge?.roundId === 'round_2' ? wordCount > wordLimit : false;

  // Initialize and synchronize workspace with server
  const initWorkspace = useCallback(async () => {
    if (!roundId) return;
    try {
      setIsLoading(true);
      // Fetch challenge definition
      const challengeRes = await api.getChallenge(roundId);
      setChallenge(challengeRes.challenge);
      setRound(challengeRes.round);
      setMaxWarnings(challengeRes.round.maxTabSwitchWarnings || 2);

      // Start attempt / restore participant timer session
      const startRes = await api.startAttempt(roundId);
      setParticipant(startRes.participant);
      setRemainingSeconds(startRes.remainingSeconds);
      if (startRes.remainingSeconds <= 0) {
        setIsTimeExpired(true);
      }
      setIsDisqualified(startRes.participant.isDisqualified);

      // Fetch previous submissions for this round
      const myStatus = await api.getMyRoundStatus(roundId);
      setSubmissions(myStatus.submissions || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to enter challenge workspace');
    } finally {
      setIsLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    initWorkspace();
  }, [initWorkspace]);

  // Server-authoritative countdown ticker
  useEffect(() => {
    if (remainingSeconds <= 0 || isDisqualified || isTimeExpired) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, isDisqualified, isTimeExpired]);

  // Periodic status sync with server every 30s to keep clock and disqualification authoritative
  useEffect(() => {
    if (!roundId || isDisqualified || isTimeExpired) return;

    const syncInterval = setInterval(async () => {
      try {
        const status = await api.getMyRoundStatus(roundId);
        if (status.remainingSeconds !== undefined) {
          setRemainingSeconds(status.remainingSeconds);
          if (status.remainingSeconds <= 0) setIsTimeExpired(true);
        }
        if (status.participant?.isDisqualified) {
          setIsDisqualified(true);
        }
      } catch {
        // quiet sync
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [roundId, isDisqualified, isTimeExpired]);

  // PROCTORING: Window Blur & Tab Switching Event Listener
  const handleProctoringViolation = useCallback(
    async (eventType: string, detail: string) => {
      if (!roundId || isDisqualified || isTimeExpired || !participant) return;

      try {
        const report = await api.reportProctoringEvent(roundId, eventType, detail);
        setCurrentWarning(report.warningNumber);
        setMaxWarnings(report.maxWarnings);
        setIsDisqualified(report.isDisqualified);
        setProctoringAlertOpen(true);
      } catch (err) {
        console.warn('Failed to log proctoring event:', err);
      }
    },
    [roundId, isDisqualified, isTimeExpired, participant]
  );

  useEffect(() => {
    // Only monitor if workspace is active and user is not disqualified
    if (isDisqualified || isTimeExpired || !participant) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleProctoringViolation('TAB_SWITCH', 'Participant switched browser tab or minimized window');
      }
    };

    const handleWindowBlur = () => {
      handleProctoringViolation('WINDOW_BLUR', 'Workspace window lost active focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleProctoringViolation, isDisqualified, isTimeExpired, participant]);

  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundId) return;

    if (!promptText.trim() || (roundId === 'round_1' && !secondaryText.trim()) || ((roundId === 'round_3' || roundId === 'round_4') && (!secondaryText.trim() || !tertiaryText.trim()))) {
      setErrorMessage('Complete each prompt field before submitting.');
      return;
    }

    if (isOverWordLimit) {
      if (!confirm(`Your submission has ${wordCount} words, exceeding the ${wordLimit}-word limit. A penalty will be assessed. Proceed anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmissionSuccessMsg(null);

    try {
      const submissionText = roundId === 'round_1'
        ? `Question 1: ${promptText.trim()}\n\nQuestion 2: ${secondaryText.trim()}`
        : roundId === 'round_3'
          ? `Step 1:\n${promptText.trim()}\n\nStep 2:\n${secondaryText.trim()}\n\nStep 3:\n${tertiaryText.trim()}`
          : roundId === 'round_4'
            ? `Stage 1:\n${promptText.trim()}\n\nStage 2:\n${secondaryText.trim()}\n\nStage 3:\n${tertiaryText.trim()}`
            : promptText.trim();
      if (!pendingSubmissionKey.current) pendingSubmissionKey.current = crypto.randomUUID();
      const res = await api.submitChallenge(roundId, {
        promptSubmission: submissionText,
        idempotencyKey: pendingSubmissionKey.current,
      });
      pendingSubmissionKey.current = null;

      setParticipant(res.participant);
      setSubmissions((prev) => [res.submission, ...prev]);
      setSubmissionSuccessMsg(res.message);

      // Reset form if student has attempt remaining, or lock
      if (res.participant.remainingAttempts > 0) {
        setPromptText('');
        setSecondaryText('');
        setTertiaryText('');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const attemptsUsed = participant?.attemptsCount || 0;
  const attemptsRemaining = participant ? Math.max(0, (round?.maxAttempts || 2) - attemptsUsed) : 2;
  const isSubmissionClosed = attemptsRemaining === 0 || isTimeExpired || isDisqualified;
  const isFormComplete = roundId === 'round_1'
    ? !!promptText.trim() && !!secondaryText.trim()
    : roundId === 'round_3' || roundId === 'round_4'
      ? !!promptText.trim() && !!secondaryText.trim() && !!tertiaryText.trim()
      : !!promptText.trim();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCF8F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#DA627D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A53860]">
            Initializing Proctored Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCF8F5] pb-20">
      {/* Proctoring Warning Modal */}
      <ProctoringAlertModal
        isOpen={proctoringAlertOpen}
        warningNumber={currentWarning}
        maxWarnings={maxWarnings}
        isDisqualified={isDisqualified}
        onAcknowledge={() => {
          setProctoringAlertOpen(false);
          if (isDisqualified) {
            navigate('/student');
          }
        }}
      />

      {/* TOP WORKSPACE NAVIGATION & TIMER BAR */}
      <div className="sticky top-18 z-30 bg-[#220914] text-white border-b border-[#A53860]/40 px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/student"
              className="text-xs text-[#FFA5AB] hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-white/20" />
            <div>
              <span className="text-[10px] font-bold text-[#FFA5AB] uppercase tracking-wider block">
                Round 0{round?.roundNumber} · Workspace
              </span>
              <h2 className="font-serif text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {round?.title}
              </h2>
            </div>
          </div>

          {/* Right: Timer & Attempt Indicators */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Attempts badge */}
            <div className="text-xs">
              <span className="text-[10px] text-[#F9DBBD]/70 block uppercase tracking-wider">Attempt</span>
              <span className="font-bold text-white">
                {attemptsUsed + (attemptsRemaining > 0 ? 1 : 0)} of {round?.maxAttempts || 2}
              </span>
            </div>

            {/* Countdown timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                remainingSeconds < 300
                  ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                  : 'bg-white/10 border-white/20 text-[#F9DBBD]'
              }`}
            >
              <Timer className="w-4 h-4 text-[#FFA5AB]" />
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#FFA5AB]/80 block leading-none">
                  Time Remaining
                </span>
                <span className="font-mono text-base sm:text-lg font-bold">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DISQUALIFICATION BANNER */}
      {isDisqualified && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-xs text-red-900 flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-800">Round Disqualification Enforced</h3>
              <p className="mt-0.5 leading-relaxed">
                {participant?.disqualificationReason || 'You have exceeded allowable focus violations. Submission access is terminated.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TIME EXPIRED BANNER */}
      {isTimeExpired && !isDisqualified && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 flex items-start gap-3 shadow-sm">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Time Limit Expired</h3>
              <p className="mt-0.5 leading-relaxed">
                The official clock for this round has elapsed. Submissions are no longer accepted for this session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE CONTENT: 2 COLUMNS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 6 COLUMNS: CHALLENGE SPECIFICATION & RUBRIC */}
          <div className="lg:col-span-6 space-y-6">
            {/* Task Card */}
            <div className="p-6 rounded-2xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#F9DBBD]/60 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#DA627D]">
                  Challenge Briefing
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Max Score: {round?.maxScore || 100} pts
                </span>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-[#220914] mb-2">
                  {challenge?.title}
                </h3>
                <p className="text-xs text-[#220914]/80 leading-relaxed">
                  {challenge?.taskOverview}
                </p>
              </div>

              {/* Detailed Task Description */}
              <div className="p-4 rounded-xl bg-[#FCF8F5] border border-[#F9DBBD] text-xs text-[#220914]/90 space-y-2">
                <span className="font-bold text-[#A53860] uppercase tracking-wider text-[11px] block">
                  Task Specifications
                </span>
                <p className="leading-relaxed whitespace-pre-line">
                  {challenge?.detailedTask}
                </p>
              </div>

              {challenge?.roundId === 'round_1' && challenge.referenceImages?.length ? (
                <div className="grid grid-cols-1 gap-4">
                  {challenge.referenceImages.map((image) => (
                    <figure key={image.title} className="overflow-hidden rounded-xl border border-[#F9DBBD] bg-[#FCF8F5]">
                      <figcaption className="px-4 py-3 text-sm font-semibold text-[#A53860]">{image.title}</figcaption>
                      {failedReferenceImages.includes(image.src) ? (
                        <div className="flex min-h-56 items-center justify-center border-t border-[#F9DBBD] bg-white px-6 text-center text-sm text-gray-500">
                          Reference image unavailable. Please tell your administrator.
                        </div>
                      ) : (
                        <img
                          src={image.src}
                          alt={image.alt}
                          onError={() => setFailedReferenceImages((images) => [...images, image.src])}
                          className="block max-h-[440px] w-full bg-white object-contain"
                        />
                      )}
                    </figure>
                  ))}
                </div>
              ) : null}

              {/* Target Scenario / Benchmark Output */}
              {challenge?.targetScenario && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block">
                    {challenge.roundId === 'round_2' ? 'Passage:' : challenge.roundId === 'round_4' ? 'Event Details:' : 'Target Scenario / Benchmark Data:'}
                  </span>
                  {challenge.roundId === 'round_2' ? (
                    <div className="rounded-xl border border-[#F9DBBD] bg-[#FCF8F5] p-5 text-sm leading-7 text-[#220914]">
                      {challenge.targetScenario}
                    </div>
                  ) : challenge.roundId === 'round_4' ? (
                    <div className="rounded-xl border border-[#F9DBBD] bg-[#FCF8F5] p-4 text-sm leading-7 text-[#220914] whitespace-pre-line">
                      {challenge.targetScenario}
                    </div>
                  ) : (
                    <pre className="p-4 rounded-xl bg-[#220914] text-[#F9DBBD] text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {challenge.targetScenario}
                    </pre>
                  )}
                </div>
              )}

              {/* Input Constraints */}
              {challenge?.inputConstraints && challenge.inputConstraints.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A53860] block">
                    Strict Constraints:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#220914]/80">
                    {challenge.inputConstraints.map((constraint, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DA627D] mt-1.5 shrink-0" />
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT 6 COLUMNS: PROMPT EDITOR & SUBMISSION MONITOR */}
          <div className="lg:col-span-6 space-y-6">
            {/* Submission Form */}
            <div className="p-6 rounded-2xl bg-white border-2 border-[#DA627D] shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-[#F9DBBD] pb-3">
                <div>
                    <h3 className="font-serif text-lg font-bold text-[#220914]">
                    {roundId === 'round_1' ? 'Image Prompt Responses' : roundId === 'round_3' ? 'Three-Step Prompt Relay' : roundId === 'round_4' ? 'Three-Stage Prompt Chain' : 'Compressed Prompt'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {attemptsRemaining > 0
                      ? `Attempt ${attemptsUsed + 1} of ${round?.maxAttempts || 2} · Real-time evaluation`
                      : 'All attempts completed.'}
                  </p>
                </div>
                {/* Word / Char Counter */}
                <div className="text-right text-xs">
                  <span className={`font-mono font-bold ${isOverWordLimit ? 'text-red-600' : 'text-[#A53860]'}`}>
                    {wordCount} words
                  </span>
                  {wordLimit && challenge?.roundId === 'round_2' && (
                    <span className="text-gray-400"> / {wordLimit} max</span>
                  )}
                  <div className="text-[10px] text-gray-400">{charCount} characters</div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {submissionSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{submissionSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAttempt} className="space-y-4">
                {roundId === 'round_1' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">Recreate the Reference Image — Question 1 *</label>
                      <textarea rows={5} required disabled={isSubmissionClosed || isSubmitting} value={promptText} onChange={(e) => { pendingSubmissionKey.current = null; setPromptText(e.target.value); }} placeholder="Describe the image in a prompt..." className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed focus:border-[#DA627D] focus:outline-none disabled:bg-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">Recreate the Reference Image — Question 2 *</label>
                      <textarea rows={5} required disabled={isSubmissionClosed || isSubmitting} value={secondaryText} onChange={(e) => { pendingSubmissionKey.current = null; setSecondaryText(e.target.value); }} placeholder="Describe the image in a prompt..." className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed focus:border-[#DA627D] focus:outline-none disabled:bg-gray-100" />
                    </div>
                  </>
                ) : roundId === 'round_3' || roundId === 'round_4' ? (
                  <>
                    <div className="rounded-lg bg-[#FCF8F5] px-4 py-3 text-center text-sm font-semibold text-[#A53860]">
                      {roundId === 'round_3' ? 'Step 1 → Step 2 → Step 3' : 'Stage 1 → Stage 2 → Stage 3'}
                    </div>
                    {[
                      { number: 1, heading: roundId === 'round_3' ? 'Step 1 — Collect Information' : 'Stage 1 — Draft', value: promptText, update: setPromptText, placeholder: 'Write the first prompt...' },
                      { number: 2, heading: roundId === 'round_3' ? 'Step 2 — Create a Study Plan' : 'Stage 2 — Review', value: secondaryText, update: setSecondaryText, placeholder: 'Write the prompt that uses the previous output...' },
                      { number: 3, heading: roundId === 'round_3' ? 'Step 3 — Generate Revision Tips' : 'Stage 3 — Improve', value: tertiaryText, update: setTertiaryText, placeholder: 'Write the prompt that uses the previous output...' },
                    ].map((field) => (
                      <div key={field.number} className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">{field.heading} *</label>
                        <textarea rows={4} required disabled={isSubmissionClosed || isSubmitting} value={field.value} onChange={(e) => { pendingSubmissionKey.current = null; field.update(e.target.value); }} placeholder={field.placeholder} className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed focus:border-[#DA627D] focus:outline-none disabled:bg-gray-100" />
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">Your shorter prompt (50 words maximum) *</label>
                    <textarea rows={8} required disabled={isSubmissionClosed || isSubmitting} value={promptText} onChange={(e) => { pendingSubmissionKey.current = null; setPromptText(e.target.value); }} placeholder="Write a clear, shorter prompt that keeps all the important requirements..." className="w-full rounded-xl border border-gray-300 p-4 text-sm leading-relaxed focus:border-[#DA627D] focus:outline-none disabled:bg-gray-100" />
                  </div>
                )}

                {/* Submission Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500">
                    {attemptsRemaining > 0 ? (
                      <span>{attemptsRemaining} attempt(s) remaining for this round.</span>
                    ) : (
                      <span className="text-gray-500">Attempt ceiling reached.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmissionClosed || isSubmitting || !isFormComplete}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#DA627D] hover:bg-[#A53860] text-white shadow transition-all hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSubmitting
                        ? 'Evaluating Submission...'
                        : `Submit Attempt ${attemptsUsed + 1}`}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Previous Submissions & Real-time Evaluation Results */}
            {submissions.length > 0 && (
              <div className="p-6 rounded-2xl bg-white border-2 border-[#F9DBBD] shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#F9DBBD]/60 pb-3">
                  <h4 className="font-serif text-base font-bold text-[#220914]">
                    Recorded Submissions & Evaluations
                  </h4>
                  <span className="text-xs text-[#A53860] font-semibold">
                    Best Score: {(participant?.highestScore || 0).toFixed(2)}/100
                  </span>
                </div>

                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-5 rounded-2xl bg-[#FCF8F5] border border-[#F9DBBD] space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#A53860] uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-[#F9DBBD]">
                            Attempt {sub.attemptNumber}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {new Date(sub.submittedAt).toLocaleTimeString()} · {sub.timeTakenSeconds}s elapsed
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-serif font-bold text-[#DA627D]">
                            {sub.score !== null ? sub.score.toFixed(2) : '—'}
                          </span>
                          <span className="text-xs text-gray-500">/100</span>
                        </div>
                      </div>

                      {sub.scoringBreakdown && (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#F9DBBD] bg-white p-3 text-xs sm:grid-cols-4">
                          <div><span className="block text-[10px] uppercase text-gray-500">Prompt quality</span><strong>{sub.scoringBreakdown.promptQualityPoints.toFixed(2)} pts</strong></div>
                          <div><span className="block text-[10px] uppercase text-gray-500">Task achievement</span><strong>{sub.scoringBreakdown.taskAchievementPoints.toFixed(2)} pts</strong></div>
                          <div><span className="block text-[10px] uppercase text-gray-500">Time efficiency</span><strong>{sub.scoringBreakdown.timeEfficiencyPoints.toFixed(2)} pts</strong></div>
                          <div><span className="block text-[10px] uppercase text-gray-500">Attempt efficiency</span><strong>{sub.scoringBreakdown.attemptEfficiencyPoints.toFixed(2)} pts</strong></div>
                          <p className="col-span-2 pt-1 font-semibold text-[#A53860] sm:col-span-4">
                            {sub.scoringBreakdown.completionStatus === 'COMPLETED' ? 'Completed' : 'Partially completed'}
                          </p>
                        </div>
                      )}

                      {/* Feedback */}
                      {sub.feedback && (
                        <div className="p-3 rounded-xl bg-white border border-[#FFA5AB]/50 text-xs text-[#220914] space-y-1">
                          <span className="font-bold text-[#A53860] block">Judge Assessment:</span>
                          <p className="leading-relaxed">{sub.feedback}</p>
                        </div>
                      )}

                      {/* Submitted Prompt Preview (Collapsible snippet) */}
                      <details className="text-xs pt-1">
                        <summary className="text-[11px] text-[#DA627D] font-semibold cursor-pointer hover:underline">
                          View submitted prompt payload ({sub.promptSubmission.length} chars)
                        </summary>
                        <pre className="mt-2 p-3 rounded-xl bg-[#220914] text-[#F9DBBD] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {sub.promptSubmission}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
