const express = require('express');
const router  = express.Router();
const db      = require('../database');

// GET /api/sales?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date } = req.query;
  let query  = 'SELECT * FROM sales';
  const params = [];

  if (date) {
    query += ' WHERE date(sale_date) = ?';
    params.push(date);
  }
  query += ' ORDER BY sale_date DESC';

  res.json(db.prepare(query).all(...params));
});

// POST /api/sales  — record a new sale
router.post('/', (req, res) => {
  const { medicine_id, quantity_sold, selling_price } = req.body;

  if (!medicine_id || !quantity_sold || !selling_price) {
    return res.status(400).json({ error: 'medicine_id, quantity_sold, and selling_price are required.' });
  }
  if (Number(quantity_sold) <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than zero.' });
  }

  const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(Number(medicine_id));
  if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });

  if (medicine.quantity < Number(quantity_sold)) {
    return res.status(400).json({
      error: `Insufficient stock. Only ${medicine.quantity} unit(s) available.`
    });
  }

  // Atomic transaction: insert sale + reduce stock
  db.exec('BEGIN IMMEDIATE');
  try {
    const profit = (Number(selling_price) - medicine.purchase_price) * Number(quantity_sold);

    const result = db.prepare(`
      INSERT INTO sales (medicine_id, medicine_name, quantity_sold, selling_price, purchase_price, profit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(medicine_id), medicine.name, Number(quantity_sold), Number(selling_price), medicine.purchase_price, profit);

    db.prepare('UPDATE medicines SET quantity = quantity - ? WHERE id = ?')
      .run(Number(quantity_sold), Number(medicine_id));

    db.exec('COMMIT');

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(sale);
  } catch (e) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
