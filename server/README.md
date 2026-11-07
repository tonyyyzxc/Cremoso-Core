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

Password reset email is sent through the Gmail API. Configure these backend environment variables:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER`

The OAuth credentials must allow Gmail API access for the sender account. Reset codes expire after 10 minutes.

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

The editor handles Google sign-in, reCAPTCHA, Gmail, Google Drive, Google Calendar, and Google Sheets. PDF export has no external credentials. Replacing Google OAuth credentials may require users to reconnect that Google service. The verification code is sent to the configured Super Admin email using the Gmail integration.

## Run

Start the backend development server from this folder:

```bash
npm run dev
```

The server listens on port `5000`.
