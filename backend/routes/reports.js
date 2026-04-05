const express = require('express');
const router  = express.Router();
const db      = require('../database');

// GET /api/reports/dashboard
router.get('/dashboard', (_req, res) => {
  const inventoryValue = db.prepare(
    'SELECT COALESCE(SUM(purchase_price * quantity), 0) AS total FROM medicines'
  ).get();

  const totalMedicines = db.prepare('SELECT COUNT(*) AS count FROM medicines').get();

  const expiringSoon = db.prepare(`
    SELECT COUNT(*) AS count FROM medicines
    WHERE date(expiry_date) BETWEEN date('now','localtime') AND date('now','localtime','+60 days')
  `).get();

  const expired = db.prepare(`
    SELECT COUNT(*) AS count FROM medicines
    WHERE date(expiry_date) < date('now','localtime')
  `).get();

  const lowStock = db.prepare(
    'SELECT COUNT(*) AS count FROM medicines WHERE quantity > 0 AND quantity < 10'
  ).get();

  const outOfStock = db.prepare(
    'SELECT COUNT(*) AS count FROM medicines WHERE quantity = 0'
  ).get();

  const todaySales = db.prepare(`
    SELECT
      COALESCE(SUM(selling_price * quantity_sold), 0) AS revenue,
      COALESCE(SUM(profit), 0)                        AS profit,
      COUNT(*)                                        AS count
    FROM sales
    WHERE date(sale_date) = date('now','localtime')
  `).get();

  // Lists for alert panels
  const expiringSoonList = db.prepare(`
    SELECT id, name, batch_number, expiry_date, quantity FROM medicines
    WHERE date(expiry_date) BETWEEN date('now','localtime') AND date('now','localtime','+60 days')
    ORDER BY expiry_date ASC LIMIT 10
  `).all();

  const lowStockList = db.prepare(`
    SELECT id, name, quantity FROM medicines
    WHERE quantity > 0 AND quantity < 10
    ORDER BY quantity ASC LIMIT 10
  `).all();

  res.json({
    inventoryValue:   inventoryValue.total,
    totalMedicines:   totalMedicines.count,
    expiringSoon:     expiringSoon.count,
    expired:          expired.count,
    lowStock:         lowStock.count,
    outOfStock:       outOfStock.count,
    todayRevenue:     todaySales.revenue,
    todayProfit:      todaySales.profit,
    todaySalesCount:  todaySales.count,
    expiringSoonList,
    lowStockList,
  });
});

// GET /api/reports/inventory
router.get('/inventory', (_req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY name ASC').all();
  res.json(medicines);
});

// GET /api/reports/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get('/sales', (req, res) => {
  const { start_date, end_date } = req.query;
  const conditions = [];
  const params     = [];

  if (start_date) { conditions.push('date(sale_date) >= ?'); params.push(start_date); }
  if (end_date)   { conditions.push('date(sale_date) <= ?'); params.push(end_date);   }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const sales = db.prepare(`SELECT * FROM sales${where} ORDER BY sale_date DESC`).all(...params);

  const summary = {
    totalRevenue:     sales.reduce((s, r) => s + r.selling_price * r.quantity_sold, 0),
    totalProfit:      sales.reduce((s, r) => s + r.profit, 0),
    totalTransactions: sales.length,
  };

  res.json({ sales, summary });
});

module.exports = router;
