import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, ScrollView, Animated, Alert, Dimensions,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

// Tải DateTimePicker an toàn: nếu native module 'RNCDatePicker' chưa được
// build vào binary (vd: dev client cũ / Expo Go thiếu module) thì require sẽ
// ném lỗi ngay khi import. Bọc try/catch để KHÔNG làm sập cả app lúc khởi
// động — tính năng nhắc hẹn sẽ tự fallback thay vì crash.
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  console.warn('[CreateReminderModal] DateTimePicker native module unavailable:', e?.message);
  DateTimePicker = null;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CreateReminderModal = ({ visible, onClose, onCreate, THEME, isGroup }) => {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPickerMode, setShowPickerMode] = useState(null); // 'date', 'time', or null
  const [trayAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  // Theme Sync
  const colors = THEME || {
    bgPrimary: '#111214',
    bgSecondary: '#1e1f22',
    textPrimary: '#ffffff',
    textMuted: '#949ba4',
    accent: '#0084ff',
    border: '#2e3035',
    inputBg: '#1e1f22'
  };

  // Animate Tray
  useEffect(() => {
    if (showPickerMode) {
      Animated.spring(trayAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40
      }).start();
    } else {
      Animated.timing(trayAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [showPickerMode]);

  const handleCreate = () => {
    if (!content.trim()) return;

    if (date <= new Date()) {
      Alert.alert(t('common.error'), t('poll.error_future_reminder'));
      return;
    }

    onCreate({
      content: content.trim(),
      reminderTime: date.toISOString()
    });
    setContent('');
    setDate(new Date());
    onClose();
  };

  const onPickerChange = (event, selectedDate) => {
    if (selectedDate) {
      const newDate = new Date(date);
      if (showPickerMode === 'date') {
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
      } else if (showPickerMode === 'time') {
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
      }
      setDate(newDate);
    }
    if (Platform.OS === 'android') setShowPickerMode(null);
  };

  const formatDate = (d) => {
    return d.toLocaleDateString(t('common.edit') === 'Sửa' ? 'vi-VN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatTime = (d) => {
    return d.toLocaleTimeString(t('common.edit') === 'Sửa' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.container, { backgroundColor: colors.bgPrimary }]}
          >
            {/* Header Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
                  <Feather name="bell" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{t('reminder.create_title')}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Content Input */}
              <InputField label={t('reminder.content_label')} colors={colors}>
                {/* Minimalist Input: No Background */}
                <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.mainInput, { color: colors.textPrimary }]}
                    placeholder={t('reminder.content_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={content}
                    onChangeText={setContent}
                    multiline
                  />
                </View>
              </InputField>

              {/* Selection Cards (Minimalist: No Background) */}
              <View style={styles.cardContainer}>
                <TouchableOpacity
                  onPress={() => setShowPickerMode('date')}
                  style={[styles.smallCard, { borderColor: colors.border }]}
                >
                  <View style={[styles.cardIcon]}>
                    <Feather name="calendar" size={16} color="#949ba4" />
                  </View>
                  <View>
                    <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{t('reminder.date_label')}</Text>
                    <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{formatDate(date)}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowPickerMode('time')}
                  style={[styles.smallCard, { borderColor: colors.border }]}
                >
                  <View style={[styles.cardIcon, {}]}>
                    <Feather name="clock" size={16} color="#949ba4" />
                  </View>
                  <View>
                    <Text style={[styles.cardLabel, { color: colors.textMuted }]}>{t('reminder.time_label')}</Text>
                    <Text style={[styles.cardValue, { color: colors.textPrimary }]}>{formatTime(date)}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={[styles.infoBox, { backgroundColor: `${colors.accent}15` }]}>
                {/* <Feather name="info" size={14} color={colors.accent} /> */}
                <Text style={[styles.infoText, { color: colors.accent }]}>
                  {t('reminder.hint_desc')}
                </Text>
              </View>
            </ScrollView>

            {/* Premium Footer (Poll Style) */}
            <View style={[styles.footer, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
              <View style={styles.footerRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.secondaryBtn, { backgroundColor: colors.bgSecondary }]}
                  onPress={onClose}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>{t('common.cancel') === 'Hủy' ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.accent, shadowColor: colors.accent },
                    (!content.trim()) && { backgroundColor: `${colors.accent}30`, shadowOpacity: 0 }
                  ]}
                  onPress={handleCreate}
                  disabled={!content.trim()}
                >
                  <Text style={[styles.primaryBtnText, !content.trim() && { color: 'rgba(255,255,255,0.4)' }]}>{t('reminder.create_btn')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CUSTOM SELECTION TRAY (Perfect Centering) */}
            {showPickerMode && (
              <Animated.View style={[
                styles.tray,
                { backgroundColor: colors.bgPrimary, transform: [{ translateY: trayAnim }] }
              ]}>
                <View style={styles.trayHeader}>
                  <Text style={[styles.trayTitle, { color: colors.textPrimary }]}>
                    {showPickerMode === 'date' ? t('reminder.date_label') : t('reminder.time_label')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPickerMode(null)}
                    style={styles.trayAction}
                  >
                    <Text style={styles.doneBtn}>{t('common.understood') === 'Đã hiểu' ? 'Xong' : 'Done'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerWrapper}>
                  {DateTimePicker ? (
                    <DateTimePicker
                      value={date}
                      mode={showPickerMode}
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onPickerChange}
                      minimumDate={new Date()}
                      textColor={colors.textPrimary}
                      themeVariant={colors.bgPrimary === '#ffffff' ? 'light' : 'dark'}
                    />
                  ) : (
                    // Fallback khi thiếu native module: nút chọn nhanh để vẫn
                    // dùng được tính năng mà không cần build lại ngay.
                    <View style={{ paddingVertical: 12, gap: 10 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
                        {showPickerMode === 'date'
                          ? '+ ngày kể từ hôm nay'
                          : '+ giờ kể từ bây giờ'}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {(showPickerMode === 'date' ? [1, 2, 3, 7] : [1, 3, 6, 12]).map((n) => (
                          <TouchableOpacity
                            key={n}
                            onPress={() => {
                              const next = new Date(date);
                              if (showPickerMode === 'date') next.setDate(next.getDate() + n);
                              else next.setHours(next.getHours() + n);
                              setDate(next);
                            }}
                            style={{
                              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                              backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent + '55',
                            }}
                          >
                            <Text style={{ color: colors.accent, fontWeight: '700' }}>
                              +{n} {showPickerMode === 'date' ? 'ngày' : 'giờ'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const InputField = ({ label, children, colors }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{label}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingTop: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 24,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
  },
  mainInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  cardContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  smallCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // TRAY STYLES (Perfect Centering)
  tray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 1000,
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the title
    paddingHorizontal: 24,
    marginBottom: 20,
    position: 'relative',
    height: 40,
  },
  trayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  trayAction: {
    position: 'absolute',
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  doneBtn: {
    color: '#0084ff',
    fontSize: 17,
    fontWeight: '600',
  },
  pickerWrapper: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center', // Center the spinner
  }
});

export default CreateReminderModal;