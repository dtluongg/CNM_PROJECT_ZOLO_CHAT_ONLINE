import React from 'react';
import { View, Text } from 'react-native';
import { styles as defaultStyles } from '../styles/userProfileStyles';

const StatusBubble = ({ color, label, styles }) => {
  const s = styles || defaultStyles;
  return (
    <View style={[s.statusBubble, { backgroundColor: color + '20', borderColor: color + '60' }]}>
      <View style={[s.statusDot, { backgroundColor: color }]} />
      <Text style={[s.statusBubbleText, { color: color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export default StatusBubble;