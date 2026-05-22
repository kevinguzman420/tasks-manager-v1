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
  const totalDay = dayMinutes(plan.start, plan.end);
  const pct = totalDay ? Math.round((mealsTotal / totalDay) * 100) : 0;

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-[28px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-[20px] gap-[16px]">
        <div>
          <h2 className="serif text-[28px] mt-[4px] font-[400] tracking-[-0.01em]">
            Tiempo para comer sin prisas
          </h2>
        </div>
        <div className="flex flex-col gap-[4px] min-w-0 text-right">
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">
            Total comidas
          </div>
          <div className="mono text-[28px] font-[500] leading-[1.1]">
            {fmtMinutes(mealsTotal)}
          </div>
          <div className="text-[12px] text-[var(--muted)]">{pct}% del día</div>
        </div>
      </div>

      {/* Meal cards */}
      <div className="grid grid-cols-3 gap-[14px]">
        {(Object.entries(MEAL_INFO) as [MealId, typeof MEAL_INFO[MealId]][]).map(([id, meta]) => (
          <MealCard
            key={id}
            id={id}
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

function MealCard({
  id,
  label,
  emoji,
  meal,
  onChange,
}: {
  id: MealId;
  label: string;
  emoji: string;
  meal: MealConfig;
  onChange: (patch: Partial<MealConfig>) => void;
}) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-[16px] flex flex-col gap-[14px]">
      <div className="flex items-center gap-[8px]">
        <span className="text-[20px]">{emoji}</span>
        <span className="text-[14px] font-[500]">{label}</span>
      </div>

      <div className="flex flex-col gap-[10px]">
        <div>
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase mb-[4px]">Hora</div>
          <input
            type="time"
            value={meal.at}
            onChange={e => onChange({ at: e.target.value })}
            className="mono appearance-none bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] px-[12px] py-[10px] text-[16px] text-[var(--ink)] w-full"
          />
        </div>

        <div>
          <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase mb-[4px]">Duración</div>
          <DurationStepper
            value={meal.duration}
            onChange={v => onChange({ duration: v })}
            step={5}
            min={0}
            max={180}
            suffix="min"
          />
        </div>
      </div>
    </div>
  );
}

function DurationStepper({
  value, onChange, step, min, max, suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <div className="inline-flex items-center bg-[var(--bg)] border border-[var(--line)] rounded-[10px] overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Restar"
        className="w-[36px] h-[40px] bg-transparent border-none text-[var(--ink-2)] text-[18px] leading-[1] inline-flex items-center justify-center"
      >−</button>
      <div className="mono min-w-[70px] text-center text-[16px] text-[var(--ink)] border-l border-r border-[var(--line)] px-[8px] py-[10px]">
        {value}<span className="text-[var(--muted)] ml-[4px] text-[13px]">{suffix}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Sumar"
        className="w-[36px] h-[40px] bg-transparent border-none text-[var(--ink-2)] text-[18px] leading-[1] inline-flex items-center justify-center"
      >+</button>
    </div>
  );
}
