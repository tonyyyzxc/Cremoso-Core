# Cremoso-Core

## Overview

Cremoso-Core centralizes and streamlines operations across multiple company branches by integrating four core modules into a single platform.

## Objectives

### Specific

Develop and deploy a web-based multi-branch management platform tailored for Team Kondisyones, integrating four core modules:

- **Inventory Centralization** – real-time stock tracking across all branches
- **Operations Management** – daily workflows, task allocation, and performance monitoring
- **Point of Sales (POS)** – fast transaction processing with automatic server sync
- **System Audit Logs** – time-stamped action tracking

### Measurable

- Eliminate manual end-of-day sales reconciliations and manual stock logging across 100% of participating company branches.
- Maintain a complete, time-stamped audit record for 100% of sales transactions, inventory adjustments, and pricing modifications to safeguard data integrity and accountability.

## Tech Stack

- **MongoDB** – Database
- **Express.js** – Backend framework
- **React (Vite)** – Frontend
- **Node.js** – Runtime environment

## Project Structure

```
Cremoso-Core/
├── Client/          # React + Vite + Tailwind frontend
├── server/          # Express + Node backend
├── .gitignore
├── package.json     # root-level, runs both apps together via concurrently
└── README.md
```

## Getting Started

### Prerequisites

- Git installed
- Node.js and npm installed
- Access to a MongoDB instance (local or MongoDB Atlas)

### Clone the integration branch and install dependencies

```bash
# Clone only the integration branch and enter the project folder
git clone --branch integration --single-branch https://github.com/tonyyyzxc/Cremoso-Core.git
cd Cremoso-Core

# Install root dependencies (includes concurrently, used to run both apps)
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

Run `npm install` once in each of the three folders after cloning. Each command reads that folder's `package.json` and installs its required modules. The root package installs `concurrently`; the server package installs the Express, MongoDB/Mongoose, authentication, Google, Firebase, and upload dependencies; the client package installs React, Vite, Tailwind, and the UI and integration dependencies. Developers do not need to install those modules one by one. Repeat the install commands when dependencies change.

### Environment setup

Create the required `.env` files locally; they are not part of the clone. Ask a project maintainer for the needed values rather than committing secrets. Server settings go in `server/.env`. Client settings, if required, go in `client/.env` and must use the `VITE_` prefix.

Make sure the server's MongoDB connection setting points to your local or Atlas database before starting the app.

### Running the Project

From the project root, start both the frontend and backend:

```bash
npm run dev
```

Or run them separately in two terminals:

```bash
# Terminal 1 - backend
cd server
npm run dev

# Terminal 2 - frontend
cd client
npm run dev
```

## Core Modules

1. **Inventory Centralization** – Real-time stock tracking synced across all branches.
2. **Operations Management** – Manages daily workflows, task allocation, and performance monitoring.
3. **Point of Sales (POS)** – Processes transactions quickly with automatic sync to the server.
4. **System Audit Logs** – Records time-stamped actions for accountability and traceability.

## Academic Context

This project is a collaborative web development project developed for an actual client, integrating the following subjects:

- Systems Integration & Architecture 1
- Advanced Database Systems
- Integrative Programming Technologies 1
- Information Assurance & Security 1

## License

This project was developed as part of an academic web development project in collaboration with an actual client. All rights reserved. Not licensed for public use or redistribution.
