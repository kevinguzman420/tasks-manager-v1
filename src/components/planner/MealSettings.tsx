'use client';

import React from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { fmtMinutes, dayMinutes } from '@/utils/scheduler';
import { MealConfig } from '@/types';

const MEAL_INFO = {
  breakfast: { label: 'Desayuno', emoji: '☕' },
  lunch:     { label: 'Almuerzo', emoji: '🥗' },
  dinner:    { label: 'Cena',     emoji: '🍲' },
} as const;

type MealId = keyof typeof MEAL_INFO;

export function MealSettings() {
  const { plan, updateMeal } = usePlanner();

  const mealsTotal = plan.meals.breakfast.duration + plan.meals.lunch.duration + plan.meals.dinner.duration;
  const totalDay   = dayMinutes(plan.start, plan.end);
  const pct        = totalDay ? Math.round((mealsTotal / totalDay) * 100) : 0;

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-4 sm:p-7">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 sm:mb-5 gap-3">
        <h2 className="serif text-[22px] sm:text-[28px] mt-1 font-[400] tracking-[-0.01em]">
          Tiempo para comer sin prisas
        </h2>
        <div className="flex flex-col gap-1 text-right flex-shrink-0">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Total</div>
          <div className="mono text-[22px] sm:text-[28px] font-[500] leading-[1.1]">{fmtMinutes(mealsTotal)}</div>
          <div className="text-[12px] text-[var(--muted)]">{pct}% del día</div>
        </div>
      </div>

      {/* Meal cards — 1 col en móvil, 3 en sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.entries(MEAL_INFO) as [MealId, typeof MEAL_INFO[MealId]][]).map(([id, meta]) => (
          <MealCard
            key={id}
            label={meta.label}
            emoji={meta.emoji}
            meal={plan.meals[id]}
            onChange={patch => updateMeal(id, patch)}
          />
        ))}
      </div>
    </section>
  );
}

function MealCard({ label, emoji, meal, onChange }: {
  label: string;
  emoji: string;
  meal: MealConfig;
  onChange: (patch: Partial<MealConfig>) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[20px]">{emoji}</span>
        <span className="text-[14px] font-[500]">{label}</span>
      </div>

      {/* En móvil: hora y duración en fila; en sm: columna */}
      <div className="flex sm:flex-col gap-3">
        <div className="flex-1">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase mb-1">Hora</div>
          <input
            type="time"
            value={meal.at}
            onChange={e => onChange({ at: e.target.value })}
            className="mono appearance-none bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] px-3 py-2.5 text-[15px] text-[var(--ink)] w-full"
          />
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase mb-1">Duración</div>
          <DurationStepper
            value={meal.duration}
            onChange={v => onChange({ duration: v })}
            step={5}
            min={0}
            max={180}
          />
        </div>
      </div>
    </div>
  );
}

function DurationStepper({ value, onChange, step, min, max }: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] overflow-hidden w-full">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Restar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] flex-shrink-0 inline-flex items-center justify-center"
      >−</button>
      <div className="mono flex-1 text-center text-[15px] text-[var(--ink)] border-l border-r border-[var(--line)] py-2.5">
        {fmtMinutes(value)}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Sumar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] flex-shrink-0 inline-flex items-center justify-center"
      >+</button>
    </div>
  );
}
