import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { T } from '../i18n';
import type { Lang } from '../types';
import { PWAInstallGuideModal } from './PWAInstallButton';

interface Props {
  lang: Lang;
}

export const PWAInstallPromptBanner: React.FC<Props> = ({ lang }) => {
  const {
    isInstallable,
    isInstalled,
    isInIframe,
    platform,
    guideOpen,
    closeGuide,
    bannerDismissed,
    dismissBanner,
    install,
    triggerInstall,
  } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const t = T[lang];

  useEffect(() => {
    if (isInstalled || bannerDismissed) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isInstalled, bannerDismissed]);

  if (isInstalled) {
    return null;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <>
      <AnimatePresence>
        {visible && !guideOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            role="dialog"
            aria-label={t.installPromptTitle}
            className="fixed bottom-20 lg:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-45 rounded-2xl border border-rose-200 dark:border-rose-800 bg-white/98 dark:bg-stone-900/98 backdrop-blur-md shadow-2xl p-4 print:hidden"
          >
            <div className="flex items-start gap-3">
              <img
                src="./pwa-192x192.png"
                alt="OUR FAMILIES"
                className="w-12 h-12 rounded-full object-contain shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100">
                    {t.installPromptTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setVisible(false);
                      dismissBanner();
                    }}
                    aria-label={t.close}
                    className="p-1 -mt-1 -mr-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                  {t.installPromptMsg}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {!isInstallable && isInIframe ? (
                    <motion.a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.openBrowserInstallBtn}</span>
                    </motion.a>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => triggerInstall()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.installNowBtn}</span>
                    </motion.button>
                  )}

                  {!isInstallable && isInIframe && (
                    <button
                      type="button"
                      onClick={() => triggerInstall()}
                      className="rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300"
                    >
                      {t.installNowBtn}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setVisible(false);
                      dismissBanner();
                    }}
                    className="rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    {t.laterBtn}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallGuideModal
        lang={lang}
        open={guideOpen}
        onClose={closeGuide}
        initialPlatform={platform}
        isInstallable={isInstallable}
        isInIframe={isInIframe}
        onInstallClick={install}
      />
    </>
  );
};
