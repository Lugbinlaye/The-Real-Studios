console.log("Client Dashboard JS - Self-Repairing Payment Version");

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
  onSnapshot,
  doc,
  getDoc,
  setDoc, 
  updateDoc,
  serverTimestamp,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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
const storage = getStorage(app);

/* ===============================
   GLOBAL STATE
================================ */
let currentUserId = null;
let projectsUnsub = null;
let messagesUnsub = null;
let inboxUnsub = null;
let paymentsUnsub = null; 
let profileUnsub = null;
let isAdminOnline = false;

// ⚠️ Admin UID
const ADMIN_UID = "aMXaGE0upecbXpdhR6t6qQEMDLH3"; 

/* ===============================
   AUTH STATE & ONBOARDING AUTOMATION
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../html/sign-in.html";
    return;
  }
  currentUserId = user.uid;

  // 1. Start Presence
  startPresenceHeartbeat(user.uid);

  // 2. NEW CLIENT AUTOMATION (First Time Login Check)
  checkAndWelcomeNewClient(user);

  // 3. UI Updates
  let realName = user.displayName;
  if (!realName) {
      try {
          const userSnap = await getDoc(doc(db, "users", currentUserId));
          if (userSnap.exists()) realName = userSnap.data().name;
      } catch (error) {}
  }
  const finalDisplayName = realName || user.email.split("@")[0];
  const homeWelcomeEl = document.getElementById("homeWelcome");
  if (homeWelcomeEl) homeWelcomeEl.textContent = `Welcome, ${finalDisplayName}`;

  if (document.getElementById("projects")?.classList.contains("active")) {
    startProjectsListener();
  }
});

/* ===============================
   AUTOMATION LOGIC (UPDATED LINKS)
================================ */
async function checkAndWelcomeNewClient(user) {
    const userRef = doc(db, "users", user.uid);
    
    try {
        const userSnap = await getDoc(userRef);
        
        // If user doesn't exist OR hasn't been welcomed yet
        if (!userSnap.exists() || !userSnap.data().welcomeSent) {
            
            console.log("New Client Detected: Triggering Welcome Sequence...");

            // A. Update User Profile (Mark as Welcomed)
            await setDoc(userRef, { 
                email: user.email, 
                name: user.displayName || user.email.split('@')[0],
                lastSeen: serverTimestamp(),
                welcomeSent: true, // Prevents re-running
                createdAt: serverTimestamp()
            }, { merge: true });

            // B. Send Automatic Chat Message (From Admin)
            await addDoc(collection(db, "messages"), {
                projectId: "onboarding", // Special ID for general messages
                fromUserId: ADMIN_UID,
                fromRole: "admin",
                toUserId: user.uid,
                message: "Welcome to The Real Studios! 🚀 I'm here to bring your vision to life. Feel free to start a new project or ask me anything here.",
                read: false,
                createdAt: serverTimestamp()
            });

            // C. Send Emails via EmailJS (FIXED BUTTON LINKS)
            
            // 1. Welcome Email to Client -> Links to Client Dashboard
            emailjs.send("service_j1o66n8", "template_pw0rthm", {
                user_name: user.displayName || "Valued Client",
                user_email: user.email,
                project_title: "Welcome to The Real Studios", 
                message: "Thank you for joining. Your dashboard is ready! Click the button below to access your account.",
                to_email: user.email,
                // We pass the dashboard URL to both common variable names to ensure the button catches it
                brief_url: window.location.origin + "/html/client-dashboard.html",
                dashboard_link: window.location.origin + "/html/client-dashboard.html" 
            });

            // 2. Urgent Alert to Admin -> Links to Admin Dashboard
            emailjs.send("service_j1o66n8", "template_pw0rthm", {
                user_name: "System Alert", 
                user_email: "system@therealstudios.art",
                project_title: "🔥 NEW CLIENT SIGNED UP", 
                message: `URGENT: A new client has just confirmed email and logged in.\n\nName: ${user.displayName}\nEmail: ${user.email}`,
                to_email: "paulolugbenga@therealstudios.art",
                // Admin Dashboard Link
                brief_url: window.location.origin + "/html/admin-dashboard.html",
                dashboard_link: window.location.origin + "/html/admin-dashboard.html"
            });
        }
    } catch (e) {
        console.error("Automation Error:", e);
    }
}

/* ===============================
   PRESENCE HEARTBEAT
================================ */
function startPresenceHeartbeat(uid) {
    const userRef = doc(db, "users", uid);
    const update = async () => {
        try {
            await setDoc(userRef, { 
                lastSeen: serverTimestamp(),
                email: auth.currentUser.email 
            }, { merge: true });
        } catch (e) {}
    };
    update(); 
    setInterval(update, 60 * 1000); 
}

/* ===============================
   NAVIGATION
================================ */
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

    stopAllListeners();

    if (btn.dataset.section === "projects") startProjectsListener();
    if (btn.dataset.section === "inbox") startInboxListener();
    if (btn.dataset.section === "payments") startPaymentsListener(); 
    if (btn.dataset.section === "profile") loadUserProfile(); 
  });
});

/* ===============================
   PROFILE SYSTEM
================================ */
async function loadUserProfile() {
    const container = document.getElementById("profileContent");
    if(!container) return;
    container.innerHTML = `<div class="glass-card" style="text-align:center;">Loading your profile...</div>`;

    const userRef = doc(db, "users", currentUserId);
    
    // Stats Fetch
    const projectsQuery = query(collection(db, "projects"), where("userId", "==", currentUserId));
    const invoicesQuery = query(collection(db, "invoices"), where("clientEmail", "==", auth.currentUser.email));
    
    let totalProjects = 0;
    let totalSpent = 0;
    
    try {
        const [projectsSnap, invoicesSnap] = await Promise.all([getDocs(projectsQuery), getDocs(invoicesQuery)]);
        totalProjects = projectsSnap.size;
        invoicesSnap.forEach(doc => { const data = doc.data(); if(data.type === 'receipt') totalSpent += (data.amount || 0); });
    } catch(e) { console.error("Stats Error:", e); }

    profileUnsub = onSnapshot(userRef, (docSnap) => {
        const userData = docSnap.exists() ? docSnap.data() : {};
        const name = userData.name || userData.fullName || auth.currentUser.displayName || "No Name Set";
        const email = auth.currentUser.email;
        const phone = userData.phone || "";
        const company = userData.company || "";
        const avatarLetter = name.charAt(0).toUpperCase();

        container.innerHTML = `
            <div class="glass-card">
                <div class="profile-header">
                    <div class="profile-avatar">${avatarLetter}</div>
                    <div>
                        <h2 style="margin:0;">${name}</h2>
                        <span style="opacity:0.6; font-size:0.9rem;">${email}</span>
                        <div style="margin-top:5px;"><span class="status-badge status-active">Client Account</span></div>
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value">${totalProjects}</div><div class="stat-label">Total Projects</div></div>
                    <div class="stat-card"><div class="stat-value" style="color:#00ffc3;">$${totalSpent.toLocaleString()}</div><div class="stat-label">Total Invested</div></div>
                    <div class="stat-card"><div class="stat-value">Active</div><div class="stat-label">Account Status</div></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">Personal Details</h3>
                    <button id="editProfileBtn" class="glass-btn" style="font-size:0.8rem;">✎ Edit Details</button>
                </div>
                <form id="profileForm">
                    <div class="profile-form-grid">
                        <div class="form-group"><label>Full Name</label><input type="text" id="pName" value="${name}" disabled></div>
                        <div class="form-group"><label>Company / Brand</label><input type="text" id="pCompany" value="${company}" placeholder="e.g. The Real Studios" disabled></div>
                        <div class="form-group"><label>Phone Number</label><input type="tel" id="pPhone" value="${phone}" placeholder="+1 234..." disabled></div>
                        <div class="form-group"><label>Email Address</label><input type="email" value="${email}" disabled style="opacity:0.5; cursor:not-allowed;"></div>
                    </div>
                    <div id="saveContainer" style="margin-top:20px; text-align:right; display:none;">
                         <button type="button" id="cancelEditBtn" class="glass-btn" style="margin-right:10px;">Cancel</button>
                         <button type="submit" class="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;

        const form = document.getElementById("profileForm");
        const editBtn = document.getElementById("editProfileBtn");
        const saveContainer = document.getElementById("saveContainer");
        const cancelBtn = document.getElementById("cancelEditBtn");
        const inputs = [document.getElementById("pName"), document.getElementById("pCompany"), document.getElementById("pPhone")];

        editBtn.onclick = () => {
            inputs.forEach(i => i.disabled = false);
            inputs[0].focus();
            editBtn.style.display = "none";
            saveContainer.style.display = "block";
        };

        cancelBtn.onclick = () => {
            inputs.forEach(i => { i.disabled = true; i.value = i.defaultValue; }); 
            editBtn.style.display = "block";
            saveContainer.style.display = "none";
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = saveContainer.querySelector(".btn-primary");
            btn.textContent = "Saving...";
            try {
                await setDoc(userRef, {
                    name: document.getElementById("pName").value,
                    company: document.getElementById("pCompany").value,
                    phone: document.getElementById("pPhone").value,
                    email: email, 
                    updatedAt: serverTimestamp()
                }, { merge: true });
                alert("Profile Updated Successfully!");
            } catch(err) {
                console.error(err);
                alert("Failed to update profile.");
                btn.textContent = "Save Changes";
            }
        };
    });
}

/* ===============================
   PROJECT SUBMISSION
================================ */
const dashboardForm = document.getElementById("dashboardForm");
dashboardForm?.addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUserId) return;

  const title = dashboardForm.projectName.value.trim();
  const type = dashboardForm.projectType.value;
  const description = dashboardForm.projectDescription.value.trim();
  const file = dashboardForm.projectBrief.files[0];

  if (!title || !type || !description || !file) {
    alert("Please complete all fields.");
    return;
  }

  const btn = dashboardForm.querySelector("button[type='submit']");
  const originalText = btn.textContent;
  btn.textContent = "Uploading...";
  btn.style.background = "#999"; 
  btn.disabled = true;

  try {
    const fileRef = ref(storage, `briefs/${currentUserId}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    await addDoc(collection(db, "projects"), {
      userId: currentUserId,
      userEmail: auth.currentUser.email,
      title,
      type,
      description,
      fileURL,
      status: "Pending",
      progress: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("Project submitted successfully! 🚀");
    dashboardForm.reset();
    document.querySelector('[data-section="projects"]').click();
  } catch (err) {
    console.error(err);
    alert("Submission failed.");
  } finally {
    btn.textContent = originalText;
    btn.style.background = ""; 
    btn.disabled = false;
  }
});

/* ===============================
   PROJECTS LISTENER
================================ */
function startProjectsListener() {
  const list = document.getElementById("projectsList");
  if (!list || !currentUserId) return;
  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading projects...</div>`;

  const q = query(
    collection(db, "projects"),
    where("userId", "==", currentUserId),
    orderBy("createdAt", "desc")
  );

  projectsUnsub = onSnapshot(q, snap => {
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = `<div class="glass-card" style="text-align:center;">No projects found. <br><br> Start by creating a new one!</div>`;
      return;
    }
    snap.forEach(docSnap => {
      const p = docSnap.data();
      const card = document.createElement("div");
      card.className = "glass-card project-card";
      let badgeClass = "status-active";
      if(p.status === "Pending") badgeClass = "status-pending";
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start;">
            <h3 style="margin-top:0;">${p.title}</h3>
            <span class="status-badge ${badgeClass}">${p.type}</span>
        </div>
        <p style="margin-bottom:5px; color:#ccc;">Status: <strong style="color: #FF3B30;">${p.status}</strong></p>
        <div class="progress-bar">
          <div class="progress" style="width:${p.progress || 0}%;"></div>
        </div>
      `;
      card.onclick = () => openProjectDetails(docSnap.id);
      list.appendChild(card);
    });
  });
}

/* ===============================
   PAYMENTS & INVOICES (FIXED)
================================ */
function startPaymentsListener() {
  const list = document.getElementById("paymentsList");
  if (!list || !currentUserId) return;
  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading financial history...</div>`;

  const q = query(
    collection(db, "invoices"),
    where("clientEmail", "==", auth.currentUser.email),
    orderBy("createdAt", "desc")
  );

  paymentsUnsub = onSnapshot(q, (snap) => {
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = `<div class="glass-card" style="text-align:center;">No transaction history found.</div>`;
      return;
    }

    snap.forEach(docSnap => {
      // 🟢 ID FIX: Securely capture the document ID
      const data = { id: docSnap.id, ...docSnap.data() };
      
      const isReceipt = data.type === 'receipt';
      const card = document.createElement("div");
      card.className = "glass-card project-card";
      card.style.cursor = "pointer"; 
      
      const statusColor = isReceipt ? '#00ffc3' : '#FF3B30';
      const statusBg = isReceipt ? 'rgba(0, 255, 195, 0.2)' : 'rgba(255, 59, 48, 0.2)';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start;">
            <h3 style="margin-top:0; color:${statusColor};">${isReceipt ? 'Receipt' : 'Invoice'}: ${data.invoiceId}</h3>
            <span class="status-badge" style="background: ${statusBg}; color: ${statusColor}; border:1px solid ${statusColor};">
                ${data.status}
            </span>
        </div>
        <p style="margin: 10px 0;">Amount: <strong style="font-size: 1.2rem; color: #fff;">$${(data.amount || 0).toLocaleString()}</strong></p>
        <div style="display:flex; justify-content:space-between; opacity:0.6; font-size:0.85rem;">
            <span>Project: ${data.projectTitle || 'N/A'}</span>
            <span>Date: ${data.date}</span>
        </div>
      `;
      card.onclick = () => openInvoiceModal(data);
      list.appendChild(card);
    });
  });
}

/* ===============================
   INVOICE MODAL (AUTO-HEALING PAYMENT)
================================ */
function openInvoiceModal(data) {
    const isReceipt = data.type === 'receipt';
    const isPaid = data.status === 'Paid';
    const themeColor = isPaid || isReceipt ? '#00ffc3' : '#FF3B30';
    const title = isReceipt ? 'OFFICIAL RECEIPT' : 'INVOICE';
    const displayName = data.clientName || data.clientEmail.split('@')[0];

    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
        display: flex; justify-content: center; align-items: center; z-index: 9999;
    `;

    const itemsHtml = (data.items || []).map(item => `
        <div style="display:flex; justify-content:space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: inherit;">
            <span style="opacity:0.9;">${item.desc} <span style="opacity:0.5; font-size:0.9em;">(x${item.qty})</span></span>
            <span style="font-weight:500;">$${((item.price * item.qty) || 0).toLocaleString()}</span>
        </div>
    `).join("");

    const showPayButton = !isReceipt && data.status !== 'Paid';

    modal.innerHTML = `
        <div class="invoice-box" id="invoiceCard">
            <style>
                .invoice-box {
                    background: #121212; color: #fff; width: 90%; max-width: 500px;
                    padding: 40px; border-radius: 16px; position: relative;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-top: 5px solid ${themeColor};
                    font-family: sans-serif;
                }
                .btn-download {
                    background: transparent; color: #fff; width: 100%; padding: 15px;
                    border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-weight: bold; font-size: 1rem;
                    margin-top: 10px; cursor: pointer; transition:0.3s;
                }
                .btn-download:hover { background: rgba(255,255,255,0.05); }
                
                .btn-pay {
                    background: #00ffc3; color: #000; width: 100%; padding: 15px;
                    border: none; border-radius: 8px; font-weight: bold; font-size: 1rem;
                    margin-top: 25px; cursor: pointer; box-shadow: 0 0 15px rgba(0,255,195,0.3);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 255, 195, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(0, 255, 195, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 255, 195, 0); } }
                
                .close-btn { position: absolute; top: 15px; right: 20px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
            </style>

            <button class="close-btn">&times;</button>
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: ${themeColor}; margin: 0; font-size: 1.8rem; letter-spacing: 2px;">${title}</h2>
                <div style="opacity: 0.5; font-size: 0.9rem; margin-top: 5px;">ID: ${data.invoiceId} &bull; ${data.date}</div>
            </div>

            <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size:0.9rem; opacity:0.7; margin-bottom:5px;">BILLED TO:</div>
                <div style="font-size:1.2rem; font-weight:bold; text-transform:capitalize;">${displayName}</div>
                <div style="font-size:0.85rem; opacity:0.5;">${data.clientEmail}</div>
                
                <div style="font-size:0.9rem; opacity:0.7; margin-top:15px; margin-bottom:5px;">FROM:</div>
                <div style="font-size:1.1rem; font-weight:bold;">THE REAL STUDIOS</div>
            </div>

            <div>${itemsHtml}</div>

            <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 20px; border-top: 2px dashed rgba(255,255,255,0.2); font-size: 1.4rem; font-weight: bold;">
                <span>TOTAL</span>
                <span style="color:${themeColor};">$${(data.amount || 0).toLocaleString()}</span>
            </div>

            ${showPayButton ? `<button class="btn-pay" id="paystackBtn">💳 PAY NOW ($${(data.amount || 0).toLocaleString()})</button>` : ''}
            <button class="btn-download">DOWNLOAD PDF ⬇</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".close-btn").onclick = () => modal.remove();
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };

    // PDF Handler
    modal.querySelector(".btn-download").onclick = () => {
        printInvoicePDF(data, title, themeColor, displayName);
    };

    // 🟢 SELF-REPAIRING PAYSTACK LOGIC
    if (showPayButton) {
        // Define the transaction function so we can reuse it
        const startTransaction = () => {
             const handler = PaystackPop.setup({
                // 🔴 REPLACE THIS WITH YOUR PUBLIC KEY
                key: 'pk_test_09f7552d396b6866b64ba9b6350721ee4ea0952b', 
                email: data.clientEmail,
                amount: (data.amount || 0) * 100, // Paystack in Kobo
                currency: "NGN", // Using NGN (Naira) for better success rate in Nigeria
                ref: ''+Math.floor((Math.random() * 1000000000) + 1),
                metadata: {
                    custom_fields: [{ display_name: "Invoice ID", variable_name: "invoice_id", value: data.invoiceId }]
                },
                callback: async function(response) {
                    const btn = document.getElementById("paystackBtn");
                    btn.textContent = "Processing...";
                    btn.disabled = true;
                    try {
                        await updateDoc(doc(db, "invoices", data.id), {
                            status: "Paid", type: "receipt", paidAt: serverTimestamp(), paymentRef: response.reference
                        });
                        emailjs.send("service_j1o66n8", "template_pw0rthm", {
                            user_name: "System Payment", user_email: "payments@therealstudios.art",
                            project_title: `PAYMENT RECEIVED: ${data.invoiceId}`, 
                            message: `Client ${displayName} has paid $${data.amount}. Ref: ${response.reference}`,
                            to_email: "paulolugbenga@therealstudios.art"
                        });
                        alert("Payment Successful! Refreshing...");
                        modal.remove();
                    } catch(err) {
                        console.error("Payment DB Error: ", err);
                        alert("Payment received but database update failed.");
                    }
                },
                onClose: function() { alert('Transaction cancelled.'); }
            });
            handler.openIframe();
        };

        modal.querySelector("#paystackBtn").onclick = () => {
            // Check if Paystack is loaded. If not, load it instantly.
            if (typeof PaystackPop === 'undefined') {
                const btn = document.getElementById("paystackBtn");
                const oldText = btn.textContent;
                btn.textContent = "Securing Connection...";
                btn.disabled = true;
                
                const script = document.createElement('script');
                script.src = 'https://js.paystack.co/v1/inline.js';
                script.onload = () => {
                    btn.textContent = oldText;
                    btn.disabled = false;
                    startTransaction(); // Start immediately after loading
                };
                script.onerror = () => {
                    alert("Could not connect to payment gateway. Please check your internet.");
                    btn.textContent = oldText;
                    btn.disabled = false;
                };
                document.head.appendChild(script);
            } else {
                startTransaction();
            }
        };
    }
}

// PDF Printer Helper
function printInvoicePDF(data, title, themeColor, displayName) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
        <head>
            <title>${title}_${data.invoiceId}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; color: #000; }
                .box { border-top: 5px solid ${themeColor}; padding-top: 20px; }
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
                        <span style="font-size:1.2em">${displayName}</span><br>
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
                            <span>$${((i.price * i.qty) || 0).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="total">
                    <span>TOTAL</span>
                    <span style="color:${themeColor}">$${(data.amount || 0).toLocaleString()}</span>
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
}

/* ===============================
   PROJECT DETAILS & CHAT
================================ */
async function openProjectDetails(projectId) {
  if (!currentUserId) return;
  document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
  document.getElementById("projectDetails").classList.add("active");
  const container = document.getElementById("projectDetailsContent");
  container.innerHTML = "Loading project details...";

  const docRef = doc(db, "projects", projectId);
  
  onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        container.innerHTML = "Project not found.";
        return;
      }
      const p = snap.data();
      container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px;">
             <button id="backBtn" class="glass-btn">← Back</button>
             <h2 style="margin:0; text-shadow: 0 0 10px rgba(255,59,48,0.4);">${p.title}</h2>
             <a href="${p.fileURL}" target="_blank" class="glass-btn" style="font-size:0.8rem;">Brief ⬇</a>
        </div>
        <div class="glass-card" style="margin-bottom: 25px;">
             <p style="opacity:0.8; margin-bottom:15px; line-height:1.6;">${p.description}</p>
             <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Status: <strong style="color:#FF3B30; text-transform:uppercase; letter-spacing:1px;">${p.status}</strong></span>
                <span>${p.progress}% Complete</span>
             </div>
             <div class="progress-container">
                <div class="progress-fill" style="width:${p.progress || 0}%;"></div>
             </div>
        </div>
        <div class="chat-container">
            <div class="chat-header">
                <div class="avatar-circle">🤖</div>
                <div>
                    <div style="font-weight:600;">Admin Support</div>
                    <div id="adminStatusDisplay" style="font-size:0.8rem; display:flex; align-items:center; gap:5px;">
                        <span class="status-dot"></span> 
                        <span id="statusText">Checking...</span>
                    </div>
                </div>
            </div>
            <div id="messagesContainer" class="chat-body"></div>
            <div class="chat-footer">
                <input type="text" id="clientMessageInput" placeholder="Type your message..." autocomplete="off">
                <button id="sendClientMsgBtn" class="send-btn">➤</button>
            </div>
        </div>
      `;

      onSnapshot(doc(db, "config", "adminStatus"), (statusSnap) => {
          if (statusSnap.exists()) {
              isAdminOnline = statusSnap.data().online;
              const dot = container.querySelector(".status-dot");
              const text = container.querySelector("#statusText");
              if (dot && text) {
                if (isAdminOnline) {
                    dot.style.background = "#00ffc3"; dot.style.boxShadow = "0 0 8px #00ffc3";
                    text.textContent = "Online"; text.style.color = "#00ffc3";
                } else {
                    dot.style.background = "#ff3b30"; dot.style.boxShadow = "0 0 8px #ff3b30";
                    text.textContent = "Away"; text.style.color = "#ff3b30";
                }
              }
          }
      });

      document.getElementById("backBtn").onclick = () => {
        document.getElementById("projects").classList.add("active");
        document.getElementById("projectDetails").classList.remove("active");
        if(messagesUnsub) messagesUnsub();
      };

      startChatListener(projectId);
      const sendBtn = document.getElementById("sendClientMsgBtn");
      const input = document.getElementById("clientMessageInput");
      sendBtn.onclick = () => sendMessage(projectId, input, p);
      input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(projectId, input, p); });
  });
}

async function sendMessage(projectId, input, projectData) {
    const text = input.value.trim();
    if (!text) return;
    try {
        await addDoc(collection(db, "messages"), {
          projectId, fromUserId: currentUserId, fromRole: "client",
          toUserId: ADMIN_UID, message: text, read: false, createdAt: serverTimestamp()
        });
        input.value = ""; 
        if (!isAdminOnline) {
            setTimeout(async () => {
                await addDoc(collection(db, "messages"), {
                    projectId, fromUserId: "SYSTEM", fromRole: "admin", toUserId: currentUserId,
                    message: "Admin is offline. Message sent via email.", read: true, isAutoReply: true, createdAt: serverTimestamp()
                });
            }, 1000); 

            // EMAILJS FOR CHAT (Kept separate as per request)
            emailjs.send("service_j1o66n8", "template_pw0rthm", {
                user_name: auth.currentUser.displayName, user_email: auth.currentUser.email,
                project_title: projectData.title, message: text, to_email: "paulolugbenga@therealstudios.art"
            });
        }
    } catch (e) { console.error("Message failed:", e); }
}

function startChatListener(projectId) {
    if (messagesUnsub) messagesUnsub();
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    const msgBox = document.getElementById("messagesContainer");
    messagesUnsub = onSnapshot(q, (snap) => {
      if (!snap.empty) msgBox.innerHTML = "";
      snap.forEach(d => {
        const m = d.data();
        const div = document.createElement("div");
        div.className = `message-bubble ${m.fromRole === 'admin' ? 'received' : 'sent'}`;
        div.textContent = m.message;
        msgBox.appendChild(div);
      });
      msgBox.scrollTop = msgBox.scrollHeight;
    });
}

function startInboxListener() {
  const list = document.getElementById("inboxList");
  if (!list || !currentUserId) return;
  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading inbox...</div>`;
  const q = query(collection(db, "messages"), where("toUserId", "==", currentUserId), where("fromRole", "==", "admin"), orderBy("createdAt", "desc"));
  inboxUnsub = onSnapshot(q, snap => {
    list.innerHTML = "";
    if (snap.empty) {
      list.innerHTML = `<div class="glass-card" style="text-align:center;">Inbox is empty.</div>`;
      return;
    }
    snap.forEach(d => {
      const m = d.data();
      const item = document.createElement("div");
      item.className = "glass-card";
      item.style.marginBottom = "15px";
      if(!m.read) { item.style.borderLeft = "5px solid #FF3B30"; item.style.background = "rgba(255, 59, 48, 0.05)"; }
      item.innerHTML = `<h4 style="margin:0 0 5px 0; color:#FF3B30;">From Admin</h4><p style="margin:0; opacity:0.9;">${m.message}</p><small style="opacity:0.5;">${m.createdAt?.toDate().toLocaleString()}</small>`;
      item.onclick = async () => {
        openProjectDetails(m.projectId);
        if (!m.read) updateDoc(doc(db, "messages", d.id), { read: true });
      };
      list.appendChild(item);
    });
  });
}

function stopAllListeners() {
  if(projectsUnsub) projectsUnsub();
  if(messagesUnsub) messagesUnsub();
  if(inboxUnsub) inboxUnsub();
  if(paymentsUnsub) paymentsUnsub(); 
  if(profileUnsub) profileUnsub(); // Ensure profile listener is also stopped
}