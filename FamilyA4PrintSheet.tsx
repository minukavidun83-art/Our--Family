import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cake, Calendar, Image as ImageIcon, MapPin, PartyPopper, Plane, User } from 'lucide-react';
import { T, translateRelationship } from '../i18n';
import type { Family, FamilyHistoryData, FamilyMember, Lang } from '../types';
import { PRINT_FAMILY_PROFILE_EVENT, waitForImagesLoaded } from '../utils/mediaActions';

interface Props {
  lang: Lang;
  family: Family;
  members: FamilyMember[];
  history: FamilyHistoryData;
}

// 194mm x 277mm fits strictly inside an A4 portrait page (210mm x 297mm) with 8mm margins
const MAX_A4_CONTENT_PX = 1040;

export const FamilyA4PrintSheet: React.FC<Props> = ({ lang, family, members, history }) => {
  const t = T[lang];
  const measureRef = useRef<HTMLDivElement>(null);
  const [measuring, setMeasuring] = useState(false);
  const [fitScale, setFitScale] = useState(1);

  const displayName = lang === 'si' ? family.nameSi : family.nameEn;
  const displayDesc =
    lang === 'si'
      ? family.descriptionSi || family.descriptionEn
      : family.descriptionEn || family.descriptionSi;

  const computeScale = useCallback(() => {
    const el = measureRef.current;
    if (!el) return 1;
    const h = el.scrollHeight;
    if (!h || h <= MAX_A4_CONTENT_PX) return 1;
    return Math.max(0.45, Math.min(1, MAX_A4_CONTENT_PX / h));
  }, []);

  useEffect(() => {
    const handlePrintTrigger = async () => {
      setMeasuring(true);
      setFitScale(1);

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
      );
      await waitForImagesLoaded(measureRef.current);

      const nextScale = computeScale();
      setFitScale(nextScale);

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
      );
      window.print();
    };

    const handleBeforePrint = () => {
      if (measureRef.current && measureRef.current.scrollHeight > 0) {
        setFitScale(computeScale());
      }
    };

    const handleAfterPrint = () => {
      setMeasuring(false);
      setFitScale(1);
    };

    window.addEventListener(PRINT_FAMILY_PROFILE_EVENT, handlePrintTrigger);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener(PRINT_FAMILY_PROFILE_EVENT, handlePrintTrigger);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [computeScale]);

  const picturePhotos = history.pictures.filter((p) => p.mediaType === 'image');
  const pictureOtherDocs = history.pictures.filter((p) => p.mediaType !== 'image');

  return (
    <div
      className={
        measuring
          ? 'fixed -left-[99999px] top-0 w-[194mm] opacity-0 pointer-events-none print:static print:opacity-100 print:pointer-events-auto print:block print:w-[194mm] print:max-h-[279mm] print:overflow-hidden print:mx-auto bg-white text-stone-900'
          : 'hidden print:block print:w-[194mm] print:max-h-[279mm] print:overflow-hidden print:mx-auto bg-white text-stone-900'
      }
    >
      <div
        ref={measureRef}
        style={fitScale < 1 ? { zoom: fitScale } : undefined}
        className="w-[194mm] bg-white text-stone-900 space-y-2.5 pb-1"
      >
        {/* Brand Header */}
        <header className="flex items-center justify-between border-b-2 border-rose-700 pb-2">
          <div className="flex items-center gap-2.5">
            <img src="./logo.png" alt="OUR FAMILIES" className="w-10 h-10 rounded-full object-contain shrink-0" />
            <div>
              <p className="font-display text-lg font-bold text-rose-800 leading-tight">OUR FAMILIES ❤️</p>
              <p className="text-[10px] font-semibold text-stone-600">{t.familyProfilePrintHeader}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-rose-700 tabular-nums">
              0{family.sortOrder} · {members.length} {t.membersCount}
            </p>
            <p className="text-[10px] text-stone-500 tabular-nums">{new Date().toLocaleDateString()}</p>
          </div>
        </header>

        {/* Family Cover & Summary */}
        <section className="rounded-xl border border-stone-300 bg-stone-50/70 p-2.5 flex items-center gap-3">
          <div className="w-36 h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
            {family.coverPhotoUrl ? (
              <img
                src={family.coverPhotoUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-display text-xl font-bold text-stone-900 leading-tight">{displayName}</h1>
            <p className="text-[11px] text-stone-700 leading-snug line-clamp-3">
              {displayDesc || t.noDescriptionYet}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[9.5px] font-semibold text-stone-700">
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 tabular-nums">
                {lang === 'si' ? 'සාමාජිකයන්' : 'Members'}: {members.length}
              </span>
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 tabular-nums">
                {t.historyPictures}: {history.pictures.length}
              </span>
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 tabular-nums">
                {t.historyEvents}: {history.events.length}
              </span>
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 tabular-nums">
                {t.historyTrips}: {history.trips.length}
              </span>
              <span className="rounded border border-stone-300 bg-white px-1.5 py-0.5 tabular-nums">
                {t.historyBirthdays}: {history.birthdays.length}
              </span>
            </div>
          </div>
        </section>

        {/* Family Members */}
        <section className="space-y-1.5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-rose-800 border-b border-stone-200 pb-0.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>{lang === 'si' ? 'පවුලේ සාමාජිකයන්' : 'Family Members'} ({members.length})</span>
          </h2>
          {members.length === 0 ? (
            <p className="text-[10px] text-stone-500">{t.noMembersYet}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-stone-200 bg-white p-1.5 flex items-start gap-2"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-stone-900 truncate leading-tight">{m.name}</p>
                    <p className="text-[9.5px] font-semibold text-rose-700 leading-tight">
                      {translateRelationship(m.relationship, lang)}
                    </p>
                    {m.birthday && (
                      <p className="text-[9px] text-stone-500 tabular-nums flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{m.birthday}</span>
                      </p>
                    )}
                    {m.description && (
                      <p className="text-[9px] text-stone-600 line-clamp-2 leading-tight mt-0.5">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Events & Trips */}
        {(history.events.length > 0 || history.trips.length > 0) && (
          <div className="grid grid-cols-2 gap-2.5">
            {history.events.length > 0 && (
              <section className={`space-y-1.5 ${history.trips.length === 0 ? 'col-span-2' : ''}`}>
                <h2 className="font-display text-xs font-bold uppercase tracking-wide text-rose-800 border-b border-stone-200 pb-0.5 flex items-center gap-1.5">
                  <PartyPopper className="w-3.5 h-3.5" />
                  <span>{t.historyEvents} ({history.events.length})</span>
                </h2>
                <div className={history.trips.length === 0 ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
                  {history.events.map((ev) => {
                    const evImages = ev.media.filter((m) => m.type !== 'video');
                    return (
                      <div key={ev.id} className="rounded-lg border border-stone-200 bg-white p-2 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-stone-900 leading-tight">{ev.title}</p>
                            <p className="text-[9.5px] text-rose-700 font-medium tabular-nums">
                              {ev.eventDate} · {ev.category}
                              {ev.location ? ` · ${ev.location}` : ''}
                            </p>
                          </div>
                        </div>
                        {ev.description && (
                          <p className="text-[9.5px] text-stone-600 line-clamp-2 leading-tight">
                            {ev.description}
                          </p>
                        )}
                        {evImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-1 pt-0.5">
                            {evImages.map((img, i) => (
                              <div key={i} className="aspect-square rounded overflow-hidden border border-stone-200 bg-stone-100">
                                <img
                                  src={img.url}
                                  alt={ev.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {history.trips.length > 0 && (
              <section className={`space-y-1.5 ${history.events.length === 0 ? 'col-span-2' : ''}`}>
                <h2 className="font-display text-xs font-bold uppercase tracking-wide text-rose-800 border-b border-stone-200 pb-0.5 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" />
                  <span>{t.historyTrips} ({history.trips.length})</span>
                </h2>
                <div className={history.events.length === 0 ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
                  {history.trips.map((tr) => {
                    const trImages = tr.media.filter((m) => m.type !== 'video');
                    return (
                      <div key={tr.id} className="rounded-lg border border-stone-200 bg-white p-2 space-y-1">
                        <div>
                          <p className="text-[11px] font-bold text-stone-900 leading-tight">{tr.title}</p>
                          <p className="text-[9.5px] text-rose-700 font-medium tabular-nums flex items-center gap-1">
                            <span>{tr.tripDate}</span>
                            <span>·</span>
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{tr.destination}</span>
                          </p>
                        </div>
                        {tr.description && (
                          <p className="text-[9.5px] text-stone-600 line-clamp-2 leading-tight">
                            {tr.description}
                          </p>
                        )}
                        {trImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-1 pt-0.5">
                            {trImages.map((img, i) => (
                              <div key={i} className="aspect-square rounded overflow-hidden border border-stone-200 bg-stone-100">
                                <img
                                  src={img.url}
                                  alt={tr.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Family Pictures & Memories */}
        {history.pictures.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="font-display text-xs font-bold uppercase tracking-wide text-rose-800 border-b border-stone-200 pb-0.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t.historyPictures} ({history.pictures.length})</span>
            </h2>
            {picturePhotos.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5">
                {picturePhotos.map((item) => (
                  <div key={item.id} className="rounded-lg border border-stone-200 bg-white overflow-hidden">
                    <div className="aspect-4/3 bg-stone-100">
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-1">
                      <p className="text-[9px] font-bold text-stone-900 truncate leading-tight">{item.title}</p>
                      <p className="text-[8px] text-stone-500 truncate tabular-nums">
                        {item.momentDate}
                        {item.location ? ` · ${item.location}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pictureOtherDocs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pictureOtherDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-[9px] text-stone-700"
                  >
                    {doc.mediaType === 'pdf' ? '📄' : '🎬'} {doc.title} ({doc.momentDate})
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Family Birthdays & Wishes */}
        {history.birthdays.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="font-display text-xs font-bold uppercase tracking-wide text-rose-800 border-b border-stone-200 pb-0.5 flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5" />
              <span>{t.historyBirthdays} ({history.birthdays.length})</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {history.birthdays.map((b) => (
                <div key={b.targetKey} className="rounded-lg border border-stone-200 bg-white p-1.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md overflow-hidden bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center">
                      {b.photoUrl ? (
                        <img src={b.photoUrl} alt={b.memberName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <Cake className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold text-stone-900 truncate leading-tight">{b.memberName}</p>
                      <p className="text-[9px] text-stone-500 tabular-nums leading-tight">
                        {b.birthDate}
                        {b.notes ? ` · ${b.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  {b.wishes.length > 0 && (
                    <p className="text-[8.5px] text-stone-600 line-clamp-1 border-t border-stone-100 pt-0.5">
                      💌 {b.wishes[0].authorName}: &ldquo;{b.wishes[0].message}&rdquo;
                      {b.wishes.length > 1 ? ` (+${b.wishes.length - 1})` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compact Footer */}
        <footer className="border-t border-stone-200 pt-1.5 flex items-center justify-between text-[9px] text-stone-500">
          <span>OUR FAMILIES ❤️ · {displayName}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </footer>
      </div>
    </div>
  );
};
