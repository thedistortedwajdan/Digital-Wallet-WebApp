import { useSyncExternalStore } from 'react';

const KEY = 'folio-theme';
const listeners = new Set();

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
const read = () => {
  const explicit = document.documentElement.dataset.theme;
  return explicit ? explicit === 'dark' : prefersDark();
};

/** Applies a saved choice before the first paint. Without one, the system setting decides. */
export function initTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  } catch { /* storage unavailable */ }
}

export function setDark(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export const useIsDark = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read);
