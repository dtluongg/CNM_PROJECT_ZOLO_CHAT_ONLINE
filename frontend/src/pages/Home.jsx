import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
const LotusFlower = ({ size = 80, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
    <ellipse cx="50" cy="70" rx="8" ry="12" fill="#E8B4C8" />
    <ellipse cx="50" cy="68" rx="6" ry="10" fill="#F2C6D8" />
    {/* petals */}
    <ellipse cx="35" cy="58" rx="10" ry="18" fill="#F9D5E5" transform="rotate(-20 35 58)" />
    <ellipse cx="65" cy="58" rx="10" ry="18" fill="#F9D5E5" transform="rotate(20 65 58)" />
    <ellipse cx="25" cy="65" rx="8" ry="16" fill="#F2C6D8" transform="rotate(-40 25 65)" />
    <ellipse cx="75" cy="65" rx="8" ry="16" fill="#F2C6D8" transform="rotate(40 75 65)" />
    <ellipse cx="50" cy="45" rx="10" ry="22" fill="#FFE8F0" />
    <ellipse cx="38" cy="48" rx="9" ry="20" fill="#FFE0EC" transform="rotate(-15 38 48)" />
    <ellipse cx="62" cy="48" rx="9" ry="20" fill="#FFE0EC" transform="rotate(15 62 48)" />
    {/* center */}
    <circle cx="50" cy="52" r="9" fill="#F4C430" />
    <circle cx="50" cy="52" r="6" fill="#E8A820" />
    {[...Array(8)].map((_, i) => (
      <circle key={i} cx={50 + 6 * Math.cos((i * Math.PI) / 4)} cy={52 + 6 * Math.sin((i * Math.PI) / 4)} r="1.5" fill="#FFF176" />
    ))}
    {/* stem */}
    <path d="M50 80 Q47 90 45 100" stroke="#7CB87A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <ellipse cx="41" cy="97" rx="8" ry="4" fill="#9ACC8A" transform="rotate(-20 41 97)" />
  </svg>
);

const AoDai = ({ color = '#C84B8A', accent = '#F4C430' }) => (
  <svg width="80" height="160" viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* head */}
    <circle cx="40" cy="18" r="14" fill="#FDDBB4" />
    {/* hair */}
    <ellipse cx="40" cy="10" rx="14" ry="10" fill="#2C1810" />
    <path d="M26 12 Q20 5 28 2 Q34 8 26 12Z" fill="#2C1810" />
    {/* neck */}
    <rect x="36" y="30" width="8" height="8" fill="#FDDBB4" />
    {/* body / torso */}
    <path d="M28 38 L52 38 L55 95 L25 95 Z" fill={color} />

    {/* left leg */}
    <path d="M25 95 L22 145 L34 145 L35 95 Z" fill="#2255CC" />

    {/* right leg */}
    <path d="M45 95 L46 145 L58 145 L55 95 Z" fill="#2255CC" />
    {/* collar */}
    <path d="M32 38 Q40 44 48 38 Q46 42 40 46 Q34 42 32 38Z" fill={accent} />
    {/* decorative trim */}
    <path d="M20 38 Q12 50 10 80" stroke={accent} strokeWidth="1.5" fill="none" />
    <path d="M60 38 Q68 50 70 80" stroke={accent} strokeWidth="1.5" fill="none" />
    {/* floral pattern on dress */}
    {[55, 80, 105, 130].map((y, i) => (
      <g key={i}>
        <circle cx={i % 2 === 0 ? 30 : 50} cy={y} r="4" fill={accent} opacity="0.6" />
        {[0, 90, 180, 270].map(angle => (
          <ellipse key={angle}
            cx={(i % 2 === 0 ? 30 : 50) + 6 * Math.cos(angle * Math.PI / 180)}
            cy={y + 6 * Math.sin(angle * Math.PI / 180)}
            rx="2" ry="3"
            fill={accent} opacity="0.4"
            transform={`rotate(${angle} ${i % 2 === 0 ? 30 : 50} ${y})`}
          />
        ))}
      </g>
    ))}
    {/* sleeves */}
    <path d="M20 45 Q5 55 2 70 Q5 72 8 68 Q15 58 22 52Z" fill={color} />
    <path d="M60 45 Q75 55 78 70 Q75 72 72 68 Q65 58 58 52Z" fill={color} />
    {/* hands */}
    <ellipse cx="4" cy="71" rx="4" ry="3" fill="#FDDBB4" />
    <ellipse cx="76" cy="71" rx="4" ry="3" fill="#FDDBB4" />
    {/* pants - 2 legs only */}
    <rect x="25" y="145" width="12" height="15" rx="3" fill="white" opacity="0.9" />
    <rect x="43" y="145" width="12" height="15" rx="3" fill="white" opacity="0.9" />
  </svg>
);
const Wave = ({ y = 0, color = 'rgba(100,180,220,0.4)', amplitude = 15, period = 200, offset = 0 }) => {
  const points = [];
  for (let x = 0; x <= 1400; x += 10) {
    const wy = y + amplitude * Math.sin(((x + offset) / period) * 2 * Math.PI);
    points.push(`${x},${wy}`);
  }
  return (
    <polyline
      points={points.join(' ')}
      stroke={color}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );
};



/* ─── Animated floating message bubbles ─── */
const MessageBubble = ({ text, delay, x, y, fromMe = false }) => (
  <div
    style={{
      position: 'absolute',
      left: x, top: y,
      animation: `floatBubble 6s ease-in-out ${delay}s infinite`,
      opacity: 0,
    }}
  >
    <div style={{
      background: fromMe
        ? 'linear-gradient(135deg, #C84B8A, #9B2D6F)'
        : 'rgba(255,255,255,0.95)',
      color: fromMe ? 'white' : '#333',
      padding: '8px 14px',
      borderRadius: fromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      fontSize: '13px',
      fontFamily: '"Nunito", sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      border: fromMe ? 'none' : '1px solid rgba(200,75,138,0.2)',
      maxWidth: '200px',
      whiteSpace: 'nowrap',
      // wordBreak: 'break-word',
      // display: 'inline-block',
    }}>
      {text}
    </div>
  </div>
);

/* ─── Main Component ─── */
const Home = () => {
  const [waveOffset, setWaveOffset] = useState(0);
  const [fishPos, setFishPos] = useState([0, 100]);
  const animRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      frameRef.current += 0.5;
      setWaveOffset(frameRef.current * 2);
      setFishPos([
        (frameRef.current * 1.2) % 140 - 10,
        80 + (frameRef.current * 0.8) % 120 - 10,
      ]);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const messages = [
    { text: '🌸 Chào bạn!', delay: 0, x: '5%', y: '32%', fromMe: false },
    { text: 'Hẹn gặp ở hồ Hoàn Kiếm nha!', delay: 1.5, x: '60%', y: '28%', fromMe: true },
    { text: '🍜 Ăn phở chưa?', delay: 3, x: '8%', y: '42%', fromMe: false },
    { text: 'Rồi! Ngon lắm 😍', delay: 4.5, x: '62%', y: '38%', fromMe: true },
    { text: '🎏 Tết vui quá!', delay: 2, x: '6%', y: '52%', fromMe: false },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Nunito:wght@400;600;700;800&display=swap');

        @keyframes floatBubble {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          75% { opacity: 1; transform: translateY(-6px) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.95); }
        }

        @keyframes floatLotus {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }

        @keyframes swayFigure {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes dragonfly {
          0%, 100% { transform: translateX(0) translateY(0) rotate(-5deg); }
          25% { transform: translateX(20px) translateY(-15px) rotate(5deg); }
          50% { transform: translateX(-10px) translateY(-25px) rotate(-3deg); }
          75% { transform: translateX(15px) translateY(-10px) rotate(8deg); }
        }

        .btn-primary {
          background: linear-gradient(135deg, #C84B8A 0%, #9B2D6F 100%);
          color: white;
          border: none;
          padding: 14px 36px;
          border-radius: 50px;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 6px 24px rgba(200,75,138,0.35);
          transition: transform 0.2s, box-shadow 0.2s;
          letter-spacing: 0.5px;
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(200,75,138,0.5);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.92);
          color: #C84B8A;
          border: 2.5px solid #C84B8A;
          padding: 12px 34px;
          border-radius: 50px;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 4px 16px rgba(200,75,138,0.15);
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
          letter-spacing: 0.5px;
        }
        .btn-secondary:hover {
          transform: translateY(-3px);
          background: rgba(255,240,248,1);
          box-shadow: 0 8px 24px rgba(200,75,138,0.3);
        }

        .feature-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 28px 24px;
          border: 1px solid rgba(200,75,138,0.15);
          box-shadow: 0 8px 32px rgba(155,45,111,0.08);
          transition: transform 0.25s, box-shadow 0.25s;
          text-align: center;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(155,45,111,0.15);
        }

        .lotus-float {
          animation: floatLotus 4s ease-in-out infinite;
        }

        .figure-sway {
          animation: swayFigure 3s ease-in-out infinite;
          transform-origin: bottom center;
        }

        .hero-text {
          animation: slideUp 1s ease-out 0.3s both;
        }
        .hero-sub {
          animation: slideUp 1s ease-out 0.6s both;
        }
        .hero-btns {
          animation: slideUp 1s ease-out 0.9s both;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(170deg, #FFF5F9 0%, #FFF0F5 30%, #F0F8FF 60%, #F5FFF8 100%)',
        fontFamily: "'Nunito', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* ── Decorative background pattern ── */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 20% 20%, rgba(200,75,138,0.06) 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 80%, rgba(100,180,220,0.08) 0%, transparent 60%),
                       radial-gradient(ellipse at 60% 30%, rgba(244,196,48,0.05) 0%, transparent 50%)`,
        }} />

        {/* ── Bamboo left ── */}
        <div style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none', opacity: 0.35 }}>
          <svg width="120" height="100vh" viewBox={`0 0 120 ${window.innerHeight || 800}`}>

          </svg>
        </div>

        {/* ── Bamboo right ── */}
        <div style={{ position: 'fixed', right: 0, top: 0, pointerEvents: 'none', opacity: 0.35 }}>
          <svg width="120" height="100vh" viewBox={`0 0 120 ${window.innerHeight || 800}`} style={{ transform: 'scaleX(-1)' }}>

          </svg>
        </div>

        {/* ══════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════ */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '60px 20px 40px',
        }}>

          {/* Message bubbles floating */}
          {messages.map((m, i) => <MessageBubble key={i} {...m} />)}

          {/* Central illustration */}
          <div style={{ position: 'relative', marginBottom: '32px', display: 'flex', alignItems: 'flex-end', gap: '16px' }}>

            {/* Left lotus */}
            <div className="lotus-float" style={{ animationDelay: '0.5s', marginBottom: '20px' }}>
              <LotusFlower size={70} />
            </div>

            {/* Ao dai figure */}
            <div className="figure-sway" style={{ position: 'relative' }}>
              <AoDai color="#C84B8A" accent="#F4C430" />
              {/* Phone / chat icon in hand */}
              <div style={{
                position: 'absolute', bottom: '60px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '8px',
                padding: '4px',
                boxShadow: '0 4px 12px rgba(200,75,138,0.3)',
                fontSize: '20px',
                lineHeight: 1,
              }}>
                💬
              </div>
            </div>

            {/* Ripple rings under figure */}
            {[0, 0.6, 1.2].map((d, i) => (
              <div key={i} style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: `${60 + i * 30}px`,
                height: `${20 + i * 10}px`,
                borderRadius: '50%',
                border: '1.5px solid rgba(200,75,138,0.3)',
                animation: `ripple 2.5s ease-out ${d}s infinite`,
              }} />
            ))}

            {/* Right lotus */}
            <div className="lotus-float" style={{ animationDelay: '1.2s', marginBottom: '10px' }}>
              <LotusFlower size={55} />
            </div>

            {/* Dragonfly */}
            <div style={{
              position: 'absolute', top: '-30px', right: '-20px',
              animation: 'dragonfly 5s ease-in-out infinite',
              fontSize: '28px',
            }}>
              🦋
            </div>
          </div>

          {/* App name */}
          <div className="hero-text" style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #C84B8A, #F4C430, #9B2D6F)',
              backgroundSize: '200% auto',
              animation: 'shimmer 3s linear infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(52px, 10vw, 88px)',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}>
              ZOLO
            </div>
            <div style={{
              fontSize: 'clamp(13px, 2vw, 16px)',
              letterSpacing: '6px',
              color: '#9B2D6F',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginTop: '-4px',
              opacity: 0.8,
            }}>
              ✦ KẾT NỐI TRÁI TIM VIỆT ✦
            </div>
          </div>

          {/* Tagline */}
          <div className="hero-sub" style={{
            textAlign: 'center',
            maxWidth: '520px',
            margin: '20px auto 0',
          }}>
            <p style={{
              fontSize: 'clamp(16px, 2.5vw, 22px)',
              color: '#444',
              lineHeight: 1.65,
              fontWeight: 600,
            }}>
              Gửi yêu thương qua từng tin nhắn —<br />
              <span style={{ color: '#C84B8A', fontWeight: 700 }}>thuần Việt, ấm áp, và đậm nghĩa tình.</span>
            </p>
            <p style={{
              fontSize: '14px',
              color: '#888',
              marginTop: '10px',
              fontStyle: 'italic',
            }}>
              🌸 Ứng dụng chat được xây dựng dành riêng cho người Việt 🌸
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="hero-btns" style={{
            display: 'flex', gap: '16px', marginTop: '36px',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            <Link to="/signin" className="btn-primary">
              Đăng Nhập
            </Link>
            <Link to="/signup" className="btn-secondary">
              Tạo Tài Khoản
            </Link>
          </div>

          {/* Scroll hint */}
          <div style={{
            marginTop: '40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            opacity: 0.5, animation: 'floatLotus 2s ease-in-out infinite',
          }}>
            <div style={{ fontSize: '12px', color: '#C84B8A', fontWeight: 600, letterSpacing: '2px' }}>KHÁM PHÁ</div>
            <div style={{ fontSize: '22px' }}>↓</div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            WAVE + KOI POND SECTION
        ══════════════════════════════════════════ */}
        <section style={{
          position: 'relative',
          background: 'linear-gradient(180deg, transparent 0%, rgba(100,180,220,0.08) 50%, rgba(60,140,200,0.12) 100%)',
          padding: '20px 0 60px',
          overflow: 'hidden',
        }}>
          <svg width="100%" height="160" viewBox="0 0 1400 160" preserveAspectRatio="none">
            <Wave y={100} color="rgba(100,180,220,0.2)" amplitude={18} period={280} offset={waveOffset * 1.5} />
            <Wave y={115} color="rgba(80,160,200,0.3)" amplitude={12} period={200} offset={waveOffset * 2} />
            <Wave y={128} color="rgba(60,140,180,0.4)" amplitude={8} period={160} offset={waveOffset * 1.2} />
            <Wave y={140} color="rgba(40,120,170,0.5)" amplitude={6} period={240} offset={waveOffset} />
          </svg>

          {/* Koi fish swimming */}
          <div style={{ position: 'relative', height: '120px', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              left: `${fishPos[0]}%`,
              top: '20px',
              transition: 'none',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
            }}>

            </div>

            {/* Lotus on water */}
            {[15, 45, 72].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${pos}%`,
                bottom: '10px',
                animation: `floatLotus ${3 + i}s ease-in-out ${i * 0.7}s infinite`,
              }}>
                <LotusFlower size={48} opacity={0.85} />
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ABOUT / FEATURES SECTION
        ══════════════════════════════════════════ */}
        <section style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '60px 24px 80px',
        }}>
          {/* Section heading */}
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              fontSize: '13px', letterSpacing: '4px', color: '#C84B8A',
              fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px',
            }}>
              🌺 VÌ SAO CHỌN ZOLO 🌺
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: '#2C1810',
              margin: 0,
              fontWeight: 700,
              lineHeight: 1.3,
            }}>
              Ứng dụng của người Việt,<br />
              <span style={{ color: '#C84B8A' }}>dành cho người Việt</span>
            </h2>
            <p style={{
              marginTop: '16px', color: '#666', fontSize: '16px',
              lineHeight: 1.8, maxWidth: '560px', margin: '16px auto 0',
            }}>
              ZOLO được xây dựng với tâm huyết kết nối cộng đồng Việt Nam — từ Bắc chí Nam,
              từ trong nước đến hải ngoại — bằng những tin nhắn ấm áp và chân thật.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                icon: '🌸',
                title: 'Giao diện Thuần Việt',
                desc: 'Thiết kế lấy cảm hứng từ văn hóa truyền thống Việt Nam, thân thiện và gần gũi với mọi lứa tuổi.',
                accent: '#C84B8A',
              },
              {
                icon: '⚡',
                title: 'Nhắn tin Tức thì',
                desc: 'Tin nhắn được gửi đi trong nháy mắt, dù bạn đang ở Hà Nội, Sài Gòn hay bên kia đại dương.',
                accent: '#E8A820',
              },
              {
                icon: '🔒',
                title: 'Bảo mật & Riêng tư',
                desc: 'Tin nhắn của bạn được mã hóa đầu cuối. Nói chuyện thoải mái, không lo bị rò rỉ thông tin.',
                accent: '#5D8C4A',
              },
              {
                icon: '🎎',
                title: 'Nhóm Gia đình & Bạn bè',
                desc: 'Lập nhóm chat với gia đình, bạn bè, đồng nghiệp. Chia sẻ những bảng tin đáng nhớ mỗi ngày.',
                accent: '#8B5CF6',
              },
              {
                icon: '🌊',
                title: 'Sticker & Emoji Việt',
                desc: 'Bộ sticker phong phú lấy cảm hứng từ văn hóa Việt: áo dài, bánh chưng, hoa sen, cá chép...',
                accent: '#E85D3A',
              },
              {
                icon: '📱',
                title: 'Mọi thiết bị, mọi lúc',
                desc: 'Dùng trên điện thoại hay máy tính bảng, ZOLO luôn sẵn sàng kết nối bạn với người thân yêu.',
                accent: '#0EA5E9',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="feature-card"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div style={{
                  width: '64px', height: '64px',
                  background: `${f.accent}18`,
                  borderRadius: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '30px',
                  margin: '0 auto 16px',
                  border: `1.5px solid ${f.accent}30`,
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '18px',
                  color: '#2C1810',
                  margin: '0 0 10px',
                  fontWeight: 700,
                }}>
                  {f.title}
                </h3>
                <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA BOTTOM SECTION
        ══════════════════════════════════════════ */}
        <section style={{
          background: 'linear-gradient(135deg, #9B2D6F 0%, #C84B8A 50%, #D4548E 100%)',
          padding: '80px 24px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }} />

          {/* Floating lotuses */}
          <div style={{ position: 'absolute', top: '20px', left: '8%', opacity: 0.3, animation: 'floatLotus 4s ease-in-out infinite' }}>
            <LotusFlower size={80} />
          </div>
          <div style={{ position: 'absolute', bottom: '20px', right: '8%', opacity: 0.3, animation: 'floatLotus 5s ease-in-out 1s infinite' }}>
            <LotusFlower size={60} />
          </div>
          <div style={{ position: 'absolute', top: '30%', right: '3%', opacity: 0.2, animation: 'floatLotus 3.5s ease-in-out 0.5s infinite' }}>
            <LotusFlower size={50} />
          </div>

          <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
            {/* Figures row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px', opacity: 0.9 }}>
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center' }} className="figure-sway">
                <AoDai color="#FFE4F0" accent="#F4C430" />
              </div>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'bottom center', animationDelay: '0.5s' }} className="figure-sway">
                <AoDai color="#FFF5CC" accent="#C84B8A" />
              </div>
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'bottom center', animationDelay: '1s' }} className="figure-sway">
                <AoDai color="#E0F0FF" accent="#F4C430" />
              </div>
            </div>

            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(26px, 5vw, 42px)',
              color: 'white',
              margin: '0 0 16px',
              fontWeight: 900,
              lineHeight: 1.3,
              textShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}>
              Bắt đầu kết nối ngay hôm nay! 🌺
            </h2>

            <p style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              lineHeight: 1.75,
              marginBottom: '36px',
            }}>
              Hàng triệu người Việt đang trò chuyện, chia sẻ yêu thương mỗi ngày trên ZOLO.
              Tham gia cùng chúng tôi — <strong style={{ color: '#FFE88A' }}>miễn phí hoàn toàn!</strong>
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" style={{
                background: 'white',
                color: '#C84B8A',
                padding: '15px 40px',
                borderRadius: '50px',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                fontSize: '16px',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'inline-block',
                letterSpacing: '0.5px',
              }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
              >
                 Đăng Ký Miễn Phí
              </Link>
              <Link to="/signin" style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                padding: '13px 38px',
                borderRadius: '50px',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                fontSize: '16px',
                textDecoration: 'none',
                border: '2px solid rgba(255,255,255,0.6)',
                transition: 'transform 0.2s, background 0.2s',
                display: 'inline-block',
                letterSpacing: '0.5px',
                backdropFilter: 'blur(8px)',
              }}
                onMouseEnter={e => { e.target.style.transform = 'translateY(-3px)'; e.target.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.target.style.transform = ''; e.target.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                Đăng Nhập
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{
              display: 'flex', gap: '24px', justifyContent: 'center',
              marginTop: '40px', flexWrap: 'wrap',
            }}>
              {['🌺 Miễn phí 100%', ' Bảo mật tuyệt đối', '🇻🇳 Made in Vietnam'].map((badge, i) => (
                <div key={i} style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          background: '#2C1810',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          padding: '24px',
          fontSize: '13px',
        }}>
          <span style={{ color: '#C84B8A', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>ZOLO</span>
          {' '}• Kết nối trái tim Việt • Làm bằng ❤️ tại Việt Nam
        </footer>

      </div>
    </>
  );
};

export default Home;
