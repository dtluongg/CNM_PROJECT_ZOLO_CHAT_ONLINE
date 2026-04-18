import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import PollDetailsModal from './PollDetailsModal';
import VotePollModal from './VotePollModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PollMessage = ({ message, currentUserId, onVote, THEME, isPinned }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  
  const payload = message.payload || {};
  const { topic, options = [], multipleChoice = false, isClosed = false } = payload;

  const totalVoters = new Set(
    (options || []).flatMap(opt => opt.voterIds?.map(v => (v?._id || v || '').toString()) || [])
  ).size;

  const totalVotes = (options || []).reduce((sum, opt) => sum + (opt.voterIds?.length || 0), 0);

  const userVotes = (options || []).filter(opt => 
    opt.voterIds?.some(v => (v?._id || v || '').toString() === (currentUserId || '').toString())
  ).map(opt => opt.id);

  const userVoted = userVotes.length > 0;

  if (!topic || !options) return null;

  return (
    <View style={[styles.container, { backgroundColor: THEME.bgSecondary, borderColor: THEME.border }]}>
      {/* Pinned Label */}
      {isPinned && (
        <View style={{ 
          flexDirection: 'row', alignItems: 'center', 
          marginBottom: 8, paddingBottom: 6, 
          borderBottomWidth: 1, borderBottomColor: THEME.border,
          opacity: 0.9
        }}>
          <Text style={{ fontSize: 10, marginRight: 4 }}>📌</Text>
          <Text style={{ 
            fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
            color: THEME.accent
          }}>Ghim tin nhắn</Text>
        </View>
      )}

      {/* Topic Header */}
      <Text style={[styles.topic, { color: THEME.textPrimary }]}>{topic}</Text>
      <Text style={[styles.subtitle, { color: THEME.textMuted }]}>
        {multipleChoice ? 'Chọn nhiều phương án' : 'Chọn 1 phương án'}
      </Text>

      {/* Summary */}
      <TouchableOpacity 
        onPress={() => totalVoters > 0 && setShowDetails(true)}
        style={styles.summaryRow}
        activeOpacity={0.7}
      >
        <Text style={[styles.summaryText, { color: THEME.accent }]}>
          {totalVoters} người bình chọn
        </Text>
        <Text style={{ color: THEME.accent, fontSize: 16 }}> › </Text>
      </TouchableOpacity>

      {/* Options List */}
      <View style={styles.optionsList}>
        {options.map((opt) => {
          const voteCount = opt.voterIds?.length || 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = userVotes.includes(opt.id);

          return (
            <View key={opt.id} style={styles.optionContainer}>
              <View style={[
                styles.optionBubble, 
                { 
                  backgroundColor: isSelected ? THEME.accent + '12' : THEME.bgTertiary,
                  borderColor: isSelected ? THEME.accent : 'transparent'
                }
              ]}>
                {/* Progress Bar (Only if userVoted) */}
                {userVoted && (
                  <View style={[
                    styles.progressBar, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: isSelected ? THEME.accent + '15' : 'rgba(0,0,0,0.03)' 
                    }
                  ]} />
                )}

                <View style={styles.optionContent}>
                   <Text style={[
                     styles.optionText, 
                     { 
                       color: isSelected ? THEME.accent : THEME.textPrimary,
                       fontWeight: isSelected ? '700' : '500'
                     }
                   ]}>
                     {opt.text}
                   </Text>
                </View>

                {userVoted && isSelected && (
                  <Text style={[styles.checkIcon, { color: THEME.accent }]}>✓</Text>
                )}
              </View>

              {userVoted && (
                <Text style={[
                  styles.voteCount, 
                  { color: voteCount > 0 ? THEME.textPrimary : THEME.textMuted }
                ]}>
                  {voteCount}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Main Action */}
      <TouchableOpacity 
        style={[
          styles.mainButton, 
          { borderColor: THEME.accent, borderWidth: 1.5 },
          userVoted ? { backgroundColor: 'transparent' } : { backgroundColor: THEME.accent + '08' }
        ]}
        onPress={() => !isClosed && setShowVoteModal(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.mainButtonText, { color: THEME.accent }]}>
          {userVoted ? 'Đổi lựa chọn' : 'Bình chọn'}
        </Text>
      </TouchableOpacity>

      <PollDetailsModal 
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        topic={topic}
        options={options}
        THEME={THEME}
      />

      <VotePollModal 
        visible={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        topic={topic}
        options={options}
        multipleChoice={multipleChoice}
        userVotes={userVotes}
        THEME={THEME}
        onVote={(data) => onVote && onVote(data)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH * 0.9,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  topic: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  optionsList: {
    marginBottom: 16,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  optionBubble: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1
  },
  optionText: {
    fontSize: 14,
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  voteCount: {
    fontSize: 13.5,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },
  mainButton: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mainButtonText: {
    fontSize: 14,
    fontWeight: '800',
  }
});

export default PollMessage;
