import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, RefreshCw, LogOut, MoreVertical, Trash2, History } from 'lucide-react';
import sessionApi from '../../api/sessionApi';
import { getSessionId } from '../../../../utils/authStorage';
import { useLanguage } from '../../../../context/LanguageContext';
import { usePresence } from '../../../../context/PresenceContext';

const DeviceManagementTab = () => {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState({ current: null, others: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionApi.getSessions();
      setSessions(res.data);
    } catch (error) {
      console.error('Fetch sessions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const { sessionUpdateCounter } = usePresence();

  useEffect(() => {
    fetchSessions();

    // Cơ chế fallback: Tự động làm mới khi người dùng quay lại tab này (window focus)
    window.addEventListener('focus', fetchSessions);
    return () => window.removeEventListener('focus', fetchSessions);
  }, [sessionUpdateCounter]);

  const handleLogoutSession = async (sid) => {
    if (!window.confirm(t('settings.devices.logout_this_confirm'))) return;
    try {
      await sessionApi.logoutSession(sid);
      fetchSessions();
    } catch (error) {
      alert(t('common.error'));
    }
  };

  const handleLogoutAllOthers = async () => {
    if (!window.confirm(t('settings.devices.logout_all_confirm'))) return;
    try {
      const currentSid = getSessionId();
      await sessionApi.logoutAllOthers({ currentSessionId: currentSid });
      fetchSessions();
    } catch (error) {
      alert(t('common.error'));
    }
  };

  const renderDeviceName = (name) => {
    if (!name || name === 'Unknown Device' || name === 'Thiết bị không xác định') {
      return t('settings.devices.unknown_device');
    }
    return name;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('settings.devices.just_now');
    if (diffMins < 60) return t('settings.devices.minutes_ago', { count: diffMins });
    if (diffHours < 24) return t('settings.devices.hours_ago', { count: diffHours });
    return t('settings.devices.days_ago', { count: diffDays });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getDeviceIcon = (platform) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('ios') || p.includes('android')) return <Smartphone size={24} />;
    return <Monitor size={24} />;
  };

  return (
    <div style={{ 
      animation: 'modalIn 0.2s ease', 
      display: 'flex', flexDirection: 'column', gap: 24, padding: '10px 4px'
    }}>
      {/* SECTION: THIS DEVICE */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
          {t('settings.devices.this_device')}
        </h3>
        {sessions.current ? (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px', 
            background: 'var(--bg-tertiary)', borderRadius: 14, border: '1px solid var(--accent)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              width: 52, height: 52, borderRadius: 12, background: 'rgba(var(--accent-rgb), 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
            }}>
              {getDeviceIcon(sessions.current.platform)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{renderDeviceName(sessions.current.deviceName)}</span>
                <span style={{ 
                  fontSize: 10, fontWeight: 900, background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent)', 
                  padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' 
                }}>
                  {t('settings.devices.this_device')}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {t(`settings.devices.methods.${sessions.current.loginMethod}`) || t('settings.devices.login_password')} • {sessions.current.location}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ marginBottom: 12, animation: 'spin 2s linear infinite' }} />
            <div style={{ fontSize: 14 }}>{t('common.loading')}...</div>
          </div>
        )}
      </div>

      {/* SECTION: OTHER DEVICES */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            {t('settings.devices.other_devices')}
          </h3>
          {sessions.others.length > 0 && (
            <button
              onClick={handleLogoutAllOthers}
              style={{
                background: 'none', border: 'none', color: '#ed4245', fontSize: 12, 
                fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {t('settings.devices.logout_all')}
            </button>
          )}
        </div>

        {sessions.others.length === 0 ? (
          <div style={{ 
            padding: '24px', textAlign: 'center', background: 'var(--bg-tertiary)', 
            borderRadius: 14, border: '1px dashed var(--border)', color: 'var(--text-muted)'
          }}>
            <Smartphone size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>{t('settings.devices.no_other_devices')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.others.map(s => (
              <div key={s.sessionId} style={{ 
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', 
                background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border)',
                transition: 'transform 0.1s, border-color 0.1s'
              }}>
                <div style={{ 
                  width: 44, height: 44, borderRadius: 10, background: 'transparent',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
                }}>
                  {getDeviceIcon(s.platform)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderDeviceName(s.deviceName)}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>• {formatTime(s.lastActiveAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.location} • {s.ipAddress}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDevice(s)}
                  title={t('settings.devices.view_details') || 'Xem chi tiết'}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', 
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: HISTORY */}
      {sessions.history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
            {t('settings.devices.history')}
          </h3>
          <div style={{ 
            background: 'var(--bg-tertiary)', borderRadius: 14, overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            {sessions.history.map((s, idx) => (
              <div key={s.sessionId} style={{ 
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderBottom: idx === sessions.history.length - 1 ? 'none' : '1px solid var(--border)'
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <History size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{renderDeviceName(s.deviceName)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.location} • {new Date(s.updatedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {t('settings.devices.logged_out')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* DEVICE DETAILS MODAL */}
      {selectedDevice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setSelectedDevice(null)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 16, width: '90%', maxWidth: 360,
            overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.2s ease', display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 24px 20px', textAlign: 'center' }}>
              <div style={{ 
                width: 60, height: 60, borderRadius: 16, background: 'rgba(var(--accent-rgb), 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                margin: '0 auto 16px'
              }}>
                {getDeviceIcon(selectedDevice.platform)}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px', color: 'var(--text-primary)' }}>
                {renderDeviceName(selectedDevice.deviceName)}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('settings.devices.login_time') || 'Đăng nhập'}:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{formatDateTime(selectedDevice.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('settings.devices.method') || 'Phương thức'}:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>
                    {t(`settings.devices.methods.${selectedDevice.loginMethod}`) || t('settings.devices.login_password') || 'Mật khẩu'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('settings.devices.last_active') || 'Hoạt động lần cuối'}:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{formatDateTime(selectedDevice.lastActiveAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('settings.devices.location') || 'Địa điểm'}:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{selectedDevice.location}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('settings.devices.ip_address') || 'Địa chỉ IP'}:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right' }}>{selectedDevice.ipAddress}</span>
                </div>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={async () => {
                  const sid = selectedDevice.sessionId;
                  setSelectedDevice(null);
                  // Gọi setTimeout một chút để hiệu ứng tắt modal kịp hoàn thành trước khi hiện window.confirm chặn UI
                  setTimeout(() => handleLogoutSession(sid), 50);
                }}
                style={{
                  width: '100%', padding: '16px 20px', background: 'transparent', border: 'none',
                  display: 'flex', alignItems: 'center', gap: 12, color: '#ed4245',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,66,69,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={20} />
                {t('settings.devices.logout_this_device') || 'Đăng xuất thiết bị này?'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagementTab;
