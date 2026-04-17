import { StyleSheet } from 'react-native';

// Tất cả style dùng chung trong màn hình chat
const useStyles = (THEME) =>
  StyleSheet.create({
    // ── Avatar ──────────────────────────────────────────────────────────
    avatarCircle: { justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: '700' },
    onlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      borderWidth: 2,
      borderColor: THEME.bgSecondary,
    },

    // ── Thanh header ─────────────────────────────────────────────────────
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.bgSecondary,
      borderBottomWidth: 1,
      borderBottomColor: THEME.border,
      paddingHorizontal: 4,
    },
    backBtn: { padding: 12 },
    backArrow: { fontSize: 22, color: THEME.accent, fontWeight: '700' },
    headerName: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary },
    headerStatus: { fontSize: 11 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerBtn: { padding: 10 },

    // ── Phần giới thiệu đầu cuộc trò chuyện ─────────────────────────────
    introBox: {
      padding: 24,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: THEME.border,
      marginBottom: 8,
    },
    introAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    introInitials: { color: '#fff', fontWeight: '800', fontSize: 22 },
    introName: {
      fontSize: 20,
      fontWeight: '800',
      color: THEME.textPrimary,
      marginBottom: 4,
      marginTop: 10,
    },
    introStatus: {
      fontSize: 13,
      marginBottom: 6,
      fontWeight: '500',
    },
    introDesc: {
      fontSize: 14,
      color: THEME.textMuted,
      lineHeight: 20,
      textAlign: 'center',
    },

    // ── Đường phân cách ngày ─────────────────────────────────────────────
    dateDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 12,
      paddingHorizontal: 16,
    },
    dateLine: { flex: 1, height: 1, backgroundColor: THEME.border },
    dateLabel: {
      fontSize: 11,
      color: THEME.textMuted,
      fontWeight: '600',
      paddingHorizontal: 8,
    },

    // ── Bong bóng tin nhắn ───────────────────────────────────────────────
    msgRow: { paddingHorizontal: 12, paddingVertical: 2, alignItems: 'flex-start' },
    msgContent: { maxWidth: '80%', flex: 1 },
    msgHeader: { gap: 6, alignItems: 'baseline', marginBottom: 3 },
    senderName: { fontSize: 13, fontWeight: '700' },
    msgTime: { fontSize: 10, color: THEME.textMuted },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 2,
      elevation: 1,
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },

    // ── Tổng hợp reaction (emoji) hiển thị dưới tin nhắn ────────────────
    reactionSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: THEME.bgSecondary,
      borderWidth: 1,
      borderColor: THEME.border,
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 2,
      position: 'absolute',
      bottom: -12,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 2,
    },
    reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    reactionEmoji: { fontSize: 13 },
    reactionCount: { fontSize: 11, fontWeight: '700', color: THEME.textMuted },

    // ── Trạng thái đã xem / đã gửi ──────────────────────────────────────
    seenText: {
      fontSize: 10,
      color: THEME.textMuted,
      alignSelf: 'flex-end',
      marginTop: 2,
      marginRight: 2,
    },
    seenAvatars: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      marginTop: 4,
      marginRight: 2,
    },
    miniAvatar: {
      width: 14,
      height: 14,
      borderRadius: 7,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: THEME.bgSecondary,
    },
    miniAvatarImg: { width: '100%', height: '100%' },
    seenCount: { fontSize: 9, color: THEME.textMuted, marginLeft: 2 },

    // ── Ảnh & file đính kèm ──────────────────────────────────────────────
    imgAttachment: { width: 220, height: 160, borderRadius: 8 },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    // ── Bộ chọn emoji ────────────────────────────────────────────────────
    emojiPicker: {
      backgroundColor: THEME.bgSecondary,
      borderTopWidth: 1,
      borderTopColor: THEME.border,
      padding: 10,
    },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    emojiBtn: {
      width: '11.5%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 6,
    },
    emojiChar: { fontSize: 22 },

    // ── Thanh nhập tin nhắn ──────────────────────────────────────────────
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: THEME.bgSecondary,
      borderTopWidth: 1,
      borderTopColor: THEME.border,
    },
    inputBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputBtnIcon: { fontSize: 22, color: THEME.textMuted },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: THEME.bgInput,
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 6,
      minHeight: 40,
    },
    textInput: {
      flex: 1,
      color: THEME.textPrimary,
      fontSize: 16,
      maxHeight: 100,
      paddingVertical: 4,
    },
    emojiToggle: { paddingBottom: 4, justifyContent: 'flex-end' },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: THEME.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },

    // ── Thanh ghi âm ─────────────────────────────────────────────────────
    recordingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: THEME.bgSecondary,
      borderTopWidth: 1,
      borderTopColor: '#ed4245',
    },
    recordingDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#ed4245',
    },
    recordingTimer: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ed4245',
      letterSpacing: 1,
      minWidth: 48,
    },

    // ── Action sheet (menu khi giữ tin nhắn) ────────────────────────────
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: THEME.bgSecondary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: THEME.bgHover,
      borderRadius: 2,
      alignSelf: 'center',
      marginVertical: 12,
    },
    reactRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: THEME.border,
    },
    reactBtn: { padding: 8, borderRadius: 10 },
    reactEmoji: { fontSize: 30 },
    sheetAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sheetActionIcon: { fontSize: 20 },
    sheetActionLabel: { fontSize: 16, color: THEME.textPrimary, fontWeight: '500' },

    // ── Thanh chỉnh sửa tin nhắn ─────────────────────────────────────────
    editBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: THEME.bgSecondary,
      borderTopWidth: 1,
      borderTopColor: THEME.accent,
    },
    editLabel: { fontSize: 12, fontWeight: '700', color: THEME.accent, marginBottom: 2 },
    editContent: { fontSize: 13, color: THEME.textMuted },
  });

export default useStyles;