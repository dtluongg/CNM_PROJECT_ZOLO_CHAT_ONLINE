import React, { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Switch
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const CreatePollModal = ({ visible, onClose, onCreate, THEME }) => {
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
              <Text style={[styles.title, { color: THEME.textPrimary }]}>Tạo bình chọn</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll}>
              <Text style={[styles.label, { color: THEME.textMuted }]}>CHỦ ĐỀ BÌNH CHỌN</Text>
              <TextInput
                style={[styles.input, { backgroundColor: THEME.bgTertiary, color: THEME.textPrimary }]}
                placeholder="Nhập chủ đề..."
                placeholderTextColor={THEME.textMuted}
                value={topic}
                onChangeText={setTopic}
                multiline
              />

              <Text style={[styles.label, { color: THEME.textMuted, marginTop: 20 }]}>CÁC LỰA CHỌN</Text>
              {options.map((opt, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, { backgroundColor: THEME.bgTertiary, color: THEME.textPrimary, flex: 1, marginBottom: 0 }]}
                    placeholder={`Lựa chọn ${index + 1}`}
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
                <TouchableOpacity onPress={handleAddOption} style={styles.addBtn}>
                  <Text style={{ color: THEME.accent, fontWeight: '700' }}>+ Thêm lựa chọn</Text>
                </TouchableOpacity>
              )}

              {/* Toggle Chọn nhiều */}
              <View style={[styles.switchContainer, { backgroundColor: THEME.bgTertiary, borderColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: THEME.textPrimary }]}>Chọn nhiều phương án</Text>
                  <Text style={[styles.switchSubtitle, { color: THEME.textMuted }]}>Cho phép bầu chọn nhiều mục</Text>
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
                <Text style={{ color: THEME.textPrimary }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleCreate} 
                disabled={!topic.trim() || options.filter(o => o.trim()).length < 2}
                style={[styles.btn, { backgroundColor: THEME.accent, opacity: (!topic.trim() || options.filter(o => o.trim()).length < 2) ? 0.5 : 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tạo bình chọn</Text>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 30,
    maxHeight: '85%',
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
    borderColor: THEME.accent + '4D', // 0.3 opacity
    marginTop: 8,
    backgroundColor: THEME.accent + '0D', // 0.05 opacity
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
