// Recharts applies colors as SVG presentation attributes, where `var(--x)`
// does not resolve. This hook reads the computed values of our CSS theme
// tokens and re-reads them when the OS light/dark preference changes, so the
// charts stay theme-aware with concrete colors.

import { useEffect, useState, useCallback } from 'react';

const TOKENS = [
  'income', 'expense', 'border', 'pink-100', 'text-soft', 'surface',
];

function readColors() {
  const styles = getComputedStyle(document.documentElement);
  const out = {};
  TOKENS.forEach((t) => {
    out[t] = styles.getPropertyValue(`--${t}`).trim() || '#cccccc';
  });
  return out;
}

export function useThemeColors() {
  const [colors, setColors] = useState(readColors);

  const refresh = useCallback(() => setColors(readColors()), []);

  useEffect(() => {
    // Re-read when the user toggles the theme (data-theme on <html> changes)…
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    // …and if the OS preference changes while on the default (no saved choice).
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', refresh);
    return () => {
      observer.disconnect();
      mq.removeEventListener('change', refresh);
    };
  }, [refresh]);

  return colors;
}
