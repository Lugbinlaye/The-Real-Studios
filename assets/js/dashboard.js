// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

/* FIREBASE CONFIG */
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

/* AUTH STATE */
onAuthStateChanged(auth, user => {
  if (!user) return location.href = "index.html";
  document.getElementById("userName").textContent = user.displayName || user.email.split("@")[0];
  loadProjects(user.uid);
});

/* SUBMIT PROJECT */
document.getElementById("dashboardForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.target;
  const file = form.projectBrief.files[0];

  const storageRef = ref(storage, `projects/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const fileURL = await getDownloadURL(storageRef);

  await addDoc(collection(db,"projects"),{
    userId: auth.currentUser.uid,
    title: form.projectName.value,
    type: form.projectType.value,
    description: form.projectDescription.value,
    fileURL,
    progress: 0,
    status: "Pending",
    createdAt: new Date()
  });

  form.reset();
  loadProjects(auth.currentUser.uid);
});

/* LOAD PROJECTS */
async function loadProjects(uid){
  const list = document.getElementById("ongoingProjects");
  list.innerHTML = "";

  const q = query(collection(db,"projects"),where("userId","==",uid));
  const snap = await getDocs(q);

  if(snap.empty){
    list.innerHTML = "<li>No projects yet.</li>";
    return;
  }

  snap.forEach(doc=>{
    const d = doc.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="project-item">
        <strong>${d.title}</strong>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${d.progress || 0}%"></div>
        </div>
        <small>${d.progress || 0}% complete</small>
      </div>
    `;
    list.appendChild(li);
  });
}

/* SIGN OUT */
document.getElementById("signOutBtn").onclick = async ()=>{
  await signOut(auth);
  location.href = "index.html";
};
