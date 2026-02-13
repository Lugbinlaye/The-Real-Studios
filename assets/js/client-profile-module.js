/**
 * THE REAL STUDIOS | Client Profile V9
 * Feature: Holographic Digital Identity Card
 */

import { db, auth } from './client-firebase-config.js';
import { doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadUserProfile(currentUserId, activeListeners) {
    const container = document.getElementById("profileContent");
    if(!container) return;
    
    // Skeleton Loader
    container.innerHTML = `<div style="text-align:center; opacity:0.3; padding:100px; font-size:0.8rem; letter-spacing:2px; font-family:'Space Mono';">DECRYPTING_IDENTITY_MATRIX...</div>`;

    const userRef = doc(db, "users", currentUserId);
    
    const unsub = onSnapshot(userRef, (docSnap) => {
        const userData = docSnap.exists() ? docSnap.data() : {};
        const name = userData.name || auth.currentUser.displayName || "UNNAMED_ENTITY";
        const email = auth.currentUser.email;

        // NEW: DIGITAL ID CARD LAYOUT
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:30px;">
                <div>
                    <span class="meta-label">SECURE_ID_V9</span>
                    <h2 style="margin:0;">DIGITAL IDENTITY</h2>
                </div>
                <button id="editProfileBtn" style="background:none; border:1px solid var(--studio-red); color:var(--studio-red); padding:10px 25px; cursor:pointer; font-family:'Space Mono'; font-size:0.75rem; letter-spacing:1px; transition:0.3s;">EDIT_DATA</button>
            </div>

            <div class="glass-card digital-id-card">
                <div class="id-avatar-frame">
                    <iconify-icon icon="solar:user-circle-bold-duotone"></iconify-icon>
                    <div class="id-badge">LEVEL 1</div>
                </div>

                <form id="profileForm" class="id-details">
                    <div class="id-field-group">
                        <label>OPERATOR NAME</label>
                        <input type="text" id="pName" class="id-input" value="${name}" disabled>
                    </div>
                    
                    <div class="id-field-group">
                        <label>ORGANIZATION / COMPANY</label>
                        <input type="text" id="pCompany" class="id-input" value="${userData.company || ''}" placeholder="UNASSIGNED" disabled>
                    </div>

                    <div class="id-field-group">
                        <label>SECURE UPLINK (PHONE)</label>
                        <input type="text" id="pPhone" class="id-input" value="${userData.phone || ''}" placeholder="NO_DATA" disabled>
                    </div>

                    <div class="id-field-group">
                        <label>AUTHENTICATION KEY</label>
                        <input type="text" class="id-input" value="${email}" disabled style="opacity:0.5; cursor:not-allowed;">
                    </div>
                    
                    <div id="saveContainer" style="grid-column: 1 / -1; text-align:right; display:none; margin-top:10px;">
                        <button type="button" id="cancelEdit" style="background:none; border:none; color:#666; margin-right:20px; cursor:pointer; font-size:0.8rem;">CANCEL</button>
                        <button type="submit" style="background:var(--studio-red); color:#fff; border:none; padding:12px 30px; cursor:pointer; font-weight:700; letter-spacing:1px;">SAVE_CHANGES</button>
                    </div>
                </form>
            </div>

            <div style="margin-top:40px; border-top:1px solid rgba(255,255,255,0.05); padding-top:30px;">
                <span class="meta-label">SECURITY CLEARANCE</span>
                <div style="display:flex; gap:20px; margin-top:20px;">
                    <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:8px; flex:1;">
                        <iconify-icon icon="solar:shield-check-bold" style="color:var(--studio-red); font-size:1.5rem;"></iconify-icon>
                        <div style="margin-top:10px; font-size:0.8rem;">ENCRYPTION: AES-256</div>
                        <div style="font-size:0.7rem; opacity:0.5;">STATUS: SECURE</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:8px; flex:1;">
                        <iconify-icon icon="solar:server-bold" style="color:#fff; font-size:1.5rem;"></iconify-icon>
                        <div style="margin-top:10px; font-size:0.8rem;">DATA REGION</div>
                        <div style="font-size:0.7rem; opacity:0.5;">GLOBAL_NODE_1</div>
                    </div>
                </div>
            </div>
        `;

        // EDIT LOGIC
        const editBtn = document.getElementById("editProfileBtn");
        const saveBox = document.getElementById("saveContainer");
        const inputs = [document.getElementById("pName"), document.getElementById("pCompany"), document.getElementById("pPhone")];

        editBtn.onclick = () => {
            inputs.forEach(i => i.disabled = false);
            inputs[0].focus();
            saveBox.style.display = "block";
            editBtn.style.display = "none";
        };

        document.getElementById("cancelEdit").onclick = () => {
            inputs.forEach(i => { i.disabled = true; i.value = i.defaultValue; });
            saveBox.style.display = "none";
            editBtn.style.display = "block";
        };

        document.getElementById("profileForm").onsubmit = async (e) => {
            e.preventDefault();
            editBtn.textContent = "SYNCING...";
            
            await setDoc(userRef, {
                name: inputs[0].value,
                company: inputs[1].value,
                phone: inputs[2].value,
                updatedAt: serverTimestamp()
            }, { merge: true });

            inputs.forEach(i => i.disabled = true);
            saveBox.style.display = "none";
            editBtn.style.display = "block";
            editBtn.textContent = "EDIT_DATA";
        };
    });
    activeListeners.push(unsub);
}