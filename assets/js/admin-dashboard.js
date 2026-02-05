import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

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

/* ADMIN AUTH CHECK */
onAuthStateChanged(auth, user => {
  if (!user) return location.href = "index.html";
  loadAllProjects();
});

/* LOAD ALL PROJECTS */
async function loadAllProjects() {
  const container = document.getElementById("adminProjects");
  container.innerHTML = "";

  const snap = await getDocs(collection(db, "projects"));

  if (snap.empty) {
    container.innerHTML = "<p>No projects found.</p>";
    return;
  }

  snap.forEach(project => {
    const d = project.data();

    const div = document.createElement("div");
    div.className = "admin-project";
    div.innerHTML = `
      <h5>${d.title}</h5>
      <p>${d.type} • ${d.status}</p>

      <div class="admin-controls">
        <input type="number" min="0" max="100" value="${d.progress || 0}" />
        <select>
          <option ${d.status==="Pending"?"selected":""}>Pending</option>
          <option ${d.status==="In Progress"?"selected":""}>In Progress</option>
          <option ${d.status==="Completed"?"selected":""}>Completed</option>
        </select>
        <button class="btn-main">Update</button>
      </div>
    `;

    const [progressInput, statusSelect, btn] = div.querySelectorAll("input, select, button");

    btn.onclick = async () => {
      await updateDoc(doc(db,"projects",project.id),{
        progress: Number(progressInput.value),
        status: statusSelect.value
      });
      alert("Project updated");
    };

    container.appendChild(div);
  });
}

/* SIGN OUT */
document.getElementById("adminSignOut").onclick = async ()=>{
  await signOut(auth);
  location.href = "index.html";
};
