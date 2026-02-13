/**
 * THE REAL STUDIOS | Initiation Protocol V6
 * Status: Updated with Project Title & Custom Options
 */

import { db, auth } from './client-firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const PROJECT_TYPES = [
    // 1. VIDEO PRODUCTION
    { id: 'comm_video', label: 'Commercial Ad', icon: 'solar:videocamera-record-bold' },
    { id: 'music_video', label: 'Music Video', icon: 'solar:music-note-bold' },
    { id: 'documentary', label: 'Documentary', icon: 'solar:clapperboard-edit-bold' },
    { id: 'event_cov', label: 'Event Coverage', icon: 'solar:calendar-mark-bold' },
    { id: 'corporate', label: 'Corporate Corp', icon: 'solar:buildings-bold' },

    // 2. AUDIO & VOICE
    { id: 'podcast', label: 'Podcast Series', icon: 'solar:microphone-large-bold' },
    { id: 'sound_design', label: 'Sound Design', icon: 'solar:soundwave-bold' },

    // 3. DEVELOPMENT
    { id: 'web_dev', label: 'Web Development', icon: 'solar:code-circle-bold' },
    { id: 'mobile_app', label: 'Mobile App', icon: 'solar:smartphone-bold' },
    { id: 'saas', label: 'SaaS Platform', icon: 'solar:server-bold' },
    { id: 'ecommerce', label: 'E-Commerce', icon: 'solar:cart-large-bold' },

    // 4. DESIGN & CREATIVE
    { id: 'brand_id', label: 'Brand Identity', icon: 'solar:star-bold' },
    { id: 'ui_ux', label: 'UI/UX Design', icon: 'solar:ruler-pen-bold' },
    { id: 'motion_gfx', label: 'Motion Graphics', icon: 'solar:layers-minimalistic-bold' },
    { id: 'vfx', label: 'VFX & CGI', icon: 'solar:magic-stick-3-bold' },
    { id: '3d_arch', label: '3D Arch Viz', icon: 'solar:city-bold' },

    // 5. PHOTOGRAPHY & STRATEGY
    { id: 'photo_prod', label: 'Product Photo', icon: 'solar:camera-bold' },
    { id: 'photo_fashion', label: 'Fashion Photo', icon: 'solar:user-hand-up-bold' },
    { id: 'social_strat', label: 'Social Strategy', icon: 'solar:hashtag-bold' },
    { id: 'copywriting', label: 'Copywriting', icon: 'solar:document-text-bold' },
    
    // 6. CUSTOM / OTHER (NEW)
    { id: 'other', label: 'Custom / Other', icon: 'solar:asteroid-bold' }
];

let selectedType = null;

export function loadInitiateModule() {
    const grid = document.getElementById("projectTypeGrid");
    const formArea = document.getElementById("dynamicFormArea");
    const submitBtn = document.getElementById("submitProjectBtn");
    
    if(!grid) return;

    // RENDER GRID
    grid.innerHTML = PROJECT_TYPES.map(t => `
        <div class="type-card glass-card" data-id="${t.id}" style="padding:20px !important; text-align:center; cursor:pointer; margin:0; transition:0.3s; display:flex; flex-direction:column; align-items:center; justify-content:center; aspect-ratio:1/1; border:1px solid rgba(255,255,255,0.05);">
            <iconify-icon icon="${t.icon}" style="font-size:2rem; margin-bottom:12px; color:#666; transition:0.3s;"></iconify-icon>
            <div style="font-size:0.7rem; font-family:'Space Mono'; line-height:1.3; color:#aaa;">${t.label.toUpperCase()}</div>
        </div>
    `).join('');

    // SELECTION LOGIC
    grid.querySelectorAll('.type-card').forEach(card => {
        card.onclick = () => {
            // Reset Styles
            grid.querySelectorAll('.type-card').forEach(c => {
                c.style.borderColor = 'rgba(255,255,255,0.05)';
                c.style.background = 'rgba(255,255,255,0.02)';
                c.querySelector('iconify-icon').style.color = '#666';
            });
            
            // Highlight Selection
            card.style.borderColor = 'var(--studio-red)';
            card.style.background = 'rgba(214, 26, 33, 0.1)';
            card.querySelector('iconify-icon').style.color = 'var(--studio-red)';
            
            selectedType = card.dataset.id;
            formArea.style.display = 'block';
            setTimeout(() => formArea.scrollIntoView({ behavior: 'smooth' }), 100);
            
            renderDetailedFields(selectedType);
        };
    });

    // SUBMIT HANDLER
    submitBtn.onclick = async () => {
        if(!selectedType) return alert("Please select an operation type.");
        
        // CAPTURE TITLE
        const titleInput = document.getElementById("projTitle");
        const projectTitle = titleInput.value.trim() || "Untitled Session";
        const typeLabel = PROJECT_TYPES.find(t => t.id === selectedType).label;
        
        submitBtn.innerHTML = "ENCRYPTING & TRANSMITTING...";
        try {
            const formData = {
                title: projectTitle, // NEW FIELD
                type: typeLabel,
                description: document.getElementById("projDesc").value,
                status: "Pending Review",
                progress: 0,
                createdAt: serverTimestamp(),
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email
            };
            
            // Capture Dynamic Inputs
            document.querySelectorAll('.dyn-input').forEach(input => {
                // Skip the title input as we already captured it manually
                if(input.id !== "projTitle" && input.value) {
                    formData[input.dataset.label] = input.value;
                }
            });

            await addDoc(collection(db, "projects"), formData);
            alert("TRANSMISSION SUCCESSFUL");
            window.location.reload();
        } catch(e) {
            console.error(e);
            submitBtn.innerHTML = "RETRY TRANSMISSION";
            alert("Error: " + e.message);
        }
    };
}

function renderDetailedFields(type) {
    const container = document.getElementById("dynamicFields");
    let fields = [];

    // DEEP PARAMETER LOGIC
    if (['comm_video','music_video','documentary','corporate'].includes(type)) {
        fields = ['Total Runtime (approx)', 'Locations Required', 'Casting / Talent Needs', 'Distribution (TV, Web, Social)', 'Reference URL'];
    } else if (['web_dev','saas','ecommerce'].includes(type)) {
        fields = ['Core Features List', 'Integrations (CRM, Payments)', 'Design Assets Status', 'Domain/Hosting Status', 'Expected User Load'];
    } else if (['mobile_app'].includes(type)) {
        fields = ['Target OS (iOS/Android)', 'Offline Capabilities', 'Monetization Model', 'Push Notifications?', 'Hardware Access (Camera/GPS)'];
    } else if (['ui_ux','brand_id'].includes(type)) {
        fields = ['Target Demographic', 'Competitor Analysis', 'Color/Style Preferences', 'Deliverables Format', 'Current Brand Guidelines'];
    } else if (['motion_gfx','vfx','3d_arch'].includes(type)) {
        fields = ['Render Quality (Realtime/Cinematic)', 'Resolution (1080p/4K)', 'Audio/SFX Needed?', 'CAD/Blueprint Files?', 'Final Format'];
    } else if (type === 'other') {
        // NEW CUSTOM FIELDS
        fields = ['Project Category', 'Core Objective', 'Budget Constraint', 'Timeline / Deadline', 'Specific Deliverables'];
    } else {
        fields = ['Project Goal', 'Key Constraints', 'Budget Range', 'Deadline', 'Specific Deliverables'];
    }

    container.innerHTML = fields.map(f => `
        <div style="margin-bottom:15px;">
            <span class="meta-label" style="margin-left:5px; margin-bottom:8px; display:block;">${f.toUpperCase()}</span>
            <input type="text" class="dyn-input" data-label="${f}" placeholder="Enter details...">
        </div>
    `).join('');
}