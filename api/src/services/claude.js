const Anthropic = require('@anthropic-ai/sdk');
const mcpClient = require('./mcpClient');

const client = new Anthropic();

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 5;

// sessionId → { products: Map<sku, product>, messages: Array, lastActivity: number }
const sessions = new Map();

// Tool definitions are static per server lifecycle — cache after first fetch
let cachedTools = null;

/**
 * Returns MCP tools, fetching once and caching for subsequent calls.
 * @returns {Promise<object[]>}
 */
async function getToolsCached() {
  if (!cachedTools) {
    cachedTools = await mcpClient.getTools();
  }
  return cachedTools;
}

/**
 * Removes sessions that have been inactive longer than SESSION_TTL_MS.
 * Runs automatically every 5 minutes.
 */
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

const cleanupInterval = setInterval(cleanupSessions, 5 * 60 * 1000);
cleanupInterval.unref();

/**
 * Builds the system prompt including product data and tool usage instructions.
 * @param {Map} products - Map of SKU to product objects
 * @param {string} sessionId - Current user's session ID, used as userId in tool calls
 * @returns {string} System prompt for Claude
 */
function buildSystemPrompt(products, sessionId) {
  const productBlock = JSON.stringify([...products.values()], null, 2);

  return `Sen bir ürün karşılaştırma asistanısın. Kullanıcıya ürünleri karşılaştırmasında yardımcı oluyorsun.

Aşağıda karşılaştırılacak ürünlerin bilgileri verilmiştir:

${productBlock}

Görevlerin:
- Ürünleri özelliklerine göre karşılaştır
- Avantaj ve dezavantajları belirt
- Kullanıcının ihtiyacına göre öneri yap
- Fiyat/performans değerlendirmesi yap
- Türkçe cevap ver
- Kısa ve öz cevaplar ver, gereksiz uzatma

Sepet ve Favori İşlemleri:
- Kullanıcı bir ürünü beğendiğinde "Bu ürünü sepetine veya favorilerine eklememi ister misin?" diye teklif et
- Kullanıcı kabul ederse ilgili tool'u çağır
- Tool çağrılarında userId olarak "${sessionId}" değerini kullan
- Sepete eklemede varsayılan miktar 1'dir
- Tool sonuçlarını Türkçe olarak kullanıcıya bildir (örn: "iPhone 15 Pro sepetine eklendi!")
- Hata durumlarında kullanıcıyı nazikçe bilgilendir (örn: "Bu ürün zaten favorilerinde.")`;
}

/**
 * Ensures a session exists. Creates one if needed.
 * @param {string} sessionId
 */
function ensureSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      products: new Map(),
      messages: [],
      lastActivity: Date.now(),
    });
  } else {
    sessions.get(sessionId).lastActivity = Date.now();
  }
}

/**
 * Adds products to an existing session's context.
 * New products are merged with existing ones (by SKU).
 * @param {string} sessionId
 * @param {object[]} newProducts
 */
function addProducts(sessionId, newProducts) {
  ensureSession(sessionId);
  const session = sessions.get(sessionId);
  for (const p of newProducts) {
    if (!p.error) {
      session.products.set(p.sku, p);
    }
  }
}

/**
 * Sends a user message within an existing session and returns Claude's reply.
 * Supports tool use loop: if Claude requests tool calls, they are executed
 * via the MCP client and results are fed back until a final text response.
 * @param {string} sessionId
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function chat(sessionId, userMessage) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session bulunamadı: ${sessionId}`);
  }

  // Save snapshot to restore if the API call fails
  const previousMessages = session.messages;
  session.messages = [...session.messages, { role: 'user', content: userMessage }];
  session.lastActivity = Date.now();

  // Keep only the last MAX_MESSAGES to prevent unbounded growth
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  // Fetch MCP tools (cached after first call)
  const tools = await getToolsCached();

  const createParams = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(session.products, sessionId),
    messages: session.messages,
  };

  if (tools.length > 0) {
    createParams.tools = tools;
  }

  let response;
  try {
    response = await client.messages.create(createParams);
  } catch (error) {
    // Restore session to avoid an orphaned user message with no assistant reply
    session.messages = previousMessages;
    throw error;
  }

  let rounds = 0;

  // Tool use loop: keep executing tools until Claude gives a final response
  while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Push full assistant content (may contain text + tool_use blocks)
    session.messages.push({ role: 'assistant', content: response.content });

    // Execute each tool_use block
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        try {
          const result = await mcpClient.callTool(block.name, block.input);
          const resultText = result.content
            .map((c) => c.text || '')
            .join('');

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: resultText,
          });
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool hatası: ${error.message}`,
            is_error: true,
          });
        }
      }
    }

    // Push tool results as a user message
    session.messages.push({ role: 'user', content: toolResults });

    // Call Claude again with updated conversation
    const nextParams = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(session.products, sessionId),
      messages: session.messages,
    };

    if (tools.length > 0) {
      nextParams.tools = tools;
    }

    response = await client.messages.create(nextParams);
  }

  // Extract final text response
  const assistantText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  session.messages.push({ role: 'assistant', content: assistantText });

  return assistantText;
}

/**
 * Sends a user message within an existing session and streams Claude's reply
 * via handler callbacks. Supports multi-round tool use with streaming.
 * @param {string} sessionId
 * @param {string} userMessage
 * @param {object} handler - Callback handlers
 * @param {function} handler.onTextDelta - Called with each text token chunk
 * @param {function} handler.onToolStart - Called with (toolName, round) when a tool starts
 * @param {function} handler.onToolEnd - Called with (toolName, round) when a tool finishes
 * @param {function} handler.onDone - Called when streaming is complete
 * @param {function} handler.onError - Called with error on failure
 * @param {AbortSignal} [handler.signal] - Optional AbortSignal for cancellation
 */
async function chatStream(sessionId, userMessage, handler) {
  const session = sessions.get(sessionId);
  if (!session) {
    handler.onError(new Error(`Session bulunamadı: ${sessionId}`));
    return;
  }

  // Save snapshot to restore if an error occurs mid-stream
  const previousMessages = session.messages;
  session.messages = [...session.messages, { role: 'user', content: userMessage }];
  session.lastActivity = Date.now();

  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  // Fetch MCP tools (cached after first call)
  const tools = await getToolsCached();
  let fullAssistantText = '';
  let rounds = 0;
  let continueLoop = true;

  try {
    while (continueLoop) {
      if (handler.signal?.aborted) return;

      // Reset per-round text so only the final round's text is stored in session history.
      // Intermediate tool_use rounds are already stored via finalMessage.content below.
      fullAssistantText = '';

      const params = {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(session.products, sessionId),
        messages: session.messages,
      };

      if (tools.length > 0) {
        params.tools = tools;
      }

      const stream = client.messages.stream(params);

      stream.on('text', (delta) => {
        if (handler.signal?.aborted) return;
        fullAssistantText += delta;
        handler.onTextDelta(delta);
      });

      const finalMessage = await stream.finalMessage();

      if (finalMessage.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        // Push full assistant content (text + tool_use blocks) for this intermediate round
        session.messages.push({ role: 'assistant', content: finalMessage.content });

        const toolResults = [];
        for (const block of finalMessage.content) {
          if (block.type === 'tool_use') {
            if (handler.signal?.aborted) return;
            handler.onToolStart(block.name, rounds);
            try {
              const result = await mcpClient.callTool(block.name, block.input);
              const resultText = result.content
                .map((c) => c.text || '')
                .join('');

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: resultText,
              });
            } catch (error) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Tool hatası: ${error.message}`,
                is_error: true,
              });
            }
            handler.onToolEnd(block.name, rounds);
          }
        }

        session.messages.push({ role: 'user', content: toolResults });
      } else {
        continueLoop = false;
      }
    }

    // Push only the final round's streamed text
    session.messages.push({ role: 'assistant', content: fullAssistantText });
    handler.onDone();
  } catch (err) {
    // Restore session to avoid an orphaned user message with no assistant reply
    session.messages = previousMessages;
    handler.onError(err);
  }
}

/**
 * Checks whether a session already exists.
 * @param {string} sessionId
 * @returns {boolean}
 */
function hasSession(sessionId) {
  return sessions.has(sessionId);
}

/**
 * Resets the cached MCP tools. Intended for use in tests only.
 */
function resetToolsCache() {
  cachedTools = null;
}

module.exports = { ensureSession, addProducts, chat, chatStream, hasSession, resetToolsCache };
