const pool = require('../config/db');

async function list(req, res) {
  const { search = '', category = '', lowStock } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(name LIKE ? OR sku LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (lowStock === 'true') {
    clauses.push('stock_qty <= min_stock');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM products ${where} ORDER BY name ASC`, params);
  res.json(rows);
}

async function get(req, res) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json(rows[0]);
}

async function create(req, res) {
  const { sku, name, category, brand, purchase_price, sell_price, stock_qty, min_stock, unit } = req.body;
  if (!sku || !name) return res.status(400).json({ error: 'SKU dan nama produk wajib diisi' });
  const [r] = await pool.query(
    'INSERT INTO products (sku, name, category, brand, purchase_price, sell_price, stock_qty, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sku, name, category || 'Lainnya', brand || 'Apple', purchase_price || 0, sell_price || 0, stock_qty || 0, min_stock || 3, unit || 'unit']
  );
  if (Number(stock_qty) > 0) {
    await pool.query('INSERT INTO stock_movements (product_id, type, qty, note, created_by) VALUES (?, "in", ?, "Stok awal", ?)', [r.insertId, stock_qty, req.user.id]);
  }
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { name, category, brand, purchase_price, sell_price, min_stock, unit } = req.body;
  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  await pool.query(
    'UPDATE products SET name = ?, category = ?, brand = ?, purchase_price = ?, sell_price = ?, min_stock = ?, unit = ? WHERE id = ?',
    [name ?? existing[0].name, category ?? existing[0].category, brand ?? existing[0].brand, purchase_price ?? existing[0].purchase_price, sell_price ?? existing[0].sell_price, min_stock ?? existing[0].min_stock, unit ?? existing[0].unit, req.params.id]
  );
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
