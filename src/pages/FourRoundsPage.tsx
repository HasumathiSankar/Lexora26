import React from 'react';
import { Image, Scissors, Workflow, ClipboardCheck } from 'lucide-react';

const rounds = [
  {
    number: '01',
    name: 'Reverse Prompting',
    description: 'Study a reference image and write a prompt that describes its visual details, including lighting, colours, subject, and composition.',
    difficulty: 'Beginner',
    Icon: Image,
  },
  {
    number: '02',
    name: 'Prompt Compression',
    description: 'Shorten a simple instruction while preserving all important requirements.',
    difficulty: 'Beginner',
    Icon: Scissors,
  },
  {
    number: '03',
    name: 'Prompt Relay',
    description: 'Create three connected prompts where each step uses the previous step’s output.',
    difficulty: 'Beginner to Intermediate',
    Icon: Workflow,
  },
  {
    number: '04',
    name: 'Prompt Chaining',
    description: 'Build a three-stage workflow to draft, review, and improve a college event announcement.',
    difficulty: 'Intermediate',
    Icon: ClipboardCheck,
  },
];

export const FourRoundsPage: React.FC = () => (
  <div className="min-h-screen bg-[#FCF8F5] text-[#220914]">
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl border-l-4 border-[#DA627D] pl-5 sm:pl-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A53860]">LEXORA 2026 · Challenge format</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-[#220914] sm:text-4xl">Four Rounds</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#220914]/75">
          Build prompt-writing skills across four practical challenges, from describing images to connecting prompts into a complete workflow.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {rounds.map(({ number, name, description, difficulty, Icon }) => (
          <article key={number} className="flex min-h-48 flex-col border border-[#E8D7C8] border-l-4 border-l-[#DA627D] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="font-mono text-sm font-bold text-[#A53860]">ROUND {number}</span>
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#DA627D]" />
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold">{name}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#220914]/75">{description}</p>
            <div className="mt-5 border-t border-[#EFE4DA] pt-3 text-xs font-semibold text-[#A53860]">
              Difficulty: {difficulty}
            </div>
          </article>
        ))}
      </div>
    </section>
  </div>
);
