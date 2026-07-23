const pool = require('../config/db');
const { encrypt, decrypt } = require('../lib/crypto');

const STATUSES = ['menunggu_pengecekan', 'sedang_dikerjakan', 'menunggu_sparepart', 'selesai', 'diambil'];

const STATUS_LABELS = {
  menunggu_pengecekan: 'Menunggu Pengecekan',
  sedang_dikerjakan: 'Sedang Dikerjakan',
  menunggu_sparepart: 'Menunggu Sparepart',
  selesai: 'Selesai',
  diambil: 'Sudah Diambil',
};

async function nextTicketNo(conn) {
  const [rows] = await conn.query('SELECT ticket_no FROM services ORDER BY id DESC LIMIT 1');
  const last = rows[0]?.ticket_no;
  const nextNum = last ? Number(last.split('-')[1]) + 1 : 1;
  return `SRV-${String(nextNum).padStart(6, '0')}`;
}

async function loadChecklist(serviceId) {
  const [rows] = await pool.query('SELECT id, template_id, category, label, status, sort_order FROM service_checklist_items WHERE service_id = ? ORDER BY category ASC, sort_order ASC, id ASC', [serviceId]);
  return {
    kondisi_fisik: rows.filter((r) => r.category === 'kondisi_fisik'),
    kelengkapan: rows.filter((r) => r.category === 'kelengkapan'),
  };
}

async function insertChecklist(conn, serviceId, checklist) {
  if (!Array.isArray(checklist) || !checklist.length) return;
  for (const [i, item] of checklist.entries()) {
    if (!item.category || !item.label || !item.status) continue;
    await conn.query(
      'INSERT INTO service_checklist_items (service_id, template_id, category, label, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [serviceId, item.template_id || null, item.category, item.label, item.status, i]
    );
  }
}

async function list(req, res) {
  const { search = '', status = '', technicianId } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(sv.ticket_no LIKE ? OR c.name LIKE ? OR sv.device_model LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    clauses.push('sv.status = ?');
    params.push(status);
  }
  if (technicianId) {
    clauses.push('sv.technician_id = ?');
    params.push(technicianId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT sv.id, sv.ticket_no, sv.device_model, sv.status, sv.received_at, sv.created_at,
        c.name AS customer_name, c.phone AS customer_phone, t.name AS technician_name
     FROM services sv
     LEFT JOIN customers c ON c.id = sv.customer_id
     LEFT JOIN users t ON t.id = sv.technician_id
     ${where}
     ORDER BY sv.created_at DESC
     LIMIT 200`,
    params
  );
  res.json(rows);
}

async function get(req, res) {
  const [rows] = await pool.query(
    `SELECT sv.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email, c.address AS customer_address,
        t.name AS technician_name, u.name AS received_by_name
     FROM services sv
     LEFT JOIN customers c ON c.id = sv.customer_id
     LEFT JOIN users t ON t.id = sv.technician_id
     LEFT JOIN users u ON u.id = sv.created_by
     WHERE sv.id = ?`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Data service tidak ditemukan' });
  const service = rows[0];
  const { device_password_enc, ...safeService } = service;
  safeService.device_password = device_password_enc ? decrypt(device_password_enc) : null;

  const [history] = await pool.query('SELECT h.*, u.name AS changed_by_name FROM service_status_history h LEFT JOIN users u ON u.id = h.changed_by WHERE h.service_id = ? ORDER BY h.changed_at ASC', [req.params.id]);
  const [items] = await pool.query('SELECT si.*, p.name AS product_name FROM service_items si JOIN products p ON p.id = si.product_id WHERE si.service_id = ?', [req.params.id]);
  const checklist = await loadChecklist(req.params.id);
  res.json({ ...safeService, history, items, checklist });
}

// Public, unauthenticated status lookup (QR code target) — only non-sensitive fields.
async function getPublicStatus(req, res) {
  const [rows] = await pool.query('SELECT id, ticket_no, device_model, status, received_at, checkup_estimate FROM services WHERE ticket_no = ?', [req.params.ticketNo]);
  if (!rows[0]) return res.status(404).json({ error: 'Nomor tiket tidak ditemukan' });
  const service = rows[0];
  const [history] = await pool.query('SELECT status, changed_at FROM service_status_history WHERE service_id = ? ORDER BY changed_at ASC', [service.id]);
  res.json({
    ticket_no: service.ticket_no,
    device_model: service.device_model,
    status: service.status,
    status_label: STATUS_LABELS[service.status],
    received_at: service.received_at,
    checkup_estimate: service.checkup_estimate,
    history: history.map((h) => ({ status: h.status, status_label: STATUS_LABELS[h.status], changed_at: h.changed_at })),
  });
}

async function create(req, res) {
  const {
    customer_id, new_customer,
    device_model, model_number, serial_number, device_color, device_storage, device_password,
    complaint, estimated_cost, checkup_estimate, checklist,
  } = req.body;
  if (!device_model || !complaint) return res.status(400).json({ error: 'Model perangkat dan keluhan wajib diisi' });
  if (!customer_id && !new_customer?.name) return res.status(400).json({ error: 'Data pelanggan wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let resolvedCustomerId = customer_id || null;
    if (!resolvedCustomerId && new_customer?.name) {
      const [cr] = await conn.query('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)', [
        new_customer.name, new_customer.phone || null, new_customer.email || null, new_customer.address || null,
      ]);
      resolvedCustomerId = cr.insertId;
    }

    const ticketNo = await nextTicketNo(conn);
    const [r] = await conn.query(
      `INSERT INTO services
        (ticket_no, customer_id, device_model, model_number, serial_number, device_color, device_storage, device_password_enc,
         complaint, status, estimated_cost, checkup_estimate, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "menunggu_pengecekan", ?, ?, ?)`,
      [
        ticketNo, resolvedCustomerId, device_model, model_number || null, serial_number || null, device_color || null,
        device_storage || null, encrypt(device_password), complaint, estimated_cost || 0, checkup_estimate || '1 x 24 Jam', req.user.id,
      ]
    );
    await insertChecklist(conn, r.insertId, checklist);
    await conn.query('INSERT INTO service_status_history (service_id, status, note, changed_by) VALUES (?, "menunggu_pengecekan", "Perangkat diterima", ?)', [r.insertId, req.user.id]);
    await conn.commit();

    const [createdRows] = await pool.query('SELECT sv.*, c.name AS customer_name FROM services sv LEFT JOIN customers c ON c.id = sv.customer_id WHERE sv.id = ?', [r.insertId]);
    res.status(201).json(createdRows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function update(req, res) {
  const { device_model, model_number, serial_number, device_color, device_storage, device_password, complaint, diagnosis, technician_id, estimated_cost, checkup_estimate, notes } = req.body;
  const [existing] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing[0]) return res.status(404).json({ error: 'Data service tidak ditemukan' });
  const current = existing[0];

  await pool.query(
    `UPDATE services SET device_model = ?, model_number = ?, serial_number = ?, device_color = ?, device_storage = ?,
       device_password_enc = ?, complaint = ?, diagnosis = ?, technician_id = ?, estimated_cost = ?, checkup_estimate = ?, notes = ?
     WHERE id = ?`,
    [
      device_model ?? current.device_model,
      model_number ?? current.model_number,
      serial_number ?? current.serial_number,
      device_color ?? current.device_color,
      device_storage ?? current.device_storage,
      device_password !== undefined ? encrypt(device_password) : current.device_password_enc,
      complaint ?? current.complaint,
      diagnosis ?? current.diagnosis,
      technician_id ?? current.technician_id,
      estimated_cost ?? current.estimated_cost,
      checkup_estimate ?? current.checkup_estimate,
      notes ?? current.notes,
      req.params.id,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
}

// Replaces the checklist snapshot for a ticket (used to correct intake mistakes after the fact).
async function updateChecklist(req, res) {
  const { checklist } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM services WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!existing[0]) throw Object.assign(new Error('Data service tidak ditemukan'), { status: 404 });

    await conn.query('DELETE FROM service_checklist_items WHERE service_id = ?', [req.params.id]);
    await insertChecklist(conn, req.params.id, checklist);
    await conn.commit();
    res.json(await loadChecklist(req.params.id));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateStatus(req, res) {
  const { status, note, final_cost } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Status tidak valid' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT * FROM services WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!existing[0]) throw Object.assign(new Error('Data service tidak ditemukan'), { status: 404 });

    const completedAt = ['selesai', 'diambil'].includes(status) ? new Date() : existing[0].completed_at;
    await conn.query('UPDATE services SET status = ?, final_cost = ?, completed_at = ? WHERE id = ?', [
      status, final_cost ?? existing[0].final_cost, completedAt, req.params.id,
    ]);
    await conn.query('INSERT INTO service_status_history (service_id, status, note, changed_by) VALUES (?, ?, ?, ?)', [req.params.id, status, note || null, req.user.id]);
    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Records sparepart consumed on a repair ticket and decrements product stock.
async function addItem(req, res) {
  const { product_id, qty, price } = req.body;
  if (!product_id || !qty) return res.status(400).json({ error: 'Produk dan jumlah wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [products] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
    const product = products[0];
    if (!product) throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
    if (product.stock_qty < qty) throw Object.assign(new Error(`Stok ${product.name} tidak mencukupi`), { status: 400 });

    const finalPrice = price ?? product.sell_price;
    await conn.query('INSERT INTO service_items (service_id, product_id, qty, price) VALUES (?, ?, ?, ?)', [req.params.id, product_id, qty, finalPrice]);
    await conn.query('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?', [qty, product_id]);
    await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by) VALUES (?, "out", ?, "Sparepart service", "service", ?, ?)', [
      product_id, qty, req.params.id, req.user.id,
    ]);
    await conn.commit();
    const [items] = await pool.query('SELECT si.*, p.name AS product_name FROM service_items si JOIN products p ON p.id = si.product_id WHERE si.service_id = ?', [req.params.id]);
    res.status(201).json(items);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Removes a sparepart line from a ticket and restores the stock it consumed.
async function removeItem(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [items] = await conn.query('SELECT * FROM service_items WHERE id = ? AND service_id = ? FOR UPDATE', [req.params.itemId, req.params.id]);
    const item = items[0];
    if (!item) throw Object.assign(new Error('Sparepart tidak ditemukan'), { status: 404 });

    await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [item.qty, item.product_id]);
    await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by) VALUES (?, "in", ?, "Batal sparepart service", "service", ?, ?)', [
      item.product_id, item.qty, req.params.id, req.user.id,
    ]);
    await conn.query('DELETE FROM service_items WHERE id = ?', [req.params.itemId]);
    await conn.commit();
    const [remaining] = await pool.query('SELECT si.*, p.name AS product_name FROM service_items si JOIN products p ON p.id = si.product_id WHERE si.service_id = ?', [req.params.id]);
    res.json(remaining);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Deletes a ticket entirely, restoring stock for any sparepart it had consumed.
// service_items / service_status_history / service_checklist_items cascade via FK.
async function remove(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM services WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!existing[0]) throw Object.assign(new Error('Data service tidak ditemukan'), { status: 404 });

    const [items] = await conn.query('SELECT product_id, qty FROM service_items WHERE service_id = ?', [req.params.id]);
    for (const item of items) {
      await conn.query('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?', [item.qty, item.product_id]);
      await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by) VALUES (?, "in", ?, "Hapus tiket service", "service", ?, ?)', [
        item.product_id, item.qty, req.params.id, req.user.id,
      ]);
    }
    await conn.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.status(204).end();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function technicians(req, res) {
  const [rows] = await pool.query("SELECT id, name FROM users WHERE role = 'teknisi' AND is_active = 1 ORDER BY name ASC");
  res.json(rows);
}

module.exports = { list, get, getPublicStatus, create, update, updateChecklist, updateStatus, addItem, removeItem, remove, technicians };
