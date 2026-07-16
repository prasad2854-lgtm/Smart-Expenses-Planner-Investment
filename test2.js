import pg from 'pg';

const pool = new pg.Pool({
    user: 'postgres',
    password: 'Prasad@6879',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
});

pool.query("SELECT 1")
    .then(() => console.log("DB_CONNECTION_SUCCESS"))
    .catch(e => console.log("DB_ERROR_JSON:", JSON.stringify({ message: e.message, code: e.code, detail: e.detail })))
    .finally(() => pool.end());
