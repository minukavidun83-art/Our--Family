import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cake,
  Calendar,
  Check,
  Edit3,
  ExternalLink,
  FileText,
  Home as HomeIcon,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Plane,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { RELATIONSHIPS, T, translateRelationship } from '../i18n';
import { apiFetch } from '../utils/staticApiBridge';
import type {
  Announcement,
  BirthdayEntry,
  ChatMessage,
  EventEntry,
  Family,
  FamilyMember,
  GalleryItem,
  Lang,
  LocalProfile,
  MediaAsset,
  SiteSettings,
  TripEntry,
} from '../types';
import { MultiMediaUploader, SinglePhotoUploader } from './MediaUploader';

interface Props {
  lang: Lang;
  siteSettings: SiteSettings;
  families: Family[];
  allMembers: FamilyMember[];
  localProfile: LocalProfile;
  refreshSignal: number;
  onSiteSettingsUpdated: (updated: SiteSettings) => void;
  onFamilyUpdated: (updated: Family) => void;
  onRefreshGlobal: () => void;
  onOpenFamily?: (familyId: string) => void;
}

type AdminSection =
  | 'site'
  | 'families'
  | 'members'
  | 'birthdays'
  | 'events_trips'
  | 'moments'
  | 'notices_chat';

function getDaysUntilBirthday(birthDate: string): number {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 999;
  const [, mStr, dStr] = birthDate.split('-');
  const m = Number(mStr) - 1;
  const d = Number(dStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m, d);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const AdminPanelView: React.FC<Props> = ({
  lang,
  siteSettings,
  families,
  allMembers,
  localProfile,
  refreshSignal,
  onSiteSettingsUpdated,
  onFamilyUpdated,
  onRefreshGlobal,
  onOpenFamily,
}) => {
  const t = T[lang];
  const [section, setSection] = useState<AdminSection>('site');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Site settings draft
  const [heroPhotoUrl, setHeroPhotoUrl] = useState(siteSettings.heroPhotoUrl);
  const [welcomeEn, setWelcomeEn] = useState(siteSettings.welcomeEn);
  const [welcomeSi, setWelcomeSi] = useState(siteSettings.welcomeSi);
  const [savingSite, setSavingSite] = useState(false);

  // Full data collections
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([]);
  const [trips, setTrips] = useState<TripEntry[]>([]);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [chatRoomId, setChatRoomId] = useState('all');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Family edit modal
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [fNameEn, setFNameEn] = useState('');
  const [fNameSi, setFNameSi] = useState('');
  const [fDescEn, setFDescEn] = useState('');
  const [fDescSi, setFDescSi] = useState('');
  const [fCover, setFCover] = useState('');

  // Member add/edit modal
  const [memberFilterFam, setMemberFilterFam] = useState('all');
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [mFamilyId, setMFamilyId] = useState('family-1');
  const [mName, setMName] = useState('');
  const [mRel, setMRel] = useState('Father');
  const [mBirthday, setMBirthday] = useState('');
  const [mPhoto, setMPhoto] = useState('');
  const [mDesc, setMDesc] = useState('');

  // Birthday add/edit modal
  const [bdayModalOpen, setBdayModalOpen] = useState(false);
  const [editingBday, setEditingBday] = useState<BirthdayEntry | null>(null);
  const [bName, setBName] = useState('');
  const [bDate, setBDate] = useState('');
  const [bFamily, setBFamily] = useState('');
  const [bPhoto, setBPhoto] = useState('');
  const [bNotes, setBNotes] = useState('');

  // Trip add/edit modal
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripEntry | null>(null);
  const [trTitle, setTrTitle] = useState('');
  const [trDest, setTrDest] = useState('');
  const [trDate, setTrDate] = useState('');
  const [trFamily, setTrFamily] = useState('family-1');
  const [trDesc, setTrDesc] = useState('');
  const [trMedia, setTrMedia] = useState<MediaAsset[]>([]);

  // Event add/edit modal
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evCategory, setEvCategory] = useState<EventEntry['category']>('celebration');
  const [evDate, setEvDate] = useState('');
  const [evLoc, setEvLoc] = useState('');
  const [evFamily, setEvFamily] = useState('');
  const [evStatus, setEvStatus] = useState<'approved' | 'suggested'>('approved');
  const [evDesc, setEvDesc] = useState('');
  const [evMedia, setEvMedia] = useState<MediaAsset[]>([]);

  // Moments / Gallery / PDF add/edit modal
  const [momentModalOpen, setMomentModalOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<GalleryItem | null>(null);
  const [gTitle, setGTitle] = useState('');
  const [gKind, setGKind] = useState<'moment' | 'gallery' | 'timeline'>('moment');
  const [gDate, setGDate] = useState('');
  const [gLoc, setGLoc] = useState('');
  const [gFamily, setGFamily] = useState('');
  const [gCaption, setGCaption] = useState('');
  const [gUrl, setGUrl] = useState('');
  const [gType, setGType] = useState<'image' | 'video' | 'pdf'>('image');

  // Announcement add/edit modal
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [aTitle, setATitle] = useState('');
  const [aBody, setABody] = useState('');
  const [aPriority, setAPriority] = useState<'normal' | 'important'>('normal');
  const [aFamily, setAFamily] = useState('');

  const [saving, setSaving] = useState(false);

  const authorName =
    localProfile.name.trim() || (lang === 'si' ? 'ප්‍රධාන පරිපාලක' : 'Admin');

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(''), 2800);
  };

  useEffect(() => {
    setHeroPhotoUrl(siteSettings.heroPhotoUrl);
    setWelcomeEn(siteSettings.welcomeEn);
    setWelcomeSi(siteSettings.welcomeSi);
  }, [siteSettings]);

  const loadAllAdminData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bRes, tRes, eRes, gRes, aRes] = await Promise.all([
        apiFetch('/api/birthdays', { cache: 'no-store' }),
        apiFetch('/api/trips', { cache: 'no-store', headers: { 'x-client-id': localProfile.clientId } }),
        apiFetch('/api/events', { cache: 'no-store', headers: { 'x-client-id': localProfile.clientId } }),
        apiFetch('/api/gallery', { cache: 'no-store', headers: { 'x-client-id': localProfile.clientId } }),
        apiFetch('/api/announcements', { cache: 'no-store' }),
      ]);
      if (bRes.ok) setBirthdays((await bRes.json()).birthdays || []);
      if (tRes.ok) setTrips((await tRes.json()).trips || []);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
      if (gRes.ok) setGalleryItems((await gRes.json()).items || []);
      if (aRes.ok) setAnnouncements((await aRes.json()).announcements || []);
    } finally {
      setLoading(false);
    }
  }, [localProfile.clientId]);

  const loadChatRoom = useCallback(async (roomId: string) => {
    const res = await apiFetch(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`, {
      cache: 'no-store',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) {
      setChatMessages((await res.json()).messages || []);
    }
  }, [localProfile.clientId]);

  useEffect(() => {
    loadAllAdminData(refreshSignal > 0);
  }, [loadAllAdminData, refreshSignal]);

  useEffect(() => {
    if (section === 'notices_chat') {
      loadChatRoom(chatRoomId);
    }
  }, [section, chatRoomId, loadChatRoom, refreshSignal]);

  const sortedBirthdays = useMemo(() => {
    return [...birthdays].sort(
      (a, b) => getDaysUntilBirthday(a.birthDate) - getDaysUntilBirthday(b.birthDate)
    );
  }, [birthdays]);

  const upcomingCount = useMemo(
    () => sortedBirthdays.filter((b) => getDaysUntilBirthday(b.birthDate) <= 30).length,
    [sortedBirthdays]
  );

  const filteredMembers = useMemo(() => {
    if (memberFilterFam === 'all') return allMembers;
    return allMembers.filter((m) => m.familyId === memberFilterFam);
  }, [allMembers, memberFilterFam]);

  // === Handlers ===
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSite(true);
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
        flashStatus(lang === 'si' ? 'මුල් පිටුව යාවත්කාලීන කළා!' : 'Home settings saved!');
      }
    } finally {
      setSavingSite(false);
    }
  };

  const openEditFamily = (f: Family) => {
    setEditingFamily(f);
    setFNameEn(f.nameEn);
    setFNameSi(f.nameSi);
    setFDescEn(f.descriptionEn);
    setFDescSi(f.descriptionSi);
    setFCover(f.coverPhotoUrl);
  };

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/families/${editingFamily.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
          'x-author-name': encodeURIComponent(authorName),
        },
        body: JSON.stringify({
          nameEn: fNameEn,
          nameSi: fNameSi,
          descriptionEn: fDescEn,
          descriptionSi: fDescSi,
          coverPhotoUrl: fCover,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onFamilyUpdated(data.family);
        setEditingFamily(null);
        onRefreshGlobal();
        flashStatus(lang === 'si' ? 'පවුලේ විස්තර සුරකින ලදී!' : 'Family updated!');
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMFamilyId(memberFilterFam === 'all' ? 'family-1' : memberFilterFam);
    setMName('');
    setMRel('Father');
    setMBirthday('');
    setMPhoto('');
    setMDesc('');
    setMemberModalOpen(true);
  };

  const openEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setMFamilyId(m.familyId);
    setMName(m.name);
    setMRel(m.relationship);
    setMBirthday(m.birthday);
    setMPhoto(m.photoUrl);
    setMDesc(m.description);
    setMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : `/api/families/${mFamilyId}/members`;
      const method = editingMember ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
          'x-author-name': encodeURIComponent(authorName),
        },
        body: JSON.stringify({
          name: mName,
          relationship: mRel,
          birthday: mBirthday,
          photoUrl: mPhoto,
          description: mDesc,
        }),
      });
      if (res.ok) {
        setMemberModalOpen(false);
        onRefreshGlobal();
        await loadAllAdminData(true);
        flashStatus(lang === 'si' ? 'සාමාජික තොරතුරු සුරකින ලදී!' : 'Member saved!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    const res = await apiFetch(`/api/members/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) {
      onRefreshGlobal();
      await loadAllAdminData(true);
    }
  };

  const openAddBday = () => {
    setEditingBday(null);
    setBName('');
    setBDate('');
    setBFamily('');
    setBPhoto('');
    setBNotes('');
    setBdayModalOpen(true);
  };

  const openEditBday = (b: BirthdayEntry) => {
    setEditingBday(b);
    setBName(b.memberName);
    setBDate(b.birthDate);
    setBFamily(b.familyId || '');
    setBPhoto(b.photoUrl);
    setBNotes(b.notes);
    setBdayModalOpen(true);
  };

  const handleSaveBday = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBday && editingBday.source === 'member') {
        const res = await apiFetch(`/api/members/${editingBday.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': localProfile.clientId,
            'x-author-name': encodeURIComponent(authorName),
          },
          body: JSON.stringify({
            name: bName,
            birthday: bDate,
            photoUrl: bPhoto,
            relationship: bNotes || 'Family Member',
          }),
        });
        if (res.ok) {
          setBdayModalOpen(false);
          onRefreshGlobal();
          await loadAllAdminData(true);
          flashStatus(lang === 'si' ? 'උපන්දිනය යාවත්කාලීන කළා!' : 'Birthday updated!');
        }
      } else {
        const url = editingBday ? `/api/birthdays/${editingBday.id}` : '/api/birthdays';
        const method = editingBday ? 'PATCH' : 'POST';
        const res = await apiFetch(url, {
          method,
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
          setBdayModalOpen(false);
          onRefreshGlobal();
          await loadAllAdminData(true);
          flashStatus(lang === 'si' ? 'උපන්දිනය සුරකින ලදී!' : 'Birthday saved!');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBday = async (b: BirthdayEntry) => {
    if (b.source === 'member') {
      const res = await apiFetch(`/api/members/${b.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({ birthday: '' }),
      });
      if (res.ok) {
        onRefreshGlobal();
        await loadAllAdminData(true);
      }
    } else {
      const res = await apiFetch(`/api/birthdays/${b.id}`, {
        method: 'DELETE',
        headers: { 'x-client-id': localProfile.clientId },
      });
      if (res.ok) {
        onRefreshGlobal();
        await loadAllAdminData(true);
      }
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    const res = await apiFetch(`/api/birthday-wishes/${wishId}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) {
      onRefreshGlobal();
      await loadAllAdminData(true);
    }
  };

  const openAddTrip = () => {
    setEditingTrip(null);
    setTrTitle('');
    setTrDest('');
    setTrDate(new Date().toISOString().slice(0, 10));
    setTrFamily('family-1');
    setTrDesc('');
    setTrMedia([]);
    setTripModalOpen(true);
  };

  const openEditTrip = (tr: TripEntry) => {
    setEditingTrip(tr);
    setTrTitle(tr.title);
    setTrDest(tr.destination);
    setTrDate(tr.tripDate);
    setTrFamily(tr.familyId || 'family-1');
    setTrDesc(tr.description);
    setTrMedia(tr.media || []);
    setTripModalOpen(true);
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingTrip ? `/api/trips/${editingTrip.id}` : '/api/trips';
      const method = editingTrip ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: trTitle,
          destination: trDest,
          tripDate: trDate,
          familyId: trFamily,
          description: trDesc,
          media: trMedia,
          authorName,
        }),
      });
      if (res.ok) {
        setTripModalOpen(false);
        await loadAllAdminData(true);
        flashStatus(lang === 'si' ? 'සංචාර තොරතුරු සුරකින ලදී!' : 'Trip saved!');
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
    if (res.ok) await loadAllAdminData(true);
  };

  const openAddEvent = () => {
    setEditingEvent(null);
    setEvTitle('');
    setEvCategory('celebration');
    setEvDate(new Date().toISOString().slice(0, 10));
    setEvLoc('');
    setEvFamily('');
    setEvStatus('approved');
    setEvDesc('');
    setEvMedia([]);
    setEventModalOpen(true);
  };

  const openEditEvent = (ev: EventEntry) => {
    setEditingEvent(ev);
    setEvTitle(ev.title);
    setEvCategory(ev.category);
    setEvDate(ev.eventDate);
    setEvLoc(ev.location);
    setEvFamily(ev.familyId || '');
    setEvStatus(ev.status);
    setEvDesc(ev.description);
    setEvMedia(ev.media || []);
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: evTitle,
          category: evCategory,
          eventDate: evDate,
          location: evLoc,
          familyId: evFamily || null,
          status: evStatus,
          description: evDesc,
          media: evMedia,
          authorName,
        }),
      });
      if (res.ok) {
        setEventModalOpen(false);
        await loadAllAdminData(true);
        flashStatus(lang === 'si' ? 'උත්සව තොරතුරු සුරකින ලදී!' : 'Event saved!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await apiFetch(`/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAllAdminData(true);
  };

  const openAddMoment = () => {
    setEditingMoment(null);
    setGTitle('');
    setGKind('moment');
    setGDate(new Date().toISOString().slice(0, 10));
    setGLoc('');
    setGFamily('');
    setGCaption('');
    setGUrl('');
    setGType('image');
    setMomentModalOpen(true);
  };

  const openEditMoment = (item: GalleryItem) => {
    setEditingMoment(item);
    setGTitle(item.title);
    setGKind(item.kind);
    setGDate(item.momentDate);
    setGLoc(item.location);
    setGFamily(item.familyId || '');
    setGCaption(item.caption);
    setGUrl(item.mediaUrl);
    setGType(item.mediaType);
    setMomentModalOpen(true);
  };

  const handleSaveMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gUrl) return;
    setSaving(true);
    try {
      const url = editingMoment ? `/api/gallery/${editingMoment.id}` : '/api/gallery';
      const method = editingMoment ? 'PATCH' : 'POST';
      const resolvedType =
        gType === 'pdf' || /\.pdf($|\?)/i.test(gUrl)
          ? 'pdf'
          : /\.(mp4|webm|mov|ogg)($|\?)/i.test(gUrl)
            ? 'video'
            : gType;
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: gTitle,
          kind: gKind,
          momentDate: gDate,
          location: gLoc,
          familyId: gFamily || null,
          caption: gCaption,
          mediaUrl: gUrl,
          mediaType: resolvedType,
          authorName,
        }),
      });
      if (res.ok) {
        setMomentModalOpen(false);
        await loadAllAdminData(true);
        flashStatus(lang === 'si' ? 'මතක / ගැලරි අයිතමය සුරකින ලදී!' : 'Moment / Media saved!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMoment = async (id: string) => {
    const res = await apiFetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAllAdminData(true);
  };

  const openAddAnn = () => {
    setEditingAnn(null);
    setATitle('');
    setABody('');
    setAPriority('normal');
    setAFamily('');
    setAnnModalOpen(true);
  };

  const openEditAnn = (a: Announcement) => {
    setEditingAnn(a);
    setATitle(a.title);
    setABody(a.body);
    setAPriority(a.priority);
    setAFamily(a.familyId || '');
    setAnnModalOpen(true);
  };

  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingAnn ? `/api/announcements/${editingAnn.id}` : '/api/announcements';
      const method = editingAnn ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          title: aTitle,
          body: aBody,
          priority: aPriority,
          familyId: aFamily || null,
          authorName,
        }),
      });
      if (res.ok) {
        setAnnModalOpen(false);
        await loadAllAdminData(true);
        flashStatus(lang === 'si' ? 'නිවේදනය සුරකින ලදී!' : 'Announcement saved!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnn = async (id: string) => {
    const res = await apiFetch(`/api/announcements/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadAllAdminData(true);
  };

  const handleDeleteChatMessage = async (id: string) => {
    const res = await apiFetch(`/api/chat/messages/${id}`, {
      method: 'DELETE',
      headers: { 'x-client-id': localProfile.clientId },
    });
    if (res.ok) await loadChatRoom(chatRoomId);
  };

  const sectionTabs: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'site', label: lang === 'si' ? 'මුල් පිටුව' : 'Home & Banner', icon: HomeIcon },
    { id: 'families', label: lang === 'si' ? 'පවුල් 8' : '8 Families', icon: Users },
    { id: 'members', label: lang === 'si' ? 'සාමාජිකයන්' : 'Members', icon: User },
    { id: 'birthdays', label: lang === 'si' ? `උපන්දින (${upcomingCount})` : `Birthdays (${upcomingCount})`, icon: Cake },
    { id: 'events_trips', label: lang === 'si' ? 'උත්සව සහ සංචාර' : 'Events & Trips', icon: PartyPopper },
    { id: 'moments', label: lang === 'si' ? 'මතක / PDF / ඡායාරූප' : 'Moments & PDFs', icon: Sparkles },
    { id: 'notices_chat', label: lang === 'si' ? 'නිවේදන සහ කතාබහ' : 'Notices & Chat', icon: Megaphone },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-16 space-y-8">
      {/* Admin Header */}
      <div className="rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50 via-white to-amber-50/40 dark:from-rose-950/30 dark:via-stone-900 dark:to-stone-900 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.adminTitle}</span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-50">
            {t.adminTitle}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            {t.adminSub}
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-2.5 shrink-0">
          {[
            [lang === 'si' ? 'පවුල්' : 'Families', families.length],
            [lang === 'si' ? 'සාමාජික' : 'Members', allMembers.length],
            [lang === 'si' ? 'ඉදිරි උපන්දින' : 'Next 30d', upcomingCount],
            [lang === 'si' ? 'උත්සව' : 'Events', events.length],
            [lang === 'si' ? 'සංචාර' : 'Trips', trips.length],
            [lang === 'si' ? 'මතක/PDF' : 'Moments', galleryItems.length],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-center"
            >
              <p className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">{val}</p>
              <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Section Navigation */}
      <div
        data-swipe-ignore="true"
        className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800 max-w-full overflow-x-auto scrollbar-hide"
      >
        {sectionTabs.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'text-stone-900 dark:text-white'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-section-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-white dark:bg-stone-900 shadow-xs"
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10 text-rose-700 dark:text-rose-400" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t.loading}</span>
        </div>
      ) : (
        <>
          {/* SECTION 1: SITE SETTINGS */}
          {section === 'site' && (
            <form
              onSubmit={handleSaveSite}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
                  {t.heroEditBtn}
                </h2>
                <button
                  type="submit"
                  disabled={savingSite}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-semibold"
                >
                  {savingSite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{t.save}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                    {heroPhotoUrl ? (
                      <img src={heroPhotoUrl} alt="Hero" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <SinglePhotoUploader lang={lang} value={heroPhotoUrl} onChange={(url) => setHeroPhotoUrl(url)} />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Welcome Message (English)
                    </label>
                    <textarea
                      rows={3}
                      value={welcomeEn}
                      onChange={(e) => setWelcomeEn(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      පිළිගැනීමේ පණිවිඩය (සිංහල)
                    </label>
                    <textarea
                      rows={3}
                      value={welcomeSi}
                      onChange={(e) => setWelcomeSi(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* SECTION 2: 8 FAMILIES */}
          {section === 'families' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {families.map((fam) => (
                <div
                  key={fam.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col justify-between"
                >
                  <div className="aspect-4/3 bg-stone-100 dark:bg-stone-800">
                    {fam.coverPhotoUrl ? (
                      <img src={fam.coverPhotoUrl} alt={fam.nameEn} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 font-display text-2xl font-bold">
                        0{fam.sortOrder}
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                        0{fam.sortOrder} · {fam.memberCount || 0} {t.membersCount}
                      </p>
                      <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                        {lang === 'si' ? fam.nameSi : fam.nameEn}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                        {lang === 'si' ? fam.descriptionSi || fam.descriptionEn : fam.descriptionEn || fam.descriptionSi}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => openEditFamily(fam)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3 py-2 text-xs font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t.edit}</span>
                      </button>
                      {onOpenFamily && (
                        <button
                          type="button"
                          onClick={() => onOpenFamily(fam.id)}
                          className="rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-medium"
                        >
                          {t.viewFamily}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 3: MEMBERS */}
          {section === 'members' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                  value={memberFilterFam}
                  onChange={(e) => setMemberFilterFam(e.target.value)}
                  className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs font-medium"
                >
                  <option value="all">{t.allFamiliesRoom}</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {lang === 'si' ? f.nameSi : f.nameEn}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openAddMember}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addMember}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 flex items-center justify-center">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{m.name}</p>
                        <p className="text-xs text-rose-700 dark:text-rose-400 truncate">
                          {translateRelationship(m.relationship, lang)} · {lang === 'si' ? m.familyNameSi : m.familyNameEn}
                        </p>
                        {m.birthday && (
                          <p className="text-[11px] text-stone-500 tabular-nums">{m.birthday}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditMember(m)}
                        className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                        aria-label={t.edit}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m.id)}
                        className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                        aria-label={t.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: BIRTHDAYS & UPCOMING 30 DAYS */}
          {section === 'birthdays' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
                    🎂 {t.upcomingBirthdays} ({sortedBirthdays.length})
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t.upcoming1MonthSub}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddBday}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addBirthday}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedBirthdays.map((b) => {
                  const days = getDaysUntilBirthday(b.birthDate);
                  return (
                    <div
                      key={b.targetKey}
                      className={`rounded-2xl border bg-white dark:bg-stone-900 p-4 space-y-3 ${
                        days <= 30
                          ? 'border-amber-300 dark:border-amber-800'
                          : 'border-stone-200 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 flex items-center justify-center">
                            {b.photoUrl ? (
                              <img src={b.photoUrl} alt={b.memberName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <Cake className="w-5 h-5 text-rose-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                              {b.memberName}
                            </p>
                            <p className="text-xs text-stone-500 tabular-nums">
                              {b.birthDate} · {lang === 'si' ? b.familyNameSi : b.familyNameEn}
                            </p>
                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                              {days === 0 ? t.todayLabel : `${days} ${t.daysAway}`}
                              {days <= 30 && (
                                <span className="ml-2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[10px]">
                                  Next 30d
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditBday(b)}
                            className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                            aria-label={t.edit}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBday(b)}
                            className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                            aria-label={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {b.wishes.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                          {b.wishes.map((w) => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 px-2.5 py-1.5 text-xs"
                            >
                              <p className="truncate">
                                <span className="font-semibold">{w.authorName}:</span> {w.message}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleDeleteWish(w.id)}
                                className="text-stone-400 hover:text-rose-600 shrink-0"
                                aria-label={t.delete}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: EVENTS & TRIPS */}
          {section === 'events_trips' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2">
                    <PartyPopper className="w-5 h-5 text-rose-700" />
                    <span>{t.eventsBtn} ({events.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={openAddEvent}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addEvent}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                          {ev.eventDate} · {ev.category}
                          {ev.location ? ` · ${ev.location}` : ''}
                        </p>
                        <h3 className="font-display text-base font-bold truncate">{ev.title}</h3>
                        {ev.description && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditEvent(ev)}
                          className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                          aria-label={t.edit}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                          aria-label={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold flex items-center gap-2">
                    <Plane className="w-5 h-5 text-rose-700" />
                    <span>{t.tripsBtn} ({trips.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={openAddTrip}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addTrip}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trips.map((tr) => (
                    <div
                      key={tr.id}
                      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                          {tr.tripDate} · {tr.destination}
                        </p>
                        <h3 className="font-display text-base font-bold truncate">{tr.title}</h3>
                        {tr.description && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2">{tr.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditTrip(tr)}
                          className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                          aria-label={t.edit}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(tr.id)}
                          className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                          aria-label={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: MOMENTS, GALLERY & PDF UPLOADS */}
          {section === 'moments' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
                    {t.galleryTitle} ({galleryItems.length})
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {lang === 'si'
                      ? 'ඡායාරූප, වීඩියෝ හෝ PDF ලේඛන කෙලින්ම Moments / Gallery වෙත උඩුගත කර සංස්කරණය කරන්න.'
                      : 'Upload Pictures, Videos, or PDFs directly to Moments, Timeline, or Gallery and manage them here.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddMoment}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.uploadMediaPdf}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-4/3 bg-stone-100 dark:bg-stone-800 relative">
                      {item.mediaType === 'video' ? (
                        <video src={item.mediaUrl} className="w-full h-full object-cover" />
                      ) : item.mediaType === 'pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
                          <FileText className="w-10 h-10 mb-1.5" />
                          <span className="text-xs font-bold uppercase">{t.pdfDocumentLabel}</span>
                        </div>
                      ) : (
                        <img src={item.mediaUrl} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-2 left-2 rounded-lg bg-black/70 text-white px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {item.kind} · {item.mediaType}
                      </span>
                    </div>
                    <div className="p-4 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{item.title}</p>
                        <p className="text-xs text-stone-500 tabular-nums">
                          {item.momentDate}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.mediaType === 'pdf' && (
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                            title={t.openPdfBtn}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditMoment(item)}
                          className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                          aria-label={t.edit}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMoment(item.id)}
                          className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                          aria-label={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 7: ANNOUNCEMENTS & CHAT */}
          {section === 'notices_chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-rose-700" />
                    <span>{t.tabAnnouncements} ({announcements.length})</span>
                  </h2>
                  <button
                    type="button"
                    onClick={openAddAnn}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-2 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.postAnnouncement}</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                          {a.priority === 'important' ? t.importantNotice : t.normalNotice} · {a.createdAt.slice(0, 10)}
                        </p>
                        <p className="text-sm font-bold">{a.title}</p>
                        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mt-0.5">{a.body}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditAnn(a)}
                          className="p-2 rounded-lg text-stone-500 hover:text-rose-700"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnn(a.id)}
                          className="p-2 rounded-lg text-stone-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-rose-700" />
                    <span>{t.familyChatTitle}</span>
                  </h2>
                  <select
                    value={chatRoomId}
                    onChange={(e) => setChatRoomId(e.target.value)}
                    className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium"
                  >
                    <option value="all">{t.allFamiliesRoom}</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {lang === 'si' ? f.nameSi : f.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 max-h-96 overflow-y-auto space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-stone-500 text-center py-6">{t.noMessagesYet}</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {msg.senderName}:{' '}
                          </span>
                          <span className="text-stone-600 dark:text-stone-300">
                            {msg.text || (msg.mediaType ? `[${msg.mediaType}]` : '')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteChatMessage(msg.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 shrink-0"
                          aria-label={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* === MODALS === */}
      {/* Edit Family Modal */}
      <AnimatePresence>
        {editingFamily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{t.editFamily}</h3>
                <button type="button" onClick={() => setEditingFamily(null)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveFamily} className="space-y-3">
                <SinglePhotoUploader lang={lang} value={fCover} onChange={(url) => setFCover(url)} />
                <input type="text" required value={fNameEn} onChange={(e) => setFNameEn(e.target.value)} placeholder={t.familyNameEn} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <input type="text" required value={fNameSi} onChange={(e) => setFNameSi(e.target.value)} placeholder={t.familyNameSi} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <textarea rows={2} value={fDescEn} onChange={(e) => setFDescEn(e.target.value)} placeholder={t.familyDescEn} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <textarea rows={2} value={fDescSi} onChange={(e) => setFDescSi(e.target.value)} placeholder={t.familyDescSi} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingFamily(null)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Modal */}
      <AnimatePresence>
        {memberModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingMember ? t.editMember : t.addMember}</h3>
                <button type="button" onClick={() => setMemberModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveMember} className="space-y-3">
                <SinglePhotoUploader lang={lang} value={mPhoto} onChange={(url) => setMPhoto(url)} />
                {!editingMember && (
                  <select value={mFamilyId} onChange={(e) => setMFamilyId(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                    ))}
                  </select>
                )}
                <input type="text" required value={mName} onChange={(e) => setMName(e.target.value)} placeholder={t.memberName} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={mRel} onChange={(e) => setMRel(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    {RELATIONSHIPS.map((r) => (
                      <option key={r.value} value={r.value}>{lang === 'si' ? r.si : r.en}</option>
                    ))}
                  </select>
                  <input type="date" value={mBirthday} onChange={(e) => setMBirthday(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                </div>
                <textarea rows={2} value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder={t.personalDesc} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setMemberModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Birthday Modal */}
      <AnimatePresence>
        {bdayModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingBday ? t.edit : t.addBirthday}</h3>
                <button type="button" onClick={() => setBdayModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveBday} className="space-y-3">
                <SinglePhotoUploader lang={lang} value={bPhoto} onChange={(url) => setBPhoto(url)} />
                <input type="text" required value={bName} onChange={(e) => setBName(e.target.value)} placeholder={t.memberName} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <input type="date" required value={bDate} onChange={(e) => setBDate(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                {(!editingBday || editingBday.source === 'birthday') && (
                  <select value={bFamily} onChange={(e) => setBFamily(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="">{t.noFamilySelected}</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                    ))}
                  </select>
                )}
                <input type="text" value={bNotes} onChange={(e) => setBNotes(e.target.value)} placeholder={t.personalDesc} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setBdayModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip Modal */}
      <AnimatePresence>
        {tripModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingTrip ? t.edit : t.addTrip}</h3>
                <button type="button" onClick={() => setTripModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveTrip} className="space-y-3">
                <input type="text" required value={trTitle} onChange={(e) => setTrTitle(e.target.value)} placeholder={t.tripName} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required value={trDest} onChange={(e) => setTrDest(e.target.value)} placeholder={t.destination} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                  <input type="date" required value={trDate} onChange={(e) => setTrDate(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                </div>
                <select value={trFamily} onChange={(e) => setTrFamily(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                  ))}
                </select>
                <textarea rows={2} value={trDesc} onChange={(e) => setTrDesc(e.target.value)} placeholder={t.tripDesc} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <MultiMediaUploader lang={lang} items={trMedia} onChange={setTrMedia} />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setTripModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
        {eventModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingEvent ? t.edit : t.addEvent}</h3>
                <button type="button" onClick={() => setEventModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEvent} className="space-y-3">
                <input type="text" required value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder={t.eventTitle} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={evCategory} onChange={(e) => setEvCategory(e.target.value as any)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="wedding">{t.catWedding}</option>
                    <option value="party">{t.catParty}</option>
                    <option value="celebration">{t.catCelebration}</option>
                    <option value="religious">{t.catReligious}</option>
                    <option value="other">{t.catOther}</option>
                  </select>
                  <input type="date" required value={evDate} onChange={(e) => setEvDate(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={evLoc} onChange={(e) => setEvLoc(e.target.value)} placeholder={t.eventLocation} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                  <select value={evStatus} onChange={(e) => setEvStatus(e.target.value as any)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="approved">{t.statusApproved}</option>
                    <option value="suggested">{t.statusPending}</option>
                  </select>
                </div>
                <select value={evFamily} onChange={(e) => setEvFamily(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                  <option value="">{t.allFamiliesRoom}</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                  ))}
                </select>
                <textarea rows={2} value={evDesc} onChange={(e) => setEvDesc(e.target.value)} placeholder={t.eventDesc} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <MultiMediaUploader lang={lang} items={evMedia} onChange={setEvMedia} />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEventModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moments / Gallery / PDF Modal */}
      <AnimatePresence>
        {momentModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingMoment ? t.edit : t.uploadMediaPdf}</h3>
                <button type="button" onClick={() => setMomentModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveMoment} className="space-y-3">
                {gUrl && (
                  <div className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {gType === 'video' ? (
                      <video src={gUrl} controls className="w-full h-full object-cover" />
                    ) : gType === 'pdf' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700">
                        <FileText className="w-10 h-10 mb-1" />
                        <span className="text-xs font-bold">{t.pdfDocumentLabel}</span>
                      </div>
                    ) : (
                      <img src={gUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}
                <SinglePhotoUploader
                  lang={lang}
                  value={gUrl}
                  accept="image/*,video/*,.pdf,application/pdf"
                  label={t.uploadMediaPdf}
                  onChange={(url, detectedType) => {
                    setGUrl(url);
                    if (detectedType) setGType(detectedType);
                    else if (/\.pdf($|\?)/i.test(url)) setGType('pdf');
                    else if (/\.(mp4|webm|mov|ogg)($|\?)/i.test(url)) setGType('video');
                    else setGType('image');
                  }}
                />
                <input type="text" required value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder={t.eventTitle} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                  <select value={gKind} onChange={(e) => setGKind(e.target.value as any)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="moment">{t.tabMoments}</option>
                    <option value="gallery">{t.tabGallery}</option>
                    <option value="timeline">{t.tabTimeline}</option>
                  </select>
                </div>
                <input type="text" value={gLoc} onChange={(e) => setGLoc(e.target.value)} placeholder={t.photoLocationPlaceholder} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <select value={gFamily} onChange={(e) => setGFamily(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                  <option value="">{t.allFamiliesRoom}</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                  ))}
                </select>
                <textarea rows={2} value={gCaption} onChange={(e) => setGCaption(e.target.value)} placeholder={t.personalDesc} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setMomentModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving || !gUrl} className="px-5 py-2 rounded-xl bg-rose-700 disabled:opacity-50 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Modal */}
      <AnimatePresence>
        {annModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{editingAnn ? t.edit : t.postAnnouncement}</h3>
                <button type="button" onClick={() => setAnnModalOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveAnn} className="space-y-3">
                <input type="text" required value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder={t.announcementTitle} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={aPriority} onChange={(e) => setAPriority(e.target.value as any)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="normal">{t.normalNotice}</option>
                    <option value="important">{t.importantNotice}</option>
                  </select>
                  <select value={aFamily} onChange={(e) => setAFamily(e.target.value)} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm">
                    <option value="">{t.allFamiliesRoom}</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>{lang === 'si' ? f.nameSi : f.nameEn}</option>
                    ))}
                  </select>
                </div>
                <textarea rows={4} required value={aBody} onChange={(e) => setABody(e.target.value)} placeholder={t.announcementBody} className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setAnnModalOpen(false)} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium">{t.cancel}</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-rose-700 text-white text-xs font-medium">{t.save}</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
