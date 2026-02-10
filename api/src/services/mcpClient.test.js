/**
 * Tests for MCP client service
 *
 * Note: These tests focus on error handling and graceful degradation.
 * Full integration testing would require a running MCP server.
 */

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn(),
}), { virtual: true });

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
}), { virtual: true });

// Store original modules for cleanup
let mcpClient;
let Client;
let StdioClientTransport;

describe('mcpClient service', () => {
  beforeEach(() => {
    // Reset module cache to get fresh instance
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('getTools', () => {
    it('should return empty array when MCP SDK fails to import', async () => {
      // This is the actual behavior in Jest environment (no --experimental-vm-modules)
      const { getTools } = require('./mcpClient');

      const tools = await getTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(0);
    });

    it('should return empty array on client connection error', async () => {
      const { getTools } = require('./mcpClient');

      // Simulate connection failure by calling getTools
      // (will fail due to missing experimental-vm-modules flag)
      const tools = await getTools();

      // Should gracefully return empty array
      expect(tools).toEqual([]);
    });
  });

  describe('callTool', () => {
    it('should throw when called before client is initialized', async () => {
      const { callTool } = require('./mcpClient');

      // In current Jest environment, client initialization will fail
      // So callTool should throw when client is null
      await expect(callTool('test_tool', {}))
        .rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle multiple concurrent getTools calls gracefully', async () => {
      const { getTools } = require('./mcpClient');

      // Call getTools multiple times in parallel
      const promises = [
        getTools(),
        getTools(),
        getTools(),
      ];

      const results = await Promise.all(promises);

      // All should return empty array (graceful fallback)
      results.forEach((tools) => {
        expect(tools).toEqual([]);
      });
    });
  });
});
