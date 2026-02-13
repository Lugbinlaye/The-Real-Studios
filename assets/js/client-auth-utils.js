/**
 * THE REAL STUDIOS | Client Auth Utilities
 */
import { db, auth } from './client-firebase-config.js';
import { 
    doc, setDoc, getDoc, addDoc, collection, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const ADMIN_UID = "aMXaGE0upecbXpdhR6t6qQEMDLH3"; 

export function startPresenceHeartbeat(uid) {
    const userRef = doc(db, "users", uid);
    const update = async () => {
        try {
            await setDoc(userRef, { 
                lastSeen: serverTimestamp(),
                email: auth.currentUser.email 
            }, { merge: true });
        } catch (e) { console.error("HEARTBEAT_FAILURE", e); }
    };
    update(); 
    setInterval(update, 60 * 1000);
}

export async function checkAndWelcomeNewClient(user) {
    const userRef = doc(db, "users", user.uid);
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() || !userSnap.data().welcomeSent) {
            await setDoc(userRef, { 
                email: user.email, 
                name: user.displayName || user.email.split('@')[0],
                welcomeSent: true, 
                createdAt: serverTimestamp()
            }, { merge: true });

            await addDoc(collection(db, "messages"), {
                projectId: "onboarding",
                fromUserId: ADMIN_UID,
                fromRole: "admin",
                toUserId: user.uid,
                message: "UPLINK_ESTABLISHED: Welcome to The Real Studios. Your command center is now active. Standby for briefing.",
                read: false,
                createdAt: serverTimestamp()
            });
        }
    } catch (e) { console.error("AUTOMATION_ERROR", e); }
}