import { db } from './client-firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadFinanceModule(activeListeners) {
    const container = document.getElementById("financeOverview");
    
    window.openInvoiceModal = (projectId = null, currentAmount = 0, title = "") => {
        const modal = document.getElementById("adminModal");
        if(!projectId) return alert("Select a project from the list below.");

        modal.innerHTML = `
            <div id="adminModalContent" class="glass-card" style="width:500px; background:#111; border:1px solid var(--admin-gold);">
                <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                    <h3 style="margin:0; color:var(--admin-gold);">ISSUE INVOICE // ${title}</h3>
                    <button onclick="document.getElementById('adminModal').style.display='none'" style="background:none; border:none; color:#666; cursor:pointer;">X</button>
                </div>
                <div style="padding:20px;">
                    <label style="font-size:0.7rem; color:#888;">OUTSTANDING BALANCE ($)</label>
                    <input type="number" id="newInvoiceAmount" class="admin-input" value="${currentAmount}" style="font-size:1.5rem; color:var(--admin-gold); border-color:var(--admin-gold);">
                    <button id="saveInvoiceBtn" class="admin-btn" style="width:100%; margin-top:20px; justify-content:center; background:var(--admin-gold); color:#000;">UPDATE LEDGER</button>
                </div>
            </div>
        `;
        modal.style.display = "flex";

        document.getElementById("saveInvoiceBtn").onclick = async () => {
            const amount = parseFloat(document.getElementById("newInvoiceAmount").value);
            await updateDoc(doc(db, "projects", projectId), { invoiceTotal: amount });
            modal.style.display = "none";
        };
    };

    const q = query(collection(db, "projects"), where("status", "!=", "Archived"));
    const unsub = onSnapshot(q, (snap) => {
        let html = `<table style="width:100%; text-align:left; border-collapse:collapse;">
            <tr style="border-bottom:1px solid #333; color:#666; font-size:0.7rem; font-family:'Space Mono';"><th style="padding:15px;">PROJECT</th><th style="padding:15px;">BALANCE</th><th style="padding:15px;">EDIT</th></tr>`;
        
        snap.forEach(d => {
            const p = d.data();
            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:15px; color:#fff;">${p.title}</td>
                <td style="padding:15px; color:var(--admin-gold); font-family:'Space Mono';">$${(p.invoiceTotal || 0).toLocaleString()}</td>
                <td style="padding:15px;"><button class="admin-btn-outline" onclick="window.openInvoiceModal('${d.id}', ${p.invoiceTotal || 0}, '${p.title}')">EDIT</button></td>
            </tr>`;
        });
        html += "</table>";
        container.innerHTML = html;
    });
    activeListeners.push(unsub);
}