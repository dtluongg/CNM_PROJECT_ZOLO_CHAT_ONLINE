const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        mediaUrl: {
            type: String,
            required: true,
        },
        mediaType: {
            type: String,
            enum: ['image', 'video'],
            default: 'image',
        },
        viewers: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                hasHeart: {
                    type: Boolean,
                    default: false,
                },
                viewedAt: {
                    type: Date,
                    default: Date.now,
                },
            }
        ],
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // Tự động xóa document khi tới ngày này (TTL index)
        },
    },
    {
        timestamps: true,
    }
);

const storyModel = mongoose.model('Story', storySchema);
module.exports = storyModel;
