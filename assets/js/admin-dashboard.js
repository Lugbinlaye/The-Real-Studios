console.log("Admin Dashboard JS loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, collection, query, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

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

// ===========================
// SIDEBAR NAVIGATION
// ===========================
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

      if (targetId === "projects") loadProjects();
      if (targetId === "messages") loadMessages();
    });
  });
});

// ===========================
// AUTH
// ===========================
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../html/auth.html";
    return;
  }
  currentUserId = user.uid;
});

// ===========================
// LOAD PROJECTS
// ===========================
const adminProjectsList = document.getElementById("adminProjectsList");
const projectModal = document.getElementById("projectDetailModal");
const closeProjectModal = document.getElementById("closeProjectModal");

let projectsCache = [];

async function loadProjects() {
  if (!currentUserId || !adminProjectsList) return;

  adminProjectsList.innerHTML = `<div class="glass-card loading">Loading projects…</div>`;

  try {
    const snapshot = await getDocs(collection(db, "projects"));
    projectsCache = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    adminProjectsList.innerHTML = "";
    if (!projectsCache.length) {
      adminProjectsList.innerHTML = `<div class="glass-card empty">No projects found.</div>`;
      return;
    }

    projectsCache.forEach(p => {
      const card = document.createElement("div");
      card.className = "glass-card project-card";
      card.innerHTML = `<h3>${p.title}</h3><p>Status: ${p.status}</p>`;
      card.onclick = () => openProjectDetails(p.id);
      adminProjectsList.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    adminProjectsList.innerHTML = `<div class="glass-card error">Failed to load projects</div>`;
  }
}

// ===========================
// OPEN PROJECT DETAILS
// ===========================
function openProjectDetails(projectId) {
  const p = projectsCache.find(pr => pr.id === projectId);
  if (!p) return;

  document.getElementById("modalProjectTitle").textContent = p.title;
  document.getElementById("modalClientName").textContent = p.userEmail || "Unknown";
  document.getElementById("modalStatus").textContent = p.status;
  document.getElementById("modalProgress").textContent = p.progress || 0;
  document.getElementById("modalDescription").textContent = p.description;
  document.getElementById("updateStatus").value = p.status;
  document.getElementById("updateProgress").value = p.progress || 0;
  document.getElementById("updateTimeline").value = p.timeline || "";

  // Download project brief link
  const downloadLink = document.getElementById("downloadBrief");
  downloadLink.href = p.fileURL || "#";

  projectModal.classList.remove("hidden");

  document.getElementById("saveProjectUpdate").onclick = async () => {
    await saveProjectUpdate(projectId);
  };
}

closeProjectModal.onclick = () => projectModal.classList.add("hidden");

// ===========================
// SAVE PROJECT UPDATE
// ===========================
async function saveProjectUpdate(projectId) {
  const status = document.getElementById("updateStatus").value;
  const progress = parseInt(document.getElementById("updateProgress").value) || 0;
  const timeline = document.getElementById("updateTimeline").value;

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    status,
    progress,
    timeline,
    updatedAt: new Date()
  });

  // Update in cache
  const cached = projectsCache.find(p => p.id === projectId);
  if (cached) {
    cached.status = status;
    cached.progress = progress;
    cached.timeline = timeline;
  }

  projectModal.classList.add("hidden");
  alert("Project updated and client notified!");
}

// ===========================
// MESSAGES
// ===========================
const messagesList = document.getElementById("messagesList");
async function loadMessages() {
  if (!currentUserId || !messagesList) return;

  messagesList.innerHTML = `<div class="glass-card loading">Loading messages…</div>`;

  try {
    const snapshot = await getDocs(collection(db, "messages"));
    messagesList.innerHTML = "";

    if (snapshot.empty) {
      messagesList.innerHTML = `<div class="glass-card empty">No messages</div>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const card = document.createElement("div");
      card.className = "glass-card project-card";
      card.innerHTML = `<p><strong>${m.senderEmail}</strong>: ${m.text}</p>`;
      messagesList.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    messagesList.innerHTML = `<div class="glass-card error">Failed to load messages</div>`;
  }
}
