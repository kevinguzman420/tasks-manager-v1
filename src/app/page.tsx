'use client';

import React, { useState } from 'react';
import { DayHeader } from '@/components/planner/DayHeader';
import { Calendar } from '@/components/planner/Calendar';
import { DayLimits } from '@/components/planner/DayLimits';
import { MealSettings } from '@/components/planner/MealSettings';
import { AppointmentSettings } from '@/components/planner/AppointmentSettings';
import { RemainCard } from '@/components/planner/RemainCard';
import { LiveBanner } from '@/components/planner/LiveBanner';
import { Timeline } from '@/components/planner/Timeline';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="max-w-[1080px] mx-auto py-5 sm:py-8 px-4 sm:px-7 pb-20 flex flex-col gap-4 sm:gap-6">
      <DayHeader />
      <Calendar />
      <LiveBanner onOpenTask={id => router.push(`/task/${id}`)} />
      <Timeline />
      <RemainCard />

      {/* Configurar día — collapsible */}
      <div className="flex flex-col gap-[16px]">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="flex items-center justify-between w-full rounded-[14px] border border-[var(--line)] bg-[var(--card-bg)] px-[20px] py-[14px] text-left"
        >
          <div className="flex items-center gap-[10px]">
            <span className="text-[18px]">⚙</span>
            <span className="text-[15px] font-[500] text-[var(--ink)]">Configurar día</span>
            <span className="text-[13px] text-[var(--muted)]">Límites, comidas y citas</span>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
          >
            <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {settingsOpen && (
          <div className="flex flex-col gap-[16px]">
            <DayLimits />
            <MealSettings />
            <AppointmentSettings />
          </div>
        )}
      </div>

      <footer className="text-[13px] text-[var(--ink-2)] text-center mt-[12px]">
        <span className="text-[var(--muted)]">Versión 0.1 ·</span>{' '}
        Diseña tu día, un bloque a la vez.
      </footer>
    </main>
  );
}
