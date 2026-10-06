import { pad } from './format.js';

/** Fictional banks. The 4-letter code sits inside every IBAN, which is how the bank is "resolved". */
export const BANKS = {
  NRTH: { name: 'Northbank', city: 'Leeds', tone: 'info' },
  MRDN: { name: 'Meridian Bank', city: 'Bristol', tone: 'pos' },
  HRBR: { name: 'Harbour Trust', city: 'Glasgow', tone: 'warn' },
  COPP: { name: 'Copperline Bank', city: 'Cardiff', tone: 'neg' },
};
export const BANK_CODES = Object.keys(BANKS);
export const bankName = (code) => (BANKS[code] || { name: 'Unknown bank' }).name;

/** ISO 13616 mod-97 over a string of digits and letters (A=10 ... Z=35). */
export const mod97 = (str) => {
  let r = 0;
  for (const ch of str) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of v) r = (r * 10 + Number(digit)) % 97;
  }
  return r;
};

/** Builds a GB-format IBAN with correct check digits for a bank code and a wallet id. */
export const makeIban = (bankCode, walletId) => {
  const sort = String(100000 + ((walletId * 7919) % 899999));
  const account = String(10000000 + ((walletId * 104729) % 89999999));
  const bban = bankCode + sort + account;
  return 'GB' + pad(98 - mod97(bban + 'GB00')) + bban;
};

export const formatIban = (raw) => String(raw || '').replace(/(.{4})/g, '$1 ').trim();
export const normalizeIban = (value) =>
  String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 22);
