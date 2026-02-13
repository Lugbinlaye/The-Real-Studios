import { db } from './client-firebase-config.js';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function loadInboxModule(activeListeners) {
    const chatList = document.getElementById("chatList");
    const chatBody = document.getElementById("adminChatBody");
    const chatHeader = document.getElementById("activeChatHeader");
    let activeProjectId = null;

    const unsub = onSnapshot(collection(db, "projects"), (snap) => {
        chatList.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const div = document.createElement("div");
            div.style.cssText = "padding:15px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer;";
            div.innerHTML = `<div style="font-weight:bold; color:#fff;">${p.title}</div><div style="font-size:0.7rem; color:#666;">${p.userEmail}</div>`;
            div.onclick = () => {
                activeProjectId = d.id;
                chatHeader.textContent = `UPLINK: ${p.title.toUpperCase()}`;
                loadAdminChat(d.id, chatBody);
            };
            chatList.appendChild(div);
        });
    });
    activeListeners.push(unsub);

    document.getElementById("adminChatSend").onclick = async () => {
        const txt = document.getElementById("adminChatInput").value;
        if(!txt || !activeProjectId) return;
        
        await addDoc(collection(db, "messages"), {
            projectId: activeProjectId, message: txt, fromRole: "admin", createdAt: serverTimestamp(), read: false
        });
        document.getElementById("adminChatInput").value = "";
    };
}

function loadAdminChat(projectId, container) {
    const q = query(collection(db, "messages"), where("projectId", "==", projectId), orderBy("createdAt", "asc"));
    onSnapshot(q, (snap) => {
        container.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const isAdmin = m.fromRole === 'admin';
            const div = document.createElement("div");
            div.style.cssText = `max-width: 70%; padding: 10px; margin: 5px; border-radius: 8px; font-size: 0.85rem; ${isAdmin ? 'align-self: flex-end; background: var(--admin-oxblood); color:#fff;' : 'align-self: flex-start; background: #333; color:#ccc;'}`;
            div.textContent = m.message;
            container.appendChild(div);
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
        });
        container.scrollTop = container.scrollHeight;
    });
}