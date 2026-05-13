'use client';

import { usePWA } from '@/lib/pwa';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';

export function InstallPrompt() {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
      }
    }

    // Show prompt after 3 seconds if installable
    if (isInstallable && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Trigger animation
        setTimeout(() => setIsAnimating(true), 50);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isDismissed]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      setIsDismissed(true);
      localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    }, 300);
  };

  const handleInstall = async () => {
    await installPWA();
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 transition-all duration-300 ease-out transform ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-3 shrink-0">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-lg">
              Install Aplikasi
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Tambahkan Sewa Ruang ke layar utama untuk akses lebih cepat dan pengalaman yang lebih baik.
            </p>
            
            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={handleInstall}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Install Sekarang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
