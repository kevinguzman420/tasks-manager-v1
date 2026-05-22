'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker una sola vez al cargar la app.
 * Componente sin UI — solo efectos.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        // Verificar actualizaciones cada vez que el usuario vuelve a la app
        reg.update();
      })
      .catch(err => {
        console.warn('[SW] Registro fallido:', err);
      });
  }, []);

  return null;
}
