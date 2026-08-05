import fs from 'fs';
import { execSync } from 'child_process';

try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const parts = line.split('=');
        if (parts.length < 2) continue;
        const key = parts[0];
        const val = parts.slice(1).join('=').replace(/^"|"$/g, '');

        console.log('Pushing: ' + key);
        try {
            execSync(`npx vercel env add ${key} production`, { input: val, stdio: ['pipe', 'ignore', 'ignore'] });
            execSync(`npx vercel env add ${key} preview`, { input: val, stdio: ['pipe', 'ignore', 'ignore'] });
            execSync(`npx vercel env add ${key} development`, { input: val, stdio: ['pipe', 'ignore', 'ignore'] });
            console.log('SUCCESS: ' + key);
        } catch (e) {
            // Might fail if it already exists, so we try rm and add just in case! 
            try {
                execSync(`npx vercel env rm ${key} production -y`, { stdio: 'ignore' });
                execSync(`npx vercel env add ${key} production`, { input: val, stdio: ['pipe', 'ignore', 'ignore'] });
                console.log('Re-added: ' + key);
            } catch (e2) {
                console.error('Failed to push: ' + key);
            }
        }
    }
    console.log('Environment variable sync complete.');
} catch (err) {
    console.error('Script Error: ', err.message);
}
