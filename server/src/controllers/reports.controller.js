const pool = require('../config/db');

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))];
  return lines.join('\n');
}

function sendReport(req, res, rows, filename) {
  if (req.query.format === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment(`${filename}.csv`);
    return res.send(toCsv(rows));
  }
  res.json(rows);
}

function dateRange(query) {
  const to = query.to || new Date().toISOString().slice(0, 10);
  const fromDefault = new Date();
  fromDefault.setDate(fromDefault.getDate() - 29);
  const from = query.from || fromDefault.toISOString().slice(0, 10);
  return { from: `${from} 00:00:00`, to: `${to} 23:59:59` };
}

async function salesReport(req, res) {
  const { from, to } = dateRange(req.query);
  const [rows] = await pool.query(
    `SELECT s.invoice_no, s.created_at, c.name AS customer, s.subtotal, s.discount, s.tax, s.total, s.payment_method, s.status
     FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
     WHERE s.created_at BETWEEN ? AND ?
     ORDER BY s.created_at DESC`,
    [from, to]
  );
  sendReport(req, res, rows, 'laporan-penjualan');
}

async function profitReport(req, res) {
  const { from, to } = dateRange(req.query);
  const [rows] = await pool.query(
    `SELECT * FROM (
       (SELECT p.name AS product, p.sku, SUM(si.qty) AS qty_terjual, SUM(si.subtotal) AS total_penjualan,
           SUM(si.qty * p.purchase_price) AS total_modal, SUM(si.subtotal - (si.qty * p.purchase_price)) AS profit
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.created_at BETWEEN ? AND ? AND s.status != 'dibatalkan'
        GROUP BY p.id, p.name, p.sku)
       UNION ALL
       (SELECT m.model_name AS product, COALESCE(m.serial_number, CONCAT('MB', LPAD(m.id, 6, '0'))) AS sku,
           1 AS qty_terjual, si.subtotal AS total_penjualan, m.modal_price AS total_modal, (si.subtotal - m.modal_price) AS profit
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN macbooks m ON m.id = si.macbook_id
        WHERE s.created_at BETWEEN ? AND ? AND s.status != 'dibatalkan')
     ) combined
     ORDER BY profit DESC`,
    [from, to, from, to]
  );
  sendReport(req, res, rows, 'laporan-profit');
}

async function stockReport(req, res) {
  const [rows] = await pool.query(
    `SELECT * FROM (
       (SELECT sku, name, category, stock_qty, min_stock, purchase_price, sell_price, (stock_qty * purchase_price) AS nilai_stok
        FROM products)
       UNION ALL
       (SELECT COALESCE(serial_number, CONCAT('MB', LPAD(id, 6, '0'))) AS sku, model_name AS name, 'MacBook (Ready)' AS category,
           1 AS stock_qty, 1 AS min_stock, modal_price AS purchase_price, jual_price AS sell_price, modal_price AS nilai_stok
        FROM macbooks WHERE status = 'ready')
     ) combined
     ORDER BY category ASC, name ASC`
  );
  sendReport(req, res, rows, 'laporan-stok');
}

async function serviceReport(req, res) {
  const { from, to } = dateRange(req.query);
  const clauses = ['sv.created_at BETWEEN ? AND ?'];
  const params = [from, to];
  if (req.query.status) {
    clauses.push('sv.status = ?');
    params.push(req.query.status);
  }
  const [rows] = await pool.query(
    `SELECT sv.ticket_no, sv.created_at, c.name AS customer, sv.device_model, sv.status, t.name AS technician, sv.estimated_cost, sv.final_cost
     FROM services sv
     LEFT JOIN customers c ON c.id = sv.customer_id
     LEFT JOIN users t ON t.id = sv.technician_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY sv.created_at DESC`,
    params
  );
  sendReport(req, res, rows, 'laporan-service');
}

async function debtsReport(req, res) {
  const [rows] = await pool.query(
    `SELECT sd.id, s.code AS supplier_code, s.name AS supplier, s.phone AS supplier_phone,
        sd.amount, sd.description, sd.due_date, sd.status, sd.paid_at, sd.created_at
     FROM supplier_debts sd
     JOIN suppliers s ON s.id = sd.supplier_id
     ORDER BY sd.status ASC, sd.due_date IS NULL, sd.due_date ASC, sd.created_at DESC`
  );
  sendReport(req, res, rows, 'laporan-hutang-piutang');
}

module.exports = { salesReport, profitReport, stockReport, serviceReport, debtsReport };
