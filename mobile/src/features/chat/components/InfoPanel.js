import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  Modal, Pressable, ScrollView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Avatar from './Avatar';
import CallHistoryTab from '../../call/components/CallHistoryTab';

/**
 * Panel thông tin cuộc trò chuyện (mở bằng nút 3 chấm trên header).
 * Gồm 3 tab: Thông tin, Ảnh đã chia sẻ, File đã chia sẻ.
 * Hỗ trợ chặn / bỏ chặn người dùng trong chat đơn.
 *
 * @param {boolean}  visible         - Có hiển thị không
 * @param {function} onClose         - Callback đóng panel
 * @param {string}   infoTab         - Tab đang chọn: 'info' | 'media' | 'files'
 * @param {function} onTabChange     - Callback khi đổi tab
 * @param {object}   conversation    - Thông tin cuộc hội thoại
 * @param {boolean}  isOnline        - Trạng thái online của người kia
 * @param {object}   mediaData       - { images: [], files: [] }
 * @param {boolean}  loadingMedia    - Đang tải media hay không
 * @param {object}   blockStatus     - { iBlocked, theyBlockedMe }
 * @param {boolean}  blockConfirm    - Đang hiển thị xác nhận chặn
 * @param {function} onBlockConfirm  - Callback mở/đóng confirm chặn
 * @param {boolean}  blockBusy       - Đang xử lý API chặn
 * @param {function} onBlockUser     - Callback thực hiện chặn / bỏ chặn
 * @param {function} onImagePress    - Callback xem ảnh toàn màn hình
 * @param {function} onFilePress     - Callback tải file
 * @param {function} onViewProfile   - Callback xem hồ sơ người dùng
 */
const InfoPanel = ({
  visible,
  onClose,
  infoTab,
  onTabChange,
  conversation,
  isOnline,
  mediaData,
  loadingMedia,
  blockStatus,
  blockConfirm,
  onBlockConfirm,
  blockBusy,
  onBlockUser,
  onImagePress,
  onFilePress,
  onViewProfile,
  THEME,
  styles,
}) => {
  const tabs = [
    { key: 'info',  label: 'Thông tin' },
    { key: 'media', label: 'Ảnh' },
    { key: 'files', label: 'File' },
        ...(conversation?.type === 'dm' ? [{ key: 'calls', label: 'Cuộc gọi' }] : []),

  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View
          style={[styles.sheet, { maxHeight: '85%', flex: 1 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sheetHandle} />

          {/* Avatar + Tên */}
          <View style={{ alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 }}>
            <Avatar
              name={conversation.name}
              avatar={conversation.avatar}
              size={72}
              online={isOnline}
              THEME={THEME}
              styles={styles}
            />
            <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.textPrimary, marginTop: 10 }}>
              {conversation.name}
            </Text>
            {conversation.type === 'dm' && (
              <Text style={{ fontSize: 12, color: isOnline ? THEME.statusOnline : THEME.textMuted, marginTop: 2 }}>
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </Text>
            )}
          </View>

          {/* Thanh tab */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 16,
              backgroundColor: THEME.bgPrimary,
              borderRadius: 8,
              padding: 3,
              marginBottom: 12,
            }}
          >
            {tabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => onTabChange(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 6,
                  alignItems: 'center',
                  backgroundColor: infoTab === t.key ? THEME.bgSecondary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: infoTab === t.key ? '700' : '500',
                    color: infoTab === t.key ? THEME.textPrimary : THEME.textMuted,
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1 }}
                  showsVerticalScrollIndicator={false}
                >

            {/* ── Tab Thông tin ── */}
            {infoTab === 'info' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                <View
                  style={{
                    backgroundColor: THEME.bgPrimary,
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}
                >
                  {/* Loại cuộc hội thoại */}
                  <View
                    style={{
                      padding: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: THEME.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 13, color: THEME.textMuted }}>Loại</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.textPrimary }}>
                      {conversation.type === 'dm' ? 'Tin nhắn trực tiếp' : 'Nhóm chat'}
                    </Text>
                  </View>

                  {/* Liên kết xem hồ sơ (chỉ chat đơn) */}
                  {conversation.type === 'dm' && conversation.otherUserId && (
                    <TouchableOpacity
                      style={{
                        padding: 14,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onPress={onViewProfile}
                    >
                      <Text style={{ fontSize: 13, color: THEME.textMuted }}>Xem hồ sơ</Text>
                      <Text style={{ fontSize: 13, color: THEME.accent, fontWeight: '600' }}>→</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Chặn / bỏ chặn (chỉ chat đơn) */}
                {conversation.type === 'dm' && conversation.otherUserId && (
                  <>
                    {blockStatus?.iBlocked ? (
                      // Đã chặn → nút bỏ chặn
                      <TouchableOpacity
                        onPress={onBlockUser}
                        disabled={blockBusy}
                        style={{
                          backgroundColor: THEME.bgHover,
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: THEME.border,
                          opacity: blockBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>✅</Text>
                        <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 15 }}>
                          {blockBusy ? 'Đang xử lý...' : `Bỏ chặn ${conversation.name}`}
                        </Text>
                      </TouchableOpacity>
                    ) : !blockConfirm ? (
                      // Chưa chặn → nút chặn
                      <TouchableOpacity
                        onPress={() => onBlockConfirm(true)}
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 14,
                          alignItems: 'center',
                          flexDirection: 'row',
                          gap: 10,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.3)',
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>🚫</Text>
                        <Text style={{ color: '#ed4245', fontWeight: '700', fontSize: 15 }}>
                          Chặn {conversation.name}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      // Xác nhận chặn
                      <View
                        style={{
                          backgroundColor: 'rgba(237,66,69,0.12)',
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: 'rgba(237,66,69,0.4)',
                        }}
                      >
                        <Text style={{ color: THEME.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>
                          Xác nhận chặn {conversation.name}?
                        </Text>
                        <Text style={{ color: THEME.textMuted, fontSize: 12, marginBottom: 14 }}>
                          Bạn sẽ không thể gửi tin nhắn cho người này.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => onBlockConfirm(false)}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: THEME.bgHover,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: THEME.textPrimary, fontWeight: '600' }}>Hủy</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={onBlockUser}
                            disabled={blockBusy}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              backgroundColor: '#ed4245',
                              alignItems: 'center',
                              opacity: blockBusy ? 0.6 : 1,
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>
                              {blockBusy ? 'Đang chặn...' : 'Chặn'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* ── Tab Ảnh ── */}
            {infoTab === 'media' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {loadingMedia && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Đang tải...
                  </Text>
                )}
                {!loadingMedia && mediaData.images.length === 0 && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Chưa có ảnh nào được chia sẻ
                  </Text>
                )}
                {!loadingMedia && mediaData.images.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                    {mediaData.images.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => onImagePress(item.url)}
                        activeOpacity={0.85}
                        style={{ width: '32%', aspectRatio: 1, borderRadius: 6, overflow: 'hidden' }}
                      >
                        <Image
                          source={{ uri: item.url }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            borderRadius: 8,
                            padding: 3,
                          }}
                        >
                          <Feather name="zoom-in" size={10} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Tab File ── */}
            {infoTab === 'files' && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {loadingMedia && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Đang tải...
                  </Text>
                )}
                {!loadingMedia && mediaData.files.length === 0 && (
                  <Text style={{ color: THEME.textMuted, textAlign: 'center', marginVertical: 20 }}>
                    Chưa có file nào được chia sẻ
                  </Text>
                )}
                {!loadingMedia &&
                  mediaData.files.map((file) => (
                    <TouchableOpacity
                      key={file._id}
                      onPress={() => onFilePress(file.url, file.fileName)}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: THEME.bgPrimary,
                        borderRadius: 10,
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: THEME.border,
                      }}
                    >
                      {/* Icon loại file */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: THEME.accent + '18',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Feather
                          name={
                            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName || '') ? 'image' :
                            /\.(mp4|mov|avi|mkv)$/i.test(file.fileName || '') ? 'film' :
                            /\.(mp3|m4a|wav)$/i.test(file.fileName || '') ? 'music' :
                            /\.(pdf)$/i.test(file.fileName || '') ? 'file-text' :
                            /\.(zip|rar|7z)$/i.test(file.fileName || '') ? 'archive' :
                            'file'
                          }
                          size={20}
                          color={THEME.accent}
                        />
                      </View>

                      {/* Tên file + dung lượng */}
                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: THEME.textPrimary }}
                          numberOfLines={1}
                        >
                          {file.fileName || 'Không rõ tên'}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                          {file.fileSize ? `${(file.fileSize / 1024).toFixed(0)} KB` : ''} · Nhấn để tải
                        </Text>
                      </View>

                      {/* Nút download */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: THEME.accent + '18',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Feather name="download" size={16} color={THEME.accent} />
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
            {/* ── Tab Cuộc gọi ── */}
                        {infoTab === 'calls' && conversation?.type === 'dm' && (
                          <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                            <CallHistoryTab
                              otherUserId={conversation.otherUserId}
                              otherUserName={conversation.name}
                              otherUserAvatar={conversation.avatar}
                            />
                          </View>
                        )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

export default InfoPanel;