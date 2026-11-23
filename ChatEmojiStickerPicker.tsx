import React, { useEffect, useState } from 'react';
import { Smile, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { T } from '../i18n';
import type { Lang } from '../types';

export interface FamilyStickerDef {
  id: string;
  pack: 'greetings' | 'love' | 'celebration';
  labelEn: string;
  labelSi: string;
  bgFrom: string;
  bgTo: string;
  ringColor: string;
  emoji: string;
  accentEmoji: string;
  caption: string;
}

export const FAMILY_STICKERS: FamilyStickerDef[] = [
  {
    id: 'ayubowan',
    pack: 'greetings',
    labelEn: 'Ayubowan!',
    labelSi: 'ආයුබෝවන්!',
    bgFrom: '#fff1f2',
    bgTo: '#ffe4e6',
    ringColor: '#fda4af',
    emoji: '🙏',
    accentEmoji: '🪷',
    caption: 'ආයුබෝවන්!',
  },
  {
    id: 'happy_birthday',
    pack: 'celebration',
    labelEn: 'Happy Birthday!',
    labelSi: 'සුභ උපන්දිනයක්!',
    bgFrom: '#fef3c7',
    bgTo: '#fde68a',
    ringColor: '#f59e0b',
    emoji: '🎂',
    accentEmoji: '🎉',
    caption: 'HAPPY B-DAY!',
  },
  {
    id: 'love_family',
    pack: 'love',
    labelEn: 'Love You!',
    labelSi: 'ආදරෙයි!',
    bgFrom: '#ffe4e6',
    bgTo: '#fecdd3',
    ringColor: '#f43f5e',
    emoji: '❤️',
    accentEmoji: '✨',
    caption: 'LOVE YOU!',
  },
  {
    id: 'good_morning',
    pack: 'greetings',
    labelEn: 'Good Morning!',
    labelSi: 'සුභ උදෑසනක්!',
    bgFrom: '#fef9c3',
    bgTo: '#fed7aa',
    ringColor: '#fb923c',
    emoji: '☀️',
    accentEmoji: '🌺',
    caption: 'GOOD MORNING',
  },
  {
    id: 'good_night',
    pack: 'greetings',
    labelEn: 'Good Night!',
    labelSi: 'සුභ රාත්‍රියක්!',
    bgFrom: '#e0e7ff',
    bgTo: '#c7d2fe',
    ringColor: '#6366f1',
    emoji: '🌙',
    accentEmoji: '⭐',
    caption: 'GOOD NIGHT',
  },
  {
    id: 'tea_time',
    pack: 'greetings',
    labelEn: 'Tea Time!',
    labelSi: 'තේ බොමුද?',
    bgFrom: '#ecfdf5',
    bgTo: '#d1fae5',
    ringColor: '#10b981',
    emoji: '☕',
    accentEmoji: '🍪',
    caption: 'TEA TIME!',
  },
  {
    id: 'family_trip',
    pack: 'celebration',
    labelEn: "Let's Go Trip!",
    labelSi: 'ට්‍රිප් යමු!',
    bgFrom: '#e0f2fe',
    bgTo: '#bae6fd',
    ringColor: '#0284c7',
    emoji: '✈️',
    accentEmoji: '🌴',
    caption: 'TRIP TIME!',
  },
  {
    id: 'congrats',
    pack: 'celebration',
    labelEn: 'Congrats!',
    labelSi: 'සුබ පැතුම්!',
    bgFrom: '#fae8ff',
    bgTo: '#f5d0fe',
    ringColor: '#d946ef',
    emoji: '🎉',
    accentEmoji: '🥂',
    caption: 'CONGRATS!',
  },
  {
    id: 'thank_you',
    pack: 'love',
    labelEn: 'Thank You!',
    labelSi: 'ස්තුතියි!',
    bgFrom: '#fce7f3',
    bgTo: '#fbcfe8',
    ringColor: '#ec4899',
    emoji: '💐',
    accentEmoji: '💖',
    caption: 'THANK YOU!',
  },
  {
    id: 'big_hug',
    pack: 'love',
    labelEn: 'Big Hug!',
    labelSi: 'උණුසුම් වැළඳගැනීමක්!',
    bgFrom: '#ffedd5',
    bgTo: '#fed7aa',
    ringColor: '#ea580c',
    emoji: '🤗',
    accentEmoji: '🧡',
    caption: 'BIG HUG!',
  },
  {
    id: 'haha_laugh',
    pack: 'love',
    labelEn: 'So Funny!',
    labelSi: 'හිනා යනවා!',
    bgFrom: '#fef08a',
    bgTo: '#fde047',
    ringColor: '#eab308',
    emoji: '😂',
    accentEmoji: '😆',
    caption: 'HAHAHA!',
  },
  {
    id: 'miss_you',
    pack: 'love',
    labelEn: 'Miss You!',
    labelSi: 'මතක් වෙනවා!',
    bgFrom: '#f3e8ff',
    bgTo: '#e9d5ff',
    ringColor: '#a855f7',
    emoji: '🥺',
    accentEmoji: '💜',
    caption: 'MISS YOU!',
  },
  {
    id: 'yummy_food',
    pack: 'celebration',
    labelEn: 'Yummy!',
    labelSi: 'හරිම රසයි!',
    bgFrom: '#fff7ed',
    bgTo: '#ffedd5',
    ringColor: '#f97316',
    emoji: '🍲',
    accentEmoji: '😋',
    caption: 'YUMMY!',
  },
  {
    id: 'sweet_home',
    pack: 'greetings',
    labelEn: 'Sweet Home!',
    labelSi: 'අපේ ගෙදර!',
    bgFrom: '#ffe4e6',
    bgTo: '#fecdd3',
    ringColor: '#e11d48',
    emoji: '🏡',
    accentEmoji: '❤️',
    caption: 'OUR HOME',
  },
  {
    id: 'awesome',
    pack: 'celebration',
    labelEn: 'Awesome!',
    labelSi: 'සුපිරි!',
    bgFrom: '#dbeafe',
    bgTo: '#bfdbfe',
    ringColor: '#2563eb',
    emoji: '👍',
    accentEmoji: '🔥',
    caption: 'AWESOME!',
  },
  {
    id: 'blessings',
    pack: 'greetings',
    labelEn: 'Blessings!',
    labelSi: 'තෙරුවන් සරණයි!',
    bgFrom: '#fefce8',
    bgTo: '#fef08a',
    ringColor: '#ca8a04',
    emoji: '🪷',
    accentEmoji: '✨',
    caption: 'BLESSINGS!',
  },
];

export function parseStickerId(mediaUrl: string): string {
  return mediaUrl.startsWith('sticker:') ? mediaUrl.slice('sticker:'.length) : mediaUrl;
}

export const StickerArtwork: React.FC<{
  mediaUrl: string;
  lang: Lang;
  size?: 'sm' | 'lg';
}> = ({ mediaUrl, lang, size = 'lg' }) => {
  const id = parseStickerId(mediaUrl);
  const def = FAMILY_STICKERS.find((s) => s.id === id) || FAMILY_STICKERS[0];
  const isLg = size === 'lg';
  const label = lang === 'si' ? def.labelSi : def.caption;

  return (
    <div
      style={{
        background: `linear-gradient(145deg, ${def.bgFrom}, ${def.bgTo})`,
        borderColor: def.ringColor,
      }}
      className={`relative select-none border-4 border-white dark:border-stone-200 ring-2 ring-black/5 shadow-md flex flex-col items-center justify-center overflow-hidden ${
        isLg ? 'w-32 h-32 rounded-3xl p-2' : 'w-full aspect-square rounded-2xl p-1.5'
      }`}
    >
      <span
        className={`absolute top-1.5 right-2 leading-none ${isLg ? 'text-lg' : 'text-xs'}`}
        aria-hidden="true"
      >
        {def.accentEmoji}
      </span>
      <span
        className={`leading-none drop-shadow-sm ${isLg ? 'text-5xl mt-0.5' : 'text-3xl'}`}
        aria-hidden="true"
      >
        {def.emoji}
      </span>
      <span
        style={{ backgroundColor: def.ringColor }}
        className={`mt-1.5 px-2 py-0.5 rounded-full text-white font-bold tracking-wide text-center leading-tight shadow-xs max-w-full truncate ${
          isLg ? 'text-[10px]' : 'text-[9px]'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    icon: '😊',
    emojis: [
      '😀', '😄', '😁', '😆', '😂', '🤣', '🥹', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤗',
      '🤭', '🥳', '😌', '😴', '🥺', '😭', '😮', '🙌',
    ],
  },
  {
    id: 'love',
    icon: '❤️',
    emojis: [
      '❤️', '🩷', '🧡', '💛', '💚', '💙', '💜', '🤍',
      '💖', '💝', '💘', '💕', '💞', '💓', '🫶', '🫂',
      '💋', '🌹', '💐', '🌷', '🌸', '🌺', '🪷', '✨',
    ],
  },
  {
    id: 'party',
    icon: '🎂',
    emojis: [
      '🎂', '🍰', '🧁', '🎉', '🎊', '🎈', '🎁', '🎀',
      '🕯️', '🎆', '🎇', '🥂', '🍾', '🎶', '🎵', '📸',
      '🎥', '🏆', '🥇', '⭐', '🌟', '💫', '🔥', '💯',
    ],
  },
  {
    id: 'family',
    icon: '🙏',
    emojis: [
      '🙏', '👋', '👏', '🤝', '👍', '👎', '✌️', '🤞',
      '👌', '💪', '👨‍👩‍👧‍👦', '👨‍👩‍👧', '👩‍👧‍👦', '👴', '👵', '👶',
      '🧒', '🧑', '🏡', '🏠', '🚗', '✈️', '🌴', '🌊',
    ],
  },
  {
    id: 'food',
    icon: '☕',
    emojis: [
      '☕', '🍵', '🧋', '🥤', '🥥', '🥭', '🍌', '🍍',
      '🍉', '🍓', '🍕', '🍔', '🍛', '🍲', '🍜', '🥗',
      '🍪', '🍩', '🍫', '🍬', '🍨', '🍧', '🍯', '🍿',
    ],
  },
];

const DEFAULT_RECENT = ['❤️', '😂', '🥰', '🎂', '🙏', '🎉', '👏', '😘'];

function loadRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem('of_recent_emojis');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((x) => typeof x === 'string').slice(0, 16);
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_RECENT;
}

interface PickerProps {
  lang: Lang;
  open: boolean;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerId: string) => void;
  onClose: () => void;
}

export const ChatEmojiStickerPicker: React.FC<PickerProps> = ({
  lang,
  open,
  onSelectEmoji,
  onSelectSticker,
  onClose,
}) => {
  const t = T[lang];
  const [mode, setMode] = useState<'emoji' | 'sticker'>('emoji');
  const [emojiCat, setEmojiCat] = useState('smileys');
  const [stickerPack, setStickerPack] = useState<'all' | 'greetings' | 'love' | 'celebration'>('all');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(loadRecentEmojis);

  useEffect(() => {
    try {
      localStorage.setItem('of_recent_emojis', JSON.stringify(recentEmojis));
    } catch {
      // ignore storage errors
    }
  }, [recentEmojis]);

  const handlePickEmoji = (emoji: string) => {
    setRecentEmojis((prev) => [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 12));
    onSelectEmoji(emoji);
  };

  const activeCategory =
    EMOJI_CATEGORIES.find((c) => c.id === emojiCat) || EMOJI_CATEGORIES[0];

  const visibleStickers =
    stickerPack === 'all'
      ? FAMILY_STICKERS
      : FAMILY_STICKERS.filter((s) => s.pack === stickerPack);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: 12 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-t border-stone-200 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-900/95"
        >
          {/* WhatsApp-style Mode Header: Emojis vs Stickers */}
          <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 border-b border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setMode('emoji')}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'emoji'
                    ? 'text-stone-900 dark:text-white'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {mode === 'emoji' && (
                  <motion.span
                    layoutId="chat-picker-mode"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-stone-900 shadow-xs"
                  />
                )}
                <Smile className="w-3.5 h-3.5 relative z-10 text-rose-600 dark:text-rose-400" />
                <span className="relative z-10">{t.emojiLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('sticker')}
                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'sticker'
                    ? 'text-stone-900 dark:text-white'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {mode === 'sticker' && (
                  <motion.span
                    layoutId="chat-picker-mode"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-stone-900 shadow-xs"
                  />
                )}
                <Sparkles className="w-3.5 h-3.5 relative z-10 text-rose-600 dark:text-rose-400" />
                <span className="relative z-10">{t.stickerLabel}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200/70 dark:hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {mode === 'emoji' ? (
            <div className="p-2.5 sm:p-3 space-y-2.5">
              {/* Category Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {EMOJI_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEmojiCat(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-base transition-colors shrink-0 ${
                      emojiCat === cat.id
                        ? 'bg-rose-100 dark:bg-rose-950/60 ring-1 ring-rose-400'
                        : 'hover:bg-stone-200/70 dark:hover:bg-stone-800'
                    }`}
                  >
                    {cat.icon}
                  </button>
                ))}
              </div>

              {/* Recent Row */}
              {recentEmojis.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1 mb-1">
                    {t.recentLabel}
                  </p>
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
                    {recentEmojis.map((em) => (
                      <motion.button
                        key={`recent-${em}`}
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        onClick={() => handlePickEmoji(em)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xl hover:bg-stone-200/70 dark:hover:bg-stone-800 shrink-0"
                      >
                        {em}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Emoji Grid */}
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 max-h-44 overflow-y-auto pr-0.5">
                {activeCategory.emojis.map((em) => (
                  <motion.button
                    key={em}
                    type="button"
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.82 }}
                    onClick={() => handlePickEmoji(em)}
                    className="h-9 rounded-lg flex items-center justify-center text-xl hover:bg-stone-200/70 dark:hover:bg-stone-800"
                  >
                    {em}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2.5 sm:p-3 space-y-2.5">
              {/* Sticker Pack Filter + Hint */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1.5 shrink-0">
                  {(
                    [
                      ['all', lang === 'si' ? 'සියල්ල' : 'All'],
                      ['greetings', lang === 'si' ? 'ආයුබෝවන්' : 'Greetings'],
                      ['love', lang === 'si' ? 'ආදරය' : 'Love & Fun'],
                      ['celebration', lang === 'si' ? 'සැමරුම්' : 'Party & Food'],
                    ] as const
                  ).map(([packId, label]) => (
                    <button
                      key={packId}
                      type="button"
                      onClick={() => setStickerPack(packId)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                        stickerPack === packId
                          ? 'bg-rose-700 text-white'
                          : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 whitespace-nowrap hidden sm:inline">
                  {t.tapStickerHint}
                </span>
              </div>

              {/* Stickers Grid (Tap to Send Instantly) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-h-52 overflow-y-auto p-0.5">
                {visibleStickers.map((st) => (
                  <motion.button
                    key={st.id}
                    type="button"
                    whileHover={{ scale: 1.07, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelectSticker(st.id)}
                    title={lang === 'si' ? st.labelSi : st.labelEn}
                    className="flex flex-col items-center gap-1 rounded-xl p-1 hover:bg-stone-200/60 dark:hover:bg-stone-800/70 transition-colors"
                  >
                    <StickerArtwork mediaUrl={`sticker:${st.id}`} lang={lang} size="sm" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
