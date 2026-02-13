/**
 * THE REAL STUDIOS | Admin UI Engine
 * Version: 1.0 (Executive Oxblood & Command Control)
 */

export function injectAdminStyles() {
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        :root { 
            --admin-oxblood: #99001C; 
            --admin-oxblood-glow: rgba(153, 0, 28, 0.4);
            --admin-gold: #C5A059; /* For Financial Data */
            --obsidian: #050505;
            --deep-glass: rgba(12, 12, 12, 0.98);
            --border-light: rgba(255, 255, 255, 0.08);
            --text-muted: #888;
        }

        /* --- GLOBAL BASE --- */
        body { 
            background-color: var(--obsidian);
            /* Darker, steeper gradient for Admin */
            background-image: linear-gradient(160deg, #1a0505 0%, var(--obsidian) 60%);
            color: #fff; font-family: 'Inter', sans-serif; 
            margin: 0; padding: 0; overflow-x: hidden; min-height: 100vh;
        }

        h2 { font-size: 2rem; font-weight: 400; letter-spacing: -0.5px; margin-bottom: 20px; color: #fff; }
        h3 { font-family: 'Space Mono'; font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }

        /* --- LAYOUT --- */
        main { display: flex; flex-direction: column; opacity: 0; animation: fadeIn 0.5s forwards; }
        @keyframes fadeIn { to { opacity: 1; } }

        .dashboard-section { display: none; }
        .dashboard-section.active { display: block; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* --- SIDEBAR NAVIGATION --- */
        aside {
            position: fixed; width: 260px; height: 100vh; 
            border-right: 1px solid var(--border-light); 
            background: rgba(0,0,0,0.4); backdrop-filter: blur(20px);
            z-index: 100;
        }

        .nav-item {
            display: flex; align-items: center; gap: 15px; 
            padding: 14px 25px; cursor: pointer; border-radius: 4px; 
            transition: all 0.2s ease; color: var(--text-muted);
            margin-bottom: 5px; font-size: 0.85rem; font-weight: 500;
        }
        
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.02); }
        
        .nav-item.active { 
            background: linear-gradient(90deg, rgba(153, 0, 28, 0.1) 0%, transparent 100%);
            color: #fff; border-left: 3px solid var(--admin-oxblood);
        }
        .nav-item.active iconify-icon { color: var(--admin-oxblood); filter: drop-shadow(0 0 8px var(--admin-oxblood-glow)); }

        /* --- CONTROL CARDS (Denser than Client) --- */
        .glass-card {
            background: rgba(255, 255, 255, 0.015); backdrop-filter: blur(12px);
            border: 1px solid var(--border-light); border-radius: 8px; 
            padding: 25px; margin-bottom: 20px; position: relative;
        }
        .glass-card:hover { border-color: rgba(255,255,255,0.15); }

        .admin-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;
        }

        /* --- INPUTS & CONTROLS --- */
        .admin-input {
            width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #333; 
            color: #fff; padding: 12px; font-family: 'Space Mono'; font-size: 0.8rem;
            border-radius: 4px; transition: 0.2s;
        }
        .admin-input:focus { border-color: var(--admin-oxblood); outline: none; }

        .admin-btn {
            background: var(--admin-oxblood); color: #fff; border: none; 
            padding: 12px 20px; cursor: pointer; font-weight: 600; 
            font-size: 0.75rem; letter-spacing: 1px; border-radius: 4px;
            transition: 0.2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .admin-btn:hover { background: #b30022; box-shadow: 0 0 15px var(--admin-oxblood-glow); }
        
        .admin-btn-outline {
            background: transparent; border: 1px solid var(--admin-oxblood); color: var(--admin-oxblood);
        }
        .admin-btn-outline:hover { background: rgba(153, 0, 28, 0.1); }

        /* --- STATUS BADGES --- */
        .status-badge {
            padding: 4px 8px; border-radius: 3px; font-size: 0.65rem; 
            font-family: 'Space Mono'; text-transform: uppercase;
        }
        .status-active { background: rgba(0, 255, 195, 0.1); color: #00ffc3; border: 1px solid rgba(0, 255, 195, 0.2); }
        .status-pending { background: rgba(255, 215, 0, 0.1); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.2); }
        .status-archived { background: rgba(255, 255, 255, 0.05); color: #888; border: 1px solid #444; }

        /* --- RESPONSIVENESS --- */
        @media (min-width: 769px) {
            main { margin-left: 260px; padding: 40px; max-width: 1600px; }
            .mobile-nav { display: none; }
        }
        @media (max-width: 768px) {
            aside { display: none; }
            main { padding: 20px; padding-bottom: 100px; }
        }
    `;
    document.head.appendChild(styleFix);
}

export const adminLoader = {
    init: function() {
        if (document.getElementById("admin-loader")) return;
        const loader = document.createElement('div');
        loader.id = "admin-loader";
        loader.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#050505;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;";
        loader.innerHTML = `
            <div style="font-family:'Space Mono'; color:var(--admin-oxblood); font-size:1.5rem; letter-spacing:5px; font-weight:700;">TRS // ADMIN</div>
            <div style="margin-top:10px; font-size:0.7rem; color:#444;">INITIALIZING COMMAND PROTOCOLS</div>
        `;
        document.body.appendChild(loader);
    },
    complete: function() {
        const el = document.getElementById("admin-loader");
        if(el) { el.style.opacity = 0; setTimeout(() => el.remove(), 500); }
    }
};