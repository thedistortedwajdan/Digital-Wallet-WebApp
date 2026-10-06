import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell from '../components/Shell.jsx';
import { AmountField, Button, Field, Note, Seg } from '../components/ui.jsx';
import { useCurrentUser, getState, navigate, toast } from '../state/store.js';
import { call } from '../mock/transport.js';
import { server } from '../mock/server.js';
import { walletOf } from '../mock/db.js';
import { handleCommon } from '../state/handlers.jsx';
import { money, parseAmt, uid } from '../lib/format.js';

export default function CashPage() {
  const user = useCurrentUser();
  const wallet = walletOf(user);
  const [tab, setTab] = useState(getState().cashTab || 'dep');
  const [amt, setAmt] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const retryKey = useRef(null); // reused after a lost response so the retry cannot apply twice
  const deposit = tab === 'dep';
  const cents = parseAmt(amt);
  const over = !deposit && cents !== null && cents > wallet.bal;
  const invalid = cents === null || cents < 1;
  const preview = over ? 'below $0.00' : money(cents === null ? wallet.bal : deposit ? wallet.bal + cents : wallet.bal - cents);
  const bad = !!amt && (invalid || over);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBanner('');
    if (cents === null) return setError(amt ? 'Use a number with at most two decimals, like 25.00' : 'Enter an amount');
    if (cents < 1) return setError('must be at least 0.01');
    if (over) return setError('You only have ' + money(wallet.bal) + ' available.');
    const key = retryKey.current || uid();
    setBusy(true);
    try {
      await call(() => server.money(user, deposit ? 'DEPOSIT' : 'WITHDRAWAL', cents, desc.trim(), key), { money: true });
      retryKey.current = null;
      navigate('home');
      toast((deposit ? 'Added ' : 'Withdrew ') + money(cents));
    } catch (err) {
      setBusy(false);
      if (err.network) {
        retryKey.current = key;
        return setBanner('Connection lost before we heard back. Press the button again: the same payment key is reused, so it cannot apply twice.');
      }
      retryKey.current = null;
      if (handleCommon(err)) return;
      setBanner(/Insufficient/.test(err.message) ? 'Not enough balance for that withdrawal.' : err.message);
    }
  };

  return (
    <Shell title="Add or withdraw" sub="Move money in or out of your wallet.">
      <form className="modal card-flat" style={{ width: 'min(560px,100%)' }} onSubmit={submit} noValidate>
        <Seg label="Action" value={tab} onChange={(v) => { setTab(v); setError(''); setBanner(''); }} options={[['dep', 'Add money'], ['wd', 'Withdraw']]} />
        {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
        <AmountField id="c-amt" value={amt} onChange={(v) => { setAmt(v); setError(''); }} error={error || (over ? 'You only have ' + money(wallet.bal) + ' available.' : '')}>
          <div className="row wrap" style={{ gap: 8 }}>
            {[50, 100, 500, 1000].map((v) => <button key={v} type="button" className="chip" onClick={() => setAmt(v.toFixed(2))}>${v.toLocaleString()}</button>)}
            {!deposit && <button type="button" className="chip b" onClick={() => setAmt((wallet.bal / 100).toFixed(2))}>Withdraw all</button>}
          </div>
        </AmountField>
        <Field id="c-desc" label="Note (optional)" value={desc} onChange={setDesc} placeholder="What is this for?" />
        <div className="row" style={{ justifyContent: 'space-between', padding: '16px 18px', borderRadius: 16,
          background: bad ? 'var(--negbg)' : 'var(--posbg)', color: bad ? 'var(--neg)' : 'var(--pos)' }}>
          <span>{deposit ? 'New balance' : 'Balance would be'}</span>
          <b className="m" style={{ fontSize: 18 }}>{preview}</b>
        </div>
        <Button tone={deposit ? 'l' : 'p'} type="submit" busy={busy} disabled={!user.active} style={{ height: 54, fontSize: 16 }}>
          <Icon name={deposit ? 'plus' : 'minus'} />{deposit ? 'Add money' : 'Withdraw'}
        </Button>
        <div className="help">Smallest amount $0.01, two decimals at most. Available now <b className="m" style={{ color: 'var(--fg)' }}>{money(wallet.bal)}</b>.</div>
      </form>
    </Shell>
  );
}
