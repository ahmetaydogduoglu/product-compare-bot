const path = require('path');

/** @type {import('@modelcontextprotocol/sdk/client/index.js').Client | null} */
let client = null;

/** @type {Promise<void> | null} */
let initPromise = null;

/** @type {import('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport | null} */
let transport = null;

/**
 * Lazily initializes the MCP client singleton.
 * Spawns the ecommerce-mcp-server as a child process via stdio transport.
 * Prevents race conditions on parallel requests via shared initPromise.
 * @returns {Promise<import('@modelcontextprotocol/sdk/client/index.js').Client>}
 */
async function getClient() {
  if (client) return client;

  if (!initPromise) {
    initPromise = (async () => {
      // Dynamic import for ESM-only MCP SDK modules
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

      const serverPath = path.resolve(__dirname, '../../../ecommerce-mcp-server/dist/index.js');

      transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
      });

      client = new Client({
        name: 'product-compare-api',
        version: '1.0.0',
      });

      await client.connect(transport);
      console.log('MCP client connected to ecommerce-mcp-server');
    })();
  }

  await initPromise;
  return client;
}

/**
 * Fetches available tools from the MCP server and converts them
 * to Anthropic API tool format (inputSchema → input_schema).
 * Returns empty array on failure for graceful degradation.
 * @returns {Promise<object[]>} Array of tools in Anthropic API format
 */
async function getTools() {
  try {
    const mcpClient = await getClient();
    const { tools } = await mcpClient.listTools();

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.inputSchema,
    }));
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
    return [];
  }
}

/**
 * Calls a specific tool on the MCP server with the given arguments.
 * @param {string} name - Tool name (e.g. "ecommerce_add_to_cart")
 * @param {object} args - Tool arguments
 * @returns {Promise<object>} Tool result with content array
 */
async function callTool(name, args) {
  const mcpClient = await getClient();
  return mcpClient.callTool({ name, arguments: args });
}

module.exports = { getTools, callTool };
