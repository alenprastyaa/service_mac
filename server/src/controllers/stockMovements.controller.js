const pool = require('../config/db');

async function list(req, res) {
  const { productId, type } = req.query;
  const clauses = [];
  const params = [];
  if (productId) {
    clauses.push('sm.product_id = ?');
    params.push(productId);
  }
  if (type) {
    clauses.push('sm.type = ?');
    params.push(type);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT sm.*, p.name AS product_name, p.sku, s.name AS supplier_name, u.name AS created_by_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     LEFT JOIN suppliers s ON s.id = sm.supplier_id
     LEFT JOIN users u ON u.id = sm.created_by
     ${where}
     ORDER BY sm.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
}

// Barang Masuk: records incoming stock and increments product stock_qty.
async function createStockIn(req, res) {
  const { product_id, supplier_id, qty, note } = req.body;
  if (!product_id || !qty || Number(qty) <= 0) return res.status(400).json({ error: 'Produk dan jumlah wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [products] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
    if (!products[0]) throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });

    await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [qty, product_id]);
    const [r] = await conn.query(
      'INSERT INTO stock_movements (product_id, supplier_id, type, qty, note, created_by) VALUES (?, ?, "in", ?, ?, ?)',
      [product_id, supplier_id || null, qty, note || 'Barang masuk', req.user.id]
    );
    await conn.commit();
    const [rows] = await pool.query('SELECT sm.*, p.name AS product_name FROM stock_movements sm JOIN products p ON p.id = sm.product_id WHERE sm.id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { list, createStockIn };
