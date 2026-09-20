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

- Node.js installed
- MongoDB instance (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/tonyyyzxc/Cremoso-Core.git
cd Cremoso-Core

# Install root dependencies (concurrently)
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../Client
npm install
```

### Environment Variables

Create a `.env` file inside `server` (and `Client` if needed). Ask a teammate for the required values. Frontend variables must be prefixed with `VITE_`.

### Running the Project

Run both frontend and backend together from the project root:

```bash
npm run dev
```

Or run them separately in two terminals:

```bash
# Terminal 1 - backend
cd server
npm run dev

# Terminal 2 - frontend
cd Client
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
