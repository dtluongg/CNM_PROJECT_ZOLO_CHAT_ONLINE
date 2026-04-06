import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../services/apiClient';

const THEME_LABELS = {
  dark: { label: 'Dark', desc: 'Discord-like dark' },
  light: { label: 'Light', desc: 'Clean & bright' },
  midnight: { label: 'Midnight', desc: 'Deep black + pink' },
  ocean: { label: 'Ocean', desc: 'Deep sea blue' },
};

const COLOR_LABELS = {
  'accent': 'Màu chính (Accent)',
  'bubbleSelf': 'Bong bóng của tôi',
  'bubbleOther': 'Bong bóng người khác',
  'bgTertiary': 'Nền khu vực chat',
  'bgSecondary': 'Nền sidebar',
  'bgPrimary': 'Nền ngoài cùng',
  'bgInput': 'Nền ô nhập liệu',
};

// Phân tích hex để tạo bảng màu palette
const COLOR_PALETTE = [
  '#5865f2', '#eb459e', '#00b4d8', '#57f287', '#faa61a', '#ed4245', '#9b59b6', '#e67e22',
  '#1e1f22', '#2b2d31', '#e3e5e8', '#ffffff', '#000000', '#383a40', '#ebedef', '#3a3c43'
];

export default function AppearanceModal({ visible, onClose, updateUserProfile }) {
  const { theme: THEME, themeName, colors, presets, setTheme, setCustomColor, resetTheme } = useTheme();
  
  const [saving, setSaving] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [activeColorKey, setActiveColorKey] = useState(null);
  const [tempHex, setTempHex] = useState('');

  const s = useStyles(THEME);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current colors from ThemeContext
      const currentColors = presets[themeName] ? presets[themeName] : colors; // if custom
      
      const payload = {
        themeName: themeName,
        themeColors: {
          '--bg-primary': currentColors.bgPrimary,
          '--bg-secondary': currentColors.bgSecondary,
          '--bg-tertiary': currentColors.bgTertiary,
          '--bg-hover': currentColors.bgHover,
          '--input-bg': currentColors.bgInput,
          '--text-primary': currentColors.textPrimary,
          '--text-secondary': currentColors.textSecondary,
          '--text-muted': currentColors.textMuted,
          '--accent': currentColors.accent,
          '--accent-hover': currentColors.accentHover,
          '--bubble-self': currentColors.bubbleSelf,
          '--bubble-other': currentColors.bubbleOther,
          '--border': currentColors.border,
        }
      };

      const res = await apiClient.patch('/auth/update-profile', payload);
      // Let ProfileScreen know to update auth user context
      if (updateUserProfile) {
        await updateUserProfile(res.data.user);
      }
      onClose();
    } catch (err) {
      console.error('[AppearanceModal] Save Error:', err);
      // Mặc dù lỗi, nhưng giao diện đã đổi state tạm thời. Có thể giữ hoặc reset.
      alert('Không thể lưu giao diện lên server. Hệ thống sẽ giữ tạm.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const openColorPicker = (key) => {
    setActiveColorKey(key);
    setTempHex(THEME[key] || '#000000');
    setColorPickerVisible(true);
  };

  const submitColor = () => {
    if (activeColorKey && tempHex) {
      setCustomColor(activeColorKey, tempHex);
    }
    setColorPickerVisible(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ width: 40 }} />
            <Text style={s.sheetTitle}>Giao diện</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            {/* Presets */}
            <Text style={s.sectionTitle}>CHỦ ĐỀ GIAO DIỆN</Text>
            <View style={s.presetGrid}>
              {Object.keys(presets).map((name) => {
                const p = presets[name];
                const isActive = themeName === name;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[s.presetCard, { backgroundColor: p.bgSecondary }, isActive && { borderColor: p.accent, borderWidth: 2 }]}
                    onPress={() => setTheme(name)}
                  >
                    {/* Fake mockup */}
                    <View style={s.presetDots}>
                      <View style={[s.dot, { backgroundColor: p.accent }]} />
                      <View style={[s.dot, { backgroundColor: p.bubbleSelf }]} />
                      <View style={[s.dot, { backgroundColor: p.bgTertiary }]} />
                    </View>
                    <View style={[s.presetMockup, { backgroundColor: p.bgPrimary }]}>
                      <View style={[s.presetMockupSidebar, { backgroundColor: p.bgSecondary }]} />
                      <View style={{ flex: 1, padding: 4, justifyContent: 'center', gap: 4 }}>
                        <View style={[s.presetMockupBubble, { backgroundColor: p.bubbleOther, width: '60%', alignSelf: 'flex-start' }]} />
                        <View style={[s.presetMockupBubble, { backgroundColor: p.bubbleSelf, width: '40%', alignSelf: 'flex-end' }]} />
                      </View>
                    </View>
                    <View style={s.presetInfo}>
                      <Text style={[s.presetName, { color: p.textPrimary }]}>{THEME_LABELS[name]?.label}</Text>
                      <Text style={[s.presetDesc, { color: p.textMuted }]} numberOfLines={1}>{THEME_LABELS[name]?.desc}</Text>
                    </View>
                    {isActive && (
                      <View style={[s.activeCheck, { backgroundColor: p.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Colors */}
            <Text style={s.sectionTitle}>TÙY CHỈNH MÀU SẮC</Text>
            <View style={s.colorsList}>
              {Object.entries(COLOR_LABELS).map(([key, label]) => {
                const colorVal = THEME[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={s.colorRow}
                    onPress={() => openColorPicker(key)}
                  >
                    <Text style={s.colorLabel}>{label}</Text>
                    <View style={[s.colorSwatch, { backgroundColor: colorVal }]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.resetBtn} onPress={resetTheme}>
              <Text style={s.resetBtnText}>↺ Đặt lại về Dark (mặc định)</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.footerCancel} onPress={onClose}>
              <Text style={s.footerCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.footerSave} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.footerSaveText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Nested Color Picker Modal */}
        <Modal visible={colorPickerVisible} transparent animationType="fade">
          <View style={s.pickerOverlay}>
            <View style={[s.pickerSheet, { backgroundColor: THEME.bgSecondary }]}>
              <Text style={[s.sheetTitle, { color: THEME.textPrimary }]}>
                Chọn màu cho: {COLOR_LABELS[activeColorKey]}
              </Text>
              
              <Text style={[s.fieldLabel, { color: THEME.textMuted }]}>MÃ HEX</Text>
              <TextInput
                style={[s.fieldInput, { backgroundColor: THEME.bgInput, color: THEME.textPrimary, borderColor: THEME.border }]}
                value={tempHex}
                onChangeText={setTempHex}
                placeholder="#000000"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
              />

              <Text style={[s.fieldLabel, { color: THEME.textMuted, marginTop: 10 }]}>MÀU GỢI Ý</Text>
              <View style={s.paletteGrid}>
                {COLOR_PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.paletteDot, { backgroundColor: c }, tempHex.toLowerCase() === c && { borderWidth: 2, borderColor: THEME.textPrimary }]}
                    onPress={() => setTempHex(c)}
                  />
                ))}
              </View>

              <View style={s.sheetBtns}>
                <TouchableOpacity style={[s.cancelBtn, { backgroundColor: THEME.bgInput }]} onPress={() => setColorPickerVisible(false)}>
                  <Text style={[s.cancelBtnText, { color: THEME.textSecondary }]}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, { backgroundColor: THEME.accent }]} onPress={submitColor}>
                  <Text style={s.saveBtnText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

const useStyles = (THEME) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
  },
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.bgHover,
    borderRadius: 16,
  },
  closeBtnText: { color: THEME.textMuted, fontWeight: 'bold' },
  body: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 12,
    marginTop: 8,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  presetCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  presetDots: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  presetMockup: {
    height: 48, borderRadius: 6, flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)'
  },
  presetMockupSidebar: { width: 14 },
  presetMockupBubble: { height: 6, borderRadius: 3 },
  presetInfo: { marginTop: 10 },
  presetName: { fontSize: 13, fontWeight: '700' },
  presetDesc: { fontSize: 10 },
  activeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  colorsList: {
    backgroundColor: THEME.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  colorLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  colorSwatch: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  resetBtn: {
    backgroundColor: THEME.bgHover,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  resetBtnText: {
    color: THEME.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: THEME.bgSecondary,
    gap: 12,
  },
  footerCancel: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8,
  },
  footerCancelText: { color: THEME.textSecondary, fontWeight: '700' },
  footerSave: {
    backgroundColor: THEME.accent,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
  },
  footerSaveText: { color: '#fff', fontWeight: '700' },

  // Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 },
  pickerSheet: { borderRadius: 16, padding: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  fieldInput: { borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1.5, marginBottom: 12 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  paletteDot: { width: 44, height: 44, borderRadius: 22 },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
