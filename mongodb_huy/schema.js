Table users {
	_id string [pk, note: 'MongoDB ObjectId']
	supabaseId string [unique, note: 'Supabase auth user id']
	username string [unique, note: 'Nullable for OAuth users']
	passwordHash string [note: 'Local auth only']
	email string [unique]
	phone string
	displayName string
	avatar string
	bio text
	status string [note: 'online | idle | dnd | invisible']
	statusText string
	banner string
	usernameColor string
	themeName string
	themeColors json
	isEmailVerified boolean
	isPhoneVerified boolean
	authProvider string [note: 'local | google | facebook']
	linkedProviders json
	createdAt timestamp
	updatedAt timestamp
}

Table friend_requests {
	_id string [pk]
	fromUserId string
	toUserId string
	status string [note: 'pending | accepted | rejected | canceled']
	createdAt timestamp
	respondedAt timestamp
}

Table friendships {
	_id string [pk]
	userAId string
	userBId string
	createdAt timestamp
	lastInteractionAt timestamp
}

Table conversations {
	_id string [pk]
	type string [note: 'dm | group']
	name string
	avatar string
	banner string
	createdBy string
	createdAt timestamp
	lastMessageId string
	lastMessagePreview text
	lastMessageTime timestamp
	isArchived boolean
	isLocked boolean
}

Table conversation_members {
	_id string [pk]
	conversationId string
	userId string
	role string [note: 'owner | admin | member']
	joinedAt timestamp
	leftAt timestamp
	unreadCount int
	lastReadMessageId string
	muted boolean
	canSendMessages boolean
	canInviteMembers boolean
	canManageMembers boolean
}

Table messages {
	_id string [pk]
	conversationId string
	senderId string
	content text
	type string [note: 'text | image | file | video | emoji | system']
	replyToMessageId string
	forwardFromMessageId string
	createdAt timestamp
	edited boolean
	editedAt timestamp
	deleted boolean
	deletedAt timestamp
	deletedBy string
	revoked boolean
	revokedAt timestamp
	revokedBy string
	payload json
}

Table message_attachments {
	_id string [pk]
	messageId string
	url string
	fileName string
	mimeType string
	fileSize int
	width int
	height int
	duration int
	createdAt timestamp
}

Table message_reactions {
	_id string [pk]
	messageId string
	userId string
	reactionType string
	createdAt timestamp
}

Table message_reads {
	_id string [pk]
	messageId string
	userId string
	readAt timestamp
}

Table notification_settings {
	_id string [pk]
	userId string
	conversationId string
	muted boolean
	pushEnabled boolean
	mentionOnly boolean
	createdAt timestamp
	updatedAt timestamp
}

Table presence {
	userId string [pk]
	online boolean
	lastSeen timestamp
	devicePlatform string [note: 'web | mobile']
}

Ref: friend_requests.fromUserId > users._id
Ref: friend_requests.toUserId > users._id

Ref: friendships.userAId > users._id
Ref: friendships.userBId > users._id

Ref: conversations.createdBy > users._id
Ref: conversations.lastMessageId > messages._id

Ref: conversation_members.conversationId > conversations._id
Ref: conversation_members.userId > users._id
Ref: conversation_members.lastReadMessageId > messages._id

Ref: messages.conversationId > conversations._id
Ref: messages.senderId > users._id
Ref: messages.replyToMessageId > messages._id
Ref: messages.forwardFromMessageId > messages._id
Ref: messages.deletedBy > users._id
Ref: messages.revokedBy > users._id

Ref: message_attachments.messageId > messages._id

Ref: message_reactions.messageId > messages._id
Ref: message_reactions.userId > users._id

Ref: message_reads.messageId > messages._id
Ref: message_reads.userId > users._id

Ref: notification_settings.userId > users._id
Ref: notification_settings.conversationId > conversations._id

Ref: presence.userId > users._id
