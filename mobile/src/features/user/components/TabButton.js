import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles as defaultStyles } from '../styles/profileStyles';

const TabButton = ({ tabKey, label, active, onPress, styles }) => {
  const s = styles || defaultStyles;
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