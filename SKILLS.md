# Product Compare Bot

AI destekli urun karsilastirma chat botu. Kullanici urunleri secer, Claude urunleri karsilastirip oneri sunar.

## Mimari

```
product-compare-bot/
├── api/                          # Express.js backend
│   ├── src/
│   │   ├── index.js              # Express server (port 3001)
│   │   ├── routes/
│   │   │   └── chat.js           # POST /api/chat endpoint
│   │   └── services/
│   │       ├── claude.js         # Anthropic SDK, session yonetimi
│   │       └── productService.js # Mock urun veritabani
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
└── chat-widget/                  # Svelte web component
    ├── src/
    │   ├── index.js              # Entry point
    │   ├── components/
    │   │   ├── ChatWidget.svelte # Ana widget (custom element: <chat-widget>)
    │   │   ├── ChatInput.svelte  # Bagimsiz input componenti (kullanilmiyor)
    │   │   ├── MessageList.svelte# Bagimsiz mesaj listesi (kullanilmiyor)
    │   │   └── MessageBubble.svelte # Bagimsiz mesaj balonu (kullanilmiyor)
    │   ├── services/
    │   │   └── chatService.js    # API iletisimi, session yonetimi
    │   └── utils/
    │       ├── formatDate.js     # HH:MM format
    │       └── scrollHelper.js   # Otomatik scroll
    ├── index.html                # Demo sayfasi
    ├── vite.config.js
    └── package.json
```

## Akis

```
1. Kullanici urun butonlarindan 2+ urun secer
2. "Karsilastir" butonuna basar
3. Host sayfa `set-skus` custom event'i dispatch eder
4. ChatWidget event'i yakalar → chatService.setSkus() ile SKU'lari saklar
5. Otomatik olarak "Bu urunleri karsilastir" mesaji gonderilir
6. API: POST /api/chat { message, sessionId, skus }
7. productService.getProductsBySku(skus) → mock urun bilgileri
8. claude.js: Urun bilgileri system prompt'a enjekte edilir
9. Claude API cevap doner → widget'ta markdown olarak render edilir
10. Sonraki mesajlar ayni sessionId ile devam eder (context korunur)
```

## API Detaylari

### POST /api/chat

**Request:**
```json
{
  "message": "Bu urunleri karsilastir",
  "sessionId": "session-1738900000000",
  "skus": ["SKU-IP15", "SKU-S24"]
}
```
- `message` (zorunlu): Kullanici mesaji
- `sessionId` (zorunlu): Client tarafinda uretilen session ID
- `skus` (opsiyonel): Ilk mesajda gonderilir, urun context'ini baslatir

**Response:**
```json
{
  "reply": "## Karsilastirma\n...",
  "sessionId": "session-1738900000000"
}
```

### Mevcut SKU'lar

| SKU | Urun | Kategori | Fiyat |
|-----|-------|----------|-------|
| SKU-IP15 | iPhone 15 Pro | Telefon | 49.999 TL |
| SKU-S24 | Samsung Galaxy S24 Ultra | Telefon | 54.999 TL |
| SKU-P9 | Google Pixel 9 Pro | Telefon | 39.999 TL |
| SKU-MBA | MacBook Air M3 | Laptop | 44.999 TL |
| SKU-TP14 | Lenovo ThinkPad X1 Carbon Gen 11 | Laptop | 52.999 TL |
| SKU-XPS15 | Dell XPS 15 | Laptop | 47.999 TL |

Bilinmeyen SKU'lar `{ sku, error: "Urun bulunamadi" }` olarak doner.

## Session Yonetimi

- Her kullanici client tarafinda benzersiz `sessionId` uretir (`session-{timestamp}`)
- Sunucu tarafinda in-memory `Map` ile tutulur
- Her session: `{ products: Map<sku, product>, messages: Array }`
- System prompt her mesajda guncel urun listesinden yeniden olusturulur
- Conversation history session boyunca korunur
- Sayfa yenilendiginde client tarafinda sessionId sifirlanir → yeni session

## Chat Widget

Svelte custom element olarak calisir: `<chat-widget>`

### Props

| Prop | Varsayilan | Aciklama |
|------|-----------|----------|
| `title` | `"Chat"` | Header basligi |
| `placeholder` | `"Mesajinizi yazin..."` | Input placeholder |
| `theme` | `"light"` | `"light"` veya `"dark"` |

### Custom Event: `set-skus`

Widget, host sayfadan `set-skus` event'i ile SKU listesi alir:

```js
document.dispatchEvent(new CustomEvent('set-skus', {
  detail: { skus: ['SKU-IP15', 'SKU-S24'] }
}));
```

Event tetiklendiginde:
1. SKU'lar chatService'e set edilir
2. Otomatik "Bu urunleri karsilastir" mesaji gonderilir
3. Cevap beklenirken input/buton disable olur ve typing animasyonu gosterilir

### Dispatch Event: `message-sent`

Widget kullanici mesaj gonderdiginde `message-sent` event'i dispatch eder:

```js
widget.addEventListener('message-sent', (e) => {
  console.log(e.detail.text);
});
```

### Ozellikler

- Markdown render (marked kutuphanesi ile)
- Typing animasyonu (3 nokta bounce)
- Mesaj beklerken input/buton disabled
- Otomatik scroll
- Light/Dark tema destegi

## Kurulum

### API

```bash
cd api
cp .env.example .env
# .env dosyasina ANTHROPIC_API_KEY ekle
npm install
npm run dev
```

### Chat Widget

```bash
cd chat-widget
npm install
npm run dev     # gelistirme (Vite dev server)
npm run build   # uretim (lib build)
```

Build ciktisi: `chat-widget/dist/chat-widget.es.js` ve `chat-widget.umd.js`

## Kullanim (Host Sayfa)

```html
<script type="module" src="chat-widget.es.js"></script>

<chat-widget title="Urun Karsilastirma" placeholder="Soru sorun..."></chat-widget>

<script>
  // SKU'lari gonder
  document.dispatchEvent(new CustomEvent('set-skus', {
    detail: { skus: ['SKU-IP15', 'SKU-S24'] }
  }));
</script>
```

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Svelte 4, Vite 5, marked |
| Backend | Node.js, Express 4, cors, dotenv |
| AI | Anthropic Claude API (@anthropic-ai/sdk) |
| Protokol | REST (JSON) |
| Session | In-memory Map (sunucu tarafli) |
| Urun Verisi | Mock (productService.js) |

## Bilinen Kisitlamalar

- Session verisi sunucu hafizasinda tutulur, sunucu yeniden basladiginda kaybolur
- Urun verisi mock'tur, gercek bir API'ye baglanmamistir
- CORS tum originlere aciktir
- Rate limiting veya authentication yoktur
- `chatService.js` icindeki `API_URL` hardcoded'dir (`localhost:3001`)
