import { useSyncExternalStore } from 'react';
import { db, userById } from '../mock/db.js';

export const SESSION_MS = 15 * 60 * 1000;

const initial = {
  meId: null,
  exp: 0,
  view: 'home',
  authMode: 'login', // login | register | done
  prefill: { email: '', password: '' },
  draft: { iban: '', amt: '' }, // hand-off from Overview / Test Lab to the Send screen
  flags: { drop: false, fail: false },
  notifOpen: false,
  labOpen: false,
  still: false, // demo links can switch off the self-arriving payments
  toasts: [],
  modal: null,
  version: 0, // bumped whenever mock data changes so screens re-read it
};

let state = initial;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export const getState = () => state;
export const setState = (patch) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  emit();
};
export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useStore = (selector = (s) => s) => useSyncExternalStore(subscribe, () => selector(state));

/** Re-render everything that reads the mock database. */
export const bump = () => setState((s) => ({ version: s.version + 1 }));

export const currentUser = () => (state.meId ? userById(state.meId) : null);
export const useCurrentUser = () => {
  useStore((s) => s.version);
  const id = useStore((s) => s.meId);
  return id ? userById(id) : null;
};

export const unreadCount = () => (state.meId ? (db.notifs[state.meId] || []).filter((n) => !n.read).length : 0);

// ---- actions ----
export const navigate = (view) => setState({ view, notifOpen: false });
export const signIn = (user) =>
  setState({ meId: user.id, exp: Date.now() + SESSION_MS, view: 'home', notifOpen: false, draft: { iban: '', amt: '' } });
export const signOut = () => setState({ meId: null, notifOpen: false, modal: null, authMode: 'login', prefill: { email: '', password: '' } });

let toastId = 0;
export const toast = (message, kind = 'ok') => {
  const id = ++toastId;
  setState((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
  setTimeout(() => setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
};
export const openModal = (node, { locked = false } = {}) => setState({ modal: { node, locked } });
export const closeModal = () => setState({ modal: null });
