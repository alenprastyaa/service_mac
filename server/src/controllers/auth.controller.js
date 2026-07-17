const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Email atau password salah' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email atau password salah' });

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
}

async function me(req, res) {
  const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User tidak ditemukan' });
  res.json(rows[0]);
}

async function changePassword(req, res) {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ ok: true });
}

module.exports = { login, me, changePassword };
