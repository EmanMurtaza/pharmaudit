const express = require('express');
const cors    = require('cors');
const auth    = require('./middleware/auth');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// NOTE: Vercel experimentalServices strips the /api prefix before forwarding,
// so routes are mounted WITHOUT /api here. Vite proxy also rewrites /api → /
app.use('/auth',      require('./routes/auth'));
app.use('/medicines', auth, require('./routes/medicines'));
app.use('/sales',     auth, require('./routes/sales'));
app.use('/reports',   auth, require('./routes/reports'));
app.get('/health',    (_req, res) => res.json({ status: 'ok' }));

// Export for Vercel serverless
module.exports = app;

// Only listen when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  Pharmacy API running at http://localhost:${PORT}\n`);
  });
}
