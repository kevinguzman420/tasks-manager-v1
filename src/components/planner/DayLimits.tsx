'use client';

import React from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { dayMinutes, minToClock, timeToMin } from '@/utils/scheduler';

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function DayLimits() {
  const { plan, updatePlan, selectedDate, today } = usePlanner();
  const isToday = sameDay(selectedDate, today);

  const totalDay = dayMinutes(plan.start, plan.end);
  const totalH = Math.floor(totalDay / 60);
  const totalM = totalDay % 60;

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-[32px] grid grid-cols-[1.4fr_1fr] gap-[32px] items-center">
      {/* Left */}
      <div className="flex flex-col gap-[14px]">
        <h2 className="serif text-[28px] leading-[1.05] m-0 font-[400] tracking-[-0.015em]">
          ¿Entre qué horas{' '}
          <em className="text-[var(--accent)]">existes</em>{' '}
          {isToday ? 'hoy' : 'este día'}?
        </h2>
        <p className="text-[var(--ink-2)] text-[15px] leading-[1.5] max-w-[420px] m-0">
          Define cuándo arranca tu día y cuándo te vas a dormir.
          Todo lo demás se calcula a partir de ahí.
        </p>

        {/* Time inputs */}
        <div className="flex items-end gap-[16px] mt-[4px]">
          <TimeField
            label="Inicio del día"
            value={plan.start}
            onChange={v => updatePlan({ start: v })}
          />
          <div className="text-[22px] text-[var(--muted)] pb-[12px]">→</div>
          <TimeField
            label="Final del día"
            value={plan.end}
            onChange={v => updatePlan({ end: v })}
          />
        </div>
      </div>

      {/* Right */}
      <div className="border-l border-[var(--line)] pl-[32px] flex flex-col gap-[8px]">
        <div className="text-[11px] text-[var(--muted)] tracking-[0.08em] uppercase">
          Total disponible
        </div>
        <div className="serif text-[88px] leading-[1] font-[400] text-[var(--ink)] tracking-[-0.02em]">
          {totalH}
          <span className="text-[32px] text-[var(--muted)] ml-[2px]">h</span>
          {totalM > 0 && (
            <>
              {' '}{totalM}
              <span className="text-[32px] text-[var(--muted)] ml-[2px]">m</span>
            </>
          )}
        </div>
        <div className="mono text-[var(--muted)] text-[13px]">
          {minToClock(timeToMin(plan.start))} → {minToClock(timeToMin(plan.end))}
        </div>
      </div>
    </section>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12px] text-[var(--muted)] tracking-[0.04em] uppercase">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mono appearance-none bg-[var(--bg)] border border-[var(--line)] rounded-[10px] px-[14px] py-[12px] text-[18px] text-[var(--ink)] min-w-[130px]"
      />
    </label>
  );
}
