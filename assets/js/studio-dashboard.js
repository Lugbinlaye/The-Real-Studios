/**
 * THE REAL STUDIOS | Partner Hub Logic
 * Version: 15.0 (The Kinetic Glass HUD - Ultra-Premium Overhaul)
 * Aesthetic: Studio Pro / Minimalist Tech / High-Density Utility
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
    getFirestore, doc, onSnapshot, collection, query, where, 
    orderBy, updateDoc, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// REPLACE your hardcoded config with this:
const firebaseConfig = {
    apiKey: window.TRS_VAULT?.API_KEY,
    authDomain: window.TRS_VAULT?.AUTH_DOMAIN,
    projectId: window.TRS_VAULT?.PROJECT_ID,
    storageBucket: window.TRS_VAULT?.STORAGE_BUCKET,
    messagingSenderId: window.TRS_VAULT?.MESSAGING_SENDER_ID,
    appId: window.TRS_VAULT?.APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;
let currentStudioName = "Partner";
let activeProjectId = null;
let timerInterval = null;

/* ===============================
    0. THE KINETIC UI ENGINE (CSS)
================================ */
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    :root { 
        --studio-mint: #00ffc3; 
        --studio-red: #E31E24; 
        --obsidian: #050505;
        --glass-border: rgba(255, 255, 255, 0.08);
    }

    /* KINETIC CARDS */
    .pro-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
        border: 1px solid var(--glass-border);
        border-radius: 4px; /* Sharp professional corners */
        padding: 24px; margin-bottom: 20px;
        transition: 0.5s cubic-bezier(0.2, 1, 0.2, 1);
        position: relative;
    }
    .pro-card:hover { 
        background: rgba(255,255,255,0.05);
        border-color: rgba(0, 255, 195, 0.4);
        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
    }

    /* TYPOGRAPHY DATA GRID */
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; }
    .meta-item { border-left: 1px solid rgba(255,255,255,0.1); padding-left: 12px; }
    .meta-label { font-size: 0.6rem; color: #555; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; }
    .meta-value { display: block; color: #fff; font-size: 0.9rem; margin-top: 4px; font-family: 'Space Mono', monospace; font-weight: 400; }

    /* MODAL HUD */
    .premium-modal-frame {
        background: var(--obsidian); border: 1px solid rgba(255,255,255,0.1);
        width: 100%; max-width: 1000px; max-height: 90vh;
        display: flex; flex-direction: column; 
        box-shadow: 0 100px 200px rgba(0,0,0,0.9);
        animation: slideUp 0.6s cubic-bezier(0.2, 1, 0.2, 1);
    }
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
    .pm-header { 
        padding: 30px 40px; border-bottom: 1px solid rgba(255,255,255,0.05); 
        display: flex; justify-content: space-between; align-items: center; 
    }
    
    .pm-close-btn { 
        background: none; border: 1px solid rgba(255,255,255,0.2);
        color: #fff; width: 35px; height: 35px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
        transition: 0.3s;
    }
    .pm-close-btn:hover { background: #fff; color: #000; border-color: #fff; }

    /* TIMELINE HUD */
    .timeline-track { display: flex; align-items: center; gap: 5px; margin: 40px 0; }
    .time-node { 
        flex: 1; height: 4px; background: rgba(255,255,255,0.1); 
        position: relative; transition: 0.5s; cursor: pointer;
    }
    .time-node.active { background: var(--studio-mint); box-shadow: 0 0 15px var(--studio-mint); }
    .time-node.completed { background: rgba(0,255,195,0.3); }
    .time-label { position: absolute; top: -20px; left: 0; font-size: 0.6rem; color: #555; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }

    /* MEET SYSTEM */
    .meet-btn { 
        background: var(--studio-red); color: white; padding: 12px 20px; border-radius: 2px;
        text-decoration: none; font-weight: 900; font-size: 0.75rem; letter-spacing: 1px;
        display: flex; align-items: center; gap: 10px; transition: 0.3s;
    }
    .meet-btn:hover { filter: brightness(1.2); box-shadow: 0 0 20px rgba(227, 30, 36, 0.4); }
`;
document.head.appendChild(styleFix);

/* ===============================
    1. DASHBOARD CORE
================================ */
onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = "sign-in.html"; return; }
    currentUserId = user.uid;
    initDashboard();
});

function initDashboard() {
    loadProfileSync();
    listenForIncomingBriefs();
    listenForActiveCollabs();
    listenForSentPitches();
    listenForHQChat();
    setupPitchModal();
}

function loadProfileSync() {
    onSnapshot(doc(db, "users", currentUserId), (snap) => {
        if(snap.exists()) {
            const d = snap.data();
            currentStudioName = d.businessName || d.name;
            const el = document.getElementById("studioNameDisplay");
            if(el) el.textContent = currentStudioName;
        }
    });
}

/* ===============================
    2. THE KINETIC FEED
================================ */
function listenForActiveCollabs() {
    const list = document.getElementById("collabsList");
    if(!list) return;
    const q = query(collection(db, "collaboration_briefs"), where("toStudioId", "==", currentUserId), where("status", "in", ["accepted", "completed"]));
    
    onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? `<div style="text-align:center; opacity:0.3; padding:60px; letter-spacing:2px; font-size:0.7rem;">NO ACTIVE SESSIONS</div>` : "";
        snap.forEach(d => {
            const b = d.data();
            if (b.type === 'pitch') return; 

            const div = document.createElement("div");
            div.className = "pro-card";
            div.style.cursor = "pointer";
            
            const phases = ["Discovery", "Design", "Dev", "Launch"];
            const currentP = b.currentPhase || 0;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 8px 0; font-size:1.4rem; font-weight:400; letter-spacing:-0.5px;">${b.projectTitle}</h3>
                        <span style="font-size:0.65rem; color:var(--studio-mint); font-weight:900; letter-spacing:1px; text-shadow: 0 0 10px rgba(0,255,195,0.3);">LIVE PHASE // ${phases[currentP].toUpperCase()}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-weight:400; font-size:1.2rem; font-family:'Space Mono';">${b.currency||'$'}${b.suggestedBudget}</span>
                    </div>
                </div>
                <div class="meta-grid">
                    <div class="meta-item"><span class="meta-label">Deadline</span><span class="meta-value">${b.deadline || 'TBD'}</span></div>
                    <div class="meta-item"><span class="meta-label">Files</span><span class="meta-value">${b.driveLink ? 'LINKED' : 'PENDING'}</span></div>
                    <div class="meta-item"><span class="meta-label">Production</span><span class="meta-value">${b.adminDelivery ? 'READY' : 'ACTIVE'}</span></div>
                </div>
            `;
            div.onclick = () => openProjectDeepDive(d.id, b);
            list.appendChild(div);
        });
    });
}

/* ===============================
    3. THE DEEP DIVE HUD
================================ */
function openProjectDeepDive(id, data) {
    activeProjectId = id;
    const modal = document.getElementById("projectDetailModal");
    if(!modal) return;
    
    const meetTimeStr = data.meetScheduled || null;

    modal.innerHTML = `
        <div class="premium-modal-frame">
            <div class="pm-header">
                <div>
                    <h2 style="margin:0; font-size:1.8rem; font-weight:400; letter-spacing:-1px;">${data.projectTitle}</h2>
                    <span style="font-size:0.6rem; color:#444; font-family:monospace; letter-spacing:2px; font-weight:900;">RECORD_ID_${id.toUpperCase()}</span>
                </div>
                <div style="display:flex; align-items:center; gap:25px;">
                    <div style="text-align:right;">
                        <a href="${data.meetLink || '#'}" target="_blank" class="meet-btn">📹 JOIN HQ BRIEFING</a>
                        <span id="meetTimer" style="font-family:monospace; color:var(--studio-red); font-size:0.7rem; font-weight:bold; margin-top:5px; display:block;"></span>
                    </div>
                    <button class="pm-close-btn" id="closeDetail">EXIT</button>
                </div>
            </div>

            <div style="padding:40px; overflow-y:auto; flex:1;">
                <div style="display:flex; gap:40px; margin-bottom:40px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:30px;">
                    <div><span class="meta-label">Budget</span><span class="meta-value" style="font-size:1.5rem; color:var(--studio-mint);">${data.currency||'$'}${data.suggestedBudget}</span></div>
                    <div><span class="meta-label">Launch Window</span><span class="meta-value" style="font-size:1.5rem;">${data.deadline || "TBD"}</span></div>
                    <div><span class="meta-label">Operational Status</span><span class="meta-value" style="font-size:1.5rem; text-transform:uppercase;">${data.status}</span></div>
                </div>

                <div class="timeline-track" id="timelineTrack"></div>

                <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:50px; margin-top:40px;">
                    <div>
                        <span class="meta-label" style="display:block; margin-bottom:15px; color:var(--studio-mint);">Mission Briefing</span>
                        <p style="font-size:1rem; line-height:1.8; color:#999; font-weight:300;">
                            ${data.instructions || data.brief || "Awaiting briefing documentation..."}
                        </p>
                    </div>
                    <div>
                        <span class="meta-label" style="display:block; margin-bottom:15px;">Asset Portals</span>
                        <a href="${data.driveLink || '#'}" target="_blank" style="display:${data.driveLink?'flex':'none'}; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:20px; border:1px solid rgba(255,255,255,0.1); color:#fff; text-decoration:none; margin-bottom:15px;">
                            <span style="font-size:1.2rem;">📂</span> Access Master Production Folder
                        </a>
                        <div style="padding:20px; border:1px dashed rgba(255,255,255,0.1); text-align:center; font-size:0.8rem; color:#555;">
                            ${data.adminDelivery ? 'PRODUCTION READY' : 'HQ PRODUCTION IN PROGRESS'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Timer Logic
    if(timerInterval) clearInterval(timerInterval);
    if(meetTimeStr) startMeetTimer(meetTimeStr);

    // Timeline Generation
    const track = document.getElementById("timelineTrack");
    const phases = ["Discovery", "Design", "Dev", "Launch"];
    phases.forEach((ph, idx) => {
        const node = document.createElement("div");
        node.className = idx === (data.currentPhase||0) ? "time-node active" : (idx < (data.currentPhase||0) ? "time-node completed" : "time-node");
        node.innerHTML = `<span class="time-label">${ph}</span>`;
        node.onclick = async () => {
            if(confirm(`Update phase to ${ph}?`)) {
                await updateDoc(doc(db, "collaboration_briefs", id), { currentPhase: idx });
                openProjectDeepDive(id, {...data, currentPhase: idx});
            }
        };
        track.appendChild(node);
    });

    document.getElementById("closeDetail").onclick = () => { modal.style.display = "none"; clearInterval(timerInterval); };
    modal.style.display = "flex";
}

function startMeetTimer(targetDate) {
    const el = document.getElementById("meetTimer");
    const target = new Date(targetDate).getTime();
    const update = () => {
        const diff = target - new Date().getTime();
        if(diff < 0) { el.textContent = "SYNCED: LIVE BRIEFING"; return; }
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        el.textContent = `T-MINUS // ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    };
    update();
    timerInterval = setInterval(update, 1000);
}

/* ===============================
    4. HQ UPLINK (CHAT)
================================ */
function listenForHQChat() {
    const box = document.getElementById("hqMessages");
    if(!box) return;
    const q = query(collection(db, "messages"), where("projectId", "==", "hq_collab_"+currentUserId), orderBy("createdAt", "asc"));
    onSnapshot(q, (snap) => {
        box.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const time = m.createdAt ? m.createdAt.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "";
            const div = document.createElement("div");
            div.className = `wa-row ${m.fromRole==='admin'?'received':'sent'}`;
            div.innerHTML = `<div class="wa-bubble">${m.message}<span style="font-size:0.6rem; opacity:0.3; display:block; text-align:right; margin-top:5px; font-family:monospace;">${time}</span></div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

const hqSendBtn = document.getElementById("hqSendBtn");
if(hqSendBtn) {
    hqSendBtn.onclick = async () => {
        const inp = document.getElementById("hqChatInput");
        if(!inp.value.trim()) return;
        await addDoc(collection(db, "messages"), {
            projectId: "hq_collab_"+currentUserId, fromUserId: currentUserId, fromRole: "studio", toUserId: "admin",
            message: inp.value, createdAt: serverTimestamp()
        });
        inp.value = "";
    };
}

/* ===============================
    5. BRIEFS & PITCHES
================================ */
function listenForIncomingBriefs() {
    const list = document.getElementById("briefsList");
    const q = query(collection(db, "collaboration_briefs"), where("toStudioId", "==", currentUserId), where("status", "==", "pending"));
    onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? `<div style="text-align:center; opacity:0.3; padding:40px; letter-spacing:2px; font-size:0.7rem;">NO PENDING INVITES</div>` : "";
        snap.forEach(d => {
            const b = d.data();
            const div = document.createElement("div");
            div.className = "pro-card";
            div.style.borderLeft = "2px solid var(--studio-red)";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="meta-label" style="color:var(--studio-red);">Immediate Invitation</span>
                    <strong style="font-family:'Space Mono';">${b.currency||'$'}${b.suggestedBudget}</strong>
                </div>
                <h3 style="margin:10px 0; font-weight:400;">${b.projectTitle}</h3>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn-primary" style="background:var(--studio-mint); color:#000; padding:10px 20px; font-weight:900;" onclick="window.handleBrief('${d.id}', 'accepted')">ACCEPT</button>
                    <button class="nav-item" style="border:1px solid #333; padding:10px 20px;" onclick="window.handleBrief('${d.id}', 'declined')">DECLINE</button>
                </div>
            `;
            list.appendChild(div);
        });
    });
}

function listenForSentPitches() {
    const list = document.getElementById("myPitchesList");
    const q = query(collection(db, "collaboration_briefs"), where("fromStudioId", "==", currentUserId));
    onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? `<div style="text-align:center; opacity:0.3; padding:40px; letter-spacing:2px; font-size:0.7rem;">NO TRANSMISSION HISTORY</div>` : "";
        snap.forEach(d => {
            const b = d.data();
            if(b.type !== 'pitch') return;
            const div = document.createElement("div");
            div.className = "pro-card";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0; font-weight:400;">${b.projectTitle}</h4>
                    <span class="meta-label" style="color:${b.status === 'accepted' ? 'var(--studio-mint)' : '#666'};">${b.status}</span>
                </div>
            `;
            if(b.status === 'accepted') {
                div.style.cursor = "pointer";
                div.onclick = () => openProjectDeepDive(d.id, b);
            }
            list.appendChild(div);
        });
    });
}

function setupPitchModal() {
    const btn = document.getElementById("openPitchModalBtn");
    const modal = document.getElementById("pitchModal");
    const send = document.getElementById("sendPitchBtn");
    if(btn) btn.onclick = () => modal.style.display = "flex";
    if(send) {
        send.onclick = async () => {
            const title = document.getElementById("pitchTitle").value;
            const budg = document.getElementById("pitchBudget").value;
            if(!title || !budg) return alert("All mission parameters required.");
            send.textContent = "TRANSMITTING...";
            await addDoc(collection(db, "collaboration_briefs"), {
                toStudioId: "admin", fromStudioId: currentUserId, fromStudioName: currentStudioName,
                projectTitle: title, suggestedBudget: budg, currency: document.getElementById("pitchCurrency").value,
                driveLink: document.getElementById("pitchDrive").value, brief: document.getElementById("pitchBrief").value,
                status: "pending_review", type: "pitch", createdAt: serverTimestamp(), currentPhase: 0
            });
            modal.style.display = "none";
            send.textContent = "SEND PITCH 🚀";
        };
    }
}

window.handleBrief = async (id, status) => {
    await updateDoc(doc(db, "collaboration_briefs", id), { status: status, respondedAt: serverTimestamp() });
};

document.getElementById("logoutBtn").onclick = () => signOut(auth).then(()=>window.location.href="sign-in.html");

document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
        if(btn.id==="logoutBtn") return;
        document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
        document.querySelectorAll(".dashboard-section").forEach(s=>s.classList.remove("active"));
        btn.classList.add("active");
        const t = document.getElementById(btn.dataset.section);
        if(t) t.classList.add("active");
    };
});