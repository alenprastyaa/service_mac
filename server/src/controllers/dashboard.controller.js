const pool = require('../config/db');

async function pctChange(current, previous) {
  if (!previous || Number(previous) === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function summary(req, res) {
  const [[todaySales]] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE DATE(created_at) = CURDATE() AND status != 'dibatalkan'"
  );
  const [[yesterdaySales]] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND status != 'dibatalkan'"
  );
  const [[monthSales]] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) AND status != 'dibatalkan'"
  );
  const [[lastMonthSales]] = await pool.query(
    "SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND status != 'dibatalkan'"
  );

  const [[monthProfit]] = await pool.query(
    `SELECT COALESCE(SUM((si.price - p.purchase_price) * si.qty), 0) AS profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE MONTH(s.created_at) = MONTH(CURDATE()) AND YEAR(s.created_at) = YEAR(CURDATE()) AND s.status != 'dibatalkan'`
  );
  const [[lastMonthProfit]] = await pool.query(
    `SELECT COALESCE(SUM((si.price - p.purchase_price) * si.qty), 0) AS profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE MONTH(s.created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(s.created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND s.status != 'dibatalkan'`
  );

  const [[sparepartStock]] = await pool.query('SELECT COALESCE(SUM(stock_qty), 0) AS total_units, SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) AS low_stock_count FROM products');
  const [[macbookStock]] = await pool.query("SELECT COUNT(*) AS total_units FROM macbooks WHERE status = 'ready'");

  const [[serviceStats]] = await pool.query(
    `SELECT
       SUM(CASE WHEN status NOT IN ('selesai', 'diambil') THEN 1 ELSE 0 END) AS active_count,
       SUM(CASE WHEN status = 'menunggu_sparepart' THEN 1 ELSE 0 END) AS waiting_sparepart,
       SUM(CASE WHEN status = 'menunggu_pengecekan' THEN 1 ELSE 0 END) AS menunggu_pengecekan,
       SUM(CASE WHEN status = 'sedang_dikerjakan' THEN 1 ELSE 0 END) AS sedang_dikerjakan,
       SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) AS selesai,
       SUM(CASE WHEN DATE(received_at) = CURDATE() THEN 1 ELSE 0 END) AS masuk_today,
       SUM(CASE WHEN DATE(completed_at) = CURDATE() AND status IN ('selesai', 'diambil') THEN 1 ELSE 0 END) AS selesai_today
     FROM services`
  );

  const [lowStockProducts] = await pool.query('SELECT id, name, stock_qty, min_stock, unit FROM products WHERE stock_qty <= min_stock ORDER BY stock_qty ASC LIMIT 5');

  const [recentTransactions] = await pool.query(
    `(SELECT s.id, s.invoice_no AS ref_no, c.name AS customer_name, 'Penjualan' AS type,
        (SELECT GROUP_CONCAT(p.name SEPARATOR ', ') FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id = s.id) AS description,
        s.total, s.status, s.created_at
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id)
     UNION ALL
     (SELECT sv.id, sv.ticket_no AS ref_no, c.name AS customer_name, 'Service' AS type,
        CONCAT('Service ', sv.device_model) AS description,
        sv.final_cost AS total, sv.status, sv.created_at
      FROM services sv LEFT JOIN customers c ON c.id = sv.customer_id WHERE sv.status IN ('selesai', 'diambil'))
     ORDER BY created_at DESC
     LIMIT 10`
  );

  res.json({
    omzet_today: Number(todaySales.total),
    omzet_today_change_pct: await pctChange(Number(todaySales.total), Number(yesterdaySales.total)),
    omzet_month: Number(monthSales.total),
    omzet_month_change_pct: await pctChange(Number(monthSales.total), Number(lastMonthSales.total)),
    gross_profit_month: Number(monthProfit.profit),
    gross_profit_month_change_pct: await pctChange(Number(monthProfit.profit), Number(lastMonthProfit.profit)),
    total_macbook_stock: Number(macbookStock.total_units),
    total_sparepart_stock: Number(sparepartStock.total_units),
    low_stock_count: Number(sparepartStock.low_stock_count),
    service_masuk_today: Number(serviceStats.masuk_today) || 0,
    service_selesai_today: Number(serviceStats.selesai_today) || 0,
    active_service_count: Number(serviceStats.active_count) || 0,
    waiting_sparepart_count: Number(serviceStats.waiting_sparepart) || 0,
    service_status_breakdown: {
      menunggu_pengecekan: Number(serviceStats.menunggu_pengecekan) || 0,
      sedang_dikerjakan: Number(serviceStats.sedang_dikerjakan) || 0,
      selesai: Number(serviceStats.selesai) || 0,
    },
    low_stock_products: lowStockProducts,
    recent_transactions: recentTransactions.map((t) => ({ ...t, status: t.status === 'lunas' || t.status === 'selesai' || t.status === 'diambil' ? 'Lunas' : t.status === 'belum_lunas' ? 'Belum Lunas' : 'Dibatalkan' })),
  });
}

async function salesChart(req, res) {
  const range = Number(req.query.range) === 30 ? 30 : 7;
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND status != 'dibatalkan'
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [range - 1]
  );
  const byDay = Object.fromEntries(rows.map((r) => [r.day, Number(r.total)]));

  const result = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, total: byDay[key] || 0 });
  }
  res.json(result);
}

module.exports = { summary, salesChart };
