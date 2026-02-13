/**
 * THE REAL STUDIOS | Client Project Module
 * Version: 8.0 (Neon Roadmap, Invoice Sync & Tab Fixes)
 */

import { db } from './client-firebase-config.js';
import { 
    collection, query, where, onSnapshot, doc, orderBy, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const ADMIN_UID = "aMXaGE0upecbXpdhR6t6qQEMDLH3";

/* ===============================
    1. PROJECT LISTING
================================ */
export function startProjectsListener(currentUserId, activeListeners, onProjectSelect) {
    const list = document.getElementById("projectsList");
    const detailSection = document.getElementById("projectDetails");
    
    // TAB FIX: Force reset views when entering this module
    if (list) list.style.display = "block"; 
    if (detailSection) {
        detailSection.classList.remove("active");
        detailSection.style.display = "none";
    }

    if (!list || !currentUserId) return;

    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
            <span class="meta-label">Active_Deployments</span>
            <button id="initiateProjectBtn" style="background:var(--studio-red); color:#fff; border:none; padding:12px 24px; font-weight:700; cursor:pointer; font-family:'Space Mono'; border-radius:4px; letter-spacing:1px; box-shadow: 0 5px 15px rgba(214, 26, 33, 0.2);">+ NEW SESSION</button>
        </div>
        <div id="projectsGrid">
            <div style="text-align:center; opacity:0.3; padding:60px; font-size:0.7rem; letter-spacing:2px;">SYNCING_SESSIONS...</div>
        </div>
    `;

    document.getElementById("initiateProjectBtn").onclick = () => {
        const initiateTab = document.querySelector('[data-section="initiate"]');
        if(initiateTab) initiateTab.click();
    };

    const container = document.getElementById("projectsGrid");
    const q = query(collection(db, "projects"), where("userId", "==", currentUserId), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
        container.innerHTML = "";
        if (snap.empty) {
            container.innerHTML = `<div class="glass-card" style="text-align:center; opacity:0.5; padding:40px;">NO ACTIVE DEPLOYMENTS</div>`;
            return;
        }

        snap.forEach(docSnap => {
            const p = docSnap.data();
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.style.cssText = "border-left: 4px solid var(--studio-red); cursor: pointer; transition: 0.3s; padding: 25px; pointer-events: all; user-select: none;";
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; pointer-events: none;">
                    <div>
                        <h3 style="margin:0 0 8px 0; font-size:1.2rem;">${p.title || 'Untitled Project'}</h3>
                        <span class="meta-label" style="color:var(--studio-red);">${p.type || 'OPS'}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-family:'Space Mono'; font-size:0.75rem; background:rgba(255,255,255,0.1); padding:5px 10px; border-radius:4px;">${p.status ? p.status.toUpperCase() : 'PENDING'}</span>
                    </div>
                </div>
                <div class="progress-bar" style="pointer-events: none;"><div class="progress" style="width:${p.progress || 0}%; background:var(--studio-red); box-shadow:0 0 15px var(--studio-red-glow);"></div></div>
            `;
            
            card.addEventListener('click', () => onProjectSelect(docSnap.id));
            container.appendChild(card);
        });
    }, (error) => {
        console.error("Fetch Error:", error);
        // Fallback for missing index
        if(error.code === 'failed-precondition') container.innerHTML = `<div style="color:var(--studio-red); text-align:center;">DATABASE INDEX REQUIRED</div>`;
    });
    activeListeners.push(unsub);
}

/* ===============================
    2. DEEP DIVE HUD (SYNCED & STYLED)
================================ */
export async function openProjectDetails(projectId, currentUserId, activeListeners) {
    // 1. Hide List, Show Detail (Structural Switch)
    const listSection = document.getElementById("projects"); // Parent section
    const listView = document.getElementById("projectsList");
    const detailView = document.getElementById("projectDetails");
    
    if(listView) listView.style.display = "none";
    if(detailView) {
        detailView.style.display = "block";
        setTimeout(() => detailView.classList.add("active"), 10);
    }

    const container = document.getElementById("projectDetailsContent");
    container.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.3; font-size:0.7rem;">ESTABLISHING SECURE UPLINK...</div>`;

    const unsub = onSnapshot(doc(db, "projects", projectId), (snap) => {
        if (!snap.exists()) return;
        const p = snap.data();

        // INVOICE FIX: Ensure it's a number, default to 0
        const safeInvoiceTotal = (typeof p.invoiceTotal === 'number') ? p.invoiceTotal : 0;

        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 30px; border-bottom:1px solid var(--border-light); padding-bottom:20px;">
                <div style="display:flex; align-items:center; gap:20px;">
                    <button id="backBtn" style="background:none; border:1px solid rgba(255,255,255,0.2); padding:10px 20px; color:#fff; cursor:pointer; font-size:0.7rem; font-family:'Space Mono';">← RETURN</button>
                    <div>
                        <h2 style="margin:0; font-size:1.8rem; line-height:1;">${p.title || 'Untitled Session'}</h2>
                        <span style="font-family:'Space Mono'; font-size:0.7rem; opacity:0.6; margin-top:5px; display:block;">ID: ${snap.id}</span>
                    </div>
                </div>
                <button id="openChatBtn" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:12px 25px; border-radius:30px; cursor:pointer; display:flex; align-items:center; gap:10px; transition:0.3s;">
                    <iconify-icon icon="solar:chat-round-dots-bold" style="color:var(--studio-red);"></iconify-icon>
                    <span style="font-size:0.8rem; font-weight:600;">SECURE UPLINK</span>
                </button>
            </div>

            <div class="glass-card">
                <span class="meta-label">OPERATION PHASE // ${p.currentPhaseName || 'INITIATION'}</span>
                <div class="roadmap-track" style="margin-top:50px; margin-bottom:20px;">
                    ${renderRoadmapUI(p.currentPhase || 0)}
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:25px;">
                
                <div class="glass-card">
                    <span class="meta-label">SYSTEM STATUS</span>
                    <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:end;">
                        <h3 style="margin:0; font-size:2rem;">${p.status || 'Active'}</h3>
                        <div style="font-family:'Space Mono'; font-size:0.8rem; color:var(--studio-red);">${p.progress || 0}% COMPLETED</div>
                    </div>
                    <div class="progress-bar" style="margin-top:15px;"><div class="progress" style="width:${p.progress || 0}%; background:var(--studio-red);"></div></div>
                </div>

                <div class="glass-card invoice-card">
                    <span class="meta-label">FINANCIAL SYNC</span>
                    <div style="margin-top:15px;">
                        <div style="font-size:0.8rem; opacity:0.6;">OUTSTANDING BALANCE</div>
                        <h3 style="margin:0; font-size:2rem; color:#FFD700;">$${safeInvoiceTotal.toLocaleString()}</h3>
                    </div>
                    <button onclick="document.querySelector('[data-section=payments]').click()" style="margin-top:15px; background:none; border:none; color:#FFD700; cursor:pointer; font-size:0.8rem; text-decoration:underline;">VIEW INVOICE DETAILS</button>
                </div>

                <div class="glass-card meet-card">
                    <span class="meta-label">HOLOGRAPHIC SCHEDULE</span>
                    <div style="margin-top:15px;">
                        ${p.meetingDate ? `
                            <div style="font-size:1.1rem; font-weight:600; margin-bottom:5px;">${formatMeetingDate(p.meetingDate)}</div>
                            <a href="${p.meetingLink}" target="_blank" style="display:inline-flex; align-items:center; gap:10px; background:#fff; color:#000; padding:10px 20px; border-radius:20px; text-decoration:none; font-weight:700; font-size:0.8rem; margin-top:10px;">
                                <iconify-icon icon="logos:google-meet"></iconify-icon> JOIN SESSION
                            </a>
                        ` : `<div style="opacity:0.5; font-size:0.9rem; padding:10px 0;">NO SCHEDULED UPLINKS</div>`}
                    </div>
                </div>
            </div>

            <div class="glass-card">
                <span class="meta-label">SECURE ASSET VAULT</span>
                <div style="margin-top:20px;">
                     ${p.assets ? p.assets.map(a => `<div style="margin-bottom:12px; font-family:'Space Mono'; font-size:0.8rem; display:flex; align-items:center; gap:10px;"><iconify-icon icon="solar:file-check-bold"></iconify-icon> ${a.name} <a href="${a.url}" target="_blank" style="color:var(--studio-red); margin-left:auto;">DOWNLOAD</a></div>`).join('') : '<span style="opacity:0.3; font-size:0.8rem;">VAULT EMPTY</span>'}
                </div>
            </div>

            <div id="secureChatModal" class="ios-modal-overlay">
                <div class="ios-chat-interface">
                    <div class="ios-header">
                        <div style="font-size:0.9rem; font-weight:600;">SECURE UPLINK // ADMIN</div>
                        <button id="closeChatBtn" style="background:none; border:none; color:#888; cursor:pointer;"><iconify-icon icon="solar:close-circle-bold" style="font-size:1.5rem;"></iconify-icon></button>
                    </div>
                    <div id="iosChatBody" class="ios-body"></div>
                    <div class="ios-footer">
                        <input type="text" id="iosChatInput" class="ios-input" placeholder="Message Admin...">
                        <button id="iosChatSend" class="ios-send"><iconify-icon icon="solar:arrow-up-bold"></iconify-icon></button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("backBtn").onclick = () => {
            document.getElementById("projectDetails").classList.remove("active");
            document.getElementById("projectDetails").style.display = "none";
            document.getElementById("projectsList").style.display = "block";
        };

        // CHAT LOGIC
        const chatModal = document.getElementById("secureChatModal");
        document.getElementById("openChatBtn").onclick = () => chatModal.classList.add("open");
        document.getElementById("closeChatBtn").onclick = () => chatModal.classList.remove("open");
        
        startChatListener(projectId, activeListeners);
        
        document.getElementById("iosChatSend").onclick = () => sendMessage(projectId, document.getElementById("iosChatInput"), currentUserId);
        document.getElementById("iosChatInput").addEventListener("keypress", (e) => {
            if (e.key === 'Enter') sendMessage(projectId, document.getElementById("iosChatInput"), currentUserId);
        });
    });
    activeListeners.push(unsub);
}

// UTILS & ROADMAP RENDERER
function renderRoadmapUI(currentStep) {
    const steps = ["Discovery", "Design", "Dev", "Launch"];
    return steps.map((step, i) => `
        <div class="time-node ${i <= currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}">
            <span class="time-label">${step}</span>
        </div>
    `).join('');
}

function formatMeetingDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });
}

async function sendMessage(projectId, input, currentUserId) {
    const text = input.value.trim();
    if (!text) return;
    await addDoc(collection(db, "messages"), { 
        projectId, fromUserId: currentUserId, fromRole: "client", toUserId: ADMIN_UID, 
        message: text, read: false, createdAt: serverTimestamp() 
    });
    input.value = "";
}

function startChatListener(projectId, activeListeners) {
    const box = document.getElementById("iosChatBody");
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
        box.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const isMe = m.fromRole === 'client';
            const div = document.createElement("div");
            div.className = `ios-bubble ${isMe ? 'sent' : 'received'}`;
            div.textContent = m.message;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
    activeListeners.push(unsub);
}