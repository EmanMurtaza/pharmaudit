const express = require('express');
const cors    = require('cors');
const auth    = require('./middleware/auth');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public: login + token verify
app.use('/api/auth', require('./routes/auth'));

// Protected: everything else requires a valid JWT
app.use('/api/medicines', auth, require('./routes/medicines'));
app.use('/api/sales',     auth, require('./routes/sales'));
app.use('/api/reports',   auth, require('./routes/reports'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Export for Vercel serverless (experimentalServices wraps this)
module.exports = app;

// Only listen when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  Pharmacy API running at http://localhost:${PORT}\n`);
  });
}
