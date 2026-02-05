console.log("Auth page loaded");

// ------------------------
// Firebase Imports
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
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// ------------------------
// Firebase Init
// ------------------------
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

// ------------------------
// Toggle Sign In / Sign Up
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
// SIGN UP (CLIENT)
// ------------------------
const signupForm = document.getElementById("signup");

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(signupForm);

  const name = formData.get("signupName").trim();
  const companyName = formData.get("companyName").trim();
  const email = formData.get("signupEmail").trim();
  const phone = formData.get("phone").trim();
  const address = formData.get("address").trim();
  const city = formData.get("city").trim();
  const state = formData.get("state").trim();
  const country = formData.get("country").trim();
  const website = formData.get("website") || "";
  const contactMethod = formData.get("contactMethod");
  const password = formData.get("signupPassword");

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Save client profile
    await addDoc(collection(db, "users"), {
      uid: userCredential.user.uid,
      name,
      companyName,
      email,
      phone,
      address,
      city,
      state,
      country,
      website,
      preferredContact: contactMethod,
      role: "client",
      createdAt: serverTimestamp()
    });

    await sendEmailVerification(userCredential.user);

    alert("Account created successfully! Please verify your email before signing in.");
    signupForm.reset();
    tabs[0].click(); // switch to Sign In

  } catch (error) {
    alert("Sign up failed: " + error.message);
  }
});

// ------------------------
// SIGN IN (ADMIN OR CLIENT)
// ------------------------
const signinForm = document.getElementById("signin");

signinForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = signinForm.signinEmail.value.trim();
  const password = signinForm.signinPassword.value;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (!userCredential.user.emailVerified) {
      alert("Please verify your email before signing in.");
      return;
    }

    // Check Admin Collection
    const adminQuery = query(
      collection(db, "admins"),
      where("email", "==", email)
    );

    const adminSnapshot = await getDocs(adminQuery);

    if (!adminSnapshot.empty) {
      // ✅ Admin
      window.location.href = "admin-dashboard.html";
    } else {
      // ✅ Client
      window.location.href = "dashboard.html";
    }

  } catch (error) {
    alert("Login failed: " + error.message);
  }
});
