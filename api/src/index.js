require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
