const { Router } = require('express');
const { getFavorites, addFavorite, removeFavorite } = require('../services/favoriteService');

const router = Router();

/**
 * GET /api/favorites/:userId
 * Returns the user's favorite products.
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const favorites = getFavorites(userId);

    res.json({
      success: true,
      data: { favorites },
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * POST /api/favorites
 * Adds a product to the user's favorites.
 * Body: { userId: string, sku: string }
 */
router.post('/', (req, res) => {
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

    const product = addFavorite(userId, sku);

    res.status(201).json({
      success: true,
      data: { product },
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
    console.error('Add favorite error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * DELETE /api/favorites
 * Removes a product from the user's favorites.
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

    const product = removeFavorite(userId, sku);

    res.json({
      success: true,
      data: { product },
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
    console.error('Remove favorite error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

module.exports = router;
