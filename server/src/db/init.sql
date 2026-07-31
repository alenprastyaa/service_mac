-- Idempotent schema bootstrap, run automatically on every server start.
-- Unlike schema.sql (used by `npm run seed`), this NEVER drops tables or data.
CREATE DATABASE IF NOT EXISTS `__DB_NAME__` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `__DB_NAME__`;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'kasir', 'teknisi') NOT NULL DEFAULT 'kasir',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  avatar_url VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  store_name VARCHAR(150) NOT NULL DEFAULT 'Oren MacStore',
  tagline VARCHAR(150) DEFAULT 'Premium Apple Service & Products',
  address VARCHAR(255),
  phone VARCHAR(30),
  website VARCHAR(150),
  instagram VARCHAR(100),
  intake_notice TEXT,
  consent_text TEXT,
  monthly_omzet_target DECIMAL(14,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  default_min_stock INT NOT NULL DEFAULT 3,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20),
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  city VARCHAR(100),
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_debts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  description VARCHAR(255),
  due_date DATE DEFAULT NULL,
  status ENUM('belum_lunas', 'lunas') NOT NULL DEFAULT 'belum_lunas',
  paid_at DATETIME DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Lainnya',
  brand VARCHAR(50) NOT NULL DEFAULT 'Apple',
  purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 3,
  unit VARCHAR(20) NOT NULL DEFAULT 'unit',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS macbooks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  photo_path VARCHAR(255) DEFAULT NULL,
  model_name VARCHAR(150) NOT NULL,
  chip VARCHAR(50),
  ram VARCHAR(20),
  storage VARCHAR(20),
  color VARCHAR(50),
  battery_pct TINYINT UNSIGNED NOT NULL DEFAULT 100,
  cycle_count INT UNSIGNED NOT NULL DEFAULT 0,
  serial_number VARCHAR(100),
  modal_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  jual_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('ready', 'terjual', 'service') NOT NULL DEFAULT 'ready',
  notes VARCHAR(255),
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT DEFAULT NULL,
  type ENUM('in', 'out', 'adjustment') NOT NULL,
  qty INT NOT NULL,
  note VARCHAR(255),
  ref_type VARCHAR(30) DEFAULT NULL,
  ref_id INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT DEFAULT NULL,
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax DECIMAL(14,2) NOT NULL DEFAULT 0,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_method ENUM('tunai', 'transfer', 'qris', 'qris_bca', 'qris_bri', 'kartu') NOT NULL DEFAULT 'tunai',
  status ENUM('lunas', 'belum_lunas', 'dibatalkan') NOT NULL DEFAULT 'lunas',
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- A line item references EITHER product_id (sparepart, qty can be >1) OR
-- macbook_id (a specific unit, qty always 1) — never both.
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  macbook_id INT DEFAULT NULL,
  qty INT NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (macbook_id) REFERENCES macbooks(id)
);

CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_no VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT DEFAULT NULL,
  device_model VARCHAR(150) NOT NULL,
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  device_color VARCHAR(50),
  device_storage VARCHAR(50),
  device_password_enc VARCHAR(255),
  complaint VARCHAR(500) NOT NULL,
  diagnosis VARCHAR(500),
  status ENUM('menunggu_pengecekan', 'sedang_dikerjakan', 'menunggu_sparepart', 'selesai', 'diambil') NOT NULL DEFAULT 'menunggu_pengecekan',
  technician_id INT DEFAULT NULL,
  estimated_cost DECIMAL(14,2) DEFAULT 0,
  final_cost DECIMAL(14,2) DEFAULT 0,
  checkup_estimate VARCHAR(50) DEFAULT '1 x 24 Jam',
  notes VARCHAR(500),
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  status ENUM('menunggu_pengecekan', 'sedang_dikerjakan', 'menunggu_sparepart', 'selesai', 'diambil') NOT NULL,
  note VARCHAR(255),
  changed_by INT DEFAULT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Master checklist items, fully managed by Owner/Admin via Pengaturan (not hardcoded).
CREATE TABLE IF NOT EXISTS checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('kondisi_fisik', 'kelengkapan') NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Snapshot of checklist answers filled in at intake time for a specific ticket.
CREATE TABLE IF NOT EXISTS service_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  category ENUM('kondisi_fisik', 'kelengkapan') NOT NULL,
  label VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE SET NULL
);

-- Feeds the topbar notification bell. Populated automatically when a sale or
-- service ticket is created (see lib/notify.js), read via /api/notifications.
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  ref_type VARCHAR(30) DEFAULT NULL,
  ref_id INT DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO store_settings (id) VALUES (1);
