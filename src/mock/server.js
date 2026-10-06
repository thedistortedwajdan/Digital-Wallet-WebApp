import { EMAIL, money, hex8 } from '../lib/format.js';
import { BANKS, BANK_CODES, makeIban, mod97 } from '../lib/iban.js';
import {
  db, userById, walletOf, walletByIban, hasActivity, counterparty, notify, recordTx,
} from './db.js';

/** Same error shape as the Spring API: status, message and optional per-field errors. */
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
const fail = (status, message, fields) => new ApiError(status, message, fields);
const none = (f) => Object.keys(f).length === 0;

const MAX_PIN_TRIES = 3;
const LOCK_MS = 30_000;

/** Runs `run` once per (wallet, key). A repeat with the same request returns the first result; a different request is a 409. */
function idempotent(walletId, key, fingerprint, run) {
  if (!key) return run();
  const slot = walletId + ':' + key;
  const seen = db.idem[slot];
  if (seen) {
    if (seen.fp !== fingerprint) throw fail(409, 'Idempotency key was already used for a different request');
    return { ...seen.result, replayed: true };
  }
  const result = run();
  db.idem[slot] = { fp: fingerprint, result };
  return result;
}

export const server = {
  // ---- auth and profile ----
  login(email, password) {
    const f = {};
    if (!email.trim()) f.email = 'must not be blank';
    else if (!EMAIL.test(email.trim())) f.email = 'must be a well-formed email address';
    if (!password) f.password = 'must not be blank';
    if (!none(f)) throw fail(400, 'Validation failed', f);
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw fail(401, 'Email or password is incorrect');
    if (!u.active) throw fail(403, 'This account has been deactivated');
    return u;
  },

  register({ first, last, email, password, mpin }) {
    const f = {};
    if (!first.trim()) f.first = 'must not be blank';
    if (!last.trim()) f.last = 'must not be blank';
    if (!EMAIL.test(email.trim())) f.email = 'must be a well-formed email address';
    if (password.length < 8 || password.length > 100) f.password = 'size must be between 8 and 100';
    if (!/^\d{4}$/.test(mpin || '')) f.mpin = 'must be exactly 4 digits';
    if (!none(f)) throw fail(400, 'Validation failed', f);
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw fail(409, 'Email already registered', { email: 'An account with this email already exists.' });
    }
    const wid = db.nw++;
    const bank = BANK_CODES[wid % BANK_CODES.length];
    db.wallets[wid] = { id: wid, bal: 0, status: 'ACTIVE', created: Date.now(), bank, iban: makeIban(bank, wid) };
    const u = {
      id: db.nu++, first: first.trim(), last: last.trim(), email: email.trim(), password, mpin,
      fails: 0, lockUntil: 0, role: 'USER', active: true, wid, created: Date.now(),
    };
    db.users.push(u);
    notify(u.id, 'info', 'Welcome to Folio', 'Your wallet is ready. Add money to get started.');
    return u;
  },

  updateUser(id, { first, last, email }) {
    const f = {};
    if (!first.trim()) f.first = 'must not be blank';
    if (!last.trim()) f.last = 'must not be blank';
    if (!EMAIL.test(email.trim())) f.email = 'must be a well-formed email address';
    if (!none(f)) throw fail(400, 'Validation failed', f);
    if (db.users.some((u) => u.id !== id && u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw fail(409, 'Email already registered', { email: 'Another account already uses this email.' });
    }
    return Object.assign(userById(id), { first: first.trim(), last: last.trim(), email: email.trim() });
  },

  changePassword(id, current, next) {
    const u = userById(id);
    const f = {};
    if (!current) f.current = 'must not be blank';
    if (next.length < 8 || next.length > 100) f.next = 'size must be between 8 and 100';
    if (!none(f)) throw fail(400, 'Validation failed', f);
    if (u.password !== current) throw fail(400, 'Current password is incorrect', { current: 'Current password is incorrect.' });
    if (next === current) throw fail(400, 'New password must be different', { next: 'New password must be different from the current one.' });
    u.password = next;
    notify(id, 'sec', 'Password changed', 'Your password was updated just now.');
  },

  changeMpin(id, current, next) {
    const u = userById(id);
    const f = {};
    if (!/^\d{4}$/.test(current)) f.current = 'must be exactly 4 digits';
    if (!/^\d{4}$/.test(next)) f.next = 'must be exactly 4 digits';
    if (!none(f)) throw fail(400, 'Validation failed', f);
    if (u.mpin !== current) throw fail(400, 'Current MPIN is incorrect', { current: 'Current MPIN is incorrect.' });
    if (next === current) throw fail(400, 'New MPIN must be different', { next: 'New MPIN must be different from the current one.' });
    u.mpin = next;
    notify(id, 'sec', 'MPIN changed', 'Your MPIN was updated just now.');
  },

  // ---- wallet ----
  transactions(u, page, size) {
    const all = db.txs.filter((t) => t.wid === u.wid).sort((a, b) => b.at - a.at || b.id - a.id);
    return { content: all.slice(page * size, page * size + size), page, size, total: all.length };
  },

  /** Deposit or withdrawal. */
  money(u, type, amt, desc, key) {
    const w = walletOf(u);
    if (w.status !== 'ACTIVE') throw fail(409, 'Wallet is not active');
    return idempotent(u.wid, key, [type, amt, desc].join('|'), () => {
      if (type === 'WITHDRAWAL' && w.bal < amt) throw fail(409, 'Insufficient balance');
      if (String(w.bal + amt).length > 17) throw fail(400, 'Resulting balance exceeds the maximum supported amount');
      return { tx: recordTx(u.wid, type, amt, desc, null, hex8()) };
    });
  },

  // ---- IBAN resolution: three separate steps so the UI can show them one by one ----
  checkIban(raw) {
    const iban = String(raw).replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{18}$/.test(iban) || iban.slice(0, 2) !== 'GB') {
      throw fail(400, 'This does not look like a valid IBAN. Check the length and characters.');
    }
    if (mod97(iban.slice(4) + iban.slice(0, 4)) !== 1) {
      throw fail(400, 'The check digits do not add up. One character is probably mistyped.');
    }
    return iban;
  },

  findBank(iban) {
    const code = iban.slice(4, 8);
    const bank = BANKS[code];
    if (!bank) throw fail(404, 'We could not find a bank for this IBAN.');
    return { code, name: bank.name, city: bank.city, sort: iban.slice(8, 14) };
  },

  findHolder(u, iban) {
    const wallet = walletByIban(iban);
    const owner = wallet && db.users.find((x) => x.wid === wallet.id);
    if (!owner) throw fail(404, 'No account is registered to this IBAN.');
    if (owner.id === u.id) throw fail(400, 'That is your own account. Use Add money to top up.');
    if (!owner.active) throw fail(409, 'This account is deactivated, so it cannot receive money.');
    return { name: owner.first + ' ' + owner.last[0] + '.', iban };
  },

  /** Transfer by IBAN. The MPIN is checked first; three wrong tries lock transfers for 30 seconds. */
  transfer(u, rawIban, amt, desc, key, pin) {
    const w = walletOf(u);
    if (w.status !== 'ACTIVE') throw fail(409, 'Wallet is not active');
    if (u.lockUntil > Date.now()) {
      throw fail(429, 'Too many wrong MPIN attempts. Try again in ' + Math.ceil((u.lockUntil - Date.now()) / 1000) + ' seconds.');
    }
    return idempotent(u.wid, key, ['T', rawIban, amt, desc].join('|'), () => {
      if (pin !== u.mpin) {
        u.fails = (u.fails || 0) + 1;
        if (u.fails >= MAX_PIN_TRIES) {
          u.fails = 0;
          u.lockUntil = Date.now() + LOCK_MS;
          throw fail(429, 'Too many wrong MPIN attempts. Transfers are locked for 30 seconds.');
        }
        const left = MAX_PIN_TRIES - u.fails;
        throw fail(400, 'Incorrect MPIN. ' + left + (left === 1 ? ' attempt' : ' attempts') + ' left.');
      }
      u.fails = 0;
      const iban = server.checkIban(rawIban);
      server.findBank(iban);
      server.findHolder(u, iban);
      const toWallet = walletByIban(iban);
      const recipient = db.users.find((x) => x.wid === toWallet.id);
      if (w.bal < amt) throw fail(409, 'Insufficient balance');
      const ref = hex8();
      const from = counterparty(u.wid);
      const to = counterparty(toWallet.id);
      const tx = recordTx(u.wid, 'TRANSFER_OUT', amt, desc, to, ref);
      const incoming = recordTx(toWallet.id, 'TRANSFER_IN', amt, desc, from, ref);
      notify(u.id, 'out', 'Money sent', money(amt) + ' sent to ' + to.name, tx.id);
      notify(recipient.id, 'in', 'Money received', money(amt) + ' received from ' + from.name, incoming.id);
      return { tx, to };
    });
  },

  // ---- admin ----
  listUsers(page, size) {
    const all = db.users.slice().sort((a, b) => a.id - b.id);
    return { content: all.slice(page * size, page * size + size), total: all.length };
  },
  setRole(actor, id, role) {
    if (actor.id === id) throw fail(409, 'You cannot change your own role');
    userById(id).role = role;
  },
  setActive(actor, id, active) {
    if (actor.id === id) throw fail(409, 'You cannot change your own status');
    const target = userById(id);
    target.active = active;
    notify(id, active ? 'info' : 'sec', active ? 'Account reactivated' : 'Account deactivated',
      active ? 'An administrator restored your access.' : 'An administrator deactivated your account.');
  },
  deleteUser(actor, id) {
    if (actor.id === id) throw fail(409, 'You cannot delete your own account');
    const target = userById(id);
    if (hasActivity(target)) throw fail(409, 'User has a wallet balance or transaction history; deactivate the account instead');
    db.users = db.users.filter((x) => x.id !== id);
    delete db.wallets[target.wid];
  },

  // ---- simulation helpers (not part of the API) ----
  simulateIncoming(u) {
    const senders = [
      ['Sofia Martinez', 'MRDN', 3101], ['Kenji Watanabe', 'HRBR', 3102], ['Olivia Brandt', 'NRTH', 3103],
      ['Hassan Mirza', 'COPP', 3104], ['Chloe Dubois', 'MRDN', 3105], ['Ravi Patel', 'NRTH', 3106],
    ];
    const reasons = ['Lunch', 'Split bill', 'Thanks!', 'Gift', 'Invoice 204', 'Concert tickets', 'Train fare', 'Coffee'];
    const [full, bank, seed] = senders[Math.floor(Math.random() * senders.length)];
    const [first, last] = full.split(' ');
    const from = { name: first + ' ' + last[0] + '.', bank, iban: makeIban(bank, seed) };
    const amt = 500 + Math.floor(Math.random() * 39500);
    const tx = recordTx(u.wid, 'TRANSFER_IN', amt, reasons[Math.floor(Math.random() * reasons.length)], from, hex8());
    notify(u.id, 'in', 'Money received', money(amt) + ' received from ' + from.name, tx.id);
    return { amt, from, tx };
  },
};
