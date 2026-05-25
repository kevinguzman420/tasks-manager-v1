'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { timeToMin, fmtMinutes, minToClock } from '@/utils/scheduler';
import { ScheduleEvent } from '@/types';

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtCountdown(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getEventName(ev: ScheduleEvent): string {
  if (ev.kind === 'meal') return ev.label;
  if (ev.kind === 'appointment') return ev.name;
  return ev.name;
}

function getEventEmoji(ev: ScheduleEvent): string {
  if (ev.kind === 'meal') return ev.emoji;
  if (ev.kind === 'appointment') return '📅';
  return '⚡';
}

function getEventKindLabel(ev: ScheduleEvent): string {
  if (ev.kind === 'meal') return 'Comida';
  if (ev.kind === 'appointment') return 'Cita';
  return 'Tarea en curso';
}

// ── Internal overlay ─────────────────────────────────────────────────────────

function FocusOverlay({ onClose }: { onClose: () => void }) {
  const { plan, schedule, selectedDate, today, toggleTaskDone, updateTask } = usePlanner();
  const isToday = sameDay(selectedDate, today);

  // Tick every second for countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const startMin = timeToMin(plan.start);

  const nowData = useMemo(() => {
    const d = new Date();
    const totalSec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    const nowMin = Math.floor(totalSec / 60);
    const secIntoMin = totalSec % 60;
    // Adjust for days that start before midnight
    const nowAbs = nowMin < startMin ? nowMin + 1440 : nowMin;
    return { nowAbs, secIntoMin, nowMin };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, startMin]);

  const { nowAbs, secIntoMin } = nowData;

  const currentEvent = isToday
    ? schedule.events.find(ev => ev.startAt <= nowAbs && nowAbs < ev.endAt) ?? null
    : null;

  const nextEvent = useMemo(() => {
    if (!isToday) return null;
    return schedule.events.find(ev => ev.startAt > nowAbs) ?? null;
  }, [isToday, schedule.events, nowAbs]);

  const remainingSec = currentEvent
    ? (currentEvent.endAt - nowAbs) * 60 - secIntoMin
    : null;

  const progressPct = currentEvent
    ? Math.max(0, Math.min(100,
        ((nowAbs - currentEvent.startAt) / (currentEvent.endAt - currentEvent.startAt)) * 100
      ))
    : null;

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg)] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Modo enfoque"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 inline-flex items-center gap-[6px] rounded-full border border-[var(--line)] bg-[var(--bg)] px-[12px] py-[7px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] transition-colors"
      >
        ✕ <span className="hidden sm:inline">Cerrar</span>
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
        {currentEvent ? (
          <>
            {/* Kind label */}
            <span className="text-[11px] font-[600] tracking-[0.1em] uppercase text-[var(--muted)]">
              {getEventKindLabel(currentEvent)}
            </span>

            {/* Emoji + name */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[44px]">{getEventEmoji(currentEvent)}</span>
              <h1 className="serif text-[32px] sm:text-[40px] font-[400] tracking-[-0.015em] leading-[1.15] text-[var(--ink)]">
                {getEventName(currentEvent)}
              </h1>
            </div>

            {/* Time range */}
            <span className="mono text-[14px] text-[var(--muted)]">
              {minToClock(currentEvent.startAt)} → {minToClock(currentEvent.endAt)}
              {' · '}{fmtMinutes(currentEvent.duration)}
            </span>

            {/* Countdown */}
            <div
              className="mono text-[64px] sm:text-[80px] font-[500] tabular-nums leading-[1] text-[var(--accent)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {remainingSec !== null ? fmtCountdown(remainingSec) : '--:--'}
            </div>

            {/* Progress bar */}
            {progressPct !== null && (
              <div className="w-full h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {/* Task controls */}
            {currentEvent.kind === 'task' && (
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  onClick={() => updateTask(currentEvent.id, { duration: Math.max(5, currentEvent.duration - 5) })}
                  className="rounded-full border border-[var(--line)] bg-transparent px-[14px] py-[8px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] transition-colors"
                >−5 min</button>
                <button
                  onClick={() => { toggleTaskDone(currentEvent.id); onClose(); }}
                  className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-[20px] py-[10px] text-[14px] font-[500] hover:opacity-90 transition-opacity"
                >✓ Terminado</button>
                <button
                  onClick={() => updateTask(currentEvent.id, { duration: currentEvent.duration + 5 })}
                  className="rounded-full border border-[var(--line)] bg-transparent px-[14px] py-[8px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] transition-colors"
                >+5 min</button>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-[11px] font-[600] tracking-[0.1em] uppercase text-[var(--muted)]">
              {isToday ? 'Tiempo libre' : 'Sin evento activo'}
            </span>
            <span className="text-[56px]">☀️</span>
            <h1 className="serif text-[32px] font-[400] tracking-[-0.015em] text-[var(--ink)]">
              {isToday ? 'Sin bloque activo' : 'Vista de otro día'}
            </h1>
            {isToday && (
              <p className="text-[15px] text-[var(--muted)] leading-[1.5]">
                Disfruta este momento libre o<br />agrega una tarea al plan.
              </p>
            )}
          </>
        )}

        {/* Next event */}
        {nextEvent && (
          <div className="mt-1 text-[12px] text-[var(--muted)]">
            Siguiente:{' '}
            <span className="font-[500] text-[var(--ink-2)]">{getEventName(nextEvent)}</span>
            {' a las '}
            <span className="mono">{minToClock(nextEvent.startAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public: floating button + overlay ────────────────────────────────────────

export function FocusModeButton() {
  const { selectedDate, today } = usePlanner();
  const [open, setOpen] = useState(false);
  const isToday = sameDay(selectedDate, today);

  if (!isToday) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Modo enfoque"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-[6px] rounded-full bg-[var(--ink)] text-[var(--bg)] px-[16px] py-[11px] text-[14px] font-[500] shadow-lg hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <span>🎯</span>
        <span className="hidden sm:inline">Foco</span>
      </button>
      {open && <FocusOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
