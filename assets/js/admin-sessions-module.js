import { db } from './client-firebase-config.js';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadSessionsModule(activeListeners) {
    const list = document.getElementById("sessionsList");
    const q = query(collection(db, "projects"), where("status", "!=", "Archived"));
    
    // OPEN CREATE MODAL
    window.openCreateProjectModal = () => {
        const modal = document.getElementById("adminModal");
        modal.innerHTML = `
            <div id="adminModalContent" class="glass-card" style="width:500px; background:#111; border:1px solid var(--admin-oxblood);">
                <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                    <h3 style="margin:0; color:#fff;">INITIATE DEPLOYMENT</h3>
                    <button onclick="document.getElementById('adminModal').style.display='none'" style="background:none; border:none; color:#666; cursor:pointer;">X</button>
                </div>
                <div style="padding:20px; display:grid; gap:15px;">
                    <input type="text" id="newProjTitle" class="admin-input" placeholder="Project Title">
                    <input type="text" id="newProjClient" class="admin-input" placeholder="Client Email">
                    <select id="newProjType" class="admin-input">
                        <option value="Commercial Video">Commercial Video</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Brand Identity">Brand Identity</option>
                    </select>
                    <button id="createNewBtn" class="admin-btn">INITIATE</button>
                </div>
            </div>
        `;
        modal.style.display = "flex";

        document.getElementById("createNewBtn").onclick = async () => {
            const title = document.getElementById("newProjTitle").value;
            const email = document.getElementById("newProjClient").value;
            const type = document.getElementById("newProjType").value;

            if(!title || !email) return alert("MISSING_DATA");

            const userQ = query(collection(db, "users"), where("email", "==", email));
            const userSnap = await getDocs(userQ);
            let uid = "MANUAL_ENTRY";
            if(!userSnap.empty) uid = userSnap.docs[0].id;

            await addDoc(collection(db, "projects"), {
                title, type, status: "Active", progress: 0,
                userId: uid, userEmail: email, createdAt: serverTimestamp(),
                currentPhase: 0, currentPhaseName: "Discovery"
            });
            modal.style.display = "none";
        };
    };

    // RENDER LIST
    const unsub = onSnapshot(q, (snap) => {
        list.innerHTML = "";
        snap.forEach(docSnap => {
            const p = docSnap.data();
            const card = document.createElement("div");
            card.className = "glass-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <h3 style="margin-bottom:5px; color:#fff;">${p.title || 'Untitled'}</h3>
                        <div style="font-size:0.7rem; color:#888;">${p.userEmail}</div>
                        <div style="margin-top:10px;">
                            <span class="status-badge ${p.status === 'Active' ? 'status-active' : 'status-pending'}">${p.status}</span>
                            <span class="status-badge status-archived">PHASE: ${p.currentPhaseName || 'INIT'}</span>
                        </div>
                    </div>
                    <button class="admin-btn-outline edit-btn">EDIT</button>
                </div>
                <div style="margin-top:15px; background:#222; height:4px; border-radius:2px; overflow:hidden;">
                    <div style="width:${p.progress || 0}%; background:var(--admin-oxblood); height:100%;"></div>
                </div>
            `;
            card.querySelector(".edit-btn").onclick = () => openSessionEditor(docSnap.id, p);
            list.appendChild(card);
        });
    });
    activeListeners.push(unsub);
}

function openSessionEditor(id, data) {
    const modal = document.getElementById("adminModal");
    let dateStr = "";
    if (data.meetingDate) {
        try {
            const d = data.meetingDate.toDate();
            const offset = d.getTimezoneOffset() * 60000;
            dateStr = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        } catch(e) {}
    }

    modal.innerHTML = `
        <div id="adminModalContent" class="glass-card" style="width:500px; background:#111; border:1px solid var(--admin-oxblood);">
            <div style="padding:20px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                <h3 style="margin:0; color:#fff;">EDIT SESSION</h3>
                <button onclick="document.getElementById('adminModal').style.display='none'" style="background:none; border:none; color:#666; cursor:pointer;">X</button>
            </div>
            <div style="padding:20px; display:grid; gap:15px;">
                <select id="editStatus" class="admin-input">
                    <option value="Active" ${data.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Pending Review" ${data.status === 'Pending Review' ? 'selected' : ''}>Pending Review</option>
                    <option value="Completed" ${data.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <input type="number" id="editPhase" class="admin-input" value="${data.currentPhase || 0}" min="0" max="3" placeholder="Phase (0-3)">
                    <input type="number" id="editProgress" class="admin-input" value="${data.progress || 0}" min="0" max="100" placeholder="Progress %">
                </div>
                <div style="border-top:1px solid #333; padding-top:15px;">
                    <label style="font-size:0.7rem; color:#888;">GOOGLE MEET</label>
                    <input type="datetime-local" id="editMeetDate" class="admin-input" value="${dateStr}">
                    <input type="text" id="editMeetLink" class="admin-input" value="${data.meetingLink || ''}" placeholder="Link..." style="margin-top:10px;">
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <button id="archiveBtn" style="color:red; background:none; border:none; cursor:pointer;">ARCHIVE</button>
                    <button id="saveSessionBtn" class="admin-btn">SYNC</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = "flex";

    document.getElementById("saveSessionBtn").onclick = async () => {
        const phases = ["Discovery", "Design", "Development", "Launch"];
        const phaseIdx = parseInt(document.getElementById("editPhase").value);
        await updateDoc(doc(db, "projects", id), {
            status: document.getElementById("editStatus").value,
            currentPhase: phaseIdx,
            currentPhaseName: phases[phaseIdx] || "Unknown",
            progress: parseInt(document.getElementById("editProgress").value),
            meetingDate: document.getElementById("editMeetDate").value ? new Date(document.getElementById("editMeetDate").value) : null,
            meetingLink: document.getElementById("editMeetLink").value
        });
        modal.style.display = "none";
    };

    document.getElementById("archiveBtn").onclick = async () => {
        if(confirm("Move to Recycle Bin?")) {
            await updateDoc(doc(db, "projects", id), { status: "Archived", archivedAt: serverTimestamp() });
            modal.style.display = "none";
        }
    };
}