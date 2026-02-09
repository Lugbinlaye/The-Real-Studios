/* ==========================================================================
   GLOBAL TRANSLATION LOADER (The Real Studios)
   - Injects CSS for the button & hides Google bar
   - Loads Google Translate Script
   - Generates the Dropdown UI
   - Handles Cookie Logic
   ========================================================================== */

(function() {
    // --- 1. INJECT CSS STYLES ---
    const style = document.createElement('style');
    style.innerHTML = `
        /* Glassy Dropdown Style */
        .lang-select {
            appearance: none;
            -webkit-appearance: none;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            width: 100%;
            min-width: 100px;
            transition: all 0.3s ease;
            outline: none;
        }
        /* Dark Text for Options (since dropdown backgrounds are usually white/system default) */
        .lang-select option {
            background: #222;
            color: #fff;
        }
        .lang-select:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: #ffffff;
        }

        /* Hide Google Translate UI "Nuclear Option" */
        iframe.goog-te-banner-frame { display: none !important; }
        .goog-te-banner-frame { display: none !important; }
        body { position: static !important; top: 0px !important; }
        #google_translate_element { display: none !important; }
        .goog-tooltip, .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
        
        /* RTL Support */
        html[lang="ar"] body { direction: rtl; text-align: right; }
    `;
    document.head.appendChild(style);


    // --- 2. CREATE THE HIDDEN GOOGLE CONTAINER ---
    const googleHiddenDiv = document.createElement('div');
    googleHiddenDiv.id = 'google_translate_element';
    googleHiddenDiv.style.display = 'none';
    document.body.appendChild(googleHiddenDiv);


    // --- 3. DEFINE THE INIT FUNCTION ---
    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,fr,es,pt,de,it,ru,zh-CN,ja,ar,yo',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    };


    // --- 4. LOAD THE GOOGLE SCRIPT ---
    const script = document.createElement('script');
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);


    // --- 5. RENDER DROPDOWN FUNCTION ---
    // This looks for an element with id="trs-lang-container" and fills it
    window.initTranslation = function() {
        const container = document.getElementById('trs-lang-container');
        if (!container) return;

        container.innerHTML = `
            <select id="customLangSelect" class="lang-select">
                <option value="en">🇺🇸 EN</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="es">🇪🇸 ES</option>
                <option value="pt">🇵🇹 PT</option>
                <option value="de">🇩🇪 DE</option>
                <option value="it">🇮🇹 IT</option>
                <option value="ru">🇷🇺 RU</option>
                <option value="zh-CN">🇨🇳 CN</option>
                <option value="ja">🇯🇵 JP</option>
                <option value="ar">🇸🇦 AR</option>
                <option value="yo">🇳🇬 YO</option>
            </select>
        `;

        // --- 6. HANDLE COOKIE LOGIC ---
        const langSelect = document.getElementById('customLangSelect');
        
        // Read Cookie
        const cookies = document.cookie.split(';');
        let currentLang = 'en';
        cookies.forEach(c => {
            if(c.trim().startsWith('googtrans=')) {
                const val = c.trim().split('=')[1]; 
                const parts = val.split('/');
                if(parts[2]) currentLang = parts[2];
            }
        });
        langSelect.value = currentLang;

        // Apply RTL if Arabic on load
        if(currentLang === 'ar') {
            document.documentElement.lang = 'ar';
            document.body.style.direction = 'rtl';
            document.body.style.textAlign = 'right';
        }

        // Set Cookie on Change
        langSelect.addEventListener('change', function() {
            const targetLang = this.value;
            
            // Clear old cookies (Domain + Path)
            document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
            
            // Set new cookie 
            const cookieValue = "/en/" + targetLang;
            document.cookie = "googtrans=" + cookieValue + "; path=/;";
            document.cookie = "googtrans=" + cookieValue + "; path=/; domain=" + window.location.hostname;
            
            window.location.reload();
        });
    };

    // Auto-run if the container exists immediately
    document.addEventListener('DOMContentLoaded', window.initTranslation);

})();