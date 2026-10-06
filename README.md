# Folio · Digital Wallet WebApp

A React front end for the Digital Wallet API, running on a built-in mock server so every flow can be tested
without a backend. Nothing here touches real money or a real bank.

## What you can try

| Area | What it covers |
|------|----------------|
| Auth | Register (with a 4-digit MPIN), sign in, wrong password, deactivated account, session countdown and expiry |
| Send money | Type an IBAN. The app checks it, finds the bank, confirms the account holder, then asks for the MPIN before sending |
| Receive | Your own IBAN with a copy button, a Receive card, and payments that arrive on their own with a notification |
| Wallet | Add money, withdraw, overdraft guard, activity ledger with balance before and after, filters and paging |
| Profile | Edit details, change password, change MPIN |
| Admin | People list, edit, role, activate or deactivate, delete (only when empty), self-protection rules |
| Extras | Dark mode, notification bell, retry-safe payments (a lost response never sends twice) |

## Test lab

The **Test lab** button (bottom right) opens a panel for testing:

* **Accounts**: every test account with its email, password, MPIN and IBAN. Click a value to copy it, or press *Use* to fill the sign-in form (or switch account while signed in).
* **IBANs**: valid recipients plus the failure cases (mistyped digit, unknown bank, no account, your own IBAN, a deactivated account). *Use* fills the Send screen and starts the lookups.
* **MPIN**: enter the correct or a wrong MPIN on the Confirm step. Three wrong tries lock transfers for 30 seconds.
* **Simulate**: receive a payment now, expire the session, lose the next payment response, force a server error, deactivate yourself, reset all data.

Demo password for every seeded account is `password123` and the MPIN is `1234`.
Data is kept in the browser (localStorage), so a refresh keeps it. *Reset all test data* restores the seed.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # rules of the mock server
npm run build    # production build in dist/
```

## Project layout

```
src/
  mock/        the fake server: db.js (seed + storage), server.js (all API rules), transport.js (latency, session, failures)
  state/       small store, theme, incoming-payment timer, shared error handling
  lib/         formatting helpers, IBAN generation and validation
  components/  shell, overlays (modal, toast, notifications), Test lab, shared UI
  pages/       one file per screen
```

To connect the real backend later, replace the calls to `server.*` (through `call(...)` in `transport.js`) with
HTTP requests. The screens only depend on the shape of the results.

The real Spring API currently transfers by recipient email and has no IBAN, bank lookup, MPIN or notifications.
Those are front-end designs here and need matching endpoints before they can leave the mock.

## Deploy on Cloudflare Pages (free)

1. Push this repo to GitHub.
2. In the Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
3. Build settings:
   * Framework preset: **Vite** (or None)
   * Build command: `npm run build`
   * Build output directory: `dist`
4. Save and deploy. Every push to `main` redeploys. The site is served at `https://<project-name>.pages.dev` or `.workers.dev`.

If the project was created as a Worker (the deploy command is `npx wrangler deploy`), `wrangler.jsonc` in the repo root
tells it to publish the `dist/` folder as a static single-page site, so no extra setup is needed.

## Link parameters

Handy for embeds and screenshots. They work on any page address.

| Parameter | Effect |
|---|---|
| `?demo` | Start from fresh test data and sign in as the admin (Amina) |
| `?demo=user` | Same, signed in as a regular member (Daniel) |
| `&lab` | Open the Test lab |
| `&still` | Stop payments from arriving on their own |
| `&theme=dark` or `&theme=light` | Force a theme |
