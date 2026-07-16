import { pool } from './server/db.js';

async function test() {
    try {
        console.log("Testing insert...");
        const res = await pool.query("INSERT INTO users (id, email, password_hash, name) VALUES ('123', 'test3@test.com', 'hash', 'Me')");
        console.log("Success:", res.rowCount);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit();
    }
}

test();
