import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DevicePlatform = 'ios' | 'android' | 'desktop';

const DISMISS_SESSION_KEY = 'of_pwa_banner_dismissed_session';

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedIsInstalled = false;
let sharedGuideOpen = false;
const listeners = new Set<() => void>();

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('mac') && 'ontouchend' in document)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

function detectInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  sharedIsInstalled = detectInstalled();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedIsInstalled = true;
    sharedDeferredPrompt = null;
    sharedGuideOpen = false;
    notifyListeners();
  });

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', (ev) => {
      if (ev.matches) {
        sharedIsInstalled = true;
        sharedDeferredPrompt = null;
        sharedGuideOpen = false;
        notifyListeners();
      }
    });
  }
}

function isBannerDismissedInSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [platform] = useState<DevicePlatform>(detectPlatform);
  const [isInIframe] = useState<boolean>(detectInIframe);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(isBannerDismissedInSession);

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const openGuide = useCallback(() => {
    sharedGuideOpen = true;
    notifyListeners();
  }, []);

  const closeGuide = useCallback(() => {
    sharedGuideOpen = false;
    notifyListeners();
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!sharedDeferredPrompt) return false;
    try {
      await sharedDeferredPrompt.prompt();
      const { outcome } = await sharedDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sharedIsInstalled = true;
        sharedDeferredPrompt = null;
        sharedGuideOpen = false;
        notifyListeners();
        return true;
      }
    } catch {
      // ignore cancelled/failed prompt
    }
    return false;
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (sharedDeferredPrompt) {
      const ok = await install();
      if (ok) return true;
    }
    sharedGuideOpen = true;
    notifyListeners();
    return false;
  }, [install]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    } catch {
      // ignore sessionStorage errors
    }
  }, []);

  return {
    isInstallable: !!sharedDeferredPrompt,
    isInstalled: sharedIsInstalled,
    isIOS: platform === 'ios',
    isInIframe,
    platform,
    guideOpen: sharedGuideOpen,
    openGuide,
    closeGuide,
    bannerDismissed,
    dismissBanner,
    install,
    triggerInstall,
  };
}
