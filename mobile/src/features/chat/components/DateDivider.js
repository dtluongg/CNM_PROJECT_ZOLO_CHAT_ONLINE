import React from 'react';
import { View, Text } from 'react-native';

/**
 * Đường phân cách ngày hiển thị giữa các tin nhắn thuộc ngày khác nhau.
 * Ví dụ: "Hôm nay", "12/06/2024", v.v.
 *
 * @param {string} label  - Nhãn ngày hiển thị ở giữa
 */
const DateDivider = ({ label, styles }) => (
  <View style={styles.dateDivider}>
    <View style={styles.dateLine} />
    <Text style={styles.dateLabel}>{label}</Text>
    <View style={styles.dateLine} />
  </View>
);

export default DateDivider;