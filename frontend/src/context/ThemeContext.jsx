/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEME_PRESETS = {
  dark: {
    '--bg-primary':       '#0d1117',
    '--bg-secondary':     '#161b22',
    '--bg-secondary-rgb': '22, 27, 34',
    '--bg-tertiary':      '#1c2128',
    '--bg-hover':         '#21262d',
    '--text-primary':     '#e6edf3',
    '--text-secondary':   '#8d96a0',
    '--text-muted':       '#6e7681',
    '--accent':           '#58a6ff',
    '--accent-rgb':       '88, 166, 255',
    '--accent-hover':     '#388bfd',
    '--bubble-self':      'linear-gradient(135deg,#1a73e8,#388bfd)',
    '--bubble-other':     '#21262d',
    '--border':           '#30363d',
    '--input-bg':         '#0d1117',
    '--shadow-sm':        '0 1px 3px rgba(0,0,0,0.35)',
    '--shadow-md':        '0 4px 12px rgba(0,0,0,0.4)',
    '--shadow-lg':        '0 8px 30px rgba(0,0,0,0.5)',
    '--neumorph':         '4px 4px 10px #080c11,-2px -2px 6px #1e2630',
    '--neumorph-inset':   'inset 2px 2px 5px #080c11,inset -1px -1px 4px #1e2630',
    '--glass-bg':         'rgba(22,27,34,0.75)',
    '--glass-border':     'rgba(255,255,255,0.07)',
    '--radius':           '12px',
  },
  light: {
    '--bg-primary':       '#f0f4f8',
    '--bg-secondary':     '#ffffff',
    '--bg-secondary-rgb': '255, 255, 255',
    '--bg-tertiary':      '#e8eef4',
    '--bg-hover':         '#dde5ee',
    '--text-primary':     '#0f172a',
    '--text-secondary':   '#475569',
    '--text-muted':       '#94a3b8',
    '--accent':           '#0084ff',
    '--accent-rgb':       '0, 132, 255',
    '--accent-hover':     '#0070da',
    '--bubble-self':      'linear-gradient(135deg,#0084ff,#0070da)',
    '--bubble-other':     '#e8eef4',
    '--border':           '#d1dae6',
    '--input-bg':         '#f0f4f8',
    '--shadow-sm':        '0 1px 3px rgba(0,0,0,0.08)',
    '--shadow-md':        '0 4px 12px rgba(0,0,0,0.1)',
    '--shadow-lg':        '0 8px 30px rgba(0,0,0,0.14)',
    '--neumorph':         '4px 4px 10px #c8d0da,-2px -2px 6px #ffffff',
    '--neumorph-inset':   'inset 2px 2px 5px #c8d0da,inset -1px -1px 4px #ffffff',
    '--glass-bg':         'rgba(255,255,255,0.75)',
    '--glass-border':     'rgba(0,0,0,0.06)',
    '--radius':           '12px',
  },
  midnight: {
    '--bg-primary':       '#06060a',
    '--bg-secondary':     '#0e0e16',
    '--bg-secondary-rgb': '14, 14, 22',
    '--bg-tertiary':      '#16161f',
    '--bg-hover':         '#1e1e2a',
    '--text-primary':     '#f0f0ff',
    '--text-secondary':   '#a8a8c0',
    '--text-muted':       '#6e6e88',
    '--accent':           '#c084fc',
    '--accent-rgb':       '192, 132, 252',
    '--accent-hover':     '#a855f7',
    '--bubble-self':      'linear-gradient(135deg,#c084fc,#a855f7)',
    '--bubble-other':     '#16161f',
    '--border':           '#1e1e2a',
    '--input-bg':         '#0e0e16',
    '--shadow-sm':        '0 1px 3px rgba(0,0,0,0.5)',
    '--shadow-md':        '0 4px 12px rgba(0,0,0,0.6)',
    '--shadow-lg':        '0 8px 30px rgba(0,0,0,0.7)',
    '--neumorph':         '4px 4px 10px #030306,-2px -2px 6px #14141e',
    '--neumorph-inset':   'inset 2px 2px 5px #030306,inset -1px -1px 4px #14141e',
    '--glass-bg':         'rgba(14,14,22,0.8)',
    '--glass-border':     'rgba(255,255,255,0.05)',
    '--radius':           '12px',
  },
  ocean: {
    '--bg-primary':       '#071120',
    '--bg-secondary':     '#0c1a2e',
    '--bg-secondary-rgb': '12, 26, 46',
    '--bg-tertiary':      '#112440',
    '--bg-hover':         '#172e52',
    '--text-primary':     '#e0f0ff',
    '--text-secondary':   '#7ab0cc',
    '--text-muted':       '#4a7a96',
    '--accent':           '#22d3ee',
    '--accent-rgb':       '34, 211, 238',
    '--accent-hover':     '#06b6d4',
    '--bubble-self':      'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    '--bubble-other':     '#172e52',
    '--border':           '#0c1a2e',
    '--input-bg':         '#071120',
    '--shadow-sm':        '0 1px 3px rgba(0,0,0,0.4)',
    '--shadow-md':        '0 4px 12px rgba(0,0,0,0.5)',
    '--shadow-lg':        '0 8px 30px rgba(0,0,0,0.6)',
    '--neumorph':         '4px 4px 10px #040c17,-2px -2px 6px #102035',
    '--neumorph-inset':   'inset 2px 2px 5px #040c17,inset -1px -1px 4px #102035',
    '--glass-bg':         'rgba(12,26,46,0.8)',
    '--glass-border':     'rgba(255,255,255,0.06)',
    '--radius':           '12px',
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