import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles as s } from '../styles/profileStyles';

const TabButton = ({ tabKey, label, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[s.tabBtn, active && s.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default TabButton;