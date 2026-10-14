# Server (Backend)

Express API backed by MongoDB (via Mongoose).

## Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

1. Navigate into the folder:

   ```bash
   cd server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in this folder with the required settings:
   ```
   MONGODB_URL=mongodb://127.0.0.1:27017/cremoso-core
   JWT_SECRET=replace-with-a-long-random-secret
   ```
   For Google sign-in, also set `GOOGLE_CLIENT_ID` to your Google OAuth web client ID. To create the first administrator, temporarily set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`; see the root README for details.

   `MONGODB_URL` is the variable the server reads. It listens on port `5000`, which is currently set in `server.js`; `PORT` is not read from `.env`.

## Running

Start the server with auto-restart on file changes (nodemon):

```bash
npm run dev
```

## Tech Stack

- Express 5
- Mongoose (MongoDB)
- CORS
- dotenv
- nodemon (dev only)

## Project Structure

```
server/
├── server.js        # Entry point
├── .env              # Environment variables (not committed)
└── ...               # routes/, models/, controllers/ as the project grows
```

## Notes for Contributors

- Never commit `.env` — it's already in `.gitignore`.
- Make sure MongoDB is running before starting the server, or `MONGODB_URL` points to a reachable database.
