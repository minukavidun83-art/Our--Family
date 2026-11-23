import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Cake, Edit3, Image as ImageIcon, Loader2, Send, ShieldCheck, X } from 'lucide-react';
import { T } from '../i18n';
import type { BirthdayEntry, Family, FamilyMember, Lang, LocalProfile, SiteSettings } from '../types';
import { EditFamilyModal } from './EditFamilyModal';
import { SinglePhotoUploader } from './MediaUploader';
import { AvatarStack, WishSenderPickerRow, resolveSelectedSenders } from './MemberSenderPicker';
import { apiFetch } from '../utils/staticApiBridge';

interface Props {
  lang: Lang;
  siteSettings: SiteSettings;
  families: Family[];
  allMembers: FamilyMember[];
  upcomingBirthdays: BirthdayEntry[];
  localProfile: LocalProfile;
  onViewFamily: (familyId: string) => void;
  onFamilyUpdated: (updated: Family) => void;
  onSiteSettingsUpdated: (updated: SiteSettings) => void;
  onGoToAbout: () => void;
  onOpenBirthdays: () => void;
  onWishSent: () => void;
  onOpenAdmin?: () => void;
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

export const HomeView: React.FC<Props> = ({
  lang,
  siteSettings,
  families,
  allMembers,
  upcomingBirthdays,
  localProfile,
  onViewFamily,
  onFamilyUpdated,
  onSiteSettingsUpdated,
  onGoToAbout,
  onOpenBirthdays,
  onWishSent,
  onOpenAdmin,
}) => {
  const t = T[lang];
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [editingHero, setEditingHero] = useState(false);

  const [heroPhotoUrl, setHeroPhotoUrl] = useState(siteSettings.heroPhotoUrl);
  const [welcomeEn, setWelcomeEn] = useState(siteSettings.welcomeEn);
  const [welcomeSi, setWelcomeSi] = useState(siteSettings.welcomeSi);
  const [savingHero, setSavingHero] = useState(false);

  const [wishDrafts, setWishDrafts] = useState<Record<string, string>>({});
  const [wishSenderIds, setWishSenderIds] = useState<Record<string, string[]>>({});
  const [sendingWishKey, setSendingWishKey] = useState<string | null>(null);

  const authorName =
    localProfile.name.trim() || (lang === 'si' ? 'පවුලේ සාමාජික' : 'Family Member');

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHero(true);
    try {
      const res = await apiFetch('/api/site-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
          'x-author-name': encodeURIComponent(authorName),
        },
        body: JSON.stringify({ heroPhotoUrl, welcomeEn, welcomeSi }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSiteSettingsUpdated(updated);
        setEditingHero(false);
      }
    } finally {
      setSavingHero(false);
    }
  };

  const handleSendHomeWish = async (targetKey: string) => {
    const msg = (wishDrafts[targetKey] || '').trim();
    if (!msg) return;
    const resolved = resolveSelectedSenders(
      wishSenderIds[targetKey] || [],
      allMembers,
      localProfile,
      lang
    );
    setSendingWishKey(targetKey);
    try {
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
        setWishDrafts((prev) => ({ ...prev, [targetKey]: '' }));
        onWishSent();
      }
    } finally {
      setSendingWishKey(null);
    }
  };

  return (
    <div className="space-y-16 pb-20 lg:pb-12">
      {/* Hero Section with Full-Family Group Photo & Bilingual Welcome */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-900 shadow-sm"
        >
          <div className="relative w-full min-h-[370px] sm:min-h-[410px] lg:aspect-21/9 flex flex-col justify-end overflow-hidden">
            {siteSettings.heroPhotoUrl ? (
              <motion.img
                initial={{ scale: 1.07, opacity: 0.85 }}
                animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                transition={{
                  opacity: { duration: 0.8, ease: 'easeOut' },
                  scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
                }}
                src={siteSettings.heroPhotoUrl}
                alt="OUR FAMILIES"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-rose-950 via-stone-900 to-stone-800 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-stone-500" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

            <div className="relative z-10 flex flex-col justify-end p-5 sm:p-10 lg:p-14">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-3xl space-y-3 sm:space-y-4"
              >
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 }}
                  className="text-xs sm:text-sm font-medium tracking-wide text-rose-200"
                >
                  {t.heroKicker}
                </motion.p>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white text-balance flex items-center gap-3 flex-wrap">
                  <span>OUR FAMILIES</span>
                  <motion.span
                    aria-hidden="true"
                    animate={{ scale: [1, 1.22, 1, 1.14, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
                    className="inline-block"
                  >
                    ❤️
                  </motion.span>
                </h1>
                <p className="text-sm sm:text-base text-stone-100 leading-relaxed max-w-2xl">
                  {lang === 'si' ? siteSettings.welcomeSi : siteSettings.welcomeEn}
                </p>
                <p className="text-xs sm:text-sm text-stone-300/90 leading-relaxed max-w-2xl">
                  {lang === 'si' ? siteSettings.welcomeEn : siteSettings.welcomeSi}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onGoToAbout}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white px-5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{t.heroExploreBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setHeroPhotoUrl(siteSettings.heroPhotoUrl);
                      setWelcomeEn(siteSettings.welcomeEn);
                      setWelcomeSi(siteSettings.welcomeSi);
                      setEditingHero(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{t.heroEditBtn}</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Auto Upcoming Birthdays (Next 1 Month / 30 Days) */}
      {upcomingBirthdays.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-5 sm:p-6">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.8 }}
                  className="inline-block"
                >
                  🎂
                </motion.span>
                <span>{t.upcoming1MonthTitle}</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
                {t.upcoming1MonthSub}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenAdmin && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-stone-900 hover:border-rose-400 text-stone-800 dark:text-stone-100 px-3.5 py-2 text-xs font-medium whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                  <span>{t.openAdminPanelBtn}</span>
                </motion.button>
              )}
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={onOpenBirthdays}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium whitespace-nowrap"
              >
                <span>{t.seeAllBirthdays}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingBirthdays.map((b, idx) => {
              const days = getDaysUntilBirthday(b.birthDate);
              return (
                <motion.article
                  key={b.targetKey}
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.32, delay: Math.min(idx, 5) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 flex items-center justify-center border border-stone-200 dark:border-stone-700">
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
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                        {b.memberName}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {b.birthDate}
                        {b.familyNameEn && (
                          <> · {lang === 'si' ? b.familyNameSi : b.familyNameEn}</>
                        )}
                      </p>
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mt-0.5 tabular-nums">
                        {days === 0 ? t.todayLabel : `${days} ${t.daysAway}`}
                      </p>
                    </div>
                  </div>

                  {b.wishes.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2 border-t border-stone-100 dark:border-stone-800">
                      {b.wishes.slice(0, 3).map((w) => (
                        <motion.div
                          key={w.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 rounded-lg px-2.5 py-1.5 flex items-start gap-2"
                        >
                          <AvatarStack
                            avatars={w.authorAvatars}
                            fallbackAvatar={w.authorAvatar}
                            alt={w.authorName}
                            size="sm"
                          />
                          <p className="min-w-0 flex-1">
                            <span className="font-semibold text-stone-900 dark:text-stone-100">
                              {w.authorName}:{' '}
                            </span>
                            {w.message}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
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
                        value={wishDrafts[b.targetKey] || ''}
                        onChange={(e) =>
                          setWishDrafts((prev) => ({ ...prev, [b.targetKey]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendHomeWish(b.targetKey);
                          }
                        }}
                        placeholder={t.writeWish}
                        className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        disabled={sendingWishKey === b.targetKey}
                        onClick={() => handleSendHomeWish(b.targetKey)}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3 py-2 text-xs font-medium shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t.sendWish}</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}

      {/* 8 Family Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50 text-balance">
              {t.eightFamiliesHeading}
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1.5 max-w-2xl">
              {t.eightFamiliesSub}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {families.map((fam, idx) => {
            const displayName = lang === 'si' ? fam.nameSi : fam.nameEn;
            const displayDesc =
              lang === 'si'
                ? fam.descriptionSi || fam.descriptionEn
                : fam.descriptionEn || fam.descriptionSi;

            return (
              <motion.article
                key={fam.id}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, delay: Math.min(idx, 7) * 0.045, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.015 }}
                className="group rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col hover:border-rose-300 dark:hover:border-rose-800 transition-[border-color,box-shadow] hover:shadow-lg"
              >
                <div
                  onClick={() => onViewFamily(fam.id)}
                  className="aspect-4/3 w-full bg-stone-100 dark:bg-stone-800/80 relative overflow-hidden cursor-pointer"
                >
                  {fam.coverPhotoUrl ? (
                    <img
                      src={fam.coverPhotoUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-stone-100 to-stone-200/70 dark:from-stone-800 dark:to-stone-900">
                      <span className="font-display text-3xl font-bold text-stone-300 dark:text-stone-700 tabular-nums group-hover:scale-110 transition-transform duration-300">
                        0{fam.sortOrder}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{t.noPhotoYet}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                        {displayName}
                      </h3>
                      {typeof fam.memberCount === 'number' && (
                        <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                          {fam.memberCount} {t.membersCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1.5 line-clamp-3 leading-relaxed">
                      {displayDesc || t.noDescriptionYet}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onViewFamily(fam.id)}
                      className="flex-1 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-rose-700 dark:hover:bg-rose-600 dark:hover:text-white px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      {t.viewFamily}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEditingFamily(fam)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-700 dark:hover:text-rose-400 transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t.editFamily}</span>
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {editingFamily && (
        <EditFamilyModal
          lang={lang}
          family={editingFamily}
          localProfile={localProfile}
          onClose={() => setEditingFamily(null)}
          onSaved={onFamilyUpdated}
        />
      )}

      {/* Edit Hero Welcome & Photo Modal */}
      <AnimatePresence>
        {editingHero && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="w-full max-w-xl rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                {t.heroEditBtn}
              </h3>
              <button
                type="button"
                onClick={() => setEditingHero(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveHero} className="p-6 space-y-4">
              {heroPhotoUrl && (
                <div className="rounded-xl overflow-hidden aspect-16/9 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                  <img
                    src={heroPhotoUrl}
                    alt="Hero preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <SinglePhotoUploader
                lang={lang}
                value={heroPhotoUrl}
                onChange={setHeroPhotoUrl}
              />
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Welcome Message (English)
                </label>
                <textarea
                  rows={3}
                  value={welcomeEn}
                  onChange={(e) => setWelcomeEn(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                  පිළිගැනීමේ පණිවිඩය (සිංහල)
                </label>
                <textarea
                  rows={3}
                  value={welcomeSi}
                  onChange={(e) => setWelcomeSi(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHero(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingHero}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium"
                >
                  {savingHero && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t.save}</span>
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
