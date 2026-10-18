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
- `jsonwebtoken`
- `mongoose`
- `nodemon` (development dependency)

## Configure

Create or update the backend environment file in this folder with the connection settings provided for your environment. Do not commit credentials or secrets.

## Run

Start the backend development server from this folder:

```bash
npm run dev
```

The server listens on port `5000`.
