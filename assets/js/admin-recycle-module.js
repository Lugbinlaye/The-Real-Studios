import { db } from './client-firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadRecycleModule(activeListeners) {
    const list = document.getElementById("recycleList");
    const q = query(collection(db, "projects"), where("status", "==", "Archived"));
    
    const unsub = onSnapshot(q, (snap) => {
        list.innerHTML = "";
        if(snap.empty) { list.innerHTML = "<div style='opacity:0.3; padding:20px; text-align:center;'>BIN EMPTY</div>"; return; }
        
        snap.forEach(d => {
            const p = d.data();
            const div = document.createElement("div");
            div.className = "glass-card";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; color:#888; text-decoration:line-through;">${p.title}</h3>
                    <div style="font-size:0.7rem; color:#666;">ARCHIVED</div>
                </div>
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="admin-btn" style="flex:1;" onclick="window.restoreProject('${d.id}')">RESTORE</button>
                    <button class="admin-btn" style="flex:1; background:#333;" onclick="window.permDeleteProject('${d.id}')">DELETE FOREVER</button>
                </div>
            `;
            list.appendChild(div);
        });
    });
    activeListeners.push(unsub);

    window.restoreProject = (id) => updateDoc(doc(db, "projects", id), { status: "Pending Review" });
    window.permDeleteProject = async (id) => {
        if(confirm("WARNING: This action is irreversible. Delete permanently?")) await deleteDoc(doc(db, "projects", id));
    };
}