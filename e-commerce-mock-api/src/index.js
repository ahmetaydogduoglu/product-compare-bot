require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const productsRouter = require('./routes/products');
const favoritesRouter = require('./routes/favorites');
const cartRouter = require('./routes/cart');

const app = express();
const PORT = process.env.PORT || 3002;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: { message: 'Çok fazla istek gönderildi, lütfen bekleyin', code: 'RATE_LIMIT_EXCEEDED' },
    statusCode: 429,
  },
});

app.use('/api', apiLimiter);

app.use('/api/products', productsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/cart', cartRouter);

app.listen(PORT, () => {
  console.log(`E-Commerce Mock API running on http://localhost:${PORT}`);
});
