import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const ECOMMERCE_API_BASE = process.env.ECOMMERCE_API_URL || 'http://localhost:3002';

const server = new McpServer({
  name: 'ecommerce-mcp-server',
  version: '1.0.0',
});

/**
 * Makes an HTTP request to the e-commerce mock API.
 * @param endpoint - API endpoint path (e.g. "/api/cart/user1")
 * @param method - HTTP method
 * @param body - Optional request body for POST/DELETE
 * @returns Parsed JSON response
 */
async function makeApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${ECOMMERCE_API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return (await response.json()) as Record<string, unknown>;
}

// --- Favorites Tools ---

server.tool(
  'ecommerce_get_favorites',
  `Get a user's favorite products list.

Args:
  - userId: The unique identifier of the user

Returns:
  - List of favorite products with details (name, price, SKU)

Error Handling:
  - Returns error if the API is unreachable`,
  {
    userId: z.string().describe('The unique identifier of the user'),
  },
  async ({ userId }) => {
    try {
      const result = await makeApiRequest(`/api/favorites/${userId}`, 'GET');

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

server.tool(
  'ecommerce_add_to_favorites',
  `Add a product to the user's favorites list.

Args:
  - userId: The unique identifier of the user
  - sku: The SKU code of the product to add (e.g. "SKU-IP15")

Returns:
  - The added product details

Error Handling:
  - Returns error if the product is already in favorites
  - Returns error if the SKU is invalid`,
  {
    userId: z.string().describe('The unique identifier of the user'),
    sku: z.string().describe('The SKU code of the product (e.g. "SKU-IP15")'),
  },
  async ({ userId, sku }) => {
    try {
      const result = await makeApiRequest('/api/favorites', 'POST', { userId, sku });

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

server.tool(
  'ecommerce_remove_from_favorites',
  `Remove a product from the user's favorites list.

Args:
  - userId: The unique identifier of the user
  - sku: The SKU code of the product to remove (e.g. "SKU-IP15")

Returns:
  - The removed product details

Error Handling:
  - Returns error if the product is not in favorites
  - Returns error if the SKU is invalid`,
  {
    userId: z.string().describe('The unique identifier of the user'),
    sku: z.string().describe('The SKU code of the product (e.g. "SKU-IP15")'),
  },
  async ({ userId, sku }) => {
    try {
      const result = await makeApiRequest('/api/favorites', 'DELETE', { userId, sku });

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

// --- Cart Tools ---

server.tool(
  'ecommerce_get_cart',
  `Get a user's shopping cart contents.

Args:
  - userId: The unique identifier of the user

Returns:
  - Cart items with product details, quantities, and total price

Error Handling:
  - Returns error if the API is unreachable`,
  {
    userId: z.string().describe('The unique identifier of the user'),
  },
  async ({ userId }) => {
    try {
      const result = await makeApiRequest(`/api/cart/${userId}`, 'GET');

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

server.tool(
  'ecommerce_add_to_cart',
  `Add a product to the user's shopping cart.

Args:
  - userId: The unique identifier of the user
  - sku: The SKU code of the product to add (e.g. "SKU-IP15")
  - quantity: Number of items to add (default: 1, must be positive integer)

Returns:
  - Updated cart item details

Error Handling:
  - Returns error if the SKU is invalid
  - Returns error if quantity is invalid`,
  {
    userId: z.string().describe('The unique identifier of the user'),
    sku: z.string().describe('The SKU code of the product (e.g. "SKU-IP15")'),
    quantity: z.number().int().positive().default(1).describe('Number of items to add (default: 1)'),
  },
  async ({ userId, sku, quantity }) => {
    try {
      const result = await makeApiRequest('/api/cart', 'POST', { userId, sku, quantity });

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

server.tool(
  'ecommerce_remove_from_cart',
  `Remove a product from the user's shopping cart.

Args:
  - userId: The unique identifier of the user
  - sku: The SKU code of the product to remove (e.g. "SKU-IP15")

Returns:
  - Removal confirmation details

Error Handling:
  - Returns error if the product is not in cart
  - Returns error if the SKU is invalid`,
  {
    userId: z.string().describe('The unique identifier of the user'),
    sku: z.string().describe('The SKU code of the product (e.g. "SKU-IP15")'),
  },
  async ({ userId, sku }) => {
    try {
      const result = await makeApiRequest('/api/cart', 'DELETE', { userId, sku });

      if (!result.success) {
        const err = result.error as { message: string } | null;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Hata: ${err?.message || 'Bilinmeyen hata'}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `API bağlantı hatası: ${String(error)}` }],
      };
    }
  },
);

// Start the server with stdio transport
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ecommerce-mcp-server started on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
