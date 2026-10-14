# Cremoso Core

Cremoso Core is a full-stack web application. The frontend is a React app served by Vite, and the backend is an Express API that stores user data in MongoDB through Mongoose.

This guide covers cloning the repository, installing dependencies, configuring local services and credentials, starting the app, and resolving common setup problems.

## Repository layout

```text
Cremoso-Core/
|-- client/                 # React frontend (Vite, Tailwind CSS)
|   |-- src/                 # Pages, components, styles, and app entry point
|   |-- public/              # Static assets
|   |-- package.json         # Frontend dependencies and scripts
|   `-- .env                 # Local frontend settings (create this yourself)
|-- server/                 # Express API
|   |-- models/              # Mongoose models
|   |-- routes/              # API routes
|   |-- utils/               # JWT and password helpers
|   |-- server.js            # Backend entry point
|   |-- package.json         # Backend dependencies and scripts
|   `-- .env                 # Local backend settings (create this yourself)
|-- package.json             # Root script and concurrently dependency
`-- README.md
```

The `client` and `server` directories are separate npm packages, each with its own `package.json` and lockfile. The root package coordinates the two development servers.

## Prerequisites

Install these before setting up the project:

- **Git**, to clone and update the repository.
- **Node.js and npm.** Use a current Node.js LTS release and the npm version that ships with it. Vite may require a recent Node.js release; if Vite reports an unsupported engine, upgrade Node.js and reopen your terminal.
- **MongoDB**, either running locally or available through MongoDB Atlas. You need a connection URI and network access from your machine.
- **Google OAuth client ID** if you want to use Google sign-in locally. It is configured in Google Cloud Console as a Web application OAuth client.

Check that Git, Node.js, and npm are available:

```bash
git --version
node --version
npm --version
```

## 1. Clone the repository

In a terminal, go to the parent directory where you keep your projects, then clone the repository and enter its directory:

```bash
git clone https://github.com/tonyyyzxc/Cremoso-Core.git
cd Cremoso-Core
```

If you already cloned it, enter the repository directory and optionally pull the latest changes:

```bash
cd Cremoso-Core
git pull
```

Commands below assume the terminal is at the repository root. Folder names are lowercase: `client` and `server`.

## 2. Install dependencies

Install each package's dependencies from the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
```

This installs the root development tool (`concurrently`), frontend packages (React, Vite, Tailwind CSS, and related tools), and backend packages (Express, Mongoose, authentication libraries, and nodemon). The lockfiles pin the dependency versions for repeatable installs.

If you prefer to install from inside each folder, use `npm install` in the root, then repeat it in `client` and `server`. Do not install only at the root: the client and server are separate npm packages.

## 3. Configure the backend

Create a file named `.env` inside `server/` (next to `server.js`). Do not commit this file. Add the following values and replace the example values with your own:

```dotenv
MONGODB_URL=mongodb://127.0.0.1:27017/cremoso-core
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### MongoDB connection

- For a local MongoDB server, make sure the MongoDB service is running and use its connection URI. The example above uses the default local port and a database named `cremoso-core`.
- For MongoDB Atlas, use the connection URI supplied by Atlas as the value of `MONGODB_URL`. Replace any username, password, and database placeholders; make sure your IP address is allowed in the Atlas network access settings.
- Keep the variable name exactly `MONGODB_URL`. The backend reads this name when it connects.

### JWT secret

`JWT_SECRET` is used to sign the application's session tokens. Set it to a long, unpredictable value and keep it private. Do not reuse a real production secret for local development or commit the value to Git.

### Google sign-in

The server verifies Google credentials against `GOOGLE_CLIENT_ID`. Use the same OAuth client ID in the frontend settings below. In Google Cloud Console, configure the OAuth client as a Web application and add `http://localhost:5173` as an authorized JavaScript origin for local development. Google sign-in also requires the email to belong to a user already present in the application's MongoDB database; it does not create a new account by itself.

The server currently listens on port `5000` in `server/server.js`. Its port is hard-coded there; setting a `PORT` entry in `.env` does not change it.

## 4. Configure the frontend

Create `client/.env` (next to `client/package.json`) with:

```dotenv
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Use the same Google OAuth client ID as in `server/.env`. The frontend uses `VITE_API_URL` to contact the API and `VITE_GOOGLE_CLIENT_ID` to initialize Google sign-in. Vite only makes variables prefixed with `VITE_` available to frontend code, so never put private keys or `JWT_SECRET` in this file. Restart the Vite server after changing frontend environment variables.

If `VITE_API_URL` is omitted, the frontend defaults to `http://localhost:5000`. If the Google client ID is omitted, Google sign-in will not be configured correctly.

## 5. Start the app

From the repository root, run:

```bash
npm run dev
```

The root script starts the frontend and backend together using `concurrently`. Keep this terminal open while you use the app. The frontend is normally available at [http://localhost:5173](http://localhost:5173), and the API listens on port `5000` at [http://localhost:5000](http://localhost:5000). Vite prints the actual frontend URL if it needs to choose a different port.

The backend connects to MongoDB when it starts. Confirm MongoDB is reachable and the URI is correct if the server reports a connection error. You can check the backend's basic response by opening `http://localhost:5000/`; it should say `Server is running`.

### Run frontend and backend in separate terminals

This can make it easier to read each process's logs. Open two terminals at the repository root and run:

```bash
npm run dev --prefix client
```

```bash
npm run dev --prefix server
```

You can also run either command from inside the corresponding folder with `npm run dev`.

## 6. Sign-in and local data

Google sign-in sends a verified Google credential to `POST /api/auth/google`. The backend looks up an existing user by email, so your MongoDB database must already contain a user with the Google account's email address. If it does not, the API responds that no account was found. Arrange access to an appropriate development database or have an authorized project administrator provision a development user.

The frontend also presents an email-and-password form. In the current source, that form sends a request to `POST /api/auth/login`; the backend currently defines the Google endpoint (`POST /api/auth/google`) but does not define that email-and-password endpoint. Use Google sign-in for the implemented authentication flow unless the API is extended.

## Useful commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and backend together |
| `npm run dev --prefix client` | Start only the Vite frontend |
| `npm run dev --prefix server` | Start only the Express backend with nodemon |
| `npm run build --prefix client` | Build the frontend into `client/dist/` |
| `npm run preview --prefix client` | Preview a previously built frontend locally |
| `npm run lint --prefix client` | Run the frontend ESLint checks |

The backend package does not currently provide a production `start` command. Its `dev` script runs `nodemon server.js` for local development.

## Troubleshooting

### `npm` or `node` is not recognized

Install Node.js LTS, close and reopen the terminal so PATH changes take effect, and check `node --version` and `npm --version` again.

### Vite reports an unsupported Node.js version

Install a newer Node.js LTS version supported by the installed Vite release, then reopen the terminal and reinstall dependencies if needed.

### MongoDB connection fails or the server exits

Check that MongoDB is running or that Atlas is reachable, verify the URI is assigned to `MONGODB_URL`, and check local firewall, Atlas IP access, and database credentials. The backend does not read `MONGO_URI`; use `MONGODB_URL` exactly.

### The frontend cannot reach the backend

Confirm the backend is running on port `5000`, set `VITE_API_URL=http://localhost:5000` in `client/.env`, and restart Vite after editing the file. Check the browser console and both terminal logs for the request error.

### Google sign-in fails

Check that `GOOGLE_CLIENT_ID` in `server/.env` matches `VITE_GOOGLE_CLIENT_ID` in `client/.env`, and that the OAuth client allows `http://localhost:5173`. Check that the database has a user matching the Google account's verified email. After editing either `.env`, restart the affected development server.

### Port 5000 or 5173 is already in use

Stop the other process using the port. Vite may offer another port automatically, but Google OAuth's authorized origin must match the actual frontend origin. The backend port is currently fixed at `5000` in `server/server.js`.

### A clean dependency reinstall is needed

From the repository root, remove the `node_modules` folders for the root, `client`, and `server`, then run the three install commands in the dependency installation section. Keep the package lockfiles; they are used to reproduce the dependency versions.

## Security and Git notes

- `.env` files are ignored by Git. Keep real database credentials, OAuth secrets, and JWT secrets out of commits and screenshots.
- Frontend variables with the `VITE_` prefix are bundled into browser code and are visible to users. Store public configuration such as a browser OAuth client ID there, never server secrets.
- Avoid using production credentials or production user data for local development.

## Tech stack

- **Frontend:** React, Vite, React Router, Tailwind CSS, Lucide icons, Google OAuth React library
- **Backend:** Node.js, Express, Mongoose, MongoDB, CORS, dotenv, JSON Web Tokens, Google Auth Library
- **Development tooling:** npm, concurrently, nodemon, ESLint
