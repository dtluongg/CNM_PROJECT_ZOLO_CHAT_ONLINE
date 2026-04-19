/**
 * CallControls – các nút điều khiển tái sử dụng trong màn hình gọi
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function ControlButton({ iconName, label, onPress, active, activeColor = '#ed4245', size = 26, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.controlBtn,
        active && { backgroundColor: activeColor },
        disabled && { opacity: 0.4 },
      ]}
      activeOpacity={0.75}
    >
      <Feather name={iconName} size={size} color="#fff" />
      {label ? <Text style={styles.controlLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

export function EndCallButton({ onPress, label = 'Cúp máy' }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.endBtn} activeOpacity={0.8}>
      <Feather name="phone-off" size={28} color="#fff" />
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  controlBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ed4245',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
