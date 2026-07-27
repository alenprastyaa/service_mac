const pool = require('../config/db');

async function list(req, res) {
  const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
  res.json(rows);
}

async function unreadCount(req, res) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM notifications WHERE is_read = 0');
  res.json({ count: rows[0].count });
}

async function markRead(req, res) {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

async function markAllRead(req, res) {
  await pool.query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
  res.status(204).end();
}

module.exports = { list, unreadCount, markRead, markAllRead };
