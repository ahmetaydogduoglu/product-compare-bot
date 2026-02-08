const { Router } = require('express');
const { getProductsBySku } = require('../services/productService');
const claude = require('../services/claude');

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, skus } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message ve sessionId gerekli' });
    }

    // Ensure session exists (creates if new)
    claude.ensureSession(sessionId);

    // If SKUs provided, fetch products and add to session context
    if (skus && skus.length > 0) {
      const products = getProductsBySku(skus);
      claude.addProducts(sessionId, products);
    }

    const reply = await claude.chat(sessionId, message);

    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Bir hata oluştu' });
  }
});

module.exports = router;
