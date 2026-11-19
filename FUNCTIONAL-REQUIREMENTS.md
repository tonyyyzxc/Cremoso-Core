# Functional Requirements (Cremoso-Core)

This document describes functions currently available in the system, based on its role controls, pages, and API routes. It excludes removed or unimplemented features. Data and operations that belong to a branch are limited to that branch unless a requirement below specifies company-wide access.

## Roles

- **Staff**: a branch employee login account.
- **Branch Manager** (`branch`): manages one assigned branch and its staff and workers.
- **Admin**: manages company-wide operations and settings, excluding Super Admin account visibility and credential management.
- **Super Admin**: the designated Admin account. It has Admin access plus account administration and integration credential management. Super Admin status is controlled by the system configuration.
- **Worker**: a personnel record managed by a Branch Manager or Admin; a worker record is not a system login role.

## Shared authentication and account functions

- **FR-AUTH-01 — Password login**: users with active accounts can sign in using their email or username and password.
- **FR-AUTH-02 — reCAPTCHA login protection**: when reCAPTCHA is enabled, the login page displays Google's reCAPTCHA challenge and password login requires a response token. The server verifies that token with Google's site verification service before checking the account password. Missing, invalid, rejected, or unconfigured reCAPTCHA credentials prevent password login. When the Admin disables reCAPTCHA, password login no longer requires a reCAPTCHA token.
- **FR-AUTH-03 — Google sign-in**: users can sign in with Google when Google sign-in is enabled and their Google account is associated with an active system account. The server validates the Google ID token, verified email, and account association.
- **FR-AUTH-04 — Password recovery**: users can request a time-limited code by email, verify that code, and set a new password. Brevo password-reset email availability follows its integration setting.
- **FR-AUTH-05 — Password management**: signed-in users can view whether a password is set and update their own password after providing their current password.
- **FR-AUTH-06 — Profile management**: signed-in users can update their own profile information. The login email is read-only in the profile settings.
- **FR-AUTH-07 — Session control**: users can log out, ending and revoking the active server session.
- **FR-AUTH-08 — Account status enforcement**: disabled or otherwise inactive accounts cannot start an authenticated session.
- **FR-AUTH-09 — Interface theme**: signed-in users can switch the interface between light and dark themes.

## Staff functions

- **FR-STF-01 — Dashboard**: view the staff account's completed transaction and sales summary, with recent daily trends.
- **FR-STF-02 — Create an order**: browse and search the assigned branch's active menu, check stock availability, select variants and add-ons, and build an order with customer and sales-channel details.
- **FR-STF-03 — Price an order**: see totals calculated from the current item, variant, and add-on prices. The server saves the final transaction item and price snapshots at checkout.
- **FR-STF-04 — Order queue**: review pending orders for the assigned branch, confirm payment using an active payment method, or cancel a pending order with a reason.
- **FR-STF-05 — Transactions**: review completed orders for a selected date, including order items, channel, payment method, completion time, and total.
- **FR-STF-06 — Shift schedule**: view the shift schedule relevant to the staff member's branch.
- **FR-STF-07 — Activity history**: review the staff member's own activity records, newest first, with pagination. Date, category, and status filter controls are currently displayed, but the server does not apply those filters to Staff requests (see current coverage notes below).
- **FR-STF-08 — YourDrive**: connect or disconnect the user's Google Drive; browse folders, upload files, create folders, download files, and move files to Drive trash when the Drive integration is enabled.

## Branch Manager functions

- **FR-BR-01 — Branch dashboard**: view the assigned branch's revenue, sales and completed-order summaries and trends.
- **FR-BR-02 — Branch orders**: create orders, manage the branch order queue, confirm payments, cancel pending orders, and view completed transactions for the branch.
- **FR-BR-03 — Branch sales reports**: filter the assigned branch's sales report by date and review recorded sales, completed online orders, revenue, counts, and item performance.
- **FR-BR-04 — Record a sale**: enter a branch sale individually or at closing, choose its business date and active payment method, select items and options from the branch catalog, and save the sale. The server calculates prices, stores price snapshots, and applies configured stock deductions.
- **FR-BR-05 — Shift reconciliation**: submit one daily reconciliation for the branch by entering the opening float and counted cash. The system calculates expected cash from the opening float and eligible cash sales, then records the variance.
- **FR-BR-06 — Shift scheduling**: create, edit, cancel, and sync shifts for the assigned branch; assign active staff members. A shift's Google Calendar event is associated with its creator, and a different manager's edits may require the creator to sync.
- **FR-BR-07 — Staff login accounts**: view and create staff login accounts for the assigned branch.
- **FR-BR-08 — Worker records**: view, add, and remove worker personnel records belonging to the assigned branch.
- **FR-BR-09 — Branch information**: view and update the assigned branch's address, phone, and contact email, and update the Branch Manager's name and phone.
- **FR-BR-10 — Branch menu access**: view menu information for order taking. Menu catalog creation and editing are restricted to Admin accounts.
- **FR-BR-11 — Branch Google Drive**: use the authenticated Google Drive functions available to signed-in users, subject to the Drive integration being enabled.
- **FR-BR-12 — Activity history**: review activity associated with the assigned branch, with date, category, and status filtering and pagination. Super Admin activity and identifying details are hidden from Branch Managers.

## Admin functions

- **FR-ADM-01 — Company dashboard**: view company-wide revenue, sales and completed-order totals, branch comparisons, and revenue and sales trends.
- **FR-ADM-02 — Order history**: search and filter cross-branch order records, inspect order details and saved item-price snapshots, archive orders, and permanently delete archived orders.
- **FR-ADM-03 — Order adjustments**: void pending orders or refund completed orders with a reason; retain the action and reason in the order audit trail.
- **FR-ADM-04 — Company reports**: select a date range and review company sales, revenue, best-selling items, branch performance, online sales channels, and payment method totals.
- **FR-ADM-05 — PDF report export**: open a PDF export of the filtered report when PDF export is enabled.
- **FR-ADM-06 — Google Sheets report export**: connect or disconnect Google Sheets and export report data to a Google spreadsheet when that integration is enabled.
- **FR-ADM-07 — Branch scheduling**: view schedules across branches and create, edit, cancel, or sync shifts for branches; schedule active staff accounts.
- **FR-ADM-08 — Menu catalog management**: create, update, and delete menu items; configure variants, add-ons, prices, categories, availability, included portions, supply usage, and display order.
- **FR-ADM-09 — Inventory management**: view inventory and set menu item stock quantities.
- **FR-ADM-10 — Supply inventory management**: create, update, and delete supply records and set branch supply quantities.
- **FR-ADM-11 — Store operations settings**: enable or disable available sales channels and payment methods used by order entry and payment confirmation.
- **FR-ADM-12 — Branch management**: list branches and workers, create branch records and branch login accounts, and update branch details.
- **FR-ADM-13 — Account administration**: view and manage non-Super-Admin accounts, including creating Branch Manager and Staff accounts; update contact details, branch assignment, role, and active/disabled status; and delete accounts. Regular Admins cannot create, view, modify, disable, or delete Super Admin accounts or create and manage Admin accounts. They cannot grant the Admin role.
- **FR-ADM-15 — Integration availability**: independently enable or disable Google sign-in, reCAPTCHA, Brevo password-reset email, PDF export, Google Sheets, Google Calendar, and Google Drive. Settings apply system-wide, including to the Admin who changes them. Google sign-in cannot be disabled while an account has no password set.
- **FR-ADM-16 — Activity logging control**: enable or pause activity recording. The setting-change event is retained even when recording is being paused; other events follow the configured setting.
- **FR-ADM-17 — Activity history**: review company activity records and filter by date range, category, status, account, or branch, with newest-first pagination. The interface displays the time, account, branch, activity summary/action, category, status, and target. Super Admin activity and identifying details are hidden from regular Admins.
- **FR-ADM-18 — Personal settings and Google Drive**: update the Admin's own profile and password and use the authenticated Google Drive functions available to signed-in users, subject to the integration being enabled.

## Super Admin functions

- **FR-SADM-01 — Admin access**: use all Admin functions.
- **FR-SADM-02 — Account visibility**: view the full login account list, including the designated Super Admin account. Other roles do not receive the Super Admin account's information in account lists or activity history.
- **FR-SADM-03 — Admin account administration**: create Admin accounts and manage non-Super-Admin Admin accounts in addition to the account types available to regular Admins. Super Admin status itself cannot be reassigned or changed through ordinary account management.
- **FR-SADM-04 — Integration credential replacement**: start the credential change flow for an integration by confirming account credentials, verifying a one-time email code, and submitting candidate credentials. The system validates candidate credentials using the integration's supported validation before saving them encrypted. Failed validation leaves the currently active credentials in place.
- **FR-SADM-05 — Integration credential reset**: remove a saved credential override and return the integration to its deployment-provided credentials.

## Integration behavior

- **FR-INT-01 — Independent integration controls**: Admins can independently enable or disable Google sign-in, reCAPTCHA, Brevo password-reset email, PDF report export, Google Sheets, Google Calendar, and Google Drive. The settings are system-wide and affect the Admin who changes them as well as other users. A disabled integration blocks its related operations; unrelated integrations remain available.
- **FR-INT-02 — Google sign-in integration**: supplies Google OAuth client credentials used to render and validate Google sign-in. Google sign-in requires a verified Google identity that matches an existing active system account.
- **FR-INT-03 — reCAPTCHA integration**: supplies a site key for the login challenge and a secret key for server-side token verification. The login protection applies to password sign-in while enabled.
- **FR-INT-04 — Brevo email integration**: uses a Brevo API key and verified sender to send password reset codes. It also sends Super Admin email verification codes for credential changes and a Brevo credential test message. The password-reset email toggle disables password recovery email functionality but does not disable Super Admin verification email.
- **FR-INT-05 — PDF report export**: allows Admins to open a PDF of the currently filtered sales report. It is an application feature with a toggle and does not have an editable API credential set.
- **FR-INT-06 — Google Sheets integration**: allows an Admin to authorize their Google account, export report rows to a new spreadsheet, and disconnect/revoke the saved user connection. It is separate from the Drive and Calendar connections.
- **FR-INT-07 — Google Calendar integration**: allows an authorized Branch Manager or Admin to connect their Google account and create, update, cancel, or sync shift events. Calendar events are created on the shift creator's primary calendar and assigned staff are invited.
- **FR-INT-08 — Google Drive integration**: allows signed-in users to authorize their own Google account and browse folders, upload and download files, create folders, move files to trash, and disconnect/revoke their Drive connection.
- **FR-INT-09 — Credential change authorization**: only the designated Super Admin can start a credential change. The flow checks the Super Admin's username/email and password, emails a time-limited one-time code to the Super Admin email, and requires successful code verification before credential validation.
- **FR-INT-10 — Credential validation and storage**: proposed Google sign-in credentials are checked with a Super Admin Google ID token; reCAPTCHA credentials are checked with a real challenge response; Brevo credentials must successfully send a test email; Drive credentials must complete OAuth and a Drive account check; Calendar credentials must complete OAuth and a Calendar API check; Sheets credentials must complete OAuth and grant the required Sheets scope. Credentials are saved encrypted only after the provider-specific validation succeeds. A failed validation leaves the previous active credentials unchanged.
- **FR-INT-11 — Credential fallback and removal**: an integration uses its saved encrypted credential override when present and otherwise falls back to deployment credentials. The Super Admin can remove an override to restore that fallback. PDF export has no credential override.

## Activity logging and audit behavior

- **FR-LOG-01 — Activity record fields**: each recorded event can include the actor's account ID, name, email and role; branch; action code; category; human-readable summary; optional target type, ID and label; outcome status; timestamp; IP address; and browser user agent.
- **FR-LOG-02 — Activity categories and statuses**: supported categories are authentication, order, menu, user, inventory, branch, Drive, configuration, and security. Each event has a success or failure status.
- **FR-LOG-03 — Activity log page**: the page supports refresh, date range, category and status filters, newest-first display, and pagination. Admins additionally have branch and account filters. Each page displays up to 25 records; the API accepts a maximum page size of 100. Audited record changes display changed field names, never field values.
- **FR-LOG-04 — Activity scope**: Staff requests are restricted to the actor's own records; Branch Manager requests are restricted to their branch; Admin requests can cover the company. Super Admin actor records are hidden from every non-Super-Admin role.
- **FR-LOG-05 — Activity logging control**: Admins can pause or resume recording. The setting-change event is force-recorded even when recording is being paused. Other activity recording follows the configured setting.
- **FR-LOG-06 — Sensitive data handling**: sensitive values with names such as password, token, secret, reset code, reCAPTCHA, or authorization are redacted from recorded details. Activity records are append-only and cannot be edited or deleted through the model's normal database operations.
- **FR-LOG-07 — Change details**: successful record changes include the names of changed fields in the activity record. Changed field values are not recorded.
- **FR-LOG-08 — Event coverage**: activity events are recorded for authentication and password actions, user and branch administration, menu and supply catalog changes, inventory adjustments, orders and sales, shift schedules and reconciliations, store and authentication settings, and integration credential updates. External Google Drive objects are outside the MongoDB record audit scope.

## Edit locks

- **FR-LOCK-01 — Exclusive editing**: only one signed-in user at a time may hold the edit lock for a given editable MongoDB record. The server verifies lock ownership on mutations; client-side disabling alone is not sufficient.
- **FR-LOCK-02 — Lease behavior**: locks use a five-minute idle lease, renewed while the editor is active. Saving or cancelling releases the lock. Expired locks become available automatically.
- **FR-LOCK-03 — Lock privacy and recovery**: other users receive a generic locked-record notice without the editor's identity. Clients recheck blocked records and re-enable editing when the lock clears.
- **FR-LOCK-04 — Concurrency boundaries**: edit locks coordinate access to records; existing optimistic version checks for Inventory and SupplyInventory remain in place as a separate safeguard. External Google Drive objects are not locked as MongoDB records.

## System-wide functional requirements

- **FR-SYS-01 — Branch data scope**: branch-level sales, orders, menu, inventory, staff, workers, schedules, and reconciliations are associated with a branch. Staff and Branch Managers are limited to their assigned branch; Staff activity history is limited to their own records.
- **FR-SYS-02 — Server-side access checks**: protected operations enforce authentication and role permissions on the server, not only through page visibility.
- **FR-SYS-03 — Sales and order integrity**: order and manual-sale prices are calculated and persisted by the server; transaction records retain the item and price details used when the sale was recorded.
- **FR-SYS-04 — Stock updates**: saved staff sales apply configured menu-item and supply usage deductions. Order entry checks current menu item availability and stock.
- **FR-SYS-05 — Activity records**: activity history is timestamped, ordered newest first, and paginated. Visibility follows the user's role and branch scope; Super Admin details are restricted as described above.
- **FR-SYS-06 — Session invalidation**: logging out ends the active session so it cannot continue to access authenticated endpoints.

## Firebase Cloud Messaging (FCM) notifications

- **FR-PUSH-01 — Browser opt-in**: Staff and Branch Managers can enable or disable push notifications for the current browser from account Settings. Enabling requires browser notification permission and registers the device with the signed-in account and assigned branch.
- **FR-PUSH-02 — Persistent browser registration**: logging out preserves the current browser's push registration, allowing notifications for the registered account to arrive while signed out. When another authenticated account explicitly enables notifications in that browser, the browser registration transfers to that account and its assigned branch.
- **FR-PUSH-03 — New-order alerts**: when an order is created for a branch, send a push notification to registered devices belonging to active Staff and Branch Manager accounts assigned to that branch.
- **FR-PUSH-04 — Low-stock alerts**: when an order, sale, or stock adjustment reduces a menu item's or supply's quantity from above its configured threshold to at or below it, notify registered devices belonging to active Branch Managers for that branch. Further reductions while the quantity remains at or below the threshold do not send another alert.
- **FR-PUSH-05 — Branch test alert**: an authenticated Staff member or Branch Manager can send a test notification to registered devices for their assigned branch without changing inventory.
- **FR-PUSH-06 — FCM configuration**: push delivery is controlled by the system's Firebase Messaging setting and requires valid Firebase web configuration and server-side Firebase Admin credentials.
