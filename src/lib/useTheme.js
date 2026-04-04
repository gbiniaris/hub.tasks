import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'white', label: 'White' },
  { id: 'blue', label: 'Blue' },
  { id: 'dark', label: 'Dark' },
  { id: 'green', label: 'Green' },
  { id: 'darkgrey', label: 'Dark Grey' },
];

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'white');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  return { theme, setTheme, themes: THEMES };
}