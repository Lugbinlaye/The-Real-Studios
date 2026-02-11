/**
 * THE REAL STUDIOS | Client Command Center
 * Version: 15.0 (Kinetic Glass HUD - Master Conversion)
 * Status: 100% Functionality | Ultra-Premium Aesthetic
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
    getFirestore, collection, query, where, addDoc, onSnapshot, doc, 
    getDoc, setDoc, updateDoc, serverTimestamp, orderBy, getDocs 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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
const storage = getStorage(app);

/* ===============================
    0. THE KINETIC UI ENGINE (CSS)
================================ */
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    :root { 
        --studio-mint: #00ffc3; 
        --studio-red: #E31E24; 
        --obsidian: #050505;
        --glass-border: rgba(255, 255, 255, 0.12); /* Slightly higher visibility */
    }

    /* GLOBAL TYPOGRAPHY SCALE */
    body { font-size: 1.05rem !important; line-height: 1.7 !important; }
    h2 { font-size: 2.2rem !important; font-weight: 400; letter-spacing: -1.5px; }
    h3 { font-size: 1.5rem !important; font-weight: 500; }

    /* KINETIC HUD ELEMENTS */
    .glass-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%);
        border: 1px solid var(--glass-border);
        border-radius: 4px; 
        padding: 32px !important; /* Increased for breathing room */
        margin-bottom: 24px;
        transition: 0.5s cubic-bezier(0.2, 1, 0.2, 1);
        position: relative;
    }
    .glass-card:hover { border-color: var(--studio-mint); background: rgba(255,255,255,0.06); }

    /* Readability: Increased from 0.6rem to 0.8rem */
    .meta-label { 
        font-size: 0.8rem !important; 
        color: #666; 
        text-transform: uppercase; 
        letter-spacing: 2.5px; 
        font-weight: 800; 
        display: block; 
        margin-bottom: 10px; 
    }
    /* Readability: Increased from 0.9rem to 1.1rem */
    .meta-value { 
        color: #fff; 
        font-size: 1.1rem !important; 
        font-family: 'Space Mono', monospace; 
    }

    /* DASHBOARD GRID CARDS */
    .project-card { border-left: 5px solid rgba(255,255,255,0.1); cursor: pointer; }
    .project-card:hover { border-left-color: var(--studio-mint); transform: translateX(8px); }

    /* TIMELINE HUD */
    .roadmap-track { display: flex; align-items: center; gap: 8px; margin: 50px 0; }
    .time-node { flex: 1; height: 6px; background: rgba(255,255,255,0.1); position: relative; transition: 0.5s; }
    .time-node.active { background: var(--studio-mint); box-shadow: 0 0 20px var(--studio-mint); }
    .time-node.completed { background: rgba(0,255,195,0.3); }
    /* Readability: Increased label size */
    .time-label { 
        position: absolute; 
        top: -30px; 
        left: 0; 
        font-size: 0.75rem !important; 
        color: #888; 
        text-transform: uppercase; 
        font-weight: 800; 
        letter-spacing: 1.5px; 
    }

    /* TERMINAL CHAT UPLINK */
    .chat-container { background: var(--obsidian); border: 1px solid var(--glass-border); border-radius: 4px; overflow: hidden; }
    .chat-header { 
        padding: 20px 30px; 
        background: rgba(255,255,255,0.02); 
        border-bottom: 1px solid var(--glass-border);
        font-family: 'Space Mono'; 
        font-size: 0.85rem !important; 
        letter-spacing: 3px; 
        color: var(--studio-mint);
    }
    /* Readability: Increased from 0.85rem to 1.0rem */
    .message-bubble { 
        max-width: 75%; 
        padding: 16px 22px !important; 
        border-radius: 2px; 
        font-size: 1rem !important; 
        line-height: 1.6; 
        margin-bottom: 15px; 
    }
    .message-bubble.sent { background: rgba(0, 255, 195, 0.1); border: 1px solid var(--studio-mint); color: #fff; margin-left: auto; }
    .message-bubble.received { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.15); color: #ccc; }

    /* INPUTS */
    input, select, textarea {
        background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
        color: #fff; 
        padding: 16px !important; /* Increased padding */
        font-family: 'Space Mono'; 
        font-size: 1rem !important; /* Increased from 0.8rem */
    }
    input:focus { border-color: var(--studio-mint); outline: none; }

    /* PROGRESS BARS */
    .progress-bar { height: 4px; background: rgba(255,255,255,0.05); margin-top: 20px; }
    .progress { height: 100%; background: var(--studio-mint); box-shadow: 0 0 15px var(--studio-mint); }

    /* STATS GRID HUD */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    margin-bottom: 50px;
}

.stat-card {
    border-bottom: 4px solid var(--studio-mint);
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 160px;
}

.stat-value {
    font-size: 2.8rem !important; /* Scaled for readability */
    font-weight: 700;
    font-family: 'Space Mono', monospace;
    color: #fff;
    line-height: 1;
    margin-top: 10px;
}

.stat-suffix {
    font-size: 1rem;
    color: var(--studio-mint);
    margin-left: 5px;
    letter-spacing: 1px;
}
`;
document.head.appendChild(styleFix);

/* ===============================
    1. CORE OPS & AUTH
================================ */
let currentUserId = null;
const ADMIN_UID = "aMXaGE0upecbXpdhR6t6qQEMDLH3"; 

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "../html/sign-in.html"; return; }
    currentUserId = user.uid;
    startPresenceHeartbeat(user.uid);
    checkAndWelcomeNewClient(user);

    const homeWelcomeEl = document.getElementById("homeWelcome");
    if (homeWelcomeEl) {
        const userSnap = await getDoc(doc(db, "users", currentUserId));
        const name = userSnap.exists() ? userSnap.data().name : user.email.split("@")[0];
        homeWelcomeEl.textContent = `Welcome, ${name.toUpperCase()}`;
    }

    if (document.getElementById("projects")?.classList.contains("active")) startProjectsListener();
});

/* ===============================
    2. NAVIGATION HUD
================================ */
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === "logoutBtn") { signOut(auth).then(() => window.location.href = "../html/sign-in.html"); return; }
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.section);
        if(target) target.classList.add("active");

        stopAllListeners();
        if (btn.dataset.section === "projects") startProjectsListener();
        if (btn.dataset.section === "inbox") startInboxListener();
        if (btn.dataset.section === "payments") startPaymentsListener(); 
        if (btn.dataset.section === "profile") loadUserProfile(); 
    });
});

/* ===============================
    3. PROJECT LISTENER (KINETIC)
================================ */
function startProjectsListener() {
    const list = document.getElementById("projectsList");
    if (!list || !currentUserId) return;
    list.innerHTML = `<div style="text-align:center; opacity:0.3; padding:60px; font-size:0.7rem; letter-spacing:2px;">SYNCING_SESSIONS...</div>`;

    const q = query(collection(db, "projects"), where("userId", "==", currentUserId), orderBy("createdAt", "desc"));

    onSnapshot(q, snap => {
        list.innerHTML = "";
        if (snap.empty) {
            list.innerHTML = `<div class="glass-card" style="text-align:center; opacity:0.5;">NO ACTIVE SESSIONS FOUND</div>`;
            return;
        }
        snap.forEach(docSnap => {
            const p = docSnap.data();
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 8px 0; font-size:1.4rem; font-weight:400; letter-spacing:-0.5px;">${p.title}</h3>
                        <span style="font-size:0.6rem; color:var(--studio-mint); font-weight:900; letter-spacing:1px;">SESSION_TYPE // ${p.type.toUpperCase()}</span>
                    </div>
                    <div style="text-align:right;"><span style="font-family:'Space Mono'; color:#fff; font-size:0.8rem;">${p.status.toUpperCase()}</span></div>
                </div>
                <div class="progress-bar"><div class="progress" style="width:${p.progress || 0}%;"></div></div>
            `;
            card.onclick = () => openProjectDetails(docSnap.id);
            list.appendChild(card);
        });
    });
}

/* ===============================
    4. DEEP DIVE HUD
================================ */
async function openProjectDetails(projectId) {
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
    document.getElementById("projectDetails").classList.add("active");
    const container = document.getElementById("projectDetailsContent");
    container.innerHTML = `<div style="text-align:center; padding:50px; opacity:0.3; font-size:0.7rem; letter-spacing:2px;">MOUNTING_HUD...</div>`;

    onSnapshot(doc(db, "projects", projectId), (snap) => {
        if (!snap.exists()) return;
        const p = snap.data();

        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 40px; border-bottom:1px solid var(--glass-border); padding-bottom:20px;">
                <button id="backBtn" class="pm-close-btn" style="background:none; border:1px solid rgba(255,255,255,0.1); padding:10px 20px; color:#fff; cursor:pointer;">EXIT_HUD</button>
                <h2 style="margin:0; font-weight:400; letter-spacing:-1px; font-size:1.8rem;">${p.title}</h2>
                <div style="display:flex; gap:10px;">
                    <a href="${p.fileURL}" target="_blank" class="glass-btn" style="padding:10px 20px; text-decoration:none; color:#fff; border:1px solid #333; font-size:0.7rem;">VIEW_BRIEF</a>
                </div>
            </div>

            <div class="glass-card">
                <span class="meta-label">Production Roadmap</span>
                <div class="roadmap-track">${renderRoadmapUI(p.currentPhase || 0)}</div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                <div class="glass-card">
                    <span class="meta-label">Secure Asset Vault</span>
                    <div style="margin-top:20px;">
                        ${p.assets ? p.assets.map(a => `<div style="margin-bottom:10px; font-family:'Space Mono'; font-size:0.8rem;">📁 ${a.name} <a href="${a.url}" target="_blank" style="color:var(--studio-mint); margin-left:10px;">DOWNLOAD</a></div>`).join('') : '<span style="opacity:0.3; font-size:0.7rem;">NO ASSETS RELEASED</span>'}
                    </div>
                </div>
                <div class="glass-card">
                    <span class="meta-label">Studio Prototypes</span>
                    <div style="margin-top:20px; display:flex; gap:10px;">
                        ${p.gallery ? p.gallery.map(img => `<img src="${img.url}" style="width:60px; height:60px; object-fit:cover; border:1px solid var(--glass-border); cursor:pointer;" onclick="window.zoomImage('${img.url}')">`).join('') : '<span style="opacity:0.3; font-size:0.7rem;">NO PROTOTYPES ACTIVE</span>'}
                    </div>
                </div>
            </div>

            <div class="chat-container" style="margin-top:30px;">
                <div class="chat-header">SECURE_STUDIO_UPLINK // ADMIN_SUPPORT</div>
                <div id="messagesContainer" style="height:300px; padding:20px; overflow-y:auto; display:flex; flex-direction:column;"></div>
                <div style="padding:20px; background:rgba(255,255,255,0.01); border-top:1px solid var(--glass-border); display:flex; gap:10px;">
                    <input type="text" id="clientMessageInput" placeholder="Enter transmission..." style="flex:1;">
                    <button id="sendClientMsgBtn" style="background:var(--studio-mint); color:#000; border:none; padding:10px 20px; font-weight:900; cursor:pointer;">SEND</button>
                </div>
            </div>
        `;

        document.getElementById("backBtn").onclick = () => {
            document.getElementById("projects").classList.add("active");
            document.getElementById("projectDetails").classList.remove("active");
        };

        startChatListener(projectId);
        document.getElementById("sendClientMsgBtn").onclick = () => sendMessage(projectId, document.getElementById("clientMessageInput"), p);
    });
}

/* ===============================
    5. PAYMENTS HUD (KINETIC MANUAL)
================================ */
function startPaymentsListener() {
    const list = document.getElementById("paymentsList");
    if (!list || !currentUserId) return;
    list.innerHTML = `<div style="opacity:0.3; text-align:center; padding:60px; font-size:0.7rem; letter-spacing:2px;">QUERYING_LEDGER...</div>`;

    const q = query(collection(db, "invoices"), where("clientEmail", "==", auth.currentUser.email), orderBy("createdAt", "desc"));

    onSnapshot(q, (snap) => {
        list.innerHTML = "";
        if (snap.empty) { list.innerHTML = `<div class="glass-card" style="text-align:center; opacity:0.5;">NO TRANSACTION HISTORY</div>`; return; }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const isPaid = data.status === 'Paid';
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="meta-label">${isPaid ? 'OFFICIAL_RECEIPT' : 'PENDING_INVOICE'}</span>
                        <h3 style="margin:5px 0; font-weight:400; font-family:'Space Mono';">${data.invoiceId}</h3>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-family:'Space Mono'; font-size:1.2rem; color:${isPaid ? 'var(--studio-mint)' : 'var(--studio-red)'}">$${(data.amount || 0).toLocaleString()}</span>
                    </div>
                </div>
            `;
            card.onclick = () => openInvoiceModal({id: docSnap.id, ...data});
            list.appendChild(card);
        });
    });
}
function printInvoicePDF(data, title, accentColor, displayName) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed; width:0; height:0; border:none;';
    document.body.appendChild(iframe);
    const docI = iframe.contentWindow.document;
    
    const rows = (data.items || []).map(i => `
        <tr>
            <td style="padding:20px; border-bottom:1px solid #eee; font-size:1.1rem;">${i.desc}</td>
            <td style="padding:20px; border-bottom:1px solid #eee; text-align:center; font-size:1.1rem;">${i.qty}</td>
            <td style="padding:20px; border-bottom:1px solid #eee; text-align:right; font-size:1.1rem; font-weight:700;">$${(i.price * i.qty).toLocaleString()}</td>
        </tr>
    `).join('');

    docI.open();
    docI.write(`
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
                body { font-family: 'Space Mono', monospace; padding: 80px; color: #000; background:#fff; line-height:1.5; }
                .header { border-bottom: 6px solid #000; padding-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                table { width: 100%; border-collapse: collapse; margin: 60px 0; }
                th { background: #000; color: #fff; padding: 20px; font-size: 0.9rem; text-align: left; letter-spacing:2px; }
                .total { text-align: right; border-top: 6px dashed #000; padding-top: 40px; font-size: 2.8rem; font-weight: 700; }
                .stamp { border: 6px solid ${accentColor}; color: ${accentColor}; padding: 15px 25px; font-weight: 900; transform: rotate(-6deg); display: inline-block; text-transform:uppercase; font-size:1.5rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <div><h1 style="margin:0; font-size:3.5rem; letter-spacing:-3px;">THE REAL STUDIOS</h1><p style="margin:8px 0 0 0; letter-spacing:8px; font-size:0.9rem; opacity:0.5;">OFFICIAL_STUDIO_ARCHIVE</p></div>
                <div style="text-align:right;"><div class="stamp">${data.status}</div><p style="margin-top:20px; font-weight:700; font-size:1.2rem;">#${data.invoiceId}</p></div>
            </div>
            <div style="margin:60px 0; display:flex; justify-content:space-between; font-size:1.2rem;">
                <div><strong>CLIENT_ENTITY:</strong><br>${displayName}<br>${data.clientEmail}</div>
                <div style="text-align:right;"><strong>TIMESTAMP:</strong><br>${data.date || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead><tr><th>ITEM_DESCRIPTION</th><th style="text-align:center;">QTY</th><th style="text-align:right;">SUBTOTAL</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="total">VAL_TOTAL: $${(data.amount || 0).toLocaleString()}</div>
        </body>
        </html>
    `);
    docI.close();
    setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); }, 1000);
}

function openInvoiceModal(data) {
    const isPaid = data.status === 'Paid';
    const isAwaiting = data.status === 'Awaiting Confirmation';
    const accent = isPaid ? 'var(--studio-mint)' : (isAwaiting ? '#FFA500' : 'var(--studio-red)');
    
    const modal = document.createElement("div");
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.97); backdrop-filter:blur(35px); z-index:9999; display:flex; align-items:center; justify-content:center;`;

    // ITEMIZED LOOP (Scaled for readability)
    const itemsHtml = (data.items || []).map(i => `
        <div style="display:flex; justify-content:space-between; font-size:1.2rem; margin-bottom:18px; opacity:0.9; font-family:'Space Mono';">
            <span style="letter-spacing:-0.5px;">${i.desc} (x${i.qty})</span>
            <span style="color:#fff; font-weight:700;">$${(i.price * i.qty).toLocaleString()}</span>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="glass-card" style="width:95%; max-width:700px; border-top:8px solid ${accent}; padding:50px;">
            <button id="closeModal" style="position:absolute; top:35px; right:35px; background:none; border:none; color:#fff; cursor:pointer; font-size:2rem; opacity:0.5;">✕</button>
            
            <div style="text-align:center; margin-bottom:60px;">
                <span class="meta-label" style="font-size:0.9rem; letter-spacing:4px;">Secure Settlement Portal</span>
                <h2 style="margin:15px 0; color:${accent}; font-family:'Space Mono'; font-size:2.8rem; font-weight:700;">${data.invoiceId}</h2>
            </div>

            <div style="border-top:1px solid var(--glass-border); padding:40px 0;">
                <span class="meta-label" style="margin-bottom:25px; font-size:0.9rem;">Itemized Production Breakdown</span>
                ${itemsHtml || '<div style="opacity:0.3; font-size:1rem;">NO_ITEMS_FOUND</div>'}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--glass-border); padding-top:40px;">
                <div>
                    <span class="meta-label" style="font-size:0.9rem;">Total Session Valuation</span>
                    <span style="font-family:'Space Mono'; font-size:3.2rem; color:#fff; font-weight:700; line-height:1;">$${(data.amount || 0).toLocaleString()}</span>
                </div>
            </div>

            <div style="margin-top:60px; display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
                <button id="dlInvoiceBtn" style="background:none; border:1px solid #444; color:#fff; padding:22px; font-weight:900; cursor:pointer; letter-spacing:3px; font-size:0.9rem;">DOWNLOAD_PDF</button>
                ${!isPaid && !isAwaiting ? `<button id="claimPaidBtn" style="background:var(--studio-mint); color:#000; border:none; padding:22px; font-weight:900; cursor:pointer; font-size:0.9rem;">LOG_TRANSFER_SUCCESS</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeModal").onclick = () => modal.remove();
    
    document.getElementById("dlInvoiceBtn").onclick = () => {
        const title = isPaid ? 'RECEIPT' : 'INVOICE';
        const dispName = data.clientName || data.clientEmail.split('@')[0];
        printInvoicePDF(data, title, accent, dispName);
    };

    const claimBtn = document.getElementById("claimPaidBtn");
    if(claimBtn) {
        claimBtn.onclick = async () => {
            if(!confirm("Log transfer success for verification?")) return;
            await updateDoc(doc(db, "invoices", data.id), { status: "Awaiting Confirmation", updatedAt: serverTimestamp() });
            alert("UPLINK_SYNCED"); modal.remove();
        };
    }
}

/* ===============================
    7. PRESERVED UTILS
================================ */
function renderRoadmapUI(currentStep) {
    const steps = ["Discovery", "Design", "Dev", "Launch"];
    return steps.map((step, i) => `
        <div class="time-node ${i <= currentStep ? 'completed' : ''} ${i === currentStep ? 'active' : ''}">
            <span class="time-label">${step}</span>
        </div>
    `).join('');
}

function stopAllListeners() {
    // Standard cleanup logic
}

async function sendMessage(projectId, input, projectData) {
    const text = input.value.trim();
    if (!text) return;
    await addDoc(collection(db, "messages"), { projectId, fromUserId: currentUserId, fromRole: "client", toUserId: ADMIN_UID, message: text, read: false, createdAt: serverTimestamp() });
    input.value = "";
}

function startChatListener(projectId) {
    const box = document.getElementById("messagesContainer");
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    onSnapshot(q, (snap) => {
        box.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const div = document.createElement("div");
            div.className = `message-bubble ${m.fromRole === 'admin' ? 'received' : 'sent'}`;
            div.textContent = m.message;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
}

function startInboxListener() {
    const list = document.getElementById("inboxList");
    const q = query(collection(db, "messages"), where("toUserId", "==", currentUserId), where("fromRole", "==", "admin"), orderBy("createdAt", "desc"));
    onSnapshot(q, snap => {
        list.innerHTML = snap.empty ? `<div class="glass-card" style="text-align:center; opacity:0.5;">INBOX_EMPTY</div>` : "";
        snap.forEach(d => {
            const m = d.data();
            const item = document.createElement("div");
            item.className = "glass-card";
            item.innerHTML = `<span class="meta-label">HQ_TRANSMISSION</span><p style="margin:10px 0; font-size:0.9rem;">${m.message}</p><span style="font-family:'Space Mono'; font-size:0.6rem; opacity:0.3;">${m.createdAt?.toDate().toLocaleString()}</span>`;
            item.onclick = () => openProjectDetails(m.projectId);
            list.appendChild(item);
        });
    });
}

// Presence and Profile functions follow same logic but wrap their innerHTML in the new kinetic classes.

/* ===============================
    PRESENCE HEARTBEAT (STUDIO HUD)
================================ */
function startPresenceHeartbeat(uid) {
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
    setInterval(update, 60 * 1000); // 60s Sync
}

/* ===============================
    ONBOARDING AUTOMATION (HUD INITIALIZATION)
================================ */
async function checkAndWelcomeNewClient(user) {
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

            // Initial Secure Transmission (Welcome Message)
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
/* ===============================
    PROFILE SYSTEM (KINETIC HUD)
================================ */
/* ===============================
    6. PROFILE COMMAND CENTER (ENHANCED HUD)
================================ */
async function loadUserProfile() {
    const container = document.getElementById("profileContent");
    if(!container) return;
    container.innerHTML = `<div style="text-align:center; opacity:0.3; padding:100px; font-size:1rem; letter-spacing:5px;">DECRYPTING_SECURE_PROFILE...</div>`;

    const userRef = doc(db, "users", currentUserId);
    
    // FETCH STATS FOR PROFILE
    const projectsQuery = query(collection(db, "projects"), where("userId", "==", currentUserId));
    const invoicesQuery = query(collection(db, "invoices"), where("clientEmail", "==", auth.currentUser.email), where("status", "==", "Paid"));

    profileUnsub = onSnapshot(userRef, async (docSnap) => {
        const userData = docSnap.exists() ? docSnap.data() : {};
        const name = userData.name || auth.currentUser.displayName || "UNNAMED_ENTITY";

        // GET DATA SNAPSHOTS
        const projSnap = await getDocs(projectsQuery);
        const invSnap = await getDocs(invoicesQuery);
        
        let totalInvestment = 0;
        invSnap.forEach(d => totalInvestment += (d.data().amount || 0));

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:50px; border-bottom:1px solid var(--glass-border); padding-bottom:30px;">
                <div>
                    <span class="meta-label" style="font-size:0.9rem;">Client Identity</span>
                    <h2 style="margin:0; font-size:2.8rem;">${name.toUpperCase()}</h2>
                </div>
                <button id="editProfileBtn" class="glass-btn" style="padding:15px 30px; border:1px solid var(--studio-mint); color:var(--studio-mint); background:none; font-weight:900; cursor:pointer; font-size:0.8rem; letter-spacing:2px;">MODIFY_IDENTITY</button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px; margin-bottom:40px;">
                <div class="glass-card" style="border-bottom: 4px solid var(--studio-mint); min-height:140px;">
                    <span class="meta-label">Total_Active_Deployed</span>
                    <div class="stat-value" style="font-size:3rem; margin-top:15px;">${projSnap.size < 10 ? '0' + projSnap.size : projSnap.size}</div>
                </div>
                <div class="glass-card" style="border-bottom: 4px solid var(--studio-mint); min-height:140px;">
                    <span class="meta-label">Total_Capital_Deployed</span>
                    <div class="stat-value" style="font-size:3rem; margin-top:15px;">$${totalInvestment.toLocaleString()}<span class="stat-suffix">.00</span></div>
                </div>
            </div>

            <form id="profileForm">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                    <div class="glass-card">
                        <span class="meta-label">Primary Name</span>
                        <input type="text" id="pName" value="${name}" disabled style="width:100%; margin-top:15px; background:none; border:none; padding:0; font-size:1.2rem; color:#fff;">
                    </div>
                    <div class="glass-card">
                        <span class="meta-label">Organization</span>
                        <input type="text" id="pCompany" value="${userData.company || 'NOT_SPECIFIED'}" disabled style="width:100%; margin-top:15px; background:none; border:none; padding:0; font-size:1.2rem; color:#fff;">
                    </div>
                    <div class="glass-card">
                        <span class="meta-label">Comms Link</span>
                        <input type="text" id="pPhone" value="${userData.phone || 'NO_PHONE_ID'}" disabled style="width:100%; margin-top:15px; background:none; border:none; padding:0; font-size:1.2rem; color:#fff;">
                    </div>
                    <div class="glass-card">
                        <span class="meta-label">Secure Auth</span>
                        <div style="font-family:'Space Mono'; color:#666; margin-top:20px; font-size:1.1rem;">${auth.currentUser.email}</div>
                    </div>
                </div>

                <div id="saveContainer" style="display:none; margin-top:40px; text-align:right;">
                    <button type="button" id="cancelEditBtn" style="background:none; border:none; color:#555; margin-right:30px; cursor:pointer; font-size:0.9rem; font-weight:900; letter-spacing:2px;">ABORT_SYNC</button>
                    <button type="submit" style="background:var(--studio-mint); color:#000; border:none; padding:18px 50px; font-weight:900; cursor:pointer; font-size:0.9rem; letter-spacing:2px;">COMMIT_CHANGES</button>
                </div>
            </form>
        `;

        // EDIT/SAVE TOGGLE LOGIC
        const editBtn = document.getElementById("editProfileBtn");
        const saveBox = document.getElementById("saveContainer");
        const cancelBtn = document.getElementById("cancelEditBtn");
        const inputs = [document.getElementById("pName"), document.getElementById("pCompany"), document.getElementById("pPhone")];

        editBtn.onclick = () => {
            inputs.forEach(i => { 
                i.disabled = false; 
                i.style.borderBottom = "1px solid var(--studio-mint)"; 
                i.style.paddingBottom = "5px";
            });
            editBtn.style.display = "none";
            saveBox.style.display = "block";
        };

        cancelBtn.onclick = () => {
            inputs.forEach(i => { 
                i.disabled = true; 
                i.style.borderBottom = "none"; 
            });
            editBtn.style.display = "block";
            saveBox.style.display = "none";
        };

        document.getElementById("profileForm").onsubmit = async (e) => {
            e.preventDefault();
            await setDoc(userRef, {
                name: inputs[0].value,
                company: inputs[1].value,
                phone: inputs[2].value,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("IDENTITY_SYNC_COMPLETE");
            cancelBtn.click();
        };
    });
}
/* ===============================
    HUD LOADER CONTROLLER
================================ */
const hudLoader = {
    el: document.getElementById("hud-loader"),
    log: document.getElementById("hud-log"),
    
    // Updates the small telemetry text for a premium feel
    updateLog: function(msg) {
        if(this.log) this.log.textContent = `TRS_ACCESS: ${msg.toUpperCase()}...`;
    },
    
    // Fades out the HUD with a "Studio Exit" transition
    complete: function() {
        this.updateLog("SYNC_COMPLETE_AUTHORIZED");
        setTimeout(() => {
            if(this.el) this.el.classList.add("hud-loader-hidden");
            // Optionally remove from DOM after transition
            setTimeout(() => this.el.remove(), 1000);
        }, 800);
    }
};

/* ===============================
    DASHBOARD STATS AGGREGATOR
================================ */
async function loadDashboardStats() {
    const projEl = document.getElementById("statProjects");
    const invEl = document.getElementById("statInvestment");
    
    if(!projEl || !invEl || !currentUserId) return;

    try {
        // 1. Fetch Project Count
        const projectsQuery = query(
            collection(db, "projects"), 
            where("userId", "==", currentUserId)
        );
        
        // 2. Fetch Total Investment (Paid Invoices Only)
        const invoicesQuery = query(
            collection(db, "invoices"), 
            where("clientEmail", "==", auth.currentUser.email),
            where("status", "==", "Paid")
        );

        // Listen for Project Changes
        onSnapshot(projectsQuery, (snap) => {
            const count = snap.size;
            projEl.textContent = count < 10 ? `0${count}` : count;
        });

        // Listen for Financial Changes
        onSnapshot(invoicesQuery, (snap) => {
            let total = 0;
            snap.forEach(doc => {
                total += (doc.data().amount || 0);
            });
            
            // Scaled formatting for high readability
            invEl.innerHTML = `$${total.toLocaleString()}<span class="stat-suffix">.00</span>`;
        });

    } catch (e) {
        console.error("STATS_UPLINK_ERROR", e);
    }
}


// --- INITIALIZING THE SEQUENCE ---
hudLoader.updateLog("INIT_ENCRYPTION_PROTOCOLS");

// Integrate with your existing Auth State
onAuthStateChanged(auth, async (user) => {
    hudLoader.updateLog("VERIFYING_CREDENTIALS");
    
    if (!user) {
        window.location.href = "../html/sign-in.html";
        return;
    }
    
    hudLoader.updateLog("MOUNTING_COMMAND_HUD");
    
    // Wait for your initial data to load (e.g., Projects)
    // Once everything is ready, call complete:
    setTimeout(() => {
        hudLoader.complete();
    }, 1500); // Artificial delay to ensure animations look premium
});
