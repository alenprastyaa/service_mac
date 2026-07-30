const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'oren_macstore';

const INDEXES = [
  'CREATE INDEX idx_macbooks_status ON macbooks(status)',
  'CREATE INDEX idx_stock_movements_product ON stock_movements(product_id)',
  'CREATE INDEX idx_sale_items_sale ON sale_items(sale_id)',
  'CREATE INDEX idx_services_status ON services(status)',
  'CREATE INDEX idx_services_technician ON services(technician_id)',
  'CREATE INDEX idx_checklist_templates_category ON checklist_templates(category, sort_order)',
  'CREATE INDEX idx_service_checklist_items_service ON service_checklist_items(service_id)',
  'CREATE INDEX idx_notifications_is_read ON notifications(is_read)',
];

// Columns added after the initial CREATE TABLE shipped — applied to databases that
// already existed before this column was introduced.
const COLUMNS = [
  'ALTER TABLE store_settings ADD COLUMN monthly_omzet_target DECIMAL(14,2) NOT NULL DEFAULT 0',
  'ALTER TABLE store_settings ADD COLUMN bank_name VARCHAR(50)',
  'ALTER TABLE store_settings ADD COLUMN bank_account_number VARCHAR(50)',
  'ALTER TABLE store_settings ADD COLUMN bank_account_holder VARCHAR(100)',
  'ALTER TABLE suppliers ADD COLUMN code VARCHAR(20)',
  'ALTER TABLE suppliers ADD COLUMN city VARCHAR(100)',
  'ALTER TABLE suppliers ADD COLUMN bank_name VARCHAR(50)',
  'ALTER TABLE suppliers ADD COLUMN bank_account_number VARCHAR(50)',
  'ALTER TABLE suppliers ADD COLUMN bank_account_holder VARCHAR(100)',
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL',
];

// Creates the database and all tables if they don't exist yet. Safe to run on every
// server start — never drops or alters existing tables/data.
async function ensureSchema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8').replace(/__DB_NAME__/g, DB_NAME);
    await conn.query(initSql);

    for (const columnSql of COLUMNS) {
      try {
        await conn.query(columnSql);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }

    for (const indexSql of INDEXES) {
      try {
        await conn.query(indexSql);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
      }
    }

    await ensureSupplierCodes(conn);
    await ensureDefaultOwner(conn);
  } finally {
    await conn.end();
  }
}

// Backfills the Kode Supplier (SUP-0001, derived from id) for suppliers that
// existed before this column was introduced. New suppliers get theirs at creation.
async function ensureSupplierCodes(conn) {
  const [rows] = await conn.query('SELECT id FROM suppliers WHERE code IS NULL');
  for (const row of rows) {
    await conn.query('UPDATE suppliers SET code = ? WHERE id = ?', [`SUP-${String(row.id).padStart(4, '0')}`, row.id]);
  }
}

// Creates one owner account if the users table is still empty, so a fresh
// database always has a working login. Never touches users if any already exist.
async function ensureDefaultOwner(conn) {
  const [rows] = await conn.query('SELECT COUNT(*) AS count FROM users');
  if (rows[0].count > 0) return;

  const email = process.env.ADMIN_EMAIL || 'owner@orenmacstore.id';
  const password = process.env.ADMIN_PASSWORD || 'owner123';
  const passwordHash = await bcrypt.hash(password, 10);

  await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Owner', email, passwordHash, 'owner']);

  console.log('=================================================');
  console.log('Akun owner pertama dibuat otomatis:');
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
  console.log('Segera login dan ganti password di menu Pengaturan.');
  console.log('(Set ADMIN_EMAIL / ADMIN_PASSWORD di .env untuk mengubah nilai default ini.)');
  console.log('=================================================');
}

module.exports = { ensureSchema };
