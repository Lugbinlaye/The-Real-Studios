console.log("Admin Dashboard JS: Branding Updated & PDF Fixed");

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
let clientProfileUnsub = null;

// Financial Builder State
let invoiceItems = []; 
let isReceiptMode = false; 

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
        if (clientProfileUnsub) clientProfileUnsub();

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
   2. PROJECT EDITOR (Updated for Name Capture)
================================ */
function openProjectEditor(projectId) {
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
    document.getElementById("projectDetails").classList.add("active");

    const container = document.getElementById("adminDetailsContent");
    container.innerHTML = "Fetching project data...";

    if (clientStatusUnsub) clientStatusUnsub();
    if (clientProfileUnsub) clientProfileUnsub();

    // Variable to hold the real client name
    let currentClientName = "Valued Client"; 

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

            <div class="glass-card" style="margin-bottom: 20px; border-left: 4px solid var(--primary);">
                <h4 style="margin-bottom:10px; color:var(--primary);">Client Profile</h4>
                <div id="clientProfileData" style="font-size: 0.9rem; line-height: 1.6; opacity:0.8;">Loading info...</div>
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

        // 1. FETCH CLIENT INFO (Capture Name Here)
        clientProfileUnsub = onSnapshot(doc(db, "users", p.userId), (userSnap) => {
            const profileBox = document.getElementById("clientProfileData");
            if (userSnap.exists() && profileBox) {
                const u = userSnap.data();
                
                // Set the name variable
                currentClientName = u.name || u.fullName || p.userEmail.split('@')[0];

                profileBox.innerHTML = `
                    <strong>Name:</strong> ${currentClientName} <br>
                    <strong>Email:</strong> ${u.email} <br>
                    <strong>Phone:</strong> ${u.phone || "N/A"} <br>
                    <strong>Joined:</strong> ${u.createdAt ? u.createdAt.toDate().toLocaleDateString() : "Unknown"}
                `;

                // Update Presence Dot
                const dot = document.getElementById("clientStatusDot");
                const text = document.getElementById("clientStatusText");
                const lastSeen = u.lastSeen ? u.lastSeen.toDate() : null;
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

        // 2. SETUP BUILDER UI & TOGGLES
        renderInvoiceBuilderRows();
        setupBuilderToggles();

        // 3. EVENT HANDLERS
        document.getElementById("addItemBtn").onclick = () => {
            invoiceItems.push({ desc: "", price: 0, qty: 1 });
            renderInvoiceBuilderRows();
        };

        // Pass clientName to the preview function
        document.getElementById("previewInvoiceBtn").onclick = () => showInvoicePreview(p, projectId, currentClientName);

        document.getElementById("backToProjects").onclick = () => {
            invoiceItems = []; 
            if (clientStatusUnsub) clientStatusUnsub(); 
            if (clientProfileUnsub) clientProfileUnsub();
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

            // Basic presence check for email notification
            let isClientOnline = false;
            try {
                const u = await getDoc(doc(db, "users", p.userId));
                if (u.exists() && u.data().lastSeen && (new Date() - u.data().lastSeen.toDate())/1000 < 120) isClientOnline = true;
            } catch(e){}

            if(!isClientOnline) {
                 const templateParams = {
                    client_name: currentClientName, 
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
            btnRec.style.background = "#00ffc3"; btnRec.style.color = "#000";
            btnInv.style.background = "transparent"; btnInv.style.color = "#fff";
            title.textContent = "Receipt Builder"; title.style.color = "#00ffc3";
            card.style.borderColor = "#00ffc3"; card.style.background = "rgba(0,255,195,0.05)";
            total.style.color = "#00ffc3";
            actionBtn.style.background = "#00ffc3"; actionBtn.textContent = "Preview Receipt";
        } else {
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
   4. PREVIEW & PUBLISH (Branding Update)
================================ */
function showInvoicePreview(project, projectId, clientName) {
    const modal = document.getElementById("invoiceModal");
    const idPrefix = isReceiptMode ? "RCPT" : "INV";
    const docId = `${idPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const cleanEmail = (project.userEmail || "").trim().toLowerCase();

    const modalTitle = document.querySelector("#invoiceModal h2");
    if(modalTitle) modalTitle.textContent = isReceiptMode ? "Confirm Receipt" : "Confirm Invoice";
    
    document.getElementById("previewInvoiceId").textContent = docId;
    document.getElementById("previewClientName").textContent = clientName.toUpperCase(); // Display Name
    document.getElementById("previewClientEmail").textContent = cleanEmail;
    document.getElementById("previewDate").textContent = today;

    const tableBody = document.getElementById("previewTableBody");
    tableBody.innerHTML = "";
    let grandTotal = 0;
    
    let emailItemsHtml = "";

    invoiceItems.forEach((item) => {
        const rowTotal = item.price * item.qty;
        grandTotal += rowTotal;
        
        tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px;">${item.desc}</td>
                <td style="text-align: right;">$${item.price.toLocaleString()}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: right; color:${isReceiptMode ? '#00ffc3' : '#E31E24'};">$${rowTotal.toLocaleString()}</td>
            </tr>
        `;

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

    document.getElementById("confirmInvoice").onclick = async () => {
        const btn = document.getElementById("confirmInvoice");
        btn.disabled = true;
        btn.textContent = "Publishing...";

        try {
            await addDoc(collection(db, "invoices"), {
                invoiceId: docId, 
                projectId, 
                type: isReceiptMode ? "receipt" : "invoice",
                projectTitle: project.title,
                clientEmail: cleanEmail,
                clientName: clientName, // Save name to DB
                items: invoiceItems,
                amount: grandTotal, 
                status: isReceiptMode ? "Paid" : "Pending",
                date: today, 
                createdAt: serverTimestamp()
            });

            // Trigger Email (Branding Updated)
            await addDoc(collection(db, "mail"), {
                to: cleanEmail,
                message: {
                    subject: isReceiptMode ? `Receipt from THE REAL STUDIOS: ${docId}` : `Invoice from THE REAL STUDIOS: ${docId}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: ${isReceiptMode ? '#00a86b' : '#E31E24'};">THE REAL STUDIOS</h2>
                            <p>Hi ${clientName}, here is your ${isReceiptMode ? 'receipt' : 'invoice'} details:</p>
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

            alert(`${isReceiptMode ? 'Receipt' : 'Invoice'} Published!`);
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
   5. LISTENERS & BRANDED DOWNLOADABLE MODAL
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
            const color = isReceipt ? "#00ffc3" : "#FF3B30";
            
            const card = document.createElement("div");
            card.className = "glass-card";
            card.style.marginBottom = "10px";
            card.style.borderLeft = `4px solid ${color}`;
            card.style.cursor = "pointer"; 
            
            card.innerHTML = `
                <strong>${data.invoiceId}</strong> 
                <span style="float:right; color:${color}">$${data.amount.toLocaleString()}</span>
                <br> <small style="opacity:0.6;">${data.clientName || data.clientEmail}</small>
            `;
            
            // OPEN BRANDED MODAL
            card.onclick = () => openAdminInvoiceModal(data);
            
            list.appendChild(card);
        });
    });
}

// *** NEW BRANDED MODAL & IFRAME DOWNLOAD ***
function openAdminInvoiceModal(data) {
    const isReceipt = data.type === 'receipt';
    const themeColor = isReceipt ? '#00ffc3' : '#FF3B30';
    const title = isReceipt ? 'OFFICIAL RECEIPT' : 'INVOICE';
    // Use saved name or fallback to email
    const clientName = data.clientName || data.clientEmail.split('@')[0];

    const modal = document.createElement("div");
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); display:flex; justify-content:center; align-items:center; z-index:9999;`;

    // Modal HTML (Dark Theme for Screen)
    modal.innerHTML = `
        <div style="background:#121212; color:#fff; width:90%; max-width:500px; padding:30px; border-radius:12px; border-top:5px solid ${themeColor}; box-shadow:0 20px 50px rgba(0,0,0,0.5); font-family:sans-serif;">
            <button class="close-btn" style="float:right; background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="color:${themeColor}; margin:0; letter-spacing:2px;">${title}</h2>
                <div style="opacity:0.6; font-size:0.9rem;">#${data.invoiceId} &bull; ${data.date}</div>
            </div>
            
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin-bottom:20px;">
                <div style="font-size:0.8rem; opacity:0.7;">BILLED TO:</div>
                <div style="font-size:1.1rem; font-weight:bold; text-transform:capitalize;">${clientName}</div>
                <div style="font-size:0.9rem;">${data.clientEmail}</div>
                
                <div style="font-size:0.8rem; opacity:0.7; margin-top:10px;">FROM:</div>
                <div style="font-weight:bold;">THE REAL STUDIOS</div>
            </div>
            
            <div>
                ${(data.items || []).map(i => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <span>${i.desc} (x${i.qty})</span>
                        <span>$${(i.price * i.qty).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-top:20px; font-weight:bold; font-size:1.2rem; border-top:2px dashed #444; padding-top:10px;">
                <span>TOTAL</span>
                <span style="color:${themeColor}">$${data.amount.toLocaleString()}</span>
            </div>
            
            <button id="downloadPdfBtn" style="background:${themeColor}; color:#000; width:100%; padding:15px; border:none; border-radius:8px; font-weight:bold; margin-top:25px; cursor:pointer;">DOWNLOAD PDF</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".close-btn").onclick = () => modal.remove();
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };

    // IFRAME PRINT LOGIC (Clean White Paper Style)
    modal.querySelector("#downloadPdfBtn").onclick = () => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.write(`
            <html>
            <head>
                <title>${title}_${data.invoiceId}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; color: #000; }
                    .box { border-top: 5px solid ${themeColor}; padding-top: 20px; }
                    h1 { margin: 0; }
                    .grid { display: flex; justify-content: space-between; margin: 30px 0; }
                    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .total { font-weight: bold; font-size: 1.2em; display: flex; justify-content: space-between; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="box">
                    <center>
                        <h1>THE REAL STUDIOS</h1>
                        <h2 style="color:${themeColor}">${title}</h2>
                        <p>#${data.invoiceId} &bull; ${data.date}</p>
                    </center>
                    <div class="grid">
                        <div>
                            <strong>BILLED TO:</strong><br>
                            <span style="font-size:1.2em">${clientName}</span><br>
                            ${data.clientEmail}
                        </div>
                        <div style="text-align:right;">
                            <strong>PROJECT:</strong><br>
                            ${data.projectTitle || 'Service'}<br>
                            Status: ${data.status}
                        </div>
                    </div>
                    <div>
                        ${(data.items || []).map(i => `
                            <div class="row">
                                <span>${i.desc} (x${i.qty})</span>
                                <span>$${(i.price * i.qty).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="total">
                        <span>TOTAL</span>
                        <span style="color:${themeColor}">$${data.amount.toLocaleString()}</span>
                    </div>
                </div>
            </body>
            </html>
        `);
        doc.close();
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
        }, 500);
    };
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