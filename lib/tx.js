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
    console.log('[TX] BEGIN transaction');
    await client.query('BEGIN');
    const result = await fn(client);
    console.log('[TX] About to COMMIT transaction');
    await client.query('COMMIT');
    console.log('[TX] COMMIT successful');
    return result;
  } catch (err) {
    console.error('[TX] Transaction rolled back due to error:', err);
    console.error('[TX] Error stack:', err.stack);
    try { 
      await client.query('ROLLBACK');
      console.log('[TX] ROLLBACK complete');
    } catch (rollbackErr) {
      console.error('[TX] ROLLBACK failed:', rollbackErr);
    }
    throw err;
  } finally {
    console.log('[TX] Releasing client connection');
    client.release();
  }
}

module.exports = { withTx };
