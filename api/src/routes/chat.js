const { Router } = require('express');
const { getProductsBySku } = require('../services/productService');
const claude = require('../services/claude');

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SKUS = 6;

/**
 * Writes a single SSE event to the response stream.
 * @param {import('express').Response} res
 * @param {string} event - Event name (delta, tool_start, tool_end, done, error)
 * @param {object} data - JSON-serializable payload
 */
function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post('/', async (req, res) => {
  const { message, sessionId, skus } = req.body;

  // Validation errors return JSON (before SSE starts)
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

  // Start SSE response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Track client disconnect to stop writing
  const abortController = new AbortController();
  let closed = false;

  req.on('close', () => {
    closed = true;
    abortController.abort();
  });

  /**
   * Safe SSE write — skips if the client has disconnected.
   * @param {string} event
   * @param {object} data
   */
  function safeSend(event, data) {
    if (!closed) sendSSE(res, event, data);
  }

  claude.chatStream(sessionId, message, {
    signal: abortController.signal,
    onTextDelta(text) {
      safeSend('delta', { text });
    },
    onToolStart(tool, round) {
      safeSend('tool_start', { tool, round });
    },
    onToolEnd(tool, round) {
      safeSend('tool_end', { tool, round });
    },
    onDone() {
      safeSend('done', { sessionId });
      if (!closed) res.end();
    },
    onError(err) {
      console.error('Chat stream error:', err);
      safeSend('error', { message: 'Bir hata oluştu', code: 'INTERNAL_ERROR' });
      if (!closed) res.end();
    },
  });
});

module.exports = router;
