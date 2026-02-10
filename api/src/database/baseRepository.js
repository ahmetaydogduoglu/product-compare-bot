const DatabaseConnection = require('./connection');

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const DEFAULT_LIMIT = 100;

/**
 * Validates that a string is a safe SQL identifier (table/column name).
 * @param {string} name - The identifier to validate
 * @throws {Error} If the identifier contains unsafe characters
 */
function assertValidIdentifier(name) {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
}

/**
 * Abstract base repository providing common CRUD operations.
 * Extend this class for each database table/entity.
 *
 * @example
 * class ProductRepository extends BaseRepository {
 *   constructor() {
 *     super('products');
 *   }
 *
 *   async findByCategory(category) {
 *     return this.findAll({ category });
 *   }
 * }
 */
class BaseRepository {
  /**
   * @param {string} tableName - The database table this repository manages
   */
  constructor(tableName) {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract — extend it instead');
    }
    if (!tableName) {
      throw new Error('tableName is required');
    }
    assertValidIdentifier(tableName);
    this.tableName = tableName;
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Finds a single record by its primary key.
   * @param {string|number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const { rows } = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  /**
   * Finds all records matching the given filters.
   * @param {object} [filters={}] - Key-value pairs for WHERE clauses (AND)
   * @returns {Promise<object[]>}
   */
  async findAll(filters = {}, { limit = DEFAULT_LIMIT, offset = 0 } = {}) {
    const keys = Object.keys(filters);
    keys.forEach(assertValidIdentifier);

    if (keys.length === 0) {
      const { rows } = await this.db.query(
        `SELECT * FROM ${this.tableName} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rows;
    }

    const conditions = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = Object.values(filters);

    const { rows } = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    return rows;
  }

  /**
   * Inserts a new record and returns it.
   * @param {object} data - Column-value pairs to insert
   * @returns {Promise<object|null>} The created record
   */
  async create(data) {
    const keys = Object.keys(data);
    keys.forEach(assertValidIdentifier);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const { rows } = await this.db.query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    );
    return rows[0] || null;
  }

  /**
   * Updates a record by its primary key.
   * @param {string|number} id
   * @param {object} data - Column-value pairs to update
   * @returns {Promise<object|null>} The updated record
   */
  async update(id, data) {
    const keys = Object.keys(data);
    keys.forEach(assertValidIdentifier);
    const values = Object.values(data);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);

    const { rows } = await this.db.query(
      `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );
    return rows[0] || null;
  }

  /**
   * Deletes a record by its primary key.
   * @param {string|number} id
   * @returns {Promise<boolean>} True if a row was deleted
   */
  async delete(id) {
    const { rowCount } = await this.db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return rowCount > 0;
  }

  /**
   * Returns the total number of records in the table.
   * @returns {Promise<number>}
   */
  async count() {
    const { rows } = await this.db.query(
      `SELECT COUNT(*)::int AS total FROM ${this.tableName}`,
    );
    return rows[0]?.total || 0;
  }
}

module.exports = BaseRepository;
