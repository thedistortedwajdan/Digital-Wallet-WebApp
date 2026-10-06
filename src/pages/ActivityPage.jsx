import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell from '../components/Shell.jsx';
import { Button, Seg } from '../components/ui.jsx';
import { typeInfo } from '../components/ledger.jsx';
import { useCurrentUser, useStore, setState, toast } from '../state/store.js';
import { server } from '../mock/server.js';
import { bankName } from '../lib/iban.js';
import { copyText, dayLabel, fmt, time } from '../lib/format.js';

const FILTERS = [['all', 'All'], ['DEPOSIT', 'Deposits'], ['WITHDRAWAL', 'Withdrawals'], ['TRANSFER_IN', 'Received'], ['TRANSFER_OUT', 'Sent']];

function Detail({ tx }) {
  const info = typeInfo(tx.type);
  const pct = Math.min(100, Math.round((Math.min(tx.before, tx.after) / Math.max(tx.before, tx.after, 1)) * 100));
  const copy = async () => { await copyText('TX-' + tx.ref); toast('Reference copied · TX-' + tx.ref); };
  return (
    <div className="det">
      <div>
        <span className="eyebrow">Balance movement</span>
        <div className="row m wrap" style={{ gap: 10, margin: '10px 0 8px', fontSize: 19, fontWeight: 700 }}>
          <span style={{ color: 'var(--mute)' }}>{fmt(tx.before)}</span><Icon name="chevR" size={17} /><span>{fmt(tx.after)}</span>
        </div>
        <div className="bar"><i style={{ width: pct + '%', background: info.positive ? 'var(--pos)' : 'var(--fg)' }} /></div>
      </div>
      <div>
        <span className="eyebrow">Reference</span>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <b className="m">TX-{tx.ref}</b>
          <Button small tone="ghost" style={{ padding: '0 10px', height: 28 }} onClick={copy} aria-label="Copy reference"><Icon name="copy" size={14} /></Button>
        </div>
        <span className="help">{tx.cp ? 'Both sides of a transfer share this' : 'Single-sided entry'}</span>
      </div>
      <div>
        <span className="eyebrow">Counterparty &amp; status</span>
        <div style={{ marginTop: 8 }}><b>{tx.cp ? tx.cp.name : 'None'}</b></div>
        {tx.cp && <span className="help">{bankName(tx.cp.bank)} · IBAN ending {tx.cp.iban.slice(-4)}</span>}
        <div><span className="chip g" style={{ height: 24, fontSize: 11, marginTop: 6 }}>{tx.status}</span></div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const user = useCurrentUser();
  const focusTx = useStore((s) => s.focusTx);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(focusTx || null);

  useEffect(() => { if (focusTx) setState({ focusTx: null }); }, [focusTx]);

  const data = server.transactions(user, page, size);
  const pages = Math.max(1, Math.ceil(data.total / size));
  const q = query.trim().toLowerCase();
  const rows = data.content.filter((t) =>
    (filter === 'all' || t.type === filter) &&
    (!q || (t.desc || '').toLowerCase().includes(q) || typeInfo(t.type).label.toLowerCase().includes(q) || (t.cp && t.cp.name.toLowerCase().includes(q))));

  let lastDay = '';
  return (
    <Shell title="Activity" sub="Every movement, newest first, with the balance before and after.">
      <div className="row wrap" style={{ gap: 12 }}>
        <Seg label="Type" value={filter} onChange={setFilter} options={FILTERS} />
        <div className="inw" style={{ height: 44, borderRadius: 99, width: 'min(300px,100%)' }}>
          <Icon name="search" size={17} />
          <input type="search" placeholder="Search notes or names on this page" aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="sp" />
        <span className="help">Rows per page</span>
        <Seg label="Rows per page" value={size} onChange={(v) => { setSize(v); setPage(0); setOpen(null); }} options={[[5, '5'], [10, '10'], [20, '20']]} />
      </div>

      <section className="card" style={{ padding: '18px 14px 12px' }}>
        {rows.length ? rows.map((t, i) => {
          const day = dayLabel(t.at);
          const header = day !== lastDay;
          lastDay = day;
          const info = typeInfo(t.type);
          const isOpen = open === t.id;
          return (
            <div key={t.id}>
              {header && <div className="dayh" style={i === 0 ? { borderTop: 0 } : undefined}><span className="eyebrow">{day}</span></div>}
              <button type="button" className="lr t" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>
                <div className="row mn">
                  <div className={'ico ' + info.tone}><Icon name={info.icon} size={19} /></div>
                  <div className="col mn">
                    <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc || info.label}</b>
                    <span className="help">{info.label}</span>
                  </div>
                </div>
                <span className="help hide2">{t.cp ? t.cp.name + ' · ' + bankName(t.cp.bank) : '—'}</span>
                <span className="help hide1">{time(t.at)}</span>
                <b className="m hide1" style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500 }}>{fmt(t.before)} → <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{fmt(t.after)}</span></b>
                <b className={'m' + (info.positive ? ' pos' : '')} style={{ textAlign: 'right' }}>{info.positive ? '+' : '−'}{fmt(t.amt)}</b>
                <span style={{ color: 'var(--mute)' }}><Icon name={isOpen ? 'chevD' : 'chevR'} /></span>
              </button>
              {isOpen && <Detail tx={t} />}
            </div>
          );
        }) : (
          <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: '40px 0', gap: 8 }}>
            <div style={{ color: 'var(--mute)' }}><Icon name="receipt" size={34} /></div>
            <b className="d" style={{ fontSize: 20 }}>{data.total ? 'No entries match on this page' : 'Your ledger is blank'}</b>
            <span className="help">{data.total ? 'Filters apply to the entries already loaded. Try another page or clear the filter.' : 'Add money to make the first entry.'}</span>
          </div>
        )}
        <div className="pager">
          <span className="help">Showing {data.total ? page * size + 1 : 0} to {Math.min(data.total, page * size + size)} of {data.total} entries</span>
          <div className="row" style={{ gap: 6 }}>
            <Button small tone="ghost" disabled={page === 0} onClick={() => { setPage(page - 1); setOpen(null); }}><Icon name="chevL" size={15} />Previous</Button>
            <span className="chip">Page {page + 1} of {pages}</span>
            <Button small tone="ghost" disabled={page + 1 >= pages} onClick={() => { setPage(page + 1); setOpen(null); }}>Next<Icon name="chevR" size={15} /></Button>
          </div>
        </div>
      </section>
      <div className="note"><Icon name="info" size={17} /><span>Filters and search act on the entries already loaded. Paging comes from the server, so the total always matches your real history.</span></div>
    </Shell>
  );
}
