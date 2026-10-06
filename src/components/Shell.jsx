import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { NotifBell, ThemeToggle } from './overlays.jsx';
import { useCurrentUser, useStore, navigate, signOut, SESSION_MS } from '../state/store.js';
import { initials } from '../lib/format.js';

const NAV = [
  ['home', 'home', 'Overview'],
  ['send', 'send', 'Send money'],
  ['cash', 'wallet', 'Add / Withdraw'],
  ['activity', 'list', 'Activity'],
  ['profile', 'user', 'Profile & security'],
];

export function useCountdown() {
  const exp = useStore((s) => s.exp);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, exp - now);
  const s = Math.ceil(left / 1000);
  return { left, text: String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'), ratio: left / SESSION_MS };
}

function SessionChip() {
  const { text } = useCountdown();
  return (
    <span className="chip">
      <span className="dot" style={{ color: 'var(--pos)' }} />
      Session · <span className="m">{text}</span>
    </span>
  );
}

export default function Shell({ title, sub, children }) {
  const user = useCurrentUser();
  const view = useStore((s) => s.view);
  const admin = user.role === 'ADMIN';
  const tabs = [['home', 'home', 'Home'], ['send', 'send', 'Send'], ['cash', 'wallet', 'Add'], ['activity', 'list', 'Activity'], ['profile', 'user', 'Me']]
    .concat(admin ? [['admin', 'users', 'People']] : []);

  const navButton = ([key, icon, label]) => (
    <button key={key} type="button" className={'nav' + (view === key ? ' on' : '')} onClick={() => navigate(key)}>
      <Icon name={icon} size={20} /><span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="shell">
        <aside className="rail">
          <div className="brand"><i />folio</div>
          {NAV.map(navButton)}
          {admin && (
            <>
              <div className="navh">Admin <b>ADMIN</b></div>
              {navButton(['admin', 'users', 'People'])}
            </>
          )}
          <div className="me">
            <div className="av">{initials(user)}</div>
            <div className="col mn">
              <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.first + ' ' + user.last}</b>
              <small>{admin ? 'Administrator' : 'Member'}</small>
            </div>
            <button type="button" onClick={signOut} aria-label="Sign out"><Icon name="logout" /></button>
          </div>
        </aside>
        <main className="main">
          <div className="top">
            <div className="mn"><h1>{title}</h1><p>{sub}</p></div>
            <span className="sp" />
            <div className="row wrap" style={{ gap: 10 }}>
              <SessionChip />
              <ThemeToggle />
              <NotifBell />
            </div>
          </div>
          {!user.active && (
            <div className="note r" role="alert">
              <Icon name="ban" />
              <span><b>Your account has been deactivated.</b> Your balance is safe. An administrator can restore access. Money actions are locked.</span>
            </div>
          )}
          <div className="col" style={{ gap: 24 }}>{children}</div>
        </main>
      </div>
      <nav className="tabs" aria-label="Main">
        {tabs.map(([key, icon, label]) => (
          <button key={key} type="button" className={view === key ? 'on' : ''} onClick={() => navigate(key)}>
            <Icon name={icon} size={21} />{label}
          </button>
        ))}
      </nav>
    </>
  );
}
