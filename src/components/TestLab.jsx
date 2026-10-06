import { useState } from 'react';
import Icon from './Icon.jsx';
import { Button, Seg } from './ui.jsx';
import { useStore, setState, useCurrentUser, signIn, navigate, toast, bump, currentUser } from '../state/store.js';
import { db, resetDb, walletOf } from '../mock/db.js';
import { makeIban, formatIban } from '../lib/iban.js';
import { copyText, money } from '../lib/format.js';
import { receiveNow } from '../state/incoming.js';

const copy = async (text, what) => {
  const ok = await copyText(text);
  toast(ok ? what + ' copied' : 'Select and copy it manually');
};

function CopyValue({ label, value, mono = true }) {
  return (
    <div className="lab-kv">
      <span className="help">{label}</span>
      <button type="button" className={mono ? 'm' : ''} onClick={() => copy(value, label)} title="Copy">
        <span>{value}</span><Icon name="copy" size={13} />
      </button>
    </div>
  );
}

function AccountsTab() {
  const me = useCurrentUser();
  useStore((s) => s.version);
  const mode = useStore((s) => s.authMode);
  const pickAccount = (u) => {
    if (!me && mode !== 'register') {
      setState({ prefill: { email: u.email, password: u.password }, authMode: 'login' });
      toast('Login form filled for ' + u.first);
    } else {
      signIn(u);
      toast('Switched to ' + u.first + ' ' + u.last);
    }
  };
  return (
    <div className="col" style={{ gap: 10 }}>
      <p className="help">Every account uses plain-text test credentials. Pick one to fill the sign-in form, or to switch while signed in.</p>
      {db.users.map((u) => {
        const w = walletOf(u);
        return (
          <div key={u.id} className={'lab-card' + (me && me.id === u.id ? ' you' : '')}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <b>{u.first + ' ' + u.last}</b>
              <span className={'chip ' + (u.role === 'ADMIN' ? 'b' : '')} style={{ height: 22, fontSize: 11 }}>{u.role}</span>
              <span className={'chip ' + (u.active ? 'g' : 'r')} style={{ height: 22, fontSize: 11 }}>{u.active ? 'Active' : 'Deactivated'}</span>
              {me && me.id === u.id && <span className="chip k" style={{ height: 22, fontSize: 11 }}>YOU</span>}
            </div>
            <CopyValue label="Email" value={u.email} />
            <CopyValue label="Password" value={u.password} />
            <CopyValue label="MPIN" value={u.mpin} />
            <CopyValue label="IBAN" value={formatIban(w.iban)} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="help">Balance <b className="m" style={{ color: 'var(--fg)' }}>{money(w.bal)}</b></span>
              <Button small tone={me ? '' : 'p'} onClick={() => pickAccount(u)}>{me ? 'Switch to' : 'Use'}</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IbanTab() {
  const me = useCurrentUser();
  const view = useStore((s) => s.view);
  useStore((s) => s.version);
  const typo = (iban) => iban.slice(0, -1) + ((Number(iban.slice(-1)) + 1) % 10);
  const base = walletOf(db.users.find((u) => u.id === 61) || db.users[0]).iban;
  const cases = [
    ...db.users.map((u) => ({ label: u.first + ' ' + u.last + (me && me.id === u.id ? ' (you)' : ''), note: !u.active ? 'deactivated account' : me && me.id === u.id ? 'your own IBAN' : 'valid recipient', iban: walletOf(u).iban })),
    { label: 'Mistyped digit', note: 'fails the check digits', iban: typo(base) },
    { label: 'Unknown bank', note: 'valid digits, no such bank', iban: makeIban('ZZZZ', 5) },
    { label: 'No account', note: 'real bank, nobody owns it', iban: makeIban('NRTH', 9999) },
  ];
  const use = (iban) => {
    if (!me) return toast('Sign in first', 'bad');
    if (view === 'send') window.dispatchEvent(new CustomEvent('lab:iban', { detail: iban }));
    else { setState({ draft: { iban, amt: '' } }); navigate('send'); }
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <p className="help">Use as recipient fills the Send screen and starts the three lookups. Each case ends differently.</p>
      {cases.map((c) => (
        <div key={c.label + c.iban} className="lab-card">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <div className="col mn"><b>{c.label}</b><span className="help">{c.note}</span></div>
            <Button small onClick={() => use(c.iban)} disabled={!me}>Use</Button>
          </div>
          <button type="button" className="lab-iban m" onClick={() => copy(formatIban(c.iban), 'IBAN')} title="Copy">{formatIban(c.iban)}</button>
        </div>
      ))}
    </div>
  );
}

function MpinTab() {
  const me = useCurrentUser();
  const view = useStore((s) => s.view);
  const send = (value) => window.dispatchEvent(new CustomEvent('lab:mpin', { detail: value }));
  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="help">On the Send screen, reach the Confirm step, then type a PIN here instead of on the keypad.</p>
      {me ? (
        <>
          <div className="lab-card">
            <CopyValue label={me.first + "'s MPIN"} value={me.mpin} />
            <div className="row wrap" style={{ gap: 8 }}>
              <Button small tone="p" disabled={view !== 'send'} onClick={() => send(me.mpin)}>Enter correct MPIN</Button>
              <Button small tone="d" disabled={view !== 'send'} onClick={() => send('0000')}>Enter wrong MPIN</Button>
            </div>
            {view !== 'send' && <span className="help">Open Send money first.</span>}
          </div>
          <div className="lab-card">
            <b>Rules being tested</b>
            <ul className="help" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              <li>A wrong MPIN says how many attempts are left.</li>
              <li>The third wrong attempt locks transfers for 30 seconds.</li>
              <li>A correct MPIN resets the counter.</li>
            </ul>
          </div>
        </>
      ) : <p className="help">Sign in to see your MPIN.</p>}
    </div>
  );
}

function SimulateTab() {
  const me = useCurrentUser();
  const flags = useStore((s) => s.flags);
  const toggle = (k, text) => { setState({ flags: { ...flags, [k]: !flags[k] } }); toast(!flags[k] ? text : 'Switched off'); };
  return (
    <div className="col" style={{ gap: 8 }}>
      <p className="help">Trigger the situations the design plans for.</p>
      <Button small tone="l" disabled={!me} onClick={receiveNow}><Icon name="arrowDown" size={15} />Receive a payment now</Button>
      <Button small disabled={!me} onClick={() => { setState({ exp: Date.now() - 1 }); }}><Icon name="clock" size={15} />Expire my session now</Button>
      <Button small tone={flags.drop ? 'l' : ''} aria-pressed={flags.drop} onClick={() => toggle('drop', 'The next payment will lose its response. Try Send money.')}>
        <Icon name="refresh" size={15} />Lose the next payment response {flags.drop ? '· armed' : ''}
      </Button>
      <Button small tone={flags.fail ? 'l' : ''} aria-pressed={flags.fail} onClick={() => toggle('fail', 'The next request returns a server error.')}>
        <Icon name="pulse" size={15} />Server error on next request {flags.fail ? '· armed' : ''}
      </Button>
      <Button small disabled={!me} onClick={() => { const u = currentUser(); u.active = false; bump(); toast('Your account was deactivated', 'bad'); }}>
        <Icon name="ban" size={15} />Deactivate me, as an admin would
      </Button>
      <Button small tone="d" onClick={() => { resetDb(); setState({ meId: null, modal: null, authMode: 'login', prefill: { email: '', password: '' } }); toast('Test data reset'); }}>
        <Icon name="refresh" size={15} />Reset all test data
      </Button>
    </div>
  );
}

export default function TestLab() {
  const open = useStore((s) => s.labOpen);
  const [tab, setTab] = useState('accounts');
  return (
    <>
      <button type="button" className="labbtn" aria-label="Test lab" onClick={() => setState({ labOpen: !open })} aria-expanded={open}>
        <Icon name="flask" size={18} /><span className="lbl">Test lab</span>
      </button>
      {open && (
        <section className="lab" aria-label="Test lab">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b className="d" style={{ fontSize: 20 }}>Test lab</b>
            <Button small tone="ghost" style={{ padding: '0 10px' }} onClick={() => setState({ labOpen: false })} aria-label="Close test lab"><Icon name="x" size={16} /></Button>
          </div>
          <Seg label="Test lab section" value={tab} onChange={setTab} options={[['accounts', 'Accounts'], ['ibans', 'IBANs'], ['mpin', 'MPIN'], ['sim', 'Simulate']]} />
          <div className="labbody">
            {tab === 'accounts' && <AccountsTab />}
            {tab === 'ibans' && <IbanTab />}
            {tab === 'mpin' && <MpinTab />}
            {tab === 'sim' && <SimulateTab />}
          </div>
        </section>
      )}
    </>
  );
}
