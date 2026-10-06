import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Button, Field, Note, PasswordMeter } from '../components/ui.jsx';
import { ThemeToggle } from '../components/overlays.jsx';
import { useStore, setState, signIn, toast } from '../state/store.js';
import { call } from '../mock/transport.js';
import { server } from '../mock/server.js';
import { handleCommon, fieldErrors } from '../state/handlers.jsx';

function Hero() {
  const rows = [['TRANSFER_OUT', '−250.00', '12,480.50'], ['TRANSFER_IN', '+570.50', '12,730.50'], ['DEPOSIT', '+1,500.00', '12,160.00'], ['WITHDRAWAL', '−300.00', '10,660.00']];
  return (
    <section className="hero slab">
      <div className="brand" style={{ padding: 0, fontSize: 30 }}><i style={{ width: 14, height: 14, marginTop: 8 }} />folio</div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h1>Money that<br />keeps its<br /><span style={{ color: 'var(--lime)' }}>receipts.</span></h1>
        <p style={{ marginTop: 22, color: 'var(--slabmute)', fontSize: 18, maxWidth: 420 }}>
          Every deposit, withdrawal and transfer is written to a ledger, with the balance before and after.
        </p>
      </div>
      <div className="tick" aria-hidden="true">
        {rows.map((r) => <div key={r[0]}><span>{r[0]}</span><span>{r[1]}</span><span>{r[2]}</span></div>)}
      </div>
      <div className="row wrap" style={{ gap: 20, color: 'var(--slabmute)', fontSize: 13, position: 'relative', zIndex: 2 }}>
        <span className="row" style={{ gap: 8 }}><Icon name="shield" size={16} />Encrypted sessions</span>
        <span className="row" style={{ gap: 8 }}><Icon name="check" size={16} />Double-spend safe</span>
        <span className="row" style={{ gap: 8 }}><Icon name="refresh" size={16} />Retry-safe payments</span>
      </div>
    </section>
  );
}

function LoginForm() {
  const prefill = useStore((s) => s.prefill);
  const [email, setEmail] = useState(prefill.email);
  const [password, setPassword] = useState(prefill.password);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);

  // Test Lab can change the prefill while this form is on screen.
  const [seen, setSeen] = useState(prefill);
  if (seen !== prefill) { setSeen(prefill); setEmail(prefill.email); setPassword(prefill.password); }

  const submit = async (e) => {
    e.preventDefault();
    setErrors({}); setBanner(null); setBusy(true);
    try {
      const user = await call(() => server.login(email, password));
      signIn(user);
      toast('Welcome back, ' + user.first);
    } catch (err) {
      setBusy(false);
      if (handleCommon(err)) return;
      if (err.fields) setErrors(err.fields);
      else setBanner({ tone: err.status === 403 ? 'w' : 'r', text: err.status === 403
        ? 'This account has been deactivated. Contact an administrator to restore access.'
        : 'Email or password is incorrect. Check both and try again.' });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div>
        <h2 className="d" style={{ fontSize: 38, fontWeight: 800 }}>Welcome back</h2>
        <p className="help" style={{ fontSize: 16, marginTop: 6 }}>Sign in to your wallet.</p>
      </div>
      {banner && <Note tone={banner.tone} icon="alert" role="alert">{banner.text}</Note>}
      <Field id="l-email" label="Email" icon="mail" type="email" auto="email" value={email} onChange={setEmail} error={errors.email} />
      <Field id="l-pw" label="Password" icon="lock" type="password" auto="current-password" value={password} onChange={setPassword} error={errors.password} />
      <Button tone="p" type="submit" busy={busy} style={{ height: 54, fontSize: 16 }}>Sign in <Icon name="chevR" /></Button>
      <p className="help" style={{ textAlign: 'center', fontSize: 14.5 }}>
        New here? <button type="button" className="linkbtn" onClick={() => setState({ authMode: 'register' })}>Create an account</button>
      </p>
      <hr className="hr" />
      <p className="help">Need a test account? Open the <b>Test lab</b> (bottom right) and pick one. Demo password <span className="m">password123</span>, MPIN <span className="m">1234</span>.</p>
    </form>
  );
}

function RegisterForm() {
  const [v, setV] = useState({ first: '', last: '', email: '', password: '', mpin: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (val) => setV((cur) => ({ ...cur, [k]: k === 'mpin' ? val.replace(/\D/g, '').slice(0, 4) : val }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({}); setBanner(null); setBusy(true);
    try {
      const user = await call(() => server.register(v));
      setState({ authMode: 'done', prefill: { email: user.email, password: v.password } });
    } catch (err) {
      setBusy(false);
      if (handleCommon(err)) return;
      setErrors(fieldErrors(err));
      if (!err.fields) setBanner(err.message);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div>
        <h2 className="d" style={{ fontSize: 38, fontWeight: 800 }}>Open your wallet</h2>
        <p className="help" style={{ fontSize: 16, marginTop: 6 }}>Takes under a minute. Your wallet and IBAN are created with the account.</p>
      </div>
      {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
      <div className="grid2">
        <Field id="r-first" label="First name" auto="given-name" value={v.first} onChange={set('first')} error={errors.first} />
        <Field id="r-last" label="Last name" auto="family-name" value={v.last} onChange={set('last')} error={errors.last} />
      </div>
      <Field id="r-email" label="Email" icon="mail" type="email" auto="email" value={v.email} onChange={set('email')} error={errors.email} />
      <Field id="r-pw" label="Password" icon="lock" type="password" auto="new-password" value={v.password} onChange={set('password')}
        error={errors.password} help="8 to 100 characters. A passphrase works well." />
      <PasswordMeter value={v.password} />
      <Field id="r-mpin" label="MPIN" icon="key" type="password" inputMode="numeric" max={4} value={v.mpin} onChange={set('mpin')}
        error={errors.mpin} help="4 digits. You enter it every time you send money." />
      <Button tone="p" type="submit" busy={busy} style={{ height: 54, fontSize: 16 }}>Create account</Button>
      <p className="help" style={{ textAlign: 'center', fontSize: 14.5 }}>
        Already have an account? <button type="button" className="linkbtn" onClick={() => setState({ authMode: 'login' })}>Sign in</button>
      </p>
    </form>
  );
}

function Done() {
  return (
    <div className="box" style={{ textAlign: 'center', alignItems: 'center' }}>
      <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--lime)', color: 'var(--limefg)', display: 'grid', placeItems: 'center' }}>
        <Icon name="check" size={32} />
      </div>
      <h2 className="d" style={{ fontSize: 38, fontWeight: 800 }}>Wallet ready</h2>
      <p className="help" style={{ fontSize: 16 }}>Your account and an empty wallet are set up. Sign in to add your first deposit.</p>
      <Button tone="p" style={{ width: '100%', height: 54 }} onClick={() => setState({ authMode: 'login' })}>Sign in</Button>
    </div>
  );
}

export default function AuthPage() {
  const mode = useStore((s) => s.authMode);
  const form = mode === 'register' ? <RegisterForm /> : mode === 'done' ? <Done /> : <LoginForm />;
  const side = <div className="formside">{form}</div>;
  return (
    <div className="auth">
      <div className="auththeme"><ThemeToggle /></div>
      {mode === 'login' ? <><Hero />{side}</> : <>{side}<Hero /></>}
    </div>
  );
}
