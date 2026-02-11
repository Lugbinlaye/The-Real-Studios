/**
 * THE REAL STUDIOS | Admin Command Center
 * Version: 17.0 (The Kinetic Glass HUD - Full Admin Master)
 * 100% COMPLETION | NO SUMMARIES | STABILITY LOCKED
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
    getFirestore, collection, query, where, addDoc, doc, updateDoc, 
    onSnapshot, serverTimestamp, orderBy, getDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

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

/* ===============================
    GLOBAL STATE & LISTENERS
================================ */
let currentUserId = null;
let projectsListener = null;
let projectChatListener = null;
let partnerChatListener = null;
let adminInboxListener = null;
let adminPaymentsListener = null;
let clientProfileUnsub = null;
let partnerListListener = null;
let partnerProjectsListener = null;
let adminPitchesListener = null; 

let invoiceItems = [];
let adminProjectsCache = []; 
let currentCurrencySymbol = "$";

/* ===============================
    0. KINETIC UI ENGINE (CSS)
================================ */
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    :root { 
        --mint: #00ffc3; 
        --studio-red: #E31E24; 
        --obsidian: #050505;
        --glass-border: rgba(255, 255, 255, 0.08);
    }

    /* KINETIC HUD ELEMENTS */
    .glass-card {
        background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
        border: 1px solid var(--glass-border);
        border-radius: 4px; padding: 24px; margin-bottom: 20px;
        transition: 0.5s cubic-bezier(0.2, 1, 0.2, 1);
        position: relative;
    }
    .glass-card:hover { border-color: var(--mint); background: rgba(255,255,255,0.05); }

    .meta-label { font-size: 0.6rem; color: #555; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; display: block; margin-bottom: 5px; }
    .meta-value { color: #fff; font-size: 0.9rem; font-family: 'Space Mono', monospace; }

    /* DASHBOARD GRID CARDS */
    .project-card { border-left: 3px solid rgba(255,255,255,0.1); }
    .project-card:hover { border-left-color: var(--mint); }

    /* ROADMAP HUD */
    .roadmap-track { display: flex; align-items: center; gap: 5px; margin: 30px 0; }
    .roadmap-step { 
        flex: 1; height: 6px; background: rgba(255,255,255,0.1); 
        position: relative; transition: 0.5s; font-size: 0.6rem; 
        color: #444; text-transform: uppercase; font-weight: 900;
        display: flex; align-items: center; justify-content: center;
    }
    .roadmap-step.active { background: var(--mint); color: #000; box-shadow: 0 0 15px var(--mint); }

    /* TERMINAL CHAT UPLINK */
    .hq-chat-wrapper { background: var(--obsidian); border: 1px solid var(--glass-border); border-radius: 4px; overflow: hidden; }
    .hq-chat-header { 
        padding: 15px 25px; background: rgba(255,255,255,0.02); 
        border-bottom: 1px solid var(--glass-border);
        font-family: 'Space Mono'; font-size: 0.7rem; letter-spacing: 2px; color: var(--mint);
    }
    .hq-bubble { max-width: 80%; padding: 12px 16px; border-radius: 2px; font-size: 0.85rem; line-height: 1.5; }
    .hq-bubble.sent { background: rgba(0, 255, 195, 0.1); border: 1px solid var(--mint); color: #fff; }
    .hq-bubble.received { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; }

    /* INVOICE PREVIEW STYLE */
    .invoice-paper { font-family: 'Space Mono', monospace; }
`;
document.head.appendChild(styleFix);

/* ===============================
    CORE OPS
================================ */
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "../html/sign-in.html"; return; }
    
    // VERIFY ADMIN STATUS
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.data()?.role !== 'admin') {
        window.location.href = "../unauthorized.html"; // Eject non-admins
        return;
    }

    currentUserId = user.uid;
    console.log("ADMIN_UPLINK_STABLE");
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.id === "logoutBtn") {
                signOut(auth).then(() => window.location.href = "../html/sign-in.html");
                return;
            }
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
            
            btn.classList.add("active");
            const targetId = btn.dataset.section;
            const targetSec = document.getElementById(targetId);
            if(targetSec) targetSec.classList.add("active");

            stopAllListeners();
            if (targetId === "projects") loadAdminProjects();
            if (targetId === "inbox") startAdminInboxListener();
            if (targetId === "payments") startAdminPaymentsListener();
            if (targetId === "partners") loadStudioPartners();
        });
    });
});

function stopAllListeners() {
    const list = [projectsListener, projectChatListener, partnerChatListener, adminInboxListener, adminPaymentsListener, clientProfileUnsub, partnerListListener, partnerProjectsListener, adminPitchesListener];
    list.forEach(unsub => { if(typeof unsub === 'function') unsub(); });
}

/* ===============================
    1. PROJECT HUB
================================ */
function loadAdminProjects() {
    const list = document.getElementById("projectsList");
    if(!list) return;

    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    projectsListener = onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? '<div style="opacity:0.3; padding:40px; letter-spacing:2px; font-size:0.7rem;">NO ACTIVE SESSIONS</div>' : '';
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.style.cursor = "pointer";
            const isPartner = data.type === 'Partnership';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="meta-label" style="color:${isPartner ? 'var(--mint)' : '#666'};">${isPartner ? 'PARTNER_COLLAB' : 'CLIENT_SESSION'}</span>
                    <span style="font-family:'Space Mono'; font-size:0.7rem; opacity:0.4;">${data.userEmail || 'NO_AUTH'}</span>
                </div>
                <h3 style="margin:15px 0 5px 0; font-weight:400; font-size:1.3rem;">${data.title}</h3>
                <div style="display:flex; justify-content:space-between; font-size:0.7rem; font-family:'Space Mono'; margin-bottom:5px;">
                    <span style="color:${data.status === 'Completed' ? 'var(--mint)' : '#555'}">${data.status}</span>
                    <span>${data.progress || 0}%</span>
                </div>
                <div class="progress-container"><div class="progress-fill" style="width:${data.progress || 0}%"></div></div>
            `;
            card.onclick = () => openProjectEditor(docSnap.id, data);
            list.appendChild(card);
        });
    });
}

function openProjectEditor(projectId, projectData) {
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
    document.getElementById("projectDetails").classList.add("active");
    const container = document.getElementById("adminDetailsContent");
    const isPartner = projectData.type === 'Partnership';
    const accent = isPartner ? 'var(--mint)' : 'var(--studio-red)';

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:20px;">
            <div><span class="meta-label">Session Control</span><h2 style="margin:0; font-weight:400; font-size:1.8rem;">${projectData.title}</h2></div>
            <button id="backToProj" style="background:none; border:1px solid rgba(255,255,255,0.1); padding:10px 20px; color:#fff; cursor:pointer;">EXIT_HUD</button>
        </div>

        <div class="glass-card" style="border-left:2px solid ${accent};">
            <span class="meta-label" style="color:${accent};">${isPartner ? 'Partner Profile' : 'Client Profile'}</span>
            <div id="clientProfileBox" style="margin-top:15px;">Loading secure profile...</div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:30px; margin-top:30px;">
            <div>
                <div class="glass-card">
                    <span class="meta-label">Milestone Control</span>
                    <select id="projPhase" class="compact-select" style="width:100%; margin:15px 0;">
                        <option value="0" ${projectData.phase == 0 ? 'selected' : ''}>01 // Discovery</option>
                        <option value="1" ${projectData.phase == 1 ? 'selected' : ''}>02 // Design</option>
                        <option value="2" ${projectData.phase == 2 ? 'selected' : ''}>03 // Dev</option>
                        <option value="3" ${projectData.phase == 3 ? 'selected' : ''}>04 // Launch</option>
                    </select>
                    <button id="updPhase" style="width:100%; color:var(--mint); border:1px solid var(--mint); background:none; padding:12px; cursor:pointer;">SYNC_PHASE</button>
                </div>
                <div class="glass-card">
                    <span class="meta-label">System Data</span>
                    <div style="margin:15px 0;">
                        <select id="projStatus" class="compact-select" style="width:100%; margin-bottom:15px;">
                            <option value="Pending" ${projectData.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${projectData.status === 'In Progress' ? 'selected' : ''}>Active</option>
                            <option value="Review" ${projectData.status === 'Review' ? 'selected' : ''}>Review</option>
                            <option value="Completed" ${projectData.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                        <input type="range" id="projProgress" min="0" max="100" value="${projectData.progress || 0}" style="width:100%;">
                    </div>
                    <button id="saveSettings" style="width:100%; background:var(--mint); color:#000; padding:12px; font-weight:900; border:none; cursor:pointer;">SAVE_CHANGES</button>
                </div>
            </div>

            <div class="glass-card">
                <span class="meta-label" style="color:${accent};">${isPartner ? 'Receipt Builder' : 'Invoice Builder'}</span>
                <div id="invoiceBuilderList" style="margin-top:20px;"></div>
                <button id="addItemBtn" style="background:none; border:1px dashed #333; color:#555; width:100%; padding:10px; margin-top:10px; cursor:pointer;">+ ADD LINE ITEM</button>
                <div style="margin-top:30px; display:flex; justify-content:space-between; align-items:flex-end;">
                    <div><span class="meta-label">Total Amount</span><span id="builderTotalText" style="font-family:'Space Mono'; font-size:1.5rem;">$0.00</span></div>
                    <button id="previewInvoiceBtn" style="background:${accent}; color:#000; padding:15px 30px; font-weight:900; border:none; cursor:pointer;">PREVIEW_GEN</button>
                </div>
            </div>
        </div>
        <div style="margin-top:30px;">${isPartner ? '' : `<div class="hq-chat-wrapper"><div class="hq-chat-header">SECURE_UPLINK</div><div id="projectChatBody" class="hq-chat-body" style="height:350px;"></div><div class="hq-input-area"><input type="text" id="projectChatInput" class="hq-input" placeholder="Transmission..."><button id="projectChatSend" class="hq-send-btn">➤</button></div></div>`}</div>
    `;

    document.getElementById("backToProj").onclick = () => { stopAllListeners(); document.getElementById("projectDetails").classList.remove("active"); document.getElementById("projects").classList.add("active"); loadAdminProjects(); };

    if(projectData.userId) {
        clientProfileUnsub = onSnapshot(doc(db, "users", projectData.userId), (snap) => {
            if(snap.exists()) {
                const u = snap.data();
                document.getElementById("clientProfileBox").innerHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; font-family:'Space Mono'; font-size:0.8rem;"><div><span class="meta-label">Name</span>${u.name || u.fullName || "N/A"}</div><div><span class="meta-label">Entity</span>${u.businessName || "N/A"}</div><div><span class="meta-label">Auth</span>${u.email}</div></div>`;
            }
        });
    }

    document.getElementById("updPhase").onclick = async () => { const ph = parseInt(document.getElementById("projPhase").value); await updateDoc(doc(db, "projects", projectId), { phase: ph }); if(projectData.linkedBriefId) await updateDoc(doc(db, "collaboration_briefs", projectData.linkedBriefId), { currentPhase: ph }); alert("SYNCED"); };
    document.getElementById("saveSettings").onclick = async () => { const st = document.getElementById("projStatus").value; const pr = parseInt(document.getElementById("projProgress").value); await updateDoc(doc(db, "projects", projectId), { status: st, progress: pr }); if(st === 'Completed' && projectData.linkedBriefId) await updateDoc(doc(db, "collaboration_briefs", projectData.linkedBriefId), { status: 'completed' }); alert("CORE UPDATED"); };
    
    invoiceItems = []; 
    document.getElementById("addItemBtn").onclick = () => { invoiceItems.push({ desc: "", price: 0, qty: 1 }); renderInvoiceBuilderRows(); };
    document.getElementById("previewInvoiceBtn").onclick = () => showInvoicePreview(projectData, projectId, isPartner);
    if(!isPartner) setupClientChat(projectId, projectData.userId, projectData.userEmail);
}

/* ===============================
    2. INVOICE/RECEIPT LOGIC
================================ */
function renderInvoiceBuilderRows() {
    const list = document.getElementById("invoiceBuilderList");
    if(!list) return;
    list.innerHTML = "";
    invoiceItems.forEach((item, idx) => {
        const row = document.createElement("div");
        row.style.display = "flex"; row.style.gap = "10px"; row.style.marginBottom = "10px";
        row.innerHTML = `<input type="text" class="builder-input" value="${item.desc}" data-key="desc" placeholder="Description" style="flex:2;"><input type="number" class="builder-input" value="${item.price}" data-key="price" placeholder="Price" style="flex:1;"><input type="number" class="builder-input" value="${item.qty || 1}" data-key="qty" style="width:50px;"><button class="remove-item" style="background:none; border:1px solid var(--studio-red); color:var(--studio-red); cursor:pointer;">×</button>`;
        row.querySelectorAll("input").forEach(inp => { inp.oninput = (e) => { const k = e.target.dataset.key; invoiceItems[idx][k] = k === "desc" ? e.target.value : parseFloat(e.target.value) || 0; updateBuilderTotal(); }; });
        row.querySelector(".remove-item").onclick = () => { invoiceItems.splice(idx, 1); renderInvoiceBuilderRows(); };
        list.appendChild(row);
    });
    updateBuilderTotal();
}

function updateBuilderTotal() {
    const total = invoiceItems.reduce((s, i) => s + (i.price * i.qty), 0);
    const el = document.getElementById("builderTotalText");
    if(el) el.textContent = `${currentCurrencySymbol}${total.toLocaleString()}`;
}

function showInvoicePreview(project, projectId, isReceipt) {
    const modal = document.getElementById("invoiceModal");
    const docId = `${isReceipt ? 'PAY' : 'INV'}-${new Date().getTime().toString().slice(-8)}`;
    const total = invoiceItems.reduce((s, i) => s + (i.price * i.qty), 0);
    const title = isReceipt ? "PAYOUT RECEIPT" : "TAX INVOICE";

    modal.innerHTML = `
        <div class="invoice-paper" style="background:white; color:black; width:100%; max-width:800px; padding:60px; margin:auto; border-radius:4px;">
            <div style="border-bottom:2px solid black; padding-bottom:20px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div><h1 style="margin:0; letter-spacing:4px;">${title}</h1><p>TRS_SYSTEM_GENERATED</p></div>
                <div style="text-align:right;"><h3>#${docId}</h3><p>${new Date().toLocaleDateString()}</p></div>
            </div>
            <div style="margin:40px 0;"><strong>TARGET_ENTITY:</strong><br>${project.userEmail}</div>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee;"><th style="padding:15px; text-align:left;">DESCRIPTION</th><th>QTY</th><th style="text-align:right; padding:15px;">TOTAL</th></tr>
                ${invoiceItems.map(i => `<tr><td style="padding:15px; border-bottom:1px solid #ddd;">${i.desc}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:right; padding:15px;">${(i.price * i.qty).toLocaleString()}</td></tr>`).join('')}
            </table>
            <h2 style="text-align:right; margin-top:30px;">TOTAL: ${currentCurrencySymbol}${total.toLocaleString()}</h2>
            <div class="no-print" style="margin-top:40px; display:flex; gap:10px;">
                <button id="confInv" style="background:black; color:white; border:none; padding:15px 30px; cursor:pointer; font-weight:900;">CONFIRM_SEND</button>
                <button onclick="document.getElementById('invoiceModal').style.display='none'" style="background:none; border:1px solid #ddd; padding:15px; cursor:pointer;">CANCEL</button>
            </div>
        </div>
    `;
    modal.style.display = "flex";
    document.getElementById("confInv").onclick = async () => {
        await addDoc(collection(db, "invoices"), { invoiceId: docId, projectId, items: invoiceItems, amount: total, currencySymbol: currentCurrencySymbol, clientEmail: project.userEmail, status: isReceipt ? "Paid" : "Pending", type: isReceipt ? "receipt" : "invoice", createdAt: serverTimestamp() });
        alert("DOCUMENT_FINALIZED"); modal.style.display = "none";
    };
}

/* ===============================
    3. SECURE UPLINK & CHAT
================================ */
function setupClientChat(projectId, clientId, clientEmail) {
    const box = document.getElementById("projectChatBody");
    const input = document.getElementById("projectChatInput");
    const btn = document.getElementById("projectChatSend");
    if(!box || !input || !btn) return;
    if(projectChatListener) projectChatListener();
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    projectChatListener = onSnapshot(q, (snap) => {
        box.innerHTML = "";
        snap.forEach(d => {
            const m = d.data(); const isAdmin = m.fromRole === 'admin';
            const div = document.createElement("div"); div.className = `hq-msg-row ${isAdmin ? 'sent' : 'received'}`;
            div.innerHTML = `<div class="hq-bubble ${isAdmin ? 'sent' : 'received'}">${m.message}</div>`;
            box.appendChild(div);
        });
        box.scrollTop = box.scrollHeight;
    });
    const send = async () => { const txt = input.value.trim(); if(!txt) return; await addDoc(collection(db, "messages"), { projectId, fromUserId: currentUserId, fromRole: "admin", toUserId: clientId, message: txt, createdAt: serverTimestamp() }); input.value = ""; };
    btn.onclick = send; input.onkeypress = (e) => { if(e.key === "Enter") send(); };
}

/* ===============================
    4. PARTNER OPS & PITCHES
================================ */
function loadStudioPartners() {
    const list = document.getElementById("partnersList"); if(!list) return;
    if (!document.getElementById("adminIncomingPitches")) {
        const pitchContainer = document.createElement("div");
        pitchContainer.innerHTML = `<div class="glass-card" style="margin-bottom:40px; border-left:2px solid var(--mint);"><span class="meta-label" style="color:var(--mint);">Incoming Pitches</span><div id="adminIncomingPitches" style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:20px;"></div></div><span class="meta-label">Partnership Registry</span>`;
        list.parentElement.insertBefore(pitchContainer, list);
    }
    listenForAdminPitches();
    const q = query(collection(db, "users"), where("role", "==", "studio"));
    partnerListListener = onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? '<div class="glass-card">No entities found.</div>' : '';
        snap.forEach(d => {
            const s = d.data(); const card = document.createElement("div"); card.className = "glass-card"; card.style.cursor = "pointer";
            card.innerHTML = `<div style="display:flex; align-items:center; gap:20px;"><div style="width:35px; height:35px; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-family:'Space Mono'; color:var(--mint);">${(s.businessName || "S").charAt(0).toUpperCase()}</div><div><h4 style="margin:0; font-weight:400;">${s.businessName || s.fullName}</h4><span style="font-family:'Space Mono'; font-size:0.65rem; opacity:0.3;">${s.email}</span></div></div>`;
            card.onclick = () => openPartnerControl(d.id, s); list.appendChild(card);
        });
    });
}

function listenForAdminPitches() {
    const container = document.getElementById("adminIncomingPitches"); if(!container) return;
    const q = query(collection(db, "collaboration_briefs"), where("toStudioId", "==", "admin"), where("status", "==", "pending_review"));
    adminPitchesListener = onSnapshot(q, (snap) => {
        container.innerHTML = snap.empty ? '<div style="opacity:0.2; font-size:0.7rem; letter-spacing:2px; padding:20px;">NO_PENDING_PITCHES</div>' : '';
        snap.forEach(d => {
            const p = d.data(); const card = document.createElement("div"); card.className = "glass-card"; card.style.border = "1px solid rgba(0,255,195,0.1)";
            card.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:15px;"><span class="meta-label" style="color:var(--mint);">Incoming Proposal</span><span style="font-family:'Space Mono'; font-size:0.6rem; opacity:0.4;">${p.fromStudioName || 'UNKNOWN'}</span></div><h4 style="margin:0; font-weight:400;">${p.projectTitle}</h4><div style="margin:15px 0; font-family:'Space Mono'; color:var(--mint);">${p.currency || '$'}${p.suggestedBudget}</div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;"><button id="accept-${d.id}" style="background:var(--mint); border:none; color:#000; padding:10px; font-weight:900; cursor:pointer;">ACCEPT</button><button id="decline-${d.id}" style="background:none; border:1px solid #333; color:#fff; padding:10px; cursor:pointer;">DECLINE</button></div>`;
            container.appendChild(card);
            setTimeout(() => {
                document.getElementById(`accept-${d.id}`).onclick = async () => { if(confirm("Activate Session?")) { let email = "N/A"; try { const pDoc = await getDoc(doc(db, "users", p.fromStudioId)); if(pDoc.exists()) email = pDoc.data().email; } catch(e){} await addDoc(collection(db, "projects"), { title: p.projectTitle, userId: p.fromStudioId, userEmail: email, type: "Partnership", status: "In Progress", progress: 0, phase: 0, createdAt: serverTimestamp(), linkedBriefId: d.id, fileURL: p.driveLink || "" }); await updateDoc(doc(db, "collaboration_briefs", d.id), { status: "accepted", currentPhase: 0 }); alert("ACTIVATED"); } };
                document.getElementById(`decline-${d.id}`).onclick = async () => { if(confirm("Decline?")) await updateDoc(doc(db, "collaboration_briefs", d.id), { status: "declined" }); };
            }, 100);
        });
    });
}

function openPartnerControl(studioId, s) {
    document.querySelectorAll(".dashboard-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById("partnerControl").classList.add("active");
    document.getElementById("detPartnerName").textContent = s.businessName || s.fullName;
    document.getElementById("detPartnerInfo").textContent = s.email;

    getDocs(query(collection(db, "projects"), orderBy("createdAt", "desc"))).then(snap => {
        const pSelect = document.getElementById("collabProjectSelect"); pSelect.innerHTML = '<option value="">-- Select Client Project --</option>';
        adminProjectsCache = []; snap.forEach(doc => { const p = doc.data(); adminProjectsCache.push({ id: doc.id, ...p }); const opt = document.createElement("option"); opt.value = doc.id; opt.textContent = p.title; pSelect.appendChild(opt); });
    });

    const channelId = "hq_collab_" + studioId;
    const chatCont = document.querySelector(".hq-chat-wrapper");
    if(chatCont) chatCont.innerHTML = `<div class="hq-chat-header">SECURE_LINE // ${s.businessName || 'PARTNER'}</div><div id="collabChatBody" class="hq-chat-body" style="height:350px;"></div><div class="hq-input-area"><input type="text" id="collabChatInput" class="hq-input" placeholder="Secure signal..."><button id="collabSendBtn" class="hq-send-btn">➤</button></div>`;
    setupPartnerChat(channelId, studioId);

    document.getElementById("backToPartners").onclick = () => { stopAllListeners(); document.getElementById("partnerControl").classList.remove("active"); document.getElementById("partners").classList.add("active"); };
    document.getElementById("sendBriefBtn").onclick = async () => { 
        const pid = document.getElementById("collabProjectSelect").value; const linkedP = adminProjectsCache.find(x => x.id === pid); const cur = document.getElementById("collabCurrency").value; const amt = document.getElementById("collabBudget").value;
        if(!amt) return alert("Enter budget");
        await addDoc(collection(db, "collaboration_briefs"), { toStudioId: studioId, fromStudioId: currentUserId, projectId: pid || null, projectTitle: linkedP ? linkedP.title : null, suggestedBudget: amt, currency: cur, deadline: document.getElementById("collabDeadline").value, instructions: document.getElementById("collabInstructions").value, status: "pending", currentPhase: 0, createdAt: serverTimestamp() });
        alert("BRIEF TRANSMITTED");
    };
}

function setupPartnerChat(channelId, studioId) {
    const box = document.getElementById("collabChatBody"); const inp = document.getElementById("collabChatInput"); const btn = document.getElementById("collabSendBtn"); if(!box || !inp || !btn) return;
    if(partnerChatListener) partnerChatListener();
    const q = query(collection(db, "messages"), where("projectId", "==", channelId), orderBy("createdAt", "asc"));
    partnerChatListener = onSnapshot(q, (snap) => {
        box.innerHTML = ""; snap.forEach(d => { const m = d.data(); const isAdmin = m.fromRole === 'admin'; const time = m.createdAt ? m.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''; const div = document.createElement("div"); div.className = `hq-msg-row ${isAdmin ? 'sent' : 'received'}`; div.innerHTML = `<div class="hq-bubble ${isAdmin ? 'sent' : 'received'}">${m.message}<span style="font-size:0.5rem; display:block; text-align:right; opacity:0.3; margin-top:5px;">${time}</span></div>`; box.appendChild(div); });
        box.scrollTop = box.scrollHeight;
    });
    const send = async () => { const txt = inp.value.trim(); if(!txt) return; await addDoc(collection(db, "messages"), { projectId: channelId, fromUserId: currentUserId, fromRole: "admin", toUserId: studioId, message: txt, createdAt: serverTimestamp() }); inp.value = ""; };
    btn.onclick = send; inp.onkeypress = (e) => { if(e.key === "Enter") send(); };
}

/* ===============================
    5. INBOX & PAYMENTS (LIST HUD)
================================ */
function startAdminInboxListener() {
    const list = document.getElementById("adminInboxList"); if(!list) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    adminInboxListener = onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? '<div style="opacity:0.2; padding:20px;">NO_MESSAGES</div>' : '';
        snap.forEach(d => {
            const m = d.data(); if(!m.message) return;
            const item = document.createElement("div"); item.className = "glass-card"; item.style.marginBottom = "10px";
            item.innerHTML = `<div style="display:flex; justify-content:space-between; font-size:0.6rem; font-family:'Space Mono'; opacity:0.4;"><span>${m.fromRole.toUpperCase()}</span><span>${m.createdAt ? m.createdAt.toDate().toLocaleTimeString() : ''}</span></div><div style="margin-top:8px; font-size:0.9rem;">${m.message}</div>`;
            list.appendChild(item);
        });
    });
}

function startAdminPaymentsListener() {
    const list = document.getElementById("adminPaymentsList"); if(!list) return;
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    adminPaymentsListener = onSnapshot(q, (snap) => {
        list.innerHTML = snap.empty ? '<div style="opacity:0.2; padding:20px;">NO_TRANSACTIONS</div>' : '';
        snap.forEach(d => {
            const i = d.data(); const symbol = i.currencySymbol || "$";
            const card = document.createElement("div"); card.className = "glass-card"; card.style.marginBottom = "10px";
            card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div><span class="meta-label">${i.invoiceId}</span><span style="font-family:'Space Mono'; color:${(i.status==='Paid')?'var(--mint)':'var(--studio-red)'}">${i.status}</span></div><button class="view-inv-btn" style="background:none; border:1px solid #333; color:#fff; font-size:0.6rem; padding:5px 10px; cursor:pointer;">VIEW_DOC</button></div><div style="margin-top:10px; font-size:1.1rem; font-family:'Space Mono';">${symbol}${i.amount.toLocaleString()} <small style="font-size:0.6rem; color:#444;">// ${i.clientEmail}</small></div>`;
            card.querySelector(".view-inv-btn").onclick = () => viewAndPrintInvoice(i, symbol, d.id);
            list.appendChild(card);
        });
    });
}

function viewAndPrintInvoice(i, symbol, docIdRef) {
    const modal = document.getElementById("invoiceModal");
    const watermark = (i.status === "Paid") ? `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:10rem; color:rgba(0,255,195,0.05); font-weight:900; pointer-events:none;">PAID</div>` : "";
    modal.innerHTML = `<div class="invoice-paper" style="background:white; color:black; width:100%; max-width:800px; padding:60px; margin:auto; border-radius:4px; position:relative;">${watermark}<div style="border-bottom:2px solid black; padding-bottom:20px; display:flex; justify-content:space-between;"><div><h1 style="margin:0;">TRS_DOCUMENT</h1><p>${i.type.toUpperCase()}</p></div><div style="text-align:right;"><h3>#${i.invoiceId}</h3><p>${i.date || i.createdAt?.toDate().toLocaleDateString()}</p></div></div><div style="margin:40px 0;"><strong>TARGET:</strong><br>${i.clientEmail}</div><table style="width:100%; text-align:left; border-collapse:collapse;"><tr style="background:#eee;"><th>ITEM</th><th style="text-align:right;">VAL</th></tr>${(i.items || []).map(item => `<tr><td style="padding:10px; border-bottom:1px solid #ddd;">${item.desc} (x${item.qty})</td><td style="text-align:right; border-bottom:1px solid #ddd;">${(item.price * item.qty).toLocaleString()}</td></tr>`).join('')}</table><h2 style="text-align:right; margin-top:30px;">TOTAL: ${symbol}${i.amount.toLocaleString()}</h2><div class="no-print" style="margin-top:40px; display:flex; gap:10px;"><button onclick="window.print()" style="background:black; color:white; border:none; padding:15px; cursor:pointer;">PRINT_PDF</button><button onclick="document.getElementById('invoiceModal').style.display='none'" style="background:none; border:1px solid #ddd; padding:15px; cursor:pointer;">CLOSE</button></div></div>`;
    modal.style.display = "flex";
}