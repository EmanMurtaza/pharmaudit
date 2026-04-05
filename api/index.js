// Vercel serverless entry point — wraps the Express app
// NODE_OPTIONS=--experimental-sqlite is set in vercel.json so node:sqlite works
const express = require('express');
const cors    = require('cors');
const auth    = require('../backend/middleware/auth');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth',      require('../backend/routes/auth'));
app.use('/api/medicines', auth, require('../backend/routes/medicines'));
app.use('/api/sales',     auth, require('../backend/routes/sales'));
app.use('/api/reports',   auth, require('../backend/routes/reports'));
app.get('/api/health',    (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
