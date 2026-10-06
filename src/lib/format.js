export const pad = (n) => String(n).padStart(2, '0');
export const fmt = (cents) =>
  (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (cents) => '$' + fmt(cents);

/** "12,345.6" -> 1234560. Returns null when the text is not a valid amount with at most two decimals. */
export const parseAmt = (text) => {
  const s = String(text).replace(/[,\s$]/g, '');
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
};

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const uid = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return 'k' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
};
export const hex8 = () =>
  Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayKey = (d) => d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
export const dayLabel = (ms) => {
  const d = new Date(ms);
  const diff = dayKey(new Date()) - dayKey(d);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return pad(d.getDate()) + ' ' + MON[d.getMonth()];
};
export const time = (ms) => {
  const d = new Date(ms);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};
export const dateOnly = (ms) => {
  const d = new Date(ms);
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
};
export const dateTime = (ms) => dateOnly(ms) + ', ' + time(ms);
export const rel = (ms) => {
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h ago';
  return dayLabel(ms);
};
export const initials = (u) => (u.first[0] + u.last[0]).toUpperCase();

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
