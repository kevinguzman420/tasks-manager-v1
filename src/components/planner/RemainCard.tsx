'use client';

import React from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { dayMinutes, fmtMinutes, fmtMinutesShort } from '@/utils/scheduler';

export function RemainCard() {
  const { plan, schedule } = usePlanner();

  const totalDay = dayMinutes(plan.start, plan.end);
  const mealsTotal = plan.meals.breakfast.duration + plan.meals.lunch.duration + plan.meals.dinner.duration;
  const tasksTotal = plan.tasks.reduce((s, t) => s + t.duration, 0);
  const afterMeals = Math.max(0, totalDay - mealsTotal);
  const remaining = totalDay - mealsTotal - tasksTotal;
  const overbooked = remaining < 0;

  const pctMeals  = totalDay ? Math.min(100, (mealsTotal / totalDay) * 100) : 0;
  const pctTasks  = totalDay ? Math.min(100 - pctMeals, (tasksTotal / totalDay) * 100) : 0;
  const pctRemain = Math.max(0, 100 - pctMeals - pctTasks);

  return (
    <section className="bg-[var(--ink)] text-[var(--bg)] rounded-[18px] p-[28px] flex flex-col gap-[20px]">
      <div className="flex justify-between items-end gap-[24px] flex-wrap">
        <div>
          <div className="text-[11px] text-[rgba(250,247,242,0.55)] tracking-[0.08em] uppercase">
            Tiempo restante para tareas
          </div>
          <div className={`serif text-[72px] leading-[1] mt-[6px] ${overbooked ? 'text-[oklch(0.78_0.16_30)]' : 'text-[var(--bg)]'}`}>
            {overbooked ? '−' : ''}{fmtMinutesShort(Math.abs(remaining))}
          </div>
          <div className={`mt-[8px] text-[13px] ${overbooked ? 'text-[oklch(0.78_0.16_30)]' : 'text-[rgba(250,247,242,0.7)]'}`}>
            {overbooked
              ? `Te pasaste por ${fmtMinutes(-remaining)}. Quita o acorta algo.`
              : `${fmtMinutes(afterMeals)} disponibles después de las comidas.`}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-[24px] flex-wrap">
          <LegendDot
            color="var(--accent-soft)"
            label="Comidas"
            value={fmtMinutes(mealsTotal)}
          />
          <LegendDot
            color="var(--bg)"
            label="Tareas"
            value={fmtMinutes(tasksTotal)}
            ring={false}
          />
          <LegendDot
            color="transparent"
            label="Libre"
            value={fmtMinutes(Math.max(0, remaining))}
            ring
          />
        </div>
      </div>

      {/* Distribution bar */}
      <div
        role="img"
        aria-label="Distribución del día"
        className="flex h-[14px] rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]"
      >
        <div className="h-full transition-[width] duration-200 ease" style={{ width: `${pctMeals}%`, background: 'var(--accent-soft)' }} />
        <div className="h-full transition-[width] duration-200 ease" style={{ width: `${pctTasks}%`, background: 'var(--bg)' }} />
        <div className="h-full" style={{ width: `${pctRemain}%`, background: 'transparent' }} />
      </div>
    </section>
  );
}

function LegendDot({
  color, label, value, ring = false,
}: {
  color: string;
  label: string;
  value: string;
  ring?: boolean;
}) {
  return (
    <div className="flex items-center gap-[10px]">
      <span className={`inline-block shrink-0 w-[12px] h-[12px] rounded-[4px] ${ring ? 'border-[2px] border-dashed border-[rgba(250,247,242,0.35)] bg-transparent' : ''}`} style={{ background: ring ? 'transparent' : color }} />
      <div className="flex flex-col">
        <span className="text-[11px] text-[rgba(250,247,242,0.6)] tracking-[0.04em] uppercase">{label}</span>
        <span className="mono text-[14px]">{value}</span>
      </div>
    </div>
  );
}
