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

The Google OAuth consent screen must enable the Drive API and grant the `https://www.googleapis.com/auth/drive` and `https://www.googleapis.com/auth/calendar.events` scopes. Connect Google from YourDrive or the Shift Schedule page; use the Shift Schedule page to grant Calendar access to an existing connection.

Shift schedules sync events to the Google Calendar of the user who created each shift. Assigned active staff accounts are invited as event attendees. Schedule visibility in Cremoso-Core remains role- and branch-scoped; admins can view all branches, branch managers their branch, and staff their assigned branch. If another authorized manager edits or cancels a shift, the event creator must sync the pending change.

Enable the Google Calendar API in the same Google Cloud project as the Drive API. Calendar uses the existing per-user Google OAuth credentials; no additional environment variables are required.

## Run

Start the backend development server from this folder:

```bash
npm run dev
```

The server listens on port `5000`.
