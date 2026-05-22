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
  const totalH   = Math.floor(totalDay / 60);
  const totalM   = totalDay % 60;

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-5 sm:p-8 flex flex-col sm:grid sm:grid-cols-[1.4fr_1fr] gap-5 sm:gap-8 sm:items-center">
      {/* Izquierda */}
      <div className="flex flex-col gap-3">
        <h2 className="serif text-[22px] sm:text-[28px] leading-[1.05] m-0 font-[400] tracking-[-0.015em]">
          ¿Entre qué horas{' '}
          <em className="text-[var(--accent)]">existes</em>{' '}
          {isToday ? 'hoy' : 'este día'}?
        </h2>
        <p className="text-[var(--ink-2)] text-[14px] sm:text-[15px] leading-[1.5] m-0">
          Define cuándo arranca tu día y cuándo te vas a dormir.
          Todo lo demás se calcula a partir de ahí.
        </p>

        {/* Time inputs */}
        <div className="flex items-end gap-3 mt-1 flex-wrap">
          <TimeField
            label="Inicio del día"
            value={plan.start}
            onChange={v => updatePlan({ start: v })}
          />
          <div className="text-[20px] text-[var(--muted)] pb-3">→</div>
          <TimeField
            label="Final del día"
            value={plan.end}
            onChange={v => updatePlan({ end: v })}
          />
        </div>
      </div>

      {/* Derecha — separador solo en sm+ */}
      <div className="sm:border-l sm:border-[var(--line)] sm:pl-8 flex flex-col gap-2 border-t sm:border-t-0 border-[var(--line)] pt-4 sm:pt-0">
        <div className="text-[11px] text-[var(--muted)] tracking-[0.08em] uppercase">
          Total disponible
        </div>
        <div className="serif text-[56px] sm:text-[88px] leading-[1] font-[400] text-[var(--ink)] tracking-[-0.02em]">
          {totalH}
          <span className="text-[24px] sm:text-[32px] text-[var(--muted)] ml-[2px]">h</span>
          {totalM > 0 && (
            <>
              {' '}{totalM}
              <span className="text-[24px] sm:text-[32px] text-[var(--muted)] ml-[2px]">m</span>
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
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[11px] text-[var(--muted)] tracking-[0.04em] uppercase">
        {label}
      </span>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mono appearance-none bg-[var(--bg)] border border-[var(--line)] rounded-[10px] px-3 py-3 text-[17px] text-[var(--ink)] w-full sm:w-auto sm:min-w-[130px]"
      />
    </label>
  );
}
