'use client';

import React from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { dayMinutes, fmtMinutes, fmtMinutesShort } from '@/utils/scheduler';

export function RemainCard() {
  const { plan } = usePlanner();

  const totalDay  = dayMinutes(plan.start, plan.end);
  const mealsTotal = plan.meals.breakfast.duration + plan.meals.lunch.duration + plan.meals.dinner.duration;
  const tasksTotal = plan.tasks.reduce((s, t) => s + t.duration, 0);
  const afterMeals = Math.max(0, totalDay - mealsTotal);
  const remaining  = totalDay - mealsTotal - tasksTotal;
  const overbooked = remaining < 0;

  const pctMeals  = totalDay ? Math.min(100, (mealsTotal / totalDay) * 100) : 0;
  const pctTasks  = totalDay ? Math.min(100 - pctMeals, (tasksTotal / totalDay) * 100) : 0;
  const pctRemain = Math.max(0, 100 - pctMeals - pctTasks);

  return (
    <section className="bg-[var(--ink)] text-[var(--bg)] rounded-[18px] p-5 sm:p-7 flex flex-col gap-4 sm:gap-5">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <div className="text-[11px] text-[rgba(250,247,242,0.55)] tracking-[0.08em] uppercase">
            Tiempo restante para tareas
          </div>
          <div className={`serif text-[48px] sm:text-[72px] leading-[1] mt-1 ${overbooked ? 'text-[oklch(0.78_0.16_30)]' : 'text-[var(--bg)]'}`}>
            {overbooked ? '−' : ''}{fmtMinutesShort(Math.abs(remaining))}
          </div>
          <div className={`mt-1 text-[13px] ${overbooked ? 'text-[oklch(0.78_0.16_30)]' : 'text-[rgba(250,247,242,0.7)]'}`}>
            {overbooked
              ? `Te pasaste por ${fmtMinutes(-remaining)}. Quita o acorta algo.`
              : `${fmtMinutes(afterMeals)} disponibles después de las comidas.`}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex gap-5 sm:gap-6 flex-wrap">
          <LegendDot color="var(--accent-soft)" label="Comidas"  value={fmtMinutes(mealsTotal)} />
          <LegendDot color="var(--bg)"          label="Tareas"   value={fmtMinutes(tasksTotal)} ring={false} />
          <LegendDot color="transparent"        label="Libre"    value={fmtMinutes(Math.max(0, remaining))} ring />
        </div>
      </div>

      {/* Barra de distribución */}
      <div
        role="img"
        aria-label="Distribución del día"
        className="flex h-3 rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]"
      >
        <div className="h-full transition-[width] duration-200" style={{ width: `${pctMeals}%`,  background: 'var(--accent-soft)' }} />
        <div className="h-full transition-[width] duration-200" style={{ width: `${pctTasks}%`,  background: 'var(--bg)' }} />
        <div className="h-full"                                  style={{ width: `${pctRemain}%`, background: 'transparent' }} />
      </div>
    </section>
  );
}

function LegendDot({ color, label, value, ring = false }: {
  color: string; label: string; value: string; ring?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block shrink-0 w-3 h-3 rounded-[4px] ${ring ? 'border-2 border-dashed border-[rgba(250,247,242,0.35)] bg-transparent' : ''}`}
        style={{ background: ring ? 'transparent' : color }}
      />
      <div className="flex flex-col">
        <span className="text-[10px] text-[rgba(250,247,242,0.6)] tracking-[0.04em] uppercase">{label}</span>
        <span className="mono text-[13px]">{value}</span>
      </div>
    </div>
  );
}
