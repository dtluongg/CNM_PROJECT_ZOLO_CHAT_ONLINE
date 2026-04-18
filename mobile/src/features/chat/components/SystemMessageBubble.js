import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

const getAvatarSrc = (avatar) => {
    if (!avatar) return null;

    if (
        avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('data:') ||
        avatar.startsWith('file:') ||
        avatar.startsWith('content:') ||
        avatar.startsWith('blob:')
    ) {
        return avatar;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

    if (!API_URL) {
        return avatar;
    }

    if (avatar.startsWith('/')) {
        return `${API_URL}${avatar}`;
    }

    return `${API_URL}/${avatar}`;
};

// Parse payload an toàn: xử lý cả trường hợp là string JSON (Android) lẫn object (Web)
const parsePayload = (payload) => {
    if (!payload) return {};
    if (typeof payload === 'string') {
        try { return JSON.parse(payload); } catch { return {}; }
    }
    return payload;
};

const SystemMessageBubble = ({ msg, currentUserId, THEME }) => {
    const payload = parsePayload(msg.payload);

    const isVideo =
        payload.callType === 'video' ||
        msg.callType === 'video';

    const status =
        payload.status ||
        msg.status;

    const isMissed = status === 'missed';
    const isRejected = status === 'rejected';
    const isBad = isMissed || isRejected;

    const callerName =
        msg.callerName ||
        payload.callerName ||
        msg.caller?.displayName ||
        msg.callerId?.displayName ||
        '?';

    const callerAvatar =
        msg.callerAvatar ||
        payload.callerAvatar ||
        msg.caller?.avatar ||
        msg.callerId?.avatar ||
        null;

    const calleeName =
        msg.calleeName ||
        payload.calleeName ||
        msg.callee?.displayName ||
        msg.calleeId?.displayName ||
        '?';

    const calleeAvatar =
        msg.calleeAvatar ||
        payload.calleeAvatar ||
        msg.callee?.avatar ||
        msg.calleeId?.avatar ||
        null;

    let label;

    if (status === 'ended') {
        const dur = payload.duration ?? msg.duration ?? 0;
        const m = Math.floor(dur / 60);
        const s = dur % 60;
        const durStr = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;

        label = `Cuộc gọi ${isVideo ? 'video' : 'thoại'} · ${durStr}`;
    } else if (isMissed) {
        label = 'Cuộc gọi nhỡ';
    } else if (isRejected) {
        label = 'Cuộc gọi bị từ chối';
    } else {
        label = msg.content || 'Cuộc gọi';
    }

    // Xác định xem đây là thông báo cuộc gọi hay thông báo hệ thống chung
    const isCall = !!(status || payload.callType || msg.callType);
    const isReminder = 
        payload.event === 'reminder_triggered' || 
        msg.content?.startsWith('Nhắc hẹn:');

    const color = isBad ? '#ed4245' : THEME.textMuted;
    const bg = isBad ? '#ed424512' : THEME.bgSecondary;
    const border = isBad ? '#ed424540' : THEME.border;

    // Màu sắc đồng bộ với bản Web cho Nhắc hẹn
    const reminderColor = '#faa61a';
    const reminderBorder = '#faa61a60';

    const MiniAvatar = ({ name, avatar }) => {
        // Tránh hiện dấu ? dư thừa cho các tin nhắn không phải cuộc gọi
        if (!isCall || (!name && !avatar)) return null;
        if (name === '?' && !avatar) return null;

        const [imgError, setImgError] = useState(false);
        const avatarSrc = getAvatarSrc(avatar);

        useEffect(() => {
            setImgError(false);
        }, [avatarSrc]);

        if (avatarSrc && !imgError) {
            return (
                <Image
                    source={{ uri: avatarSrc }}
                    onError={() => setImgError(true)}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: THEME.bgSecondary,
                    }}
                />
            );
        }

        return (
            <View
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: THEME.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {(name || '?')[0].toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <View
            style={{
                alignItems: 'center',
                marginVertical: 10,
                marginHorizontal: 12,
            }}
        >
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: isReminder ? reminderBorder : border,
                    borderRadius: 30,
                    paddingVertical: isCall ? 8 : 10,
                    paddingHorizontal: isCall ? 12 : 24,
                    gap: isCall ? 8 : 0,
                }}
            >
                {isCall && <MiniAvatar name={callerName} avatar={callerAvatar} />}

                <View style={{ alignItems: 'center', gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Feather 
                            name={isReminder ? 'bell' : (isVideo ? 'video' : 'phone')} 
                            size={14} 
                            color={isReminder ? reminderColor : color} 
                        />

                        <Text style={{ 
                            fontSize: 13, 
                            fontWeight: '700', 
                            color: isReminder ? reminderColor : color 
                        }}>
                            {label}
                        </Text>
                    </View>

                    <Text style={{ fontSize: 10, color: THEME.textMuted, opacity: 0.7 }}>
                        {msg.time}
                    </Text>
                </View>

                {isCall && <MiniAvatar name={calleeName} avatar={calleeAvatar} />}
            </View>
        </View>
    );
};

export default SystemMessageBubble;