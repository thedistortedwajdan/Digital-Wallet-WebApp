import { useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import HomePage from './pages/HomePage.jsx';
import SendPage from './pages/SendPage.jsx';
import CashPage from './pages/CashPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import TestLab from './components/TestLab.jsx';
import { ModalHost, NotifPanel, SessionEndedModal, ToastHost } from './components/overlays.jsx';
import { currentUser, getState, openModal, useStore } from './state/store.js';
import { startIncoming, stopIncoming } from './state/incoming.js';

const PAGES = { home: HomePage, send: SendPage, cash: CashPage, activity: ActivityPage, profile: ProfilePage, admin: AdminPage };

export default function App() {
  const meId = useStore((s) => s.meId);
  const view = useStore((s) => s.view);
  const exp = useStore((s) => s.exp);

  // Money arrives on its own while someone is signed in.
  useEffect(() => {
    if (meId && !getState().still) startIncoming();
    else stopIncoming();
    return stopIncoming;
  }, [meId]);

  // Show the "session ended" dialog as soon as the token runs out, not only on the next request.
  useEffect(() => {
    if (!meId) return undefined;
    const t = setInterval(() => {
      const s = getState();
      if (s.meId && Date.now() > s.exp && !s.modal) {
        const me = currentUser();
        openModal(<SessionEndedModal email={me ? me.email : ''} />, { locked: true });
      }
    }, 500);
    return () => clearInterval(t);
  }, [meId, exp]);

  const Page = meId ? PAGES[view] || HomePage : AuthPage;
  return (
    <>
      <Page />
      <NotifPanel />
      <ModalHost />
      <ToastHost />
      <TestLab />
    </>
  );
}
