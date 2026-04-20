/**
 * VoiceRoomPanel – floating mini-bar hiển thị ở dưới cùng MessageScreen
 * khi user đang trong phòng thoại của conversation hiện tại.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useVoiceRoomContext } from '../VoiceRoomContext';

export default function VoiceRoomPanel({ conversation, topics, navigation }) {
  const {
    inRoom, activeConversationId, activeTopicId,
    connected, isMuted,
    getMergedParticipants,
    toggleMute, leaveRoom,
  } = useVoiceRoomContext();

  const convId = conversation?.id || conversation?._id;

  // Chỉ hiển thị khi đang trong phòng thoại của cuộc hội thoại này
  if (!inRoom || !connected || activeConversationId !== convId) return null;

  const topic = topics?.find(t => t._id === activeTopicId) || null;
  const parts = getMergedParticipants(activeTopicId);

  const handleGoToRoom = () => {
    if (topic) {
      navigation.push('VoiceChannel', { conversation, topic });
    }
  };

  const handleLeave = async () => {
    await leaveRoom(convId, activeTopicId);
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: '#23a55a',
      gap: 8,
    }}>
      {/* Pulse dot */}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.85)' }} />

      {/* Channel info – tap to go back to room */}
      <TouchableOpacity style={{ flex: 1 }} onPress={handleGoToRoom} activeOpacity={0.8}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
          🔊 {topic?.name || 'Kênh thoại'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
          {parts.length} người đang kết nối
        </Text>
      </TouchableOpacity>

      {/* Quick mute */}
      <TouchableOpacity
        onPress={toggleMute}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: isMuted ? 'rgba(237,66,69,0.4)' : 'rgba(255,255,255,0.2)',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Feather name={isMuted ? 'mic-off' : 'mic'} size={16} color="#fff" />
      </TouchableOpacity>

      {/* Leave */}
      <TouchableOpacity
        onPress={handleLeave}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: 'rgba(237,66,69,0.5)',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Feather name="phone-off" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
