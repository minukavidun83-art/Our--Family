import React, { useEffect, useRef } from 'react';
import { waitForImagesLoaded, type PrintablePhotoPayload } from '../utils/mediaActions';

interface Props {
  photo: PrintablePhotoPayload | null;
  onDone: () => void;
}

export const PrintPhotoSheet: React.FC<Props> = ({ photo, onDone }) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!photo) return;
    let cancelled = false;

    const handleAfterPrint = () => {
      onDone();
    };
    window.addEventListener('afterprint', handleAfterPrint);

    const runPrint = async () => {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
      );
      await waitForImagesLoaded(sheetRef.current, 1600);
      if (!cancelled) {
        window.print();
      }
    };

    runPrint();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [photo, onDone]);

  if (!photo) return null;

  const allUrls = Array.from(
    new Set([photo.url, ...(photo.extraUrls || [])].filter((u) => typeof u === 'string' && u.length > 0))
  );
  const isMulti = allUrls.length > 1 || Boolean(photo.description);

  return (
    <div className="hidden print:flex fixed inset-0 bg-white text-stone-900 items-start justify-center z-50">
      <div
        ref={sheetRef}
        className="w-[194mm] h-[277mm] max-h-[277mm] overflow-hidden bg-white text-stone-900 flex flex-col justify-between gap-3 py-1"
      >
        <div className="w-full border-b-2 border-rose-700 pb-2 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="./logo.png" alt="OUR FAMILIES" className="w-10 h-10 rounded-full object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-lg font-bold text-rose-800 leading-tight">OUR FAMILIES ❤️</p>
              {photo.title && (
                <h1 className="font-display text-base font-bold text-stone-900 truncate mt-0.5">
                  {photo.title}
                </h1>
              )}
            </div>
          </div>
          {photo.meta && (
            <p className="text-[11px] font-semibold text-stone-600 text-right shrink-0">{photo.meta}</p>
          )}
        </div>

        {photo.description && (
          <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 shrink-0 line-clamp-4">
            {photo.description}
          </p>
        )}

        <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
          {!isMulti && allUrls.length === 1 ? (
            <img
              src={allUrls[0]}
              alt={photo.title || 'OUR FAMILIES Photo'}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain rounded-xl border border-stone-200"
            />
          ) : allUrls.length > 0 ? (
            <div
              className={`w-full h-full grid gap-2.5 place-items-center ${
                allUrls.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : allUrls.length <= 4
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
              }`}
            >
              {allUrls.slice(0, 9).map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="w-full h-full max-h-[105mm] rounded-xl overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={`${photo.title || 'Memory'} ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="w-full border-t border-stone-200 pt-1.5 flex items-center justify-between text-[10px] text-stone-500 shrink-0">
          <span>{photo.subtitle || 'OUR FAMILIES — 1 A4 Memory Print'}</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
