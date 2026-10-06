import { openModal, getState, toast, setState } from './store.js';
import { SessionEndedModal } from '../components/overlays.jsx';
import { currentUser } from './store.js';

/**
 * Handles failures every screen shares. Returns true when it dealt with the error,
 * so the caller can stop and leave screen-specific errors to itself.
 */
export function handleCommon(e) {
  if (e.status === 401 && /expired/i.test(e.message)) {
    const me = currentUser();
    openModal(<SessionEndedModal email={me ? me.email : ''} />, { locked: true });
    return true;
  }
  if (e.status === 403 && getState().meId) {
    setState((s) => ({ version: s.version + 1 }));
    toast('Your account has been deactivated', 'bad');
    return true;
  }
  if (e.status === 500) {
    toast('We could not reach the server. Nothing was changed. Try again.', 'bad');
    return true;
  }
  return false;
}

/** Field errors from the API arrive as { field: message }. */
export const fieldErrors = (e) => (e && e.fields) || {};
