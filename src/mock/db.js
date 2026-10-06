import { hex8 } from '../lib/format.js';
import { makeIban } from '../lib/iban.js';

/**
 * In-memory "database" for the mock server. It is saved to localStorage so a refresh keeps your data,
 * and `resetDb()` brings back the seed. Passwords and MPINs are plain text on purpose: this is test data.
 */
export const db = {};
const KEY = 'folio-mock-db-v2';

const HOUR = 3600e3;
const DAY = 24 * HOUR;

export const userById = (id) => db.users.find((u) => u.id === id);
export const walletOf = (u) => db.wallets[u.wid];
export const walletByIban = (iban) => Object.values(db.wallets).find((w) => w.iban === iban);
export const hasActivity = (u) => walletOf(u).bal > 0 || db.txs.some((t) => t.wid === u.wid);

/** Public counterparty summary stored on each ledger entry. */
export const counterparty = (walletId) => {
  const u = db.users.find((x) => x.wid === walletId);
  const w = db.wallets[walletId];
  return { name: u.first + ' ' + u.last[0] + '.', bank: w.bank, iban: w.iban };
};

export function notify(userId, type, title, body, txId = null) {
  (db.notifs[userId] = db.notifs[userId] || []).unshift({
    id: db.nn++, type, title, body, at: Date.now(), read: false, txId,
  });
}

export function recordTx(walletId, type, amt, desc, cp, ref) {
  const w = db.wallets[walletId];
  const outgoing = type === 'WITHDRAWAL' || type === 'TRANSFER_OUT';
  const before = w.bal;
  w.bal += outgoing ? -amt : amt;
  const tx = {
    id: db.nt++, wid: walletId, cp: cp || null, type, amt,
    before, after: w.bal, status: 'COMPLETED', ref: ref || hex8(), desc: desc || '', at: Date.now(),
  };
  db.txs.push(tx);
  return tx;
}

export function seedDb() {
  const now = Date.now();
  const user = (id, first, last, email, role, active, wid, daysAgo) => ({
    id, first, last, email, password: 'password123', mpin: '1234', fails: 0, lockUntil: 0,
    role, active, wid, created: now - daysAgo * DAY,
  });
  const fresh = {
    users: [
      user(58, 'Amina', 'Rahman', 'amina.rahman@example.com', 'ADMIN', true, 1042, 52),
      user(61, 'Daniel', 'Okafor', 'daniel.okafor@example.com', 'USER', true, 2041, 50),
      user(64, 'Lena', 'Fischer', 'lena.fischer@example.com', 'ADMIN', true, 1987, 45),
      user(70, 'Marcus', 'Webb', 'marcus.webb@example.com', 'USER', false, 2210, 33),
      user(73, 'Priya', 'Nair', 'priya.nair@example.com', 'USER', true, 2305, 26),
      user(77, 'Tomás', 'Alvarez', 'tomas.alvarez@example.com', 'USER', true, 2311, 7),
    ],
    wallets: {}, txs: [], idem: {}, notifs: {}, nn: 1, nu: 78, nw: 2400, nt: 1,
  };
  Object.keys(db).forEach((k) => delete db[k]);
  Object.assign(db, fresh);

  const bankOfWallet = { 1042: 'NRTH', 2041: 'MRDN', 1987: 'HRBR', 2210: 'NRTH', 2305: 'COPP', 2311: 'MRDN' };
  Object.entries(bankOfWallet).forEach(([w, bank]) => {
    db.wallets[w] = { id: Number(w), bal: 0, status: 'ACTIVE', created: now - 30 * DAY, bank, iban: makeIban(bank, Number(w)) };
  });

  const add = (wid, type, amt, desc, cpWallet, at, ref) => {
    const tx = recordTx(wid, type, amt, desc, cpWallet ? counterparty(cpWallet) : null, ref);
    tx.at = at;
  };

  // Amina: older history, then the entries shown in the design
  const older = [
    ['DEPOSIT', 500000, 'First top-up'], ['TRANSFER_OUT', 8500, 'Groceries', 1987], ['WITHDRAWAL', 20000, 'Cash'],
    ['TRANSFER_IN', 34000, 'Book club', 1987], ['TRANSFER_OUT', 6000, 'Coffee beans', 2041], ['DEPOSIT', 150000, 'Freelance'],
    ['TRANSFER_OUT', 41000, 'Train tickets', 2305], ['WITHDRAWAL', 15000, 'Cash'], ['DEPOSIT', 306500, 'Bonus payout'],
  ];
  older.forEach((o, i) => add(1042, o[0], o[1], o[2], o[3], now - (32 - i * 2.5) * DAY));
  const recent = [
    ['DEPOSIT', 200000, 'Freelance payout', null, 8 * 24], ['TRANSFER_OUT', 12000, 'Groceries', 1987, 7 * 24],
    ['TRANSFER_IN', 8000, 'Concert tickets', 2210, 6 * 24], ['WITHDRAWAL', 30000, 'Cash for the week', null, 4 * 24],
    ['DEPOSIT', 150000, 'Salary top-up', null, 3 * 24], ['TRANSFER_IN', 57050, 'Rent share', 1987, 1.2 * 24],
    ['TRANSFER_OUT', 25000, 'Dinner split', 2041, 3],
  ];
  recent.forEach((r) => add(1042, r[0], r[1], r[2], r[3], now - r[4] * HOUR, r[2] === 'Dinner split' ? '7F3A91C2' : undefined));

  add(2041, 'DEPOSIT', 80000, 'Welcome deposit', null, now - 20 * DAY);
  add(2041, 'TRANSFER_IN', 25000, 'Dinner split', 1042, now - 3 * HOUR, '7F3A91C2');
  add(1987, 'DEPOSIT', 240000, 'Opening balance', null, now - 30 * DAY);
  add(2210, 'DEPOSIT', 50000, 'Opening balance', null, now - 30 * DAY);
  add(2210, 'WITHDRAWAL', 50000, 'Closing out', null, now - 12 * DAY);

  const note = (type, title, body, hoursAgo, read) => {
    (db.notifs[58] = db.notifs[58] || []).push({ id: db.nn++, type, title, body, at: now - hoursAgo * HOUR, read, txId: null });
  };
  note('info', 'Your MPIN protects every transfer', 'Keep it private. You can change it any time in Profile & security.', 60, false);
  note('out', 'Money sent', '$250.00 sent to Daniel O.', 3, true);
  note('in', 'Money received', '$570.50 received from Lena F.', 29, false);
  db.notifs[58].sort((a, b) => b.at - a.at);
}

export function saveDb() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage unavailable */ }
}
export function loadDb() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      Object.keys(db).forEach((k) => delete db[k]);
      Object.assign(db, JSON.parse(raw));
      return;
    }
  } catch { /* fall through to seed */ }
  seedDb();
}
export function resetDb() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  seedDb();
  saveDb();
}
