console.log("Client Dashboard JS loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, addDoc, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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

let currentUserId = null;
let projectsUnsub = null;
let messagesUnsub = null;
let inboxUnsub = null;
const ADMIN_UID = "aMXaGE0upecbXpdhR6t6qQEMDLH3"; 

/* ===============================
   AUTH STATE & USER NAME FETCH
================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../html/sign-in.html";
    return;
  }
  currentUserId = user.uid;

  // 1. Try to get name from Auth Profile first
  let realName = user.displayName;

  // 2. If Auth name is missing, fetch from Firestore "users" collection
  if (!realName) {
      try {
          const userDocRef = doc(db, "users", currentUserId);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
              const userData = userSnap.data();
              // Checks for 'name', 'fullName', or 'firstName' fields
              realName = userData.name || userData.fullName || userData.firstName;
          }
      } catch (error) {
          console.log("Could not fetch user profile from DB:", error);
      }
  }

  // 3. Final Fallback: If still no name, use Email Prefix
  const finalDisplayName = realName || user.email.split("@")[0];

  // UPDATE UI: Top Right Badge
  const nameEl = document.getElementById("userName");
  if (nameEl) nameEl.textContent = finalDisplayName;

  // UPDATE UI: Big Home Page Welcome
  const homeWelcomeEl = document.getElementById("homeWelcome");
  if (homeWelcomeEl) {
      homeWelcomeEl.textContent = `Welcome, ${finalDisplayName}`;
  }

  // Load Projects if active
  if (document.getElementById("projects")?.classList.contains("active")) {
    startProjectsListener();
  }
});

/* NAV */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.id === "logoutBtn") { signOut(auth).then(() => location.href = "../html/auth.html"); return; }
    
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
    
    btn.classList.add("active");
    document.getElementById(btn.dataset.section)?.classList.add("active");
    
    stopAllListeners();
    if (btn.dataset.section === "projects") startProjectsListener();
    if (btn.dataset.section === "inbox") startInboxListener();
  });
});

/* CREATE PROJECT */
const dashboardForm = document.getElementById("dashboardForm");
dashboardForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const title = dashboardForm.projectName.value.trim();
  const type = dashboardForm.projectType.value;
  const description = dashboardForm.projectDescription.value.trim();
  const file = dashboardForm.projectBrief.files[0];

  if (!title || !type || !description || !file) return alert("Please complete all fields.");

  const btn = dashboardForm.querySelector("button[type='submit']");
  btn.textContent = "Uploading..."; btn.disabled = true;

  try {
    const fileRef = ref(storage, `briefs/${currentUserId}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    await addDoc(collection(db, "projects"), {
      userId: currentUserId, userEmail: auth.currentUser.email,
      title, type, description, fileURL, status: "Pending", progress: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    
    alert("Project submitted successfully!");
    dashboardForm.reset();
    document.querySelector('[data-section="projects"]').click();
  } catch (err) { console.error(err); alert("Error submitting project."); }
  finally { btn.textContent = "Submit Project"; btn.disabled = false; }
});

/* PROJECTS LIST */
function startProjectsListener() {
  const list = document.getElementById("projectsList");
  if (!list || !currentUserId) return;

  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading...</div>`;

  const q = query(collection(db, "projects"), where("userId", "==", currentUserId), orderBy("createdAt", "desc"));

  projectsUnsub = onSnapshot(q, snap => {
    list.innerHTML = "";
    if (snap.empty) { list.innerHTML = `<div class="glass-card" style="text-align:center;">No projects found.</div>`; return; }

    snap.forEach(docSnap => {
      const p = docSnap.data();
      const card = document.createElement("div");
      card.className = "glass-card";
      card.style.cursor = "pointer";
      
      // Determine badge class
      let badgeClass = "status-active";
      if(p.status === "Pending") badgeClass = "status-pending";
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
           <span class="status-badge ${badgeClass}">${p.type}</span>
        </div>
        <h3>${p.title}</h3>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">Status: <span style="color:#fff;">${p.status}</span></p>
        
        <div class="progress-container">
          <div class="progress-fill" style="width:${p.progress || 0}%;"></div>
        </div>
      `;
      card.onclick = () => openProjectDetails(docSnap.id);
      list.appendChild(card);
    });
  }, (err) => {
    if(err.code === 'failed-precondition') list.innerHTML = `<div class="glass-card" style="border:1px solid red;">Missing Index. Check Console.</div>`;
  });
}

/* DETAILS & CHAT */
async function openProjectDetails(projectId) {
  if (!currentUserId) return;

  document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
  document.getElementById("projectDetails").classList.add("active");

  const container = document.getElementById("projectDetailsContent");
  container.innerHTML = "Loading...";

  onSnapshot(doc(db, "projects", projectId), (snap) => {
      if (!snap.exists()) { container.innerHTML = "Project not found."; return; }
      const p = snap.data();

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
           <button id="backBtn" class="glass-btn">← Back</button>
           <a href="${p.fileURL}" target="_blank" class="glass-btn">View Brief</a>
        </div>

        <h2 style="font-size:3rem; margin-bottom:10px;">${p.title}</h2>
        <p style="color:var(--text-muted); max-width:600px; margin-bottom:30px; line-height:1.6;">${p.description}</p>
        
        <div class="glass-card" style="margin-bottom:40px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-weight:600;">PROJECT PROGRESS</span>
                <span style="color:var(--primary); font-weight:bold;">${p.progress}%</span>
            </div>
            <div class="progress-container">
                <div class="progress-fill" style="width:${p.progress || 0}%;"></div>
            </div>
            <div style="margin-top:15px; font-size:0.9rem; color:var(--text-muted);">Current Status: <span style="color:#fff;">${p.status}</span></div>
        </div>

        <h3 style="margin-bottom:20px;">Discussion</h3>
        <div class="chat-container">
            <div class="chat-header">
                <div class="avatar-circle">🤖</div>
                <div>
                    <div style="font-weight:600;">Admin Support</div>
                    <div style="font-size:0.8rem; color:#00ff88;">● Online</div>
                </div>
            </div>
            
            <div id="messagesContainer" class="chat-body">
                <div style="text-align:center; opacity:0.3; margin-top:50px;">Start of conversation</div>
            </div>
            
            <div class="chat-footer">
                <input type="text" id="clientMessageInput" placeholder="Type a message..." autocomplete="off">
                <button id="sendClientMsgBtn" class="send-btn">➤</button>
            </div>
        </div>
      `;

      document.getElementById("backBtn").onclick = () => {
        document.getElementById("projects").classList.add("active");
        document.getElementById("projectDetails").classList.remove("active");
        if(messagesUnsub) messagesUnsub();
      };

      startChatListener(projectId);

      const sendBtn = document.getElementById("sendClientMsgBtn");
      const input = document.getElementById("clientMessageInput");
      const send = async () => {
          const text = input.value.trim();
          if(!text) return;
          try {
             await addDoc(collection(db, "messages"), {
               projectId, fromUserId: currentUserId, fromRole: "client", toUserId: ADMIN_UID,
               message: text, read: false, createdAt: serverTimestamp()
             });
             input.value = "";
          } catch(e) { console.error(e); }
      };
      
      sendBtn.onclick = send;
      input.addEventListener("keypress", (e) => { if(e.key==="Enter") send(); });
  });
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
        div.className = `message-bubble ${m.fromRole === "admin" ? 'received' : 'sent'}`;
        div.textContent = m.message;
        msgBox.appendChild(div);
      });
      msgBox.scrollTop = msgBox.scrollHeight;
    });
}

/* INBOX */
function startInboxListener() {
  const list = document.getElementById("inboxList");
  if (!list) return;
  list.innerHTML = `<div class="glass-card">Loading...</div>`;
  const q = query(collection(db, "messages"), where("toUserId", "==", currentUserId), where("fromRole", "==", "admin"), orderBy("createdAt", "desc"));

  inboxUnsub = onSnapshot(q, snap => {
    list.innerHTML = "";
    if (snap.empty) { list.innerHTML = `<div class="glass-card">No messages.</div>`; return; }

    snap.forEach(d => {
      const m = d.data();
      const item = document.createElement("div");
      item.className = "glass-card";
      item.style.cursor = "pointer";
      item.style.marginBottom = "15px";
      if(!m.read) item.style.borderLeft = "4px solid var(--primary)";
      
      item.innerHTML = `
        <h4 style="color:var(--primary); margin-bottom:5px;">Admin Message</h4>
        <p>${m.message}</p>
        <small style="opacity:0.5;">${m.createdAt?.toDate().toLocaleString()}</small>
      `;
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
}