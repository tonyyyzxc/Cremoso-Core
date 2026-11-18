<div align="center">
  <img src="client/public/cremoso-pic.jpg" alt="Cremoso-Core logo" width="220" />

  <h1>Cremoso-Core</h1>
</div>

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

Cremoso-Core is a web application for managing sales, inventory, schedules, reports, and activity across multiple branches. It is built for Team Kondisyones and provides role- and branch-scoped access for Staff, Branch Managers, Admins, and a designated Super Admin.

**Live demo:** [cremoso-core.vercel.app](https://cremoso-core.vercel.app/login)

**Developed by:** Team Kondisyones

## Requirements

- Node.js (LTS recommended) and npm
- A MongoDB database for the backend
- Credentials for any external integrations you enable

## Installation

Install the root process runner from the repository root:

```bash
npm install
```

Install the frontend and backend dependencies using their setup guides: [client](client/README.md) and [server](server/README.md).

## Configuration

Create local environment files for the client and server. The client uses `VITE_API_URL` to reach the backend; it defaults to `http://localhost:5000` for local development.

The backend requires `MONGODB_URL` and `JWT_SECRET`. Add provider credentials only for the integrations you use. Keep secrets in local environment files or deployment settings, and never commit them. See the [client configuration guide](client/README.md#setup) and [server configuration guide](server/README.md#configure) for details.

## Quick start

After installing both apps and configuring the environment, run this from the repository root:

```bash
npm run dev
```

The root script starts the Vite client and Express server together. By default, the client runs at `http://localhost:5173` and the API at `http://localhost:5000`.

## What it does

- **Staff:** Create orders, manage the order queue, review transactions and schedules, and view personal activity history.
- **Branch Managers:** Manage branch sales, submit daily cash reconciliation, review inventory and supply stock, manage schedules and staff records, and update branch information.
- **Admins:** Review company-wide reports and orders; manage branches, catalog, inventory, schedules, accounts, and integrations.
- **Super Admin:** Use Admin features plus protected account administration and integration credential management.

The Express REST API connects the frontend to MongoDB and external services:

| Service                       | Use                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Google Sign-In                | Authenticates users; the server validates the ID token and matches it to an active account. |
| Google Drive API              | Lets users connect their Drive to browse, upload, download, and manage files.               |
| Google Calendar API           | Syncs staff shift events with authorized users' calendars.                                  |
| Google Sheets API             | Exports report data to a spreadsheet.                                                       |
| Firebase Cloud Messaging      | Sends browser push notifications to registered users.                                       |
| Google reCAPTCHA              | Adds an optional challenge to password sign-in.                                             |
| Brevo Transactional Email API | Sends password reset and integration credential verification codes.                         |

Drive, Calendar, and Sheets use separate per-user Google OAuth connections. Integration credentials and availability are managed through application settings or backend environment variables.

## Documentation

- [Client setup and commands](client/README.md)
- [Server setup and integrations](server/README.md)
- [Functional requirements](FUNCTIONAL-REQUIREMENTS.md)

## Deployment

The Vite frontend can be deployed to Vercel with `client` as the project root. Set `VITE_API_URL` to the deployed backend URL. Set the backend's `CLIENT_URL` to the frontend origin so OAuth flows return to the deployed app. Provider callback URLs must match the redirect URLs configured for the backend.

## Project structure

```text
Cremoso-Core/
├── client/                 # React and Vite frontend
│   ├── public/             # Static assets and service worker
│   ├── src/pages/          # Application pages
│   ├── src/components/     # Shared interface components
│   ├── src/utils/api.js    # Frontend API client
│   ├── App.jsx             # Application routes
│   └── vercel.json         # Vercel SPA rewrites
├── server/                 # Express and MongoDB backend
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose models
│   ├── routes/             # REST API routes
│   └── utils/              # Shared server integrations and helpers
└── FUNCTIONAL-REQUIREMENTS.md
```

## Project context

Team Kondisyones developed Cremoso-Core collaboratively for an actual client as part of coursework in Systems Integration & Architecture 1, Advanced Database Systems, Integrative Programming Technologies 1, and Information Assurance & Security 1.
