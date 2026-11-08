// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: "AIzaSyD_07muvmXKY0TWEVU7dY39qlt3hZWn1mA",
authDomain: "cremoso-75651.firebaseapp.com",
projectId: "cremoso-75651",
storageBucket: "cremoso-75651.firebasestorage.app",
messagingSenderId: "1067682465252",
appId: "1:1067682465252:web:a82e1e80148a5278f033f1",
measurementId: "G-2NE10Z11ZH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

Confirmed: include menu-item alerts, with a threshold set per item. I’ll use the existing supply threshold and the design choices you approved: Firebase Admin SDK on the server, and one registration record per browser linked to its signed-in user and branch.

Plan:

- Add an authenticated push-registration endpoint and a separate browser-registration model. Add opt-in and disable controls in Settings; remove the browser’s registration when the user opts out or logs out.
- Add Firebase Admin SDK to server/ and a server-side sender that respects the existing FCM on/off setting. It will use private service-account credentials configured on the server, never the frontend. Firebase server guidance
- Send new-order alerts to active staff and the Branch Manager at that branch, after the order is saved.
- Add a per-item low-stock threshold to the menu item model and editor. Send low-stock alerts to that branch’s manager when a menu item or supply crosses from above its threshold to at or below it. Check order, sale, and manual stock changes.
- Include notification click destinations for the relevant order or inventory page.
  This will involve the server package files, new push model/controller/routes/helpers, server.js, the order, sales, inventory and supply controllers, the menu model/controller/page, the existing Firebase client module, Settings, and the service worker. I won’t read or edit either .env file; after implementation I’ll tell you which server credential setting you need to configure.

I haven’t made changes for this backend phase. Reply “go” to approve the plan and I’ll start.
