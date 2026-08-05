const b = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const prompt = `
    Analyze this receipt or invoice image.
    Extract the following information:
    ...
    { "amount": 100, "category": "Food", "note": "Store Name", "items": [{ "name": "Milk", "amount": 4.99, "category": "Food" }] }
`;
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=GEMINI_PUBLIC_API_KEY_PLACEHOLDER', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: b } }] }] })
}).then(r => r.json()).then(o => console.log(JSON.stringify(o.candidates[0].content.parts[0].text))).catch(console.error);
