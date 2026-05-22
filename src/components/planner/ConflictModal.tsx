'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { minToClock, fmtMinutes } from '@/utils/scheduler';

export interface ConflictModalData {
  taskId: string;           // vacío en modo creación
  taskName: string;
  taskStartAt: number;      // minutos absolutos donde empieza la tarea
  stealMin: number;
  eventLabel: string;
  eventKind: 'meal' | 'appointment';
  currentDuration: number;
}

interface Props {
  data: ConflictModalData;
  /**
   * 'create' → la tarea aún no existe; el modal aparece antes de crearla.
   * 'edit'   → la tarea ya existe; el modal permite corregirla.
   */
  mode?: 'create' | 'edit';
  /** Aplica la duración elegida. En create: crea la tarea. En edit: actualiza. */
  onConfirm: (taskId: string, newDuration: number) => void;
  /**
   * 'edit': cierra el modal sin cambios.
   * 'create': crea la tarea con el conflicto tal cual (decidir después).
   */
  onIgnore: () => void;
  /** Solo en 'create': cancela la creación por completo (no crea nada). */
  onCancel?: () => void;
}

export function ConflictModal({ data, mode = 'edit', onConfirm, onIgnore, onCancel }: Props) {
  const {
    taskId, taskName, taskStartAt,
    stealMin, eventLabel, eventKind, currentDuration,
  } = data;

  const isCreate    = mode === 'create';
  const maxDuration = currentDuration - stealMin;
  const [draft, setDraft]  = useState(currentDuration);

  useEffect(() => { setDraft(currentDuration); }, [currentDuration]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') isCreate ? onCancel?.() : onIgnore();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCreate, onIgnore, onCancel]);

  const handleAdapt   = useCallback(() => onConfirm(taskId, maxDuration), [taskId, maxDuration, onConfirm]);
  const handleConfirm = useCallback(() => onConfirm(taskId, draft),       [taskId, draft,       onConfirm]);

  // Horarios en vivo según el draft
  const fixedStart  = taskStartAt + currentDuration - stealMin;
  const draftEndAt  = taskStartAt + draft;
  const draftSteal  = Math.max(0, draftEndAt - fixedStart);
  const draftIsClean = draftSteal === 0;

  // Barra visual proporcional
  const barSpan    = Math.max(draft, currentDuration) + 10;
  const safeWidth  = Math.min(100, (Math.min(draft, fixedStart - taskStartAt) / barSpan) * 100);
  const stealWidth = Math.max(0, (draftSteal / barSpan) * 100);
  const markerLeft = ((fixedStart - taskStartAt) / barSpan) * 100;

  const step = 5;
  const article = eventKind === 'meal' ? 'el' : 'la';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={isCreate ? onCancel : onIgnore}
        aria-hidden="true"
      />

      {/* Tarjeta modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-full max-w-[440px] mx-4
                   bg-[var(--card-bg)] rounded-2xl shadow-2xl
                   flex flex-col overflow-hidden"
      >
        {/* ── Cabecera ──────────────────────────────────────────────────── */}
        <div className="bg-[var(--accent-soft)] border-b border-[var(--line)] px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none mt-0.5" aria-hidden>⚠️</span>
              <div>
                <p
                  id="conflict-title"
                  className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--warn)]"
                >
                  {isCreate ? 'Conflicto al crear la tarea' : 'Conflicto de tiempo'}
                </p>
                <h2 className="serif text-[21px] font-[400] leading-tight mt-1 text-[var(--ink)]">
                  {isCreate ? 'Esta tarea invadiría' : 'Esta tarea invade'}{' '}
                  {article}{' '}
                  <span className="text-[var(--warn)]">{eventLabel}</span>
                </h2>
              </div>
            </div>

            {/* Botón cerrar (solo en create: cancela sin crear) */}
            {isCreate && onCancel && (
              <button
                onClick={onCancel}
                aria-label="Cancelar creación"
                className="text-[var(--muted)] text-lg leading-none flex-shrink-0 mt-0.5"
              >✕</button>
            )}
          </div>

          <p className="mt-3 text-[14px] text-[var(--ink-2)] leading-relaxed">
            <span className="font-medium">"{taskName}"</span>
            {isCreate ? ' terminaría' : ' termina'} a las{' '}
            <span className="mono font-medium">{minToClock(taskStartAt + currentDuration)}</span>,
            pero {article} {eventLabel} empieza a las{' '}
            <span className="mono font-medium">{minToClock(fixedStart)}</span>.
            {' '}Robaría{' '}
            <span className="font-semibold text-[var(--warn)]">{fmtMinutes(stealMin)}</span>.
          </p>
        </div>

        {/* ── Cuerpo ────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Barra visual */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--muted)] mb-2">
              Vista del conflicto
            </p>
            <div className="relative h-7 rounded-lg overflow-hidden bg-[var(--bg)] border border-[var(--line)]">
              <div
                className="absolute left-0 top-0 h-full bg-[var(--ink)] transition-all duration-200"
                style={{ width: `${safeWidth}%` }}
              />
              {stealWidth > 0 && (
                <div
                  className="absolute top-0 h-full transition-all duration-200"
                  style={{ left: `${safeWidth}%`, width: `${stealWidth}%`, background: 'var(--warn)', opacity: 0.75 }}
                />
              )}
              <div
                className="absolute top-0 h-full w-[2px] bg-[var(--accent)] z-10 transition-all duration-200"
                style={{ left: `${markerLeft}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                <span className="mono text-[10px] text-white font-medium drop-shadow">
                  {minToClock(taskStartAt)}
                </span>
                {draftSteal > 0 && (
                  <span className="mono text-[10px] text-white font-medium drop-shadow ml-auto">
                    +{fmtMinutes(draftSteal)} robados
                  </span>
                )}
              </div>
            </div>
            <div
              className="mt-1 text-[11px] text-[var(--muted)] transition-all duration-200"
              style={{ paddingLeft: `${markerLeft}%` }}
            >
              <span className="mono">{eventLabel}</span>
            </div>
          </div>

          {/* Stepper de duración */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--muted)] mb-2">
              Ajustar duración
            </p>
            <div className="flex items-center gap-3">
              <DurationStepper
                value={draft}
                onChange={setDraft}
                step={step}
                min={step}
                max={Math.max(currentDuration * 2, 480)}
                warn={!draftIsClean}
              />
              {draftIsClean
                ? <span className="text-[12px] text-[var(--good)] font-medium">✓ Sin conflicto</span>
                : <span className="text-[12px] text-[var(--warn)]">Roba {fmtMinutes(draftSteal)}</span>
              }
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3 flex-wrap">

          {/* Acción izquierda */}
          {isCreate ? (
            // Crear con el conflicto y resolverlo después
            <button
              onClick={onIgnore}
              className="text-[13px] text-[var(--muted)] underline underline-offset-2 decoration-dotted"
            >
              Agregar de todos modos
            </button>
          ) : (
            // Cerrar sin cambios
            <button
              onClick={onIgnore}
              className="text-[13px] text-[var(--muted)] underline underline-offset-2 decoration-dotted"
            >
              Ignorar
            </button>
          )}

          {/* Acciones derechas */}
          <div className="flex items-center gap-2">
            {/* Adaptar automáticamente */}
            <button
              onClick={handleAdapt}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--good)]
                         bg-transparent text-[var(--good)] px-4 py-2.5 text-[13px] font-medium
                         hover:bg-[var(--good)] hover:text-white transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path d="M2 6.5h9M7 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Adaptar a {fmtMinutes(maxDuration)}
            </button>

            {/* Confirmar duración manual */}
            <button
              onClick={handleConfirm}
              disabled={draft === currentDuration}
              className="rounded-[10px] bg-[var(--ink)] text-[var(--bg)] px-4 py-2.5
                         text-[13px] font-medium disabled:opacity-40"
            >
              {isCreate ? 'Crear así' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function DurationStepper({
  value, onChange, step, min, max, warn,
}: {
  value: number; onChange: (v: number) => void;
  step: number; min: number; max: number; warn: boolean;
}) {
  const hh = Math.floor(value / 60);
  const mm = value % 60;

  return (
    <div className={`inline-flex items-center rounded-[10px] overflow-hidden border transition-colors ${
      warn ? 'border-[var(--warn)]' : 'border-[var(--line)]'
    } bg-[var(--bg)]`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Restar 5 minutos"
        className="w-9 h-10 bg-transparent text-[var(--ink-2)] text-lg leading-none flex items-center justify-center"
      >−</button>
      <div className={`mono min-w-[88px] text-center text-[15px] border-x px-2 py-2.5 transition-colors ${
        warn ? 'border-[var(--warn)] text-[var(--warn)]' : 'border-[var(--line)] text-[var(--ink)]'
      }`}>
        {hh > 0 && <span>{hh}<span className="text-[var(--muted)] text-[12px] ml-0.5">h</span>{' '}</span>}
        {mm > 0 && <span>{mm}<span className="text-[var(--muted)] text-[12px] ml-0.5">min</span></span>}
        {hh === 0 && mm === 0 && <span className="text-[var(--muted)]">0min</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Sumar 5 minutos"
        className="w-9 h-10 bg-transparent text-[var(--ink-2)] text-lg leading-none flex items-center justify-center"
      >+</button>
    </div>
  );
}
