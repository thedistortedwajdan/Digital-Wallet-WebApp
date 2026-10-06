import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Shell from '../components/Shell.jsx';
import { Button, Field, Note, Seg } from '../components/ui.jsx';
import { useCurrentUser, openModal, closeModal, toast, navigate } from '../state/store.js';
import { call } from '../mock/transport.js';
import { server } from '../mock/server.js';
import { db, hasActivity, userById } from '../mock/db.js';
import { handleCommon, fieldErrors } from '../state/handlers.jsx';
import { bankName, formatIban } from '../lib/iban.js';
import { dateOnly, initials } from '../lib/format.js';

const PAGE_SIZE = 5;

/** Wraps a confirm dialog's action: closes the dialog, runs the call, reports the outcome. */
function ConfirmDialog({ title, body, confirmLabel, danger, action, success }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await call(action);
      closeModal();
      success();
    } catch (e) {
      closeModal();
      if (!handleCommon(e)) toast(e.message, 'bad');
    }
  };
  return (
    <>
      <h3 className="d" style={{ fontSize: 24 }}>{title}</h3>
      <p className="help" style={{ fontSize: 15 }}>{body}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={closeModal}>Cancel</Button>
        <Button tone={danger ? 'dd' : 'p'} busy={busy} onClick={run}>{confirmLabel}</Button>
      </div>
    </>
  );
}

function DeleteDialog({ target, actor }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = typed.trim().toLowerCase() === target.email.toLowerCase();
  const run = async () => {
    setBusy(true);
    try {
      await call(() => server.deleteUser(actor, target.id));
      closeModal();
      toast('Person deleted');
    } catch (e) {
      closeModal();
      if (!handleCommon(e)) toast(e.message, 'bad');
    }
  };
  return (
    <>
      <h3 className="d" style={{ fontSize: 24 }}>Delete {target.first + ' ' + target.last}?</h3>
      <p className="help" style={{ fontSize: 15 }}>They have no balance and no history, so this permanently removes the account. It cannot be undone.</p>
      <Field id="del-c" label="Type the email to confirm" value={typed} onChange={setTyped} placeholder={target.email} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={closeModal}>Cancel</Button>
        <Button tone="dd" busy={busy} disabled={!ok} onClick={run}>Delete forever</Button>
      </div>
    </>
  );
}

function PersonPanel({ person, actor, onClose }) {
  const self = person.id === actor.id;
  const blockedDelete = hasActivity(person);
  const wallet = db.wallets[person.wid];
  const [v, setV] = useState({ first: person.first, last: person.last, email: person.email });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (val) => setV((c) => ({ ...c, [k]: val }));

  const save = async (e) => {
    e.preventDefault();
    setErrors({}); setBanner(''); setBusy(true);
    try {
      await call(() => server.updateUser(person.id, v));
      setBusy(false);
      toast('Details saved');
    } catch (err) {
      setBusy(false);
      if (handleCommon(err)) return;
      setErrors(fieldErrors(err));
      if (!err.fields) setBanner(err.message);
    }
  };

  const changeRole = (role) => {
    if (person.role === role) return;
    openModal(
      <ConfirmDialog
        title={`Make ${person.first} ${role === 'ADMIN' ? 'an admin' : 'a regular user'}?`}
        body={role === 'ADMIN' ? 'Admins can edit, deactivate and delete other people.' : 'They will lose access to People and every admin action.'}
        confirmLabel="Confirm" action={() => server.setRole(actor, person.id, role)} success={() => toast('Role updated')} />,
    );
  };

  const toggleActive = () => {
    if (!person.active) {
      call(() => server.setActive(actor, person.id, true))
        .then(() => toast(person.first + ' is active again'))
        .catch((e) => { if (!handleCommon(e)) toast(e.message, 'bad'); });
      return;
    }
    openModal(
      <ConfirmDialog
        title={`Deactivate ${person.first} ${person.last}?`} danger confirmLabel="Deactivate"
        body="They are locked out of money actions right away. Their balance and history stay untouched, and you can reactivate any time."
        action={() => server.setActive(actor, person.id, false)} success={() => toast('Account deactivated')} />,
    );
  };

  return (
    <aside className="card col" style={{ gap: 18, padding: 24, border: '1.5px solid var(--fg)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row mn">
          <div className={'av' + (person.active ? '' : ' off')} style={{ width: 48, height: 48 }}>{initials(person)}</div>
          <div className="mn">
            <b className="d" style={{ fontSize: 20 }}>{person.first + ' ' + person.last}</b>
            <div className="help m" style={{ fontSize: 12 }}>User #{person.id} · Wallet #{person.wid}</div>
            <div className="help m" style={{ fontSize: 11.5, overflowWrap: 'anywhere' }}>{formatIban(wallet.iban)} · {bankName(wallet.bank)}</div>
          </div>
        </div>
        <Button small tone="ghost" style={{ padding: '0 10px' }} onClick={onClose} aria-label="Close"><Icon name="x" /></Button>
      </div>

      <form onSubmit={save} className="col" style={{ gap: 12 }} noValidate>
        {banner && <Note tone="r" icon="alert" role="alert">{banner}</Note>}
        <div className="grid2">
          <Field id="a-first" label="First name" value={v.first} onChange={set('first')} error={errors.first} />
          <Field id="a-last" label="Last name" value={v.last} onChange={set('last')} error={errors.last} />
        </div>
        <Field id="a-email" label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} />
        <Button small tone="p" type="submit" busy={busy} style={{ alignSelf: 'flex-end' }}>Save details</Button>
      </form>
      <hr className="hr" />

      <div className="field">
        <label>Role</label>
        <div className="seg" style={{ width: '100%' }}>
          {['USER', 'ADMIN'].map((r) => (
            <button key={r} type="button" style={{ flex: 1 }} className={person.role === r ? 'on' : ''} disabled={self} onClick={() => changeRole(r)}>{r}</button>
          ))}
        </div>
        <span className="help">{self ? 'You cannot change your own role. Ask another admin.' : 'Admins can manage everyone here. You will confirm before it applies.'}</span>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
        <div className="col"><b id="acc-l">Account access</b><span className="help">{self ? 'You cannot deactivate yourself.' : 'Deactivated people cannot sign in or move money.'}</span></div>
        <button type="button" className="sw" role="switch" aria-labelledby="acc-l" aria-checked={person.active} disabled={self} onClick={toggleActive} />
      </div>
      <hr className="hr" />

      <div className="col" style={{ gap: 8 }}>
        <span className="eyebrow" style={{ color: 'var(--neg)' }}>Danger zone</span>
        <Button tone="d" disabled={self || blockedDelete} onClick={() => openModal(<DeleteDialog target={person} actor={actor} />)}><Icon name="trash" size={16} />Delete person</Button>
        {self ? <Note tone="w" icon="lock">You cannot delete your own account.</Note>
          : blockedDelete ? <Note tone="w" icon="lock">{person.first} has a balance or history, so deletion is blocked. Deactivate instead.</Note>
            : <span className="help">{person.first} has no balance or history, so deletion is allowed.</span>}
      </div>
    </aside>
  );
}

export default function AdminPage() {
  const actor = useCurrentUser();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  if (actor.role !== 'ADMIN') {
    return (
      <Shell title="This area is for admins" sub="Your role is USER.">
        <div className="card col" style={{ alignItems: 'flex-start', gap: 14, maxWidth: 520 }}>
          <div style={{ color: 'var(--mute)' }}><Icon name="shield" size={32} /></div>
          <h3 className="d" style={{ fontSize: 26 }}>403 · Admins only</h3>
          <p className="help" style={{ fontSize: 15 }}>People is not available for your role. Admin links are hidden from the menu; this appears only if you open the address directly.</p>
          <Button onClick={() => navigate('home')}>Back to overview</Button>
        </div>
      </Shell>
    );
  }

  const data = server.listUsers(page, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const all = db.users;
  const q = query.trim().toLowerCase();
  const rows = data.content.filter((u) =>
    (filter === 'all' || (filter === 'admin' && u.role === 'ADMIN') || (filter === 'off' && !u.active)) &&
    (!q || (u.first + ' ' + u.last + ' ' + u.email).toLowerCase().includes(q)));
  const person = selected && userById(selected);

  return (
    <Shell title="People" sub="Everyone with an account. Admin only.">
      <div className="three">
        {[['Total people', all.length], ['Active', all.filter((u) => u.active).length], ['Deactivated', all.filter((u) => !u.active).length]].map(([label, n]) => (
          <div key={label} className="card" style={{ padding: '18px 22px', borderRadius: 18 }}>
            <span className="eyebrow">{label}</span>
            <div className="d m" style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>{n}</div>
          </div>
        ))}
      </div>
      <div className="two" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="card" style={{ padding: '20px 10px 10px' }}>
          <div className="row wrap" style={{ padding: '0 14px 14px' }}>
            <div className="inw" style={{ height: 42, borderRadius: 99, width: 'min(260px,100%)' }}>
              <Icon name="search" size={16} />
              <input type="search" placeholder="Find on this page" aria-label="Find people" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Seg label="Filter" value={filter} onChange={setFilter} options={[['all', 'All'], ['admin', 'Admins'], ['off', 'Deactivated']]} />
          </div>
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Person</th><th>Role</th><th>Access</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {rows.length ? rows.map((u) => (
                  <tr key={u.id} className={selected === u.id ? 'sel' : ''} tabIndex={0} onClick={() => setSelected(u.id)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(u.id)} data-act="row">
                    <td>
                      <div className="row">
                        <div className={'av' + (u.active ? '' : ' off')} style={{ width: 36, height: 36, fontSize: 13 }}>{initials(u)}</div>
                        <div className="col mn">
                          <b>{u.first + ' ' + u.last}{u.id === actor.id && <span className="chip k" style={{ height: 20, fontSize: 10.5, padding: '0 8px', marginLeft: 6 }}>YOU</span>}</b>
                          <span className="help" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={'chip' + (u.role === 'ADMIN' ? ' b' : '')} style={{ height: 26, fontSize: 11.5 }}>{u.role}</span></td>
                    <td><span className={'chip ' + (u.active ? 'g' : 'r')} style={{ height: 26, fontSize: 11.5 }}><span className="dot" />{u.active ? 'Active' : 'Deactivated'}</span></td>
                    <td className="help">{dateOnly(u.created)}</td>
                    <td style={{ color: 'var(--mute)' }}><Icon name="chevR" /></td>
                  </tr>
                )) : <tr><td colSpan={5} className="help" style={{ textAlign: 'center', padding: 30 }}>No one on this page matches.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="help">{page * PAGE_SIZE + 1} to {Math.min(data.total, page * PAGE_SIZE + PAGE_SIZE)} of {data.total}</span>
            <div className="row" style={{ gap: 6 }}>
              <Button small tone="ghost" disabled={page === 0} onClick={() => { setPage(page - 1); setSelected(null); }}><Icon name="chevL" size={15} />Previous</Button>
              <Button small tone="ghost" disabled={page + 1 >= pages} onClick={() => { setPage(page + 1); setSelected(null); }}>Next<Icon name="chevR" size={15} /></Button>
            </div>
          </div>
        </section>
        {person ? <PersonPanel key={person.id + ':' + person.email} person={person} actor={actor} onClose={() => setSelected(null)} /> : (
          <aside className="card col" style={{ gap: 8, alignItems: 'flex-start', color: 'var(--mute)' }}>
            <Icon name="users" size={28} /><b style={{ color: 'var(--fg)' }}>Pick a person</b>
            <span className="help">Select a row to edit details, change role, switch access or delete.</span>
          </aside>
        )}
      </div>
    </Shell>
  );
}
