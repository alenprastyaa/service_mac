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
    const [[settings]] = await pool.query('SELECT default_min_stock FROM store_settings WHERE id = 1');
    clauses.push('stock_qty < ?');
    params.push(settings?.default_min_stock ?? 3);
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
  const { name, category, brand, purchase_price, sell_price, min_stock, unit, stock_qty } = req.body;
  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  const current = existing[0];
  const nextStockQty = stock_qty === undefined || stock_qty === null || stock_qty === '' ? current.stock_qty : Number(stock_qty);

  await pool.query(
    'UPDATE products SET name = ?, category = ?, brand = ?, purchase_price = ?, sell_price = ?, min_stock = ?, unit = ?, stock_qty = ? WHERE id = ?',
    [
      name ?? current.name,
      category ?? current.category,
      brand ?? current.brand,
      purchase_price ?? current.purchase_price,
      sell_price ?? current.sell_price,
      min_stock ?? current.min_stock,
      unit ?? current.unit,
      nextStockQty,
      req.params.id,
    ]
  );

  // Editing stock directly (outside Barang Masuk / Penjualan) is logged as an
  // adjustment so there's still an audit trail of who changed it and by how much.
  if (nextStockQty !== current.stock_qty) {
    const delta = nextStockQty - current.stock_qty;
    await pool.query('INSERT INTO stock_movements (product_id, type, qty, note, created_by) VALUES (?, "adjustment", ?, ?, ?)', [
      req.params.id,
      Math.abs(delta),
      `Penyesuaian stok manual (${delta > 0 ? '+' : ''}${delta})`,
      req.user.id,
    ]);
  }

  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
