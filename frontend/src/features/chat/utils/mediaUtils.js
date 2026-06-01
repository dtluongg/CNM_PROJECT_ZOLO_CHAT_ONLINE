/**
 * mediaUtils.js
 * Wrapper an toàn cho navigator.mediaDevices.getUserMedia
 * Xử lý lỗi HTTP (insecure origin) và permission denied rõ ràng.
 */

/**
 * Kiểm tra xem trang web có đang chạy trên origin an toàn không.
 * Trình duyệt chặn getUserMedia trên HTTP (trừ localhost).
 */
export function isSecureContext() {
  return (
    window.isSecureContext === true ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  );
}

/**
 * Lấy thông báo lỗi thân thiện từ DOMException.
 */
export function getMediaErrorMessage(err) {
  if (!isSecureContext()) {
    return (
      'Trình duyệt chặn microphone/camera trên HTTP.\n' +
      'Hãy truy cập qua HTTPS hoặc liên hệ quản trị viên để bật SSL.'
    );
  }

  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Bạn đã từ chối quyền truy cập microphone/camera. Hãy cấp quyền trong cài đặt trình duyệt và tải lại trang.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Không tìm thấy microphone hoặc camera trên thiết bị này.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Microphone/camera đang được sử dụng bởi ứng dụng khác.';
  }
  if (name === 'OverconstrainedError') {
    return 'Thiết bị không hỗ trợ cấu hình được yêu cầu.';
  }
  return err?.message || 'Không thể truy cập microphone/camera.';
}

/**
 * getUserMedia với xử lý lỗi đầy đủ.
 * Ném Error với message thân thiện thay vì DOMException thô.
 *
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream>}
 */
export async function getMediaStream(constraints) {
  if (!isSecureContext()) {
    throw new Error(getMediaErrorMessage(null));
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ truy cập microphone/camera. Hãy dùng Chrome/Firefox phiên bản mới nhất.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    throw new Error(getMediaErrorMessage(err));
  }
}

/**
 * Lấy stream audio-only cho ghi âm.
 */
export async function getAudioStream() {
  return getMediaStream({ audio: true, video: false });
}

/**
 * Lấy stream cho cuộc gọi (audio hoặc video).
 * @param {'audio'|'video'} callType
 */
export async function getCallStream(callType) {
  return getMediaStream({
    audio: true,
    video: callType === 'video'
      ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      : false,
  });
}