'use client';

import { useEffect } from 'react';

/** Regista o service worker (só em produção, para não interferir no desenvolvimento). */
export default function RegistarApp() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sem service worker a app continua a funcionar normalmente (só não abre sem rede)
    });
  }, []);
  return null;
}
