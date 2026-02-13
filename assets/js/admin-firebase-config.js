/**
 * THE REAL STUDIOS | Admin Firebase Configuration
 * Purpose: Centralized Database & Auth Instance
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: window.TRS_VAULT?.API_KEY,
    authDomain: window.TRS_VAULT?.AUTH_DOMAIN,
    projectId: window.TRS_VAULT?.PROJECT_ID,
    storageBucket: window.TRS_VAULT?.STORAGE_BUCKET,
    messagingSenderId: window.TRS_VAULT?.MESSAGING_SENDER_ID,
    appId: window.TRS_VAULT?.APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances to be used by other modules
export const auth = getAuth(app);
export const db = getFirestore(app);