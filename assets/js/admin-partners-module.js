import { db } from './client-firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadPartnersModule(activeListeners) {
    const list = document.getElementById("partnerList");

    window.openAddPartnerModal = () => {
        const modal = document.getElementById("adminModal");
        modal.innerHTML = `
            <div id="adminModalContent" class="glass-card" style="width:500px; background:#111; border:1px solid var(--admin-oxblood);">
                <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                    <h3 style="margin:0; color:#fff;">RECRUIT TALENT</h3>
                    <button onclick="document.getElementById('adminModal').style.display='none'" style="background:none; border:none; color:#666; cursor:pointer;">X</button>
                </div>
                <div style="padding:20px; display:grid; gap:15px;">
                    <input type="text" id="pName" class="admin-input" placeholder="Full Name">
                    <input type="text" id="pRole" class="admin-input" placeholder="Role (e.g. VFX)">
                    <input type="text" id="pRate" class="admin-input" placeholder="Rate ($/hr)">
                    <input type="text" id="pContact" class="admin-input" placeholder="Contact">
                    <button id="savePartnerBtn" class="admin-btn">ADD PARTNER</button>
                </div>
            </div>
        `;
        modal.style.display = "flex";

        document.getElementById("savePartnerBtn").onclick = async () => {
            const name = document.getElementById("pName").value;
            if(!name) return;
            await addDoc(collection(db, "partners"), {
                name, role: document.getElementById("pRole").value, 
                rate: document.getElementById("pRate").value,
                contact: document.getElementById("pContact").value,
                status: "Active", createdAt: serverTimestamp()
            });
            modal.style.display = "none";
        };
    };

    const unsub = onSnapshot(query(collection(db, "partners"), where("status", "==", "Active")), (snap) => {
        list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const div = document.createElement("div");
            div.className = "glass-card";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <h3>${p.name}</h3>
                    <span style="color:var(--admin-gold); font-size:0.7rem; font-family:'Space Mono';">${p.rate || 'N/A'}</span>
                </div>
                <div style="color:#888; font-size:0.8rem; margin-bottom:10px;">${p.role}</div>
                <div style="font-size:0.7rem; color:#666; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">${p.contact || 'No Contact'}</div>
                <button style="margin-top:15px; color:#888; background:none; border:1px solid #333; padding:5px 10px; cursor:pointer; font-size:0.7rem; width:100%;" onclick="window.archivePartner('${d.id}')">REMOVE</button>
            `;
            list.appendChild(div);
        });
    });
    activeListeners.push(unsub);

    window.archivePartner = (id) => updateDoc(doc(db, "partners", id), { status: "Archived" });
}