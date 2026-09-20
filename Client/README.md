# Client (Frontend)

React app built with Vite and Tailwind CSS.

## Prerequisites

- Node.js (LTS recommended)
- npm

## Setup

1. Navigate into the folder:

   ```bash
   cd Client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in this folder (copy from `.env.example` if one exists) and set any required variables, e.g.:
   ```
   VITE_API_URL=http://localhost:5000
   ```
   > Vite only exposes variables prefixed with `VITE_` to the frontend.

## Running

Start the dev server:

```bash
npm run dev
```

By default this runs at `http://localhost:5173` (Vite will tell you the exact port in the terminal).

## Building for Production

```bash
npm run build
```

Output goes to the `dist/` folder. Preview the production build locally with:

```bash
npm run preview
```

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- React Router DOM

## Project Structure

```
Client/
├── public/         # Static assets served as-is (favicon, icons)
├── src/
│   ├── assets/      # Images, fonts, etc.
│   ├── pages/       # Page-level components (Login.jsx, etc.)
│   ├── App.jsx      # Root component / routing
│   └── main.jsx     # Entry point, mounts App into index.html
└── index.html       # Vite entry HTML file
```
