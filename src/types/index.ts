export interface SubTask {
  id: string;
  name: string;
  duration: number; // minutes
}

export interface Task {
  id: string;
  name: string;
  duration: number; // minutes
  subtasks: SubTask[];
  done?: boolean;
}

export interface MealConfig {
  at: string;       // "HH:mm"
  duration: number; // minutes
}

export interface Appointment {
  id: string;
  name: string;
  at: string;       // "HH:mm" — hora fija anclada
  duration: number; // minutes
}

export interface DayPlan {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  meals: {
    breakfast: MealConfig;
    lunch: MealConfig;
    dinner: MealConfig;
  };
  appointments: Appointment[];
  tasks: Task[];
}

export interface Plans {
  [dateKey: string]: DayPlan;
}

// ── Conflicto tarea → evento fijo ─────────────────────────────────────────────
// Cuántos minutos la tarea se mete dentro del próximo evento anclado, y con cuál.
export interface OverlapInfo {
  label: string;                    // "Almuerzo" | nombre de la cita
  kind: 'meal' | 'appointment';
  stealMin: number;
}

// ── Conflicto entre dos eventos fijos ─────────────────────────────────────────
export interface FixedConflict {
  aLabel: string;
  bLabel: string;
  overlapMin: number;
}

// ── Eventos del schedule ───────────────────────────────────────────────────────

export interface MealEvent {
  kind: 'meal';
  id: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  emoji: string;
  at: string;
  duration: number;
  startAt: number;
  endAt: number;
  /** Minutos que se corrió respecto a su hora configurada (0 = puntual) */
  displaced: number;
}

export interface AppointmentEvent {
  kind: 'appointment';
  id: string;
  name: string;
  at: string;
  duration: number;
  startAt: number;
  endAt: number;
  /** Minutos que se corrió respecto a su hora configurada (0 = puntual) */
  displaced: number;
}

export interface TaskEvent {
  kind: 'task';
  id: string;
  name: string;
  duration: number;
  subtasks: SubTask[];
  done?: boolean;
  startAt: number;
  endAt: number;
  /** null = sin conflicto; objeto = roba tiempo de ese evento fijo */
  overlap: OverlapInfo | null;
}

export type ScheduleEvent = MealEvent | AppointmentEvent | TaskEvent;

export interface Schedule {
  events: ScheduleEvent[];
  /**
   * Cursor justo después de la última tarea, ANTES de vaciar los eventos fijos
   * restantes. Es el punto exacto donde empezaría la próxima tarea nueva.
   */
  taskCursor: number;
  /** Cursor al final de todo (después de vaciar comidas/citas restantes). */
  endCursor: number;
  dayEnd: number;
  /** Pares de eventos fijos que se pisan entre sí según sus horas configuradas */
  fixedConflicts: FixedConflict[];
}
