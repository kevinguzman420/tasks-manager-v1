"use client";

import clsx from "clsx";
import React, { useState, useMemo, useEffect } from "react";
import { usePlanner, dateKey } from "@/context/PlannerContext";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Devuelve el lunes de la semana que contiene `d` */
function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (date.getDay() + 6) % 7; // distancia al lunes
  date.setDate(date.getDate() - diff);
  return date;
}

export function Calendar() {
  const { selectedKey, setSelectedKey, plans, resetDay, clearAll, today, selectedDate } =
    usePlanner();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate));
  const [confirm, setConfirm] = useState<null | "day" | "all">(null);

  // Si el usuario navega a un día fuera de la semana visible, sincronizar
  useEffect(() => {
    const expected = startOfWeek(selectedDate);
    if (expected.getTime() !== weekStart.getTime()) {
      setWeekStart(expected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const planSet = useMemo(() => new Set(Object.keys(plans)), [plans]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => {
    setSelectedKey(dateKey(today));
    setWeekStart(startOfWeek(today));
  };

  // Encabezado: "mayo 2026" o "may – jun 2026" si la semana cruza mes
  const weekEnd = weekDays[6];
  const headerLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;

  return (
    <section className="bg-(--card-bg) border border-(--line) rounded-[18px] p-6 flex flex-col gap-4">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-(--muted) tracking-[0.08em] uppercase">
            Semana
          </div>
          <div className="serif text-[22px] font-normal tracking-[-0.01em] mt-0.5 capitalize">
            {headerLabel}
          </div>
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={prevWeek}
            aria-label="Semana anterior"
            className="w-8 h-8 rounded-lg border border-(--line) bg-(--bg) text-(--ink-2) text-[16px] leading-none inline-flex items-center justify-center"
          >
            ‹
          </button>
          <button
            onClick={goToday}
            className="h-8 px-3 rounded-lg border border-(--line) bg-(--bg) text-(--ink-2) text-[12px] font-medium"
          >
            Hoy
          </button>
          <button
            onClick={nextWeek}
            aria-label="Semana siguiente"
            className="w-8 h-8 rounded-lg border border-(--line) bg-(--bg) text-(--ink-2) text-[16px] leading-none inline-flex items-center justify-center"
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Tira de 7 días ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((d, i) => {
          const k = dateKey(d);
          const isSel = sameDay(d, selectedDate);
          const isT = sameDay(d, today);
          const hasPlan = planSet.has(k);
          return (
            <button
              key={i}
              onClick={() => setSelectedKey(k)}
              className={clsx(
                "relative flex flex-col items-center gap-[5px] rounded-[12px] py-[10px] px-1 border-[1.5px] transition-colors cursor-pointer",
                isSel
                  ? "bg-[#1b1712] text-white border-transparent"
                  : "bg-transparent text-(--ink-2) hover:bg-(--bg-2) border-transparent",
                !isSel && isT && "border-(--accent)!",
              )}
            >
              <span
                className={clsx(
                  "text-[10px] tracking-[0.06em] uppercase",
                  isSel ? "text-white/60" : "text-(--muted)",
                )}
              >
                {DOW[i]}
              </span>
              <span
                className={clsx(
                  "text-[17px] leading-none",
                  isT && !isSel ? "font-semibold" : "font-normal",
                )}
              >
                {d.getDate()}
              </span>
              {hasPlan && (
                <span
                  className={clsx(
                    "h-1 w-1 rounded-full",
                    isSel ? "bg-white/50" : "bg-(--accent)",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Info del día + acciones ─────────────────────────────────────── */}
      <div className="border-t border-(--line) pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="text-[11px] text-(--muted) tracking-[0.08em] uppercase">
            Día seleccionado
          </div>
          <div className="text-[15px] font-medium text-(--ink) capitalize mt-0.5">
            {selectedDate.toLocaleDateString("es-MX", { weekday: "long" })},{" "}
            {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}{" "}
            {selectedDate.getFullYear()}
          </div>
        </div>

        {confirm === "day" ? (
          <div className="bg-(--bg-2) border border-(--line) rounded-[10px] p-3 flex-shrink-0">
            <div className="text-[12px] text-(--ink-2) mb-2">
              ¿Borrar todo lo de este día?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { resetDay(); setConfirm(null); }}
                className="bg-(--accent) text-white rounded-lg px-3 py-1.5 text-[12px] font-medium"
              >
                Sí
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="bg-transparent text-(--ink-2) border border-(--line) rounded-lg px-3 py-1.5 text-[12px] font-medium"
              >
                No
              </button>
            </div>
          </div>
        ) : confirm === "all" ? (
          <div className="bg-(--bg-2) border border-(--line) rounded-[10px] p-3 flex-shrink-0">
            <div className="text-[12px] text-(--ink-2) mb-2">
              ¿Borrar TODOS los días guardados?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { clearAll(); setConfirm(null); }}
                className="bg-(--accent) text-white rounded-lg px-3 py-1.5 text-[12px] font-medium"
              >
                Sí
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="bg-transparent text-(--ink-2) border border-(--line) rounded-lg px-3 py-1.5 text-[12px] font-medium"
              >
                No
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setConfirm("day")}
              className="bg-[#1b1712] text-white rounded-[10px] px-3.5 py-2.5 text-[12px] font-medium inline-flex items-center gap-1.5"
            >
              <span>↺</span> Reiniciar día
            </button>
            <button
              onClick={() => setConfirm("all")}
              className="bg-transparent text-(--muted) border border-(--line) rounded-[10px] px-3 py-2 text-[12px] font-medium"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
