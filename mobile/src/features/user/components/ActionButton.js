import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles as s } from '../styles/userProfileStyles';

const ActionButton = ({ icon, label, onPress, primary }) => {
  return (
    <TouchableOpacity
      style={[s.actionBtn, primary && s.actionBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <Text style={s.actionBtnIcon}>{icon}</Text>
      <Text style={[s.actionBtnLabel, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default ActionButton;