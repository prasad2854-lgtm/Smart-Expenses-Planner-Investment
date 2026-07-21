fetch('http://localhost:3001/api/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer FAKETOKEN' },
    body: JSON.stringify({ prompt: 'Tell me about investing' })
}).then(r => r.json()).then(console.log).catch(console.error);
