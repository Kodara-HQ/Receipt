CREATE SCHEMA IF NOT EXISTS fragrance_universe;
SET search_path TO fragrance_universe;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80) NOT NULL,
  variant VARCHAR(120),
  selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
  cost_price NUMERIC(12, 2) CHECK (cost_price IS NULL OR cost_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  receipt_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(160),
  customer_phone VARCHAR(40),
  subtotal NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL,
  change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('Cash', 'Mobile Money', 'Card', 'Other')),
  cashier VARCHAR(120),
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(200) NOT NULL,
  product_type VARCHAR(120),
  variant VARCHAR(120),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(200) NOT NULL DEFAULT 'THE FRAGRANCE UNIVERSE',
  address TEXT DEFAULT '',
  phone VARCHAR(60) DEFAULT '',
  email VARCHAR(160) DEFAULT '',
  logo TEXT,
  receipt_footer TEXT DEFAULT 'Thank you for shopping with The Fragrance Universe.',
  signature TEXT,
  signature_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  currency VARCHAR(16) NOT NULL DEFAULT 'GH₵',
  receipt_paper_size VARCHAR(20) NOT NULL DEFAULT 'thermal',
  show_customer_info BOOLEAN NOT NULL DEFAULT TRUE,
  show_cashier_name BOOLEAN NOT NULL DEFAULT TRUE,
  default_cashier VARCHAR(120) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_number INTEGER NOT NULL DEFAULT 0,
  last_date VARCHAR(8) NOT NULL DEFAULT '',
  CONSTRAINT single_counter_row CHECK (id = 1)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales (receipt_number);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales (payment_method);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);

INSERT INTO company_settings (id, company_name, address, phone, email, receipt_footer, currency)
VALUES (
  1,
  'THE FRAGRANCE UNIVERSE',
  'Accra, Ghana',
  '+233 00 000 0000',
  'hello@thefragranceuniverse.com',
  'Thank you for shopping with The Fragrance Universe.',
  'GH₵'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO receipt_counter (id, last_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
