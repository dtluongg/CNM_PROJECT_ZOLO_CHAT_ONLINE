import React from 'react';
import { View, Text } from 'react-native';
import { styles as defaultStyles } from '../styles/userProfileStyles';

const InfoRow = ({ icon, label, value, sep, styles }) => {
  const s = styles || defaultStyles;
  return (
    <>
      {sep && <View style={s.infoSep} />}
      <View style={s.infoRow}>
        <Text style={s.infoRowIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
        </View>
      </View>
    </>
  );
};

export default InfoRow;