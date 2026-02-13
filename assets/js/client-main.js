/**
 * THE REAL STUDIOS | Client Main Orchestrator V10
 * Fix: Aggressive View Reset (Prevents Overlapping)
 */
import { auth, db } from './client-firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

import { injectClientStyles, hudLoader } from './client-ui-engine.js';
import { loadInitiateModule } from './client-initiate-module.js';
import { startProjectsListener, openProjectDetails } from './client-project-module.js';
import { startPaymentsListener } from './client-finance-module.js';
import { startPresenceHeartbeat, checkAndWelcomeNewClient } from './client-auth-utils.js';
import { loadUserProfile } from './client-profile-module.js';

let currentUserId = null;
let activeListeners = [];
let userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// 1. BOOT SEQUENCE
injectClientStyles();
hudLoader.init("../assets/images/logo.png");
setTimeout(() => hudLoader.complete(), 3000);

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "../html/sign-in.html"; return; }
    currentUserId = user.uid;

    startPresenceHeartbeat(user.uid);
    checkAndWelcomeNewClient(user);
    loadOverviewData(user);
    
    // Start Clock
    setInterval(updateClock, 1000);
    setTimeout(() => hudLoader.complete(), 1500);
});

// 2. TIME & CLOCK
function updateClock() {
    const timeEl = document.getElementById("liveClock");
    const dateEl = document.getElementById("liveDate");
    const tzSelect = document.getElementById("tzSelect");
    if(tzSelect && tzSelect.value) userTimeZone = tzSelect.value;

    const now = new Date();
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { timeZone: userTimeZone });
    if(dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: userTimeZone }).toUpperCase();
}

// 3. NAVIGATION CONTROLLER (THE FIX)
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        // Logout Check
        if (btn.id === "logoutBtn") { 
            signOut(auth).then(() => window.location.href = "../html/sign-in.html"); 
            return; 
        }

        const targetId = btn.dataset.section;
        if(!targetId) return;

        // --- STEP A: HARD RESET (Close Everything) ---
        
        // 1. Loop through ALL sections and force them hidden
        document.querySelectorAll(".dashboard-section").forEach(section => {
            section.classList.remove("active");
            section.style.display = "none"; // <--- THIS PREVENTS THE MERGING
        });

        // 2. Remove active state from all buttons
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        
        // --- STEP B: ACTIVATE NEW TAB ---

        // 1. Highlight Button
        btn.classList.add("active");

        // 2. Show Target Section
        const targetSection = document.getElementById(targetId);
        if(targetSection) { 
            targetSection.style.display = "block"; 
            // Small delay for fade-in animation
            setTimeout(() => targetSection.classList.add("active"), 10); 
        }

        // 3. Special Logic for "Projects" Tab (Restore the List)
        if(targetId === 'projects') { 
            const list = document.getElementById("projectsList"); 
            if(list) list.style.display = "block"; 
        }

        // --- STEP C: CLEANUP & MODULE LOAD ---

        // 1. Stop old database listeners (Saves memory)
        activeListeners.forEach(u => u && u());
        activeListeners = [];

        // 2. Load the correct module
        if (targetId === "projects") startProjectsListener(currentUserId, activeListeners, (id) => openProjectDetails(id, currentUserId, activeListeners));
        if (targetId === "payments") startPaymentsListener(currentUserId, activeListeners);
        if (targetId === "profile") loadUserProfile(currentUserId, activeListeners);
        if (targetId === "initiate") loadInitiateModule();
    });
});

// 4. DATA LOADER
async function loadOverviewData(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const uData = userDoc.exists() ? userDoc.data() : {};
    const displayName = uData.name || user.email.split('@')[0];

    const welcome = document.getElementById("homeWelcome");
    if(welcome) welcome.textContent = `WELCOME, ${displayName.toUpperCase()}`;
    
    // Overview Details Card
    const detailEl = document.getElementById("overviewDetails");
    if(detailEl) {
        detailEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                <span class="meta-label" style="margin:0;">OPERATOR</span> 
                <span style="font-family:'Space Mono'; font-size:0.9rem;">${displayName}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                <span class="meta-label" style="margin:0;">COMPANY</span> 
                <span style="font-family:'Space Mono'; font-size:0.9rem;">${uData.company || 'N/A'}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span class="meta-label" style="margin:0;">STATUS</span> 
                <span style="color:var(--studio-red); font-weight:700; font-size:0.8rem;">ACTIVE UPLINK</span>
            </div>
        `;
    }

    // Active Count
    const q = query(collection(db, "projects"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    const activeCount = snap.docs.filter(d => d.data().status !== 'Completed').length;
    
    const countEl = document.getElementById("overviewActiveCount");
    if(countEl) countEl.textContent = activeCount < 10 ? `0${activeCount}` : activeCount;
}