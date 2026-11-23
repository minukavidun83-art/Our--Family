import React, { useState } from 'react';
import { ArrowRight, Edit3, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { T } from '../i18n';
import type { Family, Lang, LocalProfile } from '../types';
import { EditFamilyModal } from './EditFamilyModal';

interface Props {
  lang: Lang;
  families: Family[];
  localProfile: LocalProfile;
  onSelectFamily: (familyId: string) => void;
  onFamilyUpdated: (updated: Family) => void;
}

export const AboutFamiliesView: React.FC<Props> = ({
  lang,
  families,
  localProfile,
  onSelectFamily,
  onFamilyUpdated,
}) => {
  const t = T[lang];
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 lg:pb-16 space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="border-b border-stone-200 dark:border-stone-800 pb-6"
      >
        <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
          {t.heroKicker}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-50 mt-2 flex items-center gap-2.5 flex-wrap">
          <span>{lang === 'si' ? 'අපේ පවුල් ගැන' : 'ABOUT OUR FAMILIES'}</span>
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 1.22, 1, 1.14, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.5 }}
            className="inline-block"
          >
            ❤️
          </motion.span>
        </h1>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mt-2 max-w-3xl">
          {t.eightFamiliesSub}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {families.map((fam, idx) => {
          const name = lang === 'si' ? fam.nameSi : fam.nameEn;
          const desc =
            lang === 'si'
              ? fam.descriptionSi || fam.descriptionEn
              : fam.descriptionEn || fam.descriptionSi;

          return (
            <motion.article
              key={fam.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, delay: Math.min(idx, 7) * 0.045, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden grid grid-cols-1 sm:grid-cols-5 hover:border-rose-300 dark:hover:border-rose-800 transition-[border-color,box-shadow] hover:shadow-lg"
            >
              <div
                onClick={() => onSelectFamily(fam.id)}
                className="sm:col-span-2 aspect-4/3 sm:aspect-auto sm:h-full bg-stone-100 dark:bg-stone-800 cursor-pointer overflow-hidden"
              >
                {fam.coverPhotoUrl ? (
                  <img
                    src={fam.coverPhotoUrl}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center">
                    <span className="font-display text-3xl font-bold text-stone-300 dark:text-stone-700 tabular-nums group-hover:scale-110 transition-transform duration-300">
                      0{fam.sortOrder}
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{t.noPhotoYet}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-3 p-6 flex flex-col justify-between gap-4">
                <div
                  onClick={() => onSelectFamily(fam.id)}
                  className="cursor-pointer space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                      {name}
                    </h2>
                    {typeof fam.memberCount === 'number' && (
                      <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                        {fam.memberCount} {t.membersCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    {desc || t.noDescriptionYet}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelectFamily(fam.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium transition-colors"
                  >
                    <span>{t.viewFamily}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setEditingFamily(fam)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 dark:hover:border-rose-700"
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

      {editingFamily && (
        <EditFamilyModal
          lang={lang}
          family={editingFamily}
          localProfile={localProfile}
          onClose={() => setEditingFamily(null)}
          onSaved={onFamilyUpdated}
        />
      )}
    </div>
  );
};
