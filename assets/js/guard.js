/* ===============================
    TRS_GUARD: SECURITY_GATEKEEPER
   =============================== */
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// 1. Initial Blackout
document.body.style.opacity = "0";

onAuthStateChanged(auth, async (user) => {
    try {
        if (!user) {
            console.warn("AUTH_REQUIRED: Redirecting to Uplink...");
            window.location.href = "/index.html"; 
            return;
        }

        // 2. Fetch Dossier
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
            console.error("DATA_CORRUPTION: User profile missing.");
            window.location.href = "/index.html?error=no_profile";
            return;
        }

        const role = userDoc.data()?.role;
        const path = window.location.pathname;

        // 3. Validation Engine
        let accessGranted = true;

        if (path.includes("admin") && role !== "admin") accessGranted = false;
        if (path.includes("studio") && role !== "studio") accessGranted = false;

        if (!accessGranted) {
            console.error("INVALID_CLEARANCE: Security protocol engaged.");
            window.location.href = "/unauthorized.html";
        } else {
            // 4. Reveal Terminal
            document.body.style.transition = "opacity 0.8s ease";
            document.body.style.opacity = "1";
        }
    } catch (error) {
        console.error("SYSTEM_ERROR during Auth Guard:", error);
        // Fallback: don't leave them on a black screen if there's a minor error
        document.body.style.opacity = "1";
    }
});