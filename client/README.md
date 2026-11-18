# Client (Frontend)

React app built with Vite and Tailwind CSS.

## Prerequisites

- Node.js (LTS recommended)
- npm

## Setup

1. Navigate into the folder:

   ```bash
   cd client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in this folder and set any required frontend variables. For example:

   ```text
   VITE_API_URL=http://localhost:5000
   VITE_RECAPTCHA_SITE_KEY=<Google reCAPTCHA v2 Checkbox site key>
   ```

   Vite only exposes variables prefixed with `VITE_` to the frontend. Set
   `VITE_RECAPTCHA_SITE_KEY` to the Google reCAPTCHA v2 Checkbox site key
   registered for this app's domains. Keep the matching secret key in the
   server environment.

## Installed Packages

The packages are declared in `package.json`. Run `npm install` to install them.

### Application dependencies

- `@react-oauth/google`
- `@tailwindcss/vite`
- `firebase`
- `jspdf`
- `lucide-react`
- `motion`
- `react-google-recaptcha`
- `react`
- `react-dom`
- `react-router-dom`
- `skullet`
- `tailwindcss`

### Development dependencies

- `@eslint/js`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `vite`

## Running

Start the development server:

```bash
npm run dev
```

By default this runs at `http://localhost:5173` (Vite prints the exact port in the terminal).

## Building for Production

```bash
npm run build
```

Output goes to the `dist/` folder. Preview the production build locally with:

```bash
npm run preview
```

## Project Structure

```text
client/
├── public/         # Static assets served as-is (favicon, icons)
├── src/
│   ├── assets/     # Images, fonts, etc.
│   ├── components/ # Shared interface components
│   ├── pages/      # Page-level components
│   ├── utils/       # Shared frontend utilities, including the API client
│   └── main.jsx    # Entry point
├── App.jsx         # Root component and route definitions
├── index.html      # Vite entry HTML file
└── vercel.json     # Vercel SPA route rewrites
```
