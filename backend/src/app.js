const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Quiz Bee Backend' });
});

module.exports = app;
