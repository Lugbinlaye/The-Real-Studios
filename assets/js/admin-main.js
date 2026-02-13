/**
 * THE REAL STUDIOS | Admin Main Orchestrator
 * Structure: Modular Architecture
 */
import { auth, db } from './client-firebase-config.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

import { injectAdminStyles, adminLoader } from './admin-ui-engine.js';

// IMPORT MODULES
import { loadSessionsModule } from './admin-sessions-module.js';
import { loadPartnersModule } from './admin-partners-module.js';
import { loadFinanceModule } from './admin-finance-module.js';
import { loadInboxModule } from './admin-chat-module.js';
import { loadRecycleModule } from './admin-recycle-module.js';

let activeListeners = [];

// 1. BOOT SEQUENCE
injectAdminStyles();
adminLoader.init();

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "../html/sign-in.html"; return; }
    
    adminLoader.complete();
    loadOverview(); // Default View
    
    // Start Clock
    setInterval(() => {
        const now = new Date();
        const clock = document.getElementById("adminClock");
        if(clock) clock.textContent = now.toLocaleTimeString();
    }, 1000);
});

document.getElementById("logoutBtn").onclick = () => {
    signOut(auth).then(() => window.location.href = "../html/sign-in.html");
};

// 2. NAVIGATION CONTROLLER
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        const targetId = btn.dataset.section;
        if(!targetId) return;

        // Reset UI
        document.querySelectorAll(".dashboard-section").forEach(s => {
            s.style.display = "none";
            s.classList.remove("active");
        });
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

        // Activate Target
        btn.classList.add("active");
        const sec = document.getElementById(targetId);
        if(sec) {
            sec.style.display = "block";
            setTimeout(() => sec.classList.add("active"), 10);
        }

        // Kill Old Listeners
        activeListeners.forEach(u => u && u());
        activeListeners = [];

        // Route to Module
        if(targetId === 'overview') loadOverview();
        if(targetId === 'sessions') loadSessionsModule(activeListeners);
        if(targetId === 'partners') loadPartnersModule(activeListeners);
        if(targetId === 'finance') loadFinanceModule(activeListeners);
        if(targetId === 'inbox') loadInboxModule(activeListeners);
        if(targetId === 'recycle') loadRecycleModule(activeListeners);
    });
});

// 3. OVERVIEW LOGIC (Kept in Main for speed)
function loadOverview() {
    const qProjects = query(collection(db, "projects"), where("status", "!=", "Archived"));
    const unsub1 = onSnapshot(qProjects, (snap) => {
        const active = snap.docs.filter(d => d.data().status !== 'Completed').length;
        document.getElementById("statActiveCount").textContent = active;
        
        let totalRev = 0;
        snap.forEach(d => totalRev += (d.data().invoiceTotal || 0));
        document.getElementById("statRevenue").textContent = `$${totalRev.toLocaleString()}`;
    });

    const qPartners = query(collection(db, "partners"), where("status", "==", "Active"));
    const unsub2 = onSnapshot(qPartners, (snap) => {
        document.getElementById("statPartners").textContent = snap.size;
    });

    activeListeners.push(unsub1, unsub2);
}