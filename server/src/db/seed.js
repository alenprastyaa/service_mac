/* Resets and seeds the database with demo data for Oren MacStore. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../lib/crypto');

const DB_NAME = process.env.DB_NAME || 'oren_macstore';

function daysAgo(n, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('Applying schema (drop & recreate)...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(schemaSql);
  await conn.changeUser({ database: DB_NAME });

  console.log('Seeding store settings...');
  await conn.query(
    `INSERT INTO store_settings (id, store_name, tagline, address, phone, website, instagram, intake_notice, consent_text) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'Oren MacStore',
      'Premium Apple Service & Products',
      'Jl. Mendungan Pabelan No. 45, Kartasura, Sukoharjo, Solo Raya',
      '0812-3456-7890',
      'www.orenmacstore.com',
      '@oren.macstore',
      'Pastikan data penting Anda sudah di-backup sebelum service.\nOren MacStore tidak bertanggung jawab atas kehilangan data.\nKerusakan akibat cairan tidak ditanggung garansi.\nDengan menyerahkan unit ini, Anda menyetujui pengecekan perangkat.',
      'Saya yang bertanda tangan di bawah ini menyetujui untuk dilakukan pemeriksaan terhadap perangkat di atas oleh teknisi Oren MacStore.',
    ]
  );

  console.log('Seeding checklist templates...');
  const kondisiFisikLabels = ['LCD / Display', 'Body / Casing', 'Keyboard', 'Trackpad', 'Baterai', 'Port / Konektor', 'Speaker'];
  const kelengkapanLabels = ['Unit MacBook', 'Charger Original', 'Kabel Charger', 'Adaptor / Headset', 'Tas / Sleeve', 'Dus / Box', 'Aksesoris Lain'];
  const checklistTemplateIds = { kondisi_fisik: [], kelengkapan: [] };
  for (const [i, label] of kondisiFisikLabels.entries()) {
    const [r] = await conn.query('INSERT INTO checklist_templates (category, label, sort_order) VALUES ("kondisi_fisik", ?, ?)', [label, i]);
    checklistTemplateIds.kondisi_fisik.push({ id: r.insertId, label });
  }
  for (const [i, label] of kelengkapanLabels.entries()) {
    const [r] = await conn.query('INSERT INTO checklist_templates (category, label, sort_order) VALUES ("kelengkapan", ?, ?)', [label, i]);
    checklistTemplateIds.kelengkapan.push({ id: r.insertId, label });
  }

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const users = [
    ['Arif Wahyu', 'arif@orenmacstore.id', 'owner'],
    ['Siti Marlina', 'siti@orenmacstore.id', 'admin'],
    ['Dedi Kurniawan', 'dedi@orenmacstore.id', 'kasir'],
    ['Yusuf Maulana', 'yusuf@orenmacstore.id', 'teknisi'],
  ];
  const userIds = {};
  for (const [name, email, role] of users) {
    const [r] = await conn.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, passwordHash, role]);
    userIds[role] = r.insertId;
  }

  console.log('Seeding customers...');
  const customers = [
    ['Budi Santoso', '081234567801', 'budi.santoso@gmail.com', 'Jl. Merdeka No. 12, Jakarta'],
    ['Andi Pratama', '081234567802', 'andi.pratama@gmail.com', 'Jl. Sudirman No. 45, Jakarta'],
    ['Rina Wijaya', '081234567803', 'rina.wijaya@gmail.com', 'Jl. Gatot Subroto No. 8, Jakarta'],
    ['Dewi Lestari', '081234567804', 'dewi.lestari@gmail.com', 'Jl. Thamrin No. 21, Jakarta'],
    ['Fajar Nugroho', '081234567805', 'fajar.nugroho@gmail.com', 'Jl. Kemang Raya No. 5, Jakarta'],
    ['Lina Marlina', '081234567806', 'lina.marlina@gmail.com', 'Jl. Panjang No. 33, Jakarta'],
  ];
  const customerIds = [];
  for (const c of customers) {
    const [r] = await conn.query('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)', c);
    customerIds.push(r.insertId);
  }
  const [budi, andi, rina, dewi, fajar, lina] = customerIds;

  console.log('Seeding suppliers...');
  const suppliers = [
    ['PT Sumber Apple Indonesia', 'Hendra Wijaya', '0217001234', 'sales@sumberapple.co.id', 'Jl. Industri Raya No. 1, Tangerang'],
    ['CV Gadget Jaya', 'Maya Sari', '0217005678', 'order@gadgetjaya.co.id', 'Jl. Rawa Buaya No. 9, Jakarta Barat'],
    ['Distributor Aksesoris Nusantara', 'Rudi Hartono', '0217009012', 'cs@aksesorisnusantara.co.id', 'Jl. Cikini Raya No. 15, Jakarta Pusat'],
  ];
  const supplierIds = [];
  for (const s of suppliers) {
    const [r] = await conn.query('INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)', s);
    supplierIds.push(r.insertId);
  }
  const [supApple, supGadget, supAksesoris] = supplierIds;

  console.log('Seeding products...');
  const products = [
    ['MBA-M1-13', 'MacBook Air M1 13"', 'Laptop', 'Apple', 9500000, 10500000, 2, 3, 'unit', supApple],
    ['MBP-M2-13', 'MacBook Pro M2 13"', 'Laptop', 'Apple', 16500000, 18750000, 3, 3, 'unit', supApple],
    ['MBA-M2-13', 'MacBook Air M2 13"', 'Laptop', 'Apple', 13000000, 14500000, 8, 3, 'unit', supApple],
    ['MBP-M3-14', 'MacBook Pro M3 14"', 'Laptop', 'Apple', 21000000, 23500000, 5, 3, 'unit', supApple],
    ['IPAD-AIR-5', 'iPad Air 5th Gen', 'Tablet', 'Apple', 8000000, 9200000, 4, 5, 'unit', supApple],
    ['AIRPODS-PRO2', 'AirPods Pro 2', 'Aksesoris', 'Apple', 2900000, 3500000, 20, 5, 'unit', supGadget],
    ['MAGIC-MOUSE-2', 'Magic Mouse 2', 'Aksesoris', 'Apple', 950000, 1250000, 1, 3, 'unit', supGadget],
    ['MAGIC-KEYBOARD', 'Magic Keyboard', 'Aksesoris', 'Apple', 1800000, 2350000, 15, 5, 'unit', supGadget],
    ['CHG-67W', 'Charger MacBook 67W', 'Aksesoris', 'Apple', 650000, 950000, 2, 5, 'unit', supAksesoris],
    ['USBC-HUB', 'USB-C Hub 7-in-1', 'Aksesoris', 'Generic', 280000, 450000, 25, 5, 'unit', supAksesoris],
    ['SLEEVE-CASE', 'MacBook Sleeve Case 13"/14"', 'Aksesoris', 'Generic', 120000, 250000, 30, 5, 'unit', supAksesoris],
    ['CABLE-USBC', 'Cable USB-C to USB-C 2M', 'Aksesoris', 'Generic', 45000, 95000, 40, 10, 'unit', supAksesoris],
  ];
  const productIds = {};
  for (const [sku, name, category, brand, purchase, sell, stock, minStock, unit, supplierId] of products) {
    const [r] = await conn.query(
      'INSERT INTO products (sku, name, category, brand, purchase_price, sell_price, stock_qty, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sku, name, category, brand, purchase, sell, stock, minStock, unit]
    );
    productIds[sku] = r.insertId;
    await conn.query(
      'INSERT INTO stock_movements (product_id, supplier_id, type, qty, note, created_by, created_at) VALUES (?, ?, "in", ?, "Stok awal", ?, ?)',
      [r.insertId, supplierId, stock, userIds.owner, daysAgo(20)]
    );
  }

  console.log('Seeding sales...');
  async function createSale(invoiceNo, customerId, items, offsetDays, paymentMethod = 'tunai') {
    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const createdAt = daysAgo(offsetDays, 9 + Math.floor(Math.random() * 8));
    const [r] = await conn.query(
      'INSERT INTO sales (invoice_no, customer_id, subtotal, discount, tax, total, payment_method, status, created_by, created_at) VALUES (?, ?, ?, 0, 0, ?, ?, "lunas", ?, ?)',
      [invoiceNo, customerId, subtotal, subtotal, paymentMethod, userIds.kasir, createdAt]
    );
    for (const it of items) {
      const itemSubtotal = it.price * it.qty;
      await conn.query('INSERT INTO sale_items (sale_id, product_id, qty, price, subtotal) VALUES (?, ?, ?, ?, ?)', [r.insertId, productIds[it.sku], it.qty, it.price, itemSubtotal]);
      await conn.query('INSERT INTO stock_movements (product_id, type, qty, note, ref_type, ref_id, created_by, created_at) VALUES (?, "out", ?, ?, "sale", ?, ?, ?)', [
        productIds[it.sku], it.qty, `Penjualan ${invoiceNo}`, r.insertId, userIds.kasir, createdAt,
      ]);
    }
    return r.insertId;
  }

  await createSale('INV-000114', fajar, [{ sku: 'USBC-HUB', qty: 2, price: 450000 }], 6);
  await createSale('INV-000115', lina, [{ sku: 'MAGIC-KEYBOARD', qty: 1, price: 2350000 }], 6);
  await createSale('INV-000116', budi, [{ sku: 'AIRPODS-PRO2', qty: 1, price: 3500000 }], 5);
  await createSale('INV-000117', andi, [{ sku: 'SLEEVE-CASE', qty: 3, price: 250000 }], 5);
  await createSale('INV-000118', dewi, [{ sku: 'IPAD-AIR-5', qty: 1, price: 9200000 }], 4);
  await createSale('INV-000119', rina, [{ sku: 'CABLE-USBC', qty: 5, price: 95000 }], 4);
  await createSale('INV-000120', fajar, [{ sku: 'MBA-M2-13', qty: 1, price: 14500000 }], 3);
  await createSale('INV-000121', lina, [{ sku: 'CHG-67W', qty: 1, price: 950000 }], 2, 'transfer');
  await createSale('INV-000122', dewi, [{ sku: 'MAGIC-KEYBOARD', qty: 1, price: 2350000 }], 0, 'qris');
  await createSale('INV-000123', andi, [{ sku: 'MBP-M2-13', qty: 1, price: 18750000 }], 0, 'transfer');
  await createSale('INV-000124', budi, [{ sku: 'MBA-M1-13', qty: 1, price: 10500000 }], 0, 'tunai');

  console.log('Seeding service tickets...');
  async function createService(ticketNo, customerId, deviceModel, complaint, status, technicianId, offsetDays, opts = {}) {
    const receivedAt = daysAgo(offsetDays, 9);
    const completedAt = ['selesai', 'diambil'].includes(status) ? daysAgo(Math.max(offsetDays - 2, 0), 16) : null;
    const [r] = await conn.query(
      `INSERT INTO services
        (ticket_no, customer_id, device_model, model_number, serial_number, device_color, device_storage, device_password_enc,
         complaint, diagnosis, status, technician_id, estimated_cost, final_cost, checkup_estimate, notes, received_at, completed_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketNo, customerId, deviceModel, opts.modelNumber || null, opts.serial || null, opts.color || null, opts.storage || null,
        opts.password ? encrypt(opts.password) : null, complaint, opts.diagnosis || null, status, technicianId, opts.estimatedCost || 0,
        opts.finalCost || 0, opts.checkupEstimate || '1 x 24 Jam', opts.notes || null, receivedAt, completedAt, userIds.kasir, receivedAt,
      ]
    );
    await conn.query('INSERT INTO service_status_history (service_id, status, note, changed_by, changed_at) VALUES (?, "menunggu_pengecekan", "Perangkat diterima", ?, ?)', [r.insertId, userIds.kasir, receivedAt]);
    if (status !== 'menunggu_pengecekan') {
      await conn.query('INSERT INTO service_status_history (service_id, status, note, changed_by, changed_at) VALUES (?, ?, "Update status", ?, ?)', [r.insertId, status, technicianId || userIds.teknisi, completedAt || daysAgo(Math.max(offsetDays - 1, 0), 12)]);
    }
    if (opts.checklist) {
      let sortOrder = 0;
      for (const category of ['kondisi_fisik', 'kelengkapan']) {
        for (const tpl of checklistTemplateIds[category]) {
          const value = opts.checklist[category]?.[tpl.label];
          if (!value) continue;
          await conn.query('INSERT INTO service_checklist_items (service_id, template_id, category, label, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)', [
            r.insertId, tpl.id, category, tpl.label, value, sortOrder++,
          ]);
        }
      }
    }
    return r.insertId;
  }

  const teknisiId = userIds.teknisi;
  let ticketNum = 29;
  const nextTicket = () => `SRV-${String(ticketNum++).padStart(6, '0')}`;

  for (let i = 0; i < 3; i++) {
    await createService(nextTicket(), customerIds[i % customerIds.length], ['MacBook Air M1 13"', 'MacBook Pro M2 13"', 'MacBook Air M2 13"'][i], 'Baterai cepat habis dan perangkat panas', 'menunggu_pengecekan', null, i);
  }
  for (let i = 0; i < 4; i++) {
    await createService(nextTicket(), customerIds[(i + 1) % customerIds.length], ['MacBook Pro M3 14"', 'MacBook Air M1 13"', 'MacBook Pro M2 13"', 'iPad Air 5th Gen'][i], 'Layar bergaris dan tidak menyala sempurna', 'sedang_dikerjakan', teknisiId, i + 1, { diagnosis: 'Kerusakan pada konektor layar' });
  }
  for (let i = 0; i < 5; i++) {
    await createService(nextTicket(), customerIds[(i + 2) % customerIds.length], ['MacBook Air M2 13"', 'MacBook Pro M2 13"', 'MacBook Air M1 13"', 'MacBook Pro M3 14"', 'iPad Air 5th Gen'][i], 'Keyboard tidak responsif pada beberapa tombol', 'menunggu_sparepart', teknisiId, i + 2, { diagnosis: 'Perlu penggantian keyboard assembly', estimatedCost: 1500000 });
  }
  for (let i = 0; i < 4; i++) {
    await createService(nextTicket(), customerIds[(i + 3) % customerIds.length], ['MacBook Air M1 13"', 'MacBook Pro M2 13"', 'MacBook Air M2 13"', 'iPad Air 5th Gen'][i], 'Tidak bisa charging', 'selesai', teknisiId, i + 3, { diagnosis: 'IC charging rusak, sudah diganti', finalCost: 950000 + i * 100000 });
  }
  // Final ticket mirrors the reference "Nota Penerimaan" example in full (customer, device details, checklist).
  await createService('SRV-000045', rina, 'MacBook Air M1 13-inch', 'MacBook tidak bisa di charge dan mati total.', 'selesai', teknisiId, 0, {
    modelNumber: 'A2337 (M1, 2020)',
    serial: 'FVFHQQQ6Q6L4',
    color: 'Space Gray',
    storage: '256GB / 8GB',
    password: 'macbook2024',
    diagnosis: 'Kerusakan pada IC charging, sudah diperbaiki dan unit dapat menyala normal.',
    finalCost: 1250000,
    checkupEstimate: '1 x 24 Jam',
    checklist: {
      kondisi_fisik: {
        'LCD / Display': 'baik',
        'Body / Casing': 'baik',
        Keyboard: 'baik',
        Trackpad: 'baik',
        Baterai: 'tidak_dicek',
        'Port / Konektor': 'baik',
        Speaker: 'baik',
      },
      kelengkapan: {
        'Unit MacBook': 'ada',
        'Charger Original': 'ada',
        'Kabel Charger': 'ada',
        'Adaptor / Headset': 'tidak_ada',
        'Tas / Sleeve': 'tidak_ada',
        'Dus / Box': 'tidak_ada',
        'Aksesoris Lain': 'tidak_ada',
      },
    },
  });

  console.log('Seed complete.');
  console.log('Login accounts (password: password123):');
  users.forEach(([name, email, role]) => console.log(`  ${role.padEnd(8)} ${email}`));

  await conn.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
