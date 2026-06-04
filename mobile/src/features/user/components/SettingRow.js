import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { styles as defaultStyles } from '../styles/profileStyles';

const SettingRow = ({ icon, label, sub, accent, onPress, styles }) => {
  const s = styles || defaultStyles;
  return (
    <TouchableOpacity style={s.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={s.settingIconWrap}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        {sub && <Text style={[s.settingSub, accent && { color: accent }]} numberOfLines={1}>{sub}</Text>}
      </View>
      <Text style={s.settingArrow}>›</Text>
    </TouchableOpacity>
  );
};

export default SettingRow;