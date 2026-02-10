/**
 * Database connection manager.
 * Implements singleton pattern to ensure a single connection pool
 * is shared across the application.
 *
 * @example
 * const db = DatabaseConnection.getInstance({ host: 'localhost', port: 5432 });
 * await db.connect();
 * const result = await db.query('SELECT * FROM products');
 * await db.disconnect();
 */
class DatabaseConnection {
  /** @type {DatabaseConnection|null} */
  static #instance = null;

  /**
   * Creates a new DatabaseConnection.
   * Use {@link DatabaseConnection.getInstance} instead of calling this directly.
   * @param {object} config
   * @param {string} config.host - Database host
   * @param {number} config.port - Database port
   * @param {string} config.database - Database name
   * @param {string} config.user - Database user
   * @param {string} config.password - Database password
   * @param {number} [config.poolSize=10] - Connection pool size
   */
  constructor(config) {
    if (DatabaseConnection.#instance) {
      throw new Error('Use DatabaseConnection.getInstance() instead of new');
    }

    this.config = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      poolSize: config.poolSize || 10,
    };
    this.pool = null;
    this.connected = false;
  }

  /**
   * Returns the singleton instance. Creates one if it does not exist.
   * @param {object} [config] - Required on first call
   * @returns {DatabaseConnection}
   */
  static getInstance(config) {
    if (!DatabaseConnection.#instance) {
      if (!config) {
        throw new Error('Config is required for the first getInstance() call');
      }
      DatabaseConnection.#instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.#instance;
  }

  /**
   * Opens the connection pool.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) return;

    try {
      // TODO: Replace with actual database driver (e.g. pg, mysql2)
      this.pool = {
        createdAt: Date.now(),
      };
      this.connected = true;
      console.log(`[DB] Connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
    } catch (err) {
      this.pool = null;
      this.connected = false;
      throw err;
    }
  }

  /**
   * Executes a parameterized query.
   * @param {string} sql - SQL query string with $1, $2... placeholders
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<object>} Query result with rows and rowCount
   */
  async query(sql, params = []) {
    if (!this.connected) {
      throw new Error('Database is not connected. Call connect() first.');
    }

    // TODO: Replace with actual query execution
    console.log(`[DB] Query: ${sql}`, params.length ? `| Params: [${params.length} values]` : '');
    return { rows: [], rowCount: 0 };
  }

  /**
   * Closes all connections in the pool.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.connected) return;

    // TODO: Replace with actual pool.end()
    this.pool = null;
    this.connected = false;
    console.log('[DB] Disconnected');
  }

  /**
   * Resets the singleton instance. Disconnects first if needed.
   * Useful for testing.
   * @returns {Promise<void>}
   */
  static async resetInstance() {
    if (DatabaseConnection.#instance?.connected) {
      await DatabaseConnection.#instance.disconnect();
    }
    DatabaseConnection.#instance = null;
  }
}

module.exports = DatabaseConnection;
