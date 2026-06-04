import React from 'react';

/**
 * AiLogo — logo AI dùng chung cho mọi nút/biểu tượng AI.
 * Dùng ảnh trong thư mục public (mặc định /logo.svg) thay cho icon Sparkles.
 *
 * Muốn đổi ảnh khác: chỉ cần sửa DEFAULT_SRC hoặc truyền prop `src`.
 *
 * Props:
 *   size  — kích thước (px), mặc định 18
 *   src   — đường dẫn ảnh trong public, mặc định '/logo.svg'
 *   alt   — alt text
 *   style — style bổ sung
 */
const DEFAULT_SRC = '/botAI.png';

export default function AiLogo({ size = 18, src = DEFAULT_SRC, alt = 'AI', style = {} }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{ display: 'block', objectFit: 'contain', flexShrink: 0, ...style }}
    />
  );
}