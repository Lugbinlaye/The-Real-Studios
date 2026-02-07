console.log("Admin Dashboard JS loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, addDoc, doc, updateDoc, onSnapshot, serverTimestamp, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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

    // Handle Tab Switching
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.section).classList.add("active");

    // Initialize Listeners based on tab
    if (btn.dataset.section === "projects") loadAdminProjects();
    if (btn.dataset.section === "inbox") startAdminInboxListener();
  });
});

/* ===============================
   1. LOAD PROJECTS (Overview)
================================ */
function loadAdminProjects() {
  const list = document.getElementById("projectsList");
  if (!list) return;

  if (projectsListener) projectsListener();
  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading projects...</div>`;

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
      card.className = "glass-card";
      card.style.cursor = "pointer";

      // Badge Color Logic
      let badgeClass = "status-active";
      if(data.status === "Pending") badgeClass = "status-pending";
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
   2. PROJECT EDITOR (Full Screen)
================================ */
function openProjectEditor(projectId) {
  // 1. Switch View to Details Section
  document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
  document.getElementById("projectDetails").classList.add("active");

  const container = document.getElementById("adminDetailsContent");
  container.innerHTML = "Loading project data...";

  const docRef = doc(db, "projects", projectId);

  onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const p = docSnap.data();

    // 2. Render Admin Interface
    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 20px;">
           <button id="backToProjects" class="glass-btn">← Back</button>
           <h2 style="margin:0;">Manage Project</h2>
           <a href="${p.fileURL}" target="_blank" class="glass-btn">View Brief</a>
      </div>

      <h3 style="margin-bottom:10px;">${p.title}</h3>
      <p style="color:var(--text-muted); margin-bottom:30px;">${p.description}</p>

      <div class="glass-card" style="margin-bottom: 30px; border:1px solid var(--primary);">
           <h4 style="margin-bottom:15px; color:var(--primary);">Update Status & Progress</h4>
           
           <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
               <div>
                   <label>Current Status</label>
                   <select id="adminStatusSelect">
                       <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
                       <option value="In Progress" ${p.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                       <option value="Review" ${p.status === 'Review' ? 'selected' : ''}>Review</option>
                       <option value="Completed" ${p.status === 'Completed' ? 'selected' : ''}>Completed</option>
                   </select>
               </div>
               <div>
                   <label>Progress (${p.progress}%)</label>
                   <input type="range" id="adminProgressSlider" min="0" max="100" value="${p.progress}">
               </div>
           </div>
           
           <button id="saveChangesBtn" class="btn-primary" style="margin-top:20px;">Save Updates</button>
      </div>

      <div class="chat-container">
          <div class="chat-header">
              <div class="avatar-circle">👤</div>
              <div>
                  <div style="font-weight:600;">Client Chat</div>
                  <div style="font-size:0.8rem; opacity:0.7;">${p.userEmail}</div>
              </div>
          </div>
          
          <div id="projectMessages" class="chat-body">
              <div style="text-align:center; opacity:0.5; margin-top:30px;">Loading history...</div>
          </div>
          
          <div class="chat-footer">
              <input type="text" id="adminChatInput" placeholder="Reply to client..." autocomplete="off">
              <button id="adminSendBtn" class="send-btn">➤</button>
          </div>
      </div>
    `;

    // 3. Attach Listeners
    
    // Back Button
    document.getElementById("backToProjects").onclick = () => {
        document.querySelector('[data-section="projects"]').click();
    };

    // Save Changes
    document.getElementById("saveChangesBtn").onclick = async () => {
        const newStatus = document.getElementById("adminStatusSelect").value;
        const newProgress = document.getElementById("adminProgressSlider").value;
        
        try {
            await updateDoc(docRef, {
                status: newStatus,
                progress: parseInt(newProgress),
                updatedAt: serverTimestamp()
            });
            alert("Project updated successfully!");
        } catch(e) { console.error(e); alert("Update failed"); }
    };

    // Send Message
    const sendBtn = document.getElementById("adminSendBtn");
    const input = document.getElementById("adminChatInput");
    
    const sendMessage = async () => {
        const text = input.value.trim();
        if(!text) return;
        
        try {
             await addDoc(collection(db, "messages"), {
                 projectId: projectId,
                 fromUserId: currentUserId,
                 fromRole: "admin",
                 toUserId: p.userId,
                 message: text,
                 read: false,
                 createdAt: serverTimestamp()
             });
             input.value = "";
        } catch(e) { console.error(e); }
    };

    sendBtn.onclick = sendMessage;
    input.addEventListener("keypress", (e) => { if(e.key === "Enter") sendMessage(); });

    // Load Chat History
    loadMessages(projectId);
  });
}

/* ===============================
   3. CHAT MESSAGES
================================ */
function loadMessages(projectId) {
  const container = document.getElementById("projectMessages");
  if (!container) return;

  if (messagesListener) messagesListener();

  const q = query(
    collection(db, "messages"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "asc")
  );

  messagesListener = onSnapshot(q, snapshot => {
    container.innerHTML = "";
    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const div = document.createElement("div");
      
      // Admin messages (Me) = Sent class (Right, Red)
      // Client messages = Received class (Left, Glass)
      const isMe = m.fromRole === "admin";
      
      div.className = `message-bubble ${isMe ? 'sent' : 'received'}`;
      div.textContent = m.message;
      
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  });
}

/* ===============================
   4. ADMIN INBOX
================================ */
function startAdminInboxListener() {
  const list = document.getElementById("adminInboxList");
  if (!list) return;

  if (adminInboxListener) adminInboxListener();
  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading messages...</div>`;

  // Get all messages ordered by time
  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));

  adminInboxListener = onSnapshot(q, snapshot => {
    list.innerHTML = "";
    if (snapshot.empty) {
        list.innerHTML = `<div class="glass-card" style="text-align:center;">No messages found.</div>`;
        return;
    }

    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      
      const item = document.createElement("div");
      item.className = "glass-card";
      item.style.marginBottom = "15px";
      item.style.padding = "20px";
      item.style.cursor = "pointer";

      // If unread and NOT from admin (meaning it's from a client)
      if (!m.read && m.fromRole !== "admin") {
          item.style.borderLeft = "4px solid #00ffc3"; 
          item.style.background = "rgba(0, 255, 195, 0.05)";
      }

      const senderLabel = m.fromRole === "admin" ? "You sent" : "Client Message";

      item.innerHTML = `
        <h4 style="margin:0 0 5px 0; color:var(--primary);">${senderLabel}</h4>
        <p style="margin:0; opacity:0.9;">${m.message}</p>
        <small style="opacity:0.5;">${m.createdAt?.toDate().toLocaleString()}</small>
      `;

      item.onclick = () => {
         // Open the project associated with this message
         openProjectEditor(m.projectId);
         
         // If it was a client message, mark as read
         if (!m.read && m.fromRole !== "admin") {
             updateDoc(doc(db, "messages", docSnap.id), { read: true });
         }
      };
      
      list.appendChild(item);
    });
  });
}

/* ===============================
   ADMIN STATUS TOGGLE
================================ */
const statusBtn = document.getElementById("toggleStatusBtn");
const statusInd = document.getElementById("adminStatusIndicator");

// 1. Listen to Real-Time Status
onSnapshot(doc(db, "config", "adminStatus"), (snap) => {
    if (snap.exists()) {
        const isOnline = snap.data().online;
        if (isOnline) {
            statusInd.className = "status-dot online";
            statusInd.style.background = "#00ffc3";
            statusInd.style.boxShadow = "0 0 10px #00ffc3";
        } else {
            statusInd.className = "status-dot offline";
            statusInd.style.background = "#ff3b30";
            statusInd.style.boxShadow = "0 0 10px #ff3b30";
        }
    }
});

// 2. Toggle Status on Click
statusBtn.addEventListener("click", async () => {
    const snap = await getDoc(doc(db, "config", "adminStatus"));
    if (snap.exists()) {
        const current = snap.data().online;
        await updateDoc(doc(db, "config", "adminStatus"), { online: !current });
    }
});