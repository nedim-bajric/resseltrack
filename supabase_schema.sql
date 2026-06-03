-- ResellTrack Supabase Schema
-- Run this in the Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════
-- 1. Products
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  buy_price NUMERIC NOT NULL,
  original_price NUMERIC,
  target_price NUMERIC NOT NULL,
  sold_price NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('in_stock','listed','sold_out')),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_sold INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Product Options (variants)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  sold_quantity INTEGER NOT NULL DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Orders
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  option_id UUID REFERENCES product_options(id),
  option_name TEXT,
  quantity INTEGER NOT NULL,
  sell_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  platform TEXT NOT NULL,
  customer_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped', 'done')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Costs
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ai_tools','shipping','packaging','ads','other')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Enable RLS
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

-- Drop old open policies if they exist
drop policy if exists allow_all on products;
drop policy if exists allow_all on product_options;
drop policy if exists allow_all on orders;
drop policy if exists allow_all on costs;

-- ═══════════════════════════════════════════════════════════════════
-- 6. RLS Policies (user-scoped)
-- ═══════════════════════════════════════════════════════════════════

-- Products: users can only see/modify their own
create policy products_user_isolation on products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Product options: access via parent product (users can't directly CRUD options that aren't theirs)
create policy product_options_user_isolation on product_options
  for all using (
    product_id in (select id from products where user_id = auth.uid())
  ) with check (
    product_id in (select id from products where user_id = auth.uid())
  );

-- Orders: users can only see/modify their own
create policy orders_user_isolation on orders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Costs: users can only see/modify their own
create policy costs_user_isolation on costs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- 7. Migration helpers for existing tables (if upgrading)
-- ═══════════════════════════════════════════════════════════════════

-- If tables already exist without user_id, add the column.
-- NOTE: After adding user_id, you MUST manually set user_id on existing rows
-- or delete them, otherwise RLS will hide them.
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE costs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price NUMERIC;
