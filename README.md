# Cremoso-Core

Full-stack app with a React (Vite) client and an Express/MongoDB server.

## Project Structure

```
Cremoso-Core/
├── Client/     # React frontend (Vite + Tailwind)
├── server/     # Express backend + MongoDB (Mongoose)
└── package.json  # Root scripts to run both together
```

## Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB (local install or a connection string to Atlas)

## First-Time Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/tonyyyzxc/Cremoso-Core.git
   cd Cremoso-Core
   ```

2. Install dependencies in **all three** locations:

   ```bash
   npm install
   npm install --prefix Client
   npm install --prefix server
   ```

3. Set up environment variables. See `Client/README.md` and `server/README.md` for what each `.env` needs.

## Running the App

Run both client and server together from the root:

```bash
npm run dev
```

This uses `concurrently` to start:

- The client (Vite dev server)
- The server (Express + nodemon)

### Running them separately

If you only need one side running, see:

- [`Client/README.md`](./Client/README.md)
- [`server/README.md`](./server/README.md)

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Express, Mongoose (MongoDB), CORS, dotenv
- **Dev tooling:** nodemon, concurrently, ESLint, Prettier
