import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Switch, Dimensions
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

const CreatePollModal = ({ visible, onClose, onCreate, THEME }) => {
  const { t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOption = (text, index) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    if (!topic.trim()) return;
    const finalOptions = options.filter(opt => opt.trim() !== '');
    if (finalOptions.length < 2) return;

    onCreate({ 
      topic: topic.trim(), 
      options: finalOptions,
      multipleChoice
    });
    setTopic('');
    setOptions(['', '']);
    setMultipleChoice(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={[styles.content, { backgroundColor: THEME.bgSecondary }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: THEME.textPrimary }]}>{t('poll.create_title')}</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll}>
              <Text style={[styles.label, { color: THEME.textMuted }]}>{t('poll.topic_label')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: THEME.bgTertiary, color: THEME.textPrimary }]}
                placeholder={t('poll.topic_placeholder')}
                placeholderTextColor={THEME.textMuted}
                value={topic}
                onChangeText={setTopic}
                multiline
              />

              <Text style={[styles.label, { color: THEME.textMuted, marginTop: 20 }]}>{t('poll.options_label')}</Text>
              {options.map((opt, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, { backgroundColor: THEME.bgTertiary, color: THEME.textPrimary, flex: 1, marginBottom: 0 }]}
                    placeholder={t('poll.option_placeholder', { index: index + 1 })}
                    placeholderTextColor={THEME.textMuted}
                    value={opt}
                    onChangeText={(text) => handleUpdateOption(text, index)}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity 
                      onPress={() => handleRemoveOption(index)}
                      style={styles.removeBtn}
                    >
                      <Feather name="trash-2" size={20} color="#ed4245" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {options.length < 10 && (
                <TouchableOpacity 
                  onPress={handleAddOption} 
                  style={[
                    styles.addBtn, 
                    { 
                      borderColor: THEME.accent + '4D', 
                      backgroundColor: THEME.accent + '0D' 
                    }
                  ]}
                >
                  <Text style={{ color: THEME.accent, fontWeight: '700' }}>{t('poll.add_option')}</Text>
                </TouchableOpacity>
              )}

              {/* Toggle Chọn nhiều */}
              <View style={[styles.switchContainer, { backgroundColor: THEME.bgTertiary, borderColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: THEME.textPrimary }]}>{t('poll.multi_choice')}</Text>
                  <Text style={[styles.switchSubtitle, { color: THEME.textMuted }]}>{t('poll.multi_choice_desc')}</Text>
                </View>
                <Switch
                  value={multipleChoice}
                  onValueChange={setMultipleChoice}
                  trackColor={{ false: '#444', true: THEME.accent }}
                  thumbColor="#fff"
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                onPress={onClose} 
                style={[styles.btn, { backgroundColor: THEME.bgTertiary }]}
              >
                <Text style={{ color: THEME.textPrimary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleCreate} 
                disabled={!topic.trim() || options.filter(o => o.trim()).length < 2}
                style={[styles.btn, { backgroundColor: THEME.accent, opacity: (!topic.trim() || options.filter(o => o.trim()).length < 2) ? 0.5 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('poll.create_btn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
  },
  content: {
    borderTopLeftRadius: 30, // Đồng bộ với VotePollModal
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scroll: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  removeBtn: {
    padding: 8,
  },
  addBtn: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  btn: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default CreatePollModal;
