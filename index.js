require('dotenv').config();

const express = require('express');
const alOthaimRoutes = require('./Router/AlOthaim');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/tryblend/api', alOthaimRoutes);

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
