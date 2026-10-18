# Cremoso-Core

Multi-branch management platform for Team Kondisyones. The project has a React/Vite frontend in `client/` and an Express/MongoDB backend in `server/`.

## Prerequisites

- Node.js (LTS recommended)
- npm
- Access to the MongoDB connection settings required by the backend

## Install

From the project root, install dependencies for each app:

```bash
npm install
cd server
npm install
cd ../client
npm install
cd ..
```

These commands install packages declared in each folder's `package.json`:

- Root: `concurrently`
- Server: `bcrypt`, `cors`, `dotenv`, `express`, `google-auth-library`, `jsonwebtoken`, `mongoose`, `nodemon` (development dependency)
- Client application dependencies: `@react-oauth/google`, `@tailwindcss/vite`, `lucide-react`, `react`, `react-dom`, `react-router-dom`, `tailwindcss`
- Client development dependencies: `@eslint/js`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `vite`

## Configure

Create or update the backend environment file in `server/` using the connection settings provided for your environment. Do not commit credentials or secrets.

## Run

Start both frontend and backend from the project root:

```bash
npm run dev
```

To start an app separately, run `npm run dev` from its folder:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

The frontend's Vite development server prints its local URL in the terminal.
