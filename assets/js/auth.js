console.log("Auth page loaded");

// ------------------------
// Firebase Imports & Init
// ------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// ------------------------
// Firebase Config
// ------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDFrIcY4Pv5BEu9r--kc1teKM5suy3uBP4",
  authDomain: "the-real-studio.firebaseapp.com",
  projectId: "the-real-studio",
  storageBucket: "the-real-studio.firebasestorage.app",
  messagingSenderId: "471233923515",
  appId: "1:471233923515:web:50d1a40713b18bfd6a5c9e",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------------
// Toggle Forms
// ------------------------
const tabs = document.querySelectorAll(".auth-tab");
const forms = document.querySelectorAll(".auth-form");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    forms.forEach(f => f.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// ------------------------
// SIGN UP
// ------------------------
const signupForm = document.getElementById("signup");
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = signupForm.signupName.value.trim();
  const email = signupForm.signupEmail.value.trim();
  const password = signupForm.signupPassword.value;

  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Save user info to Firestore
    await addDoc(collection(db, "users"), {
      uid: userCredential.user.uid,
      name,
      email,
      createdAt: new Date()
    });

    // Send email verification
    await sendEmailVerification(userCredential.user);
    alert("Account created! Please verify your email before signing in.");

    // Reset form and switch to Sign In
    signupForm.reset();
    tabs[0].click();

  } catch (err) {
    alert("Error: " + err.message);
  }
});

// ------------------------
// SIGN IN
// ------------------------
const signinForm = document.getElementById("signin");
signinForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = signinForm.signinEmail.value.trim();
  const password = signinForm.signinPassword.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check email verification
    if (!userCredential.user.emailVerified) {
      alert("Please verify your email before signing in.");
      return;
    }

    // Check if user is admin
    const adminQuery = query(collection(db, "admins"), where("email", "==", email));
    const adminSnapshot = await getDocs(adminQuery);

    if (!adminSnapshot.empty) {
      // Admin user
      window.location.href = "admin-dashboard.html"; // redirect to admin
    } else {
      // Regular user
      window.location.href = "dashboard.html"; // redirect to dashboard
    }

  } catch (err) {
    alert("Login failed: " + err.message);
  }
});
