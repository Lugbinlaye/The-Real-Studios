import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
   apiKey: "AIzaSyDFrIcY4Pv5BEu9r--kc1teKM5suy3uBP4",
    authDomain: "the-real-studio.firebaseapp.com",
    projectId: "the-real-studio",
    storageBucket: "the-real-studio.firebasestorage.app",
    messagingSenderId: "471233923515",
    appId: "1:471233923515:web:50d1a40713b18bfd6a5c9e",
    measurementId: "G-NYQEEY5F45"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);