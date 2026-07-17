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

module.exports = { getStore, updateStore };
