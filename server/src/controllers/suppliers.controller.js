const pool = require('../config/db');

async function list(req, res) {
  const { search = '' } = req.query;
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE name LIKE ? OR contact_person LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  const [rows] = await pool.query(`SELECT * FROM suppliers ${where} ORDER BY name ASC`, params);
  res.json(rows);
}

async function get(req, res) {
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  const [movements] = await pool.query(
    'SELECT sm.id, sm.qty, sm.note, sm.created_at, p.name AS product_name FROM stock_movements sm JOIN products p ON p.id = sm.product_id WHERE sm.supplier_id = ? ORDER BY sm.created_at DESC LIMIT 20',
    [req.params.id]
  );
  res.json({ ...rows[0], movements });
}

async function create(req, res) {
  const { name, contact_person, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama supplier wajib diisi' });
  const [r] = await pool.query('INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)', [name, contact_person || null, phone || null, email || null, address || null]);
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { name, contact_person, phone, email, address } = req.body;
  const [existing] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  await pool.query('UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?', [
    name ?? existing[0].name, contact_person ?? existing[0].contact_person, phone ?? existing[0].phone, email ?? existing[0].email, address ?? existing[0].address, req.params.id,
  ]);
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
