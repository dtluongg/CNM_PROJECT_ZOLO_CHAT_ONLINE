import React, { useState } from 'react';
import notificationApi from '../../../features/notifications/api/notificationApi';
import { calculateMuteUntil } from '../../notifications/utils/notificationHelper';
import { useLanguage } from '../../../context/LanguageContext';

const MuteConversationModal = ({ isOpen, onClose, conversationId, onSuccess }) => {
    const { t } = useLanguage();
    const [muteDuration, setMuteDuration] = useState('15m');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Nếu Modal không mở thì không render gì cả
    if (!isOpen) return null;

    const handleConfirmMute = async () => {
        setIsSubmitting(true);
        try {
            const muteUntil = calculateMuteUntil(muteDuration);

            await notificationApi.updateSetting(conversationId, {
                isMuted: true,
                muteUntil: muteUntil
            });

            // Báo cho component cha biết là đã thành công để cập nhật UI
            if (onSuccess) onSuccess();

            // Đóng modal
            onClose();
        } catch (error) {
            console.error('Lỗi khi tắt thông báo:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg w-[400px] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{t('right_sidebar.mute_modal.title')}</h3>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-5">
                        {t('right_sidebar.mute_modal.desc')}
                    </p>
                    <div className="flex flex-col space-y-4">
                        {[
                            { value: '15m', label: t('right_sidebar.mute_modal.options.15m') },
                            { value: '1h', label: t('right_sidebar.mute_modal.options.1h') },
                            { value: '8h', label: t('right_sidebar.mute_modal.options.8h') },
                            { value: 'forever', label: t('right_sidebar.mute_modal.options.forever') },
                        ].map((option) => (
                            <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center w-5 h-5">
                                    <input
                                        type="radio"
                                        name="muteDuration"
                                        value={option.value}
                                        checked={muteDuration === option.value}
                                        onChange={(e) => setMuteDuration(e.target.value)}
                                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-blue-500 checked:bg-white cursor-pointer transition-all"
                                    />
                                    <div className="absolute w-2.5 h-2.5 bg-blue-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                                </div>
                                <span className="text-gray-800 text-sm group-hover:text-black transition-colors">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirmMute}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? t('right_sidebar.processing') : t('right_sidebar.mute_modal.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MuteConversationModal;