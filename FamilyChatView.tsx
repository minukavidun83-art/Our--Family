import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  MessageCircle,
  Send,
  Smile,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { T } from '../i18n';
import type { ChatMessage, ChatRoom, Family, FamilyMember, Lang, LocalProfile } from '../types';
import { ChatEmojiStickerPicker, StickerArtwork } from './ChatEmojiStickerPicker';
import { AvatarStack, MemberSenderModal, resolveSelectedSenders } from './MemberSenderPicker';
import { apiFetch } from '../utils/staticApiBridge';

interface Props {
  lang: Lang;
  families: Family[];
  allMembers: FamilyMember[];
  localProfile: LocalProfile;
  onOpenProfileModal: () => void;
  incomingMessage: ChatMessage | null;
  typingUser: { roomId: string; userName: string } | null;
  onSendTyping: (roomId: string, userName?: string) => void;
  onUnreadCountChange: (total: number) => void;
  refreshSignal: number;
}

export const FamilyChatView: React.FC<Props> = ({
  lang,
  families,
  allMembers,
  localProfile,
  onOpenProfileModal,
  incomingMessage,
  typingUser,
  onSendTyping,
  onUnreadCountChange,
  refreshSignal,
}) => {
  const t = T[lang];
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState('all');
  const [mobileShowChat, setMobileShowChat] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [selectedSenderIds, setSelectedSenderIds] = useState<string[]>([]);
  const [senderModalOpen, setSenderModalOpen] = useState(false);

  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const activeSender = resolveSelectedSenders(
    selectedSenderIds,
    allMembers,
    localProfile,
    lang
  );
  const roomMembers = activeRoomId.startsWith('family-')
    ? allMembers.filter((m) => m.familyId === activeRoomId)
    : allMembers;
  const quickMembers = (roomMembers.length > 0 ? roomMembers : allMembers).slice(0, 6);

  const loadRooms = async () => {
    try {
      const res = await apiFetch('/api/chat/rooms', {
        cache: 'no-store',
        headers: { 'x-client-id': localProfile.clientId },
      });
      if (res.ok) {
        const data = await res.json();
        const loaded: ChatRoom[] = data.rooms || [];
        setRooms(loaded);
        onUnreadCountChange(loaded.reduce((acc, r) => acc + r.unreadCount, 0));
      }
    } catch {
      // ignore offline mode
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await apiFetch(`/api/chat/messages?roomId=${encodeURIComponent(roomId)}`, {
        cache: 'no-store',
        headers: { 'x-client-id': localProfile.clientId },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setRooms((prev) => {
          const next = prev.map((r) => (r.roomId === roomId ? { ...r, unreadCount: 0 } : r));
          onUnreadCountChange(next.reduce((acc, r) => acc + r.unreadCount, 0));
          return next;
        });
      }
    } catch {
      // ignore offline mode
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [refreshSignal]);

  useEffect(() => {
    loadMessages(activeRoomId);
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, mobileShowChat, pickerOpen]);

  useEffect(() => {
    if (!incomingMessage) return;
    if (incomingMessage.roomId === activeRoomId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
      apiFetch('/api/chat/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({ roomId: activeRoomId }),
      });
    } else {
      loadRooms();
    }
  }, [incomingMessage]);

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setChatError('');
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'media');
      const res = await apiFetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      setMediaUrl(data.url);
      setMediaType(data.type);
    } catch (err: any) {
      setChatError(err?.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const input = textInputRef.current;
    if (input && typeof input.selectionStart === 'number') {
      const start = input.selectionStart;
      const end = input.selectionEnd ?? start;
      const next = text.slice(0, start) + emoji + text.slice(end);
      setText(next);
      window.requestAnimationFrame(() => {
        input.focus();
        const pos = start + emoji.length;
        input.setSelectionRange(pos, pos);
      });
    } else {
      setText((prev) => prev + emoji);
    }
    onSendTyping(activeRoomId, activeSender.name);
  };

  const handleSendSticker = async (stickerId: string) => {
    if (sending) return;
    setChatError('');
    setSending(true);
    try {
      const res = await apiFetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          roomId: activeRoomId,
          text: '',
          mediaUrl: `sticker:${stickerId}`,
          mediaType: 'sticker',
          senderName: activeSender.name,
          senderAvatar: activeSender.avatar,
          senderAvatars: activeSender.avatars,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send sticker');
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setPickerOpen(false);
    } catch (err: any) {
      setChatError(err?.message || 'Failed to send sticker');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) return;
    setChatError('');
    setSending(true);
    try {
      const res = await apiFetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': localProfile.clientId,
        },
        body: JSON.stringify({
          roomId: activeRoomId,
          text: text.trim(),
          mediaUrl,
          mediaType,
          senderName: activeSender.name,
          senderAvatar: activeSender.avatar,
          senderAvatars: activeSender.avatars,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setText('');
      setMediaUrl('');
      setMediaType(null);
      setPickerOpen(false);
    } catch (err: any) {
      setChatError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const activeRoom = rooms.find((r) => r.roomId === activeRoomId);

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobileShowChat(true);
    setPickerOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2.5 sm:py-6 pb-20 lg:pb-10">
      <div
        data-swipe-ignore="true"
        className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden flex flex-col md:grid md:grid-cols-12 md:grid-rows-[minmax(0,1fr)] h-[calc(100dvh-13.5rem)] min-h-[430px] max-h-[760px] md:h-[74vh] md:min-h-[580px]"
      >
        {/* Left Sidebar: Chat Rooms */}
        <aside
          className={`${
            mobileShowChat ? 'hidden md:flex' : 'flex flex-1 min-h-0'
          } md:col-span-4 lg:col-span-3 border-b md:border-b-0 md:border-r border-stone-200 dark:border-stone-800 flex-col overflow-y-auto md:h-full`}
        >
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h1 className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <span>{t.familyChatTitle}</span>
            </h1>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="md:hidden inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-stone-200"
            >
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[90px] truncate">{localProfile.name || t.myNameBtn}</span>
            </button>
          </div>

          {loadingRooms ? (
            <div className="p-4 text-xs text-stone-500">{t.loading}</div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 flex-1 overflow-y-auto">
              {rooms.map((room) => {
                const active = room.roomId === activeRoomId;
                const roomName = lang === 'si' ? room.nameSi : room.nameEn;
                return (
                  <motion.button
                    key={room.roomId}
                    type="button"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => selectRoom(room.roomId)}
                    className={`w-full text-left px-4 py-3.5 md:py-3 flex items-center gap-3 transition-colors ${
                      active
                        ? 'bg-rose-50 dark:bg-rose-950/30'
                        : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="w-11 h-11 md:w-10 md:h-10 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 flex items-center justify-center border border-stone-200 dark:border-stone-700">
                      {room.coverPhotoUrl ? (
                        <img
                          src={room.coverPhotoUrl}
                          alt={roomName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm md:text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                          {roomName}
                        </p>
                        {room.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-bold tabular-nums">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-xs md:text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {room.lastMessage.senderName}:{' '}
                          {room.lastMessage.text ||
                            (room.lastMessage.mediaType === 'sticker'
                              ? t.stickerSentPreview
                              : room.lastMessage.mediaType === 'video'
                                ? '[Video]'
                                : '[Photo]')}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Pane: Messages (Full screen on mobile when mobileShowChat) */}
        <div
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              chatTouchStartRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }
          }}
          onTouchEnd={(e) => {
            const start = chatTouchStartRef.current;
            chatTouchStartRef.current = null;
            if (!start || e.changedTouches.length !== 1) return;
            const dx = e.changedTouches[0].clientX - start.x;
            const dy = e.changedTouches[0].clientY - start.y;
            if (start.x < 60 && dx > 75 && Math.abs(dy) < 55) {
              setMobileShowChat(false);
            }
          }}
          className={`${
            mobileShowChat ? 'flex flex-1 min-h-0' : 'hidden md:flex'
          } md:col-span-8 lg:col-span-9 flex-col h-full min-h-0`}
        >
          {/* Chat Header */}
          <div className="px-3 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileShowChat(false)}
                aria-label={t.backToRooms}
                className="md:hidden inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-rose-300 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.backToRooms}</span>
              </button>
              <div className="min-w-0">
                <h2 className="font-display text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
                  {activeRoom ? (lang === 'si' ? activeRoom.nameSi : activeRoom.nameEn) : t.allFamiliesRoom}
                </h2>
                {typingUser && typingUser.roomId === activeRoomId && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-rose-700 dark:text-rose-400 inline-flex items-center gap-1.5"
                  >
                    <span>
                      {typingUser.userName} {t.typingIndicator}
                    </span>
                    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                      {[0, 0.16, 0.32].map((d, idx) => (
                        <motion.span
                          key={idx}
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: d }}
                          className="w-1 h-1 rounded-full bg-rose-600 dark:bg-rose-400 inline-block"
                        />
                      ))}
                    </span>
                  </motion.p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[90px] sm:max-w-none truncate">{localProfile.name || t.myNameBtn}</span>
            </button>
          </div>

          {/* Mobile Horizontal Swipeable Room Switcher Strip */}
          {rooms.length > 0 && (
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-hide snap-x px-3 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/40 shrink-0">
              {rooms.map((room) => {
                const active = room.roomId === activeRoomId;
                const roomName = lang === 'si' ? room.nameSi : room.nameEn;
                return (
                  <button
                    key={`chip-${room.roomId}`}
                    type="button"
                    onClick={() => selectRoom(room.roomId)}
                    className={`snap-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                      active
                        ? 'bg-rose-700 text-white'
                        : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{roomName}</span>
                    {room.unreadCount > 0 && !active && (
                      <span className="px-1.5 rounded-full bg-rose-600 text-white text-[9px] font-bold tabular-nums">
                        {room.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Message Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 bg-stone-50/50 dark:bg-stone-950/30">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-10 gap-2 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.loading}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-sm text-stone-500">{t.noMessagesYet}</div>
            ) : (
              messages.map((m) => {
                const isMine =
                  m.senderId === localProfile.clientId && m.senderName === activeSender.name;
                const isSticker = m.mediaType === 'sticker' && m.mediaUrl;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex items-end gap-2 sm:gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <AvatarStack
                      avatars={m.senderAvatars}
                      fallbackAvatar={m.senderAvatar}
                      alt={m.senderName}
                      size="md"
                    />
                    {isSticker ? (
                      <div className={`flex flex-col gap-1 max-w-[78%] ${isMine ? 'items-end' : 'items-start'}`}>
                        <motion.div
                          initial={{ scale: 0.45, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          whileHover={{ scale: 1.07, rotate: isMine ? -3 : 3 }}
                          whileTap={{ scale: 0.94 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                        >
                          <StickerArtwork mediaUrl={m.mediaUrl} lang={lang} size="lg" />
                        </motion.div>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                            {m.senderName}
                          </span>
                          <span className="text-[10px] text-stone-400 tabular-nums">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[82%] sm:max-w-[65%] rounded-2xl px-3.5 sm:px-4 py-2.5 space-y-2 ${
                          isMine
                            ? 'bg-rose-700 text-white'
                            : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <span
                            className={`text-[11px] font-semibold ${
                              isMine ? 'text-rose-100' : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {m.senderName}
                          </span>
                          <span
                            className={`text-[10px] tabular-nums ${
                              isMine ? 'text-rose-200' : 'text-stone-400'
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {m.mediaUrl && (
                          <div className="rounded-xl overflow-hidden bg-black/10">
                            {m.mediaType === 'video' ? (
                              <video src={m.mediaUrl} controls className="max-h-64 rounded-xl" />
                            ) : (
                              <img
                                src={m.mediaUrl}
                                alt="Chat attachment"
                                referrerPolicy="no-referrer"
                                className="max-h-64 rounded-xl object-cover"
                              />
                            )}
                          </div>
                        )}

                        {m.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp-style Emoji & Sticker Tray */}
          <ChatEmojiStickerPicker
            lang={lang}
            open={pickerOpen}
            onSelectEmoji={handleSelectEmoji}
            onSelectSticker={handleSendSticker}
            onClose={() => setPickerOpen(false)}
          />

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="p-2.5 sm:p-4 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2 shrink-0"
          >
            {chatError && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
                <span>{chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError('')}
                  aria-label={t.close}
                  className="p-0.5 hover:opacity-75"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {mediaUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative inline-block"
              >
                {mediaType === 'video' ? (
                  <video src={mediaUrl} className="h-20 rounded-lg border border-stone-200" />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Attachment preview"
                    referrerPolicy="no-referrer"
                    className="h-20 rounded-lg border border-stone-200 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl('');
                    setMediaType(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-stone-900 text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-stone-500 dark:text-stone-400 shrink-0">
                  {t.sendingAsLabel}:
                </span>
                <AvatarStack
                  avatars={activeSender.avatars}
                  fallbackAvatar={activeSender.avatar}
                  alt={activeSender.name}
                  size="sm"
                />
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 truncate">
                  {activeSender.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide max-w-full">
                {quickMembers.map((qm) => {
                  const isActive =
                    selectedSenderIds.length === 1 && selectedSenderIds[0] === qm.id;
                  return (
                    <button
                      key={qm.id}
                      type="button"
                      onClick={() => setSelectedSenderIds(isActive ? [] : [qm.id])}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                        isActive
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                          : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-rose-300'
                      }`}
                    >
                      {qm.photoUrl ? (
                        <img
                          src={qm.photoUrl}
                          alt={qm.name}
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <User className="w-3 h-3 shrink-0" />
                      )}
                      <span>{qm.name}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSenderModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-700 dark:text-stone-200 hover:border-rose-300 whitespace-nowrap shrink-0"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.selectMembersBtn}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleAttachFile}
                className="hidden"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setPickerOpen((v) => !v)}
                aria-label={t.openEmojiPicker}
                title={t.openEmojiPicker}
                className={`p-2 sm:p-2.5 rounded-xl border min-h-[42px] min-w-[42px] flex items-center justify-center transition-colors shrink-0 ${
                  pickerOpen
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-rose-300 dark:hover:border-rose-700'
                }`}
              >
                <Smile className="w-5 h-5" />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                aria-label={t.uploadMedia}
                className="p-2 sm:p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-rose-300 dark:hover:border-rose-700 min-h-[42px] min-w-[42px] flex items-center justify-center shrink-0"
              >
                {uploadingMedia ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
              </motion.button>

              <input
                ref={textInputRef}
                type="text"
                value={text}
                onFocus={() => setPickerOpen(false)}
                onChange={(e) => {
                  setText(e.target.value);
                  onSendTyping(activeRoomId, activeSender.name);
                }}
                placeholder={t.typeMessage}
                className="flex-1 min-w-0 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 sm:px-3.5 py-2.5 text-sm min-h-[42px]"
              />

              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.93 }}
                disabled={sending || (!text.trim() && !mediaUrl)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white px-3.5 sm:px-4 py-2.5 text-xs font-medium min-h-[42px] shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t.send}</span>
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {senderModalOpen && (
        <MemberSenderModal
          lang={lang}
          families={families}
          allMembers={allMembers}
          selectedIds={selectedSenderIds}
          preferredFamilyId={activeRoomId.startsWith('family-') ? activeRoomId : null}
          mode="multi"
          onChange={setSelectedSenderIds}
          onClose={() => setSenderModalOpen(false)}
        />
      )}
    </div>
  );
};
