import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { getAvatarColor, getInitials } from '../../../theme';

const Avatar = ({ name, avatar, size = 36, online = null, THEME, styles }) => {
  const [imgError, setImgError] = useState(false);
  const bg = getAvatarColor(name);

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
            styles.avatarCircle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
          ]}
        >
          <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {online !== null && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: online ? THEME.statusOnline : THEME.statusOffline,
            },
          ]}
        />
      )}
    </View>
  );
};

export default Avatar;
