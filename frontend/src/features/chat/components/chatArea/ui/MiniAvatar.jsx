import { useState, useEffect } from 'react';
import { getAvatarColor } from '../utils/avatarUtils';

const MiniAvatar = ({ name, avatar }) => {
    const [imgError, setImgError] = useState(false);

    // Reset lỗi khi avatar thay đổi
    useEffect(() => {
        setImgError(false);
    }, [avatar]);

    // Fallback avatar (hình tròn có chữ cái)
    const fallback = (
        <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            flexShrink: 0,
            background: getAvatarColor(name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
        }}>
            {(name || '?')[0].toUpperCase()}
        </div>
    );

    if (!avatar || imgError) {
        return fallback;
    }

    return (
        <img
            src={avatar}
            alt={name || 'User'}
            onError={() => setImgError(true)}
            style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
            }}
        />
    );
};

export default MiniAvatar;