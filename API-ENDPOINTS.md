# Cremoso-Core API Endpoints

Complete endpoint reference derived from the route files in `server/routes/`, mounted in `server/server.js`.

- **Total endpoints:** 99
- **Local base URL:** `http://localhost:5000`
- **Auth header:** `Authorization: Bearer <token>`
- **Roles:** `admin`, `branch` (Branch Manager), `staff`, plus a Super Admin account check
- **Roles are inclusive:** "Branch" means the `branch` role only; "Admin, Branch" means either role.

## Conventions

| Term | Meaning |
| --- | --- |
| Public | No Bearer token required |
| Signed-in | Any authenticated, active account |
| Edit lock | The route calls `requireEditLock`; acquire the lock first or the API returns `423` |
| Branch required | The account must have a `branchId`, otherwise the API returns `400` |
| Rate-limited | Route uses one or more limiters from `server/middleware/rateLimiters.js`; may return `429` |

Edit locks are acquired with `POST http://localhost:5000/api/edit-locks/acquire`. Resource types: `AuthConfig`, `Branch`, `IntegrationCredential`, `Inventory`, `MenuItem`, `Order`, `PushRegistration`, `ShiftSchedule`, `StoreConfig`, `Supply`, `SupplyInventory`, `User`, `Worker`.

## Authentication

Source: `server/routes/auth.js`

Public — password login may require reCAPTCHA; all are rate-limited:

- `POST http://localhost:5000/api/auth/login`
- `POST http://localhost:5000/api/auth/google`
- `POST http://localhost:5000/api/auth/forgot-password`
- `POST http://localhost:5000/api/auth/verify-reset-code`
- `POST http://localhost:5000/api/auth/reset-password`

Signed-in with edit lock (`User`):

- `PUT http://localhost:5000/api/auth/password`
- `PATCH http://localhost:5000/api/auth/profile`

Signed-in:

- `GET http://localhost:5000/api/auth/password-status`
- `GET http://localhost:5000/api/auth/profile`
- `POST http://localhost:5000/api/auth/logout`

## Auth Settings

Source: `server/routes/authConfig.js`

Public:

- `GET http://localhost:5000/api/auth-settings/public`

Signed-in:

- `GET http://localhost:5000/api/auth-settings`

Admin with edit lock (`AuthConfig`):

- `PATCH http://localhost:5000/api/auth-settings`

Signed-in with edit lock (`User`):

- `PATCH http://localhost:5000/api/auth-settings/sidebar`

## Users

Source: `server/routes/users.js`

Branch:

- `GET http://localhost:5000/api/users/staff`
- `POST http://localhost:5000/api/users/staff`

Admin:

- `POST http://localhost:5000/api/users`
- `GET http://localhost:5000/api/users`

Admin with edit lock (`User`):

- `PATCH http://localhost:5000/api/users/:id/contact`
- `PATCH http://localhost:5000/api/users/:id/branch`
- `PATCH http://localhost:5000/api/users/:id/role`
- `PATCH http://localhost:5000/api/users/:id/status`
- `DELETE http://localhost:5000/api/users/:id` — also checks the `Branch` edit lock

## Staff

Source: `server/routes/staff.js`. All routes require the `branch` role.

- `GET http://localhost:5000/api/staff/branch`
- `GET http://localhost:5000/api/staff/workers`
- `POST http://localhost:5000/api/staff/workers`

Branch with edit lock:

- `PATCH http://localhost:5000/api/staff/branch` — `Branch`
- `PATCH http://localhost:5000/api/staff/profile` — `User`
- `DELETE http://localhost:5000/api/staff/workers/:id` — `Worker`

## Branches

Source: `server/routes/branches.js`. All routes require `admin`.

- `GET http://localhost:5000/api/branches`
- `GET http://localhost:5000/api/branches/workers`
- `POST http://localhost:5000/api/branches/account`
- `POST http://localhost:5000/api/branches`
- `PATCH http://localhost:5000/api/branches/:id` — edit lock (`Branch`)

## Menu

Source: `server/routes/menu.js`

Signed-in:

- `GET http://localhost:5000/api/menu`

Admin:

- `POST http://localhost:5000/api/menu`

Admin with edit lock (`MenuItem`):

- `PATCH http://localhost:5000/api/menu/:id`
- `DELETE http://localhost:5000/api/menu/:id`

## Inventory

Source: `server/routes/inventory.js`

Admin or Branch:

- `GET http://localhost:5000/api/inventory` — client sends `?branchId=`

Admin with edit lock (`Inventory`):

- `PUT http://localhost:5000/api/inventory/:menuItemId` — lock skipped when body sends `__v: -1`

## Supply Inventory

Source: `server/routes/supplyInventory.js`

Admin or Branch:

- `GET http://localhost:5000/api/supply-inventory` — client sends `?branchId=`

Admin:

- `POST http://localhost:5000/api/supply-inventory`

Admin with edit lock:

- `PATCH http://localhost:5000/api/supply-inventory/:supplyId` — `Supply`
- `DELETE http://localhost:5000/api/supply-inventory/:supplyId` — `Supply`
- `PUT http://localhost:5000/api/supply-inventory/:supplyId/stock` — `SupplyInventory`; lock skipped when body sends `__v: -1`

## Orders

Source: `server/routes/orders.js`

Admin:

- `GET http://localhost:5000/api/orders`
- `GET http://localhost:5000/api/orders/:id`

Admin with edit lock (`Order`):

- `POST http://localhost:5000/api/orders/:id/void`
- `POST http://localhost:5000/api/orders/:id/refund`
- `POST http://localhost:5000/api/orders/:id/archive`
- `DELETE http://localhost:5000/api/orders/:id` — archived orders only

Branch or Staff:

- `POST http://localhost:5000/api/orders`
- `GET http://localhost:5000/api/orders/transactions` — branch required; client sends `?date=`
- `GET http://localhost:5000/api/orders/queue` — branch required

Branch or Staff with edit lock (`Order`):

- `POST http://localhost:5000/api/orders/queue/:id/confirm-payment` — branch required

Branch with edit lock (`Order`):

- `POST http://localhost:5000/api/orders/queue/:id/void` — branch required

## Reports

Source: `server/routes/reports.js`

Branch or Admin:

- `GET http://localhost:5000/api/reports`

Branch:

- `POST http://localhost:5000/api/reports/sales`

## Reconciliation

Source: `server/routes/reconciliation.js`. Both routes require `branch` and an assigned branch.

- `GET http://localhost:5000/api/reconciliation`
- `POST http://localhost:5000/api/reconciliation`

## Calendar

Source: `server/routes/calendar.js`

Public OAuth callback:

- `GET http://localhost:5000/api/calendar/callback`

Signed-in:

- `GET http://localhost:5000/api/calendar/status`
- `GET http://localhost:5000/api/calendar/connect`

Branch or Admin:

- `GET http://localhost:5000/api/calendar/staff` — client sends `?branchId=`
- `POST http://localhost:5000/api/calendar/shifts`

Staff, Branch, or Admin:

- `GET http://localhost:5000/api/calendar/shifts`

Branch or Admin with edit lock (`ShiftSchedule`):

- `PATCH http://localhost:5000/api/calendar/shifts/:id`
- `POST http://localhost:5000/api/calendar/shifts/:id/cancel`
- `POST http://localhost:5000/api/calendar/shifts/:id/sync` — rate-limited

## Activity Logs

Source: `server/routes/activityLogs.js`

Admin, Branch, or Staff:

- `GET http://localhost:5000/api/activity-logs`

## Edit Locks

Source: `server/routes/editLocks.js`. All routes are signed-in.

- `GET http://localhost:5000/api/edit-locks/status`
- `POST http://localhost:5000/api/edit-locks/acquire`
- `POST http://localhost:5000/api/edit-locks/renew`
- `POST http://localhost:5000/api/edit-locks/release`

## Push Notifications

Source: `server/routes/push.js`. All routes are signed-in.

- `GET http://localhost:5000/api/push/registration`
- `POST http://localhost:5000/api/push/registration`
- `DELETE http://localhost:5000/api/push/registration` — edit lock (`PushRegistration`); uses `browserId` from the body
- `POST http://localhost:5000/api/push/test` — rate-limited

## Google Sheets

Source: `server/routes/sheets.js`

Public OAuth callback:

- `GET http://localhost:5000/api/sheets/callback`

Signed-in:

- `GET http://localhost:5000/api/sheets/status`
- `GET http://localhost:5000/api/sheets/connect`
- `POST http://localhost:5000/api/sheets/export` — rate-limited
- `POST http://localhost:5000/api/sheets/disconnect` — rate-limited

## Google Drive

Source: `server/routes/drive.js`

Public OAuth callback:

- `GET http://localhost:5000/api/drive/callback`

Signed-in:

- `GET http://localhost:5000/api/drive/status`
- `GET http://localhost:5000/api/drive/connect`
- `GET http://localhost:5000/api/drive/files` — rate-limited
- `POST http://localhost:5000/api/drive/upload` — multipart; rate-limited
- `POST http://localhost:5000/api/drive/folder` — rate-limited
- `GET http://localhost:5000/api/drive/download/:id` — rate-limited
- `DELETE http://localhost:5000/api/drive/files/:id` — rate-limited
- `POST http://localhost:5000/api/drive/disconnect` — rate-limited

## Integration Credentials

Source: `server/routes/integrationCredentials.js`. All routes require the Super Admin account.

- `GET http://localhost:5000/api/integration-credentials`
- `POST http://localhost:5000/api/integration-credentials/challenge` — rate-limited
- `POST http://localhost:5000/api/integration-credentials/challenge/verify` — rate-limited
- `POST http://localhost:5000/api/integration-credentials/:integration/validate` — edit lock (`IntegrationCredential`); rate-limited
- `DELETE http://localhost:5000/api/integration-credentials/:integration` — edit lock (`IntegrationCredential`)

## Store Configuration

Source: `server/routes/storeConfig.js`

Signed-in:

- `GET http://localhost:5000/api/store-config`

Admin with edit lock (`StoreConfig`):

- `PATCH http://localhost:5000/api/store-config`

## Page-to-Endpoint Map

Based on the calls made from `client/src/pages/`. A page can use endpoints from several groups.

| Page | Main endpoint groups |
| --- | --- |
| `Login` | `/api/auth/*`, `/api/auth-settings/public` |
| `Dashboard` | `/api/reports`, `/api/orders/transactions`, `/api/staff/branch` |
| `NewOrder` | `/api/menu`, `/api/store-config`, `/api/inventory`, `/api/staff/branch`, `POST /api/orders` |
| `Menu` | `/api/menu`, `/api/inventory`, `/api/supply-inventory`, `/api/store-config`, `/api/branches`, `/api/staff/branch` |
| `Orders` | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/void`, `/api/orders/:id/refund`, `/api/orders/:id/archive`, `DELETE /api/orders/:id` |
| `OrderQueue` | `/api/orders/queue`, `/api/orders/queue/:id/confirm-payment`, `/api/orders/queue/:id/void`, `/api/store-config` |
| `Transactions` | `/api/orders/transactions` |
| `Reports` | `/api/reports`, `/api/reports/sales`, `/api/menu`, `/api/inventory`, `/api/store-config`, `/api/auth-settings`, `/api/sheets/*` |
| `Schedule` | `/api/calendar/*`, `/api/branches`, `/api/staff/branch` |
| `Staff` | `/api/staff/branch`, `/api/staff/workers`, `/api/users/staff` |
| `Management` | `/api/users`, `/api/users/:id/*`, `/api/branches`, `/api/branches/workers` |
| `Settings` | `/api/auth/profile`, `/api/auth/password`, `/api/auth/password-status`, `/api/auth-settings`, `/api/staff/branch`, `/api/staff/profile`, `/api/integration-credentials/*`, `/api/edit-locks/release` |
| `ActivityLogs` | `/api/activity-logs`, `/api/branches`, `/api/users` |
| `Reconciliation` | `/api/reconciliation` |
| `Drive` | `/api/drive/*` |

## Source Map

| API prefix | Route file | Mount location |
| --- | --- | --- |
| `/api/sheets` | `server/routes/sheets.js` | `server/server.js:53` |
| `/api/drive` | `server/routes/drive.js` | `server/server.js:54` |
| `/api/calendar` | `server/routes/calendar.js` | `server/server.js:55` |
| `/api/auth` | `server/routes/auth.js` | `server/server.js:56` |
| `/api/auth-settings` | `server/routes/authConfig.js` | `server/server.js:57` |
| `/api/integration-credentials` | `server/routes/integrationCredentials.js` | `server/server.js:58` |
| `/api/push` | `server/routes/push.js` | `server/server.js:59` |
| `/api/activity-logs` | `server/routes/activityLogs.js` | `server/server.js:60` |
| `/api/edit-locks` | `server/routes/editLocks.js` | `server/server.js:61` |
| `/api/branches` | `server/routes/branches.js` | `server/server.js:62` |
| `/api/inventory` | `server/routes/inventory.js` | `server/server.js:63` |
| `/api/menu` | `server/routes/menu.js` | `server/server.js:64` |
| `/api/orders` | `server/routes/orders.js` | `server/server.js:65` |
| `/api/reports` | `server/routes/reports.js` | `server/server.js:66` |
| `/api/reconciliation` | `server/routes/reconciliation.js` | `server/server.js:67` |
| `/api/staff` | `server/routes/staff.js` | `server/server.js:68` |
| `/api/store-config` | `server/routes/storeConfig.js` | `server/server.js:69` |
| `/api/supply-inventory` | `server/routes/supplyInventory.js` | `server/server.js:70` |
| `/api/users` | `server/routes/users.js` | `server/server.js:71` |
