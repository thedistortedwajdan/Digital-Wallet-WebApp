import { useEffect } from 'react';
import Icon from './Icon.jsx';
import { Button } from './ui.jsx';
import { useStore, setState, closeModal, signOut, navigate, useCurrentUser, toast } from '../state/store.js';
import { db } from '../mock/db.js';
import { rel } from '../lib/format.js';
import { setDark, useIsDark } from '../state/theme.js';

export function ThemeToggle() {
  const dark = useIsDark();
  return (
    <button type="button" className="iconbtn" onClick={() => setDark(!dark)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </button>
  );
}

export function NotifBell() {
  const user = useCurrentUser();
  const open = useStore((s) => s.notifOpen);
  const unread = user ? (db.notifs[user.id] || []).filter((n) => !n.read).length : 0;
  return (
    <button type="button" className="iconbtn" aria-expanded={open}
      aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')}
      onClick={() => setState({ notifOpen: !open })}>
      <Icon name="bell" size={20} />
      {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  );
}

const TONE = {
  in: ['rcv', 'arrowDown'], out: ['out', 'arrowUp'], sec: ['wd', 'shield'], info: ['dep', 'info'],
};

export function NotifPanel() {
  const user = useCurrentUser();
  const open = useStore((s) => s.notifOpen);
  useStore((s) => s.version);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setState({ notifOpen: false });
    const onDown = (e) => {
      if (!e.target.closest('#notif') && !e.target.closest('[aria-label^="Notifications"]')) setState({ notifOpen: false });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (!user) return <div id="notif" />;
  const list = db.notifs[user.id] || [];
  const unread = list.filter((n) => !n.read).length;
  const markAll = () => { list.forEach((n) => { n.read = true; }); setState((s) => ({ version: s.version + 1 })); };
  const openItem = (n) => {
    n.read = true;
    if (n.txId) {
      setState((s) => ({ version: s.version + 1, notifOpen: false, view: 'activity', focusTx: n.txId }));
    } else {
      setState((s) => ({ version: s.version + 1 }));
    }
  };

  return (
    <div id="notif" className={open ? 'open' : ''} role="dialog" aria-label="Notifications">
      <div className="nhead">
        <b className="d" style={{ fontSize: 20 }}>Notifications</b>
        {unread > 0 && <span className="chip b">{unread} new</span>}
        <span className="sp" />
        <Button small tone="ghost" disabled={!unread} onClick={markAll}>Mark all read</Button>
      </div>
      {list.length ? (
        <div className="nlist">
          {list.slice(0, 30).map((n) => {
            const [tone, icon] = TONE[n.type] || TONE.info;
            return (
              <button key={n.id} type="button" className={'nitem' + (n.read ? '' : ' un')} onClick={() => openItem(n)}>
                <span className={'ico ' + tone}><Icon name={icon} size={19} /></span>
                <span className="col mn" style={{ flex: 1, gap: 2 }}>
                  <b>{n.title}</b>
                  <span className="help" style={{ fontSize: 13.5 }}>{n.body}</span>
                </span>
                <span className="help" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{rel(n.at)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: '36px 20px', gap: 8, color: 'var(--mute)' }}>
          <Icon name="bell" size={30} />
          <b style={{ color: 'var(--fg)' }}>You are all caught up</b>
          <span className="help">Payments and security alerts show up here.</span>
        </div>
      )}
    </div>
  );
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div id="toast" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.kind === 'bad' ? ' bad' : '')}>
          <Icon name={t.kind === 'bad' ? 'alert' : 'check'} size={20} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function ModalHost() {
  const modal = useStore((s) => s.modal);
  useEffect(() => {
    if (!modal || modal.locked) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeModal();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal]);
  return (
    <div id="modal" className={modal ? 'open' : ''} role="dialog" aria-modal="true">
      {modal && <div className="modal">{modal.node}</div>}
    </div>
  );
}

export function SessionEndedModal({ email }) {
  const again = () => {
    signOut();
    setState({ prefill: { email, password: '' } });
    toast('Sign in again to continue. Your draft is kept.');
  };
  return (
    <>
      <div style={{ color: 'var(--mute)' }}><Icon name="clock" size={30} /></div>
      <h3 className="d" style={{ fontSize: 26 }}>Your session ended</h3>
      <p className="help" style={{ fontSize: 15 }}>
        For your safety you are signed out after 15 minutes. Sign in again and we will take you straight back.
        Anything you were typing is kept.
      </p>
      <Button tone="p" onClick={again}>Sign in again</Button>
    </>
  );
}

export { navigate };
