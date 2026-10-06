import { currentUser, getState, setState, bump } from '../state/store.js';
import { saveDb } from './db.js';
import { ApiError } from './server.js';

/**
 * Pretends to be the network. Adds latency, checks the session on every call (like a JWT filter),
 * and honours the Test Lab switches: "server error on next request" and "lose the next payment response".
 *
 *   await call(() => server.deposit(...), { money: true })
 */
export function call(fn, { money = false, ms = 450 } = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const s = getState();
        if (s.meId) {
          if (Date.now() > s.exp) throw new ApiError(401, 'Token has expired');
          const me = currentUser();
          if (!me || !me.active) throw new ApiError(403, 'This account has been deactivated');
        }
        if (s.flags.fail) {
          setState({ flags: { ...s.flags, fail: false } });
          throw new ApiError(500, 'Internal error');
        }
        const result = fn();
        saveDb();
        bump();
        if (money && getState().flags.drop) {
          // The server applied the change, but the response never reached the browser.
          setState((cur) => ({ flags: { ...cur.flags, drop: false } }));
          const lost = new ApiError(0, 'Connection lost');
          lost.network = true;
          throw lost;
        }
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
}
