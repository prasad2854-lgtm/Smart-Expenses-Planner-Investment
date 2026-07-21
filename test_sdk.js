import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const rawApiKey = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${rawApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const data = await response.json();
        console.log(data);
    } catch (e) {
        console.error("AI ERROR:", e);
    }
}
run();
