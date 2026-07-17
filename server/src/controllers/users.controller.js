const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function list(req, res) {
  const [rows] = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at ASC');
  res.json(rows);
}

async function create(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Semua field wajib diisi' });
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing[0]) return res.status(409).json({ error: 'Email sudah terdaftar' });

  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
  const [rows] = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { name, role, is_active, password } = req.body;
  const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'User tidak ditemukan' });

  await pool.query('UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ?', [
    name ?? existing[0].name, role ?? existing[0].role, is_active ?? existing[0].is_active, req.params.id,
  ]);
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
  }
  const [rows] = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

async function remove(req, res) {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
  await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, create, update, remove };
