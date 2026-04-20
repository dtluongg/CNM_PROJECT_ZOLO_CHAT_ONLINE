import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { getAvatarColor, getInitials } from '../../../theme';

const Avatar = ({ name, avatar, size = 36, online = null, THEME, styles }) => {
  const [imgError, setImgError] = useState(false);
  const bg = getAvatarColor(name);
  const safeTheme = THEME || {};
  const safeStyles = styles || {};

  return (
    <View style={{ width: size, height: size }}>
      {avatar && !imgError ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={[
            safeStyles.avatarCircle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
          ]}
        >
          <Text style={[safeStyles.avatarText, { fontSize: size * 0.38, color: '#fff', fontWeight: '700' }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {online !== null && (
        <View
          style={[
            safeStyles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: online ? safeTheme.statusOnline || '#22c55e' : safeTheme.statusOffline || '#64748b',
            },
          ]}
        />
      )}
    </View>
  );
};

export default Avatar;
