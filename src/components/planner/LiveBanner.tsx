'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { minToClock, fmtMinutes, timeToMin } from '@/utils/scheduler';
import { ScheduleEvent } from '@/types';

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function LiveBanner({ onOpenTask }: { onOpenTask: (id: string) => void }) {
  const { schedule, plan, selectedDate, today } = usePlanner();
  const isToday = sameDay(selectedDate, today);

  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const msToNextMin = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      tick();
      const id = setInterval(tick, 60_000);
      return () => clearInterval(id);
    }, msToNextMin);
    return () => clearTimeout(timeout);
  }, [isToday]);

  const currentEvent = useMemo<{ ev: ScheduleEvent; n: number } | null>(() => {
    if (!isToday || nowMin === null) return null;
    const startMin = timeToMin(plan.start);
    let n = nowMin;
    if (startMin > nowMin) n = nowMin + 1440;
    for (const ev of schedule.events) {
      if (ev.startAt <= n && n < ev.endAt) return { ev, n };
    }
    return null;
  }, [isToday, schedule, nowMin, plan.start]);

  if (!currentEvent) return null;

  const { ev, n } = currentEvent;
  const elapsed  = Math.max(0, n - ev.startAt);
  const remaining = Math.max(0, ev.endAt - n);
  const total = ev.endAt - ev.startAt;
  const pct = Math.max(0, Math.min(100, (elapsed / Math.max(1, total)) * 100));
  const isTask = ev.kind === 'task';

  const label = isTask
    ? 'Actualmente estás en'
    : `Es hora de tu ${(ev as any).label?.toLowerCase()}`;

  return (
    <section className="bg-[var(--ink)] text-[var(--bg)] rounded-[18px] px-[24px] py-[20px] flex gap-[20px] items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {/* Pulse dot */}
      <div className="relative flex items-center justify-center flex-shrink-0 w-[36px] h-[36px]">
        <span className="pulse-ring absolute inset-0 rounded-full bg-[var(--accent)] opacity-[0.35]" />
        <span className="block w-[12px] h-[12px] rounded-full bg-[var(--accent)]" style={{ boxShadow: '0 0 0 4px rgba(200,100,58,0.25)' }} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-[600] text-[var(--accent)] uppercase tracking-[0.12em]">
          ● EN VIVO · {label}
        </div>
        <div className="serif text-[28px] leading-[1.1] mt-[2px] text-[var(--bg)] tracking-[-0.01em]">
          {isTask ? ev.name : `${(ev as any).emoji} ${(ev as any).label}`}
        </div>
        <div className="mono text-[13px] text-[rgba(250,247,242,0.65)] mt-[6px] flex flex-wrap items-center gap-[10px]">
          <span>{minToClock(ev.startAt)} → {minToClock(ev.endAt)}</span>
          <span className="text-[rgba(250,247,242,0.3)]">·</span>
          <span>Terminas en <b className="text-[var(--bg)]">{fmtMinutes(remaining)}</b></span>
        </div>
        <div className="mt-[12px] h-[4px] rounded-full bg-[rgba(255,255,255,0.12)] overflow-hidden">
          <div className="h-full bg-[var(--accent)] transition-[width] duration-[800ms] ease" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Open button for tasks */}
      {isTask && (
        <button
          onClick={() => onOpenTask(ev.id)}
          className="inline-flex items-center self-center whitespace-nowrap rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] px-[14px] py-[8px] text-[13px] font-[500] text-[var(--bg)] cursor-pointer"
        >
          Abrirs
          <svg width="12" height="12" viewBox="0 0 12 12" className="ml-[6px]">
            <path
              d="M3 6h6 M6.5 3.5L9 6l-2.5 2.5"
              stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </section>
  );
}
