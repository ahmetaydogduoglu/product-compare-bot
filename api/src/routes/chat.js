const { Router } = require('express');
const { getProductsBySku } = require('../services/productService');
const claude = require('../services/claude');

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SKUS = 6;

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, skus } = req.body;

    if (!message || typeof message !== 'string' || !sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: 'message ve sessionId gerekli (string)', code: 'MISSING_FIELDS' },
        statusCode: 400,
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { message: `Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir`, code: 'MESSAGE_TOO_LONG' },
        statusCode: 400,
      });
    }

    if (skus !== undefined) {
      if (!Array.isArray(skus) || skus.length > MAX_SKUS || !skus.every((s) => typeof s === 'string')) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: `skus en fazla ${MAX_SKUS} elemanlı string dizisi olmalı`, code: 'INVALID_SKUS' },
          statusCode: 400,
        });
      }
    }

    // Ensure session exists (creates if new)
    claude.ensureSession(sessionId);

    // If SKUs provided, fetch products and add to session context
    if (skus && skus.length > 0) {
      const products = getProductsBySku(skus);
      claude.addProducts(sessionId, products);
    }

    const reply = await claude.chat(sessionId, message);

    res.json({
      success: true,
      data: { reply, sessionId },
      error: null,
      statusCode: 200,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' },
      statusCode: 500,
    });
  }
});

module.exports = router;
