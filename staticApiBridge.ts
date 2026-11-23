import type {
  Announcement,
  AppNotification,
  BirthdayEntry,
  BirthdayWish,
  ChatMessage,
  EventEntry,
  Family,
  FamilyMember,
  GalleryItem,
  MediaAsset,
  SiteSettings,
  TripEntry,
} from '../types';

const STORAGE_KEY = 'of_static_store_v1';

interface RawBirthdayRecord {
  id: string;
  familyId: string | null;
  memberName: string;
  birthDate: string;
  photoUrl: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

interface RawLikeRecord {
  targetType: 'gallery' | 'trip' | 'event';
  targetId: string;
  clientId: string;
  createdAt: string;
}

interface RawStaticStore {
  siteSettings: SiteSettings;
  families: Family[];
  members: FamilyMember[];
  birthdays: RawBirthdayRecord[];
  birthdayWishes: BirthdayWish[];
  trips: Omit<TripEntry, 'familyNameEn' | 'familyNameSi' | 'likeCount' | 'likedByMe'>[];
  events: Omit<EventEntry, 'familyNameEn' | 'familyNameSi' | 'likeCount' | 'likedByMe'>[];
  gallery: Omit<GalleryItem, 'familyNameEn' | 'familyNameSi' | 'likeCount' | 'likedByMe'>[];
  announcements: Omit<Announcement, 'familyNameEn' | 'familyNameSi'>[];
  chatMessages: ChatMessage[];
  chatReadState: Record<string, string>;
  likes: RawLikeRecord[];
  notifications: Omit<AppNotification, 'isRead'>[];
  notificationReads: Record<string, string[]>;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroPhotoUrl: './src/assets/images/hero_family_gathering_1794925789784.jpg',
  welcomeEn:
    'Welcome to OUR FAMILIES — a shared home for our eight families to preserve memories, celebrate milestones, share journeys, and stay close across every generation.',
  welcomeSi:
    'අපේ පවුල් වෙත සාදරයෙන් පිළිගනිමු — අපගේ පවුල් අටේ සුන්දර මතකයන් සුරැකීමට, උපන්දින හා විශේෂ අවස්ථා සැමරීමට, සංචාර බෙදා ගැනීමට සහ සැමදා සමීපව සිටීමට තැනූ පොදු නිවහනයි.',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function createDefaultFamilies(): Family[] {
  const now = '2026-01-01T00:00:00.000Z';
  const list: Family[] = [];
  for (let i = 1; i <= 8; i++) {
    list.push({
      id: `family-${i}`,
      sortOrder: i,
      nameEn: `Family ${i}`,
      nameSi: `පවුල ${i}`,
      descriptionEn: '',
      descriptionSi: '',
      coverPhotoUrl: '',
      updatedAt: now,
      memberCount: 0,
    });
  }
  return list;
}

function createInitialStore(): RawStaticStore {
  return {
    siteSettings: { ...DEFAULT_SITE_SETTINGS },
    families: createDefaultFamilies().map(({ memberCount: _mc, ...rest }) => rest),
    members: [],
    birthdays: [],
    birthdayWishes: [],
    trips: [],
    events: [],
    gallery: [],
    announcements: [],
    chatMessages: [],
    chatReadState: {},
    likes: [],
    notifications: [],
    notificationReads: {},
  };
}

let memoryStore: RawStaticStore | null = null;
let staticHostMode = false;
let bridgeInstalled = false;

export function isStaticHostMode(): boolean {
  return staticHostMode;
}

export function resetStaticHostDetection(): void {
  staticHostMode = false;
}

function loadStore(): RawStaticStore {
  if (memoryStore) return memoryStore;
  const fallback = createInitialStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryStore = {
          siteSettings: parsed.siteSettings?.welcomeEn
            ? parsed.siteSettings
            : { ...DEFAULT_SITE_SETTINGS, ...(parsed.siteSettings || {}) },
          families:
            Array.isArray(parsed.families) && parsed.families.length > 0
              ? parsed.families
              : fallback.families,
          members: Array.isArray(parsed.members) ? parsed.members : [],
          birthdays: Array.isArray(parsed.birthdays) ? parsed.birthdays : [],
          birthdayWishes: Array.isArray(parsed.birthdayWishes) ? parsed.birthdayWishes : [],
          trips: Array.isArray(parsed.trips) ? parsed.trips : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
          gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          chatReadState:
            parsed.chatReadState && typeof parsed.chatReadState === 'object' ? parsed.chatReadState : {},
          likes: Array.isArray(parsed.likes) ? parsed.likes : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          notificationReads:
            parsed.notificationReads && typeof parsed.notificationReads === 'object'
              ? parsed.notificationReads
              : {},
        };
        return memoryStore;
      }
    }
  } catch {
    // ignore corrupted storage
  }
  memoryStore = fallback;
  saveStore(memoryStore);
  return memoryStore;
}

function saveStore(store: RawStaticStore): void {
  memoryStore = store;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage quota exceeded; keep in memoryStore for active session
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDaysUntilBirthday(birthDate: string): { days: number; nextYear: number } {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { days: 999, nextYear: new Date().getFullYear() };
  }
  const [, mStr, dStr] = birthDate.split('-');
  const m = Number(mStr) - 1;
  const d = Number(dStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m, d);
  if (next < today) {
    next = new Date(now.getFullYear() + 1, m, d);
  }
  const days = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { days, nextYear: next.getFullYear() };
}

function findFamily(store: RawStaticStore, familyId: string | null | undefined) {
  if (!familyId) return undefined;
  return store.families.find((f) => f.id === familyId);
}

function buildAllBirthdays(store: RawStaticStore): BirthdayEntry[] {
  const wishesByTarget = new Map<string, BirthdayWish[]>();
  const sortedWishes = [...store.birthdayWishes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  for (const w of sortedWishes) {
    const arr = wishesByTarget.get(w.targetKey) || [];
    arr.push(w);
    wishesByTarget.set(w.targetKey, arr);
  }

  const standalone: BirthdayEntry[] = store.birthdays.map((b) => {
    const fam = findFamily(store, b.familyId);
    return {
      id: b.id,
      source: 'birthday',
      targetKey: `b-${b.id}`,
      familyId: b.familyId,
      familyNameEn: fam?.nameEn || '',
      familyNameSi: fam?.nameSi || '',
      memberName: b.memberName,
      birthDate: b.birthDate,
      photoUrl: b.photoUrl || '',
      notes: b.notes || '',
      createdBy: b.createdBy,
      wishes: wishesByTarget.get(`b-${b.id}`) || [],
    };
  });

  const fromMembers: BirthdayEntry[] = store.members
    .filter((m) => m.birthday && m.birthday.trim() !== '')
    .map((m) => {
      const fam = findFamily(store, m.familyId);
      return {
        id: m.id,
        source: 'member',
        targetKey: `m-${m.id}`,
        familyId: m.familyId,
        familyNameEn: fam?.nameEn || '',
        familyNameSi: fam?.nameSi || '',
        memberName: m.name,
        birthDate: m.birthday,
        photoUrl: m.photoUrl || '',
        notes: m.relationship,
        createdBy: m.createdBy,
        wishes: wishesByTarget.get(`m-${m.id}`) || [],
      };
    });

  return [...standalone, ...fromMembers];
}

function addNotification(
  store: RawStaticStore,
  params: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>
) {
  store.notifications.unshift({
    id: newId(),
    createdAt: new Date().toISOString(),
    ...params,
  });
  if (store.notifications.length > 50) {
    store.notifications = store.notifications.slice(0, 50);
  }
}

function ensureBirthdayNotifications(store: RawStaticStore) {
  const entries = buildAllBirthdays(store);
  let changed = false;
  for (const entry of entries) {
    const { days, nextYear } = getDaysUntilBirthday(entry.birthDate);
    if (days >= 0 && days <= 30) {
      const reminderType = `bday_30d:${entry.targetKey}:${nextYear}`;
      if (!store.notifications.some((n) => n.type === reminderType)) {
        const whenEn =
          days === 0 ? 'today!' : `in ${days} day${days === 1 ? '' : 's'} (${entry.birthDate})`;
        const whenSi =
          days === 0 ? 'අදයි!' : `තව දින ${days} කින් (${entry.birthDate})`;
        addNotification(store, {
          type: reminderType,
          titleEn: `🎂 Upcoming Birthday: ${entry.memberName}`,
          titleSi: `🎂 ආසන්න උපන්දිනය: ${entry.memberName}`,
          bodyEn: `${entry.memberName}'s birthday is ${whenEn}. Send a warm birthday wish!`,
          bodySi: `${entry.memberName} ගේ උපන්දිනය ${whenSi}. උණුසුම් සුබපැතුමක් එක් කරන්න!`,
          linkTab: 'features',
        });
        changed = true;
      }
    }
  }
  if (changed) saveStore(store);
}

function getLikesInfo(
  store: RawStaticStore,
  targetType: 'gallery' | 'trip' | 'event',
  targetId: string,
  clientId: string
) {
  const matching = store.likes.filter(
    (l) => l.targetType === targetType && l.targetId === targetId
  );
  return {
    likeCount: matching.length,
    likedByMe: matching.some((l) => l.clientId === clientId),
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getHeaderVal(headers: HeadersInit | undefined, key: string): string {
  if (!headers) return '';
  if (headers instanceof Headers) return headers.get(key) || '';
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === key.toLowerCase());
    return found ? found[1] : '';
  }
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return String(v || '');
  }
  return '';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/') && file.size > 900 * 1024 && file.type !== 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1400;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
            return;
          }
          resolve(String(reader.result || ''));
        };
        img.onerror = () => resolve(String(reader.result || ''));
        img.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function parseJsonBody(init?: RequestInit): Promise<any> {
  if (!init?.body) return {};
  if (typeof init.body === 'string') {
    try {
      return JSON.parse(init.body);
    } catch {
      return {};
    }
  }
  return {};
}

async function handleStaticApi(
  urlObj: URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const pathname = urlObj.pathname;
  const clientId = getHeaderVal(init?.headers, 'x-client-id') || 'shared-family-client';
  const rawActor = getHeaderVal(init?.headers, 'x-author-name');
  let actorName = 'Family Member';
  if (rawActor) {
    try {
      actorName = decodeURIComponent(rawActor);
    } catch {
      actorName = rawActor;
    }
  }
  const store = loadStore();

  // POST /api/upload
  if (method === 'POST' && pathname === '/api/upload') {
    if (init?.body instanceof FormData) {
      const file = init.body.get('file');
      if (file instanceof File) {
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const type: 'image' | 'video' | 'pdf' = isPdf
          ? 'pdf'
          : file.type.startsWith('video/')
            ? 'video'
            : 'image';
        const url = await fileToDataUrl(file);
        return jsonResponse({ url, type, name: file.name });
      }
    }
    return jsonResponse({ error: 'No file uploaded' }, 400);
  }

  // GET /api/bootstrap
  if (method === 'GET' && pathname === '/api/bootstrap') {
    ensureBirthdayNotifications(store);
    const familiesWithCounts: Family[] = [...store.families]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        ...f,
        memberCount: store.members.filter((m) => m.familyId === f.id).length,
      }));
    const upcomingBirthdays = buildAllBirthdays(store)
      .filter((b) => {
        const { days } = getDaysUntilBirthday(b.birthDate);
        return days >= 0 && days <= 30;
      })
      .sort(
        (a, b) =>
          getDaysUntilBirthday(a.birthDate).days - getDaysUntilBirthday(b.birthDate).days
      );
    const allMembers: FamilyMember[] = [...store.members].map((m) => {
      const fam = findFamily(store, m.familyId);
      return {
        ...m,
        familyNameEn: fam?.nameEn || '',
        familyNameSi: fam?.nameSi || '',
      };
    });
    return jsonResponse({
      siteSettings: store.siteSettings,
      families: familiesWithCounts,
      upcomingBirthdays,
      allMembers,
    });
  }

  // PATCH /api/site-settings
  if (method === 'PATCH' && pathname === '/api/site-settings') {
    const body = await parseJsonBody(init);
    store.siteSettings = {
      heroPhotoUrl:
        typeof body.heroPhotoUrl === 'string'
          ? body.heroPhotoUrl
          : store.siteSettings.heroPhotoUrl,
      welcomeEn:
        typeof body.welcomeEn === 'string' ? body.welcomeEn : store.siteSettings.welcomeEn,
      welcomeSi:
        typeof body.welcomeSi === 'string' ? body.welcomeSi : store.siteSettings.welcomeSi,
      updatedAt: new Date().toISOString(),
    };
    addNotification(store, {
      type: 'upload',
      titleEn: 'Home Page Updated',
      titleSi: 'මුල් පිටුව යාවත්කාලීන කරන ලදී',
      bodyEn: `${actorName} updated the family cover photo or welcome message.`,
      bodySi: `${actorName} විසින් මුල් පිටුවේ ඡායාරූපය හෝ පණිවිඩය යාවත්කාලීන කරන ලදී.`,
      linkTab: 'home',
      sourceClientId: clientId,
    });
    saveStore(store);
    return jsonResponse(store.siteSettings);
  }

  // POST /api/likes/toggle
  if (method === 'POST' && pathname === '/api/likes/toggle') {
    const body = await parseJsonBody(init);
    const { targetType, targetId, itemTitle } = body;
    if (!['gallery', 'trip', 'event'].includes(targetType) || !targetId) {
      return jsonResponse({ error: 'Invalid like target' }, 400);
    }
    const idx = store.likes.findIndex(
      (l) => l.targetType === targetType && l.targetId === targetId && l.clientId === clientId
    );
    let likedByMe = false;
    if (idx >= 0) {
      store.likes.splice(idx, 1);
    } else {
      store.likes.push({
        targetType,
        targetId,
        clientId,
        createdAt: new Date().toISOString(),
      });
      likedByMe = true;
      const label =
        typeof itemTitle === 'string' && itemTitle.trim() ? itemTitle.trim() : 'a family memory';
      addNotification(store, {
        type: 'like',
        titleEn: `❤️ New Like on ${label}`,
        titleSi: `❤️ "${label}" සඳහා කැමැත්තක් ලැබුණි`,
        bodyEn: `${actorName} liked "${label}".`,
        bodySi: `${actorName} "${label}" හට කැමැත්ත පළ කළේය.`,
        linkTab: targetType === 'gallery' ? 'moments' : 'features',
        sourceClientId: clientId,
      });
    }
    saveStore(store);
    const likeCount = store.likes.filter(
      (l) => l.targetType === targetType && l.targetId === targetId
    ).length;
    return jsonResponse({ likedByMe, likeCount });
  }

  // GET /api/families
  if (method === 'GET' && pathname === '/api/families') {
    const familiesWithCounts = [...store.families]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        ...f,
        memberCount: store.members.filter((m) => m.familyId === f.id).length,
      }));
    return jsonResponse({ families: familiesWithCounts });
  }

  // GET /api/families/:id
  const familyGetMatch = pathname.match(/^\/api\/families\/([^/]+)$/);
  if (method === 'GET' && familyGetMatch) {
    const familyId = decodeURIComponent(familyGetMatch[1]);
    const family = findFamily(store, familyId);
    if (!family) return jsonResponse({ error: 'Family not found' }, 404);
    const members = store.members.filter((m) => m.familyId === familyId);
    const trips: TripEntry[] = store.trips
      .filter((t) => t.familyId === familyId)
      .sort((a, b) => b.tripDate.localeCompare(a.tripDate))
      .map((t) => ({
        ...t,
        familyNameEn: family.nameEn,
        familyNameSi: family.nameSi,
        ...getLikesInfo(store, 'trip', t.id, clientId),
      }));
    const pictures: GalleryItem[] = store.gallery
      .filter((g) => g.familyId === familyId)
      .sort((a, b) => b.momentDate.localeCompare(a.momentDate))
      .map((g) => ({
        ...g,
        familyNameEn: family.nameEn,
        familyNameSi: family.nameSi,
        ...getLikesInfo(store, 'gallery', g.id, clientId),
      }));
    const events: EventEntry[] = store.events
      .filter((e) => e.familyId === familyId)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
      .map((e) => ({
        ...e,
        familyNameEn: family.nameEn,
        familyNameSi: family.nameSi,
        ...getLikesInfo(store, 'event', e.id, clientId),
      }));
    const birthdays = buildAllBirthdays(store)
      .filter((b) => b.familyId === familyId)
      .sort(
        (a, b) =>
          getDaysUntilBirthday(a.birthDate).days - getDaysUntilBirthday(b.birthDate).days
      );
    return jsonResponse({
      family: { ...family, memberCount: members.length },
      members,
      history: { trips, pictures, events, birthdays },
    });
  }

  // PATCH /api/families/:id
  if (method === 'PATCH' && familyGetMatch) {
    const familyId = decodeURIComponent(familyGetMatch[1]);
    const family = findFamily(store, familyId);
    if (!family) return jsonResponse({ error: 'Family not found' }, 404);
    const body = await parseJsonBody(init);
    if (typeof body.nameEn === 'string' && body.nameEn.trim()) family.nameEn = body.nameEn.trim();
    if (typeof body.nameSi === 'string' && body.nameSi.trim()) family.nameSi = body.nameSi.trim();
    if (typeof body.descriptionEn === 'string') family.descriptionEn = body.descriptionEn;
    if (typeof body.descriptionSi === 'string') family.descriptionSi = body.descriptionSi;
    if (typeof body.coverPhotoUrl === 'string') family.coverPhotoUrl = body.coverPhotoUrl;
    family.updatedAt = new Date().toISOString();
    addNotification(store, {
      type: 'family',
      titleEn: `${family.nameEn} Updated`,
      titleSi: `${family.nameSi} යාවත්කාලීන කරන ලදී`,
      bodyEn: `${actorName} updated ${family.nameEn}'s photo or details.`,
      bodySi: `${actorName} විසින් ${family.nameSi} හි ඡායාරූපය හෝ විස්තර යාවත්කාලීන කරන ලදී.`,
      linkTab: 'families',
      sourceClientId: clientId,
    });
    saveStore(store);
    const memberCount = store.members.filter((m) => m.familyId === familyId).length;
    return jsonResponse({ family: { ...family, memberCount } });
  }

  // POST /api/families/:id/members
  const addMemberMatch = pathname.match(/^\/api\/families\/([^/]+)\/members$/);
  if (method === 'POST' && addMemberMatch) {
    const familyId = decodeURIComponent(addMemberMatch[1]);
    const fam = findFamily(store, familyId);
    if (!fam) return jsonResponse({ error: 'Family not found' }, 404);
    const body = await parseJsonBody(init);
    if (!body.name || !String(body.name).trim()) {
      return jsonResponse({ error: 'Member name is required' }, 400);
    }
    if (!body.relationship || !String(body.relationship).trim()) {
      return jsonResponse({ error: 'Relationship is required' }, 400);
    }
    const now = new Date().toISOString();
    const member: FamilyMember = {
      id: newId(),
      familyId,
      name: String(body.name).trim(),
      relationship: String(body.relationship).trim(),
      birthday: typeof body.birthday === 'string' ? body.birthday.trim() : '',
      photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl.trim() : '',
      description: typeof body.description === 'string' ? body.description.trim() : '',
      createdBy: clientId,
      createdAt: now,
      updatedAt: now,
    };
    store.members.push(member);
    addNotification(store, {
      type: 'member',
      titleEn: `New Member in ${fam.nameEn}`,
      titleSi: `${fam.nameSi} වෙත නව සාමාජිකයෙක්`,
      bodyEn: `${actorName} added ${member.name} (${member.relationship}) to ${fam.nameEn}.`,
      bodySi: `${actorName} විසින් ${member.name} ${fam.nameSi} වෙත එක් කරන ලදී.`,
      linkTab: 'families',
      sourceClientId: clientId,
    });
    ensureBirthdayNotifications(store);
    saveStore(store);
    return jsonResponse({ member }, 201);
  }

  // GET /api/members/search
  if (method === 'GET' && pathname === '/api/members/search') {
    const q = (urlObj.searchParams.get('q') || '').trim().toLowerCase();
    const list = store.members
      .map((m) => {
        const fam = findFamily(store, m.familyId);
        return {
          ...m,
          familyNameEn: fam?.nameEn || '',
          familyNameSi: fam?.nameSi || '',
        };
      })
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.relationship.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.familyNameEn.toLowerCase().includes(q) ||
          m.familyNameSi.toLowerCase().includes(q)
        );
      });
    return jsonResponse({ members: list });
  }

  // PATCH / DELETE /api/members/:memberId
  const memberMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberMatch) {
    const memberId = decodeURIComponent(memberMatch[1]);
    const mIdx = store.members.findIndex((m) => m.id === memberId);
    if (mIdx < 0) return jsonResponse({ error: 'Member not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const existing = store.members[mIdx];
      const updated: FamilyMember = {
        ...existing,
        name:
          typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
        relationship:
          typeof body.relationship === 'string' && body.relationship.trim()
            ? body.relationship.trim()
            : existing.relationship,
        birthday:
          typeof body.birthday === 'string' ? body.birthday.trim() : existing.birthday,
        photoUrl:
          typeof body.photoUrl === 'string' ? body.photoUrl.trim() : existing.photoUrl,
        description:
          typeof body.description === 'string' ? body.description.trim() : existing.description,
        updatedAt: new Date().toISOString(),
      };
      store.members[mIdx] = updated;
      ensureBirthdayNotifications(store);
      saveStore(store);
      return jsonResponse({ member: updated });
    }
    if (method === 'DELETE') {
      store.members.splice(mIdx, 1);
      store.birthdayWishes = store.birthdayWishes.filter((w) => w.targetKey !== `m-${memberId}`);
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // GET / POST /api/birthdays
  if (pathname === '/api/birthdays') {
    if (method === 'GET') {
      ensureBirthdayNotifications(store);
      return jsonResponse({ birthdays: buildAllBirthdays(store) });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      if (!body.memberName || !String(body.memberName).trim()) {
        return jsonResponse({ error: 'Name is required' }, 400);
      }
      if (!body.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.birthDate).trim())) {
        return jsonResponse({ error: 'Valid birth date (YYYY-MM-DD) is required' }, 400);
      }
      const id = newId();
      const validFamilyId =
        typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)
          ? body.familyId
          : null;
      store.birthdays.push({
        id,
        familyId: validFamilyId,
        memberName: String(body.memberName).trim(),
        birthDate: String(body.birthDate).trim(),
        photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl.trim() : '',
        notes: typeof body.notes === 'string' ? body.notes.trim() : '',
        createdBy: clientId,
        createdAt: new Date().toISOString(),
      });
      ensureBirthdayNotifications(store);
      saveStore(store);
      return jsonResponse({ id }, 201);
    }
  }

  // POST /api/birthdays/:targetKey/wishes
  const wishCreateMatch = pathname.match(/^\/api\/birthdays\/([^/]+)\/wishes$/);
  if (method === 'POST' && wishCreateMatch) {
    const targetKey = decodeURIComponent(wishCreateMatch[1]);
    const body = await parseJsonBody(init);
    if (!body.message || !String(body.message).trim()) {
      return jsonResponse({ error: 'Wish message is required' }, 400);
    }
    const cleanAuthor =
      typeof body.authorName === 'string' && body.authorName.trim()
        ? body.authorName.trim()
        : 'Family Member';
    const cleanAvatar = typeof body.authorAvatar === 'string' ? body.authorAvatar.trim() : '';
    const safeAvatars: string[] = Array.isArray(body.authorAvatars)
      ? body.authorAvatars
          .filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
          .slice(0, 6)
      : cleanAvatar
        ? [cleanAvatar]
        : [];
    const wish: BirthdayWish = {
      id: newId(),
      targetKey,
      authorId: clientId,
      authorName: cleanAuthor,
      authorAvatar: cleanAvatar || safeAvatars[0] || '',
      authorAvatars: safeAvatars,
      message: String(body.message).trim(),
      createdAt: new Date().toISOString(),
    };
    store.birthdayWishes.unshift(wish);
    saveStore(store);
    return jsonResponse({ wish }, 201);
  }

  // PATCH / DELETE /api/birthdays/:id
  const bdayMatch = pathname.match(/^\/api\/birthdays\/([^/]+)$/);
  if (bdayMatch) {
    const id = decodeURIComponent(bdayMatch[1]);
    const idx = store.birthdays.findIndex((b) => b.id === id);
    if (idx < 0) return jsonResponse({ error: 'Birthday entry not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const row = store.birthdays[idx];
      if (typeof body.memberName === 'string' && body.memberName.trim()) {
        row.memberName = body.memberName.trim();
      }
      if (typeof body.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate.trim())) {
        row.birthDate = body.birthDate.trim();
      }
      if (body.familyId === null || body.familyId === '') row.familyId = null;
      else if (typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)) {
        row.familyId = body.familyId;
      }
      if (typeof body.photoUrl === 'string') row.photoUrl = body.photoUrl.trim();
      if (typeof body.notes === 'string') row.notes = body.notes.trim();
      ensureBirthdayNotifications(store);
      saveStore(store);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      store.birthdays.splice(idx, 1);
      store.birthdayWishes = store.birthdayWishes.filter((w) => w.targetKey !== `b-${id}`);
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // DELETE /api/birthday-wishes/:id
  const wishDeleteMatch = pathname.match(/^\/api\/birthday-wishes\/([^/]+)$/);
  if (method === 'DELETE' && wishDeleteMatch) {
    const id = decodeURIComponent(wishDeleteMatch[1]);
    const idx = store.birthdayWishes.findIndex((w) => w.id === id);
    if (idx < 0) return jsonResponse({ error: 'Birthday wish not found' }, 404);
    store.birthdayWishes.splice(idx, 1);
    saveStore(store);
    return jsonResponse({ ok: true });
  }

  // GET / POST /api/trips
  if (pathname === '/api/trips') {
    if (method === 'GET') {
      const trips: TripEntry[] = [...store.trips]
        .sort((a, b) => b.tripDate.localeCompare(a.tripDate))
        .map((r) => {
          const fam = findFamily(store, r.familyId);
          return {
            ...r,
            familyNameEn: fam?.nameEn || '',
            familyNameSi: fam?.nameSi || '',
            ...getLikesInfo(store, 'trip', r.id, clientId),
          };
        });
      return jsonResponse({ trips });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      if (!body.title || !body.destination || !body.tripDate) {
        return jsonResponse({ error: 'Title, destination, and date are required' }, 400);
      }
      if (typeof body.familyId !== 'string' || !/^family-[1-8]$/.test(body.familyId)) {
        return jsonResponse({ error: 'Please select a family group' }, 400);
      }
      const id = newId();
      const safeMedia: MediaAsset[] = Array.isArray(body.media) ? body.media : [];
      store.trips.push({
        id,
        familyId: body.familyId,
        title: String(body.title).trim(),
        destination: String(body.destination).trim(),
        tripDate: String(body.tripDate).trim(),
        description: String(body.description || '').trim(),
        media: safeMedia,
        createdBy: clientId,
        createdByName:
          typeof body.authorName === 'string' && body.authorName.trim()
            ? body.authorName.trim()
            : actorName,
        createdAt: new Date().toISOString(),
      });
      saveStore(store);
      return jsonResponse({ id, familyId: body.familyId }, 201);
    }
  }

  // PATCH / DELETE /api/trips/:id
  const tripMatch = pathname.match(/^\/api\/trips\/([^/]+)$/);
  if (tripMatch) {
    const id = decodeURIComponent(tripMatch[1]);
    const idx = store.trips.findIndex((t) => t.id === id);
    if (idx < 0) return jsonResponse({ error: 'Trip not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const row = store.trips[idx];
      if (body.familyId === null || body.familyId === '') row.familyId = null;
      else if (typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)) {
        row.familyId = body.familyId;
      }
      if (typeof body.title === 'string' && body.title.trim()) row.title = body.title.trim();
      if (typeof body.destination === 'string' && body.destination.trim()) {
        row.destination = body.destination.trim();
      }
      if (typeof body.tripDate === 'string' && body.tripDate.trim()) {
        row.tripDate = body.tripDate.trim();
      }
      if (typeof body.description === 'string') row.description = body.description;
      if (Array.isArray(body.media)) row.media = body.media;
      saveStore(store);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      store.trips.splice(idx, 1);
      store.likes = store.likes.filter((l) => !(l.targetType === 'trip' && l.targetId === id));
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // GET / POST /api/events
  if (pathname === '/api/events') {
    if (method === 'GET') {
      const events: EventEntry[] = [...store.events]
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .map((r) => {
          const fam = findFamily(store, r.familyId);
          return {
            ...r,
            familyNameEn: fam?.nameEn || '',
            familyNameSi: fam?.nameSi || '',
            ...getLikesInfo(store, 'event', r.id, clientId),
          };
        });
      return jsonResponse({ events });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      if (!body.title || !body.eventDate) {
        return jsonResponse({ error: 'Event title and date are required' }, 400);
      }
      const id = newId();
      const validFamilyId =
        typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)
          ? body.familyId
          : null;
      store.events.push({
        id,
        familyId: validFamilyId,
        category: body.category || 'celebration',
        title: String(body.title).trim(),
        eventDate: String(body.eventDate).trim(),
        location: String(body.location || '').trim(),
        description: String(body.description || '').trim(),
        media: Array.isArray(body.media) ? body.media : [],
        status: 'approved',
        createdBy: clientId,
        createdByName:
          typeof body.authorName === 'string' && body.authorName.trim()
            ? body.authorName.trim()
            : actorName,
        createdAt: new Date().toISOString(),
      });
      saveStore(store);
      return jsonResponse({ id, status: 'approved' }, 201);
    }
  }

  // PATCH / DELETE /api/events/:id
  const eventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventMatch) {
    const id = decodeURIComponent(eventMatch[1]);
    const idx = store.events.findIndex((e) => e.id === id);
    if (idx < 0) return jsonResponse({ error: 'Event not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const row = store.events[idx];
      if (typeof body.status === 'string') row.status = body.status;
      if (typeof body.title === 'string' && body.title.trim()) row.title = body.title.trim();
      if (typeof body.eventDate === 'string') row.eventDate = body.eventDate;
      if (typeof body.description === 'string') row.description = body.description;
      if (typeof body.location === 'string') row.location = body.location;
      if (typeof body.category === 'string') row.category = body.category;
      if (body.familyId === null || body.familyId === '') row.familyId = null;
      else if (typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)) {
        row.familyId = body.familyId;
      }
      if (Array.isArray(body.media)) row.media = body.media;
      saveStore(store);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      store.events.splice(idx, 1);
      store.likes = store.likes.filter((l) => !(l.targetType === 'event' && l.targetId === id));
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // GET / POST /api/gallery
  if (pathname === '/api/gallery') {
    if (method === 'GET') {
      const items: GalleryItem[] = [...store.gallery]
        .sort(
          (a, b) =>
            b.momentDate.localeCompare(a.momentDate) || b.createdAt.localeCompare(a.createdAt)
        )
        .map((r) => {
          const fam = findFamily(store, r.familyId);
          return {
            ...r,
            familyNameEn: fam?.nameEn || '',
            familyNameSi: fam?.nameSi || '',
            ...getLikesInfo(store, 'gallery', r.id, clientId),
          };
        });
      return jsonResponse({ items });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      if (!body.title || !body.mediaUrl) {
        return jsonResponse({ error: 'Title and media are required' }, 400);
      }
      const id = newId();
      const now = new Date().toISOString();
      const mediaUrl = String(body.mediaUrl).trim();
      const resolvedMediaType: 'image' | 'video' | 'pdf' =
        body.mediaType === 'pdf' ||
        mediaUrl.toLowerCase().endsWith('.pdf') ||
        mediaUrl.startsWith('data:application/pdf')
          ? 'pdf'
          : body.mediaType === 'video' || mediaUrl.startsWith('data:video/')
            ? 'video'
            : 'image';
      const validFamilyId =
        typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)
          ? body.familyId
          : null;
      store.gallery.unshift({
        id,
        familyId: validFamilyId,
        title: String(body.title).trim(),
        caption: String(body.caption || '').trim(),
        location: String(body.location || '').trim(),
        momentDate: String(body.momentDate || now.slice(0, 10)),
        kind:
          body.kind === 'moment' || body.kind === 'timeline' ? body.kind : 'gallery',
        mediaUrl,
        mediaType: resolvedMediaType,
        uploadedBy: clientId,
        uploadedByName:
          typeof body.authorName === 'string' && body.authorName.trim()
            ? body.authorName.trim()
            : actorName,
        createdAt: now,
      });
      saveStore(store);
      return jsonResponse({ id }, 201);
    }
  }

  // PATCH / DELETE /api/gallery/:id
  const galleryMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (galleryMatch) {
    const id = decodeURIComponent(galleryMatch[1]);
    const idx = store.gallery.findIndex((g) => g.id === id);
    if (idx < 0) return jsonResponse({ error: 'Item not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const row = store.gallery[idx];
      if (typeof body.title === 'string' && body.title.trim()) row.title = body.title.trim();
      if (typeof body.caption === 'string') row.caption = body.caption;
      if (typeof body.location === 'string') row.location = body.location.trim();
      if (typeof body.momentDate === 'string' && body.momentDate.trim()) {
        row.momentDate = body.momentDate.trim();
      }
      if (
        typeof body.kind === 'string' &&
        ['gallery', 'moment', 'timeline'].includes(body.kind)
      ) {
        row.kind = body.kind;
      }
      if (typeof body.mediaUrl === 'string' && body.mediaUrl.trim()) {
        row.mediaUrl = body.mediaUrl.trim();
      }
      if (
        body.mediaType === 'pdf' ||
        body.mediaType === 'video' ||
        body.mediaType === 'image'
      ) {
        row.mediaType = body.mediaType;
      }
      if (body.familyId === null || body.familyId === '') row.familyId = null;
      else if (typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)) {
        row.familyId = body.familyId;
      }
      saveStore(store);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      store.gallery.splice(idx, 1);
      store.likes = store.likes.filter(
        (l) => !(l.targetType === 'gallery' && l.targetId === id)
      );
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // GET / POST /api/announcements
  if (pathname === '/api/announcements') {
    if (method === 'GET') {
      const announcements: Announcement[] = [...store.announcements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => {
          const fam = findFamily(store, r.familyId);
          return {
            ...r,
            familyNameEn: fam?.nameEn || '',
            familyNameSi: fam?.nameSi || '',
          };
        });
      return jsonResponse({ announcements });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      if (!body.title || !body.body) {
        return jsonResponse({ error: 'Title and message are required' }, 400);
      }
      const id = newId();
      const validFamilyId =
        typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)
          ? body.familyId
          : null;
      store.announcements.unshift({
        id,
        title: String(body.title).trim(),
        body: String(body.body).trim(),
        priority: body.priority === 'important' ? 'important' : 'normal',
        familyId: validFamilyId,
        authorId: clientId,
        authorName:
          typeof body.authorName === 'string' && body.authorName.trim()
            ? body.authorName.trim()
            : actorName,
        createdAt: new Date().toISOString(),
      });
      saveStore(store);
      return jsonResponse({ id }, 201);
    }
  }

  // PATCH / DELETE /api/announcements/:id
  const annMatch = pathname.match(/^\/api\/announcements\/([^/]+)$/);
  if (annMatch) {
    const id = decodeURIComponent(annMatch[1]);
    const idx = store.announcements.findIndex((a) => a.id === id);
    if (idx < 0) return jsonResponse({ error: 'Announcement not found' }, 404);
    if (method === 'PATCH') {
      const body = await parseJsonBody(init);
      const row = store.announcements[idx];
      if (typeof body.title === 'string' && body.title.trim()) row.title = body.title.trim();
      if (typeof body.body === 'string' && body.body.trim()) row.body = body.body.trim();
      if (body.priority === 'important' || body.priority === 'normal') {
        row.priority = body.priority;
      }
      if (body.familyId === null || body.familyId === '') row.familyId = null;
      else if (typeof body.familyId === 'string' && /^family-[1-8]$/.test(body.familyId)) {
        row.familyId = body.familyId;
      }
      saveStore(store);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      store.announcements.splice(idx, 1);
      saveStore(store);
      return jsonResponse({ ok: true });
    }
  }

  // GET /api/chat/rooms
  if (method === 'GET' && pathname === '/api/chat/rooms') {
    const orderedFamilies = [...store.families].sort((a, b) => a.sortOrder - b.sortOrder);
    const roomIds = ['all', ...orderedFamilies.map((f) => f.id)];
    const rooms = roomIds.map((roomId) => {
      const lastReadAt = store.chatReadState[`${clientId}:${roomId}`] || '1970-01-01T00:00:00.000Z';
      const roomMsgs = store.chatMessages
        .filter((m) => m.roomId === roomId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const unreadCount = roomMsgs.filter(
        (m) => m.createdAt > lastReadAt && m.senderId !== clientId
      ).length;
      const latest = roomMsgs[roomMsgs.length - 1] || null;
      const fam = orderedFamilies.find((f) => f.id === roomId);
      return {
        roomId,
        nameEn: fam ? fam.nameEn : 'All Families Group',
        nameSi: fam ? fam.nameSi : 'සියලුම පවුල් සමූහය',
        coverPhotoUrl: fam ? fam.coverPhotoUrl : '',
        unreadCount,
        lastMessage: latest
          ? {
              id: latest.id,
              senderName: latest.senderName,
              text: latest.text,
              mediaType: latest.mediaType,
              createdAt: latest.createdAt,
            }
          : null,
      };
    });
    return jsonResponse({ rooms });
  }

  // GET / POST /api/chat/messages
  if (pathname === '/api/chat/messages') {
    if (method === 'GET') {
      const roomId = urlObj.searchParams.get('roomId') || 'all';
      const messages = store.chatMessages
        .filter((m) => m.roomId === roomId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(-200);
      store.chatReadState[`${clientId}:${roomId}`] = new Date().toISOString();
      saveStore(store);
      return jsonResponse({ messages });
    }
    if (method === 'POST') {
      const body = await parseJsonBody(init);
      const cleanRoom =
        typeof body.roomId === 'string' &&
        (body.roomId === 'all' || /^family-[1-8]$/.test(body.roomId))
          ? body.roomId
          : 'all';
      const cleanText = typeof body.text === 'string' ? body.text.trim() : '';
      const cleanMedia = typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      if (!cleanText && !cleanMedia) {
        return jsonResponse({ error: 'Message text or media is required' }, 400);
      }
      const cleanSender =
        typeof body.senderName === 'string' && body.senderName.trim()
          ? body.senderName.trim()
          : 'Family Member';
      const cleanAvatar = typeof body.senderAvatar === 'string' ? body.senderAvatar.trim() : '';
      const safeAvatars: string[] = Array.isArray(body.senderAvatars)
        ? body.senderAvatars
            .filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
            .slice(0, 6)
        : cleanAvatar
          ? [cleanAvatar]
          : [];
      const cleanMediaType = cleanMedia
        ? body.mediaType === 'video'
          ? 'video'
          : body.mediaType === 'sticker'
            ? 'sticker'
            : 'image'
        : null;
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        id: newId(),
        roomId: cleanRoom,
        senderId: clientId,
        senderName: cleanSender,
        senderAvatar: cleanAvatar || safeAvatars[0] || '',
        senderAvatars: safeAvatars,
        text: cleanText,
        mediaUrl: cleanMedia,
        mediaType: cleanMediaType,
        createdAt,
      };
      store.chatMessages.push(message);
      store.chatReadState[`${clientId}:${cleanRoom}`] = createdAt;
      saveStore(store);
      return jsonResponse({ message }, 201);
    }
  }

  // DELETE /api/chat/messages/:id
  const chatDeleteMatch = pathname.match(/^\/api\/chat\/messages\/([^/]+)$/);
  if (method === 'DELETE' && chatDeleteMatch) {
    const id = decodeURIComponent(chatDeleteMatch[1]);
    const idx = store.chatMessages.findIndex((m) => m.id === id);
    if (idx < 0) return jsonResponse({ error: 'Message not found' }, 404);
    store.chatMessages.splice(idx, 1);
    saveStore(store);
    return jsonResponse({ ok: true });
  }

  // POST /api/chat/read
  if (method === 'POST' && pathname === '/api/chat/read') {
    const body = await parseJsonBody(init);
    const roomId = String(body.roomId || 'all');
    store.chatReadState[`${clientId}:${roomId}`] = new Date().toISOString();
    saveStore(store);
    return jsonResponse({ ok: true });
  }

  // GET /api/notifications
  if (method === 'GET' && pathname === '/api/notifications') {
    const readIds = new Set(store.notificationReads[clientId] || []);
    return jsonResponse({
      notifications: store.notifications.slice(0, 40).map((n) => ({
        ...n,
        isRead: readIds.has(n.id),
      })),
    });
  }

  // POST /api/notifications/read-all
  if (method === 'POST' && pathname === '/api/notifications/read-all') {
    store.notificationReads[clientId] = store.notifications.map((n) => n.id);
    saveStore(store);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const nativeFetch =
    typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : null;

  const rawUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';

  let urlObj: URL | null = null;
  try {
    urlObj = new URL(rawUrl, origin);
  } catch {
    if (!nativeFetch) throw new Error('Fetch is not available');
    return nativeFetch(input, init);
  }

  const isSameOriginApi =
    urlObj.origin === origin && urlObj.pathname.startsWith('/api/');

  if (!isSameOriginApi) {
    if (!nativeFetch) throw new Error('Fetch is not available');
    return nativeFetch(input, init);
  }

  if (staticHostMode || !nativeFetch) {
    return handleStaticApi(urlObj, init);
  }

  try {
    const res = await nativeFetch(input, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Static hosts (e.g. Netlify/Vercel/GitHub Pages) either return 404/405 for /api/*
    // OR serve index.html (text/html) via SPA fallback rules.
    const isMissingBackend =
      res.status === 404 ||
      res.status === 405 ||
      res.status === 501 ||
      contentType.includes('text/html');

    if (isMissingBackend) {
      staticHostMode = true;
      return handleStaticApi(urlObj, init);
    }

    return res;
  } catch {
    // Offline or unreachable server: serve local seeded store instead of leaving About Families blank
    return handleStaticApi(urlObj, init);
  }
}

export function installStaticApiBridge(): void {
  bridgeInstalled = true;
}
