const pool = require('../config/db');

async function list(req, res) {
  const { search = '' } = req.query;
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [rows] = await pool.query(`SELECT * FROM customers ${where} ORDER BY name ASC`, params);
  res.json(rows);
}

async function get(req, res) {
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });

  const [sales] = await pool.query('SELECT id, invoice_no, total, status, created_at FROM sales WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
  const [services] = await pool.query('SELECT id, ticket_no, device_model, status, created_at FROM services WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.id]);
  res.json({ ...rows[0], sales, services });
}

async function create(req, res) {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama pelanggan wajib diisi' });
  const [r] = await pool.query('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)', [name, phone || null, email || null, address || null]);
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { name, phone, email, address } = req.body;
  const [existing] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Pelanggan tidak ditemukan' });
  await pool.query('UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?', [
    name ?? existing[0].name, phone ?? existing[0].phone, email ?? existing[0].email, address ?? existing[0].address, req.params.id,
  ]);
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  await pool.query('DELETE FROM customers WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
