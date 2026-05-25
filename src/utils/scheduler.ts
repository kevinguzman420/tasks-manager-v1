import { DayPlan, Schedule, ScheduleEvent, MealConfig, FixedConflict } from '@/types';

export function timeToMin(t: string): number {
  const [h, m] = (t || '0:0').split(':').map(n => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function dayMinutes(start: string, end: string): number {
  const s = timeToMin(start);
  let e = timeToMin(end);
  if (e <= s) e += 1440;
  return e - s;
}

export function minToClock(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function fmtMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}min`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}min`;
}

export function fmtMinutesShort(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

const MEAL_META = {
  breakfast: { label: 'Desayuno', emoji: '☕' },
  lunch:     { label: 'Almuerzo', emoji: '🥗' },
  dinner:    { label: 'Cena',     emoji: '🍲' },
} as const;

// Etiqueta legible de un item de la cola fija
type FixedItem =
  | { kind: 'meal'; id: 'breakfast' | 'lunch' | 'dinner'; label: string; emoji: string; at: string; duration: number; _at: number }
  | { kind: 'appointment'; id: string; name: string; at: string; duration: number; _at: number };

function fixedLabel(f: FixedItem): string {
  return f.kind === 'meal' ? f.label : f.name;
}

/**
 * Calcula si una tarea hipotética (startAt, duration) chocaría con el
 * primer evento fijo que venga después. Devuelve la info del conflicto o null.
 */
export function findConflict(
  plan: DayPlan,
  startAt: number,
  duration: number,
): { label: string; kind: 'meal' | 'appointment'; stealMin: number } | null {
  const startMin = timeToMin(plan.start);
  const endAt = startAt + duration;

  const allFixed = [
    ...(Object.entries(plan.meals) as [keyof typeof MEAL_META, MealConfig][])
      .filter(([, m]) => m.enabled !== false)
      .map(([id, m]) => {
        let at = timeToMin(m.at);
        if (at < startMin) at += 1440;
        return { kind: 'meal' as const, label: MEAL_META[id].label, at };
      }),
    ...(plan.appointments ?? []).map(a => {
      let at = timeToMin(a.at);
      if (at < startMin) at += 1440;
      return { kind: 'appointment' as const, label: a.name, at };
    }),
  ].sort((a, b) => a.at - b.at);

  const next = allFixed.find(f => f.at > startAt && f.at < endAt);
  if (!next) return null;
  return { label: next.label, kind: next.kind, stealMin: endAt - next.at };
}

/**
 * Interpreta duración en lenguaje natural.
 * "30" → 30, "45min" → 45, "1h" → 60, "1.5h" → 90,
 * "1h30" → 90, "1h 30min" → 90, "1,5h" → 90
 */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  // "1h30min" | "1h30" | "1h 30" | "2h 15min"
  let m = s.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d+)?\s*(?:min)?$/);
  if (m) {
    const total = Math.round(parseFloat(m[1]) * 60) + parseInt(m[2] || '0', 10);
    return total > 0 ? total : null;
  }
  // "30min" | "45m"
  m = s.match(/^(\d+)\s*m(?:in)?$/);
  if (m) { const n = parseInt(m[1], 10); return n > 0 ? n : null; }
  // pure number → minutes
  m = s.match(/^(\d+)$/);
  if (m) { const n = parseInt(m[1], 10); return n > 0 ? n : null; }
  return null;
}

/**
 * @param nowMin  Si se pasa (solo cuando se ve "hoy"), el scheduler NO coloca
 *                tareas en el pasado. Vacía los eventos fijos pasados a su hora
 *                real y avanza el cursor al momento actual antes de insertar tareas.
 */
export function computeSchedule(plan: DayPlan, nowMin?: number): Schedule {
  const { start, end, meals, tasks, appointments = [] } = plan;
  const startMin = timeToMin(start);
  const totalDay = dayMinutes(start, end);

  // ── Construir cola de eventos fijos ─────────────────────────────────────────

  const mealItems: FixedItem[] = (Object.entries(meals) as [keyof typeof MEAL_META, MealConfig][])
    .filter(([, m]) => m.enabled !== false)
    .map(([id, m]) => {
      let at = timeToMin(m.at);
      if (at < startMin) at += 1440;
      return { kind: 'meal' as const, id, ...MEAL_META[id], at: m.at, duration: Number(m.duration) || 0, _at: at };
    });

  const apptItems: FixedItem[] = appointments.map(a => {
    let at = timeToMin(a.at);
    if (at < startMin) at += 1440;
    return { kind: 'appointment' as const, id: a.id, name: a.name, at: a.at, duration: Number(a.duration) || 0, _at: at };
  });

  const fq: FixedItem[] = [...mealItems, ...apptItems].sort((a, b) => a._at - b._at);

  // ── Detectar conflictos entre eventos fijos (antes de calcular el schedule) ─
  // Se detectan por sus horas configuradas, independiente de si las tareas los desplazan.
  const fixedConflicts: FixedConflict[] = [];
  for (let i = 0; i < fq.length - 1; i++) {
    const a = fq[i];
    const b = fq[i + 1];
    const aConfigEnd = a._at + a.duration;
    if (aConfigEnd > b._at) {
      fixedConflicts.push({
        aLabel: fixedLabel(a),
        bLabel: fixedLabel(b),
        overlapMin: aConfigEnd - b._at,
      });
    }
  }

  // ── Calcular el schedule ─────────────────────────────────────────────────────

  const events: ScheduleEvent[] = [];
  let c = startMin;

  // Emite todos los eventos fijos cuya hora configurada ya pasó el cursor
  const flushFixed = (until: number) => {
    while (fq.length && fq[0]._at <= until) {
      const f = fq.shift()!;
      const at = Math.max(c, f._at);
      const displaced = at - f._at; // > 0 si las tareas lo corrieron

      if (f.kind === 'meal') {
        events.push({
          kind: 'meal',
          id: f.id, label: f.label, emoji: f.emoji,
          at: f.at, duration: f.duration,
          startAt: at, endAt: at + f.duration,
          displaced,
        });
      } else {
        events.push({
          kind: 'appointment',
          id: f.id, name: f.name,
          at: f.at, duration: f.duration,
          startAt: at, endAt: at + f.duration,
          displaced,
        });
      }
      c = at + f.duration;
    }
  };

  // ── "Now floor": evitar colocar tareas en el pasado ─────────────────────────
  // Si nowMin está definido (vista de hoy), primero vaciamos los eventos fijos
  // que ya ocurrieron (quedan en su hora real) y luego adelantamos el cursor
  // al momento actual, para que las tareas pendientes partan desde ahora.
  if (nowMin !== undefined) {
    flushFixed(nowMin);          // fijos pasados → aparecen a su hora configurada
    c = Math.max(c, nowMin);     // cursor nunca retrocede al pasado
  }

  for (const task of tasks) {
    flushFixed(c);

    // ¿La tarea se meterá dentro del próximo evento fijo?
    let overlap = null;
    if (fq.length > 0) {
      const next = fq[0];
      const stealMin = (c + (task.duration || 0)) - next._at;
      if (stealMin > 0) {
        overlap = { label: fixedLabel(next), kind: next.kind, stealMin };
      }
    }

    events.push({
      kind: 'task',
      ...task,
      startAt: c,
      endAt: c + (task.duration || 0),
      overlap,
    });
    c += task.duration || 0;
  }

  // Guardamos el cursor justo después de la última tarea.
  // Este es el punto real donde arrancaría una nueva tarea.
  const taskCursor = c;

  // Vaciamos los eventos fijos que quedaron después de las tareas
  // solo para renderizarlos en el timeline.
  flushFixed(Infinity);

  return {
    events,
    taskCursor,    // ← usar este en findConflict al crear una nueva tarea
    endCursor: c,  // ← después de vaciar todos los fijos restantes
    dayEnd: startMin + totalDay,
    fixedConflicts,
  };
}
