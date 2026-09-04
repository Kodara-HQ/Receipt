CREATE DATABASE IF NOT EXISTS fragrance_universe
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fragrance_universe;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL,
  variant VARCHAR(120) DEFAULT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) DEFAULT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_name (name),
  INDEX idx_products_category (category),
  INDEX idx_products_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(20) NOT NULL,
  customer_name VARCHAR(160) DEFAULT NULL,
  customer_phone VARCHAR(40) DEFAULT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  change_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30) NOT NULL,
  cashier VARCHAR(120) DEFAULT NULL,
  signature TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_sales_receipt (receipt_number),
  INDEX idx_sales_created (created_at),
  INDEX idx_sales_payment (payment_method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED DEFAULT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_type VARCHAR(120) DEFAULT NULL,
  variant VARCHAR(120) DEFAULT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  INDEX idx_sale_items_sale (sale_id),
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_settings (
  id INT NOT NULL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL DEFAULT 'THE FRAGRANCE UNIVERSE',
  address TEXT,
  phone VARCHAR(60) DEFAULT '',
  email VARCHAR(160) DEFAULT '',
  logo TEXT,
  receipt_footer TEXT,
  signature TEXT,
  signature_enabled TINYINT(1) NOT NULL DEFAULT 0,
  currency VARCHAR(16) NOT NULL DEFAULT 'GH₵',
  receipt_paper_size VARCHAR(20) NOT NULL DEFAULT 'thermal',
  show_customer_info TINYINT(1) NOT NULL DEFAULT 1,
  show_cashier_name TINYINT(1) NOT NULL DEFAULT 1,
  default_cashier VARCHAR(120) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipt_counter (
  id INT NOT NULL PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0,
  last_date VARCHAR(8) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO company_settings
  (id, company_name, address, phone, email, receipt_footer, currency)
VALUES (
  1,
  'THE FRAGRANCE UNIVERSE',
  'Accra, Ghana',
  '+233 00 000 0000',
  'hello@thefragranceuniverse.com',
  'Thank you for shopping with The Fragrance Universe.',
  'GH₵'
);

INSERT IGNORE INTO receipt_counter (id, last_number, last_date)
VALUES (1, 0, '');
