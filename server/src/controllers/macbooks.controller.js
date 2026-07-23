const pool = require('../config/db');
const { uploadImage } = require('../lib/uploadService');

function serialize(row) {
  return { ...row, photo_url: row.photo_path || null };
}

async function list(req, res) {
  const { search = '', status = '' } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(model_name LIKE ? OR serial_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM macbooks ${where} ORDER BY created_at DESC`, params);
  res.json(rows.map(serialize));
}

async function get(req, res) {
  const [rows] = await pool.query('SELECT * FROM macbooks WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Unit MacBook tidak ditemukan' });
  res.json(serialize(rows[0]));
}

async function create(req, res) {
  const { model_name, chip, ram, storage, color, battery_pct, cycle_count, serial_number, modal_price, jual_price, status, notes } = req.body;
  if (!model_name) return res.status(400).json({ error: 'Nama model wajib diisi' });

  const photo_path = req.file ? await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype) : null;

  const [r] = await pool.query(
    `INSERT INTO macbooks (photo_path, model_name, chip, ram, storage, color, battery_pct, cycle_count, serial_number, modal_price, jual_price, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      photo_path,
      model_name,
      chip || null,
      ram || null,
      storage || null,
      color || null,
      battery_pct || 100,
      cycle_count || 0,
      serial_number || null,
      modal_price || 0,
      jual_price || 0,
      status || 'ready',
      notes || null,
      req.user.id,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM macbooks WHERE id = ?', [r.insertId]);
  res.status(201).json(serialize(rows[0]));
}

async function update(req, res) {
  const [existing] = await pool.query('SELECT * FROM macbooks WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Unit MacBook tidak ditemukan' });
  const current = existing[0];
  const { model_name, chip, ram, storage, color, battery_pct, cycle_count, serial_number, modal_price, jual_price, status, notes } = req.body;

  const photo_path = req.file ? await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype) : current.photo_path;

  await pool.query(
    `UPDATE macbooks SET photo_path = ?, model_name = ?, chip = ?, ram = ?, storage = ?, color = ?, battery_pct = ?, cycle_count = ?, serial_number = ?, modal_price = ?, jual_price = ?, status = ?, notes = ? WHERE id = ?`,
    [
      photo_path,
      model_name ?? current.model_name,
      chip ?? current.chip,
      ram ?? current.ram,
      storage ?? current.storage,
      color ?? current.color,
      battery_pct ?? current.battery_pct,
      cycle_count ?? current.cycle_count,
      serial_number ?? current.serial_number,
      modal_price ?? current.modal_price,
      jual_price ?? current.jual_price,
      status ?? current.status,
      notes ?? current.notes,
      req.params.id,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM macbooks WHERE id = ?', [req.params.id]);
  res.json(serialize(rows[0]));
}

async function remove(req, res) {
  await pool.query('DELETE FROM macbooks WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
