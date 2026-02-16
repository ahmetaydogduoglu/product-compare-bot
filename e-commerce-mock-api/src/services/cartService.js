const { getBySku } = require('../data/products');

/** @type {Map<string, Array<{sku: string, quantity: number}>>} userId → cart items */
const carts = new Map();

/**
 * Returns the cart contents for a given user, including product details and total price.
 * @param {string} userId - The user identifier
 * @returns {{ items: object[], totalPrice: number, currency: string }}
 */
function getCart(userId) {
  const cart = carts.get(userId) || [];
  const items = cart.map((item) => {
    const product = getBySku(item.sku);
    return {
      ...product,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    items,
    totalPrice,
    currency: 'TRY',
  };
}

/**
 * Adds a product to the user's cart. If the product already exists, increases quantity.
 * Throws if the SKU is invalid.
 * @param {string} userId - The user identifier
 * @param {string} sku - The product SKU
 * @param {number} quantity - The quantity to add
 * @returns {{ item: object, cart: object }}
 */
function addToCart(userId, sku, quantity) {
  const product = getBySku(sku);
  if (!product) {
    const error = new Error('Ürün bulunamadı');
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  if (!carts.has(userId)) {
    carts.set(userId, []);
  }

  const cart = carts.get(userId);
  const upperSku = sku.toUpperCase();
  const existing = cart.find((item) => item.sku === upperSku);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ sku: upperSku, quantity });
  }

  const addedItem = cart.find((item) => item.sku === upperSku);
  return {
    item: { ...product, quantity: addedItem.quantity },
    cart: getCart(userId),
  };
}

/**
 * Updates the quantity of a product in the user's cart.
 * If quantity is 0, removes the item from the cart.
 * Throws if the product is not in the cart.
 * @param {string} userId - The user identifier
 * @param {string} sku - The product SKU
 * @param {number} quantity - The new quantity
 * @returns {{ item: object|null, cart: object }}
 */
function updateQuantity(userId, sku, quantity) {
  const product = getBySku(sku);
  if (!product) {
    const error = new Error('Ürün bulunamadı');
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const cart = carts.get(userId);
  const upperSku = sku.toUpperCase();

  if (!cart) {
    const error = new Error('Ürün sepette bulunamadı');
    error.statusCode = 404;
    error.code = 'NOT_IN_CART';
    throw error;
  }

  const index = cart.findIndex((item) => item.sku === upperSku);
  if (index === -1) {
    const error = new Error('Ürün sepette bulunamadı');
    error.statusCode = 404;
    error.code = 'NOT_IN_CART';
    throw error;
  }

  if (quantity === 0) {
    cart.splice(index, 1);
    return {
      item: null,
      cart: getCart(userId),
    };
  }

  cart[index].quantity = quantity;
  return {
    item: { ...product, quantity },
    cart: getCart(userId),
  };
}

/**
 * Removes a product from the user's cart.
 * Throws if the product is not in the cart.
 * @param {string} userId - The user identifier
 * @param {string} sku - The product SKU
 * @returns {{ removedItem: object, cart: object }}
 */
function removeFromCart(userId, sku) {
  const product = getBySku(sku);
  if (!product) {
    const error = new Error('Ürün bulunamadı');
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  const cart = carts.get(userId);
  const upperSku = sku.toUpperCase();

  if (!cart) {
    const error = new Error('Ürün sepette bulunamadı');
    error.statusCode = 404;
    error.code = 'NOT_IN_CART';
    throw error;
  }

  const index = cart.findIndex((item) => item.sku === upperSku);
  if (index === -1) {
    const error = new Error('Ürün sepette bulunamadı');
    error.statusCode = 404;
    error.code = 'NOT_IN_CART';
    throw error;
  }

  const removed = cart.splice(index, 1)[0];
  return {
    removedItem: { ...product, quantity: removed.quantity },
    cart: getCart(userId),
  };
}

/**
 * Removes all products from the user's cart.
 * Returns success even if the cart is already empty.
 * @param {string} userId - The user identifier
 * @returns {{ cleared: boolean, itemsRemoved: number, message: string }}
 */
function clearCart(userId) {
  const cart = carts.get(userId);
  const itemsRemoved = cart ? cart.length : 0;
  carts.delete(userId);

  return {
    cleared: true,
    itemsRemoved,
    message: `${itemsRemoved} ürün sepetten çıkarıldı`,
  };
}

module.exports = { getCart, addToCart, updateQuantity, removeFromCart, clearCart };
