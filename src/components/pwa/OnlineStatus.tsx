'use client';

import { usePWA } from '@/lib/pwa';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

export function OnlineStatus() {
  const { isOnline } = usePWA();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OnlineStatusIndicator() {
  const { isOnline } = usePWA();

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Online</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs text-amber-600 font-medium">Offline</span>
        </>
      )}
    </div>
  );
}
