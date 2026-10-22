import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const ThemeContext = createContext(null);
const STORAGE_KEY = 'famisalud-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  } catch {
    // La aplicación debe seguir funcionando aunque localStorage no esté disponible.
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  const root = document.documentElement;

  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  if (document.body) {
    document.body.classList.toggle('dark', isDark);
    document.body.dataset.theme = theme;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // El tema sigue aplicado en memoria aunque no se pueda persistir.
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  const setTheme = useCallback((nextTheme) => {
    const resolvedTheme = typeof nextTheme === 'function' ? nextTheme(theme) : nextTheme;
    const validatedTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    applyThemeToDocument(validatedTheme);
    setThemeState(validatedTheme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
