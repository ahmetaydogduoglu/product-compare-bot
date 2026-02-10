require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: { message: 'Çok fazla istek gönderildi, lütfen bekleyin', code: 'RATE_LIMIT_EXCEEDED' },
    statusCode: 429,
  },
});

app.use('/api/chat', chatLimiter, chatRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
