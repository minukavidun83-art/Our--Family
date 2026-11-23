import React, { useEffect, useMemo, useState } from 'react';
import {
  Cake,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Loader2,
  MapPin,
  PartyPopper,
  Plane,
  Plus,
  Printer,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { T } from '../i18n';
import { downloadMediaFile, triggerPhotoPrint } from '../utils/mediaActions';
import { apiFetch } from '../utils/staticApiBridge';
import type {
  BirthdayEntry,
  EventEntry,
  Family,
  FamilyMember,
  FeatureSubTab,
  Lang,
  LocalProfile,
  MediaAsset,
  TripEntry,
} from '../types';
import { MultiMediaUploader, SinglePhotoUploader } from './MediaUploader';
import { AvatarStack, WishSenderPickerRow, resolveSelectedSenders } from './MemberSenderPicker';

interface Props {
  lang: Lang;
  families: Family[];
  allMembers: FamilyMember[];
  localProfile: LocalProfile;
  refreshSignal: number;
  initialSubTab?: FeatureSubTab;
}

function getDaysUntilBirthday(birthDate: string): number {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 999;
  const [, mStr, dStr] = birthDate.split('-');
  const m = Number(mStr) - 1;
  const d = Number(dStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m, d);
  if (next < today) {
    next = new Date(now.getFullYear() + 1, m, d);
  }
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const SpecialFeaturesView: React.FC<Props> = ({
  lang,
  families,
  allMembers,
  localProfile,
  refreshSignal,
  initialSubTab = 'birthdays',
}) => {
  const t = T[lang];
  const [subTab, setSubTab] = useState<FeatureSubTab>(initialSubTab);
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [trips, setTrips] = useState<TripEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxMedia, setLightboxMedia] = useState<
    (MediaAsset & { title?: string; subtitle?: string }) | null
  >(null);

  // Birthday Calendar State
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [wishText, setWishText] = useState<Record<string, string>>({});
  const [wishSenderIds, setWishSenderIds] = useState<Record<string, string[]>>({});
  const [showAddBirthday, setShowAddBirthday] = useState(false);
  const [bName, setBName] = useState('');
  const [bDate, setBDate] = useState('');
  const [bFamily, setBFamily] = useState('');
  const [bPhoto, setBPhoto] = useState('');
  const [bNotes, setBNotes] = useState('');

  // Trips State
  const [tripFilter, setTripFilter] = useState<'all' | 'upcoming' | 'previous'>('all');
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tDest, setTDest] = useState('');
  const [tDate, setTDate] = useState('');
  const [tFamily, setTFamily] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tMedia, setTMedia] = useState<MediaAsset[]>([]);
  const [tripError, setTripError] = useState('');

  // Events State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eTitle, setETitle] = useState('');
  const [eCat, setECat] = useState<'wedding' | 'party' | 'celebration' | 'religious' | 'other'>('celebration');
  const [eDate, setEDate] = useState('');
  const [eLoc, setELoc] = useState('');
  const [eFamily, setEFamily] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eMedia, setEMedia] = useState<MediaAsset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const authorName =
    localProfile.name.trim() || (lang === 'si' ? 'පවුලේ සාමාජික' : 'Family Member');

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = { 'x-client-id': localProfile.clientId };
      const [bRes, tRes, eRes] = await Promise.all([
        apiFetch('/api/birthdays', { cache: 'no-store', headers }),
        apiFetch('/api/trips', { cache: 'no-store', headers }),
        apiFetch('/api/events', { cache: 'no-store', headers }),
      ]);
      if (bRes.ok) setBirthdays((await bRes.json()).birthdays || []);
      if (tRes.ok) setTrips((await tRes.json()).trips || []);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll(refreshSignal > 0);
  }, [refreshSignal]);

  const sortedBirthdays = useMemo(() => {
    return [...birthdays].sort(
      (a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate)
    );
  }, [birthdays]);

  // Auto 1-Month (30 Days) Upcoming Birthdays
  const upcomingReminders = useMemo(() => {
    return sortedBirthdays.filter((b) => getDaysUntilBirthday(b.birthDate) <= 30);
  }, [sortedBirthdays]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [calMonth, calYear]);

  const birthdaysOnDay = (day: number) => {
    const mm = String(calMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return birthdays.filter((b) => b.birthDate.endsWith(`-${mm}-${dd}`));
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const filteredTrips = useMemo(() => {
    return trips.filter((tr) => {
      if (tripFilter === 'upcoming') return tr.tripDate >= todayIso;
      if (tripFilter === 'previous') return tr.tripDate < todayIso;
      return true;
    });
  }, [trips, tripFilter, todayIso]);

  const handleToggleLike = async (
    targetType: 'trip' | 'event',
    targetId: string,
    itemTitle: string
  ) => {
    const res = await apiFetch('/api/likes/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': localProfile.clientId,
      },
      body: JSON.stringify({ targetType, targetId, authorName, itemTitle }),
    });
    if (res.ok) {
      const data = await res.json();
      if (targetType === 'trip') {
        setTrips((prev) =>
          prev.map((x) =>
            x.id === targetId ? { ...x, likeCount: data.likeCount, likedByMe: data.likedByMe } : x
          )
        );
      } else {
        setEvents((prev) =>
          prev.map((x) =>
            x.id === targetId ? { ...x, likeCount: data.likeCount, likedByMe: data.likedByMe } : x
          )
        );
      }
    }
  };

  const handleAddBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/birthdays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
          'x-author-name': encodeURIComponent(authorName),
        },
        body: JSON.stringify({
          memberName: bName,
          birthDate: bDate,
          familyId: bFamily || null,
          photoUrl: bPhoto,
          notes: bNotes,
        }),
      });
      if (res.ok) {
        setShowAddBirthday(false);
        setBName('');
        setBDate('');
        setBPhoto('');
        setBNotes('');
        await loadAll(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendWish = async (targetKey: string) => {
    const msg = (wishText[targetKey] || '').trim();
    if (!msg) return;
    const resolved = resolveSelectedSenders(
      wishSenderIds[targetKey] || [],
      allMembers,
      localProfile,
      lang
    );
    const res = await apiFetch(`/api/birthdays/${targetKey}/wishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': localProfile.clientId,
      },
      body: JSON.stringify({
        message: msg,
        authorName: resolved.name,
        authorAvatar: resolved.avatar,
        authorAvatars: resolved.avatars,
      }),
    });
    if (res.ok) {
      setWishText((prev) => ({ ...prev, [targetKey]: '' }));
      await loadAll(true);
    }
  };

  const handleDeleteBirthday = async (id: string) => {
    const res = await apiFetch(`/api/birthdays/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAll(true);
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^family-[1-8]$/.test(tFamily)) {
      setTripError(t.tripFamilyRequiredErr);
      return;
    }
    setTripError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: tTitle,
          destination: tDest,
          tripDate: tDate,
          familyId: tFamily,
          description: tDesc,
          media: tMedia,
          authorName,
        }),
      });
      if (res.ok) {
        setShowAddTrip(false);
        setTTitle('');
        setTDest('');
        setTDate('');
        setTFamily('');
        setTDesc('');
        setTMedia([]);
        setTripError('');
        await loadAll(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        setTripError(errData.error || t.tripFamilyRequiredErr);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    const res = await apiFetch(`/api/trips/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAll(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: eTitle,
          category: eCat,
          eventDate: eDate,
          location: eLoc,
          familyId: eFamily || null,
          description: eDesc,
          media: eMedia,
          authorName,
        }),
      });
      if (res.ok) {
        setShowAddEvent(false);
        setETitle('');
        setEDate('');
        setELoc('');
        setEDesc('');
        setEMedia([]);
        await loadAll(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApproveEvent = async (id: string) => {
    const res = await apiFetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': localProfile.clientId,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    if (res.ok) await loadAll(true);
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await apiFetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAll(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 lg:pb-16 space-y-10">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2.5">
          <motion.span
            animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            className="inline-block"
          >
            ⭐
          </motion.span>
          <span>{t.specialFeaturesTitle}</span>
        </h1>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mt-2 max-w-2xl">
          {t.specialFeaturesSub}
        </p>
      </div>

      {/* 3 Large Feature Selector Buttons */}
      <div className="md:hidden flex items-center justify-end text-[11px] font-medium text-stone-500 dark:text-stone-400 -mb-6">
        <span>{t.swipeHint} ↔</span>
      </div>
      <div
        data-swipe-ignore="true"
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible scrollbar-hide"
      >
        {[
          {
            id: 'birthdays' as FeatureSubTab,
            title: `🎂 ${t.birthdaysBtn}`,
            sub: t.birthdaysSub,
            img: './src/assets/images/feature_birthday_celebration_1794925789421.jpg',
          },
          {
            id: 'trips' as FeatureSubTab,
            title: `✈️ ${t.tripsBtn}`,
            sub: t.tripsSub,
            img: './src/assets/images/feature_family_trip_1794925793319.jpg',
          },
          {
            id: 'events' as FeatureSubTab,
            title: `🎉 ${t.eventsBtn}`,
            sub: t.eventsSub,
            img: './src/assets/images/feature_special_events_1794925790435.jpg',
          },
        ].map((card, idx) => {
          const active = subTab === card.id;
          return (
            <motion.button
              key={card.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setSubTab(card.id)}
              className={`w-[76vw] max-w-[290px] shrink-0 snap-center md:w-auto md:max-w-none group relative rounded-2xl overflow-hidden text-left border transition-[border-color,box-shadow] ${
                active
                  ? 'border-rose-600 ring-2 ring-rose-600/30 shadow-md'
                  : 'border-stone-200 dark:border-stone-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md'
              }`}
            >
              <div className="aspect-4/3 w-full relative">
                <img
                  src={card.img}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    active
                      ? 'from-rose-950/90 via-rose-950/45 to-black/15'
                      : 'from-black/85 via-black/40 to-black/10'
                  }`}
                />
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <span className="font-display text-xl sm:text-2xl font-bold text-white">
                    {card.title}
                  </span>
                  <span className="text-xs sm:text-sm text-stone-200 mt-1">
                    {card.sub}
                  </span>
                </div>
                {active && (
                  <motion.div
                    layoutId="feature-active-bar"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute bottom-0 inset-x-0 h-1.5 bg-rose-400"
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t.loading}</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* BIRTHDAYS PANEL */}
          {subTab === 'birthdays' && (
            <motion.div
              key="panel-birthdays"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="inline-block"
                  >
                    🎂
                  </motion.span>
                  <span>{t.upcomingBirthdays}</span>
                </h2>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddBirthday(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addBirthday}</span>
                </motion.button>
              </div>

              {/* 1-Month (30-Day) Automatic Birthday Reminders Banner */}
              {upcomingReminders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-5 space-y-2"
                >
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {t.upcoming1MonthTitle}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {upcomingReminders.map((b) => {
                      const days = getDaysUntilBirthday(b.birthDate);
                      return (
                        <div key={b.targetKey} className="text-sm text-stone-900 dark:text-stone-100">
                          <span className="font-semibold">{b.memberName}</span>
                          <span className="text-stone-500 dark:text-stone-400"> · </span>
                          <span className="tabular-nums text-amber-700 dark:text-amber-300 font-medium">
                            {days === 0 ? t.todayLabel : `${days} ${t.daysAway}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Upcoming Birthdays + Wishes */}
                <div className="lg:col-span-7 space-y-5">
                  {sortedBirthdays.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center">
                      <Cake className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-sm text-stone-600 dark:text-stone-400">{t.noBirthdaysYet}</p>
                    </div>
                  ) : (
                    sortedBirthdays.map((b, idx) => {
                      const days = getDaysUntilBirthday(b.birthDate);
                      const isWithinMonth = days <= 30;
                      return (
                        <motion.article
                          key={b.targetKey}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: Math.min(idx, 5) * 0.04 }}
                          whileHover={{ y: -3 }}
                          className={`rounded-2xl border bg-white dark:bg-stone-900 p-5 space-y-4 transition-[border-color,box-shadow] hover:shadow-md ${
                            isWithinMonth
                              ? 'border-amber-300 dark:border-amber-800/80'
                              : 'border-stone-200 dark:border-stone-800 hover:border-rose-300 dark:hover:border-rose-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 flex items-center justify-center border border-stone-200 dark:border-stone-700">
                                {b.photoUrl ? (
                                  <img
                                    src={b.photoUrl}
                                    alt={b.memberName}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Cake className="w-6 h-6 text-rose-600" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                                  {b.memberName}
                                </h3>
                                <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums mt-0.5">
                                  {b.birthDate}
                                  {b.familyNameEn && (
                                    <> · {lang === 'si' ? b.familyNameSi : b.familyNameEn}</>
                                  )}
                                  {b.notes && <> · {b.notes}</>}
                                </p>
                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">
                                  {days === 0 ? t.todayLabel : `${days} ${t.daysAway}`}
                                </p>
                              </div>
                            </div>
                            {b.source === 'birthday' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBirthday(b.id)}
                                aria-label={t.delete}
                                className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Birthday Wishes Thread */}
                          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
                            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                              {t.birthdayWishes} ({b.wishes.length})
                            </p>
                            {b.wishes.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {b.wishes.map((w) => (
                                  <motion.div
                                    key={w.id}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-xl bg-stone-50 dark:bg-stone-800/60 px-3 py-2 text-xs flex items-start gap-2.5"
                                  >
                                    <AvatarStack
                                      avatars={w.authorAvatars}
                                      fallbackAvatar={w.authorAvatar}
                                      alt={w.authorName}
                                      size="sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-baseline justify-between gap-2">
                                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                                          {w.authorName}
                                        </span>
                                        <span className="text-[10px] text-stone-400 tabular-nums">
                                          {new Date(w.createdAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                      <p className="text-stone-700 dark:text-stone-300 mt-0.5">
                                        {w.message}
                                      </p>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                            <WishSenderPickerRow
                              lang={lang}
                              families={families}
                              allMembers={allMembers}
                              localProfile={localProfile}
                              selectedIds={wishSenderIds[b.targetKey] || []}
                              preferredFamilyId={b.familyId}
                              onChange={(ids) =>
                                setWishSenderIds((prev) => ({ ...prev, [b.targetKey]: ids }))
                              }
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={wishText[b.targetKey] || ''}
                                onChange={(e) =>
                                  setWishText((prev) => ({ ...prev, [b.targetKey]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSendWish(b.targetKey);
                                  }
                                }}
                                placeholder={t.writeWish}
                                className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-xs"
                              />
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleSendWish(b.targetKey)}
                                className="inline-flex items-center gap-1 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-rose-700 dark:hover:bg-rose-600 dark:hover:text-white px-3.5 py-2 text-xs font-medium transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{t.sendWish}</span>
                              </motion.button>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })
                  )}
                </div>

                {/* Birthday Calendar */}
                <div className="lg:col-span-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      <span>{t.birthdayCalendar}</span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (calMonth === 0) {
                            setCalMonth(11);
                            setCalYear((y) => y - 1);
                          } else {
                            setCalMonth((m) => m - 1);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold tabular-nums min-w-[100px] text-center">
                        {new Date(calYear, calMonth).toLocaleString(lang === 'si' ? 'si-LK' : 'en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (calMonth === 11) {
                            setCalMonth(0);
                            setCalYear((y) => y + 1);
                          } else {
                            setCalMonth((m) => m + 1);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-500">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <div key={i} className="py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={idx} />;
                      const list = birthdaysOnDay(day);
                      const hasBirthday = list.length > 0;
                      return (
                        <motion.div
                          key={idx}
                          title={list.map((x) => x.memberName).join(', ')}
                          whileHover={{ scale: 1.12, zIndex: 10 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs tabular-nums border transition-colors ${
                            hasBirthday
                              ? 'bg-rose-700 text-white border-rose-700 font-semibold shadow-xs'
                              : 'border-stone-100 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <span>{day}</span>
                          {hasBirthday && (
                            <motion.span
                              animate={{ scale: [1, 1.25, 1] }}
                              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
                              className="text-[9px] leading-none"
                            >
                              🎂
                            </motion.span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FAMILY TRIPS PANEL */}
          {subTab === 'trips' && (
            <motion.div
              key="panel-trips"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
                  {(
                    [
                      ['all', t.allTrips],
                      ['upcoming', t.upcomingTrips],
                      ['previous', t.previousTrips],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTripFilter(id)}
                      className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        tripFilter === id
                          ? 'text-stone-900 dark:text-white'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      {tripFilter === id && (
                        <motion.span
                          layoutId="trip-filter-pill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-white dark:bg-stone-900 shadow-xs"
                        />
                      )}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTripError('');
                    setTFamily('');
                    setShowAddTrip(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addTrip}</span>
                </motion.button>
              </div>

              {filteredTrips.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center">
                  <Plane className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm text-stone-600 dark:text-stone-400">{t.noTripsYet}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTrips.map((tr, idx) => (
                    <motion.article
                      key={tr.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(idx, 5) * 0.045 }}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-4 transition-[border-color,box-shadow] hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-rose-700 dark:text-rose-400 font-medium tabular-nums flex items-center gap-1.5">
                            <span>{tr.tripDate}</span>
                            <span>·</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{tr.destination}</span>
                          </p>
                          <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100 mt-1">
                            {tr.title}
                          </h3>
                          {tr.familyNameEn && (
                            <p className="text-xs text-stone-500 mt-0.5">
                              {lang === 'si' ? tr.familyNameSi : tr.familyNameEn}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const imgs = tr.media
                                .filter((m) => m.type === 'image')
                                .map((m) => m.url);
                              triggerPhotoPrint({
                                url: imgs[0] || '',
                                extraUrls: imgs.slice(1),
                                title: tr.title,
                                meta: [tr.tripDate, tr.destination].filter(Boolean).join(' · '),
                                description: tr.description,
                                subtitle: lang === 'si' ? tr.familyNameSi : tr.familyNameEn,
                              });
                            }}
                            title={t.printEventBtn}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 hover:text-rose-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t.printEventBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrip(tr.id)}
                            aria-label={t.delete}
                            className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {tr.description && (
                        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                          {tr.description}
                        </p>
                      )}

                      {tr.media.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {tr.media.map((m, i) => (
                            <div
                              key={i}
                              className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                            >
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() =>
                                  setLightboxMedia({
                                    ...m,
                                    title: tr.title,
                                    subtitle: [tr.tripDate, tr.destination].filter(Boolean).join(' · '),
                                  })
                                }
                                className="w-full h-full block"
                              >
                                {m.type === 'video' ? (
                                  <video src={m.url} className="w-full h-full object-cover" />
                                ) : (
                                  <img
                                    src={m.url}
                                    alt={tr.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </motion.button>
                              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                                {m.type !== 'video' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      triggerPhotoPrint({
                                        url: m.url,
                                        title: tr.title,
                                        meta: [tr.tripDate, tr.destination].filter(Boolean).join(' · '),
                                        subtitle: lang === 'si' ? tr.familyNameSi : tr.familyNameEn,
                                      })
                                    }
                                    title={t.printPhotoBtn}
                                    aria-label={t.printPhotoBtn}
                                    className="p-1.5 rounded-lg bg-black/65 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => downloadMediaFile(m.url, `${tr.title}-${i + 1}`)}
                                  title={t.downloadPhotoBtn}
                                  aria-label={t.downloadPhotoBtn}
                                  className="p-1.5 rounded-lg bg-black/65 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-xs text-stone-400">{tr.createdByName}</span>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleLike('trip', tr.id, tr.title)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors border ${
                            tr.likedByMe
                              ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-rose-300'
                          }`}
                        >
                          <motion.span
                            animate={{ scale: tr.likedByMe ? [1, 1.35, 1] : 1 }}
                            transition={{ duration: 0.32 }}
                            className="inline-flex"
                          >
                            <Heart className={`w-3.5 h-3.5 ${tr.likedByMe ? 'fill-rose-600 text-rose-600' : ''}`} />
                          </motion.span>
                          <span>{tr.likedByMe ? t.likedBtn : t.likeBtn}</span>
                          {(tr.likeCount || 0) > 0 && (
                            <span className="tabular-nums">· {tr.likeCount}</span>
                          )}
                        </motion.button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* OTHER EVENTS PANEL */}
          {subTab === 'events' && (
            <motion.div
              key="panel-events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                  🎉 {t.eventsBtn}
                </h2>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddEvent(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addEvent}</span>
                </motion.button>
              </div>

              {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center">
                  <PartyPopper className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm text-stone-600 dark:text-stone-400">{t.noEventsYet}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {events.map((ev, idx) => {
                    const isSuggested = ev.status === 'suggested';
                    return (
                      <motion.article
                        key={ev.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: Math.min(idx, 5) * 0.045 }}
                        whileHover={{ y: -3 }}
                        className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-4 transition-[border-color,box-shadow] hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 tabular-nums">
                              {ev.eventDate} · {ev.category}
                              {ev.location && (
                                <>
                                  {' · '}
                                  <MapPin className="w-3 h-3 inline mr-0.5" />
                                  {ev.location}
                                </>
                              )}
                              {isSuggested && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {' · '}
                                  {t.suggestedBadge}
                                </span>
                              )}
                            </p>
                            <h3 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
                              {ev.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSuggested && (
                              <button
                                type="button"
                                onClick={() => handleApproveEvent(ev.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-medium"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.approveEvent}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const imgs = ev.media
                                  .filter((m) => m.type === 'image')
                                  .map((m) => m.url);
                                triggerPhotoPrint({
                                  url: imgs[0] || '',
                                  extraUrls: imgs.slice(1),
                                  title: ev.title,
                                  meta: [ev.eventDate, ev.category, ev.location].filter(Boolean).join(' · '),
                                  description: ev.description,
                                  subtitle: lang === 'si' ? ev.familyNameSi : ev.familyNameEn,
                                });
                              }}
                              title={t.printEventBtn}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 hover:text-rose-700"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{t.printEventBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              aria-label={t.delete}
                              className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {ev.description && (
                          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        {ev.media.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                            {ev.media.map((m, i) => (
                              <div
                                key={i}
                                className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
                              >
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() =>
                                    setLightboxMedia({
                                      ...m,
                                      title: ev.title,
                                      subtitle: [ev.eventDate, ev.location].filter(Boolean).join(' · '),
                                    })
                                  }
                                  className="w-full h-full block"
                                >
                                  {m.type === 'video' ? (
                                    <video src={m.url} className="w-full h-full object-cover" />
                                  ) : (
                                    <img
                                      src={m.url}
                                      alt={ev.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </motion.button>
                                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                                  {m.type !== 'video' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        triggerPhotoPrint({
                                          url: m.url,
                                          title: ev.title,
                                          meta: [ev.eventDate, ev.location].filter(Boolean).join(' · '),
                                          subtitle: ev.category,
                                        })
                                      }
                                      title={t.printPhotoBtn}
                                      aria-label={t.printPhotoBtn}
                                      className="p-1.5 rounded-lg bg-black/65 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => downloadMediaFile(m.url, `${ev.title}-${i + 1}`)}
                                    title={t.downloadPhotoBtn}
                                    aria-label={t.downloadPhotoBtn}
                                    className="p-1.5 rounded-lg bg-black/65 hover:bg-rose-700 text-white backdrop-blur-xs transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
                          <span className="text-xs text-stone-400">{ev.createdByName}</span>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleLike('event', ev.id, ev.title)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors border ${
                              ev.likedByMe
                                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-rose-300'
                            }`}
                          >
                            <motion.span
                              animate={{ scale: ev.likedByMe ? [1, 1.35, 1] : 1 }}
                              transition={{ duration: 0.32 }}
                              className="inline-flex"
                            >
                              <Heart className={`w-3.5 h-3.5 ${ev.likedByMe ? 'fill-rose-600 text-rose-600' : ''}`} />
                            </motion.span>
                            <span>{ev.likedByMe ? t.likedBtn : t.likeBtn}</span>
                            {(ev.likeCount || 0) > 0 && (
                              <span className="tabular-nums">· {ev.likeCount}</span>
                            )}
                          </motion.button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Add Birthday Modal */}
      <AnimatePresence>
        {showAddBirthday && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t.addBirthday}</h3>
                <button type="button" onClick={() => setShowAddBirthday(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddBirthday} className="space-y-3">
                <SinglePhotoUploader lang={lang} value={bPhoto} onChange={setBPhoto} />
                <input
                  type="text"
                  required
                  placeholder={t.memberName}
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  required
                  value={bDate}
                  onChange={(e) => setBDate(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <select
                  value={bFamily}
                  onChange={(e) => setBFamily(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                >
                  <option value="">{t.allFamiliesRoom}</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {lang === 'si' ? f.nameSi : f.nameEn}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t.personalDesc}
                  value={bNotes}
                  onChange={(e) => setBNotes(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBirthday(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Trip Modal */}
      <AnimatePresence>
        {showAddTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t.addTrip}</h3>
                <button type="button" onClick={() => setShowAddTrip(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddTrip} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={t.tripName}
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder={t.destination}
                    value={tDest}
                    onChange={(e) => setTDest(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    required
                    value={tDate}
                    onChange={(e) => setTDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                  />
                </div>
                <select
                  required
                  value={tFamily}
                  onChange={(e) => {
                    setTFamily(e.target.value);
                    setTripError('');
                  }}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    {t.selectFamilyRequired}
                  </option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {lang === 'si' ? f.nameSi : f.nameEn}
                    </option>
                  ))}
                </select>
                {tripError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {tripError}
                  </p>
                )}
                <textarea
                  rows={3}
                  placeholder={t.tripDesc}
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <MultiMediaUploader lang={lang} items={tMedia} onChange={setTMedia} />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTrip(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t.addEvent}</h3>
                <button type="button" onClick={() => setShowAddEvent(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddEvent} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={t.eventTitle}
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={eCat}
                    onChange={(e) => setECat(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                  >
                    <option value="wedding">{t.catWedding}</option>
                    <option value="party">{t.catParty}</option>
                    <option value="celebration">{t.catCelebration}</option>
                    <option value="religious">{t.catReligious}</option>
                    <option value="other">{t.catOther}</option>
                  </select>
                  <input
                    type="date"
                    required
                    value={eDate}
                    onChange={(e) => setEDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder={t.eventLocation}
                  value={eLoc}
                  onChange={(e) => setELoc(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <select
                  value={eFamily}
                  onChange={(e) => setEFamily(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                >
                  <option value="">{t.allFamiliesRoom}</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {lang === 'si' ? f.nameSi : f.nameEn}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  placeholder={t.eventDesc}
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                />
                <MultiMediaUploader lang={lang} items={eMedia} onChange={setEMedia} />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Viewer */}
      <AnimatePresence>
        {lightboxMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setLightboxMedia(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 right-4 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() =>
                  downloadMediaFile(lightboxMedia.url, lightboxMedia.title || lightboxMedia.name)
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white px-3.5 py-2 text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadPhotoBtn}</span>
              </button>
              {lightboxMedia.type !== 'video' && (
                <button
                  type="button"
                  onClick={() =>
                    triggerPhotoPrint({
                      url: lightboxMedia.url,
                      title: lightboxMedia.title || lightboxMedia.name,
                      meta: lightboxMedia.subtitle,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 hover:bg-rose-600 text-white px-3.5 py-2 text-xs font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.printPhotoBtn}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                aria-label={t.close}
                className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center gap-3"
            >
              {lightboxMedia.type === 'video' ? (
                <video src={lightboxMedia.url} controls autoPlay className="max-h-[80vh] rounded-xl" />
              ) : (
                <img
                  src={lightboxMedia.url}
                  alt={lightboxMedia.title || lightboxMedia.name || 'Media'}
                  referrerPolicy="no-referrer"
                  className="max-h-[78vh] max-w-full rounded-xl object-contain"
                />
              )}
              {(lightboxMedia.title || lightboxMedia.subtitle) && (
                <div className="text-center">
                  {lightboxMedia.title && (
                    <p className="text-sm font-semibold text-white">{lightboxMedia.title}</p>
                  )}
                  {lightboxMedia.subtitle && (
                    <p className="text-xs text-stone-300 mt-0.5">{lightboxMedia.subtitle}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
