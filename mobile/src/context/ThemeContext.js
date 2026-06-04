import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME as STATIC_THEME } from '../theme';
import { useAuth } from './AuthContext';

export const THEME_PRESETS = {
  dark: {
    bgPrimary: '#0b0e11',
    bgSecondary: '#15191c',
    bgTertiary: '#1c2126',
    bgHover: '#252a30',
    bgInput: '#1c2126',
    textPrimary: '#f2f3f5',
    textSecondary: '#b5bac1',
    textMuted: '#949ba4',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    bubbleSelf: '#3b82f6',
    bubbleOther: '#2d333b',
    border: '#1c2126',
  },
  light: {
    bgPrimary: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    bgHover: '#e2e8f0',
    bgInput: '#f8fafc',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    accent: '#0084ff',
    accentHover: '#0070da',
    bubbleSelf: '#0084ff',
    bubbleOther: '#f1f5f9',
    border: '#e2e8f0',
  },
  midnight: {
    bgPrimary: '#050505',
    bgSecondary: '#0f1115',
    bgTertiary: '#1a1c20',
    bgHover: '#2a2d33',
    bgInput: '#1a1c20',
    textPrimary: '#ffffff',
    textSecondary: '#b0b3b8',
    textMuted: '#82858a',
    accent: '#ff4785',
    accentHover: '#e03e75',
    bubbleSelf: '#ff4785',
    bubbleOther: '#1a1c20',
    border: '#15171a',
  },
  ocean: {
    bgPrimary: '#0a1628',
    bgSecondary: '#0d1f3c',
    bgTertiary: '#112952',
    bgHover: '#163460',
    bgInput: '#163460',
    textPrimary: '#e8f4f8',
    textSecondary: '#8bb8d0',
    textMuted: '#5a8a9f',
    accent: '#00b4d8',
    accentHover: '#0096b7',
    bubbleSelf: '#00b4d8',
    bubbleOther: '#163460',
    border: '#0a1628',
  },
};

const STORAGE_KEY = 'zolo_theme';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [themeName, setThemeName] = useState('dark');
  const [colors, setColors] = useState(THEME_PRESETS['dark']);
  const [loading, setLoading] = useState(true);
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) setThemeName(parsed.name);
          if (parsed.colors) setColors(parsed.colors);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, []);

  const saveToStorage = async (name, newColors) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ name, colors: newColors }));
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const setTheme = useCallback((name) => {
    if (!THEME_PRESETS[name]) return;
    setThemeName(name);
    const newColors = { ...THEME_PRESETS[name] };
    setColors(newColors);
    saveToStorage(name, newColors);
  }, []);

  const setCustomColor = useCallback((key, value) => {
    setThemeName('custom');
    setColors((prev) => {
      const newColors = { ...prev, [key]: value };
      saveToStorage('custom', newColors);
      return newColors;
    });
  }, []);

  const resetTheme = useCallback(() => {
    setTheme('dark');
  }, [setTheme]);

  const syncTheme = useCallback((dbThemeName, dbThemeColors) => {
    const mapWebToMobileKeys = (webColors) => {
      const mapping = {
        '--bg-primary': 'bgPrimary',
        '--bg-secondary': 'bgSecondary',
        '--bg-tertiary': 'bgTertiary',
        '--bg-hover': 'bgHover',
        '--input-bg': 'bgInput',
        '--text-primary': 'textPrimary',
        '--text-secondary': 'textSecondary',
        '--text-muted': 'textMuted',
        '--accent': 'accent',
        '--accent-hover': 'accentHover',
        '--bubble-self': 'bubbleSelf',
        '--bubble-other': 'bubbleOther',
        '--border': 'border',
      };
      const result = {};
      for (const key in webColors) {
        if (mapping[key]) result[mapping[key]] = webColors[key];
        else result[key] = webColors[key];
      }
      return result;
    };

    if (dbThemeName) setThemeName(dbThemeName);

    if (dbThemeColors && Object.keys(dbThemeColors).length > 0) {
      const mobileColors = mapWebToMobileKeys(dbThemeColors);
      setColors(mobileColors);
      saveToStorage(dbThemeName || 'custom', mobileColors);
    } else if (dbThemeName && THEME_PRESETS[dbThemeName]) {
      const newColors = { ...THEME_PRESETS[dbThemeName] };
      setColors(newColors);
      saveToStorage(dbThemeName, newColors);
    }
  }, []);

  // ── Tự động áp dụng chủ đề màu mà user đã cấu hình (lưu ở backend) ──
  // Khi đăng nhập / khôi phục phiên / refresh profile, AuthContext cập nhật `user`.
  // Ta đồng bộ themeName + themeColors từ DB xuống giao diện mobile để
  // giao diện luôn khớp với cấu hình của người dùng trên mọi thiết bị.
  useEffect(() => {
    if (!user) {
      lastSyncedRef.current = null;
      return;
    }
    const dbThemeName = user.themeName || null;
    const dbThemeColors = user.themeColors || null;
    if (!dbThemeName && !dbThemeColors) return;

    // Chỉ đồng bộ khi dữ liệu theme từ DB thực sự thay đổi để tránh
    // ghi đè các thay đổi cục bộ đang xem trước một cách không cần thiết.
    const signature = JSON.stringify({ name: dbThemeName, colors: dbThemeColors });
    if (lastSyncedRef.current === signature) return;
    lastSyncedRef.current = signature;

    syncTheme(dbThemeName, dbThemeColors);
  }, [user, syncTheme]);

  // Memo hóa để `theme` chỉ đổi tham chiếu khi màu thực sự đổi — tránh việc
  // toàn bộ subtree dùng useTheme() render lại mỗi khi ThemeProvider re-render
  // (vd: do AuthContext thay đổi), gây tạo lại StyleSheet liên tục và lag.
  const fullTheme = useMemo(() => ({ ...STATIC_THEME, ...colors }), [colors]);

  const value = useMemo(() => ({
    themeName,
    theme: fullTheme,
    colors, // Export colors to fix undefined in AppearanceModal
    presets: THEME_PRESETS,
    setTheme,
    setCustomColor,
    resetTheme,
    syncTheme,
  }), [themeName, fullTheme, colors, setTheme, setCustomColor, resetTheme, syncTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {loading ? null : children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
