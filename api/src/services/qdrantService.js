const { QdrantClient } = require('@qdrant/js-client-rest');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'products';
const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const DEFAULT_TOP_K = 15;
// Minimum cosine similarity score — results below this threshold are discarded
const SCORE_THRESHOLD = 0.5;

let _client = null;
let _embedder = null;

/**
 * Returns a lazily initialized Qdrant client singleton.
 * @returns {QdrantClient}
 */
function getClient() {
  if (!_client) {
    _client = new QdrantClient({ url: QDRANT_URL });
  }
  return _client;
}

/**
 * Returns a lazily initialized Xenova feature-extraction pipeline singleton.
 * Downloads the model on first call (~90 MB); subsequent calls are instant.
 * @returns {Promise<Function>}
 */
async function getEmbedder() {
  if (!_embedder) {
    const { pipeline } = await import('@xenova/transformers');
    _embedder = await pipeline('feature-extraction', MODEL_NAME);
  }
  return _embedder;
}

/**
 * Embeds a query string and performs a cosine similarity search in Qdrant.
 * Returns up to topK product payloads that exceed SCORE_THRESHOLD.
 * Fails gracefully — callers should catch and continue without RAG results.
 * @param {string} query - User's message (Turkish or English)
 * @param {number} [topK=3] - Maximum number of results to return
 * @returns {Promise<object[]>} Array of product payload objects { sku, name, brand, price, category, description }
 */
async function searchProducts(query, topK = DEFAULT_TOP_K) {
  const embedder = await getEmbedder();
  const output = await embedder(query, { pooling: 'mean', normalize: true });
  const vector = Array.from(output.data);

  const results = await getClient().search(COLLECTION_NAME, {
    vector,
    limit: topK,
    with_payload: true,
    score_threshold: SCORE_THRESHOLD,
  });

  const payloads = results.map((r) => r.payload);
  console.log(`[RAG] "${query.slice(0, 50)}" → ${payloads.map((p) => p.name).join(', ') || 'no results'}`);
  return payloads;
}

module.exports = { searchProducts };
