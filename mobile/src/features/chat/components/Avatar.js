import React from 'react';
import { View, Text, Image } from 'react-native';
import { getAvatarColor, getInitials } from '../../../theme';

/**
 * Avatar dùng chung cho cả màn hình chat.
 * Hiển thị ảnh thật nếu có, ngược lại dùng chữ cái đầu với màu nền tự động.
 * Có thể hiển thị chấm trạng thái online/offline ở góc dưới phải.
 *
 * @param {string}  name    - Tên người dùng (dùng để tạo chữ cái đầu và màu nền)
 * @param {string}  avatar  - URL ảnh đại diện (tuỳ chọn)
 * @param {number}  size    - Kích thước avatar (mặc định 36)
 * @param {boolean} online  - null = không hiển thị chấm, true/false = online/offline
 */
const Avatar = ({ name, avatar, size = 36, online = null, THEME, styles }) => {
  // Tính màu nền dựa trên tên người dùng
  const bg = getAvatarColor(name);

  return (
    <View style={{ width: size, height: size }}>
      {/* Ảnh đại diện hoặc vòng tròn chữ cái đầu */}
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
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

      {/* Chấm trạng thái online/offline */}
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