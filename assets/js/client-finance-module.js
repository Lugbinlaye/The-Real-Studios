/**
 * THE REAL STUDIOS | Client Finance Module
 */
import { db, auth } from './client-firebase-config.js';
import { 
    collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

export function startPaymentsListener(currentUserId, activeListeners) {
    const list = document.getElementById("paymentsList");
    if (!list || !currentUserId) return;
    list.innerHTML = `<div style="opacity:0.3; text-align:center; padding:60px; font-size:0.7rem; letter-spacing:2px;">QUERYING_LEDGER...</div>`;

    const q = query(collection(db, "invoices"), where("clientEmail", "==", auth.currentUser.email), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
        list.innerHTML = "";
        if (snap.empty) { 
            list.innerHTML = `<div class="glass-card" style="text-align:center; opacity:0.5;">NO TRANSACTION HISTORY</div>`; 
            return; 
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const isPaid = data.status === 'Paid';
            const card = document.createElement("div");
            card.className = "glass-card project-card";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="meta-label">${isPaid ? 'OFFICIAL_RECEIPT' : 'PENDING_INVOICE'}</span>
                        <h3 style="margin:5px 0; font-weight:400; font-family:'Space Mono';">${data.invoiceId}</h3>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-family:'Space Mono'; font-size:1.2rem; color:${isPaid ? 'var(--studio-mint)' : 'var(--studio-red)'}">$${(data.amount || 0).toLocaleString()}</span>
                    </div>
                </div>
            `;
            card.onclick = () => openInvoiceModal({id: docSnap.id, ...data});
            list.appendChild(card);
        });
    });
    activeListeners.push(unsub);
}

function openInvoiceModal(data) {
    const isPaid = data.status === 'Paid';
    const isAwaiting = data.status === 'Awaiting Confirmation';
    const accent = isPaid ? 'var(--studio-mint)' : (isAwaiting ? '#FFA500' : 'var(--studio-red)');
    
    const modal = document.createElement("div");
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.97); backdrop-filter:blur(35px); z-index:9999; display:flex; align-items:center; justify-content:center;`;

    const itemsHtml = (data.items || []).map(i => `
        <div style="display:flex; justify-content:space-between; font-size:1.2rem; margin-bottom:18px; opacity:0.9; font-family:'Space Mono';">
            <span style="letter-spacing:-0.5px;">${i.desc} (x${i.qty})</span>
            <span style="color:#fff; font-weight:700;">$${(i.price * i.qty).toLocaleString()}</span>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="glass-card" style="width:95%; max-width:700px; border-top:8px solid ${accent}; padding:50px;">
            <button id="closeModal" style="position:absolute; top:35px; right:35px; background:none; border:none; color:#fff; cursor:pointer; font-size:2rem; opacity:0.5;">✕</button>
            <div style="text-align:center; margin-bottom:60px;">
                <span class="meta-label" style="font-size:0.9rem; letter-spacing:4px;">Secure Settlement Portal</span>
                <h2 style="margin:15px 0; color:${accent}; font-family:'Space Mono'; font-size:2.8rem; font-weight:700;">${data.invoiceId}</h2>
            </div>
            <div style="border-top:1px solid var(--glass-border); padding:40px 0;">
                <span class="meta-label" style="margin-bottom:25px; font-size:0.9rem;">Itemized Production Breakdown</span>
                ${itemsHtml || '<div style="opacity:0.3; font-size:1rem;">NO_ITEMS_FOUND</div>'}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--glass-border); padding-top:40px;">
                <div>
                    <span class="meta-label" style="font-size:0.9rem;">Total Session Valuation</span>
                    <span style="font-family:'Space Mono'; font-size:3.2rem; color:#fff; font-weight:700; line-height:1;">$${(data.amount || 0).toLocaleString()}</span>
                </div>
            </div>
            <div style="margin-top:60px; display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
                <button id="dlInvoiceBtn" style="background:none; border:1px solid #444; color:#fff; padding:22px; font-weight:900; cursor:pointer; letter-spacing:3px; font-size:0.9rem;">DOWNLOAD_PDF</button>
                ${!isPaid && !isAwaiting ? `<button id="claimPaidBtn" style="background:var(--studio-mint); color:#000; border:none; padding:22px; font-weight:900; cursor:pointer; font-size:0.9rem;">LOG_TRANSFER_SUCCESS</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("closeModal").onclick = () => modal.remove();
    document.getElementById("dlInvoiceBtn").onclick = () => {
        const title = isPaid ? 'RECEIPT' : 'INVOICE';
        const dispName = data.clientName || data.clientEmail.split('@')[0];
        printInvoicePDF(data, title, accent, dispName);
    };

    const claimBtn = document.getElementById("claimPaidBtn");
    if(claimBtn) {
        claimBtn.onclick = async () => {
            if(!confirm("Log transfer success for verification?")) return;
            await updateDoc(doc(db, "invoices", data.id), { status: "Awaiting Confirmation", updatedAt: serverTimestamp() });
            modal.remove();
        };
    }
}

function printInvoicePDF(data, title, accentColor, displayName) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed; width:0; height:0; border:none;';
    document.body.appendChild(iframe);
    const docI = iframe.contentWindow.document;
    
    const rows = (data.items || []).map(i => `
        <tr>
            <td style="padding:20px; border-bottom:1px solid #eee; font-size:1.1rem;">${i.desc}</td>
            <td style="padding:20px; border-bottom:1px solid #eee; text-align:center; font-size:1.1rem;">${i.qty}</td>
            <td style="padding:20px; border-bottom:1px solid #eee; text-align:right; font-size:1.1rem; font-weight:700;">$${(i.price * i.qty).toLocaleString()}</td>
        </tr>
    `).join('');

    docI.open();
    docI.write(`
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
                body { font-family: 'Space Mono', monospace; padding: 80px; color: #000; background:#fff; line-height:1.5; }
                .header { border-bottom: 6px solid #000; padding-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                table { width: 100%; border-collapse: collapse; margin: 60px 0; }
                th { background: #000; color: #fff; padding: 20px; font-size: 0.9rem; text-align: left; letter-spacing:2px; }
                .total { text-align: right; border-top: 6px dashed #000; padding-top: 40px; font-size: 2.8rem; font-weight: 700; }
                .stamp { border: 6px solid ${accentColor}; color: ${accentColor}; padding: 15px 25px; font-weight: 900; transform: rotate(-6deg); display: inline-block; text-transform:uppercase; font-size:1.5rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <div><h1 style="margin:0; font-size:3.5rem; letter-spacing:-3px;">THE REAL STUDIOS</h1><p style="margin:8px 0 0 0; letter-spacing:8px; font-size:0.9rem; opacity:0.5;">OFFICIAL_STUDIO_ARCHIVE</p></div>
                <div style="text-align:right;"><div class="stamp">${data.status}</div><p style="margin-top:20px; font-weight:700; font-size:1.2rem;">#${data.invoiceId}</p></div>
            </div>
            <div style="margin:60px 0; display:flex; justify-content:space-between; font-size:1.2rem;">
                <div><strong>CLIENT_ENTITY:</strong><br>${displayName}<br>${data.clientEmail}</div>
                <div style="text-align:right;"><strong>TIMESTAMP:</strong><br>${data.date || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead><tr><th>ITEM_DESCRIPTION</th><th style="text-align:center;">QTY</th><th style="text-align:right;">SUBTOTAL</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="total">VAL_TOTAL: $${(data.amount || 0).toLocaleString()}</div>
        </body>
        </html>
    `);
    docI.close();
    setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); }, 1000);
}