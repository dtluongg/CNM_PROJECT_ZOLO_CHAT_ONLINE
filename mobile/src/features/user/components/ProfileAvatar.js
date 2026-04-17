import React from 'react';
import { View, Text, Image } from 'react-native';
import { THEME, STATUS_CONFIG, getAvatarColor, getInitials } from '../../../theme';

const ProfileAvatar = ({ name, avatar, size = 48, status }) => {
  const bg = getAvatarColor(name);
  const dotSize = Math.round(size * 0.3);
  const sc = STATUS_CONFIG[status]?.color || THEME.statusOffline || '#666';

  return (
    <View style={{ width: size, height: size }}>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={{
            position: 'absolute',
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: sc,
            bottom: 0,
            right: 0,
            borderWidth: 2.5,
            borderColor: THEME.bgSecondary,
          }}
        />
      )}
    </View>
  );
};

export default ProfileAvatar;