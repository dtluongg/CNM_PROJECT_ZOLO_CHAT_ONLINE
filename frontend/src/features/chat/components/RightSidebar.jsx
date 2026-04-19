import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { usePresence, formatLastSeen } from "../../../context/PresenceContext";
import { useNotifications } from "../../../context/NotificationContext";
import MuteConversationModal from './MuteConversationModal';
import {
    X,
    MessageCircle,
    BellOff,
    Ban,
    LogOut,
    Download,
    Phone,
    Video,
    Shield,
    Crown,
    UserCog,
    Trash2,
    FileText,
} from "lucide-react";

import conversationApi from "../api/conversationApi";
import friendApi from "../../friends/api/friendApi";
import messageApi from "../api/messageApi";

import CallHistoryTab from "../../call/components/CallHistoryTab";

import SectionHeader from "./rightSidebar/ui/SectionHeader";
import ActionButton from "./rightSidebar/ui/ActionButton";
import RoleChip from "./rightSidebar/ui/RoleChip";
import AvatarDisplay from "./rightSidebar/ui/AvatarDisplay";

import { getAvatarColor } from "./rightSidebar/utils/avatarUtils";

export default function RightSidebar({
    conversation,
    onClose,
    onViewProfile,
    onLeaveGroup,
    onGroupUpdated,
    onDeleteConversation,
    onBlockToggled,
    onPhoneCall,
    onVideoCall,
}) {
    const [tab, setTab] = useState("info");
    const { isUserOnline, getPresenceStatus, getLastSeen } = usePresence();
    const { user } = useAuth();
    const { getConversationSetting, updateConversationSetting } =
        useNotifications();
    // State điều khiển Modal tắt thông báo
    const [showMuteModal, setShowMuteModal] = useState(false);
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

    const myUserId = (user?._id || user?.id || "").toString();
    const accentColor =
        conversation?.usernameColor || getAvatarColor(conversation?.name);

    const isOnline = conversation?.otherUserId
        ? isUserOnline(conversation.otherUserId)
        : (conversation?.online ?? false);

    const presStatus = conversation?.otherUserId
        ? getPresenceStatus(conversation.otherUserId) ||
        (isOnline ? "online" : null)
        : isOnline
            ? conversation?.status || "online"
            : null;

    const myMember = useMemo(
        () => members.find((m) => (m.user?._id || "").toString() === myUserId),
        [members, myUserId],
    );

    const canManageMembers =
        !!myMember &&
        (myMember.role === "owner" ||
            myMember.role === "admin" ||
            myMember.canManageMembers);
    const canInviteMembers =
        !!myMember && (myMember.role === "owner" || myMember.canInviteMembers);
    const isOwner = myMember?.role === "owner";

    // ── Load Members ─────────────────────────────────────
    const loadMembers = useCallback(async () => {
        if (!conversation?.id || conversation.type !== "group") return;
        try {
            setLoadingMembers(true);
            setMemberError("");
            const res = await conversationApi.getConversationMembers(
                conversation.id,
                false,
            );
            setMembers(Array.isArray(res?.data?.data) ? res.data.data : []);
        } catch (error) {
            setMemberError(
                error.response?.data?.message ||
                "Không thể tải danh sách thành viên",
            );
            setMembers([]);
        } finally {
            setLoadingMembers(false);
        }
    }, [conversation?.id, conversation?.type]);

    // ── Load Friend Pool ─────────────────────────────────
    const loadFriendPool = useCallback(async () => {
        if (
            !conversation?.id ||
            conversation.type !== "group" ||
            !canInviteMembers
        )
            return;
        try {
            setLoadingFriendPool(true);
            const res = await friendApi.getFriendList();
            const list = res?.data?.success ? res.data.data || [] : [];
            const activeMemberIds = new Set(
                members.map((m) => (m.user?._id || "").toString()),
            );
            setFriendPool(
                list.filter(
                    (f) => !activeMemberIds.has((f.friendId || "").toString()),
                ),
            );
        } catch {
            setFriendPool([]);
        } finally {
            setLoadingFriendPool(false);
        }
    }, [canInviteMembers, conversation?.id, conversation?.type, members]);

    // ── Load DM Friend State ─────────────────────────────
    const loadDmFriendState = useCallback(async () => {
        if (!conversation?.otherUserId) {
            setDmFriendState(null);
            return;
        }
        try {
            const res = await friendApi.getFriendList(true);
            const list = res?.data?.success ? res.data.data || [] : [];
            const state = list.find(
                (item) =>
                    (item.friendId || "").toString() ===
                    conversation.otherUserId,
            );
            setDmFriendState(state || null);
        } catch {
            setDmFriendState(null);
        }
    }, [conversation?.otherUserId]);

    // ── Effects ──────────────────────────────────────────
    useEffect(() => {
        setEditingMemberId(null);
        setSelectedAddIds([]);
        setMediaData({ images: [], files: [] });
    }, [conversation?.id]);

    useEffect(() => {
        if ((tab !== "media" && tab !== "files") || !conversation?.id) return;
        setLoadingMedia(true);
        messageApi
            .getAttachments(conversation.id)
            .then((res) => setMediaData(res.data || { images: [], files: [] }))
            .catch(() => setMediaData({ images: [], files: [] }))
            .finally(() => setLoadingMedia(false));
    }, [tab, conversation?.id]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    useEffect(() => {
        if (conversation?.type === "dm") {
            loadDmFriendState();
        } else {
            setDmFriendState(null);
        }
    }, [conversation?.type, loadDmFriendState]);

    useEffect(() => {
        loadFriendPool();
    }, [loadFriendPool]);

    useEffect(() => {
        let mounted = true;
        const loadSetting = async () => {
            if (!conversation?.id) {
                if (mounted) setNotifSetting(null);
                return;
            }
            try {
                const setting = await getConversationSetting(conversation.id);
                if (mounted) setNotifSetting(setting);
            } catch {
                if (mounted) setNotifSetting(null);
            }
        };
        loadSetting();
        return () => {
            mounted = false;
        };
    }, [conversation?.id, getConversationSetting]);

    // ── Handlers ─────────────────────────────────────────
    const handleToggleAddMember = (userId) => {
        setSelectedAddIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const handleAddMembers = async () => {
        if (!conversation.id || selectedAddIds.length === 0) return;
        try {
            setBusyAction("add-members");
            await conversationApi.addConversationMembers(
                conversation.id,
                selectedAddIds,
            );
            setSelectedAddIds([]);
            await loadMembers();
            await loadFriendPool();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể thêm thành viên",
            );
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
            const payload = {
                role: editRole,
                canSendMessages: editCanSend,
                canInviteMembers: editCanInvite,
                canManageMembers: editCanManage,
            };
            await conversationApi.updateConversationMember(
                conversation.id,
                editingMemberId,
                payload,
            );
            setEditingMemberId(null);
            await loadMembers();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message ||
                "Không thể cập nhật thành viên",
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleKickMember = async (member) => {
        const memberId = (member.user?._id || "").toString();
        if (!memberId) return;
        if (
            !window.confirm(
                `Kick ${member.user?.displayName || "thành viên"} khỏi nhóm?`,
            )
        )
            return;
        try {
            setBusyAction(`kick-${memberId}`);
            await conversationApi.kickConversationMember(
                conversation.id,
                memberId,
            );
            await loadMembers();
            await loadFriendPool();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể kick thành viên",
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleTransferOwner = async (member) => {
        const targetId = (member.user?._id || "").toString();
        if (!targetId) return;
        if (
            !window.confirm(
                `Chuyển owner cho ${member.user?.displayName || "thành viên"}?`,
            )
        )
            return;
        try {
            setBusyAction(`transfer-${targetId}`);
            await conversationApi.transferConversationOwner(
                conversation.id,
                targetId,
            );
            await loadMembers();
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể chuyển owner",
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleDisbandGroup = async () => {
        if (!conversation.id) return;
        if (!window.confirm("Bạn chắc chắn muốn giải tán nhóm?")) return;
        try {
            setBusyAction("disband");
            await conversationApi.disbandConversation(conversation.id);
            if (onGroupUpdated) await onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể giải tán nhóm",
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleBlockUser = async () => {
        const targetUserId = conversation?.otherUserId;
        if (!targetUserId) return;
        const confirmed = window.confirm(
            dmFriendState?.iBlocked
                ? "Bạn muốn bỏ chặn người dùng này?"
                : "Bạn muốn chặn người dùng này?",
        );
        if (!confirmed) return;
        try {
            setBusyAction("block-user");
            const res = await friendApi.blockFriend(targetUserId);
            window.alert(res?.data?.message || "Đã cập nhật trạng thái chặn");
            await loadDmFriendState();
            onBlockToggled?.();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể chặn người dùng",
            );
        } finally {
            setBusyAction("");
        }
    };

    const handleSaveNickname = async () => {
        if (!conversation.otherUserId) return;
        setNicknameBusy(true);
        try {
            await friendApi.updateNickname(
                conversation.otherUserId,
                nicknameInput.trim(),
            );
            setShowNickname(false);
            if (onGroupUpdated) onGroupUpdated();
        } catch (error) {
            window.alert(
                error.response?.data?.message || "Không thể lưu biệt danh",
            );
        } finally {
            setNicknameBusy(false);
        }
    };

    const handleToggleMuteConversation = async () => {
        if (!conversation?.id) return;
        const nextMuted = !(notifSetting?.isMuted === true);
        try {
            setNotifBusy(true);
            const updated = await updateConversationSetting(conversation.id, {
                isMuted: nextMuted,
                muteUntil: null,
            });
            setNotifSetting(updated || { ...notifSetting, isMuted: nextMuted });
        } catch (error) {
            window.alert(
                error?.response?.data?.message ||
                "Không thể cập nhật cài đặt thông báo",
            );
        } finally {
            setNotifBusy(false);
        }
    };

    if (!conversation) return null;

    return (
        <div
            style={{
                width: 280,
                minWidth: 280,
                height: "100%",
                background: "var(--bg-secondary)",
                borderLeft: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    height: 52,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 12px 0 16px",
                    borderBottom: "1px solid var(--border)",
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--text-primary)",
                    }}
                >
                    {conversation.type === "dm"
                        ? "Thông tin người dùng"
                        : "Thông tin nhóm"}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "4px 6px",
                        borderRadius: 6,
                    }}
                >
                    <X size={18} />
                </button>
            </div>

            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--bg-hover) transparent",
                }}
            >
                {/* Avatar Display */}
                <AvatarDisplay
                    conversation={conversation}
                    accentColor={accentColor}
                    isOnline={isOnline}
                    presStatus={presStatus}
                    getLastSeen={getLastSeen}
                    formatLastSeen={formatLastSeen}
                />

                {/* Tab Navigation */}
                <div
                    style={{
                        display: "flex",
                        gap: 2,
                        margin: "0 12px 12px",
                        background: "var(--bg-primary)",
                        borderRadius: 8,
                        padding: 3,
                    }}
                >
                    {[
                        { key: "info", label: "Thông tin" },
                        { key: "media", label: "Media" },
                        { key: "files", label: "File" },
                        ...(conversation?.type === "dm"
                            ? [{ key: "calls", label: "Cuộc gọi" }]
                            : []),
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                flex: 1,
                                background:
                                    tab === t.key
                                        ? "var(--bg-secondary)"
                                        : "none",
                                border: "none",
                                cursor: "pointer",
                                color:
                                    tab === t.key
                                        ? "var(--text-primary)"
                                        : "var(--text-muted)",
                                fontSize: 12,
                                fontWeight: tab === t.key ? 700 : 500,
                                padding: "5px 4px",
                                borderRadius: 6,
                            }}
                        >
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
                                <SectionHeader title="Thông tin cuộc trò chuyện" />
                                <div
                                    style={{
                                        background: "var(--bg-tertiary)",
                                        borderRadius: 8,
                                        padding: "10px 12px",
                                        display: "grid",
                                        gap: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            Loại
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            {conversation.type === "dm"
                                                ? "Trực tiếp (DM)"
                                                : "Nhóm"}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 8,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            Tin nhắn mới nhất
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: "var(--text-primary)",
                                                maxWidth: 140,
                                                textAlign: "right",
                                            }}
                                        >
                                            {conversation.lastMessage ||
                                                "Chưa có tin nhắn"}
                                        </span>
                                    </div>
                                    {conversation.type === "group" && (
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                Số thành viên
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    color: "var(--text-primary)",
                                                }}
                                            >
                                                {members.length ||
                                                    conversation.memberCount ||
                                                    conversation.members ||
                                                    0}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Thành viên nhóm */}
                            {conversation.type === "group" && (
                                <div style={{ marginBottom: 16 }}>
                                    <SectionHeader title="Thành viên nhóm" />
                                    {loadingMembers && (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Đang tải thành viên...
                                        </div>
                                    )}
                                    {!!memberError && (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#ed4245",
                                                marginBottom: 8,
                                            }}
                                        >
                                            {memberError}
                                        </div>
                                    )}

                                    {!loadingMembers &&
                                        members.map((m) => {
                                            const uid = (
                                                m.user?._id || ""
                                            ).toString();
                                            const isSelf = uid === myUserId;
                                            const canEditThisMember =
                                                canManageMembers &&
                                                !isSelf &&
                                                m.role !== "owner";
                                            const isEditing =
                                                editingMemberId === uid;

                                            return (
                                                <div
                                                    key={uid}
                                                    style={{
                                                        background:
                                                            "var(--bg-tertiary)",
                                                        borderRadius: 8,
                                                        padding: "9px 10px",
                                                        marginBottom: 8,
                                                        border: "1px solid var(--border)",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    color: "var(--text-primary)",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    gap: 8,
                                                                }}
                                                            >
                                                                <span>
                                                                    {m.user
                                                                        ?.displayName ||
                                                                        "Unknown"}
                                                                </span>
                                                                <RoleChip
                                                                    role={
                                                                        m.role
                                                                    }
                                                                />
                                                                {isSelf && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 11,
                                                                            color: "var(--text-muted)",
                                                                        }}
                                                                    >
                                                                        (bạn)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "var(--text-muted)",
                                                                    marginTop: 3,
                                                                }}
                                                            >
                                                                send:
                                                                {m.canSendMessages
                                                                    ? "Y"
                                                                    : "N"}{" "}
                                                                | invite:
                                                                {m.canInviteMembers
                                                                    ? "Y"
                                                                    : "N"}{" "}
                                                                | manage:
                                                                {m.canManageMembers
                                                                    ? "Y"
                                                                    : "N"}
                                                            </div>
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                gap: 6,
                                                            }}
                                                        >
                                                            {canEditThisMember && (
                                                                <button
                                                                    onClick={() =>
                                                                        startEditMember(
                                                                            m,
                                                                        )
                                                                    }
                                                                    style={{
                                                                        background:
                                                                            "var(--bg-hover)",
                                                                        color: "var(--text-primary)",
                                                                        border: "none",
                                                                        borderRadius: 6,
                                                                        padding:
                                                                            "5px 8px",
                                                                        cursor: "pointer",
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    <UserCog
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                            {canEditThisMember && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleKickMember(
                                                                            m,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        busyAction ===
                                                                        `kick-${uid}`
                                                                    }
                                                                    style={{
                                                                        background:
                                                                            "#ed424520",
                                                                        color: "#ed4245",
                                                                        border: "none",
                                                                        borderRadius: 6,
                                                                        padding:
                                                                            "5px 8px",
                                                                        cursor: "pointer",
                                                                        fontSize: 11,
                                                                        fontWeight: 700,
                                                                        opacity:
                                                                            busyAction ===
                                                                                `kick-${uid}`
                                                                                ? 0.6
                                                                                : 1,
                                                                    }}
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                            {isOwner &&
                                                                !isSelf &&
                                                                m.role !==
                                                                "owner" && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleTransferOwner(
                                                                                m,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            busyAction ===
                                                                            `transfer-${uid}`
                                                                        }
                                                                        style={{
                                                                            background:
                                                                                "rgba(250,166,26,0.2)",
                                                                            color: "#faa61a",
                                                                            border: "none",
                                                                            borderRadius: 6,
                                                                            padding:
                                                                                "5px 8px",
                                                                            cursor: "pointer",
                                                                            fontSize: 11,
                                                                            fontWeight: 700,
                                                                            opacity:
                                                                                busyAction ===
                                                                                    `transfer-${uid}`
                                                                                    ? 0.6
                                                                                    : 1,
                                                                        }}
                                                                    >
                                                                        <Crown
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </button>
                                                                )}
                                                        </div>
                                                    </div>

                                                    {/* ── Inline Edit Panel ── */}
                                                    {isEditing && (
                                                        <div
                                                            style={{
                                                                marginTop: 10,
                                                                borderTop:
                                                                    "1px solid var(--border)",
                                                                paddingTop: 10,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "grid",
                                                                    gap: 8,
                                                                }}
                                                            >
                                                                <label
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "var(--text-secondary)",
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        justifyContent:
                                                                            "space-between",
                                                                    }}
                                                                >
                                                                    <span>
                                                                        Role
                                                                    </span>
                                                                    <select
                                                                        value={
                                                                            editRole
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setEditRole(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !isOwner
                                                                        }
                                                                        style={{
                                                                            background:
                                                                                "var(--bg-primary)",
                                                                            color: "var(--text-primary)",
                                                                            border: "1px solid var(--border)",
                                                                            borderRadius: 6,
                                                                            padding:
                                                                                "4px 6px",
                                                                            fontSize: 12,
                                                                        }}
                                                                    >
                                                                        <option value="member">
                                                                            member
                                                                        </option>
                                                                        <option value="admin">
                                                                            admin
                                                                        </option>
                                                                    </select>
                                                                </label>
                                                                <label
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "var(--text-secondary)",
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            editCanSend
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setEditCanSend(
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                    />{" "}
                                                                    canSendMessages
                                                                </label>
                                                                <label
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "var(--text-secondary)",
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            editCanInvite
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setEditCanInvite(
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                    />{" "}
                                                                    canInviteMembers
                                                                </label>
                                                                <label
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "var(--text-secondary)",
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            editCanManage
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setEditCanManage(
                                                                                e
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !isOwner
                                                                        }
                                                                    />{" "}
                                                                    canManageMembers
                                                                </label>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        gap: 8,
                                                                        justifyContent:
                                                                            "flex-end",
                                                                    }}
                                                                >
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingMemberId(
                                                                                null,
                                                                            )
                                                                        }
                                                                        style={{
                                                                            border: "none",
                                                                            borderRadius: 6,
                                                                            padding:
                                                                                "6px 10px",
                                                                            background:
                                                                                "var(--bg-hover)",
                                                                            color: "var(--text-primary)",
                                                                            cursor: "pointer",
                                                                            fontSize: 12,
                                                                            fontWeight: 700,
                                                                        }}
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <button
                                                                        onClick={
                                                                            saveEditMember
                                                                        }
                                                                        disabled={
                                                                            busyAction ===
                                                                            `edit-${uid}`
                                                                        }
                                                                        style={{
                                                                            border: "none",
                                                                            borderRadius: 6,
                                                                            padding:
                                                                                "6px 10px",
                                                                            background:
                                                                                "var(--accent)",
                                                                            color: "#fff",
                                                                            cursor: "pointer",
                                                                            fontSize: 12,
                                                                            fontWeight: 700,
                                                                            opacity:
                                                                                busyAction ===
                                                                                    `edit-${uid}`
                                                                                    ? 0.6
                                                                                    : 1,
                                                                        }}
                                                                    >
                                                                        Lưu
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Thêm thành viên */}
                            {conversation.type === "group" &&
                                canInviteMembers && (
                                    <div style={{ marginBottom: 16 }}>
                                        <SectionHeader title="Thêm thành viên" />
                                        <div
                                            style={{
                                                background:
                                                    "var(--bg-tertiary)",
                                                borderRadius: 8,
                                                padding: 10,
                                                border: "1px solid var(--border)",
                                            }}
                                        >
                                            {loadingFriendPool && (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "var(--text-muted)",
                                                        marginBottom: 8,
                                                    }}
                                                >
                                                    Đang tải danh sách bạn bè...
                                                </div>
                                            )}
                                            {!loadingFriendPool &&
                                                friendPool.length === 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: "var(--text-muted)",
                                                            marginBottom: 8,
                                                        }}
                                                    >
                                                        Không còn bạn bè nào để
                                                        thêm vào nhóm.
                                                    </div>
                                                )}
                                            {!loadingFriendPool &&
                                                friendPool
                                                    .slice(0, 20)
                                                    .map((f) => {
                                                        const fid = (
                                                            f.friendId || ""
                                                        ).toString();
                                                        const checked =
                                                            selectedAddIds.includes(
                                                                fid,
                                                            );
                                                        return (
                                                            <label
                                                                key={fid}
                                                                style={{
                                                                    display:
                                                                        "block",
                                                                    fontSize: 12,
                                                                    color: "var(--text-secondary)",
                                                                    marginBottom: 6,
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onChange={() =>
                                                                        handleToggleAddMember(
                                                                            fid,
                                                                        )
                                                                    }
                                                                />{" "}
                                                                {f.displayName}
                                                            </label>
                                                        );
                                                    })}
                                            <button
                                                onClick={handleAddMembers}
                                                disabled={
                                                    selectedAddIds.length ===
                                                    0 ||
                                                    busyAction === "add-members"
                                                }
                                                style={{
                                                    border: "none",
                                                    borderRadius: 6,
                                                    padding: "7px 10px",
                                                    background: "var(--accent)",
                                                    color: "#fff",
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    marginTop: 6,
                                                    opacity:
                                                        selectedAddIds.length ===
                                                            0 ||
                                                            busyAction ===
                                                            "add-members"
                                                            ? 0.6
                                                            : 1,
                                                }}
                                            >
                                                {busyAction === "add-members"
                                                    ? "Đang thêm..."
                                                    : `Thêm ${selectedAddIds.length} thành viên`}
                                            </button>
                                        </div>
                                    </div>
                                )}

                            {/* Hành động */}
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                }}
                            >
                                <SectionHeader title="Hành động" />
                                <ActionButton
                                    icon={<MessageCircle size={15} />}
                                    label="Nhắn tin"
                                    variant="primary"
                                    onClick={() => { }}
                                />
                                {conversation.type === "dm" &&
                                    onViewProfile && (
                                        <ActionButton
                                            icon={<Shield size={15} />}
                                            label="Xem hồ sơ"
                                            onClick={() =>
                                                onViewProfile(
                                                    conversation.otherUserId,
                                                )
                                            }
                                        />
                                    )}
                                <ActionButton
                                    icon={<Phone size={15} />}
                                    label="Gọi thoại"
                                    onClick={
                                        conversation?.type === "dm"
                                            ? onPhoneCall
                                            : undefined
                                    }
                                />
                                <ActionButton
                                    icon={<Video size={15} />}
                                    label="Gọi video"
                                    onClick={
                                        conversation?.type === "dm"
                                            ? onVideoCall
                                            : undefined
                                    }
                                />
                                <ActionButton
                                    icon={<BellOff size={15} />}
                                    label={notifSetting?.isMuted ? "Bật thông báo" : "Tắt thông báo"}
                                    onClick={() => {
                                        if (notifSetting?.isMuted) {
                                            // Đang tắt -> Bấm để mở lại (gọi hàm cũ của bạn)
                                            handleToggleMuteConversation();
                                        } else {
                                            // Đang mở -> Bấm để hiện Popup chọn thời gian
                                            setShowMuteModal(true);
                                        }
                                    }}
                                    disabled={notifBusy}
                                />

                                {conversation.type === "dm" && (
                                    <>
                                        <ActionButton
                                            icon={<Trash2 size={15} />}
                                            label="Xóa cuộc trò chuyện"
                                            variant="danger"
                                            onClick={() =>
                                                onDeleteConversation?.(
                                                    conversation.id,
                                                )
                                            }
                                        />
                                        <ActionButton
                                            icon={<Shield size={15} />}
                                            label="Đặt biệt danh"
                                            onClick={() => {
                                                setNicknameInput("");
                                                setShowNickname(true);
                                            }}
                                        />
                                        <ActionButton
                                            icon={<Ban size={15} />}
                                            label={
                                                dmFriendState?.iBlocked
                                                    ? "Bỏ chặn người dùng"
                                                    : "Chặn người dùng"
                                            }
                                            variant="danger"
                                            onClick={handleBlockUser}
                                            disabled={
                                                busyAction === "block-user" ||
                                                !conversation.otherUserId
                                            }
                                        />
                                    </>
                                )}

                                {conversation.type === "group" && (
                                    <ActionButton
                                        icon={<LogOut size={15} />}
                                        label="Rời nhóm"
                                        variant="danger"
                                        onClick={() =>
                                            onLeaveGroup?.(conversation.id)
                                        }
                                        disabled={busyAction === "disband"}
                                    />
                                )}
                                {conversation.type === "group" && isOwner && (
                                    <ActionButton
                                        icon={<Trash2 size={15} />}
                                        label="Giải tán nhóm"
                                        variant="danger"
                                        onClick={handleDisbandGroup}
                                        disabled={busyAction === "disband"}
                                    />
                                )}
                            </div>

                            {/* Nickname inline panel */}
                            {showNickname && conversation.type === "dm" && (
                                <div
                                    style={{
                                        background: "var(--bg-tertiary)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 10,
                                        padding: 12,
                                        marginTop: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Biệt danh cho {conversation.name}
                                    </div>
                                    <input
                                        value={nicknameInput}
                                        onChange={(e) =>
                                            setNicknameInput(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            handleSaveNickname()
                                        }
                                        placeholder="Nhập biệt danh..."
                                        maxLength={50}
                                        style={{
                                            width: "100%",
                                            border: "1px solid var(--border)",
                                            borderRadius: 8,
                                            background: "var(--bg-primary)",
                                            color: "var(--text-primary)",
                                            padding: "8px 10px",
                                            fontSize: 13,
                                            outline: "none",
                                            marginBottom: 8,
                                            boxSizing: "border-box",
                                        }}
                                    />
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            onClick={() =>
                                                setShowNickname(false)
                                            }
                                            style={{
                                                flex: 1,
                                                padding: "7px 0",
                                                border: "none",
                                                borderRadius: 7,
                                                background: "var(--bg-hover)",
                                                color: "var(--text-primary)",
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSaveNickname}
                                            disabled={nicknameBusy}
                                            style={{
                                                flex: 1,
                                                padding: "7px 0",
                                                border: "none",
                                                borderRadius: 7,
                                                background: "var(--accent)",
                                                color: "#fff",
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                opacity: nicknameBusy ? 0.6 : 1,
                                            }}
                                        >
                                            {nicknameBusy
                                                ? "Đang lưu..."
                                                : "Lưu"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== TAB MEDIA ==================== */}
                    {tab === "media" && (
                        <div>
                            <SectionHeader title="Ảnh đã chia sẻ" />
                            {loadingMedia && (
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        textAlign: "center",
                                    }}
                                >
                                    Đang tải...
                                </p>
                            )}
                            {!loadingMedia && mediaData.images.length === 0 && (
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        textAlign: "center",
                                    }}
                                >
                                    Chưa có ảnh nào
                                </p>
                            )}
                            {!loadingMedia && mediaData.images.length > 0 && (
                                <>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(3, 1fr)",
                                            gap: 4,
                                        }}
                                    >
                                        {mediaData.images.map((item) => (
                                            <a
                                                key={item._id}
                                                href={item.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    aspectRatio: "1",
                                                    borderRadius: 6,
                                                    overflow: "hidden",
                                                    display: "block",
                                                    background:
                                                        "var(--bg-hover)",
                                                }}
                                            >
                                                <img
                                                    src={item.url}
                                                    alt=""
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            </a>
                                        ))}
                                    </div>
                                    <p
                                        style={{
                                            fontSize: 12,
                                            color: "var(--text-muted)",
                                            textAlign: "center",
                                            marginTop: 8,
                                        }}
                                    >
                                        {mediaData.images.length} ảnh đã chia sẻ
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* ==================== TAB FILES ==================== */}
                    {tab === "files" && (
                        <div>
                            <SectionHeader title="File đã chia sẻ" />
                            {loadingMedia && (
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        textAlign: "center",
                                    }}
                                >
                                    Đang tải...
                                </p>
                            )}
                            {!loadingMedia && mediaData.files.length === 0 && (
                                <p
                                    style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        textAlign: "center",
                                    }}
                                >
                                    Chưa có file nào
                                </p>
                            )}
                            {!loadingMedia &&
                                mediaData.files.map((file) => (
                                    <div
                                        key={file._id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 10px",
                                            borderRadius: 8,
                                            marginBottom: 4,
                                            background: "var(--bg-tertiary)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                flexShrink: 0,
                                                color: "#5865f2",
                                                display: "flex",
                                                alignItems: "center",
                                            }}
                                        >
                                            <FileText size={22} />
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: "var(--text-primary)",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {file.fileName}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                {file.fileSize
                                                    ? `${(file.fileSize / 1024).toFixed(0)} KB`
                                                    : ""}
                                            </div>
                                        </div>
                                        {file.url && (
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--text-muted)",
                                                    padding: 2,
                                                    display: "flex",
                                                }}
                                            >
                                                <Download size={14} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* ==================== TAB CALLS ==================== */}
                    {tab === "calls" && conversation?.type === "dm" && (
                        <div>
                            <SectionHeader title="Lịch sử cuộc gọi" />
                            <CallHistoryTab
                                otherUserId={conversation.otherUserId}
                                otherUserName={conversation.name}
                                otherUserAvatar={conversation.avatar}
                            />
                        </div>
                    )}
                </div>
            </div>
            {/* Gọi Modal Tắt thông báo */}
            <MuteConversationModal
                isOpen={showMuteModal}
                onClose={() => setShowMuteModal(false)}
                conversationId={conversation?.id}
                onSuccess={() => {
                    // Cập nhật lại state của Sidebar khi API gọi thành công
                    setNotifSetting(prev => ({ ...prev, isMuted: true }));
                }}
            />
        </div>
    );
}
