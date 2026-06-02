'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DayPlan, Plans, Task, SubTask, MealConfig, Appointment, Schedule } from '@/types';
import { computeSchedule } from '@/utils/scheduler';

const STORAGE_KEY = 'designYourDay:v1';
const INBOX_KEY   = 'designYourDay:inbox';

const DEFAULT_PLAN: DayPlan = {
  start: '05:00',
  end: '23:00',
  meals: {
    breakfast: { at: '07:30', duration: 20 },
    lunch:     { at: '13:00', duration: 45 },
    dinner:    { at: '19:30', duration: 30 },
  },
  appointments: [],
  tasks: [],
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function mergePlan(saved: Partial<DayPlan>): DayPlan {
  return {
    start:        saved.start        ?? DEFAULT_PLAN.start,
    end:          saved.end          ?? DEFAULT_PLAN.end,
    meals: {
      breakfast: { ...DEFAULT_PLAN.meals.breakfast, ...(saved.meals?.breakfast ?? {}) },
      lunch:     { ...DEFAULT_PLAN.meals.lunch,     ...(saved.meals?.lunch     ?? {}) },
      dinner:    { ...DEFAULT_PLAN.meals.dinner,    ...(saved.meals?.dinner    ?? {}) },
    },
    appointments: saved.appointments ?? [],
    tasks:        saved.tasks        ?? [],
  };
}

interface PlannerContextType {
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  plan: DayPlan;
  plans: Plans;
  schedule: Schedule;
  selectedDate: Date;
  today: Date;
  // Plan actions
  updatePlan: (patch: Partial<DayPlan>) => void;
  resetDay: () => void;
  clearAll: () => void;
  // Task actions
  addTask: (name: string, duration: number) => void;
  insertTaskAfter: (afterId: string, name: string, duration: number) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  reorderTasks: (from: number, to: number) => void;
  replaceTask: (id: string, task: Task) => void;
  // Meal actions
  updateMeal: (id: 'breakfast' | 'lunch' | 'dinner', patch: Partial<MealConfig>) => void;
  // Appointment actions
  addAppointment: (name: string, at: string, duration: number) => void;
  removeAppointment: (id: string) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  // Subtask actions
  addSubTask: (taskId: string, name: string, duration: number) => void;
  removeSubTask: (taskId: string, subId: string) => void;
  updateSubTask: (taskId: string, subId: string, patch: Partial<SubTask>) => void;
  reorderSubTasks: (taskId: string, newSubs: SubTask[]) => void;
  toggleTaskDone: (id: string) => void;
  copyFromDay: (sourceKey: string) => void;
  // Inbox
  inbox: Task[];
  addInboxTask: (name: string, duration: number) => void;
  removeInboxTask: (id: string) => void;
  updateInboxTask: (id: string, patch: Partial<Task>) => void;
  replaceInboxTask: (id: string, task: Task) => void;
  moveTaskToDay: (id: string) => void;
  moveTaskToInbox: (id: string) => void;
  addInboxSubTask: (taskId: string, name: string, duration: number) => void;
  removeInboxSubTask: (taskId: string, subId: string) => void;
  updateInboxSubTask: (taskId: string, subId: string, patch: Partial<SubTask>) => void;
  reorderInboxSubTasks: (taskId: string, newSubs: SubTask[]) => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const today = useMemo(() => new Date(), []);

  const [selectedKey, setSelectedKey] = useState<string>(() => dateKey(today));

  // Empezamos con {} tanto en servidor como en cliente para que el HTML coincida
  // en el primer render. La carga real de localStorage ocurre tras montar.
  const [plans, setPlans] = useState<Plans>({});

  // `initialized` es un estado (no un ref) para que el efecto de persistencia
  // capture su valor correcto a través del closure de cada render.
  // En React 18, setPlans + setInitialized en el mismo effect se batchean:
  // ambas actualizaciones producen un solo re-render con los dos valores nuevos.
  const [initialized, setInitialized] = useState(false);

  const [inbox, setInbox] = useState<Task[]>([]);

  // Leer localStorage solo tras montar (cliente), nunca en SSR
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlans(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem(INBOX_KEY);
      if (raw) setInbox(JSON.parse(raw));
    } catch {}
    setInitialized(true);
  }, []);

  // Persistir solo después de inicializar.
  // En el primer render, initialized = false en el closure → se omite.
  // Después del re-render de inicialización, initialized = true → persiste.
  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {}
  }, [plans, initialized]);

  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(INBOX_KEY, JSON.stringify(inbox));
    } catch {}
  }, [inbox, initialized]);

  const plan = useMemo<DayPlan>(
    () => mergePlan(plans[selectedKey] ?? {}),
    [plans, selectedKey]
  );

  const selectedDate = useMemo(() => parseKey(selectedKey), [selectedKey]);

  const schedule = useMemo<Schedule>(() => {
    // Cuando se ve "hoy", pasamos la hora actual para que las tareas
    // no se coloquen en el pasado (nowMin floor).
    const isToday =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth()    === today.getMonth()    &&
      selectedDate.getDate()     === today.getDate();
    if (!isToday) return computeSchedule(plan);
    const d = new Date();
    const nowMin = d.getHours() * 60 + d.getMinutes();
    return computeSchedule(plan, nowMin);
  }, [plan, selectedDate, today]);

  const updatePlan = useCallback((patch: Partial<DayPlan>) => {
    setPlans(prev => ({
      ...prev,
      [selectedKey]: mergePlan({ ...mergePlan(prev[selectedKey] ?? {}), ...patch }),
    }));
  }, [selectedKey]);

  const resetDay = useCallback(() => {
    setPlans(prev => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
  }, [selectedKey]);

  const clearAll = useCallback(() => setPlans({}), []);

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const addTask = useCallback((name: string, duration: number) => {
    const newTask: Task = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration,
      subtasks: [],
    };
    updatePlan({ tasks: [...plan.tasks, newTask] });
  }, [plan.tasks, updatePlan]);

  const insertTaskAfter = useCallback((afterId: string, name: string, duration: number) => {
    const idx = plan.tasks.findIndex(t => t.id === afterId);
    const newTask: Task = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration,
      subtasks: [],
    };
    const next = [...plan.tasks];
    next.splice(idx + 1, 0, newTask);
    updatePlan({ tasks: next });
  }, [plan.tasks, updatePlan]);

  const removeTask = useCallback((id: string) => {
    updatePlan({ tasks: plan.tasks.filter(t => t.id !== id) });
  }, [plan.tasks, updatePlan]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    updatePlan({ tasks: plan.tasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  }, [plan.tasks, updatePlan]);

  const replaceTask = useCallback((id: string, task: Task) => {
    updatePlan({ tasks: plan.tasks.map(t => t.id === id ? task : t) });
  }, [plan.tasks, updatePlan]);

  const reorderTasks = useCallback((from: number, to: number) => {
    const next = [...plan.tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updatePlan({ tasks: next });
  }, [plan.tasks, updatePlan]);

  // ── Meals ──────────────────────────────────────────────────────────────────

  const updateMeal = useCallback((id: 'breakfast' | 'lunch' | 'dinner', patch: Partial<MealConfig>) => {
    updatePlan({
      meals: {
        ...plan.meals,
        [id]: { ...plan.meals[id], ...patch },
      },
    });
  }, [plan.meals, updatePlan]);

  // ── Appointments ───────────────────────────────────────────────────────────

  const addAppointment = useCallback((name: string, at: string, duration: number) => {
    const newAppt: Appointment = {
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      at,
      duration,
    };
    updatePlan({ appointments: [...plan.appointments, newAppt] });
  }, [plan.appointments, updatePlan]);

  const removeAppointment = useCallback((id: string) => {
    updatePlan({ appointments: plan.appointments.filter(a => a.id !== id) });
  }, [plan.appointments, updatePlan]);

  const updateAppointment = useCallback((id: string, patch: Partial<Appointment>) => {
    updatePlan({ appointments: plan.appointments.map(a => a.id === id ? { ...a, ...patch } : a) });
  }, [plan.appointments, updatePlan]);

  // ── Subtasks ───────────────────────────────────────────────────────────────

  const addSubTask = useCallback((taskId: string, name: string, duration: number) => {
    const newSub: SubTask = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration,
    };
    updatePlan({
      tasks: plan.tasks.map(t =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub] } : t
      ),
    });
  }, [plan.tasks, updatePlan]);

  const removeSubTask = useCallback((taskId: string, subId: string) => {
    updatePlan({
      tasks: plan.tasks.map(t =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subId) } : t
      ),
    });
  }, [plan.tasks, updatePlan]);

  const updateSubTask = useCallback((taskId: string, subId: string, patch: Partial<SubTask>) => {
    updatePlan({
      tasks: plan.tasks.map(t =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, ...patch } : s) }
          : t
      ),
    });
  }, [plan.tasks, updatePlan]);

  const reorderSubTasks = useCallback((taskId: string, newSubs: SubTask[]) => {
    updatePlan({
      tasks: plan.tasks.map(t => t.id === taskId ? { ...t, subtasks: newSubs } : t),
    });
  }, [plan.tasks, updatePlan]);

  const toggleTaskDone = useCallback((id: string) => {
    updatePlan({ tasks: plan.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  }, [plan.tasks, updatePlan]);

  // ── Inbox ──────────────────────────────────────────────────────────────────

  const addInboxTask = useCallback((name: string, duration: number) => {
    const newTask: Task = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration,
      subtasks: [],
    };
    setInbox(prev => [...prev, newTask]);
  }, []);

  const removeInboxTask = useCallback((id: string) => {
    setInbox(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateInboxTask = useCallback((id: string, patch: Partial<Task>) => {
    setInbox(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const replaceInboxTask = useCallback((id: string, task: Task) => {
    setInbox(prev => prev.map(t => t.id === id ? task : t));
  }, []);

  const moveTaskToDay = useCallback((id: string) => {
    const task = inbox.find(t => t.id === id);
    if (!task) return;
    setInbox(prev => prev.filter(t => t.id !== id));
    updatePlan({ tasks: [...plan.tasks, { ...task, done: false }] });
  }, [inbox, plan.tasks, updatePlan]);

  const moveTaskToInbox = useCallback((id: string) => {
    const task = plan.tasks.find(t => t.id === id);
    if (!task) return;
    updatePlan({ tasks: plan.tasks.filter(t => t.id !== id) });
    setInbox(prev => [...prev, { ...task, done: false }]);
  }, [plan.tasks, updatePlan]);

  const addInboxSubTask = useCallback((taskId: string, name: string, duration: number) => {
    const newSub: SubTask = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration,
    };
    setInbox(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub] } : t
    ));
  }, []);

  const removeInboxSubTask = useCallback((taskId: string, subId: string) => {
    setInbox(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subId) } : t
    ));
  }, []);

  const updateInboxSubTask = useCallback((taskId: string, subId: string, patch: Partial<SubTask>) => {
    setInbox(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, ...patch } : s) }
        : t
    ));
  }, []);

  const reorderInboxSubTasks = useCallback((taskId: string, newSubs: SubTask[]) => {
    setInbox(prev => prev.map(t => t.id === taskId ? { ...t, subtasks: newSubs } : t));
  }, []);

  // ── Copy from day ──────────────────────────────────────────────────────────

  const copyFromDay = useCallback((sourceKey: string) => {
    const source = plans[sourceKey];
    if (!source?.tasks?.length) return;
    const copied = source.tasks.map(t => ({
      ...t,
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      done: false,
      subtasks: t.subtasks.map(s => ({
        ...s,
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    }));
    updatePlan({ tasks: [...plan.tasks, ...copied] });
  }, [plans, plan.tasks, updatePlan]);

  return (
    <PlannerContext.Provider value={{
      selectedKey, setSelectedKey,
      plan, plans, schedule,
      selectedDate, today,
      updatePlan, resetDay, clearAll,
      addTask, insertTaskAfter, removeTask, updateTask, reorderTasks, replaceTask,
      updateMeal,
      addAppointment, removeAppointment, updateAppointment,
      addSubTask, removeSubTask, updateSubTask, reorderSubTasks,
      toggleTaskDone, copyFromDay,
      inbox,
      addInboxTask, removeInboxTask, updateInboxTask, replaceInboxTask,
      moveTaskToDay, moveTaskToInbox,
      addInboxSubTask, removeInboxSubTask, updateInboxSubTask, reorderInboxSubTasks,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner(): PlannerContextType {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}

export { dateKey, parseKey };
