/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEME_PRESETS = {
  dark: {
    '--bg-primary': '#0b0e11',
    '--bg-secondary': '#15191c',
    '--bg-tertiary': '#1c2126',
    '--bg-hover': '#252a30',
    '--text-primary': '#f2f3f5',
    '--text-secondary': '#b5bac1',
    '--text-muted': '#949ba4',
    '--accent': '#3b82f6',
    '--accent-hover': '#2563eb',
    '--bubble-self': '#3b82f6',
    '--bubble-other': '#2d333b',
    '--border': '#1c2126',
    '--input-bg': '#1c2126',
  },
  light: {
    '--bg-primary': '#f8fafc',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#f1f5f9',
    '--bg-hover': '#e2e8f0',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-muted': '#64748b',
    '--accent': '#0084ff',
    '--accent-hover': '#0070da',
    '--bubble-self': '#0084ff',
    '--bubble-other': '#f1f5f9',
    '--border': '#e2e8f0',
    '--input-bg': '#f8fafc',
  },
  midnight: {
    '--bg-primary': '#0d0d0d',
    '--bg-secondary': '#111214',
    '--bg-tertiary': '#18191c',
    '--bg-hover': '#222427',
    '--text-primary': '#ffffff',
    '--text-secondary': '#a3a6aa',
    '--text-muted': '#72767d',
    '--accent': '#eb459e',
    '--accent-hover': '#c73886',
    '--bubble-self': '#eb459e',
    '--bubble-other': '#222427',
    '--border': '#0d0d0d',
    '--input-bg': '#222427',
  },
  ocean: {
    '--bg-primary': '#0a1628',
    '--bg-secondary': '#0d1f3c',
    '--bg-tertiary': '#112952',
    '--bg-hover': '#163460',
    '--text-primary': '#e8f4f8',
    '--text-secondary': '#8bb8d0',
    '--text-muted': '#5a8a9f',
    '--accent': '#00b4d8',
    '--accent-hover': '#0096b7',
    '--bubble-self': '#00b4d8',
    '--bubble-other': '#163460',
    '--border': '#0a1628',
    '--input-bg': '#163460',
  },
};

const STORAGE_KEY = 'zolo_theme';

const ThemeContext = createContext(null);

const applyColorsToRoot = (colorMap) => {
  const root = document.documentElement;
  Object.entries(colorMap).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.name || 'dark';
      }
    } catch { /* ignore */ }
    return 'dark';
  });

  const [colors, setColorsState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.colors) return parsed.colors;
      }
    } catch { /* ignore */ }
    return THEME_PRESETS['dark'];
  });

  useEffect(() => {
    applyColorsToRoot(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: theme, colors }));
  }, [colors, theme]);

  const setTheme = useCallback((name) => {
    if (!THEME_PRESETS[name]) return;
    setThemeState(name);
    setColorsState({ ...THEME_PRESETS[name] });
  }, []);

  const setCustomColor = useCallback((key, value) => {
    setThemeState('custom');
    setColorsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme('dark');
  }, [setTheme]);

  const syncTheme = useCallback((dbThemeName, dbThemeColors) => {
    if (dbThemeName) {
      setThemeState(dbThemeName);
    }
    if (dbThemeColors && Object.keys(dbThemeColors).length > 0) {
      setColorsState(dbThemeColors);
    } else if (dbThemeName && THEME_PRESETS[dbThemeName]) {
      setColorsState({ ...THEME_PRESETS[dbThemeName] });
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        presets: THEME_PRESETS,
        setTheme,
        setCustomColor,
        resetTheme,
        syncTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
