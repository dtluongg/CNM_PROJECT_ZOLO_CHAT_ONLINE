import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, 
  ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const VotePollModal = ({ visible, onClose, topic, options, multipleChoice, onVote, userVotes, THEME }) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(new Set());
  const [newOptions, setNewOptions] = useState([]);
  const [selectedNew, setSelectedNew] = useState(new Set());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      setSelected(new Set(userVotes || []));
      setNewOptions([]);
      setSelectedNew(new Set());
      setInputValue('');
    }
  }, [visible]); // Chỉ reset khi mở modal, không reset khi server update dở dang

  const handleToggleOption = (optionId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        if (!multipleChoice) {
          next.clear();
          setSelectedNew(new Set());
        }
        next.add(optionId);
      }
      return next;
    });
  };

  const handleToggleNewOption = (optText) => {
    setSelectedNew(prev => {
      const next = new Set(prev);
      if (next.has(optText)) {
        next.delete(optText);
      } else {
        if (!multipleChoice) {
          next.clear();
          setSelected(new Set());
        }
        next.add(optText);
      }
      return next;
    });
  };

  const handleAddNewOption = () => {
    const val = inputValue.trim();
    if (val) {
      // Nếu text đã tồn tại trong danh sách chính thức
      const existing = options.find(o => o.text.toLowerCase() === val.toLowerCase());
      if (existing) {
        handleToggleOption(existing.id);
        setInputValue('');
        return;
      }

      // Nếu text đã tồn tại trong danh sách tạm (mới thêm)
      if (newOptions.includes(val)) {
        setInputValue('');
        return;
      }

      setNewOptions([...newOptions, val]);
      if (!multipleChoice) {
        setSelected(new Set());
        setSelectedNew(new Set([val]));
      } else {
        // Giữ nguyên selected cũ, chỉ thêm tích chọn cho option vừa thêm
        setSelectedNew(prev => new Set([...prev, val]));
      }
      setInputValue('');
    }
  };

  const handleConfirm = () => {
    if (onVote) {
      onVote({
        optionIds: Array.from(selected),
        newOptions: newOptions,
        votedNewOptions: Array.from(selectedNew)
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.modal, { backgroundColor: THEME.bgSecondary }]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: THEME.border }]}>
               <Text style={[styles.title, { color: THEME.textPrimary }]}>{t('poll.vote')}</Text>
               <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                 <Text style={{ color: THEME.textMuted, fontSize: 18 }}>✕</Text>
               </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
               <View style={{ marginBottom: 20 }}>
                 <Text style={[styles.topic, { color: THEME.textPrimary }]}>{topic}</Text>
                 <Text style={[styles.subtitle, { color: THEME.textMuted }]}>
                   {multipleChoice ? t('poll.multi_choice') : t('poll.option_placeholder', { index: 1 }).replace(' 1', '').replace('1', '')}
                 </Text>
               </View>

               <View style={styles.optionsList}>
                 {/* Existing */}
                 {options.map((opt) => {
                    const isSelected = selected.has(opt.id);
                    return (
                      <TouchableOpacity 
                        key={opt.id}
                        onPress={() => handleToggleOption(opt.id)}
                        style={[
                          styles.optionItem, 
                          { backgroundColor: isSelected ? THEME.accent + '10' : THEME.bgTertiary },
                          isSelected && { borderColor: THEME.accent, borderWidth: 1.5 }
                        ]}
                      >
                         <View style={[
                           styles.checkbox, 
                           { borderColor: isSelected ? THEME.accent : THEME.textMuted },
                           isSelected && { backgroundColor: THEME.accent }
                         ]}>
                           {isSelected && <Text style={styles.checkmark}>✓</Text>}
                         </View>
                         <Text style={[
                           styles.optionText, 
                           { color: isSelected ? THEME.accent : THEME.textPrimary, fontWeight: isSelected ? '700' : '500' }
                         ]}>{opt.text}</Text>
                      </TouchableOpacity>
                    );
                 })}

                 {/* New */}
                 {newOptions.map((optText, i) => {
                    const isSelected = selectedNew.has(optText);
                    return (
                      <TouchableOpacity 
                        key={`new-${i}`}
                        onPress={() => handleToggleNewOption(optText)}
                        style={[
                          styles.optionItem, 
                          { backgroundColor: isSelected ? THEME.accent + '10' : THEME.bgTertiary },
                          isSelected && { borderColor: THEME.accent, borderWidth: 1.5 }
                        ]}
                      >
                         <View style={[
                           styles.checkbox, 
                           { borderColor: isSelected ? THEME.accent : THEME.textMuted },
                           isSelected && { backgroundColor: THEME.accent }
                         ]}>
                           {isSelected && <Text style={styles.checkmark}>✓</Text>}
                         </View>
                         <Text style={[
                           styles.optionText, 
                           { color: isSelected ? THEME.accent : THEME.textPrimary, fontWeight: isSelected ? '700' : '500' }
                         ]}>{optText}</Text>
                         <TouchableOpacity onPress={() => {
                            setNewOptions(newOptions.filter((_, idx) => idx !== i));
                            setSelectedNew(prev => {
                              const next = new Set(prev);
                              next.delete(optText);
                              return next;
                            });
                         }}>
                            <Text style={{ color: '#ed4245', fontSize: 16 }}>✕</Text>
                         </TouchableOpacity>
                      </TouchableOpacity>
                    );
                 })}
               </View>

               {/* Add Input */}
               <View style={[styles.inputRow, { backgroundColor: THEME.bgTertiary }]}>
                  <TextInput 
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder={t('poll.option_placeholder', { index: '' }).trim() + '...'}
                    placeholderTextColor={THEME.textMuted}
                    style={[styles.input, { color: THEME.textPrimary }]}
                  />
                  <TouchableOpacity onPress={handleAddNewOption} style={[styles.addBtn, { backgroundColor: THEME.accent + '15' }]}>
                    <Text style={{ color: THEME.accent, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
               </View>
               <View style={{ height: 40 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: THEME.border }]}>
               <TouchableOpacity onPress={onClose} style={[styles.footerBtn, { backgroundColor: THEME.bgTertiary }]}>
                 <Text style={{ color: THEME.textPrimary, fontWeight: '700' }}>{t('common.cancel')}</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={handleConfirm}
                 style={[
                   styles.footerBtn, 
                   { backgroundColor: THEME.accent }
                 ]}
               >
                 <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.confirm')}</Text>
               </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modal: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden'
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1
  },
  title: {
    fontSize: 19,
    fontWeight: '800'
  },
  closeBtn: {
    padding: 5
  },
  content: {
    padding: 20
  },
  topic: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600'
  },
  optionsList: {
    gap: 12
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 15,
    gap: 12
  },
  optionText: {
    flex: 1,
    fontSize: 15
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  inputRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 15,
    paddingLeft: 16
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1
  },
  footerBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default VotePollModal;
