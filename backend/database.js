const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path   = require('path');

// On Vercel the filesystem is read-only except /tmp
const dbPath = process.env.VERCEL
  ? '/tmp/pharmacy.db'
  : path.join(__dirname, 'pharmacy.db');
const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin',
    created_at    TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    batch_number   TEXT    DEFAULT '',
    expiry_date    TEXT    NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 0,
    purchase_price REAL    NOT NULL,
    selling_price  REAL    NOT NULL,
    created_at     TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id    INTEGER NOT NULL,
    medicine_name  TEXT    NOT NULL,
    quantity_sold  INTEGER NOT NULL,
    selling_price  REAL    NOT NULL,
    purchase_price REAL    NOT NULL,
    profit         REAL    NOT NULL,
    sale_date      TEXT    DEFAULT (datetime('now', 'localtime'))
  );
`);

// Seed default admin user on first run
const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get();
if (userCount.count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  console.log('\n  ✔ Default user created → username: admin  password: admin123\n');
}

module.exports = db;
