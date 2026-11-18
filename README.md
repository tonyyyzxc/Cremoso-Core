<p align="center">
  <img src="client/public/cremoso-pic.jpg" alt="Cremoso logo" width="300" />
</p>

# Cremoso-Core

Cremoso-Core is a multi-branch operations platform built for Team Kondisyones. It brings sales, inventory, scheduling, reporting, and audit activity into one web application, with access scoped by user role and branch.

**Developed by:** Team Kondisyones  
**Live demo:** [cremoso-core.vercel.app](https://cremoso-core.vercel.app/login)

## Features

- **Staff:** Create orders, manage the order queue, review transactions, view schedules, and access personal activity history.
- **Branch Managers:** Manage branch sales, submit daily cash reconciliation, review inventory and supply stock, manage schedules and staff records, and update branch information.
- **Admins:** Review company-wide reports and orders; manage branches, catalog, inventory, schedules, accounts, and integrations.
- **Super Admin:** All Admin capabilities, plus protected account administration and integration credential management.

The system records important activity, including sales, inventory changes, and pricing updates, to support accountability across branches.

## Technology

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

- **Frontend:** React, Vite, and Tailwind CSS
- **Backend:** Node.js and Express
- **Database:** MongoDB with Mongoose

## API Integrations

The React frontend communicates with the Express REST API for authentication and application data. The backend also connects to these external services:

| Service | Use |
| --- | --- |
| Google Sign-In | Authenticates users with Google; the backend validates the returned ID token and matches it to an active account. |
| Google Drive API | Connects each user to their Drive for browsing, uploading, downloading, and managing files. |
| Google Calendar API | Syncs staff shift events with authorized users' calendars. |
| Google Sheets API | Exports report data to a spreadsheet. |
| Firebase Cloud Messaging | Sends browser push notifications to registered users. |
| Google reCAPTCHA | Adds an optional challenge to password sign-in. |
| Brevo Transactional Email API | Sends password reset and integration credential verification codes. |

Drive, Calendar, and Sheets use per-user Google OAuth connections. Integration availability and credentials are managed in application settings or the backend deployment environment. See [server/README.md](server/README.md) for provider configuration details.

## Getting Started

### Prerequisites

- Node.js (LTS recommended) and npm
- A MongoDB database for the backend
- The integration credentials required for the features you want to run

### Install dependencies

Run these commands from the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

### Configure environment

Create local environment files for the client and server. For local development, the client needs the backend URL, for example:

```env
VITE_API_URL=http://localhost:5000
```

The server needs a MongoDB connection and any credentials for enabled integrations. Follow the setup guides for the complete configuration:

- [Client setup](client/README.md)
- [Server setup and integrations](server/README.md)

Keep private credentials in environment files or deployment settings. Never commit secrets to the repository.

### Run locally

From the repository root, start both the frontend and backend:

```bash
npm run dev
```

The Vite frontend runs at `http://localhost:5173` by default, and the Express API runs at `http://localhost:5000`.

### Build and lint the frontend

```bash
npm run build --prefix client
npm run lint --prefix client
```

## Deployment

The frontend is a Vite single-page application and can be deployed to Vercel with `client` as the project root. Set `VITE_API_URL` to the public URL of the separately hosted backend. The backend must allow requests from the frontend origin and provide its required environment variables.

Set the backend's `CLIENT_URL` to the deployed frontend origin so Google OAuth flows return to the correct site. Provider callback URLs must also match the backend's configured redirect URLs. See the [server setup guide](server/README.md) for details.

## Project Structure

```text
Cremoso-Core/
├── client/                 # React and Vite frontend
│   ├── public/             # Static assets and browser service worker
│   ├── src/pages/          # Application pages
│   ├── src/components/     # Shared interface components
│   ├── src/utils/api.js    # Frontend API client
│   └── vercel.json         # SPA route rewrites for Vercel
├── server/                 # Express and MongoDB backend
│   ├── controllers/        # Request handling
│   ├── models/             # Mongoose data models
│   ├── routes/             # REST API routes
│   └── utils/              # Shared server integrations and helpers
├── ABOUT.md                # Project overview
└── requirements.md         # Functional requirements
```

## Project Context

Cremoso-Core was developed collaboratively for an actual client as part of coursework in Systems Integration & Architecture 1, Advanced Database Systems, Integrative Programming Technologies 1, and Information Assurance & Security 1.

## License

This project was developed in collaboration with an actual client. All rights reserved. It is not licensed for public use or redistribution.
