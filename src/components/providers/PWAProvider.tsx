'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
