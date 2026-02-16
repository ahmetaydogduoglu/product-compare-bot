# Project: Product Compare Bot

AI-powered product comparison chat bot. Users select products, Claude compares them and provides recommendations.

## Architecture

```
product-compare-bot/
├── api/                          # Express.js backend (port 3001)
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── routes/
│   │   │   └── chat.js           # POST /api/chat endpoint
│   │   └── services/
│   │       ├── claude.js         # Anthropic SDK, session management
│   │       └── productService.js # Mock product database
│   └── package.json
│
├── chat-widget/                  # Svelte 4 web component
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   ├── components/
│   │   │   └── ChatWidget.svelte # Main widget (<chat-widget> custom element)
│   │   ├── services/
│   │   │   └── chatService.js    # API communication, session management
│   │   └── utils/
│   │       ├── formatDate.js     # HH:MM format
│   │       └── scrollHelper.js   # Auto scroll
│   ├── index.html                # Demo page
│   ├── vite.config.js
│   └── package.json
│
└── CLAUDE.md                     # This file
```

## Tech Stack (DO NOT deviate)

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | Svelte 4, Vite 5, marked               |
| Backend   | Node.js, Express 4, cors, dotenv       |
| AI        | Anthropic Claude API (@anthropic-ai/sdk)|
| Protocol  | REST (JSON)                             |
| Session   | In-memory Map (server-side)             |
| Test      | Jest (backend), Vitest (frontend)       |

## Code Conventions

### Language
- All code in **English**: variable names, function names, class names
- All comments in **English**
- All commit messages in **English**
- User-facing strings (UI, API responses to end users) remain in **Turkish**

### Style
- **Documented code**: Use JSDoc for all exported functions and public APIs
- Add explanatory comments for complex logic
- Keep functions small and single-purpose
- Use `const` by default, `let` only when reassignment is needed
- Use arrow functions for callbacks, regular functions for top-level declarations
- Semicolons: yes
- Quotes: single quotes
- Trailing commas: yes (ES5 style)

### Example JSDoc

```js
/**
 * Retrieves product details for the given SKU list.
 * Unknown SKUs are returned with an error marker.
 * @param {string[]} skuList - Array of SKU identifiers
 * @returns {object[]} Array of product objects or error markers
 */
function getProductsBySku(skuList) { ... }
```

## Error Handling

- Use **try-catch** blocks around async operations
- Create custom error classes when needed (extend `Error`)
- Always include error codes in responses
- Log errors with context (operation, input data)
- Never expose internal errors to the client

### Custom Error Pattern

```js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

### Express Error Middleware

All routes should pass errors to `next()`. A centralized error handler formats the response.

## API Response Format

All API responses must follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "statusCode": 200
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": { "message": "Session not found", "code": "SESSION_NOT_FOUND" },
  "statusCode": 404
}
```

## Frontend State Management

- **Global state** (session, selected SKUs, theme): Use Svelte `writable`/`readable` stores
- **Local state** (input value, loading spinner): Keep in component
- Store files go in `chat-widget/src/stores/`

## Testing

### Backend (Jest)
- Test files: `api/src/**/*.test.js`
- Test all service functions (unit tests)
- Test API endpoints (integration tests with supertest)
- Mock external dependencies (Anthropic SDK)

### Frontend (Vitest)
- Test files: `chat-widget/src/**/*.test.js`
- Test component behavior
- Test store logic
- Test utility functions

### Running Tests
```bash
cd api && npm test           # Backend tests
cd chat-widget && npm test   # Frontend tests
```

## Git Conventions

### Commit Messages (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `docs`: Documentation only
- `chore`: Build, config, tooling changes
- `style`: Formatting, whitespace (no logic change)

**Scopes:** `api`, `widget`, `config`

**Examples:**
```
feat(api): add product search endpoint
fix(widget): resolve scroll issue on new messages
test(api): add unit tests for claude service
refactor(api): extract error handling middleware
```

## Development Workflow

1. **Always plan first** before implementing
   - For any non-trivial task, create a plan and get approval
   - Identify affected files and potential side effects
   - Consider edge cases
2. **Implement** following the conventions above
3. **Test** the changes
4. **Commit** with conventional commit message

### MCP Server Development

When building or modifying MCP servers, **always use the `/mcp-builder` skill first**. Invoke it via the Skill tool before writing any code. The skill contains up-to-date conventions, correct API patterns (e.g. `registerTool()` vs deprecated `server.tool()`), and reference documentation that must be followed.

## Available SKUs

| SKU       | Product                         | Category | Price      |
|-----------|---------------------------------|----------|------------|
| SKU-IP15  | iPhone 15 Pro                   | Telefon  | 49,999 TL  |
| SKU-S24   | Samsung Galaxy S24 Ultra        | Telefon  | 54,999 TL  |
| SKU-P9    | Google Pixel 9 Pro              | Telefon  | 39,999 TL  |
| SKU-MBA   | MacBook Air M3                  | Laptop   | 44,999 TL  |
| SKU-TP14  | Lenovo ThinkPad X1 Carbon Gen 11| Laptop   | 52,999 TL  |
| SKU-XPS15 | Dell XPS 15                     | Laptop   | 47,999 TL  |

## Key Flows

```
1. User selects 2+ products via product buttons
2. Clicks "Compare" button
3. Host page dispatches `set-skus` custom event
4. ChatWidget catches event → chatService.setSkus() stores SKUs
5. Auto-sends "Compare these products" message
6. API: POST /api/chat { message, sessionId, skus }
7. productService.getProductsBySku(skus) → mock product data
8. claude.js: Product info injected into system prompt
9. Claude API returns response → rendered as markdown in widget
10. Subsequent messages continue with same sessionId (context preserved)
```

## Known Limitations

- Session data is in-memory, lost on server restart
- Product data is mocked, not connected to a real API
- CORS is open to all origins
- No rate limiting or authentication
- `chatService.js` has hardcoded `API_URL` (`localhost:3001`)
