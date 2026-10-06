import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell from '../components/Shell.jsx';
import { AmountField, BankBadge, Button, Field, Note } from '../components/ui.jsx';
import { useCurrentUser, useStore, getState, setState, toast } from '../state/store.js';
import { call } from '../mock/transport.js';
import { server } from '../mock/server.js';
import { walletOf } from '../mock/db.js';
import { handleCommon } from '../state/handlers.jsx';
import { bankName, formatIban, normalizeIban } from '../lib/iban.js';
import { dateTime, fmt, money, parseAmt, copyText, uid } from '../lib/format.js';

const STEPS = ['Recipient', 'Amount', 'Confirm', 'Receipt'];

function Steps({ n }) {
  return (
    <div className="steps">
      {STEPS.map((t, i) => (
        <span key={t} className={n === i + 1 ? 'on' : n > i + 1 ? 'done' : ''}>
          <b>{n > i + 1 ? <Icon name="check" size={14} /> : i + 1}</b>{t}
        </span>
      ))}
    </div>
  );
}

/** The three lookups, shown one after the other: IBAN check, bank, account holder. */
function Resolution({ rs, iban }) {
  if (!rs) {
    return <Note>Enter the 22-character IBAN. We check it, find the bank and confirm the account holder before you go on.</Note>;
  }
  const titles = [['Checking the IBAN', 'IBAN is valid'], ['Finding the bank', 'Bank found'], ['Confirming the account holder', 'Account holder confirmed']];
  const detail = [
    rs.stage > 0 ? 'Format and check digits are correct' : '',
    rs.bank && rs.stage > 1 ? `${rs.bank.name} · ${rs.bank.city} · sort code ${rs.bank.sort}` : '',
    rs.holder && rs.stage > 2 ? rs.holder.name : '',
  ];
  return (
    <>
      <div className="col" style={{ gap: 0 }}>
        {titles.map((t, i) => {
          let state = 'idle';
          if (rs.err && i === rs.stage) state = rs.err.status === 409 ? 'warn' : 'err';
          else if (i < rs.stage) state = 'done';
          else if (i === rs.stage && !rs.err) state = 'act';
          return (
            <div key={t[0]} className={'rr ' + state}>
              <span className="rs">
                {state === 'done' ? <Icon name="check" size={15} /> : state === 'err' ? <Icon name="x" size={15} />
                  : state === 'warn' ? <Icon name="alert" size={15} /> : state === 'act' ? <i className="spin" />
                    : <i style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'block' }} />}
              </span>
              <div className="col">
                <b>{state === 'done' ? t[1] : t[0] + (state === 'act' ? '…' : '')}</b>
                {(state === 'err' || state === 'warn') && <span className="err" style={state === 'warn' ? { color: 'var(--warn)' } : undefined}>{rs.err.message}</span>}
                {state === 'done' && <span className="help">{detail[i]}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {rs.stage === 3 && !rs.err && (
        <div className="rcp" style={{ marginTop: 6 }}>
          <BankBadge code={rs.bank.code} size={44} />
          <div className="col mn" style={{ flex: 1 }}>
            <b className="d" style={{ fontSize: 19 }}>{rs.holder.name}</b>
            <span className="help">{rs.bank.name} · <span className="m">{formatIban(iban)}</span></span>
          </div>
          <span className="chip g"><Icon name="check" size={13} />Verified</span>
        </div>
      )}
    </>
  );
}

function Recipient({ rs, iban, onChange }) {
  return (
    <div className="row rcp" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
      <BankBadge code={rs.bank.code} size={42} />
      <div className="col mn" style={{ flex: 1 }}>
        <b>{rs.holder.name}</b>
        <span className="help">{rs.bank.name} · <span className="m">{formatIban(iban)}</span></span>
      </div>
      <Button small tone="ghost" onClick={onChange}>Change</Button>
    </div>
  );
}

export default function SendPage() {
  const user = useCurrentUser();
  const wallet = walletOf(user);
  const draft = useStore((s) => s.draft);
  const [step, setStep] = useState(1);
  const [iban, setIban] = useState(draft.iban || '');
  const [rs, setRs] = useState(null);
  const [amt, setAmt] = useState(draft.amt || '');
  const [desc, setDesc] = useState('');
  const [amtErr, setAmtErr] = useState('');
  const [key, setKey] = useState(null);
  const [bal0, setBal0] = useState(0);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(null);
  const [net, setNet] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [retried, setRetried] = useState(false);
  const token = useRef(0);
  const [, force] = useState(0);

  const resolve = useCallback(async (raw) => {
    const tok = ++token.current;
    setRs({ stage: 0 });
    try {
      await call(() => server.checkIban(raw), { ms: 600 });
      if (tok !== token.current) return;
      setRs({ stage: 1 });
      const bank = await call(() => server.findBank(raw), { ms: 750 });
      if (tok !== token.current) return;
      setRs({ stage: 2, bank });
      const holder = await call(() => server.findHolder(getUser(), raw), { ms: 750 });
      if (tok !== token.current) return;
      setRs({ stage: 3, bank, holder });
    } catch (e) {
      if (tok !== token.current) return;
      if (handleCommon(e)) return;
      setRs((prev) => ({ ...(prev || { stage: 0 }), err: e }));
    }
  }, []);
  const getUser = () => getState().meId && user;

  const changeIban = useCallback((value) => {
    const raw = normalizeIban(value);
    setIban(raw);
    token.current++;
    setRs(null);
    if (raw.length === 22) resolve(raw);
  }, [resolve]);

  // Values handed over by Overview (quick send) or the Test Lab.
  useEffect(() => {
    if (draft.iban || draft.amt) {
      if (draft.iban.length === 22) resolve(draft.iban);
      setState({ draft: { iban: '', amt: '' } });
    }
    const onIban = (e) => { setStep(1); setErr(null); changeIban(e.detail); };
    const onPin = (e) => { setStep((s) => { if (s === 3) { setPin(e.detail); setErr(null); } return s; }); };
    window.addEventListener('lab:iban', onIban);
    window.addEventListener('lab:mpin', onPin);
    return () => { window.removeEventListener('lab:iban', onIban); window.removeEventListener('lab:mpin', onPin); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release the MPIN lock without needing another action.
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const t = setTimeout(() => { setLockedUntil(0); setErr(null); force((n) => n + 1); }, Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(t);
  }, [lockedUntil]);

  const locked = lockedUntil > Date.now();
  const verified = rs && rs.stage === 3 && !rs.err;
  const accountLocked = !user.active;

  const pressKey = useCallback((v) => {
    if (locked) return;
    setErr((e) => (e ? null : e));
    setPin((p) => (v === 'back' ? p.slice(0, -1) : p.length < 4 ? p + v : p));
  }, [locked]);

  useEffect(() => {
    if (step !== 3) return undefined;
    const onKey = (e) => {
      if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || getState().modal) return;
      if (/^\d$/.test(e.key)) pressKey(e.key);
      else if (e.key === 'Backspace') pressKey('back');
      else if (e.key === 'Enter' && pin.length === 4) document.getElementById('pgo')?.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, pin, pressKey]);

  const reviewAmount = (e) => {
    e.preventDefault();
    const c = parseAmt(amt);
    if (c === null) return setAmtErr(amt ? 'Use a number with at most two decimals, like 25.00' : 'Enter an amount');
    if (c < 1) return setAmtErr('must be at least 0.01');
    setAmtErr('');
    setKey(uid());
    setBal0(wallet.bal);
    setPin('');
    setErr(null);
    setNet(false);
    setStep(3);
  };

  const confirm = async () => {
    const cents = parseAmt(amt);
    setBusy(true);
    try {
      const r = await call(() => server.transfer(user, iban, cents, desc.trim(), key, pin), { money: true });
      setResult(r);
      setRetried(net || !!r.replayed);
      setNet(false);
      setPin('');
      setStep(4);
      toast('Sent ' + money(cents) + ' to ' + r.to.name);
    } catch (e) {
      if (e.network) { setNet(true); setErr(null); return; }
      if (handleCommon(e)) return;
      if (e.status === 429 || (e.status === 400 && /MPIN/.test(e.message))) {
        setPin('');
        setErr(e.message);
        setShake(true);
        setTimeout(() => setShake(false), 400);
        if (e.status === 429) setLockedUntil(Date.now() + 30000);
        return;
      }
      if (e.status === 404 || e.status === 400 || (e.status === 409 && /deactivated/.test(e.message))) {
        setRs({ stage: 2, bank: rs.bank, err: e });
        setStep(1);
        setPin('');
        return;
      }
      setPin('');
      setErr(/Insufficient/.test(e.message)
        ? 'Not enough balance. You have ' + money(wallet.bal) + '. Lower the amount or add money first.'
        : e.status === 409 ? 'This key was already used for a different payment. Start a new transfer.' : e.message);
      setNet(false);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    token.current++;
    setStep(1); setIban(''); setRs(null); setAmt(''); setDesc(''); setAmtErr(''); setKey(null); setPin('');
    setErr(null); setNet(false); setResult(null); setRetried(false);
  };

  const addAmount = (n) => setAmt(((parseAmt(amt) || 0) / 100 + n).toFixed(2));
  const cents = parseAmt(amt);

  let card = null;
  if (step === 1) {
    card = (
      <div className="modal card-flat">
        <Field id="s-iban" label="Recipient IBAN" icon="bank" mono value={formatIban(iban)} onChange={changeIban}
          placeholder="GB00 BANK 0000 0000 0000 00" help="Spaces are added as you type. Pasting works too." />
        <Resolution rs={rs} iban={iban} />
        <Button tone="p" style={{ height: 52 }} disabled={!verified || accountLocked} onClick={() => { setErr(null); setStep(2); }}>
          Continue <Icon name="chevR" size={17} />
        </Button>
      </div>
    );
  } else if (step === 2) {
    card = (
      <form className="modal card-flat" onSubmit={reviewAmount} noValidate>
        <Recipient rs={rs} iban={iban} onChange={() => setStep(1)} />
        <AmountField id="s-amt" value={amt} onChange={setAmt} error={amtErr}>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <span className="help">Available <b className="m" style={{ color: 'var(--fg)' }}>{fmt(wallet.bal)}</b></span>
            <span className="row" style={{ gap: 6 }}>
              {[10, 50, 100].map((n) => <button key={n} type="button" className="chip" onClick={() => addAmount(n)}>+{n}</button>)}
            </span>
          </div>
        </AmountField>
        <Field id="s-desc" label="Note (optional)" value={desc} onChange={setDesc} placeholder="What is it for?" />
        <div className="row">
          <Button onClick={() => setStep(1)}>Back</Button>
          <Button tone="p" type="submit" className="sp" style={{ height: 52 }} disabled={accountLocked}>Review <Icon name="chevR" size={17} /></Button>
        </div>
      </form>
    );
  } else if (step === 3) {
    const rows = [
      ['To', rs.holder.name], ['Bank', `${rs.bank.name} · ${rs.bank.city}`],
      ['IBAN', <span key="i" className="m" style={{ fontSize: 13 }}>{formatIban(iban)}</span>],
      ['Note', desc.trim() || <span key="n" className="help">None</span>],
      ['Balance after', <span key="b" className="m">{money(bal0 - cents)}</span>],
    ];
    card = (
      <div className="modal card-flat">
        {err && <Note tone="r" icon="alert" role="alert">{err}</Note>}
        {net && <Note tone="w" icon="refresh" role="alert"><b>Connection lost before we heard back.</b> Retrying is safe: the same payment key is sent again, so it can never go out twice.</Note>}
        <div style={{ textAlign: 'center', padding: '2px 0' }}>
          <span className="help">You are sending</span>
          <div className="d m" style={{ fontSize: 'clamp(40px,8vw,52px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.1 }}>{money(cents)}</div>
        </div>
        <div className="sum">
          {rows.map((r) => <div key={r[0]}><span className="help">{r[0]}</span><b style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{r[1]}</b></div>)}
        </div>
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'center', gap: 8 }}><span style={{ color: 'var(--mute)' }}><Icon name="lock" size={16} /></span><b>Enter your MPIN to send</b></div>
          <div className={'pin' + (shake ? ' shake' : '')} aria-label={`${pin.length} of 4 digits entered`}>
            {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'f' : ''} />)}
          </div>
          {locked && <Note tone="w" icon="clock" role="status">Transfers are locked for 30 seconds after three wrong attempts.</Note>}
          <div className="keypad" style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} type="button" disabled={locked} onClick={() => pressKey(String(n))}>{n}</button>)}
            <span />
            <button type="button" disabled={locked} onClick={() => pressKey('0')}>0</button>
            <button type="button" disabled={locked} onClick={() => pressKey('back')} aria-label="Delete last digit"><Icon name="back" size={24} /></button>
          </div>
        </div>
        <div className="row">
          <Button onClick={() => { setErr(null); setNet(false); setStep(2); }}>Back</Button>
          <Button id="pgo" tone="p" className="sp" style={{ height: 52 }} busy={busy} disabled={accountLocked || pin.length < 4 || locked} onClick={confirm}>
            <Icon name="lock" size={16} />{net ? 'Retry safely' : 'Confirm & send'}
          </Button>
        </div>
      </div>
    );
  } else {
    const tx = result.tx;
    const lines = [
      ['Recipient', result.to.name], ['Bank', bankName(result.to.bank)], ['IBAN', formatIban(result.to.iban)],
      ['Reference', 'TX-' + tx.ref], ['When', dateTime(tx.at)], ['Balance', fmt(tx.before) + ' → ' + fmt(tx.after)], ['Status', tx.status],
    ];
    card = (
      <>
        <div style={{ width: '100%', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,.18))' }}>
          <div className="receipt">
            <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'var(--lime)', color: 'var(--limefg)', display: 'grid', placeItems: 'center' }}><Icon name="check" size={30} /></div>
            <div><h3 className="d" style={{ fontSize: 30, fontWeight: 800 }}>Sent</h3><p className="help">{money(tx.amt)} to {result.to.name}</p></div>
            {retried && <Note tone="g" icon="shield">Your retry reached the server and was recognised. The money moved once.</Note>}
            <div className="col" style={{ width: '100%' }}>
              {lines.map((r) => <div key={r[0]} className="rl"><span className="help">{r[0]}</span><b className="m" style={{ fontSize: 13, textAlign: 'right', overflowWrap: 'anywhere' }}>{r[1]}</b></div>)}
            </div>
          </div>
          <div className="tear" />
        </div>
        <div className="row">
          <Button className="sp" onClick={async () => { await copyText('TX-' + tx.ref); toast('Reference copied · TX-' + tx.ref); }}><Icon name="copy" size={16} />Copy reference</Button>
          <Button tone="p" className="sp" onClick={reset}>Send another</Button>
        </div>
      </>
    );
  }

  return (
    <Shell title="Send money" sub="Pay anyone with their IBAN.">
      <Steps n={step} />
      <div className="col" style={{ maxWidth: 540, width: '100%' }}>{card}</div>
    </Shell>
  );
}
