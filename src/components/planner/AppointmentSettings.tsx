'use client';

import React, { useState, useRef } from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { fmtMinutes, timeToMin, minToClock } from '@/utils/scheduler';
import { Appointment } from '@/types';

export function AppointmentSettings() {
  const { plan, addAppointment, removeAppointment, updateAppointment } = usePlanner();
  const { appointments } = plan;

  const [name, setName]         = useState('');
  const [at, setAt]             = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || duration <= 0) return;
    addAppointment(name.trim(), at, duration);
    setName('');
    setAt('09:00');
    setDuration(60);
    inputRef.current?.focus();
  };

  const totalMin = appointments.reduce((s, a) => s + a.duration, 0);

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-4 sm:p-7">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 sm:mb-5 gap-3">
        <div>
          <h2 className="serif text-[22px] sm:text-[28px] mt-1 font-[400] tracking-[-0.01em]">
            Compromisos a hora fija
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Reuniones, llamadas o eventos que no puedes mover.
          </p>
        </div>
        {appointments.length > 0 && (
          <div className="flex flex-col gap-1 text-right flex-shrink-0">
            <div className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Total</div>
            <div className="mono text-[22px] sm:text-[28px] font-[500] leading-[1.1]">{fmtMinutes(totalMin)}</div>
            <div className="text-[12px] text-[var(--muted)]">{appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}</div>
          </div>
        )}
      </div>

      {/* Formulario nueva cita */}
      <form
        onSubmit={submit}
        className="bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-4 mb-4 flex flex-col gap-3"
      >
        <input
          ref={inputRef}
          placeholder="Ej. Llamada con cliente, Reunión de equipo…"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border-none bg-transparent text-[16px] sm:text-[17px] text-[var(--ink)] p-1 outline-none"
        />

        {/* Hora + duración + botón — apilan en móvil, fila en sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {/* Hora */}
            <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
              <span className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Hora</span>
              <input
                type="time"
                value={at}
                onChange={e => setAt(e.target.value)}
                className="mono appearance-none bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] px-3 py-2.5 text-[15px] text-[var(--ink)] w-full"
              />
            </div>
            {/* Duración */}
            <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
              <span className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Duración</span>
              <DurationStepper value={duration} onChange={setDuration} />
            </div>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-[14px] font-[500] text-white"
            style={{ background: 'var(--appt)' }}
          >
            <span className="text-[18px] leading-[0]">＋</span> Agregar cita
          </button>
        </div>
      </form>

      {/* Lista de citas */}
      {appointments.length > 0 && (
        <ul className="list-none m-0 p-0 flex flex-col gap-2">
          {[...appointments]
            .sort((a, b) => timeToMin(a.at) - timeToMin(b.at))
            .map(appt => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                isEditing={editingId === appt.id}
                onToggleEdit={() => setEditingId(editingId === appt.id ? null : appt.id)}
                onUpdate={patch => updateAppointment(appt.id, patch)}
                onRemove={() => removeAppointment(appt.id)}
              />
            ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentRow({ appt, isEditing, onToggleEdit, onUpdate, onRemove }: {
  appt: Appointment;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (patch: Partial<Appointment>) => void;
  onRemove: () => void;
}) {
  const startMin = timeToMin(appt.at);
  const endMin   = startMin + appt.duration;

  return (
    <li
      className="rounded-[12px] border p-3 flex flex-col gap-2"
      style={{ borderColor: 'var(--appt)', background: 'var(--appt-soft)' }}
    >
      {/* Fila principal */}
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0 bg-white border"
          style={{ borderColor: 'var(--appt)' }}
        >
          📅
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <input
            value={appt.name}
            onChange={e => onUpdate({ name: e.target.value })}
            className="border-none bg-transparent p-0 text-[15px] font-[500] text-[var(--ink)] min-w-0 w-full outline-none"
          />
          <div className="flex flex-wrap items-center gap-[6px] text-[13px]">
            <span className="mono font-[500]" style={{ color: 'var(--appt)' }}>
              {minToClock(startMin)} → {minToClock(endMin)}
            </span>
            <span className="text-[var(--line)]">·</span>
            <button
              onClick={onToggleEdit}
              className="inline-flex items-center gap-[2px] rounded-full px-2 py-[3px] text-[12px] border"
              style={isEditing
                ? { borderColor: 'var(--appt)', background: 'white', color: 'var(--appt)' }
                : { borderColor: 'var(--line)', background: 'transparent', color: 'var(--muted)' }
              }
            >
              <span className="mono">{fmtMinutes(appt.duration)}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" className="ml-1 opacity-70">
                <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Badge + borrar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="hidden sm:inline rounded-full px-2.5 py-1 text-[10px] font-[600] uppercase tracking-[0.08em] border"
            style={{ borderColor: 'var(--appt)', color: 'var(--appt)', background: 'transparent' }}
          >
            Cita
          </span>
          <button
            onClick={onRemove}
            aria-label="Eliminar cita"
            className="w-7 h-7 rounded-[8px] bg-transparent text-[var(--muted)] border border-transparent text-[13px] flex items-center justify-center"
          >✕</button>
        </div>
      </div>

      {/* Editor inline — apila en móvil, fila en sm+ */}
      {isEditing && (
        <div className="mt-1 p-3 rounded-[12px] bg-white border border-[var(--line)] flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <span className="text-[10px] text-[var(--muted)] tracking-[0.06em] uppercase">Hora de inicio</span>
            <input
              type="time"
              value={appt.at}
              onChange={e => onUpdate({ at: e.target.value })}
              className="mono appearance-none bg-[var(--bg)] border border-[var(--line)] rounded-[10px] px-3 py-2.5 text-[15px] text-[var(--ink)] w-full"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <span className="text-[10px] text-[var(--muted)] tracking-[0.06em] uppercase">Duración</span>
            <DurationStepper value={appt.duration} onChange={v => onUpdate({ duration: v })} />
          </div>
          <button
            onClick={onToggleEdit}
            className="w-full sm:w-auto rounded-[10px] px-4 py-2.5 text-[13px] font-[500] text-white"
            style={{ background: 'var(--appt)' }}
          >
            Listo
          </button>
        </div>
      )}
    </li>
  );
}

function DurationStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const step = 15;
  return (
    <div className="flex items-center bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] overflow-hidden w-full">
      <button
        type="button"
        onClick={() => onChange(Math.max(step, value - step))}
        aria-label="Restar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] flex-shrink-0 inline-flex items-center justify-center"
      >−</button>
      <div className="mono flex-1 text-center text-[15px] text-[var(--ink)] border-l border-r border-[var(--line)] py-2.5">
        {fmtMinutes(value)}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(480, value + step))}
        aria-label="Sumar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] flex-shrink-0 inline-flex items-center justify-center"
      >+</button>
    </div>
  );
}
