console.log("Admin Dashboard JS loaded - Dashboard-Only Mode Active");

/* ===============================
   FIREBASE IMPORTS
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    addDoc, 
    doc, 
    updateDoc, 
    onSnapshot, 
    serverTimestamp, 
    orderBy, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

/* ===============================
   FIREBASE CONFIG
================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDFrIcY4Pv5BEu9r--kc1teKM5suy3uBP4",
    authDomain: "the-real-studio.firebaseapp.com",
    projectId: "the-real-studio",
    storageBucket: "the-real-studio.firebasestorage.app",
    messagingSenderId: "471233923515",
    appId: "1:471233923515:web:50d1a40713b18bfd6a5c9e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
   GLOBAL STATE
================================ */
let currentUserId = null;
let projectsListener = null;
let messagesListener = null;
let adminInboxListener = null;
let adminPaymentsUnsub = null; 
let clientStatusUnsub = null;

// Financial Builder State
let invoiceItems = []; 
let isReceiptMode = false; // Toggle state

/* ===============================
   AUTH & NAVIGATION
================================ */
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "../html/sign-in.html";
        return;
    }
    currentUserId = user.uid;
});

document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        if (btn.id === "logoutBtn") {
            signOut(auth).then(() => window.location.href = "../html/sign-in.html");
            return;
        }

        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));

        btn.classList.add("active");
        const targetSection = document.getElementById(btn.dataset.section);
        if(targetSection) targetSection.classList.add("active");

        // Clear listeners
        if (projectsListener) projectsListener();
        if (messagesListener) messagesListener();
        if (adminInboxListener) adminInboxListener();
        if (adminPaymentsUnsub) adminPaymentsUnsub();
        if (clientStatusUnsub) clientStatusUnsub();

        // Start relevant listener
        if (btn.dataset.section === "projects") loadAdminProjects();
        if (btn.dataset.section === "inbox") startAdminInboxListener();
        if (btn.dataset.section === "payments") startAdminPaymentsListener();
    });
});

/* ===============================
   1. LOAD PROJECTS
================================ */
function loadAdminProjects() {
    const list = document.getElementById("projectsList");
    if (!list) return;

    list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading database...</div>`;
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

    projectsListener = onSnapshot(q, snapshot => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = `<div class="glass-card" style="text-align:center;">No projects found.</div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.style.cursor = "pointer";

            let badgeClass = data.status === "Pending" ? "status-pending" : "status-active";
            if(data.status === "Completed") badgeClass = "status-red";

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                     <span class="status-badge ${badgeClass}">${data.type}</span>
                     <small style="opacity:0.6;">${data.userEmail}</small>
                </div>
                <h3>${data.title}</h3>
                <div style="display:flex; justify-content:space-between; margin-top:15px; font-size:0.9rem;">
                    <span>Status: <strong style="color:var(--primary);">${data.status}</strong></span>
                    <span>${data.progress || 0}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-fill" style="width:${data.progress || 0}%"></div>
                </div>
            `;

            card.addEventListener("click", () => openProjectEditor(docSnap.id));
            list.appendChild(card);
        });
    });
}

/* ===============================
   2. PROJECT EDITOR (Receipt/Invoice Builder)
================================ */
function openProjectEditor(projectId) {
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
    document.getElementById("projectDetails").classList.add("active");

    const container = document.getElementById("adminDetailsContent");
    container.innerHTML = "Fetching project data...";

    if (clientStatusUnsub) clientStatusUnsub();

    const docRef = doc(db, "projects", projectId);

    onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const p = docSnap.data();

        if(invoiceItems.length === 0) {
            invoiceItems = [{ desc: `${p.title} Services`, price: 0, qty: 1 }];
        }

        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px;">
                 <button id="backToProjects" class="glass-btn">← Back</button>
                 
                 <div style="text-align:center;">
                    <h2 style="margin:0;">Project Control</h2>
                    <div id="clientPresenceBox" style="font-size: 0.8rem; margin-top: 5px; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <span id="clientStatusDot" style="width:8px; height:8px; border-radius:50%; background:#666; display:inline-block;"></span>
                        <span id="clientStatusText" style="opacity: 0.6;">Checking status...</span>
                    </div>
                 </div>

                 <a href="${p.fileURL}" target="_blank" class="glass-btn">View Brief ⬇</a>
            </div>

            <h3 style="margin-bottom:5px; color:#FF3B30;">${p.title}</h3>

            <div class="glass-card" style="margin-bottom: 25px; border:1px solid #333; transition: border 0.3s ease;" id="builderCard">
                 <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0; color:var(--primary);" id="builderTitle">Invoice Builder</h4>
                    
                    <div style="background:rgba(255,255,255,0.1); padding:4px; border-radius:20px; display:flex;">
                        <button id="modeInvoiceBtn" style="background:var(--primary); color:#000; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Invoice</button>
                        <button id="modeReceiptBtn" style="background:transparent; color:#fff; border:none; padding:5px 15px; border-radius:15px; cursor:pointer; font-weight:bold; font-size:0.8rem;">Receipt</button>
                    </div>
                 </div>

                 <div id="invoiceBuilderList"></div>
                 <button id="addItemBtn" class="glass-btn" style="margin-top:10px; font-size:12px;">+ Add Line</button>
                 
                 <div style="margin-top:20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:15px; display:flex; justify-content:space-between; align-items:center;">
                     <span id="builderTotalText" style="font-weight:bold; font-size:1.1rem; color:var(--primary);">Total: $0.00</span>
                     <button id="previewInvoiceBtn" class="btn-primary" style="background:var(--primary); color:#000; border:none; padding:10px 20px; font-weight:bold;">Preview & Publish</button>
                 </div>
            </div>

            <div class="glass-card" style="margin-bottom: 30px;">
                 <h4 style="margin-bottom:15px;">Status & Progress</h4>
                 <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                     <div>
                         <label>Status</label>
                         <select id="adminStatusSelect">
                             <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
                             <option value="In Progress" ${p.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                             <option value="Review" ${p.status === 'Review' ? 'selected' : ''}>Review</option>
                             <option value="Paid" ${p.status === 'Paid' ? 'selected' : ''}>Paid</option>
                             <option value="Completed" ${p.status === 'Completed' ? 'selected' : ''}>Completed</option>
                         </select>
                     </div>
                     <div>
                         <label>Progress (${p.progress}%)</label>
                         <input type="range" id="adminProgressSlider" min="0" max="100" value="${p.progress}">
                     </div>
                 </div>
                 <button id="saveChangesBtn" class="btn-primary" style="margin-top:20px;">Update Dashboard</button>
            </div>

            <div class="chat-container">
                <div id="projectMessages" class="chat-body"></div>
                <div class="chat-footer">
                    <input type="text" id="adminChatInput" placeholder="Message client..." autocomplete="off">
                    <button id="adminSendBtn" class="send-btn">➤</button>
                </div>
            </div>
        `;

        // 1. SETUP BUILDER UI & TOGGLES
        renderInvoiceBuilderRows();
        setupBuilderToggles();

        // 2. SETUP PRESENCE LISTENER
        clientStatusUnsub = onSnapshot(doc(db, "users", p.userId), (userSnap) => {
            const dot = document.getElementById("clientStatusDot");
            const text = document.getElementById("clientStatusText");
            if (userSnap.exists() && dot) {
                const userData = userSnap.data();
                const lastSeen = userData.lastSeen ? userData.lastSeen.toDate() : null;
                if (lastSeen && (new Date() - lastSeen)/1000 < 120) {
                    dot.style.background = "#00ffc3";
                    dot.style.boxShadow = "0 0 10px #00ffc3";
                    text.textContent = "Online Now";
                    text.style.color = "#00ffc3";
                } else {
                    dot.style.background = "#666";
                    dot.style.boxShadow = "none";
                    text.textContent = "Offline";
                    text.style.color = "#ccc";
                }
            }
        });

        // 3. EVENT HANDLERS
        document.getElementById("addItemBtn").onclick = () => {
            invoiceItems.push({ desc: "", price: 0, qty: 1 });
            renderInvoiceBuilderRows();
        };

        document.getElementById("previewInvoiceBtn").onclick = () => showInvoicePreview(p, projectId);

        document.getElementById("backToProjects").onclick = () => {
            invoiceItems = []; 
            if (clientStatusUnsub) clientStatusUnsub(); 
            document.querySelector('[data-section="projects"]').click();
        };

        document.getElementById("saveChangesBtn").onclick = async () => {
            await updateDoc(docRef, {
                status: document.getElementById("adminStatusSelect").value,
                progress: parseInt(document.getElementById("adminProgressSlider").value),
                updatedAt: serverTimestamp()
            });
            alert("Dashboard Updated!");
        };

        const sendBtn = document.getElementById("adminSendBtn");
        const input = document.getElementById("adminChatInput");
        
        const sendAction = async () => {
            const text = input.value.trim();
            if(!text) return;
            await addDoc(collection(db, "messages"), {
                projectId, fromUserId: currentUserId, fromRole: "admin", toUserId: p.userId,
                message: text, read: false, createdAt: serverTimestamp()
            });
            input.value = ""; 

            // Basic presence check for email
            let isClientOnline = false;
            try {
                const u = await getDoc(doc(db, "users", p.userId));
                if (u.exists() && u.data().lastSeen && (new Date() - u.data().lastSeen.toDate())/1000 < 120) isClientOnline = true;
            } catch(e){}

            if(!isClientOnline) {
                 const templateParams = {
                    client_name: p.userEmail.split('@')[0], 
                    to_email: p.userEmail,
                    project_title: p.title,
                    message: text,
                    dashboard_link: window.location.origin + "/html/client-dashboard.html"
                };
                emailjs.send("service_j1o66n8", "template_7tg947o", templateParams);
            }
        };

        sendBtn.onclick = sendAction;
        input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendAction(); });

        loadMessages(projectId);
    });
}

/* ===============================
   3. BUILDER LOGIC (TOGGLE & ROWS)
================================ */
function setupBuilderToggles() {
    const btnInv = document.getElementById("modeInvoiceBtn");
    const btnRec = document.getElementById("modeReceiptBtn");
    const title = document.getElementById("builderTitle");
    const card = document.getElementById("builderCard");
    const total = document.getElementById("builderTotalText");
    const actionBtn = document.getElementById("previewInvoiceBtn");

    const setMode = (mode) => {
        isReceiptMode = mode === 'receipt';
        if (isReceiptMode) {
            // Receipt Style (Green)
            btnRec.style.background = "#00ffc3"; btnRec.style.color = "#000";
            btnInv.style.background = "transparent"; btnInv.style.color = "#fff";
            title.textContent = "Receipt Builder"; title.style.color = "#00ffc3";
            card.style.borderColor = "#00ffc3"; card.style.background = "rgba(0,255,195,0.05)";
            total.style.color = "#00ffc3";
            actionBtn.style.background = "#00ffc3"; actionBtn.textContent = "Preview Receipt";
        } else {
            // Invoice Style (Blue/Standard)
            btnInv.style.background = "#FF3B30"; btnInv.style.color = "#fff";
            btnRec.style.background = "transparent"; btnRec.style.color = "#fff";
            title.textContent = "Invoice Builder"; title.style.color = "#FF3B30";
            card.style.borderColor = "#FF3B30"; card.style.background = "rgba(255,59,48,0.05)";
            total.style.color = "#FF3B30";
            actionBtn.style.background = "#FF3B30"; actionBtn.textContent = "Preview Invoice";
        }
    };

    btnInv.onclick = () => setMode('invoice');
    btnRec.onclick = () => setMode('receipt');
    
    // Default
    setMode('invoice');
}

function renderInvoiceBuilderRows() {
    const list = document.getElementById("invoiceBuilderList");
    if(!list) return;
    list.innerHTML = "";
    
    invoiceItems.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "builder-row";
        row.style.display = "grid";
        row.style.gridTemplateColumns = "2fr 1fr 0.5fr 40px";
        row.style.gap = "10px";
        row.style.marginBottom = "10px";

        row.innerHTML = `
            <input type="text" class="builder-input" placeholder="Item Name" value="${item.desc}" data-key="desc">
            <input type="number" class="builder-input" placeholder="Price" value="${item.price}" data-key="price">
            <input type="number" class="builder-input" placeholder="Qty" value="${item.qty}" data-key="qty">
            <button class="remove-item" style="background:#333; color:white; border:none; border-radius:4px; cursor:pointer;">×</button>
        `;

        row.querySelectorAll("input").forEach(input => {
            input.oninput = (e) => {
                const key = e.target.dataset.key;
                const val = e.target.value;
                invoiceItems[index][key] = key === "desc" ? val : parseFloat(val) || 0;
                updateBuilderTotal();
            };
        });

        row.querySelector("button").onclick = () => {
            invoiceItems.splice(index, 1);
            renderInvoiceBuilderRows();
        };

        list.appendChild(row);
    });
    updateBuilderTotal();
}

function updateBuilderTotal() {
    const total = invoiceItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const display = document.getElementById("builderTotalText");
    if(display) display.textContent = `Total: $${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

/* ===============================
   4. PREVIEW, PUBLISH & EMAIL (FIREBASE NATIVE)
================================ */
function showInvoicePreview(project, projectId) {
    const modal = document.getElementById("invoiceModal");
    const idPrefix = isReceiptMode ? "RCPT" : "INV";
    const docId = `${idPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const cleanEmail = (project.userEmail || "").trim().toLowerCase();

    // Update Modal UI based on Mode
    const modalTitle = document.querySelector("#invoiceModal h2"); // Assuming there's an h2
    if(modalTitle) modalTitle.textContent = isReceiptMode ? "Confirm Receipt" : "Confirm Invoice";
    
    document.getElementById("previewInvoiceId").textContent = docId;
    document.getElementById("previewClientName").textContent = cleanEmail.split('@')[0].toUpperCase();
    document.getElementById("previewClientEmail").textContent = cleanEmail;
    document.getElementById("previewDate").textContent = today;

    const tableBody = document.getElementById("previewTableBody");
    tableBody.innerHTML = "";
    let grandTotal = 0;
    
    // Generate Items HTML (Used for both Modal and Email)
    let emailItemsHtml = "";

    invoiceItems.forEach((item) => {
        const rowTotal = item.price * item.qty;
        grandTotal += rowTotal;
        
        // Modal Row
        tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px;">${item.desc}</td>
                <td style="text-align: right;">$${item.price.toLocaleString()}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: right; color:${isReceiptMode ? '#00ffc3' : '#E31E24'};">$${rowTotal.toLocaleString()}</td>
            </tr>
        `;

        // Email HTML Row
        emailItemsHtml += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.desc}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.qty}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${rowTotal}</td>
            </tr>
        `;
    });

    document.getElementById("previewGrandTotal").textContent = `$${grandTotal.toLocaleString()}`;
    modal.style.display = "flex";

    // CONFIRM PUBLISH
    document.getElementById("confirmInvoice").onclick = async () => {
        const btn = document.getElementById("confirmInvoice");
        btn.disabled = true;
        btn.textContent = "Publishing...";

        try {
            // 1. Save to Database (Invoices Collection)
            await addDoc(collection(db, "invoices"), {
                invoiceId: docId, 
                projectId, 
                type: isReceiptMode ? "receipt" : "invoice", // Distinction
                projectTitle: project.title,
                clientEmail: cleanEmail, 
                items: invoiceItems,
                amount: grandTotal, 
                status: isReceiptMode ? "Paid" : "Pending", // Receipt is always paid
                date: today, 
                createdAt: serverTimestamp()
            });

            // 2. TRIGGER FIREBASE EMAIL EXTENSION
            // Writes to 'mail' collection. Requires 'Trigger Email' extension installed.
            await addDoc(collection(db, "mail"), {
                to: cleanEmail,
                message: {
                    subject: isReceiptMode ? `Payment Receipt: ${docId}` : `New Invoice: ${docId}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: ${isReceiptMode ? '#00a86b' : '#E31E24'};">
                                ${isReceiptMode ? 'Payment Receipt' : 'Invoice Due'}
                            </h2>
                            <p><strong>Project:</strong> ${project.title}</p>
                            <p><strong>Date:</strong> ${today}</p>
                            <p><strong>Total:</strong> $${grandTotal.toLocaleString()}</p>
                            <br>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background: #f4f4f4;">
                                    <th style="padding: 8px; text-align: left;">Item</th>
                                    <th style="padding: 8px; text-align: right;">Price</th>
                                    <th style="padding: 8px; text-align: center;">Qty</th>
                                    <th style="padding: 8px; text-align: right;">Total</th>
                                </tr>
                                ${emailItemsHtml}
                            </table>
                            <br>
                            <a href="${window.location.origin}/html/client-dashboard.html" 
                               style="background: #333; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                               View in Dashboard
                            </a>
                        </div>
                    `
                }
            });

            alert(`${isReceiptMode ? 'Receipt' : 'Invoice'} Published & Email Triggered!`);
            modal.style.display = "none";
            invoiceItems = []; 
        } catch (err) {
            console.error("Error:", err);
            alert("Error: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Confirm & Publish";
        }
    };

    document.getElementById("cancelInvoice").onclick = () => { modal.style.display = "none"; };
}

/* ===============================
   5. LISTENERS
================================ */
function loadMessages(projectId) {
    const container = document.getElementById("projectMessages");
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    messagesListener = onSnapshot(q, snap => {
        container.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const div = document.createElement("div");
            div.className = `message-bubble ${m.fromRole === 'admin' ? 'sent' : 'received'}`;
            div.textContent = m.message;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

function startAdminPaymentsListener() {
    const list = document.getElementById("adminPaymentsList");
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    adminPaymentsUnsub = onSnapshot(q, snap => {
        list.innerHTML = snap.empty ? `<div class="glass-card">No records found.</div>` : "";
        snap.forEach(d => {
            const data = d.data();
            const isReceipt = data.type === 'receipt';
            const card = document.createElement("div");
            card.className = "glass-card";
            card.style.marginBottom = "10px";
            card.style.borderLeft = isReceipt ? "4px solid #00ffc3" : "4px solid #FF3B30";
            card.innerHTML = `
                <strong>${data.invoiceId}</strong> 
                <span style="float:right; color:${isReceipt ? '#00ffc3' : '#FF3B30'}">$${data.amount}</span>
                <br> <small style="opacity:0.6;">${data.clientEmail} | ${data.date}</small>
            `;
            list.appendChild(card);
        });
    });
}

function startAdminInboxListener() {
    const list = document.getElementById("adminInboxList");
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    adminInboxListener = onSnapshot(q, snap => {
        list.innerHTML = snap.empty ? `<div class="glass-card">Inbox is empty.</div>` : "";
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const item = document.createElement("div");
            item.className = "glass-card";
            item.style.marginBottom = "10px";
            if(!m.read && m.fromRole !== "admin") item.style.borderLeft = "4px solid #00ffc3";
            item.innerHTML = `<h4>${m.fromRole === "admin" ? "Sent" : "Client Message"}</h4><p>${m.message}</p>`;
            item.onclick = () => {
                openProjectEditor(m.projectId);
                if(!m.read && m.fromRole !== "admin") updateDoc(doc(db, "messages", docSnap.id), { read: true });
            };
            list.appendChild(item);
        });
    });
}

// Global Status Toggles
const statusInd = document.getElementById("adminStatusIndicator");
onSnapshot(doc(db, "config", "adminStatus"), (snap) => {
    if (snap.exists() && statusInd) {
        statusInd.style.background = snap.data().online ? "#00ffc3" : "#ff3b30";
        statusInd.style.boxShadow = snap.data().online ? "0 0 10px #00ffc3" : "0 0 10px #ff3b30";
    }
});

const statusBtn = document.getElementById("toggleStatusBtn");
if(statusBtn) {
    statusBtn.onclick = async () => {
        const snap = await getDoc(doc(db, "config", "adminStatus"));
        if (snap.exists()) await updateDoc(doc(db, "config", "adminStatus"), { online: !snap.data().online });
    };
}