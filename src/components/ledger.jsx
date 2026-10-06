import Icon from './Icon.jsx';
import { bankName } from '../lib/iban.js';
import { fmt, dayLabel, time } from '../lib/format.js';

const TYPES = {
  DEPOSIT: { icon: 'plus', tone: 'dep', label: 'Deposit', positive: true },
  WITHDRAWAL: { icon: 'minus', tone: 'wd', label: 'Withdrawal', positive: false },
  TRANSFER_IN: { icon: 'arrowDown', tone: 'rcv', label: 'Received', positive: true },
  TRANSFER_OUT: { icon: 'arrowUp', tone: 'out', label: 'Sent', positive: false },
};
export const typeInfo = (type) => TYPES[type];

/** "From Lena F. · Harbour Trust" for transfers, the plain type label otherwise. */
export const counterpartyLine = (tx) =>
  tx.cp ? (typeInfo(tx.type).positive ? 'From ' : 'To ') + tx.cp.name + ' · ' + bankName(tx.cp.bank) : typeInfo(tx.type).label;

export function LedgerRow({ tx, first }) {
  const info = typeInfo(tx.type);
  return (
    <div className={'lr' + (first ? ' first' : '')} style={{ cursor: 'default' }}>
      <div className="row mn">
        <div className={'ico ' + info.tone}><Icon name={info.icon} size={19} /></div>
        <div className="col mn">
          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.desc || info.label}</b>
          <span className="help">{counterpartyLine(tx)} · {dayLabel(tx.at)}, {time(tx.at)}</span>
        </div>
      </div>
      <div className="col" style={{ alignItems: 'flex-end' }}>
        <b className={'m' + (info.positive ? ' pos' : '')}>{info.positive ? '+' : '−'}{fmt(tx.amt)}</b>
        <span className="help m" style={{ fontSize: 12 }}>bal {fmt(tx.after)}</span>
      </div>
    </div>
  );
}
