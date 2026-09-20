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

3. Create a `.env` file in this folder (copy from `.env.example` if one exists) with at least:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/cremoso-core
   ```
   Adjust `MONGO_URI` if you're using Atlas or a different local setup.

## Running

Start the server with auto-restart on file changes (nodemon):

```bash
npm run dev
```

> If your `package.json` doesn't have a `dev` script yet, add one:
>
> ```json
> "scripts": {
>   "dev": "nodemon server.js",
>   "start": "node server.js"
> }
> ```

For a plain run without auto-restart:

```bash
npm start
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
- Make sure MongoDB is running before starting the server, or `MONGO_URI` points to a reachable database.
