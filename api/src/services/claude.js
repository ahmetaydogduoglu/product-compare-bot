const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGES = 20;

// sessionId → { products: Map<sku, product>, messages: Array, lastActivity: number }
const sessions = new Map();

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

function buildSystemPrompt(products) {
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
- Kısa ve öz cevaplar ver, gereksiz uzatma`;
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
 * @param {string} sessionId
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function chat(sessionId, userMessage) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session bulunamadı: ${sessionId}`);
  }

  session.messages.push({ role: 'user', content: userMessage });
  session.lastActivity = Date.now();

  // Keep only the last MAX_MESSAGES to prevent unbounded growth
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(session.products),
    messages: session.messages,
  });

  const assistantText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  session.messages.push({ role: 'assistant', content: assistantText });

  return assistantText;
}

/**
 * Checks whether a session already exists.
 * @param {string} sessionId
 * @returns {boolean}
 */
function hasSession(sessionId) {
  return sessions.has(sessionId);
}

module.exports = { ensureSession, addProducts, chat, hasSession };
