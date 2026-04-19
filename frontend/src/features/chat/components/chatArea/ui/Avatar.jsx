import { getAvatarColor, getInitials } from '../utils/avatarUtils';

const Avatar = ({ name, avatar, size = 36 }) =>
  avatar ? (
    <img
      src={avatar}
      alt={name}
      style={{
        width: size, height: size,
        borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
      }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: getAvatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38, userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  );

export default Avatar;