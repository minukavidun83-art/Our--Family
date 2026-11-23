export interface PrintablePhotoPayload {
  url: string;
  title?: string;
  subtitle?: string;
  meta?: string;
  description?: string;
  extraUrls?: string[];
}

export const PRINT_PHOTO_EVENT = 'of:print-photo';
export const PRINT_FAMILY_PROFILE_EVENT = 'of:print-family-profile';

function inferExtension(url: string, mimeType?: string): string {
  if (mimeType) {
    const clean = mimeType.split(';')[0].trim().toLowerCase();
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    if (map[clean]) return map[clean];
  }

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
    // ignore malformed url
  }
  return 'jpg';
}

function buildSafeFilename(titleHint: string | undefined, url: string, mimeType?: string): string {
  const ext = inferExtension(url, mimeType);
  const base = (titleHint || 'our-families-photo')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0d80-\u0dff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base || 'our-families-photo'}.${ext}`;
}

export async function downloadMediaFile(url: string, titleHint?: string): Promise<void> {
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download fetch failed');
    const blob = await response.blob();
    const filename = buildSafeFilename(titleHint, url, blob.type);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    const filename = buildSafeFilename(titleHint, url);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export function triggerPhotoPrint(payload: PrintablePhotoPayload): void {
  if (!payload.url && (!payload.extraUrls || payload.extraUrls.length === 0)) return;
  window.dispatchEvent(new CustomEvent<PrintablePhotoPayload>(PRINT_PHOTO_EVENT, { detail: payload }));
}

export function triggerFamilyProfilePrint(): void {
  window.dispatchEvent(new CustomEvent(PRINT_FAMILY_PROFILE_EVENT));
}

export async function waitForImagesLoaded(container: HTMLElement | null, timeoutMs = 1400): Promise<void> {
  if (!container) return;
  const imgs = Array.from(container.querySelectorAll('img'));
  const pending = imgs.filter((img) => !img.complete);
  if (pending.length === 0) return;

  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          })
      )
    ),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}
