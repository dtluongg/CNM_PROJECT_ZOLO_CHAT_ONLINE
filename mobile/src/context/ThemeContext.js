import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME as STATIC_THEME } from '../theme';

export const THEME_PRESETS = {
  dark: {
    bgPrimary: '#1e1f22',
    bgSecondary: '#2b2d31',
    bgTertiary: '#313338',
    bgHover: '#35373c',
    bgInput: '#383a40',
    textPrimary: '#f2f3f5',
    textSecondary: '#b5bac1',
    textMuted: '#80848e',
    accent: '#5865f2',
    accentHover: '#4752c4',
    bubbleSelf: '#5865f2',
    bubbleOther: '#3a3c43',
    border: '#1e1f22',
  },
  light: {
    bgPrimary: '#e3e5e8',
    bgSecondary: '#ffffff',
    bgTertiary: '#f2f3f5',
    bgHover: '#e8e9ed',
    bgInput: '#ebedef',
    textPrimary: '#060607',
    textSecondary: '#4e5058',
    textMuted: '#80848e',
    accent: '#5865f2',
    accentHover: '#4752c4',
    bubbleSelf: '#5865f2',
    bubbleOther: '#e3e5e8',
    border: '#e3e5e8',
  },
  midnight: {
    bgPrimary: '#0d0d0d',
    bgSecondary: '#111214',
    bgTertiary: '#18191c',
    bgHover: '#222427',
    bgInput: '#222427',
    textPrimary: '#ffffff',
    textSecondary: '#a3a6aa',
    textMuted: '#72767d',
    accent: '#eb459e',
    accentHover: '#c73886',
    bubbleSelf: '#eb459e',
    bubbleOther: '#222427',
    border: '#0d0d0d',
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
  const [themeName, setThemeName] = useState('dark');
  const [colors, setColors] = useState(THEME_PRESETS['dark']);
  const [loading, setLoading] = useState(true);

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

  const fullTheme = { ...STATIC_THEME, ...colors };

  return (
    <ThemeContext.Provider
      value={{
        themeName,
        theme: fullTheme,
        colors, // Export colors to fix undefined in AppearanceModal
        presets: THEME_PRESETS,
        setTheme,
        setCustomColor,
        resetTheme,
        syncTheme,
      }}
    >
      {loading ? null : children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
