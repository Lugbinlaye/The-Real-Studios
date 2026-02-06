console.log("Dashboard JS loaded");

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
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
let projectsUnsub = null;
let activeProjectId = null;

/* ===============================
   AUTH STATE
================================ */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../html/sign-in.html";
    return;
  }

  currentUserId = user.uid;

  const nameEl = document.getElementById("userName");
  if (nameEl) {
    nameEl.textContent = user.displayName || user.email.split("@")[0];
  }

  const projectsSection = document.getElementById("projects");
  if (projectsSection?.classList.contains("active")) {
    startProjectsListener();
  }
});

/* ===============================
   SIDEBAR / TAB NAVIGATION
================================ */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.id === "logoutBtn") {
      signOut(auth).then(() => location.href = "../html/auth.html");
      return;
    }

    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.section)?.classList.add("active");

    if (btn.dataset.section === "projects") {
      startProjectsListener();
    } else {
      stopProjectsListener();
    }
  });

  btn.addEventListener("touchstart", () => btn.click());
});

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
    return showPopup("Please complete all fields.");
  }

  const submitBtn = dashboardForm.querySelector("button[type='submit']");
  const popup = createPopupUnderButton(submitBtn, "Submitting project…");

  try {
    const fileRef = ref(storage, `briefs/${currentUserId}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    await addDoc(collection(db, "projects"), {
  userId: auth.currentUser.uid, // ✅ NEVER currentUserId variable
  userEmail: auth.currentUser.email, // optional but helpful
  title,
  type,
  description,
  fileURL,
  status: "Pending",
  progress: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

    popup.update("Project submitted successfully 🎉");
    dashboardForm.reset();
  } catch (err) {
    console.error(err);
    popup.update("Submission failed.");
  } finally {
    setTimeout(() => popup.remove(), 4000);
  }
});

/* ===============================
   PROJECT LIST (OPTIMIZED)
================================ */
function startProjectsListener() {
  if (!currentUserId) {
    console.warn("Auth not ready yet.");
    return;
  }

  const list = document.getElementById("projectsList");
  if (!list) return;

  list.innerHTML = `<div class="glass-card">Loading projects…</div>`;

  console.log("Current user UID:", currentUserId);

  const q = query(
    collection(db, "projects"),
    where("userId", "==", currentUserId)
  );

  if (projectsUnsub) projectsUnsub();

  projectsUnsub = onSnapshot(q, snap => {
    console.log("Projects fetched:", snap.size);

    list.innerHTML = "";

    if (snap.empty) {
      list.innerHTML = `
        <div class="glass-card">
          No projects found for this account.
        </div>
      `;
      return;
    }

    snap.forEach(docSnap => {
      const p = docSnap.data();

      const card = document.createElement("div");
      card.className = "glass-card project-card";
      card.innerHTML = `
        <h3>${p.title}</h3>
        <p>Status: <strong>${p.status}</strong></p>
        <div class="progress-bar">
          <div class="progress" style="width:${p.progress || 0}%"></div>
        </div>
      `;

      card.onclick = () => openProjectDetails(docSnap.id);
      list.appendChild(card);
    });
  }, err => {
    console.error("Firestore listener error:", err);
    list.innerHTML = `
      <div class="glass-card error">
        Failed to load projects.
      </div>
    `;
  });
}


/* ===============================
   PROJECT DETAILS VIEW
================================ */
async function openProjectDetails(projectId) {
  activeProjectId = projectId;

  document.querySelectorAll(".dashboard-section").forEach(s => s.classList.remove("active"));
  document.getElementById("projectDetails")?.classList.add("active");

  const container = document.getElementById("projectDetailsContent");
  container.innerHTML = "Loading…";

  const snap = await getDoc(doc(db, "projects", projectId));
  if (!snap.exists()) return;

  const p = snap.data();

  container.innerHTML = `
    <button id="backBtn" class="glass-btn">← Back</button>
    <h2>${p.title}</h2>
    <p>${p.description}</p>
    <p>Status: <strong>${p.status}</strong></p>
    <p>Progress: ${p.progress}%</p>
  `;

  document.getElementById("backBtn").onclick = () => {
    document.getElementById("projects").classList.add("active");
    document.getElementById("projectDetails").classList.remove("active");
  };

  // 🔔 Admin updates listener (single doc = low cost)
  onSnapshot(doc(db, "projects", projectId), snap => {
    const updated = snap.data();
    if (updated.status !== p.status || updated.progress !== p.progress) {
      showToast("Project updated by admin");
    }
  });
}

/* ===============================
   POPUPS / TOASTS
================================ */
function createPopupUnderButton(btn, msg) {
  const popup = document.createElement("div");
  popup.className = "popup-notification glass-card";
  popup.textContent = msg;
  btn.after(popup);

  return {
    update: t => popup.textContent = t,
    remove: () => popup.remove()
  };
}

function showPopup(msg) {
  const btn = dashboardForm.querySelector("button[type='submit']");
  const p = createPopupUnderButton(btn, msg);
  setTimeout(() => p.remove(), 3000);
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast glass-card";
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}
