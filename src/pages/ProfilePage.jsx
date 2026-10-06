import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell, { useCountdown } from '../components/Shell.jsx';
import { Button, Field, Note, PasswordMeter } from '../components/ui.jsx';
import { useCurrentUser, signOut, toast, bump } from '../state/store.js';
import { call } from '../mock/transport.js';
import { server } from '../mock/server.js';
import { handleCommon, fieldErrors } from '../state/handlers.jsx';
import { dateOnly, initials } from '../lib/format.js';

/** Small helper for the three forms on this page: runs the call, maps errors to fields or a banner. */
function useSubmit(action, done) {
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErrors({}); setBanner(''); setBusy(true);
    try {
      await call(action);
      setBusy(false);
      done();
    } catch (err) {
      setBusy(false);
      if (handleCommon(err)) return;
      setErrors(fieldErrors(err));
      if (!err.fields) setBanner(err.message);
    }
  };
  return { errors, banner, busy, submit };
}

function DetailsForm({ user }) {
  const [v, setV] = useState({ first: user.first, last: user.last, email: user.email });
  const set = (k) => (val) => setV((c) => ({ ...c, [k]: val }));
  const { errors, banner, busy, submit } = useSubmit(() => server.updateUser(user.id, v), () => { bump(); toast('Profile saved'); });
  return (
    <form onSubmit={submit} className="card col" style={{ gap: 18, padding: 28 }} noValidate>
      <h3 className="d" style={{ fontSize: 24 }}>Personal details</h3>
      {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
      <div className="grid2">
        <Field id="p-first" label="First name" auto="given-name" value={v.first} onChange={set('first')} error={errors.first} />
        <Field id="p-last" label="Last name" auto="family-name" value={v.last} onChange={set('last')} error={errors.last} />
      </div>
      <Field id="p-email" label="Email" icon="mail" type="email" auto="email" value={v.email} onChange={set('email')} error={errors.email} />
      <Note>People pay you by IBAN, so changing your email does not change where money arrives.</Note>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button tone="p" type="submit" busy={busy}>Save changes</Button></div>
    </form>
  );
}

function PasswordForm({ user }) {
  const [v, setV] = useState({ current: '', next: '' });
  const reset = () => { setV({ current: '', next: '' }); toast('Password updated. Use it next time you sign in.'); };
  const { errors, banner, busy, submit } = useSubmit(() => server.changePassword(user.id, v.current, v.next), reset);
  return (
    <form onSubmit={submit} className="card col" style={{ gap: 18, padding: 28 }} noValidate>
      <h3 className="d" style={{ fontSize: 24 }}>Change password</h3>
      {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
      <Field id="pw-cur" label="Current password" icon="lock" type="password" auto="current-password" value={v.current}
        onChange={(x) => setV({ ...v, current: x })} error={errors.current} />
      <Field id="pw-new" label="New password" icon="key" type="password" auto="new-password" value={v.next}
        onChange={(x) => setV({ ...v, next: x })} error={errors.next} help="8 to 100 characters, and different from your current one." />
      <PasswordMeter value={v.next} />
      <Note tone="w" icon="clock">Other devices stay signed in until their session ends, about 15 minutes.</Note>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button tone="p" type="submit" busy={busy}>Update password</Button></div>
    </form>
  );
}

function MpinForm({ user }) {
  const [v, setV] = useState({ current: '', next: '' });
  const digits = (x) => x.replace(/\D/g, '').slice(0, 4);
  const done = () => { setV({ current: '', next: '' }); bump(); toast('MPIN updated'); };
  const { errors, banner, busy, submit } = useSubmit(() => server.changeMpin(user.id, v.current, v.next), done);
  return (
    <form onSubmit={submit} className="card col" style={{ gap: 18, padding: 28 }} noValidate>
      <h3 className="d" style={{ fontSize: 24 }}>Change MPIN</h3>
      {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
      <Field id="mp-cur" label="Current MPIN" icon="lock" type="password" inputMode="numeric" max={4} value={v.current}
        onChange={(x) => setV({ ...v, current: digits(x) })} error={errors.current} />
      <Field id="mp-new" label="New MPIN" icon="key" type="password" inputMode="numeric" max={4} value={v.next}
        onChange={(x) => setV({ ...v, next: digits(x) })} error={errors.next} help="4 digits. Asked every time you send money." />
      <div className="row" style={{ justifyContent: 'flex-end' }}><Button tone="p" type="submit" busy={busy}>Update MPIN</Button></div>
    </form>
  );
}

export default function ProfilePage() {
  const user = useCurrentUser();
  const { text, ratio } = useCountdown();
  return (
    <Shell title="Profile & security" sub="Your details and how you sign in.">
      <div className="two">
        <div className="col" style={{ gap: 24 }}>
          <DetailsForm user={user} />
          <PasswordForm user={user} />
          <MpinForm user={user} />
        </div>
        <div className="col" style={{ gap: 24 }}>
          <section className="slab" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="row" style={{ gap: 16 }}>
              <div className="av" style={{ width: 64, height: 64, fontSize: 22 }}>{initials(user)}</div>
              <div className="mn"><h3 className="d" style={{ fontSize: 24 }}>{user.first + ' ' + user.last}</h3><span style={{ color: 'var(--slabmute)', overflowWrap: 'anywhere' }}>{user.email}</span></div>
            </div>
            <div className="row"><span className="chip k">{user.role}</span><span className="chip" style={{ background: 'var(--slabchip)', borderColor: 'var(--slabline)', color: 'var(--slabmute)' }}>{user.active ? 'Active' : 'Deactivated'}</span></div>
            <hr style={{ border: 0, height: 1, background: 'var(--slabline)', margin: 0 }} />
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px', fontSize: 14.5 }}>
              <dt style={{ color: 'var(--slabmute)' }}>User ID</dt><dd className="m" style={{ margin: 0, textAlign: 'right' }}>#{user.id}</dd>
              <dt style={{ color: 'var(--slabmute)' }}>Joined</dt><dd style={{ margin: 0, textAlign: 'right' }}>{dateOnly(user.created)}</dd>
              <dt style={{ color: 'var(--slabmute)' }}>Wallet</dt><dd className="m" style={{ margin: 0, textAlign: 'right' }}>#{user.wid}</dd>
            </dl>
          </section>
          <section className="card col" style={{ gap: 12, padding: 24 }}>
            <h3 className="d" style={{ fontSize: 20 }}>This session</h3>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="help">Expires in</span><b className="m">{text}</b></div>
            <div className="bar"><i style={{ width: ratio * 100 + '%' }} /></div>
            <span className="help">At zero you sign in again. Anything you were typing is kept.</span>
            <Button tone="d" onClick={signOut}><Icon name="logout" size={17} />Sign out</Button>
          </section>
          <section className="card col" style={{ gap: 10, padding: '22px 24px' }}>
            <span className="eyebrow">For developers</span>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Data</span><span className="chip a">Mock</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Service health</span><span className="chip g"><span className="dot" />UP</span></div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
