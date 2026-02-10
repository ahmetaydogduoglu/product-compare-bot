const { getBySku } = require('../data/products');

/** @type {Map<string, Set<string>>} userId → Set of SKUs */
const favorites = new Map();

/**
 * Returns the favorite products for a given user.
 * Each favorite is returned with full product details.
 * @param {string} userId - The user identifier
 * @returns {object[]} Array of product objects
 */
function getFavorites(userId) {
  const userFavorites = favorites.get(userId);
  if (!userFavorites || userFavorites.size === 0) {
    return [];
  }
  return Array.from(userFavorites).map((sku) => getBySku(sku));
}

/**
 * Adds a product to the user's favorites.
 * Throws if the SKU is invalid or already in favorites.
 * @param {string} userId - The user identifier
 * @param {string} sku - The product SKU
 * @returns {object} The added product object
 */
function addFavorite(userId, sku) {
  const product = getBySku(sku);
  if (!product) {
    const error = new Error('Ürün bulunamadı');
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  if (!favorites.has(userId)) {
    favorites.set(userId, new Set());
  }

  const userFavorites = favorites.get(userId);
  if (userFavorites.has(sku.toUpperCase())) {
    const error = new Error('Ürün zaten favorilerde');
    error.statusCode = 409;
    error.code = 'ALREADY_IN_FAVORITES';
    throw error;
  }

  userFavorites.add(sku.toUpperCase());
  return product;
}

/**
 * Removes a product from the user's favorites.
 * Throws if the SKU is not in the user's favorites.
 * @param {string} userId - The user identifier
 * @param {string} sku - The product SKU
 * @returns {object} The removed product object
 */
function removeFavorite(userId, sku) {
  const product = getBySku(sku);
  if (!product) {
    const error = new Error('Ürün bulunamadı');
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const userFavorites = favorites.get(userId);
  if (!userFavorites || !userFavorites.has(sku.toUpperCase())) {
    const error = new Error('Ürün favorilerde bulunamadı');
    error.statusCode = 404;
    error.code = 'NOT_IN_FAVORITES';
    throw error;
  }

  userFavorites.delete(sku.toUpperCase());
  return product;
}

module.exports = { getFavorites, addFavorite, removeFavorite };
