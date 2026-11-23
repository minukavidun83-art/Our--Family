import React, { useState } from 'react';
import { Download, ExternalLink, Monitor, Smartphone, TabletSmartphone, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePWAInstall, type DevicePlatform } from '../hooks/usePWAInstall';
import { T } from '../i18n';
import type { Lang } from '../types';

interface ModalProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  initialPlatform: DevicePlatform;
  isInstallable: boolean;
  isInIframe: boolean;
  onInstallClick: () => Promise<boolean>;
}

export const PWAInstallGuideModal: React.FC<ModalProps> = ({
  lang,
  open,
  onClose,
  initialPlatform,
  isInstallable,
  isInIframe,
  onInstallClick,
}) => {
  const t = T[lang];
  const [selectedTab, setSelectedTab] = useState<DevicePlatform>(initialPlatform);

  const tabs: {
    id: DevicePlatform;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'android', label: 'Android', icon: Smartphone },
    { id: 'ios', label: 'iPhone / iPad', icon: TabletSmartphone },
    { id: 'desktop', label: 'Windows / Mac', icon: Monitor },
  ];

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="./pwa-192x192.png"
                  alt="OUR FAMILIES"
                  className="w-12 h-12 rounded-full object-contain shrink-0"
                />
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    {t.installGuideTitle}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">OUR FAMILIES ❤️</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const accepted = await onInstallClick();
                  if (accepted) onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white py-3 text-sm font-semibold transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{t.installNowBtn}</span>
              </button>
            )}

            {!isInstallable && isInIframe && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 space-y-2.5">
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {t.iframeInstallHint}
                </p>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white py-2.5 px-4 text-xs sm:text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>{t.openBrowserInstallBtn}</span>
                </a>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedTab(tab.id)}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'bg-white dark:bg-stone-900 text-rose-700 dark:text-rose-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-4 space-y-2.5 text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              {selectedTab === 'android' && (
                <>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    {t.androidGuideTitle}
                  </p>
                  <p className="text-xs sm:text-sm">1. {t.androidStep1}</p>
                  <p className="text-xs sm:text-sm">2. {t.androidStep2}</p>
                </>
              )}
              {selectedTab === 'ios' && (
                <>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    {t.iosGuideTitle}
                  </p>
                  <p className="text-xs sm:text-sm">1. {t.iosStep1}</p>
                  <p className="text-xs sm:text-sm">2. {t.iosStep2}</p>
                </>
              )}
              {selectedTab === 'desktop' && (
                <>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    {t.desktopGuideTitle}
                  </p>
                  <p className="text-xs sm:text-sm">1. {t.desktopStep1}</p>
                  <p className="text-xs sm:text-sm">2. {t.desktopStep2}</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors"
            >
              {t.close}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface Props {
  lang: Lang;
}

export const PWAInstallButton: React.FC<Props> = ({ lang }) => {
  const { isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const t = T[lang];

  if (isInstalled) {
    return null;
  }

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => triggerInstall()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
    >
      {isIOS ? <Smartphone className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
      <span>{isIOS ? t.installIOS : t.installApp}</span>
    </motion.button>
  );
};
