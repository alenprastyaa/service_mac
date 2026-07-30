const pool = require('../config/db');

async function getStore(req, res) {
  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  res.json(rows[0] || {});
}

async function updateStore(req, res) {
  const { store_name, tagline, address, phone, website, instagram, intake_notice, consent_text } = req.body;
  const [existing] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  const current = existing[0] || {};

  await pool.query(
    `INSERT INTO store_settings (id, store_name, tagline, address, phone, website, instagram, intake_notice, consent_text)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE store_name = VALUES(store_name), tagline = VALUES(tagline), address = VALUES(address),
       phone = VALUES(phone), website = VALUES(website), instagram = VALUES(instagram),
       intake_notice = VALUES(intake_notice), consent_text = VALUES(consent_text)`,
    [
      store_name ?? current.store_name ?? 'Oren MacStore',
      tagline ?? current.tagline ?? null,
      address ?? current.address ?? null,
      phone ?? current.phone ?? null,
      website ?? current.website ?? null,
      instagram ?? current.instagram ?? null,
      intake_notice ?? current.intake_notice ?? null,
      consent_text ?? current.consent_text ?? null,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  res.json(rows[0]);
}

async function updateTarget(req, res) {
  const target = Number(req.body.monthly_omzet_target);
  if (!Number.isFinite(target) || target < 0) return res.status(400).json({ error: 'Nominal target tidak valid' });

  await pool.query(
    `INSERT INTO store_settings (id, monthly_omzet_target) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE monthly_omzet_target = VALUES(monthly_omzet_target)`,
    [target]
  );
  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  res.json(rows[0]);
}

async function updateBank(req, res) {
  const { bank_name, bank_account_number, bank_account_holder } = req.body;
  const [existing] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  const current = existing[0] || {};

  await pool.query(
    `INSERT INTO store_settings (id, bank_name, bank_account_number, bank_account_holder)
     VALUES (1, ?, ?, ?)
     ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), bank_account_number = VALUES(bank_account_number),
       bank_account_holder = VALUES(bank_account_holder)`,
    [
      bank_name ?? current.bank_name ?? null,
      bank_account_number ?? current.bank_account_number ?? null,
      bank_account_holder ?? current.bank_account_holder ?? null,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  res.json(rows[0]);
}

async function updateDefaultMinStock(req, res) {
  const value = Number(req.body.default_min_stock);
  if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Nilai stok minimum default tidak valid' });

  await pool.query(
    `INSERT INTO store_settings (id, default_min_stock) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE default_min_stock = VALUES(default_min_stock)`,
    [value]
  );
  const [rows] = await pool.query('SELECT * FROM store_settings WHERE id = 1');
  res.json(rows[0]);
}

module.exports = { getStore, updateStore, updateTarget, updateBank, updateDefaultMinStock };
