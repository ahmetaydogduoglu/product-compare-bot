# Test Writer Agent Memory

## Key Patterns

### Jest reference mutation trap
Jest stores mock call arguments as **references**, not deep clones. If the source
object is mutated after a function call (e.g., `session.messages.push(...)` after
`create(params)` where `params.messages === session.messages`), then
`mockFn.mock.calls[n][0].messages` will reflect the post-mutation state, not the
state at call time. **Fix:** use a `mockImplementation` that captures a deep copy:

```js
const captured = [];
mockCreate.mockImplementationOnce((params) => {
  captured.push(JSON.parse(JSON.stringify(params.messages)));
  return Promise.resolve(...);
});
```

See: `api/src/services/claude.test.js` — session restore tests.

### Session restore verification strategy
To test that a session was restored after an API failure, make two consecutive
`chat()` (or `chatStream()`) calls and assert the second call's captured messages
contain only the second user message — not the first. This is a pure behavioral
test that does not require exporting private state.

### Tool cache test
`resetToolsCache()` is exported from `claude.js` specifically for test isolation.
Always call it in `beforeEach`. To verify caching works, make N `chat()` calls
and assert `mcpClient.getTools` was called exactly once.

### fullAssistantText reset verification
To verify `fullAssistantText` is reset per stream round (not accumulated across
rounds), capture `params.messages` at the time the **second** stream call is made
(round 2 entry). Assert that assistant messages in that snapshot contain only the
intermediate tool_use content array — not any stray plain-text string from round 1.

## Project Structure

- Backend tests: `api/src/**/*.test.js` — Jest, CommonJS
- Frontend tests: `chat-widget/src/**/*.test.js` — Vitest
- `api/src/services/claude.test.js` — 26 tests as of this session
- `api/src/services/mcpClient.test.js` — console.error noise is expected (pre-existing ESM flag issue), all tests pass
- `api/src/services/productService.test.js` — straightforward unit tests

## Running Tests

```bash
cd /Users/aaydogduoglu/Desktop/projects/personal/product-compare-bot/api && npm test
```

Use `npx jest --testPathPatterns=<file>` to run a single test file
(note: `--testPathPattern` is deprecated in this Jest version).
