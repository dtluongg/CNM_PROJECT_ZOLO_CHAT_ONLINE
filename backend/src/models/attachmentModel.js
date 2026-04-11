const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    // null khi file mới upload, sẽ được gán sau khi tạo message
    messageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    // Người đã upload file
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url:        { type: String, required: true },
    fileName:   { type: String, default: '' },
    mimeType:   { type: String, required: true }, // VD: image/jpeg, video/mp4
    fileSize:   { type: Number, default: 0 },     // Bytes

    // Tối ưu UX chống giật màn hình
    width:    { type: Number, default: null },    // Cho ảnh/video
    height:   { type: Number, default: null },    // Cho ảnh/video
    duration: { type: Number, default: null },    // Cho video/âm thanh
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
