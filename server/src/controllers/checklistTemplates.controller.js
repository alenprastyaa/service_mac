const pool = require('../config/db');

async function list(req, res) {
  const { category, activeOnly } = req.query;
  const clauses = [];
  const params = [];
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (activeOnly === 'true') {
    clauses.push('is_active = 1');
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM checklist_templates ${where} ORDER BY category ASC, sort_order ASC, id ASC`, params);
  res.json(rows);
}

async function create(req, res) {
  const { category, label } = req.body;
  if (!category || !label) return res.status(400).json({ error: 'Kategori dan label wajib diisi' });
  if (!['kondisi_fisik', 'kelengkapan'].includes(category)) return res.status(400).json({ error: 'Kategori tidak valid' });

  const [[{ maxOrder }]] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM checklist_templates WHERE category = ?', [category]);
  const [r] = await pool.query('INSERT INTO checklist_templates (category, label, sort_order) VALUES (?, ?, ?)', [category, label, maxOrder + 1]);
  const [rows] = await pool.query('SELECT * FROM checklist_templates WHERE id = ?', [r.insertId]);
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { label, is_active, sort_order } = req.body;
  const [existing] = await pool.query('SELECT * FROM checklist_templates WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Item checklist tidak ditemukan' });
  await pool.query('UPDATE checklist_templates SET label = ?, is_active = ?, sort_order = ? WHERE id = ?', [
    label ?? existing[0].label, is_active ?? existing[0].is_active, sort_order ?? existing[0].sort_order, req.params.id,
  ]);
  const [rows] = await pool.query('SELECT * FROM checklist_templates WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

// Swaps sort_order with the adjacent item in the same category (drives the up/down reorder buttons).
async function reorder(req, res) {
  const { direction } = req.body;
  const [existing] = await pool.query('SELECT * FROM checklist_templates WHERE id = ?', [req.params.id]);
  const current = existing[0];
  if (!current) return res.status(404).json({ error: 'Item checklist tidak ditemukan' });

  const [neighbors] = await pool.query(
    `SELECT * FROM checklist_templates WHERE category = ? AND sort_order ${direction === 'up' ? '<' : '>'} ? ORDER BY sort_order ${direction === 'up' ? 'DESC' : 'ASC'} LIMIT 1`,
    [current.category, current.sort_order]
  );
  const neighbor = neighbors[0];
  if (!neighbor) return res.json(current);

  await pool.query('UPDATE checklist_templates SET sort_order = ? WHERE id = ?', [neighbor.sort_order, current.id]);
  await pool.query('UPDATE checklist_templates SET sort_order = ? WHERE id = ?', [current.sort_order, neighbor.id]);
  const [rows] = await pool.query('SELECT * FROM checklist_templates WHERE category = ? ORDER BY sort_order ASC, id ASC', [current.category]);
  res.json(rows);
}

async function remove(req, res) {
  await pool.query('DELETE FROM checklist_templates WHERE id = ?', [req.params.id]);
  res.status(204).end();
}

module.exports = { list, create, update, reorder, remove };
