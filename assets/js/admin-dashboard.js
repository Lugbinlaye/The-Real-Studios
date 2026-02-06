console.log("Admin Dashboard JS loaded");

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
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

/* ===============================
   FIREBASE INIT
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
let projectsListener = null;
let messagesListener = null;
let adminInboxListener = null;

// Stores the details of the currently opened project
let activeModalProjectId = null;
let activeModalClientId = null;

/* ===============================
   SIDEBAR / TAB NAVIGATION
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dashboard-section");

  navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.id === "logoutBtn") {
        signOut(auth).then(() => window.location.href = "../html/auth.html");
        return;
      }

      const targetId = btn.dataset.section;
      const targetSection = document.getElementById(targetId);
      if (!targetSection) return;

      navItems.forEach(b => b.classList.remove("active"));
      sections.forEach(s => s.classList.remove("active"));

      btn.classList.add("active");
      targetSection.classList.add("active");

      if (targetId === "projects") loadAdminProjects();
      if (targetId === "inbox") startAdminInboxListener();
    });
  });
});

/* ===============================
   AUTH STATE
================================ */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../html/auth.html";
    return;
  }
  currentUserId = user.uid;
  
  // Auto-load projects if on projects tab
  const projectsSection = document.getElementById("projects");
  if (projectsSection?.classList.contains("active")) loadAdminProjects();
});

/* ===============================
   LOAD ADMIN PROJECTS (REAL-TIME)
================================ */
function loadAdminProjects() {
  const projectsList = document.getElementById("projectsList");
  if (!projectsList) return;

  if (projectsListener) projectsListener(); // unsubscribe previous
  projectsList.innerHTML = `<div class="glass-card loading">Loading projects…</div>`;

  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

  projectsListener = onSnapshot(q, snapshot => {
    projectsList.innerHTML = "";
    if (snapshot.empty) {
      projectsList.innerHTML = `<div class="glass-card empty">No projects yet.</div>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "glass-card project-card";
      
      // Basic styling for the card
      card.style.cursor = "pointer";
      
      card.innerHTML = `
        <h3 class="project-title">${data.title}</h3>
        <p class="type" style="color:#00ffc3;">${data.type}</p>
        <p class="status">Status: <strong>${data.status || "Pending"}</strong></p>
        <div class="progress-bar"><div class="progress" style="width:${data.progress || 0}%"></div></div>
        <small class="last-updated">Client: ${data.userEmail || "Unknown"}</small>
      `;

      card.addEventListener("click", () => openProjectDetails(docSnap.id, data.userId));
      projectsList.appendChild(card);
    });
  }, err => {
    console.error("Failed to load projects:", err);
  });
}

/* ===============================
   PROJECT DETAILS MODAL
================================ */
function openProjectDetails(projectId, clientUserId) {
  const modal = document.getElementById("projectDetailModal");
  if (!modal) return;

  modal.style.display = "block";
  
  // Set Global State for Message Sending
  activeModalProjectId = projectId;
  activeModalClientId = clientUserId;

  const docRef = doc(db, "projects", projectId);

  // Load Project Data
  onSnapshot(docRef, docSnap => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    modal.querySelector(".modal-title").textContent = data.title;
    modal.querySelector(".modal-type").textContent = data.type;
    modal.querySelector(".modal-status-update").value = data.status || "Pending";
    modal.querySelector(".modal-progress").value = data.progress || 0;
    modal.querySelector(".modal-description").textContent = data.description;
    modal.querySelector(".modal-file").href = data.fileURL || "#";
  });

  // Load Messages
  loadProjectMessages(projectId);

  // Close Button
  modal.querySelector(".close-btn").onclick = () => {
    modal.style.display = "none";
    activeModalProjectId = null;
    activeModalClientId = null;
  };

  // 1. SAVE STATUS BUTTON Logic
  const saveBtn = modal.querySelector(".save-btn");
  // Clone to remove old listeners
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.onclick = async () => {
    const status = modal.querySelector(".modal-status-update").value;
    const progress = modal.querySelector(".modal-progress").value;

    try {
      await updateDoc(docRef, {
        status,
        progress: parseInt(progress),
        updatedAt: serverTimestamp()
      });
      alert("Project status updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };
}

/* ===============================
   CHAT LOGIC (SEND & RECEIVE)
================================ */

// 1. Send Message Button (Quick Reply)
document.getElementById("quickReplyBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("quickReplyInput");
    const text = input.value.trim();

    if (!text) return;
    if (!activeModalProjectId || !activeModalClientId) {
        alert("Error: No active project context.");
        return;
    }

    try {
        await addDoc(collection(db, "messages"), {
            projectId: activeModalProjectId,
            fromUserId: currentUserId,
            fromRole: "admin", // <--- Critical for Client Dashboard to see this
            toUserId: activeModalClientId, // <--- Critical for "My Messages"
            message: text,
            read: false,
            createdAt: serverTimestamp()
        });
        
        input.value = ""; // Clear input
    } catch (e) {
        console.error("Send error:", e);
        alert("Could not send message.");
    }
});

// 2. Load Messages into Modal
function loadProjectMessages(projectId) {
  const messagesContainer = document.getElementById("projectMessages");
  if (!messagesContainer) return;

  if (messagesListener) messagesListener(); // Unsub old

  const q = query(
    collection(db, "messages"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "asc")
  );

  messagesListener = onSnapshot(q, snapshot => {
    messagesContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const msgEl = document.createElement("div");
      
      const isAdmin = data.fromRole === "admin";
      
      msgEl.style.padding = "8px 12px";
      msgEl.style.marginBottom = "8px";
      msgEl.style.borderRadius = "10px";
      msgEl.style.maxWidth = "80%";
      msgEl.style.fontSize = "0.9rem";
      msgEl.style.clear = "both"; // specific for float behavior or flex
      
      if (isAdmin) {
          // Sent by Admin (Right side)
          msgEl.style.marginLeft = "auto";
          msgEl.style.background = "#00ffc3"; // Green accent
          msgEl.style.color = "#000";
          msgEl.textContent = `You: ${data.message}`;
      } else {
          // Sent by Client (Left side)
          msgEl.style.marginRight = "auto";
          msgEl.style.background = "rgba(255,255,255,0.1)";
          msgEl.style.color = "#fff";
          msgEl.textContent = `Client: ${data.message}`;
      }

      messagesContainer.appendChild(msgEl);
    });
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

/* ===============================
   ADMIN INBOX LISTENER
================================ */
function startAdminInboxListener() {
  const inboxList = document.getElementById("adminInboxList");
  if (!inboxList) return;

  inboxList.innerHTML = `<div class="glass-card loading">Loading messages…</div>`;
  if (adminInboxListener) adminInboxListener();

  const q = query(
    collection(db, "messages"),
    orderBy("createdAt", "desc")
  );

  adminInboxListener = onSnapshot(q, snapshot => {
    inboxList.innerHTML = "";
    if (snapshot.empty) {
      inboxList.innerHTML = `<div class="glass-card empty">No messages.</div>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      
      const item = document.createElement("div");
      item.className = "glass-card inbox-item";
      item.style.marginBottom = "10px";
      item.style.padding = "15px";
      item.style.cursor = "pointer";
      
      // Visual indicator for unread client messages
      if (!msg.read && msg.fromRole !== "admin") {
          item.style.borderLeft = "4px solid #00ffc3";
      }

      const senderName = msg.fromRole === "admin" ? "You (Admin)" : "Client";

      item.innerHTML = `
        <h4 style="margin:0 0 5px 0; color: #00ffc3;">${senderName}</h4>
        <p style="margin:0; opacity: 0.8;">${msg.message}</p>
        <small style="opacity: 0.5; font-size: 0.7rem;">${msg.createdAt?.toDate?.().toLocaleString() || ""}</small>
      `;
      
      item.onclick = () => {
        // If message is from Admin, toUserId is Client. If from Client, fromUserId is Client.
        const targetClientId = msg.fromRole === "admin" ? msg.toUserId : msg.fromUserId;
        
        openProjectDetails(msg.projectId, targetClientId);

        // Mark as read if from client
        if (!msg.read && msg.fromRole !== "admin") {
           updateDoc(doc(db, "messages", docSnap.id), { read: true });
        }
      };

      inboxList.appendChild(item);
    });
  });
}