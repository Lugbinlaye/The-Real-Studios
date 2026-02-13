import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";



// --- 1. CONFIGURATION (HARDCODED FOR LOCALHOST) ---
const firebaseConfig = {
    apiKey: window.TRS_VAULT?.API_KEY,
    authDomain: window.TRS_VAULT?.AUTH_DOMAIN,
    projectId: window.TRS_VAULT?.PROJECT_ID,
    storageBucket: window.TRS_VAULT?.STORAGE_BUCKET,
    messagingSenderId: window.TRS_VAULT?.MESSAGING_SENDER_ID,
    appId: window.TRS_VAULT?.APP_ID
};
/* // KEEP THIS COMMENTED OUT UNTIL YOU DEPLOY
   const vault = window.TRS_VAULT || {};
   const firebaseConfig = { ...vault ... }; 
*/

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===============================
    0. KINETIC RED HUD STYLE ENGINE
================================ */
const styleFix = document.createElement('style');
styleFix.innerHTML = `
    :root { --studio-red: #E31E24; --obsidian: #050505; }
    * { color: #fff !important; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    
    .meta-label { color: #666 !important; font-family: 'Space Mono'; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; display: block; margin-bottom: 15px; }

    input, select {
        width: 100%; background: rgba(255,255,255,0.05) !important; 
        border: 1px solid rgba(255,255,255,0.15) !important; padding: 20px !important; 
        font-family: 'Space Mono' !important; font-size: 1rem !important; 
        margin-bottom: 25px !important; border-radius: 2px; box-sizing: border-box;
    }
    input:focus, select:focus { border-color: var(--studio-red) !important; outline: none; background: rgba(227,30,36,0.05) !important; }

    option { background: #111; color: #fff; }

    .btn-kinetic-red {
        background: transparent; border: 1px solid var(--studio-red); 
        color: var(--studio-red) !important; padding: 22px; font-family: 'Space Mono'; 
        font-weight: 900; letter-spacing: 5px; cursor: pointer; text-transform: uppercase;
    }
    .btn-kinetic-red:hover { background: var(--studio-red); color: #fff !important; box-shadow: 0 0 30px var(--studio-red); }

    /* ENCRYPTION PULSE ANIMATION */
    @keyframes redPulse {
        0% { box-shadow: 0 0 0px var(--studio-red); background: var(--studio-red); }
        50% { box-shadow: 0 0 20px var(--studio-red); background: #ff3333; }
        100% { box-shadow: 0 0 0px var(--studio-red); background: var(--studio-red); }
    }
    .pulse-red { animation: redPulse 1.5s infinite; }

    .strength-meter-container { margin-bottom: 30px; }
    .strength-bar { height: 6px; width: 0%; background: #333; transition: 0.6s; margin-bottom: 10px; }
    .strength-text { font-family: 'Space Mono'; font-size: 0.7rem; letter-spacing: 2px; color: #555 !important; }

    .password-wrapper { position: relative; width: 100%; }
    .password-toggle { position: absolute; right: 20px; top: 22px; color: var(--studio-red) !important; font-size: 1.3rem; cursor: pointer; opacity: 0.5; z-index: 10; }
    
    .auth-tab { background: none; border: none; padding: 15px 0; color: #444 !important; font-family: 'Space Mono'; font-size: 0.9rem; font-weight: 900; cursor: pointer; position: relative; }
    .auth-tab.active { color: #fff !important; }
    .auth-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 3px; background: var(--studio-red); box-shadow: 0 0 15px var(--studio-red); }

    .kinetic-radio-card { padding: 18px; border: 1px solid rgba(255,255,255,0.1); text-align: center; font-family: 'Space Mono'; font-size: 0.8rem; cursor: pointer; }
    .kinetic-radio-card.active { border-color: var(--studio-red); background: rgba(227,30,36,0.1); color: #fff !important; }
    /* Add this inside the styleFix string */
body, html { background: transparent !important; }
.page-wrapper { background: transparent !important; }
.auth-section { background: transparent !important; }
`;
document.head.appendChild(styleFix);

/* ===============================
    1. UI & SECURITY LOGIC
================================ */
const telemetry = document.getElementById("auth-telemetry");

// Password Visibility
window.togglePasswordView = (btn) => {
    const input = btn.previousElementSibling;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.icon = isPass ? 'ph:eye-bold' : 'ph:eye-closed-bold';
};

// Strength Meter & Pulse
document.getElementById("signupPassword").addEventListener("input", (e) => {
    const val = e.target.value;
    const bar = document.getElementById("strength-bar");
    const text = document.getElementById("strength-text");
    let score = 0;

    if (val.length > 7) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ["#333", "#ff4d4d", "#ffa500", "#e31e24", "#e31e24"];
    const labels = ["WEAK", "LOW_SECURITY", "MEDIUM_SECURITY", "ENCRYPTED", "UNBREAKABLE"];

    bar.style.width = (score * 25) + "%";
    bar.style.backgroundColor = colors[score];
    text.textContent = `STRENGTH: ${labels[score]}`;

    // TRIGGER PULSE
    if (score >= 4) bar.classList.add("pulse-red");
    else bar.classList.remove("pulse-red");
});

// Role & Tab Navigation
document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".auth-form").forEach(f => f.style.display = 'none');
        tab.classList.add("active");
        document.getElementById(tab.dataset.target.split('-')[0]).style.display = 'block';
        telemetry.textContent = `PROTOCOL_SWITCH // ${tab.textContent}`;
    });
});

document.querySelectorAll(".kinetic-radio-card").forEach(card => {
    card.addEventListener("click", () => {
        document.querySelectorAll(".kinetic-radio-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const role = card.querySelector("input").value;
        document.getElementById("studioExtraFields").style.display = role === 'studio' ? 'block' : 'none';
        telemetry.textContent = `IDENTITY_LOCKED // ${role.toUpperCase()}`;
    });
});

/* ===============================
    2. FIREBASE AUTHENTICATION
================================ */

import { getDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// INITIATE SESSION (SIGN IN)
document.getElementById("signin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signinEmail").value;
    const pass = document.getElementById("signinPassword").value;

    telemetry.textContent = "VERIFYING_UPLINK...";

    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        
        // 1. Check for email verification
        if (!cred.user.emailVerified) {
            telemetry.textContent = "VERIFICATION_REQUIRED";
            alert("ACCESS_DENIED: Please verify your email before uplink.");
            return;
        }

        telemetry.textContent = "RETRIEVING_DORSIER...";

        // 2. Fetch User Role from Firestore
        const userDocRef = doc(db, "users", cred.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role; // 'admin', 'studio', or 'client'

            telemetry.textContent = `UPLINK_SUCCESS // ROLE: ${role.toUpperCase()}`;

            // 3. Redirection Engine
            setTimeout(() => {
                switch(role) {
                    case 'admin':
                        window.location.href = "admin-dashboard.html";
                        break;
                    case 'studio':
                        window.location.href = "studio-dashboard.html";
                        break;
                    case 'client':
                        window.location.href = "dashboard.html";
                        break;
                    default:
                        window.location.href = "sign-in.html"; // Fallback
                }
            }, 1000); // Slight delay for the cool telemetry effect

        } else {
            telemetry.textContent = "DATA_CORRUPTION";
            alert("Error: User profile not found in database.");
        }

    } catch (err) {
        telemetry.textContent = "AUTH_FAILURE";
        console.error(err);
        alert("CRITICAL_ERROR: " + err.message);
    }
});

// COMMIT ENROLLMENT (SIGN UP)
document.getElementById("signup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const pass = document.getElementById("signupPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;
    const role = document.querySelector('input[name="userRole"]:checked').value;

    if (pass !== confirmPass) {
        alert("PASSKEY_MISMATCH");
        return;
    }

    telemetry.textContent = "ENROLLING_IDENTITY...";

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(cred.user);

        const userData = {
            uid: cred.user.uid,
            name,
            email,
            role,
            createdAt: serverTimestamp()
        };

        if (role === 'studio') {
            userData.specialty = document.getElementById("studioSpecialty").value;
            userData.experience = document.getElementById("yearsExperience").value;
            userData.portfolio = document.getElementById("portfolioUrl").value;
            userData.tools = document.getElementById("primaryTools").value;
        }

        await setDoc(doc(db, "users", cred.user.uid), userData);
        alert("ENROLLMENT_COMPLETE: Verify email to finalize uplink.");
        location.reload();
    } catch (err) {
        telemetry.textContent = "ENROLLMENT_FAILED";
        alert(err.message);
    }
});
// VIDEO_UPLINK_FORCE_START
const forceVideoPlay = () => {
    const video = document.querySelector('.auth-video');
    if (video && video.paused) {
        video.play().catch(err => {
            console.warn("VIDEO_STREAM_BLOCKED: Awaiting User Interaction");
        });
    }
};

// Try playing on load and on first click
window.addEventListener('load', forceVideoPlay);
document.addEventListener('click', forceVideoPlay, { once: true });