# Product Compare Bot

AI-powered product comparison chatbot for e-commerce sites. Users select the products they want to compare, and Claude AI analyzes technical specs to provide pros/cons, price-performance evaluations, and personalized recommendations through natural conversation.

## Why?

When users want to compare two phones or laptops on an e-commerce site, they typically browse spec tables and try to decide on their own. This project feeds product specs into an AI model, enabling **natural language Q&A** for comparisons. Users can simply ask "I have a 40K budget, which one do you recommend?" and get a tailored answer.

## Demo

1. Select 2+ products from the buttons
2. Click "Compare"
3. Chat opens automatically and the comparison begins
4. Ask follow-up questions: "Which has better battery life?", "Which one for photography?"

## How It Works

```
User selects products
       |
       v
Host page dispatches "set-skus" custom event
       |
       v
Chat widget opens, auto-sends "Compare these products"
       |
       v
API: productService fetches product details (mock)
       |
       v
Product details are injected into Claude's system prompt
       |
       v
Claude returns comparison response (markdown)
       |
       v
Widget renders the response, conversation continues in same session
```

## Setup

### Requirements

- Node.js 18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### API

```bash
cd api
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm install
npm run dev
```

API starts at `http://localhost:3001`.

### Chat Widget

```bash
cd chat-widget
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Project Structure

```
product-compare-bot/
├── api/                             # Express.js backend
│   └── src/
│       ├── index.js                 # Server (port 3001)
│       ├── routes/chat.js           # POST /api/chat
│       └── services/
│           ├── claude.js            # Claude API + session management
│           └── productService.js    # Mock product database
│
└── chat-widget/                     # Svelte web component
    ├── src/
    │   ├── components/
    │   │   └── ChatWidget.svelte    # <chat-widget> custom element
    │   └── services/
    │       └── chatService.js       # API communication
    ├── index.html                   # Demo page
    └── vite.config.js
```

## API

### POST /api/chat

```json
// Request
{
  "message": "Compare these products",
  "sessionId": "session-1738900000000",
  "skus": ["SKU-IP15", "SKU-S24"]
}

// Response
{
  "reply": "## iPhone 15 Pro vs Galaxy S24 Ultra\n...",
  "sessionId": "session-1738900000000"
}
```

- `skus` is only sent with the first message; product context persists throughout the session
- Subsequent messages use the same `sessionId` to continue the conversation

### Mock Products

| SKU | Product | Price |
|-----|---------|-------|
| SKU-IP15 | iPhone 15 Pro | 49,999 TRY |
| SKU-S24 | Samsung Galaxy S24 Ultra | 54,999 TRY |
| SKU-P9 | Google Pixel 9 Pro | 39,999 TRY |
| SKU-MBA | MacBook Air M3 | 44,999 TRY |
| SKU-TP14 | ThinkPad X1 Carbon Gen 11 | 52,999 TRY |
| SKU-XPS15 | Dell XPS 15 | 47,999 TRY |

## Widget Usage

The widget is a web component that can be embedded in any page:

```html
<script type="module" src="chat-widget.es.js"></script>

<chat-widget title="Product Compare" placeholder="Ask a question..."></chat-widget>

<script>
  // Select products and start comparison
  document.dispatchEvent(new CustomEvent('set-skus', {
    detail: { skus: ['SKU-IP15', 'SKU-S24'] }
  }));
</script>
```

### Props

| Prop | Default | Description |
|------|---------|-------------|
| `title` | `"Chat"` | Header title |
| `placeholder` | `"Mesajinizi yazin..."` | Input placeholder |
| `theme` | `"light"` | `"light"` or `"dark"` |

### Features

- Toggle button (FAB) at bottom-right corner, closed by default
- Auto-opens and starts comparison on `set-skus` event
- Markdown rendering for bot responses
- Typing animation while waiting for response
- Input/button disabled during loading
- Escape key to close
- Light/Dark theme support
- Accessibility: aria-labels, role="dialog", focus management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Svelte 4, Vite 5, marked |
| Backend | Node.js, Express 4 |
| AI | Claude API (@anthropic-ai/sdk) |
| Protocol | REST (JSON) |

## Known Limitations

- Sessions are stored in-memory; lost on server restart
- Product data is mocked, not connected to a real API
- No rate limiting or authentication
- API URL is hardcoded (`localhost:3001`)

## Roadmap

- [ ] Real product API integration (replace productService)
- [ ] Streaming responses (SSE)
- [ ] Session persistence (Redis/DB)
- [ ] Rate limiting and API key authentication
- [ ] Display product images in chat

## License

MIT
