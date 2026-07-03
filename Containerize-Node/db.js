const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const DEMO_RECORDS_QUERY =
  "SELECT id, title, created_at FROM demo_records ORDER BY id";

let pool;

function createDatabasePool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString: DATABASE_URL,
  });
}

function getDatabasePool() {
  if (!pool) {
    throw new Error("Database has not been initialized");
  }

  return pool;
}

async function initializeDatabase() {
  pool = createDatabasePool();
  await pool.query("SELECT 1");
}

async function fetchDemoRecords() {
  const result = await getDatabasePool().query(DEMO_RECORDS_QUERY);

  return result.rows;
}

async function closeDatabase() {
  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = undefined;
  await activePool.end();
}

module.exports = {
  closeDatabase,
  fetchDemoRecords,
  initializeDatabase,
};