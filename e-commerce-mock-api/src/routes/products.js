const { Router } = require('express');
const { getAll, getBySku } = require('../data/products');

const router = Router();

/**
 * GET /api/products
 * Returns all products.
 */
router.get('/', (req, res) => {
  try {
    const products = getAll();
    res.json({
      success: true,
      data: { products },
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

/**
 * GET /api/products/:sku
 * Returns a single product by SKU.
 */
router.get('/:sku', (req, res) => {
  try {
    const { sku } = req.params;
    const product = getBySku(sku);

    if (!product) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { message: 'Ürün bulunamadı', code: 'PRODUCT_NOT_FOUND' },
        statusCode: 404,
      });
    }

    res.json({
      success: true,
      data: { product },
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

module.exports = router;
