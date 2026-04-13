import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SystemMessageBubble = ({ msg, currentUserId, THEME }) => {
    const isVideo    = msg.payload?.callType === 'video';
    const status     = msg.payload?.status;
    const isMissed   = status === 'missed';
    const isRejected = status === 'rejected';
    const isBad      = isMissed || isRejected;

    let label;
    if (status === 'ended') {
        const dur    = msg.payload?.duration || 0;
        const m      = Math.floor(dur / 60);
        const s      = dur % 60;
        const durStr = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
        label = `Cuộc gọi ${isVideo ? 'video' : 'thoại'} · ${durStr}`;
    } else if (isMissed) {
        label = 'Cuộc gọi nhỡ';
    } else if (isRejected) {
        label = 'Cuộc gọi bị từ chối';
    } else {
        label = msg.content;
    }

    const color = isBad ? '#ed4245' : THEME.textMuted;
    const bg    = isBad ? '#ed424512' : THEME.bgSecondary;
    const border = isBad ? '#ed424540' : THEME.border;

    const MiniAvatar = ({ name, avatar }) => {
        if (avatar) {
            return <Image source={{ uri: avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />;
        }
        return (
            <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: THEME.accent,
                alignItems: 'center', justifyContent: 'center',
            }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {(name || '?')[0].toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <View style={{
            alignItems:       'center',
            marginVertical:   10,
            marginHorizontal: 12,
        }}>
            <View style={{
                flexDirection:     'row',
                alignItems:        'center',
                backgroundColor:   bg,
                borderWidth:       1,
                borderColor:       border,
                borderRadius:      30,
                paddingVertical:   8,
                paddingHorizontal: 12,
                gap:               8,
            }}>
                {/* Avatar người GỌI */}
                <MiniAvatar name={msg.callerName} avatar={msg.callerAvatar} />

                {/* Nội dung giữa */}
                <View style={{ alignItems: 'center', gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Feather name={isVideo ? 'video' : 'phone'} size={12} color={color} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color }}>
                            {label}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: THEME.textMuted, opacity: 0.7 }}>
                        {msg.time}
                    </Text>
                </View>

                {/* Avatar người NHẬN */}
                <MiniAvatar name={msg.calleeName} avatar={msg.calleeAvatar} />
            </View>
        </View>
    );
};

// ← QUAN TRỌNG: phải có dòng này
export default SystemMessageBubble;