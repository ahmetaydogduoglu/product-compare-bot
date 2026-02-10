let apiUrl = 'http://localhost:3001/api/chat';

const listeners = [];
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
 * Sends a message to the API and notifies listeners with the bot response.
 * On the first message, sends the stored SKUs to initialize product context.
 * Subsequent messages reuse the same sessionId so context is preserved.
 * @param {string} text
 */
export async function sendMessage(text) {
  if (sending) return;
  sending = true;

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

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'API hatası');
    }

    const botMessage = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: data.data.reply,
      sender: 'bot',
      timestamp: new Date(),
    };

    listeners.forEach((cb) => cb(botMessage));
  } catch (err) {
    const errorMessage = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
 * Registers a callback for incoming messages.
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
