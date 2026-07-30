const pool = require('../config/db');

async function list(req, res) {
  const { search = '' } = req.query;
  const params = [];
  let where = '';
  if (search) {
    where = 'WHERE name LIKE ? OR contact_person LIKE ? OR code LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
  const [debts] = await pool.query(
    'SELECT * FROM supplier_debts WHERE supplier_id = ? ORDER BY status ASC, due_date IS NULL, due_date ASC, created_at DESC',
    [req.params.id]
  );
  res.json({ ...rows[0], movements, debts });
}

async function create(req, res) {
  const { name, contact_person, phone, email, address, city, bank_name, bank_account_number, bank_account_holder } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama supplier wajib diisi' });
  const [r] = await pool.query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address, city, bank_name, bank_account_number, bank_account_holder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, contact_person || null, phone || null, email || null, address || null, city || null, bank_name || null, bank_account_number || null, bank_account_holder || null]
  );
  await pool.query('UPDATE suppliers SET code = ? WHERE id = ?', [`SUP-${String(r.insertId).padStart(4, '0')}`, r.insertId]);
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { name, contact_person, phone, email, address, city, bank_name, bank_account_number, bank_account_holder } = req.body;
  const [existing] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Supplier tidak ditemukan' });
  await pool.query(
    `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ?,
       bank_name = ?, bank_account_number = ?, bank_account_holder = ? WHERE id = ?`,
    [
      name ?? existing[0].name,
      contact_person ?? existing[0].contact_person,
      phone ?? existing[0].phone,
      email ?? existing[0].email,
      address ?? existing[0].address,
      city ?? existing[0].city,
      bank_name ?? existing[0].bank_name,
      bank_account_number ?? existing[0].bank_account_number,
      bank_account_holder ?? existing[0].bank_account_holder,
      req.params.id,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

async function addDebt(req, res) {
  const amount = Number(req.body.amount);
  const { description, due_date } = req.body;
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Nominal hutang tidak valid' });

  const [supplier] = await pool.query('SELECT id FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier[0]) return res.status(404).json({ error: 'Supplier tidak ditemukan' });

  const [r] = await pool.query(
    'INSERT INTO supplier_debts (supplier_id, amount, description, due_date, created_by) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, amount, description || null, due_date || null, req.user.id]
  );
  const [rows] = await pool.query('SELECT * FROM supplier_debts WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function payDebt(req, res) {
  const [rows] = await pool.query('SELECT * FROM supplier_debts WHERE id = ? AND supplier_id = ?', [req.params.debtId, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Hutang tidak ditemukan' });
  await pool.query('UPDATE supplier_debts SET status = "lunas", paid_at = NOW() WHERE id = ?', [req.params.debtId]);
  const [updated] = await pool.query('SELECT * FROM supplier_debts WHERE id = ?', [req.params.debtId]);
  res.json(updated[0]);
}

async function removeDebt(req, res) {
  await pool.query('DELETE FROM supplier_debts WHERE id = ? AND supplier_id = ?', [req.params.debtId, req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove, addDebt, payDebt, removeDebt };
