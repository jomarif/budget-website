// Manual light/dark theme toggle. Applies data-theme on <html> and remembers
// the choice in localStorage. Initial value comes from a saved choice, else the
// OS preference (also mirrored by the inline script in index.html to avoid a
// flash of the wrong theme before React mounts).

import { useCallback, useEffect, useState } from 'react';

const KEY = 'budgetApp.theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );

  return { theme, toggle };
}
