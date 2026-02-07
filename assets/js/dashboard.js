console.log("Client Dashboard JS loaded");

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
  updateDoc,
  serverTimestamp,
  orderBy
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
let isAdminOnline = false; // Tracks if admin is online

// ⚠️ Admin UID
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
              realName = userData.name || userData.fullName || userData.firstName;
          }
      } catch (error) {
          console.log("Could not fetch user profile from DB:", error);
      }
  }

  // 3. Final Fallback
  const finalDisplayName = realName || user.email.split("@")[0];

  const homeWelcomeEl = document.getElementById("homeWelcome");
  if (homeWelcomeEl) {
      homeWelcomeEl.textContent = `Welcome, ${finalDisplayName}`;
  }

  if (document.getElementById("projects")?.classList.contains("active")) {
    startProjectsListener();
  }
});

/* ===============================
   NAVIGATION
================================ */
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.id === "logoutBtn") {
      signOut(auth).then(() => {
          window.location.href = "../html/sign-in.html";
      });
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
  });
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
  }, (error) => {
      if(error.code === 'failed-precondition') {
          list.innerHTML = `<div class="glass-card error" style="border:1px solid #FF3B30;"><strong>Action Required:</strong> Check Browser Console for Firebase Index Link.</div>`;
      }
  });
}

/* ===============================
   PROJECT DETAILS & CHAT (UPDATED)
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

      // RENDER DETAILS + CHAT UI
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
            
            <div id="messagesContainer" class="chat-body">
                <div style="text-align:center; opacity:0.5; margin-top:30px;">
                    Starting secure connection...
                </div>
            </div>
            
            <div class="chat-footer">
                <input type="text" id="clientMessageInput" placeholder="Type your message..." autocomplete="off">
                <button id="sendClientMsgBtn" class="send-btn">➤</button>
            </div>
        </div>
      `;

      // 1. LISTEN TO ADMIN STATUS (For UI)
      onSnapshot(doc(db, "config", "adminStatus"), (statusSnap) => {
          if (statusSnap.exists()) {
              isAdminOnline = statusSnap.data().online;
              const dot = container.querySelector(".status-dot");
              const text = container.querySelector("#statusText");
              
              if (dot && text) {
                if (isAdminOnline) {
                    dot.style.background = "#00ffc3"; // Green
                    dot.style.boxShadow = "0 0 8px #00ffc3";
                    text.textContent = "Online";
                    text.style.color = "#00ffc3";
                } else {
                    dot.style.background = "#ff3b30"; // Red
                    dot.style.boxShadow = "0 0 8px #ff3b30";
                    text.textContent = "Away (Auto-Reply On)";
                    text.style.color = "#ff3b30";
                }
              }
          }
      });

      // Back Button
      document.getElementById("backBtn").onclick = () => {
        document.getElementById("projects").classList.add("active");
        document.getElementById("projectDetails").classList.remove("active");
        if(messagesUnsub) messagesUnsub();
      };

      // Start Chat Listener
      startChatListener(projectId);

      // Send Logic - PASS PROJECT DATA (p) FOR EMAIL
      const sendBtn = document.getElementById("sendClientMsgBtn");
      const input = document.getElementById("clientMessageInput");

      sendBtn.onclick = () => sendMessage(projectId, input, p);
      input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") sendMessage(projectId, input, p);
      });
  });
}

/* ===============================
   SEND MESSAGE (With Auto-Reply & EmailJS)
================================ */
async function sendMessage(projectId, input, projectData) {
    const text = input.value.trim();
    if (!text) return;

    try {
        // 1. Save Client Message to Database
        await addDoc(collection(db, "messages"), {
          projectId,
          fromUserId: currentUserId,
          fromRole: "client",
          toUserId: ADMIN_UID,
          message: text,
          read: false,
          createdAt: serverTimestamp()
        });
        
        input.value = ""; // Clear input

        // 2. IF ADMIN IS OFFLINE -> TRIGGER EMAIL & AUTO-REPLY
        if (!isAdminOnline) {
            
            // A. Send Auto-Reply to Chat (Simulated Admin)
            setTimeout(async () => {
                await addDoc(collection(db, "messages"), {
                    projectId,
                    fromUserId: "SYSTEM",
                    fromRole: "admin", 
                    toUserId: currentUserId,
                    message: "Admin: I am currently offline. I have received your message via email and will get back to you shortly.",
                    read: true,
                    isAutoReply: true,
                    createdAt: serverTimestamp()
                });
            }, 1000); 

            // B. TRIGGER EMAIL VIA EMAILJS
            const serviceID = "service_j1o66n8";   // <--- Paste from EmailJS
            const templateID = "template_pw0rthm"; // <--- Paste from EmailJS

            // This object matches the variables in your EmailJS Template
            const templateParams = {
                user_name: auth.currentUser.displayName || "Client",
                user_email: auth.currentUser.email,
                project_title: projectData.title,
                message: text,
                brief_link: projectData.fileURL,
                // Optional: You can hardcode the admin email here if your template uses {{to_email}}
                to_email: "paulolugbenga@therealstudios.art" 
            };

            emailjs.send(serviceID, templateID, templateParams)
                .then(() => {
                    console.log("Email sent successfully!");
                }, (err) => {
                    console.error("Failed to send email:", err);
                });
        }

    } catch (e) {
        console.error("Message failed:", e);
    }
}

function startChatListener(projectId) {
    if (messagesUnsub) messagesUnsub();

    const messagesRef = query(
      collection(db, "messages"),
      where("projectId", "==", projectId),
      orderBy("createdAt", "asc")
    );
  
    const msgBox = document.getElementById("messagesContainer");
  
    messagesUnsub = onSnapshot(messagesRef, (snap) => {
      if (!snap.empty) msgBox.innerHTML = "";
      
      snap.forEach(d => {
        const m = d.data();
        const div = document.createElement("div");
        const isAdmin = m.fromRole === "admin";
        
        div.className = `message-bubble ${isAdmin ? 'received' : 'sent'}`;
        div.textContent = m.message;
        
        msgBox.appendChild(div);
      });
      
      msgBox.scrollTop = msgBox.scrollHeight;
      
    }, (error) => {
        if(error.code === 'failed-precondition') {
            msgBox.innerHTML = `<div style="text-align:center; color:#FF3B30;">Missing Index. Check Console.</div>`;
        }
    });
}

/* ===============================
   INBOX LISTENER
================================ */
function startInboxListener() {
  const list = document.getElementById("inboxList");
  if (!list || !currentUserId) return;

  list.innerHTML = `<div class="glass-card" style="text-align:center;">Loading inbox...</div>`;

  const q = query(
    collection(db, "messages"),
    where("toUserId", "==", currentUserId),
    where("fromRole", "==", "admin"),
    orderBy("createdAt", "desc")
  );

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
      item.style.cursor = "pointer";
      item.style.marginBottom = "15px";
      item.style.padding = "20px";
      item.style.transition = "transform 0.2s";
      
      if(!m.read) {
          item.style.borderLeft = "5px solid #FF3B30"; 
          item.style.background = "rgba(255, 59, 48, 0.05)";
      }
      
      item.onmouseover = () => item.style.transform = "translateX(5px)";
      item.onmouseout = () => item.style.transform = "translateX(0)";

      item.innerHTML = `
        <h4 style="margin:0 0 5px 0; color:#FF3B30;">From Admin</h4>
        <p style="margin:0; opacity:0.9;">${m.message}</p>
        <small style="opacity:0.5; font-size:0.8rem;">${m.createdAt?.toDate().toLocaleString()}</small>
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