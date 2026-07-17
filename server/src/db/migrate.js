const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'oren_macstore';

const INDEXES = [
  'CREATE INDEX idx_stock_movements_product ON stock_movements(product_id)',
  'CREATE INDEX idx_sale_items_sale ON sale_items(sale_id)',
  'CREATE INDEX idx_services_status ON services(status)',
  'CREATE INDEX idx_services_technician ON services(technician_id)',
  'CREATE INDEX idx_checklist_templates_category ON checklist_templates(category, sort_order)',
  'CREATE INDEX idx_service_checklist_items_service ON service_checklist_items(service_id)',
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

    for (const indexSql of INDEXES) {
      try {
        await conn.query(indexSql);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
      }
    }
  } finally {
    await conn.end();
  }
}

module.exports = { ensureSchema };
