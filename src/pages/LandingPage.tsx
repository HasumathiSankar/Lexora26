import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserRound } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const smoothEase = [0.22, 1, 0.36, 1] as const;

  const fadeUp = (delay = 0) => ({
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        delay,
        ease: smoothEase,
      },
    },
  });

  return (
    <motion.main
      className="min-h-screen bg-[#FCF8F5] text-[#220914]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: smoothEase }}
    >
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12 md:pb-14">
        <div className="pt-6 md:pt-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center md:text-left">
              <motion.div
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.05)}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A53860] mb-5 md:mb-6"
              >
                NATIONAL UNIVERSITY CIRCUIT · PROMPT ENGINEERING CHAMPIONSHIP · 2026 EDITION
              </motion.div>

              <motion.h1
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.12)}
                className="font-serif text-[44px] sm:text-[64px] leading-[0.9] tracking-[-0.08em] text-[#220914] font-bold mb-4 md:mb-5"
              >
                LEXORA
              </motion.h1>

              <motion.h2
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.18)}
                className="font-serif italic text-[23px] sm:text-[30px] leading-[1.08] text-[#220914] mb-3 md:mb-4"
              >
                Inter-College Prompt Engineering Championship
              </motion.h2>

              <motion.p
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.24)}
                className="font-serif italic text-[#DA627D] text-[17px] sm:text-[21px] leading-none mb-4 md:mb-5"
              >
                "Think Beyond Words. Engineer the Future."
              </motion.p>

              <motion.p
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.3)}
                className="max-w-[900px] text-[14px] sm:text-[16px] leading-[1.6] text-[#220914]/80 mb-7 md:mb-8"
              >
                Compete across four rigorous rounds designed to test AI interaction, structured reasoning, and prompt precision under real championship pressure.
              </motion.p>

              <motion.div
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? { opacity: 1 } : 'visible'}
                variants={fadeUp(0.38)}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 justify-start"
              >
                <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-[#DA627D] bg-[#DA627D] px-5 sm:px-6 py-3 text-[14px] font-semibold text-white shadow-[0_8px_18px_rgba(165,56,96,0.12)] transition-colors duration-200 hover:bg-[#A53860]"
                  >
                    Register as Student
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>

                <motion.div whileHover={prefersReducedMotion ? undefined : { y: -2 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}>
                  <a
                    href="/#rounds"
                    className="inline-flex items-center justify-center rounded-[16px] border border-[#A53860]/30 bg-white/40 px-5 sm:px-6 py-3 text-[14px] font-semibold text-[#A53860] transition-colors duration-200 hover:border-[#A53860]"
                  >
                    Explore Four Rounds
                  </a>
                </motion.div>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center py-3 text-[13px] font-semibold text-[#A53860] transition-colors duration-200 hover:text-[#220914]"
                >
                  Already registered? Sign In →
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-14 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.1 }}
            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
            className="rounded-[24px] border border-[#F9DBBD] bg-[#FDF9F7] p-5 sm:p-6 md:p-7 shadow-[0_2px_0_rgba(165,56,96,0.03)] transition-colors duration-200 hover:border-[#DA627D]/70"
          >
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                whileHover={prefersReducedMotion ? undefined : { scale: 1.06, rotate: 3 }}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#F9DBBD]/60 text-[#A53860]"
              >
                <UserRound className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.div>
              <h3 className="font-serif text-[18px] sm:text-[21px] leading-none font-bold text-[#220914]">
                Participant Eligibility
              </h3>
            </div>

            <ul className="space-y-3 text-[12px] sm:text-[13px] leading-relaxed text-[#220914]/80">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span>Open to bona fide undergraduate and postgraduate students from any recognized college or university.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span>Individual candidate participation format (no team sharing permitted during workspace sessions).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span>Valid college identity card or institutional email required upon enrollment.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span>Candidates may represent their college for the aggregate Institutional Championship Trophy.</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.18 }}
            whileHover={prefersReducedMotion ? undefined : { y: -3 }}
            className="rounded-[24px] border border-[#F9DBBD] bg-[#FDF9F7] p-5 sm:p-6 md:p-7 shadow-[0_2px_0_rgba(165,56,96,0.03)] transition-colors duration-200 hover:border-[#DA627D]/70"
          >
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                whileHover={prefersReducedMotion ? undefined : { scale: 1.06, rotate: 3 }}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#F9DBBD]/60 text-[#A53860]"
              >
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.div>
              <h3 className="font-serif text-[18px] sm:text-[21px] leading-none font-bold text-[#220914]">
                Championship Integrity Rules
              </h3>
            </div>

            <ul className="space-y-3 text-[12px] sm:text-[13px] leading-relaxed text-[#220914]/80">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span><strong>Two-Attempt Ceiling:</strong> Each contestant receives a strict maximum of two submissions per round.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span><strong>Proctoring Policy:</strong> Browser tab switches and window blur events are logged automatically. Reaching the warning ceiling results in automatic disqualification.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span><strong>Server-Authoritative Clock:</strong> Submissions attempted after the server expiry timestamp are rejected automatically.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#DA627D]" />
                <span><strong>Tie-Breaker Hierarchy:</strong> (1) Highest official score, (2) Lowest completion elapsed time, (3) Fewer attempts utilized.</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>
    </motion.main>
  );
};
