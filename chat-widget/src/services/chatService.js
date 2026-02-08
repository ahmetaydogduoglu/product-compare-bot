const API_URL = 'http://localhost:3001/api/chat';

const listeners = [];
let sessionId = null;
let skus = [];

/**
 * Sets the SKU list for the current session.
 * Called externally via custom event before the first message.
 * @param {string[]} skuList
 */
export function setSkus(skuList) {
  skus = skuList;
}

/**
 * Sends a message to the API and notifies listeners with the bot response.
 * On the first message, sends the stored SKUs to initialize product context.
 * Subsequent messages reuse the same sessionId so context is preserved.
 * @param {string} text
 */
export async function sendMessage(text) {
  try {
    const isFirstMessage = !sessionId;

    if (isFirstMessage) {
      sessionId = `session-${Date.now()}`;
    }

    const body = { message: text, sessionId };

    if (isFirstMessage && skus.length > 0) {
      body.skus = skus;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'API hatası');
    }

    const botMessage = {
      id: Date.now(),
      text: data.reply,
      sender: 'bot',
      timestamp: new Date(),
    };

    listeners.forEach((cb) => cb(botMessage));
  } catch (err) {
    const errorMessage = {
      id: Date.now(),
      text: `Hata: ${err.message}`,
      sender: 'bot',
      timestamp: new Date(),
    };
    listeners.forEach((cb) => cb(errorMessage));
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
