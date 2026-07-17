import express from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_dev';
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || 'placeholder';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Setup database on start
initDb();

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();
        const result = await pool.query(
            'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
            [userId, email, hashedPassword, name]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ user, token });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please login with Google' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential
        });
        const payload = ticket.getPayload();
        if (!payload) return res.status(400).json({ error: 'Invalid Google token' });

        const { sub: google_id, email, name } = payload;

        let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (result.rows.length === 0) {
            // Create user
            const userId = crypto.randomUUID();
            const insertResult = await pool.query(
                'INSERT INTO users (id, email, google_id, name) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
                [userId, email, google_id, name]
            );
            user = insertResult.rows[0];
        } else {
            user = result.rows[0];
            // Update google_id if missing
            if (!user.google_id) {
                await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [google_id, user.id]);
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
        console.error("Google verify error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error("Fetch user error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- State Routes ---
app.get('/api/state', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT state_data FROM app_states WHERE id = $1', [req.user.id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].state_data);
        } else {
            res.status(404).json({ error: 'State not found' });
        }
    } catch (err) {
        console.error("Error fetching state:", err);
        res.status(500).json({ error: 'Server error fetching state' });
    }
});

app.post('/api/state', authenticateToken, async (req, res) => {
    try {
        const stateData = req.body;
        await pool.query(
            `INSERT INTO app_states (id, state_data, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) 
       DO UPDATE SET state_data = $2, updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, JSON.stringify(stateData)]
        );
        res.json({ success: true, message: 'State saved successfully' });
    } catch (err) {
        console.error("Error saving state:", err);
        res.status(500).json({ error: 'Server error saving state' });
    }
});

app.delete('/api/state', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM app_states WHERE id = $1', [req.user.id]);
        res.json({ success: true, message: 'Profile reset successfully' });
    } catch (err) {
        console.error("Error resetting state:", err);
        res.status(500).json({ error: 'Server error resetting state' });
    }
});

app.post('/api/transactions/automated', authenticateToken, async (req, res) => {
    try {
        const { source, title, data, type } = req.body;
        // Fetch current user's state
        const stateRes = await pool.query('SELECT state_data FROM app_states WHERE id = $1', [req.user.id]);

        let stateData = {
            profiles: {},
            operations: [],
            userType: 'EMPLOYEE',
            monthlyLimit: 0,
            hasOwnHouse: true,
            fixedRent: 0
        };

        if (stateRes.rows.length > 0 && stateRes.rows[0].state_data) {
            stateData = stateRes.rows[0].state_data;
        }

        // Advanced Regex parsing for Indian currency formats (₹, Rs, INR, etc)
        const amountMatch = data.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || data.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR)/i) || data.match(/paid\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i);
        let amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

        // Skip if no amount
        if (amount <= 0) return res.json({ success: true, message: 'Ignored: No amount parsed.' });

        // Heuristic fallback for debit vs credit
        const isCredit = data.toLowerCase().includes('credited') || data.toLowerCase().includes('received');
        const operationType = isCredit ? 'income' : 'expense';

        const category = isCredit ? 'Other Income' : 'Miscellaneous';

        const newOperation = {
            id: crypto.randomUUID(),
            type: operationType,
            amount: amount,
            category: category,
            date: new Date().toISOString().split('T')[0],
            description: `[Auto] ${type.toUpperCase()}: ${source} - ${title}`,
        };

        // Prepend it 
        if (!stateData.operations) stateData.operations = [];
        stateData.operations.unshift(newOperation);

        // Save state back to db
        await pool.query(
            `INSERT INTO app_states (id, state_data, updated_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP) 
             ON CONFLICT (id) 
             DO UPDATE SET state_data = $2, updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, JSON.stringify(stateData)]
        );

        res.json({ success: true, message: 'Automated transaction added successfully' });
    } catch (err) {
        console.error("Auto transaction error:", err);
        res.status(500).json({ error: 'Server error processing automated transaction' });
    }
});

// Make sure to delete the /api/state without auth

// --- Serve React Static Frontend ---
app.use(express.static(path.join(__dirname, '../dist')));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
