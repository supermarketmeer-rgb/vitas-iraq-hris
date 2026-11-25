/**
 * VITAS IRAQ HRMS – PWA Hook
 * Handles install prompt, update detection, and SW registration
 */
import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  swVersion: string | null;
  browserSupport: 'full' | 'manual' | 'none';
  installOutcome: 'accepted' | 'dismissed' | null;
}

let deferredPrompt: any = null;
let swRegistration: ServiceWorkerRegistration | null = null;

export function usePWA() {
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isUpdating: false,
    hasUpdate: false,
    swVersion: null,
    browserSupport: 'none',
    installOutcome: null,
  });

  // Detect if already running as installed PWA
  const detectInstalledMode = useCallback(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    return isStandalone;
  }, []);

  // Detect browser support
  const detectBrowserSupport = useCallback((): 'full' | 'manual' | 'none' => {
    if (!('serviceWorker' in navigator)) return 'none';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') || ua.includes('edge') || ua.includes('edg/')) return 'full';
    if (ua.includes('firefox') || ua.includes('safari')) return 'manual';
    return 'manual';
  }, []);

  // Register Service Worker
  const registerSW = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = reg;

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setState(prev => ({ ...prev, hasUpdate: true }));
          }
        });
      });

      // Listen for SW controller change (after update applied)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setState(prev => ({ ...prev, isUpdating: false }));
      });
    } catch (err) {
      // SW registration failed silently – app still works
    }
  }, []);

  useEffect(() => {
    const support = detectBrowserSupport();
    const installed = detectInstalledMode();

    setState(prev => ({
      ...prev,
      browserSupport: support,
      isInstalled: installed,
    }));

    // Register SW
    registerSW();

    // Capture beforeinstallprompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Track when app gets installed
    const handleAppInstalled = () => {
      deferredPrompt = null;
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installOutcome: 'accepted',
      }));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Periodic update check (every 30 mins)
    const updateInterval = setInterval(() => {
      swRegistration?.update().catch(() => {});
    }, 30 * 60 * 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(updateInterval);
    };
  }, [detectBrowserSupport, detectInstalledMode, registerSW]);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      deferredPrompt = null;
      const accepted = result.outcome === 'accepted';
      setState(prev => ({
        ...prev,
        isInstallable: false,
        installOutcome: accepted ? 'accepted' : 'dismissed',
      }));
      return accepted;
    } catch {
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    setState(prev => ({ ...prev, isUpdating: true, hasUpdate: false }));
    try {
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Also check live registration in case swRegistration ref was stale
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      // Clear old runtime caches so the reloaded page fetches the newest bundle cleanly
      if ('caches' in window) {
        const keys = await caches.keys().catch(() => []);
        await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
      }
    } catch {}
    // Always reload to activate the new version
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, []);

  const checkForUpdates = useCallback(async () => {
    await swRegistration?.update().catch(() => {});
  }, []);

  return { state, install, applyUpdate, checkForUpdates };
}
