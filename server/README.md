# Server (Backend)

Express and MongoDB backend for Cremoso-Core.

## Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB connection settings for your environment

## Install

From the project root, install the backend dependencies with:

```bash
cd server
npm install
```

This installs the dependencies listed in `package.json`:

- `bcrypt`
- `cors`
- `dotenv`
- `express`
- `google-auth-library`
- `googleapis`
- `jsonwebtoken`
- `mongoose`
- `multer`
- `nodemon` (development dependency)

## Configure

Create or update the backend environment file in this folder with the connection settings provided for your environment. Set `RECAPTCHA_SECRET_KEY` to the secret key that matches the Google reCAPTCHA v2 Checkbox site key configured in the client. Keep this secret on the server only; do not commit credentials or secrets.

Set `SUPER_ADMIN_EMAIL` to the email address of the designated active Admin account. That account keeps the Admin role and permissions, and receives Super Admin-only account management access. Regular Admins can create Branch Manager and Staff accounts; only the Super Admin can create or manage Admin accounts.

Password reset and Super Admin verification email are sent through Brevo's transactional email API. Configure these backend environment variables:

- `BREVO_API_KEY`
- `MAIL_FROM` — sender in `Name <email>` format, using a sender verified in Brevo

The Brevo API key must be permitted to send transactional email, and the sender address must be verified in Brevo. Reset codes expire after 10 minutes.
Existing saved Gmail OAuth overrides are obsolete: the mailer uses the Brevo environment values until the Super Admin replaces or removes the old override.

The temporary NBA scores widget on the login screen uses BALLDONTLIE. Add your API key to the local `server/.env` file:

```env
BALLDONTLIE_API_KEY=your_api_key
```

Keep the key server-side; it is not included in the frontend. The integration requests today's games and caches results for 60 seconds. See `server/integrations/balldontlie/` and the marked login widget/server route registration to remove the feature.

YourDrive connects each signed-in user to their own Google Drive. Configure:

- `DRIVE_CLIENT_ID`
- `DRIVE_CLIENT_SECRET`
- `DRIVE_REDIRECT_URI` — must match the Google OAuth redirect URI, such as `http://localhost:5000/api/drive/callback`
- `CLIENT_URL` — frontend origin used after OAuth; defaults to `http://localhost:5173`

The Google OAuth consent screen must enable the Drive API and grant the `https://www.googleapis.com/auth/drive` scope. Connect Google from YourDrive.

Shift schedules sync events to the Google Calendar of the user who created each shift. Assigned active staff accounts are invited as event attendees. Schedule visibility in Cremoso-Core remains role- and branch-scoped; admins can view all branches, branch managers their branch, and staff their assigned branch. If another authorized manager edits or cancels a shift, the event creator must sync the pending change.

Google Calendar uses a separate per-user OAuth connection. Configure `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`, and `CALENDAR_REDIRECT_URI`; the redirect URI must match `http://localhost:5000/api/calendar/callback` for local development. Enable the Google Calendar API and grant the `https://www.googleapis.com/auth/calendar.events` scope. Connect Google Calendar from the Shift Schedule page.

Google Sheets uses a separate per-user OAuth connection. Configure `SHEETS_CLIENT_ID`, `SHEETS_CLIENT_SECRET`, and `SHEETS_REDIRECT_URI`; the redirect URI must match `http://localhost:5000/api/sheets/callback` for local development. Enable the Google Sheets API and grant the `https://www.googleapis.com/auth/spreadsheets` scope. Connect Google Sheets from Reports before exporting.

### Super Admin integration credential overrides

The Super Admin can replace credential bundles from Settings. Overrides are encrypted with AES-256-GCM before they are stored in MongoDB; removing an override returns that integration to its environment configuration. Set `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` in the server deployment environment to a randomly generated 64-character hexadecimal value (32 random bytes). Keep a secure backup of this key: stored overrides cannot be decrypted without it. Generate a key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The editor handles Google sign-in, reCAPTCHA, Brevo, Google Drive, Google Calendar, and Google Sheets. It validates Google sign-in with a test ID token, reCAPTCHA with a fresh challenge response, and Brevo by sending a test email to the Super Admin. Drive/Calendar are checked through temporary OAuth consent and read-only API calls. Sheets validation confirms OAuth and the requested Sheets scope; a real Sheets export remains the check that the API is enabled and available. Credentials replace the active bundle only after validation. PDF export has no external credentials. Replacing Google OAuth credentials may require users to reconnect that Google service. Super Admin verification codes are sent through the configured Brevo integration.

### Web push notifications

Set `FIREBASE_SERVICE_ACCOUNT_JSON` in the server deployment environment to the complete Firebase service-account JSON for the same Firebase project used by the web app. Keep this private credential server-side and out of source control; it is separate from the public Firebase web-app configuration managed in Settings. Push delivery also requires Firebase Cloud Messaging to be enabled in Settings. Staff and Branch Managers can opt their browser in or out from account Settings. Branch Managers can review branch-scoped item and supply stock in the read-only Inventory tab.

To send a test notification to registered devices for the signed-in user's branch, sign in to the app, enable push notifications in Settings, and run this in the app's browser console:

```js
const { apiRequest } = await import("/src/utils/api.js");
await apiRequest("/api/push/test", { method: "POST" });
```

The response reports the number of registered, successfully notified, and failed devices. The endpoint does not change inventory.

## Run

Start the backend development server from this folder:

```bash
npm run dev
```

The server listens on port `5000`.
