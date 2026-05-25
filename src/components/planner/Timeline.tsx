"use client";

import clsx from "clsx";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { dateKey } from "@/context/PlannerContext";
import {
  minToClock,
  fmtMinutes,
  timeToMin,
  dayMinutes,
} from "@/utils/scheduler";
import { ScheduleEvent, MealEvent, AppointmentEvent, TaskEvent } from "@/types";
import { useRouter } from "next/navigation";
import { useScheduleNotifications } from "@/hooks/useScheduleNotifications";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Timeline() {
  const {
    plan,
    plans,
    schedule,
    addTask,
    removeTask,
    updateTask,
    reorderTasks,
    selectedDate,
    today,
    toggleTaskDone,
    copyFromDay,
    moveTaskToInbox,
  } = usePlanner();
  const { fixedConflicts } = schedule;
  const router = useRouter();
  const isToday = sameDay(selectedDate, today);

  const [name, setName] = useState("");
  const [dur, setDur] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowMin(null);
      return;
    }
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  // Notificaciones del sistema
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);
  const requestNotifPerm = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };
  useScheduleNotifications(schedule, isToday, selectedDate);

  // Derived values
  const totalDay = dayMinutes(plan.start, plan.end);
  const mealsMin = Object.values(plan.meals).filter(m => m.enabled !== false).reduce((s, m) => s + m.duration, 0);
  const apptMin  = plan.appointments.reduce((s, a) => s + a.duration, 0);
  const tasksMin = plan.tasks.reduce((s, t) => s + t.duration, 0);
  const freeMin  = Math.max(0, totalDay - mealsMin - apptMin - tasksMin);
  const overbooked = (mealsMin + apptMin + tasksMin) > totalDay;

  // Yesterday key for "copy from day"
  const yesterday = new Date(selectedDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const hasYesterday = (plans[yesterdayKey]?.tasks?.length ?? 0) > 0;

  const startMin = timeToMin(plan.start);
  const sleepStart = startMin + (schedule.dayEnd - startMin);

  const currentEventId = useMemo<string | null>(() => {
    if (!isToday || nowMin === null) return null;
    let n = nowMin;
    if (startMin > nowMin) n = nowMin + 1440;
    for (const ev of schedule.events) {
      if (ev.startAt <= n && n < ev.endAt) return ev.id;
    }
    return null;
  }, [isToday, schedule, nowMin, startMin]);

  const handleDragStart = (e: React.DragEvent, taskIdx: number) => {
    setDragIndex(taskIdx);
    setOverIndex(taskIdx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverTask = (e: React.DragEvent, taskIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientY - rect.top < rect.height / 2;
    setOverIndex(before ? taskIdx : taskIdx + 1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex == null || overIndex == null) return reset();
    let to = overIndex;
    if (to > dragIndex) to -= 1;
    if (to !== dragIndex) reorderTasks(dragIndex, to);
    reset();
  };

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const resetForm = () => {
    setName("");
    setDur(30);
    inputRef.current?.focus();
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addTask(trimmed, dur);
    resetForm();
  };

  const addBreak = () => {
    addTask("Descanso", 15);
  };

  const events = schedule.events;

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--line)] rounded-[18px] p-4 sm:p-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h2 className="serif text-[24px] sm:text-[30px] m-0 font-[400] tracking-[-0.01em]">
            Tu día, hora por hora
          </h2>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[var(--muted)]">
            Las comidas y citas se anclan a su hora. Las tareas llenan los
            huecos en el orden que tú decides.
          </p>
          {notifPerm === 'default' && (
            <button
              onClick={requestNotifPerm}
              className="mt-[8px] inline-flex items-center gap-[5px] rounded-full border border-[var(--line)] bg-[var(--bg)] px-[10px] py-[5px] text-[12px] text-[var(--ink-2)] hover:border-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            >
              <span>🔔</span> Activar avisos del día
            </button>
          )}
          {notifPerm === 'denied' && (
            <p className="mt-[6px] text-[11px] text-[var(--muted)]">
              Avisos bloqueados en el navegador — actívalos desde la configuración del sitio.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end bg-[var(--bg-2)] px-[14px] py-[10px] rounded-[14px] flex-shrink-0 min-w-[120px]">
          <span className="mono text-[14px] font-[600] text-[var(--ink)]">{fmtMinutes(tasksMin)} plan.</span>
          <span className={`mono text-[12px] ${overbooked ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>
            {overbooked ? `−${fmtMinutes(Math.abs(freeMin))}` : `${fmtMinutes(freeMin)} libres`}
          </span>
        </div>
      </div>

      {/* Day bar */}
      {(events.length > 0 || plan.tasks.length > 0) && (() => {
        const dStart = timeToMin(plan.start);
        let dEnd = timeToMin(plan.end);
        if (dEnd <= dStart) dEnd += 1440;
        const span = dEnd - dStart;
        const nowPct = (isToday && nowMin !== null)
          ? Math.max(0, Math.min(100, ((nowMin < dStart ? nowMin + 1440 : nowMin) - dStart) / span * 100))
          : null;
        return (
          <div className="mb-[16px]">
            <div className="relative h-2 rounded-full bg-[var(--bg-2)] overflow-hidden">
              {events.map((ev, idx) => {
                const left  = Math.max(0, (ev.startAt - dStart) / span * 100);
                const width = Math.min(100 - left, (ev.endAt - ev.startAt) / span * 100);
                if (width <= 0) return null;
                return (
                  <div key={idx} className="absolute top-0 h-full"
                    style={{
                      left: `${left}%`, width: `${width}%`,
                      background: ev.kind === 'task' ? 'var(--ink)' : ev.kind === 'meal' ? 'var(--accent)' : 'var(--appt)',
                      opacity: ev.kind === 'task' ? 0.85 : 1,
                    }}
                  />
                );
              })}
              {nowPct !== null && (
                <div className="absolute top-0 h-full w-[2px] bg-[var(--accent)] z-10" style={{ left: `${nowPct}%` }} />
              )}
            </div>
            <div className="flex justify-between mt-[4px] text-[10px] mono text-[var(--muted)]">
              <span>{minToClock(timeToMin(plan.start))}</span>
              <span>{minToClock(timeToMin(plan.end))}</span>
            </div>
          </div>
        );
      })()}

      <form
        onSubmit={submit}
        className="bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-[16px] mb-[20px] flex flex-col gap-[12px]"
      >
        <input
          ref={inputRef}
          placeholder="Ej. Trabajo profundo en proyecto X"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border-none bg-transparent text-[18px] text-[var(--ink)] p-[6px_4px] outline-none"
        />
        <div className="flex flex-wrap items-end justify-between gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <span className="text-[11px] text-[var(--muted)] tracking-[0.06em] uppercase">Duración</span>
            <Stepper
              value={dur}
              onChange={setDur}
              step={5}
              min={5}
              max={480}
              format={fmtMinutes}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-[8px] rounded-[10px] bg-[var(--ink)] text-[var(--bg)] px-[18px] py-[12px] text-[14px] font-[500]"
          >
            <span className="text-[18px] leading-[0]">＋</span> Agregar tarea
          </button>
        </div>
      </form>

      {/* Quick actions */}
      <div className="flex items-center gap-[16px] mt-[-4px] mb-[16px] px-[2px]">
        <button type="button" onClick={addBreak}
          className="inline-flex items-center gap-[6px] rounded-full border border-[var(--line)] bg-[var(--bg)] px-[10px] py-[5px] text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
        >
          <span>＋</span> Descanso <span className="mono">15min</span>
        </button>
      </div>

      {/* Franja "Arrancar como ayer" — solo si hoy no hay tareas */}
      {hasYesterday && plan.tasks.length === 0 && (
        <div className="flex items-center justify-between gap-[12px] border-l-[3px] border-[var(--accent)] rounded-r-[10px] bg-[var(--accent-soft)] px-[14px] py-[10px] mb-[16px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <span className="text-[16px] flex-shrink-0">🔁</span>
            <div className="min-w-0 leading-[1.4]">
              <span className="text-[13px] font-[500] text-[var(--ink)]">Arrancar como ayer</span>
              <span className="text-[12px] text-[var(--muted)] ml-[6px] hidden sm:inline">— importa las tareas del día anterior</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyFromDay(yesterdayKey)}
            className="flex-shrink-0 text-[13px] font-[500] rounded-[8px] border border-[var(--accent)] bg-transparent px-[12px] py-[6px] text-[var(--accent)] hover:bg-white transition-colors"
          >
            Importar →
          </button>
        </div>
      )}

      {/* Banner: conflictos entre eventos fijos */}
      {fixedConflicts.length > 0 && (
        <div className="mb-4 rounded-xl border border-(--warn) bg-(--accent-soft) p-[12px_16px] flex flex-col gap-1.5">
          <div className="text-[12px] font-semibold text-(--warn) uppercase tracking-[0.06em]">
            ⚠{" "}
            {fixedConflicts.length === 1
              ? "Conflicto entre eventos fijos"
              : `${fixedConflicts.length} conflictos entre eventos fijos`}
          </div>
          {fixedConflicts.map((c, i) => (
            <div key={i} className="text-[13px] text-(--ink-2)">
              <span className="font-medium">{c.aLabel}</span> y{" "}
              <span className="font-medium">{c.bLabel}</span> se superponen{" "}
              <span className="mono font-semibold text-(--warn)">
                {fmtMinutes(c.overlapMin)}
              </span>
            </div>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <div className="border border-dashed border-[var(--line)] rounded-[14px] p-[40px_20px] text-center bg-[var(--bg)]">
          <div className="serif text-[28px] text-[var(--ink-2)]">
            Tu día está en blanco.
          </div>
          <div className="mt-[6px] text-[14px] text-[var(--muted)]">
            Agrega tu primera tarea arriba para empezar a llenarlo.
          </div>
        </div>
      ) : (
        <ul
          className="list-none m-0 p-0 flex flex-col gap-[8px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onDragEnd={reset}
        >
          {(() => {
            let taskCounter = 0;
            const out: React.ReactNode[] = [];

            for (let i = 0; i < events.length; i++) {
              const ev = events[i];

              if (ev.kind === "meal") {
                const meal = ev as MealEvent;
                const isNow = meal.id === currentEventId;
                out.push(
                  <li
                    key={`meal-${meal.id}-${i}`}
                    className={clsx(
                      "grid grid-cols-[auto_1fr_auto] items-center gap-[14px] p-[12px_14px_12px_12px] rounded-[12px] border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]",
                      isNow && "shadow-[0_0_0_2px_var(--accent)]",
                    )}
                  >
                    <div className="w-[36px] h-[36px] rounded-[10px] bg-[var(--card-bg)] border border-[var(--line)] flex items-center justify-center text-[18px]">
                      {meal.emoji}
                    </div>
                    <div className="flex flex-col gap-[4px] min-w-0">
                      <div className="flex items-center gap-[8px]">
                        <span className="text-[15px] font-[500] text-[var(--ink)]">
                          {meal.label}
                        </span>
                        {isNow && <NowChip />}
                      </div>
                      <div className="flex flex-wrap items-center gap-[6px] text-[13px]">
                        <span className="mono text-[var(--accent)]">
                          {minToClock(meal.startAt)} → {minToClock(meal.endAt)}
                        </span>
                        <span className="text-[var(--line)]">·</span>
                        <span className="mono text-[var(--muted)]">
                          {fmtMinutes(meal.duration)}
                        </span>
                        {meal.displaced > 0 && (
                          <>
                            <span className="text-(--line)">·</span>
                            <span
                              className="mono text-[11px] text-(--warn)"
                              title={`Configurado para las ${meal.at}`}
                            >
                              ↓ {fmtMinutes(meal.displaced)} tarde
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full border border-[var(--accent)] bg-[transparent] px-[10px] py-[4px] text-[10px] font-[600] uppercase tracking-[0.08em] text-[var(--accent)]">
                      Comida
                    </span>
                  </li>,
                );
              } else if (ev.kind === "appointment") {
                const appt = ev as AppointmentEvent;
                const isNow = appt.id === currentEventId;
                out.push(
                  <li
                    key={`appt-${appt.id}-${i}`}
                    className={clsx(
                      "grid grid-cols-[auto_1fr_auto] items-center gap-3.5 p-[12px_14px_12px_12px] rounded-xl border border-dashed",
                      isNow && "shadow-[0_0_0_2px_var(--appt)]",
                    )}
                    style={{
                      borderColor: "var(--appt)",
                      background: "var(--appt-soft)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] bg-(--card-bg) border flex items-center justify-center text-[18px]"
                      style={{ borderColor: "var(--appt)" }}
                    >
                      📅
                    </div>
                    <div className="flex flex-col gap-[4px] min-w-0">
                      <div className="flex items-center gap-[8px]">
                        <span className="text-[15px] font-medium text-(--ink)">
                          {appt.name}
                        </span>
                        {isNow && <NowChip />}
                      </div>
                      <div className="flex flex-wrap items-center gap-[6px] text-[13px]">
                        <span
                          className="mono font-medium"
                          style={{ color: "var(--appt)" }}
                        >
                          {minToClock(appt.startAt)} → {minToClock(appt.endAt)}
                        </span>
                        <span className="text-(--line)">·</span>
                        <span className="mono text-(--muted)">
                          {fmtMinutes(appt.duration)}
                        </span>
                        {appt.displaced > 0 && (
                          <>
                            <span className="text-(--line)">·</span>
                            <span
                              className="mono text-[11px] text-(--warn)"
                              title={`Configurado para las ${appt.at}`}
                            >
                              ↓ {fmtMinutes(appt.displaced)} tarde
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className="rounded-full border bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                      style={{
                        borderColor: "var(--appt)",
                        color: "var(--appt)",
                      }}
                    >
                      Cita
                    </span>
                  </li>,
                );
              } else {
                const task = ev as TaskEvent;
                const taskIdx = taskCounter++;
                const overflow = task.endAt > sleepStart;
                const isDragging = dragIndex === taskIdx;
                const isNow = task.id === currentEventId;
                const isPast =
                  nowMin !== null &&
                  task.endAt <=
                    (nowMin >= task.startAt % 1440 ? nowMin : nowMin + 1440) &&
                  !isNow;
                const isLastTask = !events
                  .slice(i + 1)
                  .some((e) => e.kind === "task");
                const showInsertBefore =
                  overIndex === taskIdx &&
                  dragIndex !== null &&
                  dragIndex !== taskIdx &&
                  dragIndex !== taskIdx - 1;
                const showInsertAfter =
                  isLastTask &&
                  overIndex === plan.tasks.length &&
                  dragIndex !== null &&
                  dragIndex !== taskIdx;

                if (showInsertBefore) {
                  out.push(<DropLine key={`ib-${taskIdx}`} />);
                }

                out.push(
                  <li
                    key={task.id}
                    className={clsx(
                      "rounded-[12px] transition-[opacity_transform_box-shadow] duration-[200ms]",
                      // Layout: flex en móvil, grid en sm+
                      "flex flex-col gap-2 p-3",
                      "sm:grid sm:grid-cols-[auto_auto_auto_1fr_auto_auto] sm:items-center sm:gap-3 sm:p-[14px_14px_14px_8px]",
                      isNow
                        ? "bg-[var(--card-bg)] border border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-soft)]"
                        : "bg-[var(--bg)]",
                      task.overlap && !isNow ? "border border-[var(--accent)]"
                        : !isNow ? "border border-[var(--line)]" : "",
                      isDragging && "opacity-[0.35] scale-[0.99]",
                      isPast && !isDragging && "opacity-[0.55]",
                      task.done && "opacity-60",
                    )}
                    onDragOver={(e) => handleDragOverTask(e, taskIdx)}
                  >
                    {/* ── Fila superior (móvil: toda la tarjeta; sm: columnas 1-3 + nombre) ── */}
                    <div className="flex items-center gap-2 min-w-0 sm:contents">

                      {/* Grip */}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, taskIdx)}
                        onDragEnd={reset}
                        aria-label="Arrastrar para reordenar"
                        className="w-5 h-8 flex items-center justify-center text-[var(--muted)] rounded-[6px] cursor-grab select-none flex-shrink-0"
                      >
                        <GripIcon />
                      </div>

                      {/* Done checkbox */}
                      <button
                        onClick={() => toggleTaskDone(task.id)}
                        aria-label={task.done ? 'Marcar pendiente' : 'Marcar como hecho'}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] flex-shrink-0 transition-colors ${
                          task.done
                            ? 'bg-[var(--good)] border-[var(--good)] text-white'
                            : 'border-[var(--line)] bg-transparent text-transparent hover:border-[var(--muted)]'
                        }`}
                      >✓</button>

                      {/* Número — oculto en móvil */}
                      <div className="hidden sm:block mono text-[12px] font-[500] text-[var(--muted)]">
                        {isPast ? "✓" : String(taskIdx + 1).padStart(2, "0")}
                      </div>

                      {/* Nombre + chips */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={task.name}
                            onChange={(e) => updateTask(task.id, { name: e.target.value })}
                            className={`border-none bg-transparent p-0 text-[15px] sm:text-[16px] font-[500] min-w-0 max-w-full outline-none ${
                              task.done ? 'line-through text-[var(--muted)]' : 'text-[var(--ink)]'
                            }`}
                          />
                          {isNow && <NowChip />}
                        </div>
                        <div className="flex flex-wrap items-center gap-[5px] text-[12px] sm:text-[13px]">
                          <span className={clsx("mono", overflow ? "text-[var(--warn)]" : "text-[var(--ink-2)]")}>
                            {minToClock(task.startAt)} → {minToClock(task.endAt)}
                          </span>
                          <span className="text-[var(--line)]">·</span>
                          <button
                            onClick={() => setEditingId(editingId === task.id ? null : task.id)}
                            className={clsx(
                              "inline-flex items-center gap-[2px] rounded-full px-2 py-[2px] text-[11px] leading-[1.4]",
                              editingId === task.id
                                ? "border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "border border-[var(--line)] bg-transparent text-[var(--muted)]",
                            )}
                          >
                            <span className="mono">{fmtMinutes(task.duration)}</span>
                            <svg width="10" height="10" viewBox="0 0 10 10" className="ml-1 opacity-70">
                              <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                            </svg>
                          </button>
                          {task.subtasks.length > 0 && (
                            <>
                              <span className="text-[var(--line)]">·</span>
                              <span className="mono text-[11px] font-[500] rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-2 py-[2px]">
                                {task.subtasks.length} sub-tareas
                              </span>
                            </>
                          )}
                          {task.overlap && (
                            <>
                              <span className="text-(--line)">·</span>
                              <span className="rounded-full bg-(--accent-soft) text-(--warn) px-2 py-0.5 text-[11px] font-medium">
                                ⚠ roba {fmtMinutes(task.overlap.stealMin)} de {task.overlap.label}
                              </span>
                              <button
                                onClick={() => updateTask(task.id, { duration: task.duration - task.overlap!.stealMin })}
                                className="rounded-full border border-(--warn) text-(--warn) bg-transparent px-2 py-0.5 text-[11px] font-medium cursor-pointer hover:bg-(--accent-soft) transition-colors"
                              >
                                Ajustar
                              </button>
                            </>
                          )}
                          {overflow && (
                            <>
                              <span className="text-[var(--line)]">·</span>
                              <span className="rounded-full bg-[var(--accent-soft)] text-[var(--warn)] px-2 py-[2px] text-[11px] font-[500]">
                                se pasa del día
                              </span>
                            </>
                          )}
                        </div>
                        {editingId === task.id && (
                          <DurationEditor
                            ev={task}
                            onChange={(newDur) => updateTask(task.id, { duration: newDur })}
                            onClose={() => setEditingId(null)}
                          />
                        )}
                      </div>

                      {/* Abrir + borrar (en móvil van pegados al nombre a la derecha) */}
                      <div className="flex items-center gap-1 flex-shrink-0 sm:contents">
                        <button
                          onClick={() => router.push(`/task/${task.id}`)}
                          className="inline-flex items-center rounded-full border border-[var(--line)] bg-transparent px-2 sm:px-3 py-1.5 text-[12px] font-medium text-[var(--ink-2)] cursor-pointer"
                        >
                          <span className="hidden sm:inline mr-1.5">Abrir</span>
                          <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M3 6h6 M6.5 3.5L9 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveTaskToInbox(task.id)}
                          aria-label="Enviar a bandeja"
                          title="Enviar a bandeja de entrada"
                          className="w-7 h-7 rounded-[8px] bg-transparent text-[var(--muted)] border border-transparent text-[13px] flex items-center justify-center hover:text-[var(--ink-2)] transition-colors"
                        >📥</button>
                        <button
                          onClick={() => removeTask(task.id)}
                          aria-label="Eliminar"
                          className="w-7 h-7 rounded-[8px] bg-transparent text-[var(--muted)] border border-transparent text-[13px] flex items-center justify-center"
                        >✕</button>
                      </div>
                    </div>
                  </li>,
                );

                // Free time gap between this event and the next
                const nextEv = events[i + 1];
                if (nextEv) {
                  const gap = nextEv.startAt - ev.endAt;
                  if (gap >= 10) {
                    out.push(
                      <li key={`gap-${i}`} className="flex items-center gap-[10px] px-[4px] py-[4px]">
                        <div className="flex-1 border-t border-dashed border-[var(--line)]" />
                        <span className="text-[11px] mono text-[var(--muted)] whitespace-nowrap">{fmtMinutes(gap)} libres</span>
                        <div className="flex-1 border-t border-dashed border-[var(--line)]" />
                      </li>
                    );
                  }
                }

                if (showInsertAfter) {
                  out.push(<DropLine key={`ia-${taskIdx}`} />);
                }
              }
            }
            return out;
          })()}
        </ul>
      )}

    </section>
  );
}

function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  suffix = '',
  format,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  suffix?: string;
  format?: (v: number) => string;
  className?: string;
}) {
  return (
    <div className={clsx("inline-flex items-center justify-between bg-[var(--bg)] border border-[var(--line)] rounded-[10px] overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Restar"
        className="w-[36px] h-[40px] bg-transparent border-none text-[var(--ink-2)] text-[18px] leading-[1] inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[var(--line)]/10 transition-colors"
      >
        −
      </button>
      <div className="mono flex-1 min-w-[50px] xs:min-w-[70px] sm:min-w-[80px] text-center text-[15px] sm:text-[16px] text-[var(--ink)] border-x border-[var(--line)] px-[4px] xs:px-[8px] py-[10px]">
        {format ? format(value) : (
          <>{value}{suffix && <span className="text-[var(--muted)] ml-[4px] text-[12px] sm:text-[13px]">{suffix}</span>}</>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label="Sumar"
        className="w-[36px] h-[40px] bg-transparent border-none text-[var(--ink-2)] text-[18px] leading-[1] inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-[var(--line)]/10 transition-colors"
      >
        +
      </button>
    </div>
  );
}

function DurationEditor({
  ev,
  onChange,
  onClose,
}: {
  ev: TaskEvent;
  onChange: (dur: number) => void;
  onClose: () => void;
}) {
  const [hh, setHh] = useState(Math.floor(ev.duration / 60));
  const [mm, setMm] = useState(ev.duration % 60);

  useEffect(() => {
    setHh(Math.floor(ev.duration / 60));
    setMm(ev.duration % 60);
  }, [ev.duration]);

  const apply = (newH: number, newM: number) => {
    const total = Math.max(5, newH * 60 + newM);
    setHh(newH);
    setMm(newM);
    onChange(total);
  };

  const handleEndChange = (val: string) => {
    if (!val) return;
    const [h, m] = val.split(":").map(Number);
    let endMin = h * 60 + m;
    if (endMin <= ev.startAt % 1440) endMin += 1440;
    const newDur = Math.max(5, endMin - (ev.startAt % 1440));
    onChange(newDur);
  };

  const endTimeValue = (() => {
    const e = ev.endAt % 1440;
    return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="mt-[10px] p-[10px] xs:p-[14px] rounded-[12px] bg-[var(--card-bg)] border border-[var(--line)] flex flex-col gap-[12px] xs:gap-[14px]">
      <div className="flex flex-row items-center gap-[8px] sm:gap-[16px]">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[var(--muted)] tracking-[0.06em] uppercase mb-[4px]">
            Inicia
          </div>
          <div className="mono text-[14px] xs:text-[16px] text-[var(--muted)] p-[8px_10px] xs:p-[9px_12px] border border-dashed border-[var(--line)] rounded-[10px] bg-[var(--bg)] text-center">
            {minToClock(ev.startAt)}
          </div>
          <div className="text-[9px] xs:text-[10px] text-[var(--muted)] mt-[2px] text-center truncate">
            depende del orden
          </div>
        </div>
        <div className="text-[16px] xs:text-[18px] text-[var(--muted)] self-center pt-[18px]">→</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[var(--muted)] tracking-[0.06em] uppercase mb-[4px]">
            Termina
          </div>
          <input
            type="time"
            value={endTimeValue}
            onChange={(e) => handleEndChange(e.target.value)}
            className="mono w-full text-center appearance-none bg-[var(--bg)] border border-[var(--line)] rounded-[10px] px-[8px] xs:px-[12px] py-[8px] xs:py-[10px] text-[14px] xs:text-[16px] text-[var(--ink)] outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-[14px]">
        <div className="flex-1 w-full">
          <div className="text-[10px] text-[var(--muted)] tracking-[0.06em] uppercase mb-[6px]">
            Duración
          </div>
          <div className="flex gap-[8px] w-full">
            <Stepper
              value={hh}
              onChange={(v) => apply(v, mm)}
              step={1}
              min={0}
              max={12}
              suffix="h"
              className="flex-1 w-full"
            />
            <Stepper
              value={mm}
              onChange={(v) => apply(hh, v)}
              step={5}
              min={0}
              max={55}
              suffix="min"
              className="flex-1 w-full"
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full sm:w-auto rounded-[10px] bg-[var(--ink)] text-[var(--bg)] px-[18px] py-[10px] text-[13px] font-[500] h-[40px] flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function NowChip() {
  return (
    <span className="text-[10px] font-[700] tracking-[0.1em] uppercase whitespace-nowrap rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-[8px] py-[3px]">
      ● AHORA
    </span>
  );
}

function DropLine() {
  return (
    <div className="h-[2px] bg-[var(--accent)] rounded-[2px] my-[2px] mx-[8px] shadow-[0_0_0_4px_rgba(200,100,58,0.12)]" />
  );
}

function GripIcon() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2" cy="3" r="1.2" />
      <circle cx="8" cy="3" r="1.2" />
      <circle cx="2" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="2" cy="13" r="1.2" />
      <circle cx="8" cy="13" r="1.2" />
    </svg>
  );
}
