'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlanner } from '@/context/PlannerContext';
import { fmtMinutes, minToClock } from '@/utils/scheduler';
import { SubTask, TaskEvent } from '@/types';

function DragGripIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="3" r="1.2" /><circle cx="8" cy="3" r="1.2" />
      <circle cx="2" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" />
      <circle cx="2" cy="13" r="1.2" /><circle cx="8" cy="13" r="1.2" />
    </svg>
  );
}

function Stepper({
  value, onChange, step, min, max, suffix,
}: {
  value: number; onChange: (v: number) => void;
  step: number; min: number; max: number; suffix: string;
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden',
      background: 'var(--card-bg)',
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        style={{ width: 28, height: 32, background: 'transparent', border: 'none', color: 'var(--ink-2)', fontSize: 16 }}
      >−</button>
      <span className="mono" style={{
        fontSize: 13, padding: '0 10px',
        borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)',
        minWidth: 70, textAlign: 'center', lineHeight: '32px',
      }}>
        {fmtMinutes(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + step)}
        style={{ width: 28, height: 32, background: 'transparent', border: 'none', color: 'var(--ink-2)', fontSize: 16 }}
      >+</button>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { plan, schedule, replaceTask, addSubTask, removeSubTask, updateSubTask, reorderSubTasks } = usePlanner();

  const taskId = params.id as string;
  const task = plan.tasks.find(t => t.id === taskId);
  const taskEvent = schedule.events.find(e => e.kind === 'task' && e.id === taskId) as TaskEvent | undefined;

  const [draftName, setDraftName] = useState('');
  const [draftHours, setDraftHours] = useState(0);
  const [draftMinutes, setDraftMinutes] = useState(15);

  // DnD
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const subtasks = task?.subtasks ?? [];

  const subTotal = useMemo(() => subtasks.reduce((s, st) => s + st.duration, 0), [subtasks]);
  const diff = (task?.duration ?? 0) - subTotal;
  const status = diff === 0 ? 'perfect' : diff > 0 ? 'underflow' : 'overflow';
  const pct = Math.max(0, Math.min(100, (subTotal / Math.max(1, task?.duration ?? 1)) * 100));

  useEffect(() => {
    if (diff > 0) {
      setDraftMinutes(Math.min(30, Math.max(5, diff)));
    }
  }, [task?.id]); // eslint-disable-line

  if (!task || !taskEvent) {
    return (
      <main style={{
        maxWidth: 880, margin: '0 auto', padding: '32px 28px 80px',
        display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center',
      }}>
        <div className="serif" style={{ fontSize: 28, color: 'var(--ink-2)' }}>Tarea no encontrada</div>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'transparent', border: '1px solid var(--line)',
            borderRadius: 999, padding: '8px 14px 8px 12px',
            fontSize: 13, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center',
          }}
        >← Volver al día</button>
      </main>
    );
  }

  const startAt = taskEvent.startAt;

  const addSub = (e?: React.FormEvent) => {
    e?.preventDefault();
    const dur = draftHours * 60 + draftMinutes;
    const nm = draftName.trim();
    if (!nm || dur <= 0) return;
    addSubTask(taskId, nm, dur);
    setDraftName('');
    setDraftHours(0);
    setDraftMinutes(15);
  };

  const balanceAll = () => {
    if (subtasks.length === 0) return;
    const each = Math.floor((task.duration) / subtasks.length);
    const remainder = task.duration - each * subtasks.length;
    const next = subtasks.map((s, i) => ({
      ...s, duration: each + (i === subtasks.length - 1 ? remainder : 0),
    }));
    reorderSubTasks(taskId, next);
  };

  const fillRemainderInLast = () => {
    if (subtasks.length === 0) return;
    const next = [...subtasks];
    const others = next.slice(0, -1).reduce((s, st) => s + st.duration, 0);
    next[next.length - 1] = { ...next[next.length - 1], duration: Math.max(5, task.duration - others) };
    reorderSubTasks(taskId, next);
  };

  // Calculate clock for each subtask
  let cursor = startAt;
  const subsWithClock = subtasks.map(s => {
    const st = cursor;
    cursor += s.duration;
    return { ...s, startAt: st, endAt: cursor };
  });

  // DnD handlers
  const dndStart = (e: React.DragEvent, i: number) => {
    setDragIdx(i); setOverIdx(i);
    e.dataTransfer.effectAllowed = 'move';
  };
  const dndOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    setOverIdx(before ? i : i + 1);
  };
  const dndDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx == null || overIdx == null) return resetDnd();
    let to = overIdx;
    if (to > dragIdx) to -= 1;
    if (to !== dragIdx) {
      const next = [...subtasks];
      const [m] = next.splice(dragIdx, 1);
      next.splice(to, 0, m);
      reorderSubTasks(taskId, next);
    }
    resetDnd();
  };
  const resetDnd = () => { setDragIdx(null); setOverIdx(null); };

  const statusColor = status === 'perfect' ? 'var(--good)' : status === 'overflow' ? '#b04a3a' : '#b8842a';
  const statusBg    = status === 'perfect' ? 'rgba(74,138,90,0.12)' : status === 'overflow' ? 'rgba(176,74,58,0.12)' : 'rgba(184,132,42,0.12)';

  return (
    <main style={{
      maxWidth: 880, margin: '0 auto', padding: '32px 28px 80px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Back */}
      <button
        onClick={() => router.push('/')}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent', border: '1px solid var(--line)',
          borderRadius: 999, padding: '8px 14px 8px 12px',
          fontSize: 13, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 16, marginRight: 6 }}>←</span> Volver al día
      </button>

      {/* Hero card */}
      <section style={{
        background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 18, padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tarea</div>
            <input
              value={task.name}
              onChange={e => replaceTask(taskId, { ...task, name: e.target.value })}
              className="serif"
              style={{
                width: '100%', border: 'none', outline: 'none', background: 'transparent',
                fontSize: 40, lineHeight: 1.1, marginTop: 6,
                fontFamily: 'inherit', fontWeight: 400, letterSpacing: '-0.015em', color: 'var(--ink)',
              }}
            />
            <div style={{ display: 'flex', gap: 16, marginTop: 14, color: 'var(--muted)', fontSize: 13 }}>
              <span className="mono">⏱ {fmtMinutes(task.duration)}</span>
              <span style={{ color: 'var(--line)' }}>·</span>
              <span className="mono">{minToClock(startAt)} → {minToClock(startAt + task.duration)}</span>
            </div>
          </div>
          <div style={{
            padding: '8px 14px', borderRadius: 999, border: `1px solid ${statusColor}`,
            background: statusBg, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
            color: statusColor,
          }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
              {status === 'perfect' && '✓ Cuadrado'}
              {status === 'underflow' && `Faltan ${fmtMinutes(diff)}`}
              {status === 'overflow' && `Sobran ${fmtMinutes(-diff)}`}
            </span>
          </div>
        </div>

        {/* Allocation bar */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
            <span>Asignado</span>
            <span className="mono">
              {fmtMinutes(subTotal)}{' '}
              <span style={{ color: 'var(--line)' }}>/</span>{' '}
              {fmtMinutes(task.duration)}
            </span>
          </div>
          <div style={{
            height: 10, borderRadius: 999, background: 'var(--bg-2)', overflow: 'hidden',
            position: 'relative', display: 'flex',
          }}>
            <div style={{
              width: `${Math.min(100, pct)}%`, height: '100%',
              background: status === 'perfect' ? 'var(--good)' : status === 'overflow' ? '#b04a3a' : 'var(--ink)',
              transition: 'width 180ms ease',
            }} />
          </div>
        </div>
      </section>

      {/* Subtask form */}
      <section style={{
        background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: 18, padding: 28,
      }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Dividir en sub-tareas
        </div>
        <h2 className="serif" style={{ fontSize: 26, margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.01em' }}>
          ¿De qué se compone esta tarea?
        </h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 6, marginBottom: 18 }}>
          Suma las piezas pequeñas en las que la puedes partir. Deben sumar exactamente{' '}
          <span className="mono">{fmtMinutes(task.duration)}</span>.
        </p>

        <form onSubmit={addSub} style={{
          background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 14,
          padding: 16, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <input
            placeholder="Ej. Investigar referencias"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            style={{
              width: '100%', border: 'none', background: 'transparent',
              fontSize: 17, color: 'var(--ink)', padding: '6px 4px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Duración
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <SubStepper value={draftHours} onChange={setDraftHours} step={1} min={0} max={12} suffix="h" />
                <SubStepper value={draftMinutes} onChange={setDraftMinutes} step={5} min={0} max={55} suffix="min" />
              </div>
            </div>
            <button
              type="submit"
              style={{
                background: 'var(--ink)', color: 'var(--bg)',
                border: 'none', borderRadius: 10, padding: '12px 18px',
                fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 0, marginRight: 6 }}>＋</span> Agregar sub-tarea
            </button>
          </div>
          {diff > 0 && (
            <button
              type="button"
              onClick={() => { setDraftHours(Math.floor(diff / 60)); setDraftMinutes(diff % 60); }}
              style={{
                alignSelf: 'flex-start', background: 'transparent',
                border: '1px dashed var(--line)', color: 'var(--muted)',
                borderRadius: 999, padding: '5px 12px', fontSize: 12,
              }}
            >
              Llenar con los <span className="mono">{fmtMinutes(diff)}</span> restantes
            </button>
          )}
        </form>

        {/* Subtask list */}
        {subtasks.length === 0 ? (
          <div style={{
            border: '1px dashed var(--line)', borderRadius: 14, padding: '40px 20px',
            textAlign: 'center', background: 'var(--bg)',
          }}>
            <div className="serif" style={{ fontSize: 26, color: 'var(--ink-2)' }}>Sin sub-tareas todavía.</div>
            <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>
              Agrega arriba la primera pieza para empezar a desglosar.
            </div>
          </div>
        ) : (
          <>
            <ul
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
              onDragOver={e => e.preventDefault()}
              onDrop={dndDrop}
              onDragEnd={resetDnd}
            >
              {subsWithClock.map((s, i) => {
                const isDragging = dragIdx === i;
                const showInsertBefore = overIdx === i && dragIdx !== null && dragIdx !== i && dragIdx !== i - 1;
                const isLast = i === subsWithClock.length - 1;
                const showInsertAfter = isLast && overIdx === subsWithClock.length && dragIdx !== null && dragIdx !== i;

                return (
                  <React.Fragment key={s.id}>
                    {showInsertBefore && (
                      <div style={{ height: 2, background: 'var(--accent)', borderRadius: 2, margin: '2px 8px', boxShadow: '0 0 0 4px rgba(200,100,58,0.12)' }} />
                    )}
                    <li
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px 12px 8px',
                        background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
                        opacity: isDragging ? 0.35 : 1, transition: 'opacity 120ms',
                      }}
                      onDragOver={e => dndOver(e, i)}
                    >
                      <div
                        draggable
                        onDragStart={e => dndStart(e, i)}
                        onDragEnd={resetDnd}
                        style={{
                          width: 22, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--muted)', cursor: 'grab', borderRadius: 6, userSelect: 'none',
                        }}
                      >
                        <DragGripIcon />
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999,
                        background: 'var(--card-bg)', color: 'var(--ink-2)', fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--line)', flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <input
                          value={s.name}
                          onChange={e => updateSubTask(taskId, s.id, { name: e.target.value })}
                          style={{
                            border: 'none', background: 'transparent',
                            fontSize: 15, color: 'var(--ink)', padding: 0, fontWeight: 500, width: '100%',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                            {minToClock(s.startAt)} → {minToClock(s.endAt)}
                          </span>
                        </div>
                      </div>
                      <Stepper
                        value={s.duration}
                        onChange={v => updateSubTask(taskId, s.id, { duration: Math.max(5, v) })}
                        step={5}
                        min={5}
                        max={480}
                        suffix="min"
                      />
                      <button
                        onClick={() => removeSubTask(taskId, s.id)}
                        aria-label="Eliminar"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: 'transparent', color: 'var(--muted)',
                          border: '1px solid transparent', fontSize: 13,
                        }}
                      >✕</button>
                    </li>
                    {showInsertAfter && (
                      <div style={{ height: 2, background: 'var(--accent)', borderRadius: 2, margin: '2px 8px', boxShadow: '0 0 0 4px rgba(200,100,58,0.12)' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </ul>

            {/* Quick actions */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {diff !== 0 && (
                <button
                  onClick={fillRemainderInLast}
                  style={{
                    background: 'var(--bg-2)', color: 'var(--ink-2)',
                    border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 13,
                  }}
                >
                  {diff > 0
                    ? <>Agregar <span className="mono">{fmtMinutes(diff)}</span> a la última</>
                    : <>Quitar <span className="mono">{fmtMinutes(-diff)}</span> de la última</>}
                </button>
              )}
              <button
                onClick={balanceAll}
                style={{
                  background: 'var(--bg-2)', color: 'var(--ink-2)',
                  border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 13,
                }}
              >Repartir igual entre {subtasks.length}</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SubStepper({
  value, onChange, step, min, max, suffix,
}: {
  value: number; onChange: (v: number) => void;
  step: number; min: number; max: number; suffix: string;
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        style={{
          width: 36, height: 40, background: 'transparent', border: 'none',
          color: 'var(--ink-2)', fontSize: 18, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div className="mono" style={{
        minWidth: 70, textAlign: 'center', fontSize: 16, color: 'var(--ink)',
        borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)',
        padding: '10px 8px',
      }}>
        {value}<span style={{ color: 'var(--muted)', marginLeft: 4, fontSize: 13 }}>{suffix}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        style={{
          width: 36, height: 40, background: 'transparent', border: 'none',
          color: 'var(--ink-2)', fontSize: 18, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  );
}
