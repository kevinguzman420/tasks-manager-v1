'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DayPlan, Plans, Task, SubTask, MealConfig, Appointment, Schedule } from '@/types';
import { computeSchedule } from '@/utils/scheduler';

const STORAGE_KEY = 'designYourDay:v1';

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

  // Leer localStorage solo tras montar (cliente), nunca en SSR
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPlans(JSON.parse(raw));
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

  const plan = useMemo<DayPlan>(
    () => mergePlan(plans[selectedKey] ?? {}),
    [plans, selectedKey]
  );

  const schedule = useMemo<Schedule>(() => computeSchedule(plan), [plan]);

  const selectedDate = useMemo(() => parseKey(selectedKey), [selectedKey]);

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
      addTask, removeTask, updateTask, reorderTasks, replaceTask,
      updateMeal,
      addAppointment, removeAppointment, updateAppointment,
      addSubTask, removeSubTask, updateSubTask, reorderSubTasks,
      toggleTaskDone, copyFromDay,
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
