import Icon from './Icon.jsx';
import { BankBadge, Button, Note } from './ui.jsx';
import { currentUser, closeModal, toast } from '../state/store.js';
import { walletOf } from '../mock/db.js';
import { bankName, formatIban } from '../lib/iban.js';
import { copyText } from '../lib/format.js';

export function ReceiveModal() {
  const user = currentUser();
  const wallet = walletOf(user);
  const copy = async () => { await copyText(wallet.iban); toast('IBAN copied'); };
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="d" style={{ fontSize: 24 }}>Receive money</h3>
        <Button small tone="ghost" style={{ padding: '0 10px' }} onClick={closeModal} aria-label="Close"><Icon name="x" /></Button>
      </div>
      <p className="help" style={{ fontSize: 15 }}>Share these details. Anyone can pay you with just the IBAN.</p>
      <div className="slab" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row">
          <BankBadge code={wallet.bank} size={44} />
          <div className="col"><b>{bankName(wallet.bank)}</b><span style={{ color: 'var(--slabmute)', fontSize: 13 }}>{user.first + ' ' + user.last}</span></div>
        </div>
        <div className="m" style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.02em', overflowWrap: 'anywhere', color: 'var(--lime)' }}>
          {formatIban(wallet.iban)}
        </div>
      </div>
      <Button tone="p" onClick={copy}><Icon name="copy" size={16} />Copy IBAN</Button>
      <Note icon="bell">You get a notification the moment money arrives.</Note>
    </>
  );
}
