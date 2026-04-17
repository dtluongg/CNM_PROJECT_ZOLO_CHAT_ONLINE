import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, Smile, Mic, Send, Image, X } from 'lucide-react';

const EMOJIS = [
  '😀','😂','😍','🥺','😭','😊','😎','🤔',
  '😅','🥰','😢','😡','😴','🤗','😏','🙄',
  '❤️','🔥','✨','🎉','👍','👏','🙏','💯',
  '🤣','😘','🥳','😇','🤩','😤','😬','🫡',
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

export default function MessageInput({ onSend, placeholder, isMobile, conversationId, socket, editingMessage, onCancelEdit, replyingMessage, onCancelReply }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [attachments, setAttachments] = useState([]); // [{id, file, previewUrl}]

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

  const textareaRef      = useRef(null);
  const emojiPickerRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const recordingTimerRef = useRef(null);
  const typingTimerRef   = useRef(null);
  const fileInputRef     = useRef(null);
  const imageInputRef    = useRef(null);

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
      // Cleanup object URLs to avoid memory leaks
      attachments.forEach(a => URL.revokeObjectURL(a.previewUrl));
    };
  }, [attachments]);

  // ── Send Logic ──────────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    // 1. Capture snapshots of current content
    const textSnapshot = trimmed;
    const attachmentsSnapshot = [...attachments];

    // 2. Clear UI immediately for instant feedback
    setText('');
    setAttachments([]); // This will trigger the cleanup of object URLs via useEffect
    setShowEmoji(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    if (socket && conversationId) {
      clearTimeout(typingTimerRef.current);
      socket.emit('chat:stop-typing', { conversationId });
    }

    // 3. Process sending in background (async)
    (async () => {
      // Send text message if any
      if (textSnapshot) {
        try {
          if (editingMessage) {
            await onSend({ type: 'text', content: textSnapshot, isEdit: true, messageId: editingMessage._id || editingMessage.id });
            onCancelEdit && onCancelEdit();
          } else if (replyingMessage) {
            await onSend({ type: 'text', content: textSnapshot, replyToMessageId: replyingMessage._id || replyingMessage.id });
            onCancelReply && onCancelReply();
          } else {
            await onSend({ type: 'text', content: textSnapshot });
          }
        } catch (err) {
          console.error('Failed to send text:', err);
        }
      }

      // Send each image attachment in parallel for maximum speed
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
      e.preventDefault();
      handleSend();
    }
  };

  // ── Typing indicator ───────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('chat:typing', { conversationId });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, isMobile ? 100 : 128) + 'px';
    if (e.target.value.trim()) emitTyping();
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

  // ── Emoji ─────────────────────────────────────────────────────────────────
  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
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

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestMimeType();
      const options  = mimeType ? { mimeType } : {};
      const mr       = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob     = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
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
      console.error('Microphone access denied:', err);
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

  // ── File / image pickers ───────────────────────────────────────────────────
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

  // ── Recording UI ──────────────────────────────────────────────────────────
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
          {/* Red pulse dot */}
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#ed4245', flexShrink: 0,
            animation: 'recordPulse 1s ease-in-out infinite',
          }} />

          {/* Duration */}
          <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: '#ed4245', letterSpacing: 1 }}>
            {fmtDuration(recordingSec)}
          </span>

          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang ghi âm...</span>

          {/* Cancel */}
          <button
            onClick={cancelRecording}
            title="Hủy ghi âm"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              padding: '4px', borderRadius: 6, flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>

          {/* Stop & send */}
          <button
            onClick={stopRecording}
            title="Dừng và gửi"
            style={{
              background: '#ed4245', border: 'none', cursor: 'pointer',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: isMobile ? '50%' : 8,
              width: isMobile ? 36 : 'auto',
              height: isMobile ? 36 : 'auto',
              padding: isMobile ? 0 : '7px 12px',
              flexShrink: 0,
            }}
          >
            <Send size={isMobile ? 17 : 15} />
          </button>
        </div>
        <style>{`
          @keyframes recordPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
          }
        `}</style>
      </div>
    );
  }

  // ── Normal UI ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: isMobile ? '8px 10px' : '0 16px 14px',
      paddingBottom: isMobile ? 'calc(8px + env(safe-area-inset-bottom, 0px))' : '14px',
      flexShrink: 0, position: 'relative',
      background: isMobile ? 'var(--bg-secondary)' : 'transparent',
      borderTop: isMobile ? '1px solid var(--border)' : 'none',
    }}>
      {/* Thanh hiển thị đang chỉnh sửa tin nhắn */}
      {editingMessage && (
        <div style={{
          position: 'absolute', bottom: replyingMessage ? 'calc(100% + 40px)' : '100%', left: isMobile ? 0 : 16, right: isMobile ? 0 : 16,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderBottom: 'none',
          borderRadius: isMobile ? 0 : '12px 12px 0 0', padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, animation: 'fadeInUp 0.15s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Đang chỉnh sửa tin nhắn</span>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {editingMessage.content}
            </span>
          </div>
          <button onClick={onCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thanh hiển thị đang trả lời tin nhắn */}
      {replyingMessage && (
        <div style={{
          position: 'absolute', bottom: '100%', left: isMobile ? 0 : 16, right: isMobile ? 0 : 16,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)', borderBottom: 'none',
          borderRadius: isMobile ? 0 : (editingMessage ? 0 : '12px 12px 0 0'), padding: '8px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, animation: 'fadeInUp 0.15s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Đang trả lời {replyingMessage.senderName}</span>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {replyingMessage.type === 'text' ? replyingMessage.content : `[${replyingMessage.type}]`}
            </span>
          </div>
          <button onClick={onCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={imageInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

      {/* Attachment Preview UI */}
      {attachments.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: isMobile ? 0 : '12px 12px 0 0',
          padding: '12px 16px',
          animation: 'fadeInUp 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: -1, // collapse border with input container
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               {attachments.length} ảnh
             </div>
             <button
               onClick={removeAllAttachments}
               style={{
                 background: 'none',
                 border: 'none',
                 color: '#667085',
                 fontSize: 12,
                 fontWeight: 400,
                 cursor: 'pointer',
                 padding: '2px 4px',
                 borderRadius: 4,
                 transition: 'all 0.2s ease'
               }}
               onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
               onMouseLeave={(e) => e.target.style.color = '#667085'}
             >
               Xoá tất cả
             </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {attachments.map(att => (
              <div key={att.id} style={{ position: 'relative', flexShrink: 0 }}>
                <img 
                  src={att.previewUrl} 
                  alt="preview" 
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} 
                />
                <button
                  onClick={() => removeAttachment(att.id)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {/* Add more button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              style={{
                width: 64, height: 64, borderRadius: 8,
                border: '2px dashed var(--border)',
                background: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', flexShrink: 0
              }}
            >
              <span style={{ fontSize: 24 }}>+</span>
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmoji && (
        <div
          ref={emojiPickerRef}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: isMobile ? 10 : 16,
            right: isMobile ? 10 : 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: isMobile ? 4 : 3,
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            width: isMobile ? 'auto' : 288,
            animation: 'fadeInUp 0.15s ease',
          }}
        >
          <div style={{
            gridColumn: '1 / -1', fontSize: 11, fontWeight: 700,
            color: 'var(--text-muted)', marginBottom: 6, paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            Biểu tượng cảm xúc
          </div>
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => insertEmoji(emoji)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: isMobile ? 22 : 20, padding: isMobile ? '6px' : '5px',
                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(1.25)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: isMobile ? 4 : 6,
        background: 'var(--input-bg)',
        borderRadius: isMobile ? 24 : 10,
        padding: isMobile ? '6px 6px 6px 14px' : '8px 10px',
        border: `1.5px solid ${focused ? 'var(--accent)' : 'transparent'}`,
        transition: 'border-color 0.15s',
        boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
      }}>
        {/* Desktop: Attach file button */}
        {!isMobile && (
          <button
            title="Đính kèm file"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center',
              transition: 'color 0.12s', marginBottom: 3,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Paperclip size={18} />
          </button>
        )}

        {/* Desktop: Image button */}
        {!isMobile && (
          <button
            title="Gửi ảnh"
            onClick={() => imageInputRef.current?.click()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center',
              transition: 'color 0.12s', marginBottom: 3,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Image size={18} />
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || 'Nhắn tin...'}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: isMobile ? 16 : 15,
            resize: 'none', lineHeight: 1.5,
            maxHeight: isMobile ? 100 : 128,
            overflow: 'auto', fontFamily: 'inherit',
            scrollbarWidth: 'thin',
            padding: isMobile ? '4px 0' : 0,
          }}
        />

        {/* Emoji */}
        <button onClick={() => setShowEmoji(v => !v)} title="Biểu tượng cảm xúc"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: showEmoji ? 'var(--accent)' : 'var(--text-muted)',
            padding: '2px 4px', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center',
            transition: 'color 0.12s', marginBottom: isMobile ? 0 : 3,
            minWidth: 32, minHeight: 32, justifyContent: 'center',
          }}
        >
          <Smile size={isMobile ? 20 : 18} />
        </button>

        {/* Mobile: image button when no text */}
        {isMobile && !canSend && (
          <button
            title="Gửi ảnh"
            onClick={() => imageInputRef.current?.click()}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 32, minHeight: 32,
            }}
          >
            <Image size={20} />
          </button>
        )}

        {/* Send / Mic */}
        {canSend ? (
          <button onClick={handleSend} title="Gửi"
            style={{
              background: 'var(--accent)', border: 'none', cursor: 'pointer',
              color: '#fff',
              borderRadius: isMobile ? '50%' : 8,
              width: isMobile ? 36 : 'auto',
              height: isMobile ? 36 : 'auto',
              padding: isMobile ? 0 : '7px 12px',
              flexShrink: 0, transition: 'background 0.12s, transform 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Send size={isMobile ? 17 : 15} />
          </button>
        ) : (
          <button
            title="Ghi âm"
            onClick={startRecording}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 6,
              flexShrink: 0, display: 'flex', alignItems: 'center',
              marginBottom: isMobile ? 0 : 3, transition: 'color 0.12s',
              minWidth: 32, minHeight: 32, justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Mic size={isMobile ? 20 : 18} />
          </button>
        )}
      </div>
    </div>
  );
}
