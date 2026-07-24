const pool = require('../config/db');

async function nextInvoiceNo(conn) {
  const [rows] = await conn.query('SELECT invoice_no FROM sales ORDER BY id DESC LIMIT 1');
  const last = rows[0]?.invoice_no;
  const nextNum = last ? Number(last.split('-')[1]) + 1 : 1;
  return `INV-${String(nextNum).padStart(6, '0')}`;
}

async function list(req, res) {
  const { search = '', status = '', from, to } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(s.invoice_no LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    clauses.push('s.status = ?');
    params.push(status);
  }
  if (from) {
    clauses.push('s.created_at >= ?');
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    clauses.push('s.created_at <= ?');
    params.push(`${to} 23:59:59`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS customer_name, u.name AS created_by_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.created_by
     ${where}
     ORDER BY s.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
}

async function get(req, res) {
  const [sales] = await pool.query('SELECT s.*, c.name AS customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?', [req.params.id]);
  if (!sales[0]) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  const [items] = await pool.query('SELECT si.*, p.name AS product_name, p.sku FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = ?', [req.params.id]);
  res.json({ ...sales[0], items });
}

// Creates a sale with line items, decrements stock, and logs the movement in one transaction.
async function create(req, res) {
  const { customer_id, items, discount = 0, tax = 0, payment_method = 'tunai', status = 'lunas' } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Minimal 1 produk harus ditambahkan' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const [products] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
      const product = products[0];
      if (!product) throw Object.assign(new Error(`Produk id ${item.product_id} tidak ditemukan`), { status: 404 });
      if (product.stock_qty < item.qty) throw Object.assign(new Error(`Stok ${product.name} tidak mencukupi (tersisa ${product.stock_qty})`), { status: 400 });
      const price = item.price ?? product.sell_price;
      const itemSubtotal = price * item.qty;
      subtotal += itemSubtotal;
      resolvedItems.push({ product, qty: item.qty, price, itemSubtotal });
    }
    const total = subtotal - Number(discount) + Number(tax);
    const invoiceNo = await nextInvoiceNo(conn);

    const [saleResult] = await conn.query(
      'INSERT INTO sales (invoice_no, customer_id, subtotal, discount, tax, total, payment_method, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [invoiceNo, customer_id || null, subtotal, discount, tax, total, payment_method, status, req.user.id]
    );
    const saleId = saleResult.insertId;

    for (const { product, qty, price, itemSubtotal } of resolvedItems) {
      await conn.query('INSERT INTO sale_items (sale_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?)', [saleId, product.id, qty, price, itemSubtotal]);
      await conn.query('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [qty, product.id]);
      await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by) VALUES (?, "out", ?, ?, "sale", ?, ?)', [
        product.id, qty, `Penjualan ${invoiceNo}`, saleId, req.user.id,
      ]);
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT s.*, c.name AS customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?', [saleId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!['lunas', 'belum_lunas', 'dibatalkan'].includes(status)) return res.status(400).json({ error: 'Status tidak valid' });
  await pool.query('UPDATE sales SET status = ? WHERE id = ?', [status, req.params.id]);
  const [rows] = await pool.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  res.json(rows[0]);
}

// Deletes a sale entirely, restoring stock for any product it consumed.
// sale_items cascades via FK.
async function remove(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT invoice_no FROM sales WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!existing[0]) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });

    const [items] = await conn.query('SELECT product_id, qty FROM sale_items WHERE sale_id = ?', [req.params.id]);
    for (const item of items) {
      await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [item.qty, item.product_id]);
      await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by) VALUES (?, "in", ?, ?, "sale", ?, ?)', [
        item.product_id, item.qty, `Hapus transaksi ${existing[0].invoice_no}`, req.params.id, req.user.id,
      ]);
    }
    await conn.query('DELETE FROM sales WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { list, get, create, updateStatus, remove };
