# API Documentation and Postman Guide

This guide explains how to build a Postman collection for the Cremoso-Core API, exercise the endpoints safely, and record the behavior as useful API documentation.

Postman helps organize and run requests. The collection is not a substitute for a written endpoint reference: document each endpoint's purpose, access requirements, inputs, outputs, and errors so another developer can use it without reverse-engineering the request.

## 1. Start the API

Run the backend from the `server` directory:

```bash
npm install
npm run dev
```

The API listens at `http://localhost:5000` by default. The client runs at `http://localhost:5173`. The backend needs its normal local configuration, including MongoDB and JWT settings. Password login can also require a valid reCAPTCHA token, depending on the configured auth settings.

## 2. Create a Postman environment

Create an environment named `Cremoso Local` with these variables:

| Variable | Initial value | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:5000` | Backend origin |
| `token` | *(blank)* | Bearer token returned by login |

Select this environment when working on local requests. Use a separate environment for any staging server; keep passwords, tokens, and hosted service credentials out of exported collections.

## 3. Create and organize the collection

Create a collection named `Cremoso API`. Set its authorization to **Bearer Token** with the value `{{token}}`. Requests that do not need a signed-in user can override authorization and select **No Auth**.

Add folders by API area. Use the route files as the endpoint checklist:

| Folder | API prefix | Route source |
| --- | --- | --- |
| Authentication | `/api/auth` | `server/routes/auth.js` |
| Auth settings | `/api/auth-settings` | `server/routes/authConfig.js` |
| Integration credentials | `/api/integration-credentials` | `server/routes/integrationCredentials.js` |
| Branches | `/api/branches` | `server/routes/branches.js` |
| Users | `/api/users` | `server/routes/users.js` |
| Staff | `/api/staff` | `server/routes/staff.js` |
| Menu | `/api/menu` | `server/routes/menu.js` |
| Inventory | `/api/inventory` | `server/routes/inventory.js` |
| Supply inventory | `/api/supply-inventory` | `server/routes/supplyInventory.js` |
| Orders | `/api/orders` | `server/routes/orders.js` |
| Reports | `/api/reports` | `server/routes/reports.js` |
| Reconciliation | `/api/reconciliation` | `server/routes/reconciliation.js` |
| Activity logs | `/api/activity-logs` | `server/routes/activityLogs.js` |
| Edit locks | `/api/edit-locks` | `server/routes/editLocks.js` |
| Push notifications | `/api/push` | `server/routes/push.js` |
| Google Drive | `/api/drive` | `server/routes/drive.js` |
| Google Sheets | `/api/sheets` | `server/routes/sheets.js` |
| Google Calendar | `/api/calendar` | `server/routes/calendar.js` |
| Store configuration | `/api/store-config` | `server/routes/storeConfig.js` |

For dynamic path segments, define collection variables such as `{{branchId}}`, `{{menuItemId}}`, `{{orderId}}`, and `{{userId}}`. Save only IDs from local test data in the local environment.

## 4. Sign in and save the token

Create a request:

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json
```

The login body accepts an `identifier` (or `email`), `password`, and, when enabled, `recaptchaToken`. A successful response includes a `token` and user information. In the request's **Scripts → Post-response** tab, save the token automatically:

```javascript
const body = pm.response.json();

if (body.token) {
  pm.environment.set("token", body.token);
}
```

Protected requests inherit the collection's bearer token. Test with separate accounts for each role that matters: Admin, Branch Manager (`branch`), and Staff. A valid token does not grant every role access; record both authentication and role requirements.

## 5. Document each endpoint

For each route in `server/routes/`, record:

1. **Method and path**, including any path parameters.
2. **Purpose** and the action or data it handles.
3. **Authentication and role requirements** from route middleware.
4. **Path parameters, query parameters, headers, and body fields**, including required fields and validation limits.
5. **Success status and response shape**, based on the controller's actual response.
6. **Expected errors**, including validation, unauthenticated, forbidden, conflict, and not-found responses.
7. **Side effects**, such as stock changes, email delivery, OAuth, file upload, push notifications, or deletion.
8. A representative request and response with secrets and personal data removed.

Example entry format:

```markdown
### `GET /api/menu`

- Purpose: List menu items for the signed-in user's branch.
- Access: Bearer token; authenticated account.
- Query: Admins select a branch with `branchId`.
- Success: `200 OK`; JSON array of menu items.
- Errors: `400` when the branch is missing or invalid; `401` when signed out.
- Side effects: None.
```

Treat the route middleware and controller as the source of truth. Use the model for field types and constraints. Do not infer a request field from a response or invent behavior that the code does not implement.

## 6. Test endpoints in safe workflows

Start with read-only requests, then perform writes using disposable local data. After each create or update, make a read request to confirm the persisted result.

Suggested workflow order:

1. Sign in and check the profile and public/auth settings.
2. Read branches, menu, and inventory using the role-appropriate account.
3. Exercise create/update flows with local test records, then verify with GET requests.
4. Exercise order placement, payment confirmation, reporting, and reconciliation using test data.
5. Test invalid input and access boundaries: missing token, wrong role, invalid ID, missing required fields, and a branch ID outside the signed-in account's branch.
6. Test integrations only after their local credentials and provider callbacks are configured.
7. Test delete, archive, void, refund, disconnect, and other consequential actions last, using disposable records and recording the expected side effects.

The API uses edit locks for some writes. Follow the UI flow or the edit-lock endpoints to acquire a lock before calling a write route that requires one. Rate-limited requests can return `429 Too Many Requests`; the API exposes retry information in response headers and body.

## 7. Keep collection examples safe and useful

- Use local or staging data, not production records, for write and delete requests.
- Add example responses with realistic structure but fake names, emails, tokens, and IDs.
- Do not save a real bearer token, password, reCAPTCHA token, OAuth code, or integration secret in a shared collection.
- Record the expected status code and a short assertion for important behavior.
- Keep requests for external services clearly labeled with their setup requirements.
- Recheck examples when the corresponding route or controller changes.

## 8. Export and share

In Postman, open the collection menu, choose **Export**, and export the collection as JSON. Share it with the written endpoint reference. Before sharing, remove local credentials and personal data, and check that requests use variables such as `{{baseUrl}}` and `{{token}}` instead of hard-coded secrets.

## Endpoint source map

The API is mounted in `server/server.js`. Each router imports middleware and controllers that define access checks and behavior. For a complete route list, inspect every `router.get`, `router.post`, `router.put`, `router.patch`, and `router.delete` call in the route files listed above. Read the matching controller before publishing request or response details.
