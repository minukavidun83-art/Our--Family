import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AboutFamiliesView } from './components/AboutFamiliesView';
import { AdminPanelView } from './components/AdminPanelView';
import { FamilyChatView } from './components/FamilyChatView';
import { FamilyDetailView } from './components/FamilyDetailView';
import { GalleryMomentsView } from './components/GalleryMomentsView';
import { HomeView } from './components/HomeView';
import { MemberIdentityModal } from './components/MemberIdentityModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PrintPhotoSheet } from './components/PrintPhotoSheet';
import { PWAInstallPromptBanner } from './components/PWAInstallPromptBanner';
import { SpecialFeaturesView } from './components/SpecialFeaturesView';
import { TopBar } from './components/TopBar';
import { T } from './i18n';
import { PRINT_PHOTO_EVENT, type PrintablePhotoPayload } from './utils/mediaActions';
import {
  DEFAULT_SITE_SETTINGS,
  apiFetch,
  createDefaultFamilies,
  isStaticHostMode,
} from './utils/staticApiBridge';
import type {
  AppNotification,
  BirthdayEntry,
  ChatMessage,
  Family,
  FamilyMember,
  FeatureSubTab,
  Lang,
  LocalProfile,
  PageTab,
  SiteSettings,
} from './types';

function loadOrCreateLocalProfile(): LocalProfile {
  try {
    const raw = localStorage.getItem('of_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.clientId === 'string' && parsed.clientId) {
        return {
          clientId: parsed.clientId,
          name: typeof parsed.name === 'string' ? parsed.name : '',
          avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
        };
      }
    }
  } catch {
    // ignore invalid storage
  }
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const initial: LocalProfile = { clientId, name: '', avatarUrl: '' };
  try {
    localStorage.setItem('of_profile', JSON.stringify(initial));
  } catch {
    // ignore storage quota errors
  }
  return initial;
}

function playBellChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.12);
    gain2.gain.setValueAtTime(0.08, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // ignore autoplay restriction
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('of_lang');
    return saved === 'si' ? 'si' : 'en';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('of_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [localProfile, setLocalProfile] = useState<LocalProfile>(loadOrCreateLocalProfile);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<PageTab>('home');
  const [navDirection, setNavDirection] = useState<1 | -1>(1);
  const [featureSubTab, setFeatureSubTab] = useState<FeatureSubTab>('birthdays');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('family-1');

  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => ({
    ...DEFAULT_SITE_SETTINGS,
  }));
  const [families, setFamilies] = useState<Family[]>(() => createDefaultFamilies());
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayEntry[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bellPulse, setBellPulse] = useState(false);
  const [liveNotificationToast, setLiveNotificationToast] = useState<AppNotification | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [incomingChatMessage, setIncomingChatMessage] = useState<ChatMessage | null>(null);
  const [typingUser, setTypingUser] = useState<{ roomId: string; userName: string } | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [liveSyncNotice, setLiveSyncNotice] = useState(false);
  const [printPhotoTarget, setPrintPhotoTarget] = useState<PrintablePhotoPayload | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const syncToastTimeoutRef = useRef<number | null>(null);
  const bellPulseTimeoutRef = useRef<number | null>(null);
  const notifToastTimeoutRef = useRef<number | null>(null);
  const activeTabRef = useRef<PageTab>(activeTab);
  activeTabRef.current = activeTab;
  const pageTouchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    localStorage.setItem('of_lang', lang);
    document.documentElement.lang = lang === 'si' ? 'si' : 'en';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('of_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handlePrintPhoto = (e: Event) => {
      const detail = (e as CustomEvent<PrintablePhotoPayload>).detail;
      if (detail && (detail.url || (detail.extraUrls && detail.extraUrls.length > 0) || detail.description)) {
        setPrintPhotoTarget(detail);
      }
    };
    window.addEventListener(PRINT_PHOTO_EVENT, handlePrintPhoto);
    return () => window.removeEventListener(PRINT_PHOTO_EVENT, handlePrintPhoto);
  }, []);

  const handleSaveProfile = (next: LocalProfile) => {
    setLocalProfile(next);
    try {
      localStorage.setItem('of_profile', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await apiFetch('/api/bootstrap', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.siteSettings) setSiteSettings(data.siteSettings);
        setFamilies(data.families || []);
        setUpcomingBirthdays(data.upcomingBirthdays || []);
        setAllMembers(data.allMembers || []);
      }
    } catch {
      // offline mode fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExtras = useCallback(async () => {
    try {
      const [nRes, rRes] = await Promise.all([
        apiFetch('/api/notifications', {
          cache: 'no-store',
          headers: { 'x-client-id': localProfile.clientId },
        }),
        apiFetch('/api/chat/rooms', {
          cache: 'no-store',
          headers: { 'x-client-id': localProfile.clientId },
        }),
      ]);
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData.notifications || []);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        const totalUnread = (rData.rooms || []).reduce(
          (acc: number, r: any) => acc + (r.unreadCount || 0),
          0
        );
        setUnreadChatCount(totalUnread);
      }
    } catch {
      // ignore offline cache mode
    }
  }, [localProfile.clientId]);

  useEffect(() => {
    loadBootstrap();
    loadExtras();
  }, [loadBootstrap, loadExtras]);

  // Resync immediately when a phone wakes up or comes back online
  useEffect(() => {
    const handleResync = () => {
      if (document.visibilityState === 'visible') {
        loadBootstrap();
        loadExtras();
        setRefreshSignal((s) => s + 1);
      }
    };
    window.addEventListener('visibilitychange', handleResync);
    window.addEventListener('online', handleResync);
    return () => {
      window.removeEventListener('visibilitychange', handleResync);
      window.removeEventListener('online', handleResync);
    };
  }, [loadBootstrap, loadExtras]);

  // Real-time WebSocket synchronization across all connected phones & devices
  useEffect(() => {
    let closed = false;
    let reconnectTimer: number | null = null;
    let failedAttempts = 0;

    const connect = () => {
      if (closed || isStaticHostMode()) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        failedAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'chat:message' && payload.message) {
            setIncomingChatMessage(payload.message);
            if (
              payload.message.senderId !== localProfile.clientId &&
              activeTabRef.current !== 'chat'
            ) {
              setUnreadChatCount((c) => c + 1);
            }
          } else if (payload.type === 'chat:typing') {
            if (payload.clientId === localProfile.clientId) return;
            setTypingUser({ roomId: payload.roomId, userName: payload.userName });
            if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => setTypingUser(null), 2200);
          } else if (payload.type === 'notification:new' && payload.notification) {
            const notif: AppNotification = payload.notification;
            setNotifications((prev) => {
              if (prev.some((x) => x.id === notif.id)) return prev;
              return [notif, ...prev];
            });
            if (payload.sourceClientId !== localProfile.clientId) {
              setBellPulse(true);
              playBellChime();
              setLiveNotificationToast(notif);
              if (bellPulseTimeoutRef.current) window.clearTimeout(bellPulseTimeoutRef.current);
              bellPulseTimeoutRef.current = window.setTimeout(() => setBellPulse(false), 4500);
              if (notifToastTimeoutRef.current) window.clearTimeout(notifToastTimeoutRef.current);
              notifToastTimeoutRef.current = window.setTimeout(
                () => setLiveNotificationToast(null),
                4500
              );
            }
          } else if (payload.type === 'data:sync') {
            loadBootstrap();
            loadExtras();
            setRefreshSignal((s) => s + 1);
            if (payload.sourceClientId !== localProfile.clientId) {
              setLiveSyncNotice(true);
              if (syncToastTimeoutRef.current) window.clearTimeout(syncToastTimeoutRef.current);
              syncToastTimeoutRef.current = window.setTimeout(() => setLiveSyncNotice(false), 3000);
            }
          }
        } catch {
          // ignore invalid frames
        }
      };

      ws.onerror = () => {
        // handled cleanly on reconnect
      };

      ws.onclose = () => {
        failedAttempts += 1;
        if (!closed && !isStaticHostMode() && failedAttempts < 4) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [localProfile.clientId, loadBootstrap, loadExtras]);

  const handleSendTyping = (roomId: string, overrideUserName?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:typing',
          roomId,
          clientId: localProfile.clientId,
          userName:
            (overrideUserName && overrideUserName.trim()) ||
            localProfile.name ||
            (lang === 'si' ? 'පවුලේ සාමාජික' : 'Family Member'),
        })
      );
    }
  };

  const handleMarkAllRead = async () => {
    const res = await apiFetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const MAIN_TAB_ORDER: PageTab[] = ['home', 'families', 'features', 'chat', 'moments'];

  const openFamilyDetail = (familyId: string) => {
    setNavDirection(1);
    setSelectedFamilyId(familyId);
    setActiveTab('family-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (tab: PageTab) => {
    const curIdx = MAIN_TAB_ORDER.indexOf(activeTab === 'family-detail' ? 'families' : activeTab);
    const nextIdx = MAIN_TAB_ORDER.indexOf(tab === 'family-detail' ? 'families' : tab);
    if (curIdx !== -1 && nextIdx !== -1 && curIdx !== nextIdx) {
      setNavDirection(nextIdx > curIdx ? 1 : -1);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMainTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    let el = e.target as HTMLElement | null;
    let ignore = false;
    while (el && el !== e.currentTarget) {
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.dataset.swipeIgnore === 'true') {
        ignore = true;
        break;
      }
      if (el.scrollWidth > el.clientWidth + 6) {
        const overflowX = window.getComputedStyle(el).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') {
          ignore = true;
          break;
        }
      }
      el = el.parentElement;
    }
    pageTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ignore,
    };
  };

  const handleMainTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    const start = pageTouchStartRef.current;
    pageTouchStartRef.current = null;
    if (!start || start.ignore || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 68 || Math.abs(dx) < Math.abs(dy) * 1.4) return;

    if (activeTab === 'family-detail') {
      if (dx > 0) {
        setNavDirection(-1);
        navigate('families');
      }
      return;
    }
    const idx = MAIN_TAB_ORDER.indexOf(activeTab);
    if (idx === -1) return;
    if (dx < 0 && idx < MAIN_TAB_ORDER.length - 1) {
      navigate(MAIN_TAB_ORDER[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      navigate(MAIN_TAB_ORDER[idx - 1]);
    }
  };

  const t = T[lang];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f7] dark:bg-[#0f0f12]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-stone-600 dark:text-stone-300">
          <Loader2 className="w-5 h-5 animate-spin text-rose-700" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`min-h-screen flex flex-col bg-[#faf9f7] dark:bg-[#0f0f12] text-stone-900 dark:text-stone-100 ${
          printPhotoTarget ? 'print:hidden' : ''
        }`}
      >
        <TopBar
          lang={lang}
          onToggleLang={() => setLang((l) => (l === 'en' ? 'si' : 'en'))}
          theme={theme}
          onToggleTheme={() => setTheme((th) => (th === 'light' ? 'dark' : 'light'))}
          activeTab={activeTab}
          onNavigate={navigate}
          localProfile={localProfile}
          onOpenProfileModal={() => setProfileModalOpen(true)}
          unreadChatCount={unreadChatCount}
          notifications={notifications}
          bellPulse={bellPulse}
          onMarkAllNotificationsRead={handleMarkAllRead}
          onSelectSearchMember={openFamilyDetail}
        />

        <main
          onTouchStart={handleMainTouchStart}
          onTouchEnd={handleMainTouchEnd}
          className="flex-1 overflow-x-hidden"
        >
          <AnimatePresence mode="wait" custom={navDirection}>
            <motion.div
              key={activeTab === 'family-detail' ? `family-${selectedFamilyId}` : activeTab}
              custom={navDirection}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 24, y: 6 }),
                center: { opacity: 1, x: 0, y: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -24, y: -4 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'home' && (
                <HomeView
                  lang={lang}
                  siteSettings={siteSettings}
                  families={families}
                  allMembers={allMembers}
                  upcomingBirthdays={upcomingBirthdays}
                  localProfile={localProfile}
                  onViewFamily={openFamilyDetail}
                  onFamilyUpdated={(updated) =>
                    setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                  }
                  onSiteSettingsUpdated={setSiteSettings}
                  onGoToAbout={() => navigate('families')}
                  onOpenBirthdays={() => {
                    setFeatureSubTab('birthdays');
                    navigate('features');
                  }}
                  onWishSent={loadBootstrap}
                  onOpenAdmin={() => navigate('admin')}
                />
              )}

              {activeTab === 'families' && (
                <AboutFamiliesView
                  lang={lang}
                  families={families}
                  localProfile={localProfile}
                  onSelectFamily={openFamilyDetail}
                  onFamilyUpdated={(updated) =>
                    setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                  }
                />
              )}

              {activeTab === 'family-detail' && (
                <FamilyDetailView
                  lang={lang}
                  familyId={selectedFamilyId}
                  families={families}
                  allMembers={allMembers}
                  localProfile={localProfile}
                  onBack={() => navigate('families')}
                  onFamilyUpdated={(updated) =>
                    setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                  }
                  refreshSignal={refreshSignal}
                />
              )}

              {activeTab === 'features' && (
                <SpecialFeaturesView
                  lang={lang}
                  families={families}
                  allMembers={allMembers}
                  localProfile={localProfile}
                  refreshSignal={refreshSignal}
                  initialSubTab={featureSubTab}
                />
              )}

              {activeTab === 'chat' && (
                <FamilyChatView
                  lang={lang}
                  families={families}
                  allMembers={allMembers}
                  localProfile={localProfile}
                  onOpenProfileModal={() => setProfileModalOpen(true)}
                  incomingMessage={incomingChatMessage}
                  typingUser={typingUser}
                  onSendTyping={handleSendTyping}
                  onUnreadCountChange={setUnreadChatCount}
                  refreshSignal={refreshSignal}
                />
              )}

              {activeTab === 'moments' && (
                <GalleryMomentsView
                  lang={lang}
                  families={families}
                  localProfile={localProfile}
                  refreshSignal={refreshSignal}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPanelView
                  lang={lang}
                  siteSettings={siteSettings}
                  families={families}
                  allMembers={allMembers}
                  localProfile={localProfile}
                  refreshSignal={refreshSignal}
                  onSiteSettingsUpdated={setSiteSettings}
                  onFamilyUpdated={(updated) =>
                    setFamilies((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
                  }
                  onRefreshGlobal={() => {
                    loadBootstrap();
                    loadExtras();
                    setRefreshSignal((s) => s + 1);
                  }}
                  onOpenFamily={openFamilyDetail}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 mb-16 lg:mb-0 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <img
              src="./logo.png"
              alt="OUR FAMILIES"
              className="w-10 h-10 rounded-full object-contain shrink-0"
            />
            <div>
              <p className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                OUR FAMILIES ❤️
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t.footerNote}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-stone-600 dark:text-stone-400">
            <button type="button" onClick={() => navigate('home')} className="hover:text-rose-700">
              {t.navHome}
            </button>
            <button type="button" onClick={() => navigate('families')} className="hover:text-rose-700">
              {t.navFamilies}
            </button>
            <button type="button" onClick={() => navigate('features')} className="hover:text-rose-700">
              {t.navFeatures}
            </button>
            <button type="button" onClick={() => navigate('chat')} className="hover:text-rose-700">
              {t.navChat}
            </button>
            <button type="button" onClick={() => navigate('moments')} className="hover:text-rose-700">
              {t.navMoments}
            </button>
            <button type="button" onClick={() => navigate('admin')} className="hover:text-rose-700">
              {t.navAdmin}
            </button>
          </div>
        </div>
      </footer>

      {profileModalOpen && (
        <MemberIdentityModal
          lang={lang}
          profile={localProfile}
          onSave={handleSaveProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      )}

      <AnimatePresence>
        {liveNotificationToast && (
          <motion.button
            key={liveNotificationToast.id}
            type="button"
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            onClick={() => {
              setLiveNotificationToast(null);
              navigate((liveNotificationToast.linkTab as PageTab) || 'home');
            }}
            className="fixed bottom-20 md:bottom-5 right-4 z-50 max-w-xs text-left rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-stone-900 px-4 py-3 shadow-xl flex items-start gap-3 print:hidden"
          >
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                {lang === 'si' ? liveNotificationToast.titleSi : liveNotificationToast.titleEn}
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 mt-0.5">
                {lang === 'si' ? liveNotificationToast.bodySi : liveNotificationToast.bodyEn}
              </p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!liveNotificationToast && liveSyncNotice && (
          <motion.div
            key="live-sync-notice"
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-20 md:bottom-5 right-4 z-50 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2.5 text-xs font-medium shadow-lg print:hidden"
          >
            {t.liveUpdatedToast}
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallPromptBanner lang={lang} />
      <OfflineIndicator lang={lang} />
    </div>
    <PrintPhotoSheet photo={printPhotoTarget} onDone={() => setPrintPhotoTarget(null)} />
    </MotionConfig>
  );
}
