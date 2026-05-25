'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/context/PlannerContext';
import { fmtMinutes } from '@/utils/scheduler';
import { Task } from '@/types';

export function Inbox() {
  const { inbox, addInboxTask, removeInboxTask, updateInboxTask, moveTaskToDay } = usePlanner();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dur, setDur] = useState(30);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addInboxTask(trimmed, dur);
    setName('');
    setDur(30);
  };

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] overflow-hidden">
      {/* Header — collapsible toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 sm:px-7 py-[14px] text-left"
      >
        <div className="flex items-center gap-[10px] flex-wrap">
          <span className="text-[18px]">📥</span>
          <span className="text-[15px] font-[500] text-[var(--ink)]">Bandeja de entrada</span>
          {inbox.length > 0 && (
            <span className="mono text-[12px] bg-[var(--accent-soft)] text-[var(--accent)] px-[8px] py-[2px] rounded-full font-[600]">
              {inbox.length}
            </span>
          )}
          <span className="text-[13px] text-[var(--muted)]">Tareas para después</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5.5L8 10.5L13 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 sm:px-7 pb-5 flex flex-col gap-4 border-t border-[var(--line)]">
          {/* Add task form */}
          <form onSubmit={submit} className="mt-4 bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-[14px] flex flex-col gap-[10px]">
            <input
              placeholder="Ej. Leer capítulo 3 del libro"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border-none bg-transparent text-[16px] text-[var(--ink)] px-[4px] py-[4px] outline-none"
            />
            <div className="flex flex-wrap items-end justify-between gap-[12px]">
              <div className="flex flex-col gap-[5px]">
                <span className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Duración</span>
                <InboxStepper value={dur} onChange={setDur} />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-[6px] rounded-[10px] border border-[var(--line)] bg-transparent text-[var(--ink-2)] hover:bg-[var(--bg-2)] px-[14px] py-[10px] text-[13px] font-[500] transition-colors"
              >
                <span className="text-[16px] leading-[0]">＋</span> Guardar
              </button>
            </div>
          </form>

          {/* Inbox list */}
          {inbox.length === 0 ? (
            <div className="border border-dashed border-[var(--line)] rounded-[14px] p-[28px_20px] text-center bg-[var(--bg)]">
              <div className="serif text-[22px] text-[var(--ink-2)]">Bandeja vacía.</div>
              <div className="mt-[4px] text-[13px] text-[var(--muted)]">
                Guarda tareas aquí para planearlas otro día.
              </div>
            </div>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-[6px]">
              {inbox.map(task => (
                <InboxRow
                  key={task.id}
                  task={task}
                  onMoveToDay={() => moveTaskToDay(task.id)}
                  onRemove={() => removeInboxTask(task.id)}
                  onChangeName={n => updateInboxTask(task.id, { name: n })}
                  onChangeDur={d => updateInboxTask(task.id, { duration: d })}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function InboxRow({ task, onMoveToDay, onRemove, onChangeName, onChangeDur }: {
  task: Task;
  onMoveToDay: () => void;
  onRemove: () => void;
  onChangeName: (name: string) => void;
  onChangeDur: (dur: number) => void;
}) {
  return (
    <li className="flex items-center gap-2 p-[10px_12px] bg-[var(--bg)] border border-[var(--line)] rounded-[12px]">
      {/* Name */}
      <input
        value={task.name}
        onChange={e => onChangeName(e.target.value)}
        className="flex-1 min-w-0 border-none bg-transparent text-[14px] font-[500] text-[var(--ink)] outline-none p-0"
      />
      {/* Duration badge */}
      <span className="mono text-[12px] text-[var(--muted)] whitespace-nowrap flex-shrink-0">
        {fmtMinutes(task.duration)}
      </span>
      {/* Duration stepper on hover — small stepper */}
      <div className="flex items-center gap-[1px] flex-shrink-0">
        <button
          type="button"
          onClick={() => onChangeDur(Math.max(5, task.duration - 5))}
          aria-label="Restar 5min"
          className="w-6 h-6 rounded-[6px] border border-[var(--line)] bg-transparent text-[var(--ink-2)] text-[14px] flex items-center justify-center hover:bg-[var(--bg-2)] transition-colors"
        >−</button>
        <button
          type="button"
          onClick={() => onChangeDur(task.duration + 5)}
          aria-label="Sumar 5min"
          className="w-6 h-6 rounded-[6px] border border-[var(--line)] bg-transparent text-[var(--ink-2)] text-[14px] flex items-center justify-center hover:bg-[var(--bg-2)] transition-colors"
        >+</button>
      </div>
      {/* Move to today */}
      <button
        onClick={onMoveToDay}
        title="Agregar al día actual"
        className="flex-shrink-0 inline-flex items-center gap-[4px] rounded-[8px] border border-[var(--accent)] text-[var(--accent)] bg-transparent px-[10px] py-[5px] text-[12px] font-[500] hover:bg-[var(--accent-soft)] transition-colors"
      >
        → Hoy
      </button>
      {/* Delete */}
      <button
        onClick={onRemove}
        aria-label="Eliminar de bandeja"
        className="flex-shrink-0 w-7 h-7 rounded-[8px] bg-transparent text-[var(--muted)] border border-transparent text-[13px] flex items-center justify-center hover:text-[var(--ink-2)] transition-colors"
      >✕</button>
    </li>
  );
}

function InboxStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center bg-[var(--card-bg)] border border-[var(--line)] rounded-[10px] overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(5, value - 5))}
        aria-label="Restar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] inline-flex items-center justify-center cursor-pointer"
      >−</button>
      <div className="mono min-w-[72px] text-center text-[15px] text-[var(--ink)] border-x border-[var(--line)] py-[10px] px-2">
        {fmtMinutes(value)}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(480, value + 5))}
        aria-label="Sumar"
        className="w-9 h-10 bg-transparent border-none text-[var(--ink-2)] text-[18px] inline-flex items-center justify-center cursor-pointer"
      >+</button>
    </div>
  );
}
