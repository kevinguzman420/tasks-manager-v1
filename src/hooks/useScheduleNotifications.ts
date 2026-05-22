import { useEffect, useRef } from 'react';
import { Schedule, ScheduleEvent } from '@/types';
import { fmtMinutes } from '@/utils/scheduler';

/** Clave única por ocurrencia de evento (tipo + id + minuto de inicio) */
function eventKey(ev: ScheduleEvent): string {
  return `${ev.kind}-${ev.id}-${ev.startAt}`;
}

function buildNotification(ev: ScheduleEvent): { title: string; body: string } {
  const body = `Empieza ahora · ${fmtMinutes(ev.duration)}`;
  if (ev.kind === 'meal')        return { title: `${ev.emoji} ${ev.label}`, body };
  if (ev.kind === 'appointment') return { title: `📅 ${ev.name}`, body };
  return { title: `⏱ ${ev.name}`, body };
}

/**
 * Dispara notificaciones del sistema cuando un evento del schedule empieza.
 *
 * - Solo actúa cuando `isToday === true` y el permiso está concedido.
 * - Al inicializar, marca como "ya notificados" todos los eventos que ya
 *   empezaron (≤ nowMin) para no lanzar retroactivos.
 * - Se reinicia automáticamente cuando `selectedDate` cambia.
 */
export function useScheduleNotifications(
  schedule: Schedule,
  isToday: boolean,
  selectedDate: Date,
) {
  // Ref para no recrear el interval cuando el schedule cambia
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  const notifiedRef = useRef<Set<string>>(new Set());
  const seededRef   = useRef(false);

  // Al cambiar de día: resetear estado de notificaciones
  useEffect(() => {
    notifiedRef.current = new Set();
    seededRef.current   = false;
  }, [selectedDate]);

  // Interval principal — solo corre si estamos viendo hoy
  useEffect(() => {
    if (!isToday) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const check = () => {
      if (Notification.permission !== 'granted') return;

      const d      = new Date();
      const nowMin = d.getHours() * 60 + d.getMinutes();

      // Primera ejecución: marcar eventos ya iniciados para no retronotificar
      if (!seededRef.current) {
        scheduleRef.current.events.forEach(ev => {
          if (ev.startAt <= nowMin) notifiedRef.current.add(eventKey(ev));
        });
        seededRef.current = true;
        return; // El primer aviso llegará en el próximo evento futuro
      }

      // Detectar eventos que empiezan exactamente en este minuto
      scheduleRef.current.events.forEach(ev => {
        const key = eventKey(ev);
        if (ev.startAt === nowMin && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          const { title, body } = buildNotification(ev);
          try {
            new Notification(title, {
              body,
              icon: '/favicon.ico',
              tag: `diario-planeador-${key}`,
            });
          } catch {
            // El browser puede bloquear la notificación — ignorar silenciosamente
          }
        }
      });
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [isToday]); // schedule siempre fresco vía scheduleRef
}
