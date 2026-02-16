#!/usr/bin/env node
/**
 * MCP Server for E-Commerce Mock API.
 *
 * Provides tools to manage shopping cart and favorites
 * via the e-commerce mock API (port 3002).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Constants
const ECOMMERCE_API_BASE = process.env.ECOMMERCE_API_URL || 'http://localhost:3002';

// Interfaces
interface ApiErrorDetail {
  message: string;
  code: string;
}

interface ApiResponse {
  success: boolean;
  data: unknown;
  error: ApiErrorDetail | null;
  statusCode: number;
}

// Zod Schemas
const UserIdSchema = z.object({
  userId: z.string()
    .min(1, 'userId is required')
    .describe('The unique identifier of the user (session ID)'),
}).strict();

const UserSkuSchema = z.object({
  userId: z.string()
    .min(1, 'userId is required')
    .describe('The unique identifier of the user (session ID)'),
  sku: z.string()
    .min(1, 'sku is required')
    .describe('The SKU code of the product (e.g. "SKU-IP15", "SKU-S24")'),
}).strict();

const AddToCartSchema = z.object({
  userId: z.string()
    .min(1, 'userId is required')
    .describe('The unique identifier of the user (session ID)'),
  sku: z.string()
    .min(1, 'sku is required')
    .describe('The SKU code of the product (e.g. "SKU-IP15", "SKU-S24")'),
  quantity: z.number()
    .int('quantity must be a whole number')
    .positive('quantity must be positive')
    .default(1)
    .describe('Number of items to add (default: 1)'),
}).strict();

// Type definitions from schemas
type UserIdInput = z.infer<typeof UserIdSchema>;
type UserSkuInput = z.infer<typeof UserSkuSchema>;
type AddToCartInput = z.infer<typeof AddToCartSchema>;

// Shared utilities

/**
 * Makes an HTTP request to the e-commerce mock API.
 * @param endpoint - API endpoint path (e.g. "/api/cart/user1")
 * @param method - HTTP method
 * @param body - Optional request body for POST/DELETE
 * @returns Parsed API response
 */
async function makeApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<ApiResponse> {
  const url = `${ECOMMERCE_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return (await response.json()) as ApiResponse;
}

/**
 * Handles API errors and returns a formatted error message.
 * @param error - The caught error
 * @returns Actionable error message string
 */
function handleApiError(error: unknown): string {
  if (error instanceof TypeError && String(error).includes('fetch')) {
    return 'Error: E-commerce API is unreachable. Make sure it is running on ' + ECOMMERCE_API_BASE;
  }
  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Formats a successful API response as tool content.
 */
function formatSuccess(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Formats an error as tool content.
 */
function formatError(message: string): { isError: true; content: Array<{ type: 'text'; text: string }> } {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

// Server initialization
const server = new McpServer({
  name: 'ecommerce-mcp-server',
  version: '1.0.0',
});

// --- Favorites Tools ---

server.registerTool(
  'ecommerce_get_favorites',
  {
    title: 'Get Favorites',
    description: `Get a user's favorite products list.

Args:
  - userId (string): The unique identifier of the user (session ID)

Returns:
  JSON object with schema:
  {
    "favorites": [
      {
        "sku": string,       // Product SKU (e.g. "SKU-IP15")
        "name": string,      // Product name (e.g. "iPhone 15 Pro")
        "price": number,     // Price in TRY
        "addedAt": string    // ISO timestamp
      }
    ]
  }

Examples:
  - Use when: "Show my favorites" -> params with userId from session
  - Use when: "What's in my wishlist?" -> params with userId from session

Error Handling:
  - Returns empty array if user has no favorites
  - Returns error if the API is unreachable`,
    inputSchema: UserIdSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId }: UserIdInput) => {
    try {
      const result = await makeApiRequest(`/api/favorites/${userId}`, 'GET');

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

server.registerTool(
  'ecommerce_add_to_favorites',
  {
    title: 'Add to Favorites',
    description: `Add a product to the user's favorites list.

Args:
  - userId (string): The unique identifier of the user (session ID)
  - sku (string): The SKU code of the product to add (e.g. "SKU-IP15")

Returns:
  JSON object with the added product details:
  {
    "product": {
      "sku": string,
      "name": string,
      "price": number,
      "addedAt": string
    }
  }

Examples:
  - Use when: "Add iPhone to my favorites" -> params with userId, sku="SKU-IP15"
  - Don't use when: User wants to add to cart (use ecommerce_add_to_cart instead)

Error Handling:
  - Returns error "Bu ürün zaten favorilerde" if product already in favorites
  - Returns error "Ürün bulunamadı" if SKU is invalid`,
    inputSchema: UserSkuSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId, sku }: UserSkuInput) => {
    try {
      const result = await makeApiRequest('/api/favorites', 'POST', { userId, sku });

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

server.registerTool(
  'ecommerce_remove_from_favorites',
  {
    title: 'Remove from Favorites',
    description: `Remove a product from the user's favorites list.

Args:
  - userId (string): The unique identifier of the user (session ID)
  - sku (string): The SKU code of the product to remove (e.g. "SKU-IP15")

Returns:
  JSON object with the removed product details:
  {
    "product": {
      "sku": string,
      "name": string
    }
  }

Examples:
  - Use when: "Remove iPhone from my favorites" -> params with userId, sku="SKU-IP15"

Error Handling:
  - Returns error "Bu ürün favorilerde bulunamadı" if product not in favorites
  - Returns error "Ürün bulunamadı" if SKU is invalid`,
    inputSchema: UserSkuSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId, sku }: UserSkuInput) => {
    try {
      const result = await makeApiRequest('/api/favorites', 'DELETE', { userId, sku });

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

// --- Cart Tools ---

server.registerTool(
  'ecommerce_get_cart',
  {
    title: 'Get Cart',
    description: `Get a user's shopping cart contents.

Args:
  - userId (string): The unique identifier of the user (session ID)

Returns:
  JSON object with schema:
  {
    "cart": {
      "items": [
        {
          "sku": string,
          "name": string,
          "price": number,
          "quantity": number,
          "subtotal": number
        }
      ],
      "totalPrice": number,
      "itemCount": number
    }
  }

Examples:
  - Use when: "Show my cart" -> params with userId from session
  - Use when: "What's in my shopping cart?" -> params with userId from session

Error Handling:
  - Returns empty cart if user has no items
  - Returns error if the API is unreachable`,
    inputSchema: UserIdSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId }: UserIdInput) => {
    try {
      const result = await makeApiRequest(`/api/cart/${userId}`, 'GET');

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

server.registerTool(
  'ecommerce_add_to_cart',
  {
    title: 'Add to Cart',
    description: `Add a product to the user's shopping cart. If the product already exists in cart, quantity is increased.

Args:
  - userId (string): The unique identifier of the user (session ID)
  - sku (string): The SKU code of the product to add (e.g. "SKU-IP15")
  - quantity (number): Number of items to add, must be positive integer (default: 1)

Returns:
  JSON object with the added/updated cart item:
  {
    "item": {
      "sku": string,
      "name": string,
      "price": number,
      "quantity": number,
      "subtotal": number
    }
  }

Examples:
  - Use when: "Add iPhone to my cart" -> params with userId, sku="SKU-IP15", quantity=1
  - Use when: "Add 2 MacBook Airs" -> params with userId, sku="SKU-MBA", quantity=2
  - Don't use when: User wants to add to favorites (use ecommerce_add_to_favorites instead)

Error Handling:
  - Returns error "Ürün bulunamadı" if SKU is invalid
  - Returns error if quantity is not a positive integer`,
    inputSchema: AddToCartSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ userId, sku, quantity }: AddToCartInput) => {
    try {
      const result = await makeApiRequest('/api/cart', 'POST', { userId, sku, quantity });

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

server.registerTool(
  'ecommerce_remove_from_cart',
  {
    title: 'Remove from Cart',
    description: `Remove a product from the user's shopping cart entirely.

Args:
  - userId (string): The unique identifier of the user (session ID)
  - sku (string): The SKU code of the product to remove (e.g. "SKU-IP15")

Returns:
  JSON object with removal confirmation:
  {
    "removed": {
      "sku": string,
      "name": string
    }
  }

Examples:
  - Use when: "Remove iPhone from my cart" -> params with userId, sku="SKU-IP15"

Error Handling:
  - Returns error "Bu ürün sepette bulunamadı" if product not in cart
  - Returns error "Ürün bulunamadı" if SKU is invalid`,
    inputSchema: UserSkuSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId, sku }: UserSkuInput) => {
    try {
      const result = await makeApiRequest('/api/cart', 'DELETE', { userId, sku });

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

server.registerTool(
  'ecommerce_clear_cart',
  {
    title: 'Clear Cart',
    description: `Remove all products from the user's shopping cart at once.

Args:
  - userId (string): The unique identifier of the user (session ID)

Returns:
  JSON object with clearing confirmation:
  {
    "cleared": true,
    "itemsRemoved": number,
    "message": string
  }

Examples:
  - Use when: "Clear my cart" -> params with userId from session
  - Use when: "Remove everything from my cart" -> params with userId from session
  - Use when: "Empty my shopping cart" -> params with userId from session
  - Don't use when: User wants to remove a single item (use ecommerce_remove_from_cart instead)

Error Handling:
  - Returns success even if cart is already empty (itemsRemoved: 0)
  - Returns error if the API is unreachable`,
    inputSchema: UserIdSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ userId }: UserIdInput) => {
    try {
      const result = await makeApiRequest('/api/cart/clear', 'DELETE', { userId });

      if (!result.success) {
        return formatError(`Hata: ${result.error?.message || 'Bilinmeyen hata'}`);
      }

      return formatSuccess(result.data);
    } catch (error) {
      return formatError(handleApiError(error));
    }
  },
);

// Start the server with stdio transport
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ecommerce-mcp-server started on stdio');
}

main().catch((error: unknown) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
