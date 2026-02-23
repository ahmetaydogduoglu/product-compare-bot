/**
 * Standalone script that indexes all products into a Qdrant vector collection.
 *
 * Usage:
 *   node api/src/scripts/indexProducts.js
 *
 * Prerequisites:
 *   - Qdrant running at QDRANT_URL (default: http://localhost:6333)
 *   - Dependencies installed: @qdrant/js-client-rest, @xenova/transformers
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { QdrantClient } = require('@qdrant/js-client-rest');
const { getAllProducts } = require('../services/productService');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'products';
const VECTOR_SIZE = 384;
const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

/**
 * Maps internal spec keys to their Turkish display labels.
 * Used when building the human-readable description field.
 */
const SPEC_LABELS = {
  ekran: 'ekran',
  islemci: 'işlemci',
  ram: 'RAM',
  depolama: 'depolama',
  kamera: 'kamera',
  batarya: 'batarya',
  agirlik: 'ağırlık',
};

/**
 * Builds a Turkish description string from a product's specs object.
 * Format: "{value} {label}, ..." (e.g. "6.1 inç Super Retina XDR OLED ekran, A17 Pro işlemci")
 * @param {object} specs - Key/value spec object from productService
 * @returns {string}
 */
function buildDescription(specs) {
  return Object.entries(specs)
    .map(([key, value]) => `${value} ${SPEC_LABELS[key] || key}`)
    .join(', ');
}

/**
 * Converts a product object into a plain text string suitable for embedding.
 * @param {object} product - Product object from productService
 * @param {string} description - Pre-built description string
 * @returns {string} Human-readable text representation of the product
 */
function productToText(product, description) {
  return `${product.name} | ${product.brand} | ${product.category} | ${product.price} TL | ${description}`;
}

/**
 * Ensures the Qdrant collection exists with the correct config.
 * Drops and recreates the collection if it already exists (fresh index).
 * @param {QdrantClient} client
 */
async function prepareCollection(client) {
  const existing = await client.getCollections();
  const exists = existing.collections.some((c) => c.name === COLLECTION_NAME);

  if (exists) {
    console.log(`Collection "${COLLECTION_NAME}" already exists — deleting for fresh index.`);
    await client.deleteCollection(COLLECTION_NAME);
  }

  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: VECTOR_SIZE,
      distance: 'Cosine',
    },
  });

  console.log(`Collection "${COLLECTION_NAME}" created.`);
}

/**
 * Generates a 384-dimensional embedding vector for the given text.
 * Uses a lazy-loaded pipeline cached after the first call.
 * @param {Function} embedder - Hugging Face feature-extraction pipeline
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embed(embedder, text) {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Main entry point. Runs the full indexing pipeline:
 * connect → prepare collection → load model → embed + upsert each product → verify.
 */
async function main() {
  // 1. Connect to Qdrant
  console.log(`Connecting to Qdrant at ${QDRANT_URL}...`);
  const client = new QdrantClient({ url: QDRANT_URL });

  try {
    await client.getCollections();
  } catch (err) {
    console.error(`Failed to connect to Qdrant at ${QDRANT_URL}: ${err.message}`);
    process.exit(1);
  }

  // 2. Prepare collection (drop + recreate for fresh index)
  await prepareCollection(client);

  // 3. Load embedding model (ESM-only package — use dynamic import)
  console.log('Loading embedding model...');
  const { pipeline } = await import('@xenova/transformers');
  const embedder = await pipeline('feature-extraction', MODEL_NAME);

  // 4. Embed and upsert each product
  const products = getAllProducts();
  const points = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const description = buildDescription(product.specs);
    const text = productToText(product, description);
    const vector = await embed(embedder, text);

    points.push({
      id: i + 1,
      vector,
      payload: {
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        price: product.price,
        category: product.category,
        description,
      },
    });

    console.log(`[${i + 1}/${products.length}] ${product.name} indexed ✓`);
  }

  await client.upsert(COLLECTION_NAME, { points });

  // 5. Verify point count
  const info = await client.getCollection(COLLECTION_NAME);
  const indexed = info.points_count;
  console.log(`\nDone. ${indexed}/${products.length} products indexed.`);

  if (indexed !== products.length) {
    console.warn('Warning: indexed count does not match expected product count.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
