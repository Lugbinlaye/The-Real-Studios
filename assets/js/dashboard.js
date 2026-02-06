console.log("Dashboard JS loaded");

/* ===============================
   FIREBASE IMPORTS
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
  getFirestore, collection, query, where, getDocs, addDoc 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
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

let currentUserId = null;

/* ===============================
   SIDEBAR / TAB NAVIGATION
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".dashboard-section");

  navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      // Log out
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
    });
  });
});

/* ===============================
   AUTH STATE + DISPLAY NAME
================================ */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "../html/auth.html";
    return;
  }

  currentUserId = user.uid;
  const nameEl = document.getElementById("userName");
  if (nameEl) nameEl.textContent = user.displayName || user.email.split("@")[0];
});

/* ===============================
   PROJECT SUBMISSION
================================ */
const dashboardForm = document.getElementById("dashboardForm");

dashboardForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUserId) return alert("User not found.");

  const title = dashboardForm.projectName.value.trim();
  const type = dashboardForm.projectType.value;
  const description = dashboardForm.projectDescription.value.trim();
  const fileInput = dashboardForm.projectBrief;

  if (!title || !type || !description || !fileInput.files.length) {
    return showPopup("Please fill all fields and upload a brief.");
  }

  // Create popup container under submit button
  const submitBtn = dashboardForm.querySelector('button[type="submit"]');
  const popup = createPopupUnderButton(submitBtn, "Submitting your project…");

  try {
    // Upload file to Firebase Storage
    const file = fileInput.files[0];
    const fileRef = ref(storage, `project_briefs/${currentUserId}_${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const fileURL = await getDownloadURL(fileRef);

    // Save project to Firestore
    await addDoc(collection(db, "projects"), {
      userId: currentUserId,
      title,
      type,
      description,
      fileURL,
      status: "Pending",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    popup.update("Project submitted successfully! 🎉");
    dashboardForm.reset();

  } catch (err) {
    console.error(err);
    popup.update("Failed to submit project. Try again.");
  } finally {
    setTimeout(() => popup.remove(), 4000);
  }
});

/* ===============================
   POPUP CREATION UNDER BUTTON
================================ */
function createPopupUnderButton(button, message) {
  const popup = document.createElement("div");
  popup.className = "popup-notification glass-card";
  popup.textContent = message;

  // Insert after the button
  button.parentNode.insertBefore(popup, button.nextSibling);

  popup.style.marginTop = "10px";
  popup.style.padding = "10px 15px";
  popup.style.transition = "all 0.3s ease";
  popup.style.opacity = 1;

  return {
    update: msg => popup.textContent = msg,
    remove: () => {
      popup.style.opacity = 0;
      setTimeout(() => popup.remove(), 300);
    }
  };
}

/* Optional quick alert inside form if fields not filled */
function showPopup(msg) {
  const submitBtn = dashboardForm.querySelector('button[type="submit"]');
  const popup = createPopupUnderButton(submitBtn, msg);
  setTimeout(() => popup.remove(), 3000);
}

/* ===============================
   LOAD PROJECTS (MY PROJECTS TAB)
================================ */
async function loadProjects() {
  const projectsList = document.getElementById("projectsList");
  if (!projectsList || !currentUserId) return;

  projectsList.innerHTML = `<div class="glass-card loading">Loading your projects…</div>`;

  try {
    const q = query(collection(db, "projects"), where("userId", "==", currentUserId));
    const snapshot = await getDocs(q);

    projectsList.innerHTML = "";

    if (snapshot.empty) {
      projectsList.innerHTML = `<div class="glass-card empty">No projects yet. Create one to get started.</div>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "glass-card project-card";

      card.innerHTML = `
        <h3 class="project-title">${data.title}</h3>
        <p class="type">${data.type}</p>
        <p class="status">Status: <strong>${data.status || "Pending"}</strong></p>
        <div class="progress-bar">
          <div class="progress" style="width:${data.progress || 0}%"></div>
        </div>
        <small class="last-updated">
          Last updated: ${data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toLocaleDateString() : "Pending"}
        </small>
      `;

      projectsList.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    projectsList.innerHTML = `<div class="glass-card error">Failed to load projects.</div>`;
  }
}
