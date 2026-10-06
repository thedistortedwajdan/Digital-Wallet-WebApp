import { beforeEach, describe, expect, it } from 'vitest';
import { db, seedDb, userById, walletOf } from './db.js';
import { server } from './server.js';
import { makeIban, mod97 } from '../lib/iban.js';

const amina = () => userById(58);
const daniel = () => userById(61);
const marcus = () => userById(70);
const attempt = (fn) => { try { fn(); return null; } catch (e) { return e; } };

beforeEach(() => seedDb());

describe('IBAN resolution', () => {
  it('generates IBANs whose check digits are valid', () => {
    const iban = makeIban('NRTH', 1042);
    expect(iban).toMatch(/^GB\d{2}NRTH\d{14}$/);
    expect(mod97(iban.slice(4) + iban.slice(0, 4))).toBe(1);
  });

  it('accepts a real wallet IBAN through all three steps', () => {
    const iban = walletOf(daniel()).iban;
    expect(server.checkIban(iban.toLowerCase())).toBe(iban);
    expect(server.findBank(iban).name).toBe('Meridian Bank');
    expect(server.findHolder(amina(), iban).name).toBe('Daniel O.');
  });

  it('rejects a mistyped IBAN at the check-digit step', () => {
    const iban = walletOf(daniel()).iban;
    const typo = iban.slice(0, -1) + ((Number(iban.slice(-1)) + 1) % 10);
    expect(attempt(() => server.checkIban(typo)).status).toBe(400);
  });

  it('reports an unknown bank, an unknown account, your own account and a deactivated one', () => {
    expect(attempt(() => server.findBank(makeIban('ZZZZ', 5))).status).toBe(404);
    expect(attempt(() => server.findHolder(amina(), makeIban('NRTH', 9999))).status).toBe(404);
    expect(attempt(() => server.findHolder(amina(), walletOf(amina()).iban)).message).toMatch(/your own/);
    expect(attempt(() => server.findHolder(amina(), walletOf(marcus()).iban)).status).toBe(409);
  });
});

describe('transfer by IBAN with MPIN', () => {
  const send = (amt, pin = '1234', key = 'k1') => server.transfer(amina(), walletOf(daniel()).iban, amt, 'test', key, pin);

  it('moves money, writes both ledger rows with one reference, and notifies the recipient', () => {
    const before = [walletOf(amina()).bal, walletOf(daniel()).bal];
    const { tx } = send(2500);
    expect(walletOf(amina()).bal).toBe(before[0] - 2500);
    expect(walletOf(daniel()).bal).toBe(before[1] + 2500);
    const rows = db.txs.filter((t) => t.ref === tx.ref);
    expect(rows.map((r) => r.type).sort()).toEqual(['TRANSFER_IN', 'TRANSFER_OUT']);
    expect(db.notifs[61][0].title).toBe('Money received');
  });

  it('refuses a wrong MPIN, counts attempts and locks after three', () => {
    const e1 = attempt(() => send(100, '0000', 'a'));
    expect(e1.message).toMatch(/2 attempts left/);
    expect(attempt(() => send(100, '0000', 'b')).message).toMatch(/1 attempt left/);
    expect(attempt(() => send(100, '0000', 'c')).status).toBe(429);
    expect(attempt(() => send(100, '1234', 'd')).status).toBe(429);
  });

  it('applies a retried payment once', () => {
    const first = send(1000, '1234', 'same');
    const balance = walletOf(amina()).bal;
    const again = send(1000, '1234', 'same');
    expect(again.replayed).toBe(true);
    expect(again.tx.id).toBe(first.tx.id);
    expect(walletOf(amina()).bal).toBe(balance);
  });

  it('rejects the same key for a different request', () => {
    send(1000, '1234', 'same');
    expect(attempt(() => send(2000, '1234', 'same')).status).toBe(409);
  });

  it('never lets a balance go negative', () => {
    const e = attempt(() => send(walletOf(amina()).bal + 1));
    expect(e.status).toBe(409);
    expect(e.message).toMatch(/Insufficient/);
  });
});

describe('wallet and accounts', () => {
  it('blocks overdrawing withdrawals', () => {
    expect(attempt(() => server.money(amina(), 'WITHDRAWAL', walletOf(amina()).bal + 1, '', 'w')).status).toBe(409);
  });

  it('login distinguishes wrong password from a deactivated account', () => {
    expect(attempt(() => server.login('amina.rahman@example.com', 'nope')).status).toBe(401);
    expect(attempt(() => server.login('marcus.webb@example.com', 'password123')).status).toBe(403);
    expect(server.login('Amina.Rahman@example.com', 'password123').id).toBe(58);
  });

  it('register creates a wallet with an IBAN and requires a 4-digit MPIN', () => {
    const bad = attempt(() => server.register({ first: 'A', last: 'B', email: 'a@b.co', password: 'longenough', mpin: '12' }));
    expect(bad.fields.mpin).toBeDefined();
    const u = server.register({ first: 'Zed', last: 'Quinn', email: 'zed@example.com', password: 'longenough', mpin: '4321' });
    expect(walletOf(u).iban).toMatch(/^GB\d{2}[A-Z]{4}\d{14}$/);
    expect(attempt(() => server.register({ first: 'Zed', last: 'Quinn', email: 'zed@example.com', password: 'longenough', mpin: '4321' })).status).toBe(409);
  });
});

describe('admin rules', () => {
  it('protects the acting admin from changing or deleting themself', () => {
    expect(attempt(() => server.setRole(amina(), 58, 'USER')).status).toBe(409);
    expect(attempt(() => server.setActive(amina(), 58, false)).status).toBe(409);
    expect(attempt(() => server.deleteUser(amina(), 58)).status).toBe(409);
  });

  it('deletes only people with no balance or history', () => {
    expect(attempt(() => server.deleteUser(amina(), 61)).status).toBe(409);
    server.deleteUser(amina(), 73);
    expect(userById(73)).toBeUndefined();
  });
});
