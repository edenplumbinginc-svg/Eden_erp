// lib/tx.js
// Transaction helper for PostgreSQL operations

/**
 * Execute a function within a database transaction.
 * @param {import('pg').Pool} pool - The database connection pool
 * @param {Function} fn - Async function that receives a client and performs transactional operations
 * @returns {Promise<*>} The result from the function
 */
async function withTx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { withTx };
