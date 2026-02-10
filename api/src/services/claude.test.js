jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock comparison response' }],
      }),
    },
  }));
});

const { ensureSession, addProducts, chat, hasSession } = require('./claude');

describe('claude service', () => {
  const testSessionId = `test-session-${Date.now()}`;

  describe('ensureSession', () => {
    it('should create a new session if it does not exist', () => {
      const sid = `new-${Date.now()}`;
      expect(hasSession(sid)).toBe(false);

      ensureSession(sid);

      expect(hasSession(sid)).toBe(true);
    });

    it('should not overwrite an existing session', () => {
      const sid = `existing-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-TEST', name: 'Test' }]);

      // Call ensureSession again - should not reset
      ensureSession(sid);
      expect(hasSession(sid)).toBe(true);
    });
  });

  describe('hasSession', () => {
    it('should return false for non-existent session', () => {
      expect(hasSession('non-existent')).toBe(false);
    });

    it('should return true for existing session', () => {
      const sid = `has-${Date.now()}`;
      ensureSession(sid);
      expect(hasSession(sid)).toBe(true);
    });
  });

  describe('addProducts', () => {
    it('should add products to session', () => {
      const sid = `add-${Date.now()}`;
      ensureSession(sid);

      const products = [
        { sku: 'SKU-IP15', name: 'iPhone 15 Pro' },
        { sku: 'SKU-S24', name: 'Samsung Galaxy S24 Ultra' },
      ];

      // Should not throw
      expect(() => addProducts(sid, products)).not.toThrow();
    });

    it('should skip products with error markers', () => {
      const sid = `skip-err-${Date.now()}`;
      ensureSession(sid);

      const products = [
        { sku: 'SKU-IP15', name: 'iPhone 15 Pro' },
        { sku: 'SKU-INVALID', error: 'Ürün bulunamadı' },
      ];

      expect(() => addProducts(sid, products)).not.toThrow();
    });

    it('should create session if it does not exist', () => {
      const sid = `auto-create-${Date.now()}`;
      const products = [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }];

      addProducts(sid, products);

      expect(hasSession(sid)).toBe(true);
    });
  });

  describe('chat', () => {
    it('should return assistant text from Claude API', async () => {
      const sid = `chat-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const reply = await chat(sid, 'Compare these products');

      expect(reply).toBe('Mock comparison response');
    });

    it('should throw for non-existent session', async () => {
      await expect(chat('non-existent', 'hello'))
        .rejects.toThrow('Session bulunamadı');
    });
  });
});
