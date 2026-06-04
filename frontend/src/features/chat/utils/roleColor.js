// Tiện ích màu cho role/chip — đảm bảo đọc được trên mọi theme (sáng/tối).

// Chuẩn hóa hex (#rgb hoặc #rrggbb) → {r,g,b}. Trả null nếu không hợp lệ.
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Độ sáng tương đối (0–1) theo WCAG.
export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.722 * a[2];
}

// Màu chữ (đen/trắng) đọc rõ nhất khi đặt trên nền `hex`.
export function readableTextColor(hex) {
  return luminance(hex) > 0.5 ? '#1a1a1a' : '#ffffff';
}

// Style chip role thống nhất, đọc rõ trên mọi theme: nền = màu role, chữ tương phản.
export function roleChipStyle(hex, { solid = true } = {}) {
  const color = hex || '#5865f2';
  if (solid) {
    return {
      background: color,
      color: readableTextColor(color),
      border: '1px solid rgba(0,0,0,0.12)',
    };
  }
  // Biến thể nhạt: nền mờ + chữ cùng màu, kèm viền để không chìm vào theme.
  return {
    background: color + '22',
    color,
    border: `1px solid ${color}66`,
  };
}