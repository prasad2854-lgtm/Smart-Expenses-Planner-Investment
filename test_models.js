import fs from 'fs';

const models = ['gemini-2.5-flash', 'gemini-pro-2.0-preview', 'gemini-3-flash-preview'];
const b = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
(async () => {
    for (const m of models) {
        try {
            const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=GEMINI_PUBLIC_API_KEY_PLACEHOLDER', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: '{\"amount\": 35.36}' }, { inlineData: { mimeType: 'image/jpeg', data: b } }] }] }) });
            console.log(m, r.status);
            if (r.ok) {
                const o = await r.json();
                console.log(m, 'Response:', o.candidates[0].content.parts[0].text);
            } else {
                const text = await r.text();
                console.log(m, 'Error:', text);
            }
        } catch (e) { console.log(m, 'Error', e); }
    }
})();
