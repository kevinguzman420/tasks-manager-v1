'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

  // ── Tick each second ──────────────────────────────────────────────────────
  // Guardamos `new Date()` directamente en estado para que React siempre
  // vea un valor nuevo y no pueda omitir el re-render.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Time values (derivados de `now`, sin useMemo para evitar staleness) ──
  const startMin  = timeToMin(plan.start);
  const totalSec  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const nowMin    = Math.floor(totalSec / 60);
  const secIntoMin = totalSec % 60;
  // Ajuste para planes que empiezan después de medianoche
  const nowAbs    = nowMin < startMin ? nowMin + 1440 : nowMin;

  // ── Current / next event ──────────────────────────────────────────────────
  const currentEvent: ScheduleEvent | null = isToday
    ? (schedule.events.find(ev => ev.startAt <= nowAbs && nowAbs < ev.endAt) ?? null)
    : null;

  const nextEvent: ScheduleEvent | null = useMemo(() => {
    if (!isToday) return null;
    return schedule.events.find(ev => ev.startAt > nowAbs) ?? null;
  // nowAbs cambia por minuto; suficiente granularidad para "siguiente evento"
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, schedule.events, nowMin]);

  // ── Countdown & progress ──────────────────────────────────────────────────
  const remainingSec = currentEvent != null
    ? Math.max(0, (currentEvent.endAt - nowAbs) * 60 - secIntoMin)
    : null;

  const progressPct = currentEvent != null
    ? Math.max(0, Math.min(100,
        ((nowAbs * 60 + secIntoMin - currentEvent.startAt * 60) /
         ((currentEvent.endAt - currentEvent.startAt) * 60)) * 100
      ))
    : null;

  // ── Keyboard: Escape to close ─────────────────────────────────────────────
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Modo enfoque"
    >
      {/* ── Close button ── */}
      <button
        onClick={onClose}
        className="sticky top-0 self-end m-4 inline-flex items-center gap-[6px] rounded-full border border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-sm px-[12px] py-[8px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] transition-colors z-10"
      >
        ✕ <span className="hidden sm:inline">Cerrar</span>
      </button>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 pt-2">
        <div className="w-full max-w-md flex flex-col items-center gap-4 sm:gap-6 text-center">

          {currentEvent ? (
            <>
              {/* Kind label */}
              <span className="text-[11px] font-[600] tracking-[0.1em] uppercase text-[var(--muted)]">
                {getEventKindLabel(currentEvent)}
              </span>

              {/* Emoji + name */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[40px] sm:text-[48px] leading-none">
                  {getEventEmoji(currentEvent)}
                </span>
                <h1 className="serif text-[26px] sm:text-[34px] md:text-[42px] font-[400] tracking-[-0.015em] leading-[1.2] text-[var(--ink)] px-2">
                  {getEventName(currentEvent)}
                </h1>
              </div>

              {/* Time range */}
              <span className="mono text-[13px] sm:text-[14px] text-[var(--muted)]">
                {minToClock(currentEvent.startAt)} → {minToClock(currentEvent.endAt)}
                {' · '}{fmtMinutes(currentEvent.duration)}
              </span>

              {/* Countdown */}
              <div
                className="mono text-[56px] sm:text-[72px] md:text-[88px] font-[500] tabular-nums leading-[1] text-[var(--accent)]"
                aria-live="polite"
                aria-atomic="true"
              >
                {remainingSec !== null ? fmtCountdown(remainingSec) : '--:--'}
              </div>

              {/* Progress bar — second-level precision */}
              {progressPct !== null && (
                <div className="w-full max-w-xs h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Task controls */}
              {currentEvent.kind === 'task' && (
                <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
                  <button
                    onClick={() => updateTask(currentEvent.id, { duration: Math.max(5, currentEvent.duration - 5) })}
                    className="rounded-full border border-[var(--line)] bg-transparent px-[14px] py-[9px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] active:scale-95 transition-all"
                  >
                    −5 min
                  </button>
                  <button
                    onClick={() => { toggleTaskDone(currentEvent.id); onClose(); }}
                    className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-[22px] py-[11px] text-[14px] font-[500] hover:opacity-90 active:scale-95 transition-all"
                  >
                    ✓ Terminado
                  </button>
                  <button
                    onClick={() => updateTask(currentEvent.id, { duration: currentEvent.duration + 5 })}
                    className="rounded-full border border-[var(--line)] bg-transparent px-[14px] py-[9px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] active:scale-95 transition-all"
                  >
                    +5 min
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="text-[11px] font-[600] tracking-[0.1em] uppercase text-[var(--muted)]">
                {isToday ? 'Tiempo libre' : 'Sin evento activo'}
              </span>
              <span className="text-[52px] sm:text-[64px] leading-none">☀️</span>
              <h1 className="serif text-[28px] sm:text-[34px] font-[400] tracking-[-0.015em] text-[var(--ink)]">
                {isToday ? 'Sin bloque activo' : 'Vista de otro día'}
              </h1>
              {isToday && (
                <p className="text-[14px] sm:text-[15px] text-[var(--muted)] leading-[1.6] max-w-[260px]">
                  Disfruta este momento libre o<br />agrega una tarea al plan.
                </p>
              )}
            </>
          )}

          {/* Next event */}
          {nextEvent && (
            <div className="mt-2 px-4 py-3 rounded-[12px] bg-[var(--bg-2)] text-[12px] sm:text-[13px] text-[var(--muted)] w-full max-w-xs">
              Siguiente:{' '}
              <span className="font-[500] text-[var(--ink-2)]">{getEventName(nextEvent)}</span>
              {' a las '}
              <span className="mono">{minToClock(nextEvent.startAt)}</span>
            </div>
          )}

        </div>
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
        className="fixed bottom-6 right-4 sm:right-6 z-40 inline-flex items-center gap-[6px] rounded-full bg-[var(--ink)] text-[var(--bg)] px-[16px] py-[11px] text-[14px] font-[500] shadow-lg hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <span>🎯</span>
        <span className="hidden sm:inline">Foco</span>
      </button>
      {open && <FocusOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
