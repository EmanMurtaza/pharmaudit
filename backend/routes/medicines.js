const express = require('express');
const router  = express.Router();
const db      = require('../database');

// GET /api/medicines?search=panadol&filter=expiring|low_stock|expired
router.get('/', (req, res) => {
  const { search, filter } = req.query;
  const conditions = [];
  const params     = [];

  if (search) {
    conditions.push('(name LIKE ? OR batch_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (filter === 'expiring') {
    conditions.push("date(expiry_date) BETWEEN date('now','localtime') AND date('now','localtime','+60 days')");
  } else if (filter === 'low_stock') {
    conditions.push('quantity > 0 AND quantity < 10');
  } else if (filter === 'expired') {
    conditions.push("date(expiry_date) < date('now','localtime')");
  }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const rows  = db.prepare(`SELECT * FROM medicines${where} ORDER BY name ASC`).all(...params);
  res.json(rows);
});

// POST /api/medicines
router.post('/', (req, res) => {
  const { name, batch_number, expiry_date, quantity, purchase_price, selling_price } = req.body;

  if (!name || !expiry_date || quantity == null || !purchase_price || !selling_price) {
    return res.status(400).json({ error: 'All required fields must be provided.' });
  }
  if (Number(quantity) < 0) {
    return res.status(400).json({ error: 'Quantity cannot be negative.' });
  }
  if (Number(purchase_price) < 0 || Number(selling_price) < 0) {
    return res.status(400).json({ error: 'Prices cannot be negative.' });
  }

  const result = db.prepare(`
    INSERT INTO medicines (name, batch_number, expiry_date, quantity, purchase_price, selling_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), batch_number || '', expiry_date, Number(quantity), Number(purchase_price), Number(selling_price));

  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(medicine);
});

// PUT /api/medicines/:id
router.put('/:id', (req, res) => {
  const { name, batch_number, expiry_date, quantity, purchase_price, selling_price } = req.body;
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM medicines WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found.' });

  db.prepare(`
    UPDATE medicines
    SET name = ?, batch_number = ?, expiry_date = ?, quantity = ?, purchase_price = ?, selling_price = ?
    WHERE id = ?
  `).run(name.trim(), batch_number || '', expiry_date, Number(quantity), Number(purchase_price), Number(selling_price), id);

  res.json(db.prepare('SELECT * FROM medicines WHERE id = ?').get(id));
});

// DELETE /api/medicines/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM medicines WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Medicine not found.' });

  db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
