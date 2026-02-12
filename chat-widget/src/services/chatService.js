let apiUrl = 'http://localhost:3001/api/chat';

const listeners = [];
const deltaListeners = [];
let sessionId = null;
let skus = [];
let sending = false;

/**
 * Sets the API base URL for chat requests.
 * @param {string} url
 */
export function setApiUrl(url) {
  apiUrl = url;
}

/**
 * Sets the SKU list for the current session.
 * Called externally via custom event before the first message.
 * @param {string[]} skuList
 */
export function setSkus(skuList) {
  skus = skuList;
  sessionId = null;
}

/**
 * Parses an SSE buffer into complete events, returning parsed events
 * and any remaining incomplete data.
 * @param {string} buffer - Raw SSE text buffer
 * @returns {{ events: Array<{event: string, data: string}>, remaining: string }}
 */
function parseSSEBuffer(buffer) {
  const events = [];
  const blocks = buffer.split('\n\n');
  // Last element may be incomplete — keep it as remaining
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let event = 'message';
    let data = '';

    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }

    if (data) {
      events.push({ event, data });
    }
  }

  return { events, remaining };
}

/**
 * Sends a message to the API and streams the bot response via SSE.
 * Notifies delta listeners progressively and message listeners on completion.
 * On the first message, sends the stored SKUs to initialize product context.
 * Subsequent messages reuse the same sessionId so context is preserved.
 * @param {string} text
 */
export async function sendMessage(text) {
  if (sending) return;
  sending = true;

  const messageId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let accumulated = '';

  try {
    const isFirstMessage = !sessionId;

    if (isFirstMessage) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const body = { message: text, sessionId };

    if (isFirstMessage && skus.length > 0) {
      body.skus = skus;
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';

    // Validation errors come back as JSON (before SSE starts)
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'API hatası');
      }
      // Fallback: if the API ever returns JSON success (shouldn't happen with streaming)
      const botMessage = {
        id: messageId,
        text: data.data.reply,
        sender: 'bot',
        timestamp: new Date(),
      };
      listeners.forEach((cb) => cb(botMessage));
      return;
    }

    // SSE stream consumption
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSSEBuffer(buffer);
      buffer = parsed.remaining;

      for (const { event, data } of parsed.events) {
        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        if (event === 'delta') {
          accumulated += payload.text;
          deltaListeners.forEach((cb) => cb({
            id: messageId,
            text: accumulated,
            delta: payload.text,
            sender: 'bot',
            timestamp: new Date(),
          }));
        } else if (event === 'done') {
          const botMessage = {
            id: messageId,
            text: accumulated,
            sender: 'bot',
            timestamp: new Date(),
          };
          listeners.forEach((cb) => cb(botMessage));
        } else if (event === 'error') {
          throw new Error(payload.message || 'Stream hatası');
        }
        // tool_start / tool_end — could be used for UI indicators in the future
      }
    }
  } catch (err) {
    const errorMessage = {
      id: messageId,
      text: `Hata: ${err.message}`,
      sender: 'bot',
      timestamp: new Date(),
    };
    listeners.forEach((cb) => cb(errorMessage));
  } finally {
    sending = false;
  }
}

/**
 * Registers a callback for completed messages (called once when streaming finishes).
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onMessage(callback) {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Registers a callback for streaming deltas (called on each text chunk).
 * The callback receives { id, text (accumulated), delta (new chunk), sender, timestamp }.
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onDelta(callback) {
  deltaListeners.push(callback);
  return () => {
    const index = deltaListeners.indexOf(callback);
    if (index > -1) deltaListeners.splice(index, 1);
  };
}
