const fs = require('fs');
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_PUBLIC_API_KEY_PLACEHOLDER', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with exactly: { \"amount\": 35.36, \"category\": \"Food\", \"note\": \"Walmart\", \"items\": [{\"name\": \"Ajax\", \"amount\": 2.96, \"category\": \"Food\"}] }' }] }] })
}).then(r => r.json()).then(o => console.log(o.candidates[0].content.parts[0].text)).catch(console.error);
