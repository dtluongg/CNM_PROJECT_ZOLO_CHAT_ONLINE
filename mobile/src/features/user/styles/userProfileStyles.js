import { StyleSheet } from 'react-native';
import { THEME } from '../../../theme';

export const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bgPrimary
  },

  header: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: {
    fontSize: 32,
    color: THEME.textPrimary,
    lineHeight: 36,
    fontWeight: '300'
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    textAlign: 'center'
  },

  banner: {
    width: '100%',
    height: 120
  },
  bannerGradient: {
    position: 'absolute',
    top: 48 + 56,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },

  avatarFloatRow: {
    paddingHorizontal: 16,
    marginTop: -46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarRing: {
    borderRadius: 50,
    borderWidth: 4,
    backgroundColor: THEME.bgSecondary,
    padding: 2,
  },
  statusBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusBubbleText: {
    fontSize: 12,
    fontWeight: '700'
  },

  nameBlock: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2
  },
  handle: {
    fontSize: 13,
    color: THEME.textMuted
  },
  statusTextLine: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: 'italic',
    marginTop: 4
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16
  },
  actionBtn: {
    flex: 1,
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionBtnPrimary: {
    backgroundColor: THEME.accent,
    borderColor: THEME.accent
  },
  actionBtnIcon: {
    fontSize: 20
  },
  actionBtnLabel: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  ownActionRow: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  ownActionBtn: {
    backgroundColor: 'rgba(237,66,69,0.12)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(237,66,69,0.35)',
    flexDirection: 'row',
    gap: 8,
  },
  ownActionBtnIcon: {
    fontSize: 18
  },
  ownActionBtnText: {
    color: '#ed4245',
    fontSize: 13,
    fontWeight: '700'
  },

  section: {
    paddingHorizontal: 12,
    marginBottom: 12
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bioCard: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    padding: 14
  },
  bioText: {
    color: THEME.textSecondary,
    fontSize: 14,
    lineHeight: 21
  },

  infoCard: {
    backgroundColor: THEME.bgSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 14
  },
  infoSep: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 10
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  infoRowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center'
  },
  infoLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 1
  },
  infoValue: {
    fontSize: 14,
    color: THEME.textPrimary,
    fontWeight: '600'
  },
  verifyBox: {
    gap: 6,
    marginTop: 2
  },
  verifyText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '600'
  },
});