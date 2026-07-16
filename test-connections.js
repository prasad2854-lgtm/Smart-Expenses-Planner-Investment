import pg from 'pg';

async function testConnection(host, user, password, db) {
    const pool = new pg.Pool({ host, user, password, database: db, port: 5432 });
    try {
        await pool.query('SELECT 1');
        console.log(`SUCCESS: host=${host}, user=${user}, password=${password}`);
        return true;
    } catch (e) {
        console.log(`FAILED: host=${host}, user=${user} - ${e.code}`);
        return false;
    } finally {
        pool.end();
    }
}

async function runTests() {
    await testConnection('localhost', 'postgres', undefined, 'postgres');
    await testConnection('127.0.0.1', 'postgres', undefined, 'postgres');

    // Try OS username (sivak)
    await testConnection('localhost', 'sivak', undefined, 'postgres');
    console.log("TESTS FINISHED");
    process.exit(0);
}

runTests();
