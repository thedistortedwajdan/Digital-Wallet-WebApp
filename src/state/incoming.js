import { currentUser, getState, bump, toast } from './store.js';
import { server } from '../mock/server.js';
import { saveDb } from '../mock/db.js';
import { money } from '../lib/format.js';

let timer = 0;

/** Credits the signed-in user with a payment from a made-up sender and tells them about it. */
export function receiveNow() {
  const user = currentUser();
  if (!user || !user.active) return;
  const { amt, from } = server.simulateIncoming(user);
  saveDb();
  bump();
  toast(money(amt) + ' received from ' + from.name);
}

/**
 * While someone is signed in, money arrives on its own. The first payment comes after 18 to 30 seconds,
 * then one every 40 to 120 seconds, so a demo shows the notification flow without a long wait.
 */
export function startIncoming() {
  stopIncoming();
  const schedule = (first) => {
    const wait = first ? 18000 + Math.random() * 12000 : 40000 + Math.random() * 80000;
    timer = window.setTimeout(() => {
      if (getState().meId) receiveNow();
      if (getState().meId) schedule(false);
    }, wait);
  };
  schedule(true);
}

export function stopIncoming() {
  window.clearTimeout(timer);
}
