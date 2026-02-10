const { Router } = require('express');
const { getCart, addToCart, updateQuantity, removeFromCart } = require('../services/cartService');

const router = Router();

/**
 * GET /api/cart/:userId
 * Returns the user's cart with product details and total price.
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const cart = getCart(userId);

    res.json({
      success: true,
      data: { cart },
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * POST /api/cart
 * Adds a product to the user's cart. If already exists, increases quantity.
 * Body: { userId: string, sku: string, quantity: number }
 */
router.post('/', (req, res) => {
  try {
    const { userId, sku, quantity } = req.body;

    if (!userId || typeof userId !== 'string' || !sku || typeof sku !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'userId ve sku gerekli (string)', code: 'MISSING_FIELDS' },
        statusCode: 400,
      });
    }

    if (quantity === undefined || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'quantity pozitif bir tam sayı olmalı', code: 'INVALID_QUANTITY' },
        statusCode: 400,
      });
    }

    const result = addToCart(userId, sku, quantity);

    res.status(201).json({
      success: true,
      data: result,
      error: null,
      statusCode: 201,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        data: null,
        error: { message: err.message, code: err.code },
        statusCode: err.statusCode,
      });
    }
    console.error('Add to cart error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * PATCH /api/cart
 * Updates the quantity of a product in the user's cart.
 * Body: { userId: string, sku: string, quantity: number }
 */
router.patch('/', (req, res) => {
  try {
    const { userId, sku, quantity } = req.body;

    if (!userId || typeof userId !== 'string' || !sku || typeof sku !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'userId ve sku gerekli (string)', code: 'MISSING_FIELDS' },
        statusCode: 400,
      });
    }

    if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'quantity sıfır veya pozitif bir tam sayı olmalı', code: 'INVALID_QUANTITY' },
        statusCode: 400,
      });
    }

    const result = updateQuantity(userId, sku, quantity);

    res.json({
      success: true,
      data: result,
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        data: null,
        error: { message: err.message, code: err.code },
        statusCode: err.statusCode,
      });
    }
    console.error('Update cart error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * DELETE /api/cart
 * Removes a product from the user's cart.
 * Body: { userId: string, sku: string }
 */
router.delete('/', (req, res) => {
  try {
    const { userId, sku } = req.body;

    if (!userId || typeof userId !== 'string' || !sku || typeof sku !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'userId ve sku gerekli (string)', code: 'MISSING_FIELDS' },
        statusCode: 400,
      });
    }

    const result = removeFromCart(userId, sku);

    res.json({
      success: true,
      data: result,
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        data: null,
        error: { message: err.message, code: err.code },
        statusCode: err.statusCode,
      });
    }
    console.error('Remove from cart error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

module.exports = router;
