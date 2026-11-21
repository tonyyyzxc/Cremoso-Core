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
- `express-rate-limit`
- `helmet`
- `firebase-admin`
- `google-auth-library`
- `googleapis`
- `jsonwebtoken`
- `mongoose`
- `multer`
- `rate-limit-redis`
- `redis`
- `nodemon` (development dependency)

## Configure

Create or update the backend environment file in this folder with the connection settings provided for your environment. Set `RECAPTCHA_SECRET_KEY` to the secret key that matches the Google reCAPTCHA v2 Checkbox site key configured in the client. Keep this secret on the server only; do not commit credentials or secrets.

The backend requires `MONGODB_URL` to connect to MongoDB and `JWT_SECRET` to sign and verify sessions. `PORT` is optional; the server uses port `5000` when it is not set.

Set `CLIENT_URL` to the frontend origin in deployment. API CORS allows that origin and `http://localhost:5173` for local development.

### Optional shared rate-limit storage

Redis-backed rate limits are an optional deployment optimization and are outside the routine local development setup. Without `REDIS_URL`, rate limits use the existing in-memory store, which is suitable for a single local server process but is not shared between multiple server instances.

To enable shared rate limits, provision a Redis service and set `REDIS_URL` in the backend environment to its connection URL. For local development with Redis installed and running on the default port, use:

```text
REDIS_URL=redis://localhost:6379
```

For a hosted deployment, use the Redis provider's private/internal connection URL when the API and Redis service share a network. Keep credentials in the deployment environment; do not commit a Redis URL containing a password. When `REDIS_URL` is set, the API connects to Redis before it starts listening, so an unavailable Redis service prevents startup rather than silently reverting to per-instance limits.

Set `SUPER_ADMIN_EMAIL` to the email address of the designated active Admin account. That account keeps the Admin role and permissions, and receives Super Admin-only account management access. Regular Admins can create Branch Manager and Staff accounts; only the Super Admin can create or manage Admin accounts.

Set `SU_USERNAME` and `SU_PIN` in the server environment for the credential-change confirmation step in Settings. These values are checked before a verification code is sent to `SUPER_ADMIN_EMAIL`. Keep both values private and server-side.

Password reset and Super Admin verification email are sent through Brevo's transactional email API. Configure these backend environment variables:

- `BREVO_API_KEY`
- `MAIL_FROM` — sender in `Name <email>` format, using a sender verified in Brevo

The Brevo API key must be permitted to send transactional email, and the sender address must be verified in Brevo. Reset codes expire after 10 minutes.
Existing saved Gmail OAuth overrides are obsolete: the mailer uses the Brevo environment values until the Super Admin replaces or removes the old override.

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

For local development, open the Vite frontend at `http://localhost:5173`, sign in, and enable push notifications in Settings. Then run this in the browser console to send a test notification to registered devices for the signed-in user's branch:

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

The server listens on port `5000` by default. If `PORT` is set in the environment, it uses that value instead.
