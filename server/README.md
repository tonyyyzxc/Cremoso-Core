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

YourDrive connects each signed-in user to their own Google Drive. Configure:

- `DRIVE_CLIENT_ID`
- `DRIVE_CLIENT_SECRET`
- `DRIVE_REDIRECT_URI` — must match the Google OAuth redirect URI, such as `http://localhost:5000/api/drive/callback`
- `CLIENT_URL` — frontend origin used after OAuth; defaults to `http://localhost:5173`

The Google OAuth consent screen must enable the Drive API and grant the `https://www.googleapis.com/auth/drive` scope.

## Run

Start the backend development server from this folder:

```bash
npm run dev
```

The server listens on port `5000`.
