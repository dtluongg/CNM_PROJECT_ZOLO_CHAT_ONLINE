import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import storiesApi from '../storiesApi';

const StoryUploadModal = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        // Validation
        const isImage = selected.type.startsWith('image/');
        const isVideo = selected.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            setError('Chỉ hỗ trợ ảnh và video');
            return;
        }

        const limit = isVideo ? 15 * 1024 * 1024 : 5 * 1024 * 1024; // 15MB video, 5MB image
        if (selected.size > limit) {
            setError(isVideo ? 'Video tối đa 15MB' : 'Ảnh tối đa 5MB');
            return;
        }

        setFile(selected);
        setError('');
        
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selected);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`; // Bỏ prefix stories/ để tránh trùng tên bucket

            // 1. Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('stories') // Quay lại dùng viết thường vì bucket này đã cài Policy
                .upload(filePath, file);

            if (uploadError) {
                // Hiển thị lỗi chi tiết từ Supabase
                throw new Error(`Supabase: ${uploadError.message || uploadError.error || 'Unknown error'}`);
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('stories')
                .getPublicUrl(filePath);

            // 3. Save to Backend
            const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            await storiesApi.createStory(publicUrl, mediaType);

            onSuccess();
        } catch (err) {
            console.error('Upload story error:', err);
            setError(err.message || 'Có lỗi xảy ra khi đăng tin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Tạo tin mới</h2>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}

                    {!preview ? (
                        <div 
                            onClick={() => fileInputRef.current.click()}
                            className="aspect-[9/16] max-h-[60vh] mx-auto rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-[var(--accent)]" />
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">Chọn ảnh hoặc video</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Hỗ trợ JPG, PNG, MP4</p>
                        </div>
                    ) : (
                        <div className="relative aspect-[9/16] max-h-[60vh] mx-auto rounded-xl overflow-hidden bg-black">
                            {file.type.startsWith('video/') ? (
                                <video src={preview} className="w-full h-full object-contain" controls />
                            ) : (
                                <img src={preview} className="w-full h-full object-contain" alt="Preview" />
                            )}
                            <button 
                                onClick={() => { setFile(null); setPreview(null); }}
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/*,video/*" 
                        className="hidden" 
                    />
                </div>

                <div className="p-4 bg-[var(--bg-hover)] flex gap-3 flex-shrink-0">
                    <button 
                        disabled={loading}
                        onClick={onClose}
                        className="flex-1 py-2.5 font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        disabled={!file || loading}
                        onClick={handleUpload}
                        className="flex-1 bg-[var(--accent)] text-white py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        {loading ? 'Đang đăng...' : 'Chia sẻ tin'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryUploadModal;
