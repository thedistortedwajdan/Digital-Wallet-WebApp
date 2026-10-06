import { seedDb, saveDb, userById } from './mock/db.js';
import { setState, signIn } from './state/store.js';
import { setDark } from './state/theme.js';

/**
 * Optional link parameters, meant for portfolio embeds and screenshots:
 *
 *   ?demo            start from fresh test data and sign in as the admin (Amina)
 *   ?demo=user       same, but as a regular member (Daniel)
 *   &lab             open the Test lab
 *   &still           stop payments from arriving on their own (steady screenshots)
 *   &theme=dark      force dark or light
 */
export function applyDemoParams(search = window.location.search) {
  const q = new URLSearchParams(search);
  if (q.has('theme')) setDark(q.get('theme') === 'dark');
  if (q.has('still')) setState({ still: true });
  if (q.has('lab')) setState({ labOpen: true });
  if (q.has('demo')) {
    seedDb();
    saveDb();
    signIn(userById(q.get('demo') === 'user' ? 61 : 58));
  }
}
