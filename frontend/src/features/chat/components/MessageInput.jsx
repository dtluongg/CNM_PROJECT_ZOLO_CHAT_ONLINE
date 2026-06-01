import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Smile, Mic, Send, Image, X, BarChart2 } from 'lucide-react';
import CreatePollModal from './chatArea/modals/CreatePollModal';
import { getAudioStream, getMediaErrorMessage } from '../../../utils/mediaUtils';

const EMOJIS = [
  '😀', '😂', '😍', '🥺', '😭', '😊', '😎', '🤔',
  '😅', '🥰', '😢', '😡', '😴', '🤗', '😏', '🙄',
  '❤️', '🔥', '✨', '🎉', '👍', '👏', '🙏', '💯',
  '🤣', '😘', '🥳', '😇', '🤩', '😤', '😬', '🫡',
];

const SUPPORTED_AUDIO_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

function getBestMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of SUPPORTED_AUDIO_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function fmtDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── THÊM PROP groupMembers ĐỂ LẤY DANH SÁCH THÀNH VIÊN TỪ CHATAREA ──
export default function MessageInput({
  onSend, placeholder, isMobile, isGroup, conversationId, socket,
  editingMessage, onCancelEdit, replyingMessage, onCancelReply,
  groupMembers = []
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [showPollModal, setShowPollModal] = useState(false);

  // ── STATE CHO TÍNH NĂNG MENTION (@) ──
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionsList, setMentionsList] = useState([]); // Lưu [{ id, displayName }] để kiểm tra lúc gửi

  // Sync text when editingMessage changes
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, isMobile ? 100 : 128) + 'px';
            textareaRef.current.focus();
          }
        }, 0);
      }
    } else {
      setText('');
    }
  }, [editingMessage, isMobile]);

  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showEmoji]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      clearTimeout(typingTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      attachments.forEach(a => URL.revokeObjectURL(a.previewUrl));
    };
  }, [attachments]);

  // ── Send Logic ──────────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    const textSnapshot = trimmed;
    const attachmentsSnapshot = [...attachments];

    // Lọc lại mảng mentions: Chỉ lấy ID của những người mà tên vẫn còn nằm trong text (đề phòng người dùng xóa mất chữ)
    const finalMentions = mentionsList
      .filter(m => textSnapshot.includes(`@${m.displayName}`))
      .map(m => m.id);

    // Kiểm tra xem có tag @all không
    const mentionAll = textSnapshot.includes('@all') || textSnapshot.includes('@mọi người') || textSnapshot.includes('@chung');

    setText('');
    setAttachments([]);
    setShowEmoji(false);
    setShowMentions(false);
    setMentionsList([]); // Reset mảng tag

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    if (socket && conversationId) {
      clearTimeout(typingTimerRef.current);
      socket.emit('chat:stop-typing', { conversationId });
    }

    (async () => {
      if (textSnapshot) {
        try {
          const payload = {
            type: 'text',
            content: textSnapshot,
            mentions: finalMentions, // <-- Bơm mảng ID vào đây
            mentionAll: mentionAll   // <-- Bơm cờ @all vào đây
          };

          if (editingMessage) {
            await onSend({ ...payload, isEdit: true, messageId: editingMessage._id || editingMessage.id });
            onCancelEdit && onCancelEdit();
          } else if (replyingMessage) {
            await onSend({ ...payload, replyToMessageId: replyingMessage._id || replyingMessage.id });
            onCancelReply && onCancelReply();
          } else {
            await onSend(payload);
          }
        } catch (err) {
          console.error('Failed to send text:', err);
        }
      }

      await Promise.all(attachmentsSnapshot.map(async (att) => {
        try {
          await onSend({ type: 'image', file: att.file });
        } catch (err) {
          console.error('Failed to send image:', err);
        }
      }));
    })();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      // Nếu đang mở bảng gợi ý Tag mà bấm Enter, bỏ qua để người dùng chọn
      if (showMentions) return;
      e.preventDefault();
      handleSend();
    }
  };

  const emitTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('chat:typing', { conversationId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  // ── XỬ LÝ NHẬP LIỆU & BẮT DẤU @ ──────────────────────────────────────────
  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, isMobile ? 100 : 128) + 'px';
    if (val.trim()) emitTyping();

    // Radar dò chữ @ (Chỉ chạy nếu là nhóm)
    if (isGroup) {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = val.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Nếu sau dấu @ KHÔNG có khoảng trắng, nghĩa là người dùng đang gõ tên
        if (!textAfterAt.includes(' ')) {
          setMentionQuery(textAfterAt.toLowerCase());
          setMentionStartIndex(lastAtIndex);
          setShowMentions(true);
          return;
        }
      }
      setShowMentions(false);
    }
  };

  // ── XỬ LÝ KHI CLICK CHỌN 1 NGƯỜI TRONG GỢI Ý ───────────────────────────
  const insertMention = (user) => {
    const beforeAt = text.slice(0, mentionStartIndex);
    const afterCursor = text.slice(textareaRef.current.selectionStart);
    const mentionText = user.id === 'all' ? '@all ' : `@${user.displayName} `;

    const newText = beforeAt + mentionText + afterCursor;
    setText(newText);
    setShowMentions(false);

    // Nếu không phải là tag @all, thì lưu ID của user vào danh sách
    if (user.id !== 'all') {
      setMentionsList(prev => {
        if (!prev.find(m => m.id === user.id)) return [...prev, user];
        return prev;
      });
    }

    // Đặt lại con trỏ chuột ra ngay sau chữ vừa tag
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = beforeAt.length + mentionText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      const newAttachments = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => {
      const found = prev.find(a => a.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  };

  const removeAllAttachments = () => {
    setAttachments(prev => {
      prev.forEach(a => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  };

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(prev => prev + emoji);
    }
    setShowEmoji(false);
  };

  // ... (Phần logic Voice/Mic giữ nguyên)
  const startRecording = async () => {
    try {
      const stream = await getAudioStream();
      const mimeType = getBestMimeType();
      const options = mimeType ? { mimeType } : {};
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const duration = recordingSec;
        chunksRef.current = [];
        onSend({ type: 'voice', blob, duration });
      };

      mr.start(250);
      setIsRecording(true);
      setRecordingSec(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSec(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert(err.message || 'Không thể truy cập microphone');
    }
  };

  const stopRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => { chunksRef.current = []; };
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSend({ type: 'file', file });
    e.target.value = '';
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newAttachments = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const canSend = text.trim().length > 0 || attachments.length > 0;

  if (isRecording) {
    return (
      <div style={{
        padding: isMobile ? '8px 10px' : '0 16px 14px',
        paddingBottom: isMobile ? 'calc(8px + env(safe-area-inset-bottom, 0px))' : '14px',
        flexShrink: 0, position: 'relative',
        background: isMobile ? 'var(--bg-secondary)' : 'transparent',
        borderTop: isMobile ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12,
          background: 'var(--input-bg)',
          borderRadius: isMobile ? 24 : 10,
          padding: isMobile ? '8px 12px' : '10px 14px',
          border: '1.5px solid #ed4245',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ed4245', flexShrink: 0, animation: 'recordPulse 1s ease-in-out infinite' }} />
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#ed4245', letterSpacing: 1 }}>{fmtDuration(recordingSec)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang ghi âm...</span>
          <button onClick={cancelRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: 6, flexShrink: 0 }}><X size={20} /></button>
          <button onClick={stopRecording} style={{ background: '#ed4245', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: isMobile ? '50%' : 8, width: isMobile ? 36 : 'auto', height: isMobile ? 36 : 'auto', padding: isMobile ? 0 : '7px 12px', flexShrink: 0 }}><Send size={isMobile ? 17 : 15} /></button>
        </div>
        <style>{`@keyframes recordPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }`}</style>
      </div>
    );
  }

  // ── TÌM KIẾM DANH SÁCH TAG THEO QUERY ──
  const filteredMentions = [
    { id: 'all', displayName: 'all' },
    ...groupMembers
  ].filter(m => m.displayName.toLowerCase().includes(mentionQuery));

  return (
    <div style={{
      paddingBottom: isMobile ? 'calc(8px + env(safe-area-inset-bottom, 0px))' : 0,
      flexShrink: 0, position: 'relative', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)',
    }}>
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          <button onClick={() => setShowEmoji(v => !v)} title="Biểu tượng cảm xúc" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmoji ? 'var(--accent)' : 'var(--text-muted)', padding: '6px', borderRadius: 6, transition: 'all 0.15s', display: 'flex', alignItems: 'center' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.color = showEmoji ? 'var(--accent)' : 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}><Smile size={20} /></button>
          <button title="Gửi ảnh" onClick={() => imageInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}><Image size={20} /></button>
          <button title="Đính kèm file" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}><Paperclip size={20} /></button>
          {isGroup && <button title="Tạo bình chọn" onClick={() => setShowPollModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(0,132,255,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}><BarChart2 size={20} /></button>}
        </div>
      )}

      {(editingMessage || replyingMessage) && (
        <div style={{ position: 'absolute', bottom: '100%', left: isMobile ? 0 : 16, right: isMobile ? 0 : 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: isMobile ? 0 : '12px 12px 0 0', padding: '8px 12px', zIndex: 10, animation: 'fadeInUp 0.15s ease' }}>
          {editingMessage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>Đang chỉnh sửa</span><button onClick={onCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button></div>
          )}
          {replyingMessage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>Đang trả lời {replyingMessage.senderName}</span><button onClick={onCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button></div>
          )}
        </div>
      )}

      {/* ── BẢNG DANH SÁCH TAG TÊN NỔI LÊN ── */}
      {showMentions && filteredMentions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 4px)', left: isMobile ? 10 : 16,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 8, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          maxHeight: 200, overflowY: 'auto', minWidth: 200
        }}>
          {filteredMentions.map(user => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                width: '100%', background: 'none', border: 'none', borderRadius: 8,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: user.id === 'all' ? '#ed4245' : 'var(--accent)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700
              }}>
                {user.id === 'all' ? '@' : user.displayName?.charAt(0)?.toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.id === 'all' ? 'Mọi người' : user.displayName}
              </span>
            </button>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={imageInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

      {attachments.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: isMobile ? 0 : '12px 12px 0 0', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{attachments.length} ảnh</span>
            <button onClick={removeAllAttachments} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>Xóa tất cả</button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {attachments.map(att => (
              <div key={att.id} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={att.previewUrl} alt="preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                <button onClick={() => removeAttachment(att.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEmoji && (
        <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: isMobile ? 10 : 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => insertEmoji(emoji)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 5 }}>{emoji}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: isMobile ? 'var(--input-bg)' : 'transparent', borderRadius: isMobile ? 24 : 0, padding: isMobile ? '8px 10px' : '10px 16px', border: isMobile ? `1.5px solid ${focused ? 'var(--accent)' : 'transparent'}` : 'none', transition: 'border-color 0.15s' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Nhập @, tin nhắn...'}
          rows={1}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 15, padding: 0, resize: 'none', lineHeight: 1.5, maxHeight: 128, overflow: 'auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          {!canSend && <button title="Ghi âm" onClick={startRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isRecording ? '#ed4245' : 'var(--text-muted)', padding: '6px', borderRadius: 6, transition: 'all 0.12s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.color = isRecording ? '#ed4245' : 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}><Mic size={20} /></button>}
          {isMobile && <button onClick={() => setShowEmoji(v => !v)} title="Biểu tượng cảm xúc" style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmoji ? 'var(--accent)' : 'var(--text-muted)', padding: '4px', borderRadius: 6 }}><Smile size={20} /></button>}
          {canSend && <button onClick={handleSend} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px', borderRadius: 8, marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={22} style={{ transform: 'rotate(-45deg)', marginTop: -2 }} /></button>}
        </div>
      </div>
      <CreatePollModal isOpen={showPollModal} onClose={() => setShowPollModal(false)} onCreate={(data) => onSend({ type: 'poll', ...data })} />
    </div>
  );
}