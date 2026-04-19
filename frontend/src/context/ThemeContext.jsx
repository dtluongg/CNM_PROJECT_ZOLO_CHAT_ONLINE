/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEME_PRESETS = {
  dark: {
    '--bg-primary': '#0b0e11',
    '--bg-secondary': '#15191c',
    '--bg-secondary-rgb': '21, 25, 28',
    '--bg-tertiary': '#1c2126',
    '--bg-hover': '#252a30',
    '--text-primary': '#f2f3f5',
    '--text-secondary': '#b5bac1',
    '--text-muted': '#949ba4',
    '--accent': '#3b82f6',
    '--accent-rgb': '59, 130, 246',
    '--accent-hover': '#2563eb',
    '--bubble-self': '#3b82f6',
    '--bubble-other': '#2d333b',
    '--border': '#1c2126',
    '--input-bg': '#1c2126',
  },
  light: {
    '--bg-primary': '#f8fafc',
    '--bg-secondary': '#ffffff',
    '--bg-secondary-rgb': '255, 255, 255',
    '--bg-tertiary': '#f1f5f9',
    '--bg-hover': '#e2e8f0',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-muted': '#64748b',
    '--accent': '#0084ff',
    '--accent-rgb': '0, 132, 255',
    '--accent-hover': '#0070da',
    '--bubble-self': '#0084ff',
    '--bubble-other': '#f1f5f9',
    '--border': '#e2e8f0',
    '--input-bg': '#f8fafc',
  },
  midnight: {
    '--bg-primary': '#050505',
    '--bg-secondary': '#0f1115',
    '--bg-secondary-rgb': '15, 17, 21',
    '--bg-tertiary': '#1a1c20',
    '--bg-hover': '#2a2d33',
    '--text-primary': '#ffffff',
    '--text-secondary': '#b0b3b8',
    '--text-muted': '#82858a',
    '--accent': '#ff4785',
    '--accent-rgb': '255, 71, 133',
    '--accent-hover': '#e03e75',
    '--bubble-self': 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
    '--bubble-other': '#1a1c20',
    '--border': '#15171a',
    '--input-bg': '#1a1c20',
  },
  ocean: {
    '--bg-primary': '#0a1628',
    '--bg-secondary': '#0d1f3c',
    '--bg-secondary-rgb': '13, 31, 60',
    '--bg-tertiary': '#112952',
    '--bg-hover': '#163460',
    '--text-primary': '#e8f4f8',
    '--text-secondary': '#8bb8d0',
    '--text-muted': '#5a8a9f',
    '--accent': '#00b4d8',
    '--accent-rgb': '0, 180, 216',
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
