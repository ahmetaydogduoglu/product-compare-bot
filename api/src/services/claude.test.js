const mockCreate = jest.fn();
const mockStream = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  }));
});

jest.mock('./mcpClient', () => ({
  getTools: jest.fn().mockResolvedValue([]),
  callTool: jest.fn(),
}));

const { ensureSession, addProducts, chat, chatStream, hasSession, resetToolsCache } = require('./claude');
const mcpClient = require('./mcpClient');

describe('claude service', () => {
  const testSessionId = `test-session-${Date.now()}`;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset tool cache so each test gets a fresh getTools() call
    resetToolsCache();
    // Default mock: simple text response with end_turn
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Mock comparison response' }],
      stop_reason: 'end_turn',
    });
    // Default: no tools available
    mcpClient.getTools.mockResolvedValue([]);
  });

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

    it('should inject sessionId into system prompt for tool calls', async () => {
      const sid = `inject-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      await chat(sid, 'Add this to cart');

      const callArgs = mockCreate.mock.calls[0][0];
      // sessionId must be in system prompt so Claude uses it as userId in tool calls
      expect(callArgs.system).toContain(sid);
      // User message must be clean — no injected prefix
      const firstUserMessage = callArgs.messages[0];
      expect(firstUserMessage.role).toBe('user');
      expect(firstUserMessage.content).toBe('Add this to cart');
      expect(firstUserMessage.content).not.toContain('[sessionId:');
    });

    it('should include tools in API call when available', async () => {
      const sid = `tools-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add item to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      await chat(sid, 'Add to cart');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        }),
      );
    });

    it('should omit tools parameter when no tools available', async () => {
      const sid = `no-tools-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      mcpClient.getTools.mockResolvedValue([]);

      await chat(sid, 'Compare products');

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });

    it('should call mcpClient.getTools only once across multiple chat() calls (cache hit)', async () => {
      const sid = `cache-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      // Arrange: provide a tool so the cache is populated on first call
      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add item to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      mockCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Reply 1' }],
          stop_reason: 'end_turn',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Reply 2' }],
          stop_reason: 'end_turn',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Reply 3' }],
          stop_reason: 'end_turn',
        });

      // Act: three consecutive messages in the same session
      await chat(sid, 'Message 1');
      await chat(sid, 'Message 2');
      await chat(sid, 'Message 3');

      // Assert: getTools must have been fetched exactly once regardless of call count
      expect(mcpClient.getTools).toHaveBeenCalledTimes(1);
    });

    it('should restore session messages when Claude API call throws', async () => {
      const sid = `restore-chat-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      // Capture deep copies of messages at the moment create() is called, before
      // any post-call mutations (Jest stores references, not snapshots).
      const capturedMessages = [];
      mockCreate
        .mockImplementationOnce((params) => {
          capturedMessages.push(JSON.parse(JSON.stringify(params.messages)));
          return Promise.reject(new Error('Network error'));
        })
        .mockImplementationOnce((params) => {
          capturedMessages.push(JSON.parse(JSON.stringify(params.messages)));
          return Promise.resolve({
            content: [{ type: 'text', text: 'OK' }],
            stop_reason: 'end_turn',
          });
        });

      // Act: first call must throw
      await expect(chat(sid, 'First message')).rejects.toThrow('Network error');

      // Act: second call — session must be clean (no orphaned user message from first call)
      await chat(sid, 'Second message');

      // Assert: both calls were made
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // The first create() call received ['First message'] — one user message
      expect(capturedMessages[0]).toHaveLength(1);
      expect(capturedMessages[0][0]).toEqual({ role: 'user', content: 'First message' });

      // The second create() call received only ['Second message'] — proving the session
      // was restored to its pre-failure state and 'First message' was not left behind.
      expect(capturedMessages[1]).toHaveLength(1);
      expect(capturedMessages[1][0]).toEqual({ role: 'user', content: 'Second message' });
    });
  });

  describe('chat - tool use loop', () => {
    it('should execute tool and continue conversation when stop_reason is tool_use', async () => {
      const sid = `tool-loop-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add item to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      // First response: tool_use
      // Second response: final text
      mockCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'text', text: 'Let me add that to your cart.' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'ecommerce_add_to_cart',
              input: { userId: 'test', sku: 'SKU-IP15', quantity: 1 },
            },
          ],
          stop_reason: 'tool_use',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'iPhone 15 Pro sepetine eklendi!' }],
          stop_reason: 'end_turn',
        });

      mcpClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully added to cart' }],
      });

      const reply = await chat(sid, 'Add iPhone to cart');

      // Should call Claude twice (initial + tool result)
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Should call the tool
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        'ecommerce_add_to_cart',
        { userId: 'test', sku: 'SKU-IP15', quantity: 1 },
      );

      // Should return final text
      expect(reply).toBe('iPhone 15 Pro sepetine eklendi!');
    });

    it('should handle tool errors gracefully', async () => {
      const sid = `tool-error-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add item to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      mockCreate
        .mockResolvedValueOnce({
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'ecommerce_add_to_cart',
              input: { userId: 'test', sku: 'INVALID' },
            },
          ],
          stop_reason: 'tool_use',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Üzgünüm, bir hata oluştu.' }],
          stop_reason: 'end_turn',
        });

      mcpClient.callTool.mockRejectedValue(new Error('Product not found'));

      const reply = await chat(sid, 'Add invalid product');

      // Should still complete despite tool error
      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Second call should include error in tool_result
      // The tool result is added as a user message after the assistant message
      const secondCall = mockCreate.mock.calls[1][0];
      const messages = secondCall.messages;
      // Find the user message with tool_result
      const toolResultMessage = messages.find((m) =>
        m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result',
      );
      expect(toolResultMessage).toBeDefined();
      expect(toolResultMessage.content[0].type).toBe('tool_result');
      expect(toolResultMessage.content[0].content).toContain('Tool hatası');
      expect(toolResultMessage.content[0].is_error).toBe(true);

      expect(reply).toBe('Üzgünüm, bir hata oluştu.');
    });

    it('should handle multiple tool calls in single response', async () => {
      const sid = `multi-tool-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [
        { sku: 'SKU-IP15', name: 'iPhone 15 Pro' },
        { sku: 'SKU-S24', name: 'Samsung Galaxy S24' },
      ]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_favorites',
          description: 'Add to favorites',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      mockCreate
        .mockResolvedValueOnce({
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'ecommerce_add_to_favorites',
              input: { userId: 'test', sku: 'SKU-IP15' },
            },
            {
              type: 'tool_use',
              id: 'tool_2',
              name: 'ecommerce_add_to_favorites',
              input: { userId: 'test', sku: 'SKU-S24' },
            },
          ],
          stop_reason: 'tool_use',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Her iki ürün de favorilere eklendi!' }],
          stop_reason: 'end_turn',
        });

      mcpClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Added to favorites' }],
      });

      const reply = await chat(sid, 'Add both to favorites');

      // Should call tool twice
      expect(mcpClient.callTool).toHaveBeenCalledTimes(2);
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        'ecommerce_add_to_favorites',
        { userId: 'test', sku: 'SKU-IP15' },
      );
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        'ecommerce_add_to_favorites',
        { userId: 'test', sku: 'SKU-S24' },
      );

      // Second API call should have 2 tool_result blocks
      const secondCall = mockCreate.mock.calls[1][0];
      const messages = secondCall.messages;
      // Find the user message with tool_result array
      const toolResultMessage = messages.find((m) =>
        m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result',
      );
      expect(toolResultMessage).toBeDefined();
      expect(toolResultMessage.content).toHaveLength(2);
      expect(toolResultMessage.content[0].tool_use_id).toBe('tool_1');
      expect(toolResultMessage.content[1].tool_use_id).toBe('tool_2');

      expect(reply).toBe('Her iki ürün de favorilere eklendi!');
    });

    it('should respect MAX_TOOL_ROUNDS limit', async () => {
      const sid = `max-rounds-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      // Always return tool_use (simulate infinite loop scenario)
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'ecommerce_add_to_cart',
            input: { userId: 'test', sku: 'SKU-IP15' },
          },
        ],
        stop_reason: 'tool_use',
      });

      mcpClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Done' }],
      });

      const reply = await chat(sid, 'Add to cart');

      // Should stop after MAX_TOOL_ROUNDS (5)
      // Initial call + 5 rounds = 6 total calls
      expect(mockCreate).toHaveBeenCalledTimes(6);

      // Should extract any available text from final response
      expect(reply).toBe('');
    });

    it('should extract only text blocks from final response', async () => {
      const sid = `extract-text-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'Here is part one. ' },
          { type: 'text', text: 'And part two.' },
        ],
        stop_reason: 'end_turn',
      });

      const reply = await chat(sid, 'Tell me about this product');

      expect(reply).toBe('Here is part one. And part two.');
    });

    it('should apply MAX_MESSAGES trimming when history exceeds limit', async () => {
      const sid = `max-msg-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      // Send messages to build up history
      for (let i = 0; i < 15; i++) {
        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: `Reply ${i}` }],
          stop_reason: 'end_turn',
        });
        await chat(sid, `Message ${i}`);
      }

      // Check message counts in all API calls
      const allCalls = mockCreate.mock.calls;
      const messageCounts = allCalls.map((call) => call[0].messages.length);

      // After many exchanges, message history growth should be bounded
      // Early calls will have growing history: 1, 3, 5, 7, ...
      // Later calls should stabilize around MAX_MESSAGES (20) due to trimming
      // Verify that the last call has fewer messages than the total exchanges would produce
      const lastCallMessageCount = messageCounts[messageCounts.length - 1];
      const expectedWithoutTrimming = 15 * 2 + 1; // (15 exchanges * 2 messages each) + new user message = 31

      expect(lastCallMessageCount).toBeLessThan(expectedWithoutTrimming);
    });
  });

  describe('chatStream', () => {
    /**
     * Creates a mock stream object that simulates the Anthropic SDK streaming API.
     * @param {string} text - Text to deliver via 'text' event
     * @param {string} stopReason - Final message stop_reason
     * @param {Array} [content] - Optional full content array for finalMessage
     */
    function createMockStream(text, stopReason, content) {
      const handlers = {};
      return {
        on(event, handler) {
          handlers[event] = handler;
          // Deliver text chunks synchronously when 'text' handler is registered
          if (event === 'text' && text) {
            const chunks = text.match(/.{1,5}/g) || [];
            for (const chunk of chunks) {
              handler(chunk);
            }
          }
          return this;
        },
        finalMessage() {
          const finalContent = content || [{ type: 'text', text }];
          return Promise.resolve({
            content: finalContent,
            stop_reason: stopReason,
          });
        },
      };
    }

    it('should stream text deltas via onTextDelta', async () => {
      const sid = `stream-text-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      mockStream.mockReturnValue(
        createMockStream('Hello streaming world', 'end_turn'),
      );

      const deltas = [];
      const handler = {
        onTextDelta: jest.fn((text) => deltas.push(text)),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      await chatStream(sid, 'Test message', handler);

      expect(handler.onTextDelta).toHaveBeenCalled();
      expect(deltas.join('')).toBe('Hello streaming world');
      expect(handler.onDone).toHaveBeenCalledTimes(1);
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('should handle tool use loop with onToolStart and onToolEnd', async () => {
      const sid = `stream-tool-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      // First stream: tool use response
      const toolUseContent = [
        { type: 'text', text: 'Adding...' },
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'ecommerce_add_to_cart',
          input: { userId: 'test', sku: 'SKU-IP15', quantity: 1 },
        },
      ];
      const firstStream = createMockStream('Adding...', 'tool_use', toolUseContent);

      // Second stream: final text
      const secondStream = createMockStream('Eklendi!', 'end_turn');

      mockStream
        .mockReturnValueOnce(firstStream)
        .mockReturnValueOnce(secondStream);

      mcpClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      const handler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      await chatStream(sid, 'Add to cart', handler);

      // Should create 2 streams (initial + after tool)
      expect(mockStream).toHaveBeenCalledTimes(2);

      // Should call tool lifecycle callbacks
      expect(handler.onToolStart).toHaveBeenCalledWith('ecommerce_add_to_cart', 1);
      expect(handler.onToolEnd).toHaveBeenCalledWith('ecommerce_add_to_cart', 1);

      // Should call the actual tool
      expect(mcpClient.callTool).toHaveBeenCalledWith(
        'ecommerce_add_to_cart',
        { userId: 'test', sku: 'SKU-IP15', quantity: 1 },
      );

      expect(handler.onDone).toHaveBeenCalledTimes(1);
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it('should call onError for non-existent session', async () => {
      const handler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      await chatStream('non-existent-session', 'hello', handler);

      expect(handler.onError).toHaveBeenCalledTimes(1);
      expect(handler.onError.mock.calls[0][0].message).toContain('Session bulunamadı');
      expect(handler.onDone).not.toHaveBeenCalled();
    });

    it('should call onError when stream throws', async () => {
      const sid = `stream-err-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      mockStream.mockImplementation(() => {
        throw new Error('API connection failed');
      });

      const handler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      await chatStream(sid, 'Test', handler);

      expect(handler.onError).toHaveBeenCalledTimes(1);
      expect(handler.onError.mock.calls[0][0].message).toBe('API connection failed');
      expect(handler.onDone).not.toHaveBeenCalled();
    });

    it('should restore session messages when stream throws mid-flight', async () => {
      const sid = `restore-stream-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      // Capture deep copies of messages at the moment stream() is called, before
      // any post-call mutations (Jest stores references, not snapshots).
      const capturedMessages = [];

      // Arrange: first stream call throws — catch block in chatStream restores previousMessages
      mockStream.mockImplementationOnce((params) => {
        capturedMessages.push(JSON.parse(JSON.stringify(params.messages)));
        throw new Error('Stream connection lost');
      });

      const failHandler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      // Act: first call must invoke onError and leave the session clean
      await chatStream(sid, 'First stream message', failHandler);
      expect(failHandler.onError).toHaveBeenCalledTimes(1);

      // Arrange: second stream call succeeds; also capture its messages snapshot
      mockStream.mockImplementationOnce((params) => {
        capturedMessages.push(JSON.parse(JSON.stringify(params.messages)));
        return createMockStream('Recovery response', 'end_turn');
      });

      const successHandler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      // Act: second call — session must be clean (no orphaned user message)
      await chatStream(sid, 'Second stream message', successHandler);

      // Assert: both stream() calls were made
      expect(mockStream).toHaveBeenCalledTimes(2);

      // First stream() received ['First stream message'] — one user message
      expect(capturedMessages[0]).toHaveLength(1);
      expect(capturedMessages[0][0]).toEqual({ role: 'user', content: 'First stream message' });

      // Second stream() received only ['Second stream message'] — proving the session
      // was restored to its pre-failure state and 'First stream message' was not left behind.
      expect(capturedMessages[1]).toHaveLength(1);
      expect(capturedMessages[1][0]).toEqual({ role: 'user', content: 'Second stream message' });
      expect(successHandler.onError).not.toHaveBeenCalled();
      expect(successHandler.onDone).toHaveBeenCalledTimes(1);
    });

    it('should store only the final round text in session history after a tool-use round', async () => {
      const sid = `stream-final-text-${Date.now()}`;
      ensureSession(sid);
      addProducts(sid, [{ sku: 'SKU-IP15', name: 'iPhone 15 Pro' }]);

      const mockTools = [
        {
          name: 'ecommerce_add_to_cart',
          description: 'Add to cart',
          input_schema: { type: 'object', properties: {} },
        },
      ];
      mcpClient.getTools.mockResolvedValue(mockTools);

      // Round 1: tool_use round — streams intermediate text 'Adding to cart now...'
      const toolUseContent = [
        { type: 'text', text: 'Adding to cart now...' },
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'ecommerce_add_to_cart',
          input: { userId: sid, sku: 'SKU-IP15', quantity: 1 },
        },
      ];
      const firstStream = createMockStream('Adding to cart now...', 'tool_use', toolUseContent);

      // Round 2: final text — streams 'Eklendi!'
      // Capture session.messages snapshot at the moment the second stream() call is made.
      // At this point the final assistant text has NOT yet been pushed, so we can inspect
      // what the session history looks like before the final push happens.
      let messagesAtRound2Call = null;
      const secondStreamImpl = (params) => {
        messagesAtRound2Call = JSON.parse(JSON.stringify(params.messages));
        return createMockStream('Eklendi!', 'end_turn');
      };

      mockStream
        .mockReturnValueOnce(firstStream)
        .mockImplementationOnce(secondStreamImpl);

      mcpClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'Successfully added' }],
      });

      const handler = {
        onTextDelta: jest.fn(),
        onToolStart: jest.fn(),
        onToolEnd: jest.fn(),
        onDone: jest.fn(),
        onError: jest.fn(),
      };

      await chatStream(sid, 'Add iPhone to cart', handler);

      expect(handler.onDone).toHaveBeenCalledTimes(1);
      expect(handler.onError).not.toHaveBeenCalled();

      // Assert: session history entering round 2 should be:
      //   [user: 'Add iPhone to cart'] + [assistant: tool_use content] + [user: tool_results]
      // There must be NO extra assistant text message between the tool_use assistant block
      // and the tool_result user block — which would indicate fullAssistantText leaked across rounds.
      expect(messagesAtRound2Call).not.toBeNull();

      const round2AssistantMessages = messagesAtRound2Call.filter((m) => m.role === 'assistant');
      // Only one assistant message at round 2 entry: the tool_use round content array
      expect(round2AssistantMessages).toHaveLength(1);
      // It must be the structured content array (tool_use block), not a plain text string
      expect(Array.isArray(round2AssistantMessages[0].content)).toBe(true);

      // Also verify the onTextDelta callbacks: round 1 text AND round 2 text are both streamed.
      // If fullAssistantText were not reset, the second round would still stream correctly
      // but session history would be wrong. The round2 messages snapshot is the definitive check.
      const allDeltaText = handler.onTextDelta.mock.calls.map((c) => c[0]).join('');
      expect(allDeltaText).toContain('Adding to cart now...');
      expect(allDeltaText).toContain('Eklendi!');
    });
  });
});
