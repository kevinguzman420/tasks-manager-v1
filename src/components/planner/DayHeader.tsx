'use client';

import React from 'react';
import { usePlanner } from '@/context/PlannerContext';

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function DayHeader() {
  const { selectedDate, today } = usePlanner();
  const isToday = sameDay(selectedDate, today);

  return (
    <header className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] bg-[radial-gradient(circle_at_30%_30%,var(--accent),oklch(0.4_0.12_35))]" />
        <div>
          <div className="text-[11px] sm:text-[13px] text-[var(--muted)] tracking-[0.08em] uppercase">
            Diario · Planeador
          </div>
          <div className="serif text-[18px] sm:text-[22px] leading-[1] mt-[2px]">
            Diseña tu día
          </div>
        </div>
      </div>

      {/* Date — en móvil solo el badge "Hoy" + fecha corta */}
      <div className="mono flex items-center gap-[8px] text-[13px] text-[var(--muted)]">
        {isToday && (
          <span className="bg-[var(--accent-soft)] text-[var(--accent)] px-[10px] py-[3px] rounded-full text-[11px] font-[600] tracking-[0.04em] uppercase">
            Hoy
          </span>
        )}
        {/* Fecha corta en móvil */}
        <span className="capitalize text-[12px] sm:hidden">
          {selectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </span>
        {/* Fecha completa en desktop */}
        <span className="capitalize hidden sm:inline">
          {selectedDate.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      </div>
    </header>
  );
}
