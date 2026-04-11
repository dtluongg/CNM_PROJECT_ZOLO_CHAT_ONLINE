import React from 'react';
import { View, Text } from 'react-native';
import { styles as s } from '../styles/userProfileStyles';

const StatusBubble = ({ color, label }) => {
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