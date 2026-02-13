/**
 * THE REAL STUDIOS | Client UI Engine
 * Version: 9.1 (Centralized Chat & Layout Fix)
 */

export function injectClientStyles() {
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        :root { 
            --studio-red: #D61A21; 
            --studio-red-glow: rgba(214, 26, 33, 0.4);
            --obsidian: #050505;
            --deep-glass: rgba(12, 12, 12, 0.95);
            --border-light: rgba(255, 255, 255, 0.08);
            --text-muted: #888;
        }

        body { 
            background-color: var(--obsidian);
            background-image: radial-gradient(circle at 70% -20%, #1f0505 0%, var(--obsidian) 70%);
            color: #fff; font-family: 'Inter', sans-serif; 
            margin: 0; padding: 0; overflow-x: hidden; min-height: 100vh;
        }

        /* --- CHAT MODAL (CENTRALIZED) --- */
        #secureChatModal.ios-modal-overlay {
            position: fixed; 
            top: 0; left: 0; 
            width: 100%; height: 100%; /* Full Screen */
            background: rgba(0,0,0,0.8); 
            backdrop-filter: blur(8px);
            z-index: 2147483647; /* Maximum possible Z-Index */
            display: flex; 
            justify-content: center; /* Center Horizontally */
            align-items: center; /* Center Vertically */
            opacity: 0; 
            pointer-events: none; 
            transition: opacity 0.3s ease;
        }
        
        #secureChatModal.ios-modal-overlay.open {
            opacity: 1; 
            pointer-events: all;
        }

        .ios-chat-interface {
            width: 400px; 
            height: 600px; 
            max-height: 85vh; /* Prevents being too tall on mobile */
            max-width: 90vw; /* Prevents being too wide on mobile */
            background: #111; 
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px; 
            display: flex; 
            flex-direction: column;
            box-shadow: 0 30px 60px rgba(0,0,0,0.8); 
            overflow: hidden;
            transform: scale(0.95); 
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy pop-in */
            margin: auto; /* Extra safety for centering */
        }
        
        #secureChatModal.open .ios-chat-interface { 
            transform: scale(1); 
        }

        .ios-header {
            padding: 15px 20px; background: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex; justify-content: space-between; align-items: center;
        }
        
        .ios-body {
            flex: 1; padding: 20px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 10px;
            background: #0a0a0a;
        }

        .ios-footer {
            padding: 15px; background: rgba(255,255,255,0.05);
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex; gap: 10px;
        }

        .ios-input {
            flex: 1; background: #222; border: none; padding: 10px 15px;
            border-radius: 20px; color: #fff; font-family: 'Inter'; outline: none;
        }

        .ios-send {
            width: 40px; height: 40px; border-radius: 50%;
            background: var(--studio-red); color: #fff; border: none;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
        }

        /* Bubbles */
        .ios-bubble {
            max-width: 80%; padding: 10px 15px; border-radius: 15px; font-size: 0.9rem;
            word-wrap: break-word;
        }
        .ios-bubble.sent {
            align-self: flex-end; background: var(--studio-red); color: #fff;
            border-bottom-right-radius: 2px;
        }
        .ios-bubble.received {
            align-self: flex-start; background: #333; color: #eee;
            border-bottom-left-radius: 2px;
        }

        /* --- LAYOUT STABILIZATION --- */
        main {
            position: relative;
            display: flex; flex-direction: column; 
        }

        .dashboard-section { 
            display: none; 
            opacity: 0; 
            animation: fadeIn 0.4s ease-out forwards;
            width: 100%;
        }
        
        .dashboard-section.active { 
            display: block; 
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        h2 { font-size: 2.2rem; font-weight: 300; letter-spacing: -1px; margin-bottom: 20px; margin-top: 0; }

        /* --- NAVIGATION --- */
        .nav-item {
            display: flex; align-items: center; gap: 18px; 
            padding: 16px 25px; cursor: pointer; border-radius: 6px; 
            transition: all 0.3s ease; color: #888; border-left: 3px solid transparent;
            margin-bottom: 12px; font-size: 0.9rem; letter-spacing: 0.5px;
        }
        .nav-item:hover { background: rgba(255, 255, 255, 0.03); color: #fff; }
        .nav-item.active { 
            background: linear-gradient(90deg, rgba(214, 26, 33, 0.08) 0%, transparent 100%);
            color: #fff; border-left: 3px solid var(--studio-red);
        }
        .nav-item.active iconify-icon { color: var(--studio-red); filter: drop-shadow(0 0 8px var(--studio-red-glow)); }

        .initiate-btn {
            margin-top: 20px; margin-bottom: 20px;
            border: 1px solid rgba(214, 26, 33, 0.3); background: rgba(214, 26, 33, 0.02);
            color: var(--studio-red) !important; font-weight: 600;
        }
        .initiate-btn.active {
            background: var(--studio-red) !important; color: #000 !important;
            box-shadow: 0 0 25px var(--studio-red-glow);
        }

        /* --- GLASS CARDS --- */
        .glass-card {
            background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(14px);
            border: 1px solid var(--border-light); border-radius: 12px; 
            padding: 35px; margin-bottom: 25px; position: relative;
        }

        /* --- DIGITAL IDENTITY CARD --- */
        .digital-id-card {
            display: flex; gap: 40px; align-items: flex-start;
            background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            position: relative; overflow: hidden;
        }
        .digital-id-card::before {
            content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
            background: var(--studio-red); box-shadow: 0 0 15px var(--studio-red);
        }
        .id-avatar-frame {
            width: 120px; height: 120px; border: 2px solid rgba(255,255,255,0.1);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.3); position: relative;
        }
        .id-avatar-frame iconify-icon { font-size: 4rem; color: #555; }
        .id-badge {
            position: absolute; bottom: 0; right: 0; 
            background: var(--studio-red); color: #fff; font-size: 0.6rem; 
            padding: 4px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 1px;
        }
        .id-details { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .id-field-group label {
            display: block; font-size: 0.65rem; color: var(--studio-red); 
            text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-family: 'Space Mono';
        }
        .id-input {
            width: 100%; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.1);
            color: #fff; font-size: 1.1rem; padding: 5px 0; font-family: 'Inter'; transition: 0.3s;
        }
        .id-input:focus { outline: none; border-bottom-color: var(--studio-red); }
        .id-input:disabled { color: rgba(255,255,255,0.7); border-bottom: 1px solid transparent; cursor: default; }

        /* --- RESPONSIVENESS --- */
        @media (max-width: 768px) {
            .mobile-nav {
                display: flex !important; flex-direction: row !important;
                position: fixed; bottom: 0; left: 0; width: 100%; height: 85px;
                background: rgba(10, 10, 10, 0.95); backdrop-filter: blur(20px);
                border-top: 1px solid var(--border-light);
                justify-content: space-around; align-items: center; z-index: 10000;
            }
            aside { display: none !important; }
            main { padding: 30px 20px 120px 20px; max-width: 100%; margin-left: 0; }
            .digital-id-card { flex-direction: column; gap: 30px; }
            .id-details { grid-template-columns: 1fr; width: 100%; }
        }

        @media (min-width: 769px) {
            aside { display: block !important; position: fixed; width: 280px; height: 100vh; border-right: 1px solid var(--border-light); background: rgba(0,0,0,0.2); }
            main { margin-left: 280px; padding: 60px; max-width: 1400px; }
            .mobile-nav { display: none !important; }
        }
        
        /* Utils */
        .dyn-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid #333; color: #fff; padding: 18px; font-family: 'Space Mono'; border-radius: 4px; }
        .tz-select { background: rgba(0,0,0,0.5); border: 1px solid #333; color: #aaa; font-family: 'Space Mono'; font-size: 0.7rem; padding: 5px; }

        /* Roadmap */
        .roadmap-track { display: flex; align-items: center; justify-content: space-between; position: relative; margin-top: 40px; padding: 0 10px; }
        .roadmap-track::before { content: ''; position: absolute; top: 50%; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.1); transform: translateY(-50%); z-index: 0; border-radius: 4px; }
        .time-node { width: 16px; height: 16px; background: #222; border: 2px solid #555; border-radius: 50%; z-index: 2; position: relative; }
        .time-node.completed { background: var(--studio-red); border-color: var(--studio-red); box-shadow: 0 0 15px var(--studio-red-glow); }
        .time-node.active { background: #000; border-color: var(--studio-red); transform: scale(1.3); }
        .time-label { position: absolute; top: 35px; left: 50%; transform: translateX(-50%); font-family: 'Space Mono'; font-size: 0.7rem; color: #666; width: 100px; text-align: center; }
    `;
    document.head.appendChild(styleFix);
}

export const hudLoader = {
    init: function(logoUrl) {
        if (document.getElementById("hud-loader")) return;
        const loader = document.createElement('div');
        loader.id = "hud-loader";
        loader.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;transition:0.8s;";
        loader.innerHTML = `<img src="${logoUrl}" style="width:160px; filter:drop-shadow(0 0 30px rgba(214,26,33,0.2)); animation:pulse 3s infinite;">`;
        document.body.appendChild(loader);
        
        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse { 0%,100%{opacity:0.8;transform:scale(0.98);} 50%{opacity:1;transform:scale(1.02);filter:drop-shadow(0 0 40px var(--studio-red));} }`;
        document.head.appendChild(style);
    },
    complete: function() {
        const el = document.getElementById("hud-loader");
        if(el) { el.style.opacity = 0; setTimeout(() => el.remove(), 800); }
    }
};