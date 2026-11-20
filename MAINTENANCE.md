# Maintenance mode

Maintenance mode is disabled when `MAINTENANCE_MODE` is unset or set to `false`.
The frontend and backend use separate deployments, so set the variables on each
platform. Environment variable changes require a new deployment to take effect.

## Configure Vercel

1. Open the Vercel project for the frontend and go to **Settings > Environment
   Variables**.
2. Add `MAINTENANCE_MODE` with value `false` for the environments where the site
   should stay available by default.
3. Add `MAINTENANCE_BYPASS_KEY` with a long random value. Use the same value on
   Render. Keep this variable server-side; the frontend middleware reads it at
   request time.
4. Save, then redeploy the frontend so the deployment receives the variables.

To enable or disable frontend maintenance, change `MAINTENANCE_MODE` to `true`
or `false`, save, and redeploy the Vercel deployment for the environment you
want to affect. The deployment serves `client/maintenance.html` while enabled.

## Configure Render

1. Open the backend web service in the Render Dashboard and select **Environment**.
2. Add `MAINTENANCE_MODE` with value `false` for normal operation.
3. Add the same `MAINTENANCE_BYPASS_KEY` value used by Vercel.
4. Optionally set `MAINTENANCE_MESSAGE` and
   `MAINTENANCE_RETRY_AFTER_SECONDS`. Defaults are a short maintenance message
   and `300` seconds.
5. Save and deploy the service so it receives the variables.
6. Set the Render health check path to `/health`. It stays available during
   maintenance and returns HTTP 200.

To enable or disable backend maintenance, change `MAINTENANCE_MODE` to `true` or
`false`, then save and deploy the service.

## Turn maintenance on or off

Turn it on in this order:

1. Set Vercel `MAINTENANCE_MODE=true` and redeploy the frontend.
2. Set Render `MAINTENANCE_MODE=true` and deploy the backend.

Turn it off in this order:

1. Set Render `MAINTENANCE_MODE=false` and deploy the backend.
2. Set Vercel `MAINTENANCE_MODE=false` and redeploy the frontend.

Vercel and Render apply environment variable changes to new deployments; changing
the dashboard value alone does not change an already running deployment.

## Bypass for testing

Open the frontend with the matching key in the query string:

```text
https://your-site.example/?maintenance_bypass=YOUR_KEY
```

The frontend sets a one-day `maintenance_bypass` cookie and lets that browser
continue to the real site while Vercel maintenance is enabled. The shared API
client reads that cookie and sends its value in the `X-Maintenance-Bypass` header,
so the same browser can test the API while Render maintenance is enabled. Clear
the cookie to remove the frontend bypass.

For a direct API check, send the key in the header:

```text
curl -i -H "X-Maintenance-Bypass: YOUR_KEY" https://your-api.example/api/menu
```

## Local checks

Start the backend in one PowerShell terminal. Process variables override values
loaded from the local environment file, so there is no need to edit that file:

```powershell
Set-Location server
$env:MAINTENANCE_MODE = "true"
$env:MAINTENANCE_BYPASS_KEY = "local-test-key"
npm run dev
```

Start the frontend in another terminal from `client/` with Vercel CLI, which
runs the Vercel middleware locally:

```powershell
Set-Location client
$env:MAINTENANCE_MODE = "true"
$env:MAINTENANCE_BYPASS_KEY = "local-test-key"
npx vercel dev
```

Use a temporary local key only. Do not commit real bypass keys.

- **Maintenance off:** leave `MAINTENANCE_MODE` unset or set it to `false` on
  both sides. The site should load normally, and API requests should retain
  their existing responses. In the two terminals, set each variable to
  `false` and restart the servers.
- **Maintenance on:** set it to `true` on both sides. Frontend page requests
  should show the standalone maintenance page. An API request without the
  bypass header should return HTTP 503, a `Retry-After` header, CORS headers,
  and JSON with `maintenance: true` and the configured message. Check this in
  PowerShell with:

  ```powershell
  curl.exe -i -H "Origin: http://localhost:5173" http://localhost:5000/api/auth-settings/public
  curl.exe -i http://localhost:5000/health
  ```

  `GET /health` should still return HTTP 200.
- **Bypass:** request the frontend with `?maintenance_bypass=YOUR_KEY`. That
  browser should reach the real site and its API requests should include
  `X-Maintenance-Bypass`. You can also check the API directly:

  ```powershell
  curl.exe -i -H "X-Maintenance-Bypass: local-test-key" http://localhost:5000/api/auth-settings/public
  ```

  Requests without a valid key should remain in maintenance mode.
