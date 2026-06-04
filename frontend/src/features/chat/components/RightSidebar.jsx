import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import apiClient from '../../../services/apiClient';
import { usePresence, formatLastSeen } from "../../../context/PresenceContext";
import { useNotifications } from "../../../context/NotificationContext";
import MuteConversationModal from './MuteConversationModal';
import {
    X, MessageCircle, BellOff, Ban, LogOut, Download,
    Phone, Video, Shield, Crown, UserCog, Trash2, FileText, Camera, Save,
} from "lucide-react";

import conversationApi from "../api/conversationApi";
import MemberManagementModal from './MemberManagementModal';
import friendApi from "../../friends/api/friendApi";
import messageApi from "../api/messageApi";
import CallHistoryTab from "../../call/components/CallHistoryTab";
import SectionHeader from "./rightSidebar/ui/SectionHeader";
import ActionButton from "./rightSidebar/ui/ActionButton";
import RoleChip from "./rightSidebar/ui/RoleChip";
import AvatarDisplay from "./rightSidebar/ui/AvatarDisplay";
import TopicManager from "./rightSidebar/TopicManager";
import { getAvatarColor } from "./rightSidebar/utils/avatarUtils";
import { useLanguage } from "../../../context/LanguageContext";
import { translateLastMessage, translateTopicName } from "../../../utils/translationUtils";

export default function RightSidebar({
    conversation, onClose, onViewProfile, onLeaveGroup, onGroupUpdated,
    onDeleteConversation, onBlockToggled, onPhoneCall, onVideoCall,
    activeTopic, onTopicSelect, onTopicsChanged, myPermissions, onPermissionsChanged,
}) {
    const { t } = useLanguage();
    const [tab, setTab] = useState("info");
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showMuteModal, setShowMuteModal] = useState(false);
    const { isUserOnline, getPresenceStatus, getLastSeen } = usePresence();
    const { user } = useAuth();
    const { getConversationSetting, updateConversationSetting } = useNotifications();

    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberError, setMemberError] = useState("");
    const [friendPool, setFriendPool] = useState([]);
    const [selectedAddIds, setSelectedAddIds] = useState([]);
    const [loadingFriendPool, setLoadingFriendPool] = useState(false);
    const [dmFriendState, setDmFriendState] = useState(null);
    const [editingMemberId, setEditingMemberId] = useState(null);
    const [editRole, setEditRole] = useState("member");
    const [editCanSend, setEditCanSend] = useState(true);
    const [editCanInvite, setEditCanInvite] = useState(true);
    const [editCanManage, setEditCanManage] = useState(false);
    const [busyAction, setBusyAction] = useState("");
    const [mediaData, setMediaData] = useState({ images: [], files: [] });
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [showNickname, setShowNickname] = useState(false);
    const [nicknameInput, setNicknameInput] = useState("");
    const [nicknameBusy, setNicknameBusy] = useState(false);
    const [notifSetting, setNotifSetting] = useState(null);
    const [notifBusy, setNotifBusy] = useState(false);

    // Group Settings State
    const [groupSettingsForm, setGroupSettingsForm] = useState({ name: '', groupType: 'general', description: '', inviteMode: 'open_invite' });
    const [groupAvatarFile, setGroupAvatarFile] = useState(null);
    const [groupAvatarPreview, setGroupAvatarPreview] = useState(null);
    const [savingGroupSettings, setSavingGroupSettings] = useState(false);
    const [savingGroupLock, setSavingGroupLock] = useState(false);
    const groupAvatarInputRef = React.useRef(null);
    const [joinRequestMsg, setJoinRequestMsg] = useState('');
    const [joinRequestBusy, setJoinRequestBusy] = useState(false);
    const [joinRequestSent, setJoinRequestSent] = useState(false);
    const [friendsToInvite, setFriendsToInvite] = useState([]);
    const [selectedFriendId, setSelectedFriendId] = useState('');

    const GROUP_TYPE_LABEL_T = {
        study:   t('auth.group_types.study'),
        gaming:  t('auth.group_types.gaming'),
        general: t('auth.group_types.general'),
        project: t('auth.group_types.project'),
        other:   t('auth.group_types.other'),
        sensitive: t('auth.group_types.sensitive'),
    };

    const INVITE_MODE_LABEL_T = {
        open_invite: t('right_sidebar.invite_modes.open_invite'),
        approval_required: t('right_sidebar.invite_modes.approval_required'),
        admin_only: t('right_sidebar.invite_modes.admin_only'),
    };

    const INVITE_MODE_HINT_T = {
        open_invite: t('right_sidebar.invite_mode_hint.open_invite'),
        approval_required: t('right_sidebar.invite_mode_hint.approval_required'),
        admin_only: t('right_sidebar.invite_mode_hint.admin_only'),
    };

    const myUserId = (user?._id || user?.id || "").toString();
    const accentColor = conversation?.usernameColor || getAvatarColor(conversation?.name);

    const isOnline = conversation?.otherUserId
        ? isUserOnline(conversation.otherUserId)
        : (conversation?.online ?? false);

    const presStatus = conversation?.otherUserId
        ? getPresenceStatus(conversation.otherUserId) || (isOnline ? "online" : null)
        : isOnline ? conversation?.status || "online" : null;

    const myMember = useMemo(
        () => members.find((m) => (m.user?._id || "").toString() === myUserId),
        [members, myUserId],
    );

    const canManageMembers = !!myMember && (
        myMember.role === "owner" || myMember.role === "admin" || myMember.canManageMembers
    );
    const canInviteMembers = !!myMember && (
        myMember.role === "owner" ||
        myMember.role === "admin" ||
        myPermissions?.globalPermissions?.canInviteMembers === true
    );
    const isOwner = myMember?.role === "owner";
    const isAdmin = myMember?.role === 'admin';

    // ── Helper to translate hardcoded backend strings ────────────────────────
    const translateTopicContent = (val) => translateTopicName(val, t);
    const inviteMode = conversation?.inviteMode || 'open_invite';
    const canOpenDirectInviteSection = canInviteMembers && (inviteMode !== 'admin_only' || isOwner || isAdmin);

    // Load Members
    const loadMembers = useCallback(async () => {
        if (!conversation?.id || conversation.type !== "group") return;
        try {
            setLoadingMembers(true);
            setMemberError("");
            const res = await conversationApi.getConversationMembers(conversation.id, false);
            setMembers(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (error) {
            setMemberError(error.response?.data?.message || t('right_sidebar.loading_members_error', { defaultValue: "Không thể tải danh sách thành viên" }));
            setMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    }, [conversation?.id, conversation?.type, t]);

    // Load Friend Pool
    const loadFriendPool = useCallback(async () => {
        if (!conversation?.id || conversation.type !== "group" || !canInviteMembers) return;
        try {
            setLoadingFriendPool(true);
            const res = await friendApi.getFriendList();
            const list = res?.data?.success ? res.data.data || [] : [];
            const activeMemberIds = new Set(members.map((m) => (m.user?._id || "").toString()));
            setFriendPool(list.filter((f) => !activeMemberIds.has((f.friendId || "").toString())));
        } catch {
            setFriendPool([]);
        } finally {
            setLoadingFriendPool(false);
        }
    }, [canInviteMembers, conversation?.id, conversation?.type, members]);

    // Load DM Friend State
    const loadDmFriendState = useCallback(async () => {
        if (!conversation?.otherUserId) { setDmFriendState(null); return; }
        try {
            const res = await friendApi.getFriendList(true);
            const list = res?.data?.success ? res.data.data || [] : [];
            const state = list.find((item) => (item.friendId || "").toString() === conversation.otherUserId);
            setDmFriendState(state || null);
        } catch {
            setDmFriendState(null);
        }
    }, [conversation?.otherUserId]);

    const handleSendJoinRequest = async () => {
        if (!selectedFriendId) { window.alert(t('right_sidebar.select_intro_error', { defaultValue: 'Vui lòng chọn người muốn giới thiệu' })); return; }
        setJoinRequestBusy(true);
        try {
            await apiClient.post(`/conversations/${conversation.id}/join-requests`, {
                targetUserId: selectedFriendId,
                message: joinRequestMsg.trim(),
            });
            setJoinRequestSent(true);
            setJoinRequestMsg('');
            setSelectedFriendId('');
        } catch (err) {
            window.alert(err.response?.data?.message || t('common.error'));
        } finally {
            setJoinRequestBusy(false);
        }
    };

    // Effects
    useEffect(() => {
        if (conversation?.type === 'group') {
            setGroupSettingsForm({
                name: conversation.name || '',
                groupType: conversation.groupType || 'general',
                description: conversation.raw?.description || conversation.description || '',
                inviteMode: conversation.inviteMode || 'open_invite',
            });
            setGroupAvatarFile(null);
            setGroupAvatarPreview(null);
        }
    }, [conversation?.id, conversation?.type]);

    useEffect(() => {
        setEditingMemberId(null);
        setSelectedAddIds([]);
        setMediaData({ images: [], files: [] });
    }, [conversation?.id]);

    useEffect(() => {
        if ((tab !== "media" && tab !== "files") || !conversation?.id) return;
        setLoadingMedia(true);
        messageApi.getAttachments(conversation.id)
            .then((res) => setMediaData(res.data || { images: [], files: [] }))
            .catch(() => setMediaData({ images: [], files: [] }))
            .finally(() => setLoadingMedia(false));
    }, [tab, conversation?.id]);

    useEffect(() => {
        if (!conversation?.id || conversation.type !== 'group' || canInviteMembers) return;
        friendApi.getFriendList()
            .then(res => {
                const list = res?.data?.success ? res.data.data || [] : [];
                const activeMemberIds = new Set(members.map(m => (m.user?._id || '').toString()));
                setFriendsToInvite(list.filter(f => !activeMemberIds.has((f.friendId || '').toString())));
            })
            .catch(() => setFriendsToInvite([]));
    }, [conversation?.id, canInviteMembers, members]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    useEffect(() => {
        if (conversation?.type === "dm") loadDmFriendState();
        else setDmFriendState(null);
    }, [conversation?.type, loadDmFriendState]);

    useEffect(() => { loadFriendPool(); }, [loadFriendPool]);

    useEffect(() => {
        let mounted = true;
        const loadSetting = async () => {
            if (!conversation?.id) { if (mounted) setNotifSetting(null); return; }
            try {
                const setting = await getConversationSetting(conversation.id);
                if (mounted) setNotifSetting(setting);
            } catch { if (mounted) setNotifSetting(null); }
        };
        loadSetting();
        return () => { mounted = false; };
    }, [conversation?.id, getConversationSetting]);

    // Handlers
    const handleToggleAddMember = (userId) => {
        setSelectedAddIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleAddMembers = async () => {
        if (!conversation.id || selectedAddIds.length === 0) return;
        try {
            setBusyAction("add-members");
            const res = await conversationApi.addConversationMembers(conversation.id, selectedAddIds, joinRequestMsg.trim());
            const msg = res?.data?.message || '';
            if (msg.toLowerCase().includes('chờ admin') || msg.toLowerCase().includes('yêu cầu')) {
                window.alert(msg);
                setJoinRequestSent(true);
            }
            setSelectedAddIds([]);
            setJoinRequestMsg('');
            await loadMembers();
            await loadFriendPool();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const startEditMember = (member) => {
        setEditingMemberId((member.user?._id || "").toString());
        setEditRole(member.role || "member");
        setEditCanSend(!!member.canSendMessages);
        setEditCanInvite(!!member.canInviteMembers);
        setEditCanManage(!!member.canManageMembers);
    };

    const saveEditMember = async () => {
        if (!conversation.id || !editingMemberId) return;
        try {
            setBusyAction(`edit-${editingMemberId}`);
            await conversationApi.updateConversationMember(conversation.id, editingMemberId, {
                role: editRole,
                canSendMessages: editCanSend,
                canInviteMembers: editCanInvite,
                canManageMembers: editCanManage,
            });
            setEditingMemberId(null);
            await loadMembers();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const handleKickMember = async (member) => {
        const memberId = (member.user?._id || "").toString();
        if (!memberId) return;
        if (!window.confirm(t('right_sidebar.kick_confirm', { name: member.user?.displayName || "thành viên" }))) return;
        try {
            setBusyAction(`kick-${memberId}`);
            await conversationApi.kickConversationMember(conversation.id, memberId);
            await loadMembers();
            await loadFriendPool();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const handleTransferOwner = async (member) => {
        const targetId = (member.user?._id || "").toString();
        if (!targetId) return;
        if (!window.confirm(t('right_sidebar.transfer_confirm', { name: member.user?.displayName || "thành viên" }))) return;
        try {
            setBusyAction(`transfer-${targetId}`);
            await conversationApi.transferConversationOwner(conversation.id, targetId);
            await loadMembers();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const handleDisbandGroup = async () => {
        if (!conversation.id) return;
        if (!window.confirm(t('right_sidebar.disband_confirm', { defaultValue: "Bạn chắc chắn muốn giải tán nhóm?" }))) return;
        try {
            setBusyAction("disband");
            await conversationApi.disbandConversation(conversation.id);
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const handleBlockUser = async () => {
        const targetUserId = conversation?.otherUserId;
        if (!targetUserId) return;
        const confirmed = window.confirm(
            dmFriendState?.iBlocked ? t('right_sidebar.unblock_confirm') : t('right_sidebar.block_confirm')
        );
        if (!confirmed) return;
        try {
            setBusyAction("block-user");
            const res = await friendApi.blockFriend(targetUserId);
            window.alert(res?.data?.message || t('common.success'));
            await loadDmFriendState();
            onBlockToggled?.();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setBusyAction("");
        }
    };

    const handleSaveNickname = async () => {
        if (!conversation.otherUserId) return;
        setNicknameBusy(true);
        try {
            await friendApi.updateNickname(conversation.otherUserId, nicknameInput.trim());
            setShowNickname(false);
            if (onGroupUpdated) onGroupUpdated();
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setNicknameBusy(false);
        }
    };

    const handleToggleMuteConversation = async () => {
        if (!conversation?.id) return;
        const nextMuted = !(notifSetting?.isMuted === true);
        try {
            setNotifBusy(true);
            // Gọi API cập nhật
            const updated = await updateConversationSetting(conversation.id, {
                isMuted: nextMuted,
                muteUntil: null,
            });

            // 1. Cập nhật giao diện nút bấm ở thanh bên phải (Code cũ của bạn)
            setNotifSetting(updated || { ...notifSetting, isMuted: nextMuted });

            // 2. Ép dữ liệu gốc (để xóa cái chuông đi)
            if (conversation && conversation.raw) {
                conversation.raw.isMuted = nextMuted;
            }

            // 3. Gọi hàm load lại danh sách ngầm
            if (onGroupUpdated) {
                onGroupUpdated();
            }

        } catch (error) {
            window.alert(error?.response?.data?.message || t('common.error'));
        } finally {
            setNotifBusy(false);
        }
    };

    const handleSaveGroupSettings = async () => {
        if (!conversation?.id) return;
        try {
            setSavingGroupSettings(true);
            let avatarUrl = conversation.avatar || '';
            if (groupAvatarFile) {
                const fd = new FormData();
                fd.append('file', groupAvatarFile);
                const uploadRes = await messageApi.uploadImage(fd);
                avatarUrl = uploadRes?.data?.file?.url || uploadRes?.data?.data?.url || uploadRes?.data?.url || avatarUrl;
            }
            await conversationApi.updateGroupInfo(conversation.id, {
                name: groupSettingsForm.name.trim(),
                groupType: groupSettingsForm.groupType,
                inviteMode: groupSettingsForm.inviteMode,
                description: groupSettingsForm.description,
                avatar: avatarUrl,
            });
            if (onGroupUpdated) await onGroupUpdated();
            window.alert(t('right_sidebar.group_updated_alert', { defaultValue: 'Đã cập nhật thông tin nhóm' }));
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setSavingGroupSettings(false);
        }
    };

    const handleToggleGroupLock = async () => {
        if (!conversation?.id || !isOwner) return;
        const nextLockState = !conversation.isLocked;
        try {
            setSavingGroupLock(true);
            await conversationApi.setConversationLock(conversation.id, nextLockState);
            if (onGroupUpdated) await onGroupUpdated();
            window.alert(nextLockState ? t('right_sidebar.locked_alert', { defaultValue: 'Đã khóa nhóm. Member chỉ có thể xem.' }) : t('right_sidebar.unlocked_alert', { defaultValue: 'Đã mở khóa nhóm. Member có thể gửi lại.' }));
        } catch (error) {
            window.alert(error.response?.data?.message || t('common.error'));
        } finally {
            setSavingGroupLock(false);
        }
    };

    if (!conversation) return null;

    return (
        <div style={{ width: 280, minWidth: 280, height: "100%", background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                    {conversation.type === "dm" ? t('right_sidebar.user_info') : t('right_sidebar.group_info')}
                </span>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px 6px", borderRadius: 6 }}>
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "var(--bg-hover) transparent" }}>
                <AvatarDisplay
                    conversation={conversation} accentColor={accentColor}
                    isOnline={isOnline} presStatus={presStatus}
                    getLastSeen={getLastSeen} formatLastSeen={formatLastSeen}
                />

                {/* Tab Navigation */}
                <div style={{ display: "flex", gap: 2, margin: "0 12px 12px", background: "var(--bg-primary)", borderRadius: 8, padding: 3 }}>
                    {[
                        { key: "info", label: t('right_sidebar.tab_info') },
                        ...(conversation?.type === "group" ? [{ key: "topics", label: t('right_sidebar.tab_channels') }] : []),
                        { key: "media", label: t('right_sidebar.tab_media') },
                        { key: "files", label: t('right_sidebar.tab_files') },
                        ...(conversation?.type === "dm" ? [{ key: "calls", label: t('right_sidebar.tab_calls') }] : []),
                        ...(conversation?.type === "group" && canManageMembers ? [{ key: "settings", label: t('right_sidebar.tab_settings') }] : []),
                    ].map((t) => (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            flex: 1, background: tab === t.key ? "var(--bg-secondary)" : "none",
                            border: "none", cursor: "pointer",
                            color: tab === t.key ? "var(--text-primary)" : "var(--text-muted)",
                            fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                            padding: "5px 4px", borderRadius: 6,
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: "0 12px 12px" }}>

                    {/* ==================== TAB INFO ==================== */}
                    {tab === "info" && (
                        <div>
                            {/* Thông tin cuộc trò chuyện */}
                            <div style={{ marginBottom: 16 }}>
                                <SectionHeader title={t('right_sidebar.conv_info_title')} />
                                <div style={{ background: "var(--bg-tertiary)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.type')}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                            {conversation.type === "dm" ? t('right_sidebar.dm') : t('right_sidebar.group')}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.latest_msg')}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", maxWidth: 140, textAlign: "right" }}>
                                            {translateLastMessage(conversation.lastMessage, t) || t('right_sidebar.no_msgs')}
                                        </span>
                                    </div>
                                    {conversation.type === "group" && (
                                        <>
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('chat.members_count')}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                                                    {t('chat.members_count_val', { count: members.length || conversation.memberCount || conversation.members || 0 })}
                                                </span>
                                            </div>
                                            {conversation.groupType && (
                                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.group_type')}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {GROUP_TYPE_LABEL_T[conversation.groupType] || conversation.groupType}
                                                    </span>
                                                </div>
                                            )}
                                            {conversation.inviteMode && (
                                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.invite_mode')}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {INVITE_MODE_LABEL_T[conversation.inviteMode] || conversation.inviteMode}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.group_status')}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: conversation.isLocked ? '#ed4245' : '#57f287' }}>
                                                    {conversation.isLocked ? t('right_sidebar.locked') : t('right_sidebar.unlocked')}
                                                </span>
                                            </div>
                                            {conversation.description && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t('right_sidebar.description')}</span>
                                                    <span style={{ fontSize: 12, color: "var(--text-primary)", fontStyle: "italic" }}>{conversation.description}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Vai trò của bạn — mọi thành viên đều thấy */}
                            {conversation.type === "group" && myMember && (() => {
                                const roleCfg = {
                                    owner:  { label: t('member_management.roles.owner'),  icon: <Crown size={12} />, color: '#faa61a' },
                                    admin:  { label: t('member_management.roles.admin'),  icon: <Shield size={12} />, color: '#5865f2' },
                                    member: { label: t('member_management.roles.member'), icon: <UserCog size={12} />, color: 'var(--text-muted)' },
                                }[myMember.role] || { label: myMember.role, icon: null, color: 'var(--text-muted)' };
                                const customRole = myMember.customRoleId && typeof myMember.customRoleId === 'object'
                                    ? myMember.customRoleId : null;
                                return (
                                    <div style={{ marginBottom: 16 }}>
                                        <SectionHeader title={t('right_sidebar.your_role')} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: roleCfg.color, background: 'var(--bg-hover)', borderRadius: 20, padding: '3px 10px' }}>
                                                {roleCfg.icon}{roleCfg.label}
                                            </span>
                                            {customRole && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: customRole.color, background: customRole.color + '20', border: `1px solid ${customRole.color}44`, borderRadius: 20, padding: '3px 10px' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: customRole.color }} />
                                                    {customRole.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Thành viên nhóm - preview */}
                            {conversation.type === "group" && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {t('right_sidebar.group_members')}
                                            {members.length > 0 && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#3ba55c', textTransform: 'none', letterSpacing: 0 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ba55c' }} />
                                                    {members.filter(mm => isUserOnline((mm.user?._id || '').toString())).length}
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => setShowMemberModal(true)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}>
                                            {t('right_sidebar.view_all', { count: members.length || 0 })}
                                        </button>
                                    </div>
                                    {loadingMembers ? (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('right_sidebar.loading')}</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {members.slice(0, 3).map((m) => {
                                                const uid = (m.user?._id || '').toString();
                                                const rc = { owner: { label: '👑' }, admin: { label: '🛡️' }, member: { label: '' } };
                                                const role = rc[m.role] || rc.member;
                                                const customRole = m.customRoleId && typeof m.customRoleId === 'object' ? m.customRoleId : null;
                                                const memberOnline = isUserOnline(uid);
                                                return (
                                                    <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                                                        <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                                                        {m.user?.avatar
                                                            ? <img src={m.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                                            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{(m.user?.displayName || '?')[0].toUpperCase()}</div>
                                                        }
                                                        <span style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: memberOnline ? '#3ba55c' : '#80848e', border: '2px solid var(--bg-tertiary)' }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {m.user?.displayName || 'Unknown'}
                                                                {uid === myUserId && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{t('right_sidebar.you')}</span>}
                                                            </span>
                                                            {customRole && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 10, fontWeight: 700, color: customRole.color, background: customRole.color + '20', border: `1px solid ${customRole.color}44`, borderRadius: 10, padding: '1px 7px' }}>
                                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: customRole.color }} />
                                                                    {customRole.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: 12, flexShrink: 0 }}>{role.label}</span>
                                                    </div>
                                                );
                                            })}
                                            {members.length > 3 && (
                                                <button onClick={() => setShowMemberModal(true)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 8px' }}>
                                                    {t('right_sidebar.other_members', { count: members.length - 3 })}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Giới thiệu thành viên - member không có quyền mời, không phải admin_only */}
                            {conversation.type === 'group' && !canInviteMembers && myMember && myMember.role === 'member' && inviteMode !== 'admin_only' && (
                                <div style={{ marginBottom: 16 }}>
                                    <SectionHeader title={t('right_sidebar.intro_members')} />
                                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                                        {joinRequestSent ? (
                                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                                <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                                                <div style={{ fontSize: 13, color: '#57f287', fontWeight: 600 }}>{t('right_sidebar.request_sent')}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('right_sidebar.wait_admin')}</div>
                                                <button onClick={() => setJoinRequestSent(false)} style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    {t('right_sidebar.intro_others')}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    {t('right_sidebar.no_invite_perm')}
                                                </div>
                                                <select value={selectedFriendId} onChange={e => setSelectedFriendId(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginBottom: 8, boxSizing: 'border-box' }}>
                                                    <option value=''>{t('right_sidebar.select_intro')}</option>
                                                    {friendsToInvite.map(f => (
                                                        <option key={f.friendId} value={f.friendId}>{f.displayName || f.friendName}</option>
                                                    ))}
                                                </select>
                                                {friendsToInvite.length === 0 && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('right_sidebar.no_friends_intro')}</div>
                                                )}
                                                <textarea value={joinRequestMsg} onChange={e => setJoinRequestMsg(e.target.value)} placeholder={t('right_sidebar.intro_reason')} rows={2}
                                                    style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: 8 }}
                                                />
                                                <button onClick={handleSendJoinRequest} disabled={joinRequestBusy || !selectedFriendId}
                                                    style={{ width: '100%', padding: '8px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: (joinRequestBusy || !selectedFriendId) ? 0.6 : 1 }}>
                                                    {joinRequestBusy ? t('right_sidebar.sending') : t('right_sidebar.send_intro')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Admin Only notice */}
                            {conversation.type === 'group' && myMember && myMember.role === 'member' && inviteMode === 'admin_only' && (
                                <div style={{ marginBottom: 16 }}>
                                    <SectionHeader title={t('right_sidebar.add_member')} />
                                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        {t('right_sidebar.admin_only_mode')}
                                    </div>
                                </div>
                            )}

                            {/* Thêm thành viên trực tiếp — owner/admin */}
                            {conversation.type === 'group' && canOpenDirectInviteSection && (
                                <div style={{ marginBottom: 16 }}>
                                    <SectionHeader title={inviteMode === 'approval_required' && myMember?.role === 'member' ? t('right_sidebar.suggest_member') : t('right_sidebar.add_member')} />
                                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--border)' }}>
                                        {inviteMode === 'approval_required' && myMember?.role === 'member' && (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                {t('right_sidebar.approval_required_hint')}
                                            </div>
                                        )}
                                        {loadingFriendPool ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('right_sidebar.loading')}</div>
                                        ) : friendPool.length === 0 ? (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('right_sidebar.no_friends_add')}</div>
                                        ) : (
                                            <>
                                                <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
                                                    {friendPool.map(f => {
                                                        const fid = (f.friendId || '').toString();
                                                        const checked = selectedAddIds.includes(fid);
                                                        return (
                                                            <div key={fid} onClick={() => handleToggleAddMember(fid)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', background: checked ? 'rgba(88,101,242,0.12)' : 'transparent', marginBottom: 2 }}>
                                                                <div style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`, background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                                                                </div>
                                                                {f.avatar
                                                                    ? <img src={f.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                                                    : <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(f.displayName || '?')[0].toUpperCase()}</div>
                                                                }
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.displayName || f.friendName}</div>
                                                                    {f.email && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</div>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {inviteMode === 'approval_required' && myMember?.role === 'member' && (
                                                    <textarea value={joinRequestMsg} onChange={e => setJoinRequestMsg(e.target.value)} placeholder={t('right_sidebar.intro_reason')} rows={2}
                                                        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, padding: '7px 10px', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                                    />
                                                )}
                                                <button onClick={handleAddMembers} disabled={selectedAddIds.length === 0 || busyAction === 'add-members'}
                                                    style={{ width: '100%', padding: '8px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: (selectedAddIds.length === 0 || busyAction === 'add-members') ? 0.5 : 1 }}>
                                                    {busyAction === 'add-members' ? t('right_sidebar.processing')
                                                        : (inviteMode === 'approval_required' && myMember?.role === 'member')
                                                            ? (selectedAddIds.length > 0 ? t('right_sidebar.send_intro') + ` (${selectedAddIds.length})` : t('right_sidebar.send_intro'))
                                                            : selectedAddIds.length > 0 ? t('right_sidebar.add_count', { count: selectedAddIds.length }) : t('right_sidebar.add_member')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Hành động */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <SectionHeader title={t('right_sidebar.actions')} />
                                <ActionButton icon={<MessageCircle size={15} />} label={t('right_sidebar.message')} variant="primary" onClick={() => {}} />
                                {conversation.type === "dm" && onViewProfile && (
                                    <ActionButton icon={<Shield size={15} />} label={t('right_sidebar.view_profile')} onClick={() => onViewProfile(conversation.otherUserId)} />
                                )}
                                <ActionButton icon={<Phone size={15} />} label={t('right_sidebar.voice_call')} onClick={conversation?.type === "dm" ? onPhoneCall : undefined} />
                                <ActionButton icon={<Video size={15} />} label={t('right_sidebar.video_call')} onClick={conversation?.type === "dm" ? onVideoCall : undefined} />
                                <ActionButton
                                    icon={<BellOff size={15} />}
                                    label={notifSetting?.isMuted ? t('right_sidebar.notif_on') : t('right_sidebar.notif_off')}
                                    onClick={() => { if (notifSetting?.isMuted) handleToggleMuteConversation(); else setShowMuteModal(true); }}
                                    disabled={notifBusy}
                                />
                                {conversation.type === "dm" && (
                                    <>
                                        <ActionButton icon={<Trash2 size={15} />} label={t('right_sidebar.delete_conv')} variant="danger" onClick={() => onDeleteConversation?.(conversation.id)} />
                                        <ActionButton icon={<Shield size={15} />} label={t('right_sidebar.set_nickname')} onClick={() => { setNicknameInput(""); setShowNickname(true); }} />
                                        <ActionButton icon={<Ban size={15} />} label={dmFriendState?.iBlocked ? t('right_sidebar.unblock_user') : t('right_sidebar.block_user')} variant="danger" onClick={handleBlockUser} disabled={busyAction === "block-user" || !conversation.otherUserId} />
                                    </>
                                )}
                                {conversation.type === "group" && (
                                    <ActionButton icon={<LogOut size={15} />} label={t('right_sidebar.leave_group')} variant="danger" onClick={() => onLeaveGroup?.(conversation.id)} disabled={busyAction === "disband"} />
                                )}
                                {conversation.type === "group" && isOwner && (
                                    <ActionButton icon={<Trash2 size={15} />} label={t('right_sidebar.disband_group')} variant="danger" onClick={handleDisbandGroup} disabled={busyAction === "disband"} />
                                )}
                            </div>

                            {/* Nickname inline panel */}
                            {showNickname && conversation.type === "dm" && (
                                <div style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginTop: 8 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                                        {t('right_sidebar.nickname_for', { name: conversation.name })}
                                    </div>
                                    <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()} placeholder={t('right_sidebar.enter_nickname')} maxLength={50}
                                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-primary)", color: "var(--text-primary)", padding: "8px 10px", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box" }}
                                    />
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => setShowNickname(false)} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 7, background: "var(--bg-hover)", color: "var(--text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{t('right_sidebar.cancel')}</button>
                                        <button onClick={handleSaveNickname} disabled={nicknameBusy} style={{ flex: 1, padding: "7px 0", border: "none", borderRadius: 7, background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: nicknameBusy ? 0.6 : 1 }}>
                                            {nicknameBusy ? t('right_sidebar.saving') : t('right_sidebar.save')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== TAB MEDIA ==================== */}
                    {tab === "media" && (
                        <div>
                            <SectionHeader title={t('right_sidebar.shared_media')} />
                            {loadingMedia && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{t('right_sidebar.loading')}</p>}
                            {!loadingMedia && mediaData.images.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{t('right_sidebar.no_media')}</p>}
                            {!loadingMedia && mediaData.images.length > 0 && (
                                <>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                                        {mediaData.images.map((item) => (
                                            <a key={item._id} href={item.url} target="_blank" rel="noreferrer" style={{ aspectRatio: "1", borderRadius: 6, overflow: "hidden", display: "block", background: "var(--bg-hover)" }}>
                                                <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            </a>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>{t('right_sidebar.media_count', { count: mediaData.images.length })}</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ==================== TAB FILES ==================== */}
                    {tab === "files" && (
                        <div>
                            <SectionHeader title={t('right_sidebar.shared_files')} />
                            {loadingMedia && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{t('right_sidebar.loading')}</p>}
                            {!loadingMedia && mediaData.files.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>{t('right_sidebar.no_files')}</p>}
                            {!loadingMedia && mediaData.files.map((file) => (
                                <div key={file._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4, background: "var(--bg-tertiary)" }}>
                                    <span style={{ flexShrink: 0, color: "#5865f2", display: "flex", alignItems: "center" }}><FileText size={22} /></span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.fileName}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{file.fileSize ? `${(file.fileSize / 1024).toFixed(0)} KB` : ""}</div>
                                    </div>
                                    {file.url && (
                                        <a href={file.url} target="_blank" rel="noreferrer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, display: "flex" }}>
                                            <Download size={14} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ==================== TAB TOPICS ==================== */}
                    {tab === "topics" && conversation?.type === "group" && (
                        <div>
                            <TopicManager
                                conversation={conversation}
                                canManage={canManageMembers}
                                activeTopic={activeTopic}
                                onTopicSelect={onTopicSelect}
                                onTopicsChanged={onTopicsChanged}
                            />
                        </div>
                    )}

                    {/* ==================== TAB SETTINGS ==================== */}
                    {tab === "settings" && conversation?.type === "group" && canManageMembers && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <SectionHeader title={t('right_sidebar.group_settings')} />

                            {/* Avatar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div onClick={() => groupAvatarInputRef.current?.click()} title={t('right_sidebar.change_avatar')}
                                    style={{ width: 60, height: 60, borderRadius: '50%', flexShrink: 0, background: groupAvatarPreview || conversation.avatar ? 'transparent' : 'var(--bg-hover)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                                    {(groupAvatarPreview || conversation.avatar)
                                        ? <img src={groupAvatarPreview || conversation.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Camera size={20} style={{ color: 'var(--text-muted)' }} />
                                    }
                                </div>
                                <input ref={groupAvatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }}
                                    onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setGroupAvatarFile(file); setGroupAvatarPreview(URL.createObjectURL(file)); }}
                                />
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('right_sidebar.change_avatar_hint')}</div>
                            </div>

                            {/* Name */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{t('right_sidebar.group_name')}</div>
                                <input value={groupSettingsForm.name} onChange={(e) => setGroupSettingsForm((p) => ({ ...p, name: e.target.value }))} placeholder={t('right_sidebar.group_name_placeholder')}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px', outline: 'none', fontSize: 13 }}
                                />
                            </div>

                            {/* Group type */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{t('right_sidebar.group_type')}</div>
                                <select value={groupSettingsForm.groupType} onChange={(e) => setGroupSettingsForm((p) => ({ ...p, groupType: e.target.value }))}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px', outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                                    {[
                                        { value: 'general', label: t('auth.group_types.general') },
                                        { value: 'study', label: t('auth.group_types.study') },
                                        { value: 'gaming', label: t('auth.group_types.gaming') },
                                        { value: 'project', label: t('auth.group_types.project') },
                                        { value: 'other', label: t('auth.group_types.other') },
                                        { value: 'sensitive', label: t('auth.group_types.sensitive') },
                                    ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            {/* Invite mode */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{t('right_sidebar.invite_mode')}</div>
                                <select value={groupSettingsForm.inviteMode} onChange={(e) => setGroupSettingsForm((p) => ({ ...p, inviteMode: e.target.value }))}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px', outline: 'none', fontSize: 13, cursor: 'pointer' }}>
                                    <option value='open_invite'>{t('right_sidebar.invite_modes.open_invite')}</option>
                                    <option value='approval_required'>{t('right_sidebar.invite_modes.approval_required')}</option>
                                    <option value='admin_only'>{t('right_sidebar.invite_modes.admin_only')}</option>
                                </select>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{INVITE_MODE_HINT_T[groupSettingsForm.inviteMode]}</div>
                            </div>

                            {/* Description */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{t('right_sidebar.group_desc')}</div>
                                <textarea value={groupSettingsForm.description} onChange={(e) => setGroupSettingsForm((p) => ({ ...p, description: e.target.value }))} placeholder={t('right_sidebar.group_desc_placeholder')} maxLength={200} rows={3}
                                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 10px', outline: 'none', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{groupSettingsForm.description.length}/200</div>
                            </div>

                            {/* Group lock */}
                            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{t('right_sidebar.lock_chat')}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('right_sidebar.lock_hint')}</div>
                                    </div>
                                    <button onClick={handleToggleGroupLock} disabled={!isOwner || savingGroupLock}
                                        style={{ minWidth: 92, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: (!isOwner || savingGroupLock) ? 'not-allowed' : 'pointer', background: conversation.isLocked ? '#57f287' : '#ed4245', color: conversation.isLocked ? '#000' : '#fff', fontSize: 12, fontWeight: 700, opacity: (!isOwner || savingGroupLock) ? 0.6 : 1 }}>
                                        {savingGroupLock ? t('right_sidebar.processing') : conversation.isLocked ? t('right_sidebar.unlock_btn') : t('right_sidebar.lock_btn')}
                                    </button>
                                </div>
                                {!isOwner && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{t('right_sidebar.only_owner_lock')}</div>}
                            </div>

                            <button onClick={handleSaveGroupSettings} disabled={savingGroupSettings || !groupSettingsForm.name.trim()}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13, opacity: (savingGroupSettings || !groupSettingsForm.name.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Save size={14} />
                                {savingGroupSettings ? t('right_sidebar.saving') : t('right_sidebar.save_changes')}
                            </button>
                        </div>
                    )}

                    {/* ==================== TAB CALLS ==================== */}
                    {tab === "calls" && conversation?.type === "dm" && (
                        <div>
                            <SectionHeader title={t('right_sidebar.call_history')} />
                            <CallHistoryTab otherUserId={conversation.otherUserId} otherUserName={conversation.name} otherUserAvatar={conversation.avatar} />
                        </div>
                    )}

                </div>{/* end padding div */}
            </div>{/* end scrollable div */}

            {/* Modal tắt thông báo */}
            <MuteConversationModal
                isOpen={showMuteModal}
                onClose={() => setShowMuteModal(false)}
                conversationId={conversation?.id}
                onSuccess={() => {
                    console.log("Modal đã tắt thành công, đang cập nhật UI..."); // Thêm log để bắt bệnh

                    // 1. Cập nhật state nội bộ của Sidebar
                    setNotifSetting(prev => ({ ...prev, isMuted: true }));

                    // 2. Ép cập nhật dữ liệu raw để truyền ra ngoài
                    if (conversation && conversation.raw) {
                        conversation.raw.isMuted = true;
                    }

                    // 3. Đóng Modal
                    setShowMuteModal(false);

                    // 4. BÁO RA MÀN HÌNH NGOÀI LOAD LẠI DANH SÁCH (Cái này tạo ra cái chuông!)
                    if (onGroupUpdated) {
                        onGroupUpdated();
                    }
                }}
            />

            {/* Modal quản lý thành viên */}
            {showMemberModal && (
                <MemberManagementModal
                    visible={showMemberModal}
                    onClose={() => setShowMemberModal(false)}
                    conversation={conversation}
                    currentUserId={myUserId}
                    onRefresh={() => {
                        loadMembers();
                        if (onGroupUpdated) onGroupUpdated();
                        onPermissionsChanged?.();
                    }}
                />
            )}
        </div>
    );
}