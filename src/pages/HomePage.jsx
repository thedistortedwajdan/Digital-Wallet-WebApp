import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell from '../components/Shell.jsx';
import { BankBadge, Button } from '../components/ui.jsx';
import { LedgerRow, typeInfo } from '../components/ledger.jsx';
import { ReceiveModal } from '../components/ReceiveModal.jsx';
import { useCurrentUser, setState, navigate, openModal, toast } from '../state/store.js';
import { server } from '../mock/server.js';
import { walletOf } from '../mock/db.js';
import { bankName, formatIban, normalizeIban } from '../lib/iban.js';
import { fmt, copyText } from '../lib/format.js';

function Sparkline({ txs }) {
  const pts = txs.slice().reverse().map((t) => t.after / 100);
  while (pts.length < 2) pts.push(pts[0] || 0);
  const w = 560, h = 96;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - ((v - min) / range) * (h - 14) - 4]);
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = xy[xy.length - 1];
  return (
    <svg viewBox={`0 -8 ${w} ${h + 16}`} preserveAspectRatio="none" role="img" aria-label="Balance after each recent entry"
      style={{ width: '100%', height: 96, display: 'block', overflow: 'visible' }}>
      <path d={`${d} L${w} ${h + 8} L0 ${h + 8}Z`} fill="rgba(205,245,100,.12)" />
      <path d={d} fill="none" stroke="#CDF564" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="#CDF564" />
    </svg>
  );
}

function QuickSend() {
  const [iban, setIban] = useState('');
  const [amt, setAmt] = useState('');
  const go = (e) => {
    e.preventDefault();
    setState({ draft: { iban: normalizeIban(iban), amt: amt.trim() } });
    navigate('send');
  };
  return (
    <section className="card quick">
      <span className="eyebrow" style={{ color: '#2E3A14' }}>Quick send</span>
      <h3 className="d" style={{ fontSize: 26, margin: '6px 0 16px' }}>Pay anyone by IBAN</h3>
      <form onSubmit={go} className="col" style={{ gap: 12 }} noValidate>
        <div className="inw" style={{ background: '#fff' }}>
          <span style={{ color: '#5B6257' }}><Icon name="bank" /></span>
          <input value={formatIban(normalizeIban(iban))} onChange={(e) => setIban(e.target.value)} placeholder="Recipient IBAN"
            aria-label="Recipient IBAN" autoComplete="off" autoCapitalize="characters" spellCheck={false}
            style={{ color: '#11150F', fontFamily: 'var(--m)', fontSize: 14 }} />
        </div>
        <div className="inw" style={{ background: '#fff' }}>
          <span className="m" style={{ color: '#5B6257' }}>$</span>
          <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" placeholder="0.00" aria-label="Amount"
            autoComplete="off" style={{ color: '#11150F' }} />
        </div>
        <button type="submit" className="btn" style={{ background: '#11150F', color: '#EDEAE0', borderColor: '#11150F' }}>
          Continue <Icon name="chevR" size={17} />
        </button>
      </form>
      <p style={{ marginTop: 12, fontSize: 13, color: '#2E3A14' }}>We find the bank and account holder, then ask for your MPIN.</p>
    </section>
  );
}

export default function HomePage() {
  const user = useCurrentUser();
  const wallet = walletOf(user);
  const page = server.transactions(user, 0, 10);
  const recent = page.content.slice(0, 5);
  const flow = page.content.slice(0, 7);
  const inflow = flow.filter((t) => typeInfo(t.type).positive).reduce((a, t) => a + t.amt, 0);
  const outflow = flow.filter((t) => !typeInfo(t.type).positive).reduce((a, t) => a + t.amt, 0);
  const [whole, cents] = fmt(wallet.bal).split('.');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const copyIban = async () => { await copyText(wallet.iban); toast('IBAN copied'); };
  const cash = (tab) => { setState({ cashTab: tab }); navigate('cash'); };

  return (
    <Shell title={`${greeting}, ${user.first}`} sub="Here is where your money stands.">
      <div className="two">
        <section className="slab" style={{ padding: '30px 32px 28px' }}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ color: 'var(--slabmute)' }}>Available balance</span>
            <span className="chip k"><span className="dot" />Wallet {wallet.status.toLowerCase()}</span>
          </div>
          <div className="d" style={{ fontSize: 'clamp(52px,9vw,92px)', fontWeight: 800, lineHeight: 1, margin: '14px 0 6px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: '.36em', marginTop: '.3em', color: 'var(--lime)' }}>$</span>
            <span>{whole}</span>
            <span style={{ fontSize: '.5em', marginTop: '.12em', color: 'var(--slabmute)' }}>.{cents}</span>
          </div>
          <div style={{ margin: '14px 0 6px' }}><Sparkline txs={page.content} /></div>
          <div className="row m" style={{ justifyContent: 'space-between', fontSize: 11.5, color: 'var(--slabmute)' }}>
            <span>OLDER</span><span>balance after each entry</span><span>NOW</span>
          </div>
          <div className="row wrap" style={{ marginTop: 24 }}>
            <Button tone="l" onClick={() => cash('dep')}><Icon name="plus" />Add money</Button>
            <Button tone="onslab" onClick={() => cash('wd')}><Icon name="minus" />Withdraw</Button>
            <Button tone="onslab" onClick={() => navigate('send')}><Icon name="send" />Send</Button>
            <Button tone="onslab" onClick={() => openModal(<ReceiveModal />)}><Icon name="arrowDown" />Receive</Button>
          </div>
        </section>

        <div className="col" style={{ gap: 24 }}>
          <section className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Flow · recent entries</span><span className="chip">Last {flow.length}</span>
            </div>
            <div className="row wrap" style={{ gap: 28, margin: '16px 0' }}>
              <div><span className="help">In</span><div className="d m pos" style={{ fontSize: 28, fontWeight: 700 }}>+{fmt(inflow)}</div></div>
              <div><span className="help">Out</span><div className="d m" style={{ fontSize: 28, fontWeight: 700 }}>−{fmt(outflow)}</div></div>
            </div>
            <div style={{ display: 'flex', height: 12, gap: 3 }}>
              <i style={{ flex: inflow || 1, background: 'var(--pos)', borderRadius: 9 }} />
              <i style={{ flex: outflow || 0.01, background: 'var(--fg)', borderRadius: 9 }} />
            </div>
            <p className="help" style={{ marginTop: 12 }}>
              Net <b className="m" style={{ color: 'var(--fg)' }}>{inflow >= outflow ? '+' : '−'}{fmt(Math.abs(inflow - outflow))}</b> across the entries loaded.
            </p>
          </section>
          <section className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Your account</span><span className="chip g">{wallet.status}</span>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <BankBadge code={wallet.bank} />
              <div className="col mn"><b>{bankName(wallet.bank)}</b><span className="help">{user.first + ' ' + user.last}</span></div>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 8, padding: '12px 14px', borderRadius: 14, background: 'var(--sunk)' }}>
              <span className="m mn" style={{ fontSize: 13.5, overflowWrap: 'anywhere', flex: 1 }}>{formatIban(wallet.iban)}</span>
              <Button small tone="ghost" style={{ padding: '0 10px', height: 30, background: 'var(--bg)' }} onClick={copyIban} aria-label="Copy IBAN"><Icon name="copy" size={15} /></Button>
            </div>
            <p className="help" style={{ marginTop: 10 }}>Share this IBAN to get paid.</p>
          </section>
        </div>
      </div>

      <div className="two">
        <section className="card" style={{ padding: '24px 22px 10px' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="d" style={{ fontSize: 24 }}>Recent activity</h3>
            <Button small tone="ghost" onClick={() => navigate('activity')}>See full ledger <Icon name="chevR" size={15} /></Button>
          </div>
          {recent.length ? recent.map((t, i) => <LedgerRow key={t.id} tx={t} first={i === 0} />) : (
            <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: '34px 0', gap: 10 }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', border: '2px dashed var(--line)', display: 'grid', placeItems: 'center', color: 'var(--mute)' }}><Icon name="receipt" size={32} /></div>
              <h3 className="d" style={{ fontSize: 22 }}>Your ledger is blank</h3>
              <p className="help">The first deposit starts the story.</p>
              <Button tone="l" onClick={() => cash('dep')}><Icon name="plus" size={17} />Add money</Button>
            </div>
          )}
        </section>
        <QuickSend />
      </div>
    </Shell>
  );
}
