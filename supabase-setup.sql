-- ============================================================
-- BrewSync Café — Complete Database Setup
-- Run this ONCE in Supabase: Dashboard > SQL Editor > Run
-- ============================================================


-- ─── 1. TABLES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  image_url  TEXT,
  banner_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           INT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  emoji           TEXT,
  is_veg          BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  is_customizable BOOLEAN DEFAULT false,
  is_available    BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  type        TEXT CHECK (type IN ('percent', 'flat')) NOT NULL,
  value       INT NOT NULL,
  min_order   INT DEFAULT 0,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number   INT NOT NULL,
  order_type     TEXT DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway')),
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')),
  subtotal       INT DEFAULT 0,
  discount       INT DEFAULT 0,
  coupon_code    TEXT,
  cgst           INT DEFAULT 0,
  sgst           INT DEFAULT 0,
  total          INT DEFAULT 0,
  payment_id     TEXT,
  email          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name         TEXT NOT NULL,
  price        INT NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banners (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url  TEXT NOT NULL,
  tag        TEXT,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ─── 2. REALTIME ─────────────────────────────────────────────
-- Required so the admin board and customer order tracker update live.
-- If either line throws "already a member", that is fine — skip it.

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Required for row-level filters (e.g. customer tracking a specific order)
ALTER TABLE orders      REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;


-- ─── 3. ROW LEVEL SECURITY ───────────────────────────────────

ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners     ENABLE ROW LEVEL SECURITY;

-- Role helper functions
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.role() = 'authenticated'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Menu data: public read, admin-only write
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin can write categories" ON categories FOR ALL USING (public.is_admin());

CREATE POLICY "Public can read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admin can write menu_items" ON menu_items FOR ALL USING (public.is_admin());

CREATE POLICY "Public can read coupons" ON coupons FOR SELECT USING (true);
CREATE POLICY "Admin can write coupons"  ON coupons FOR ALL USING (public.is_admin());

CREATE POLICY "Public can read banners" ON banners FOR SELECT USING (true);
CREATE POLICY "Admin can write banners"  ON banners FOR ALL USING (public.is_admin());

-- Orders: customers insert, staff update status, everyone reads (for tracking)
CREATE POLICY "Everyone can read orders" ON orders FOR SELECT USING (true);

CREATE POLICY "Customers can place orders" ON orders FOR INSERT
  WITH CHECK (status = 'pending');

CREATE POLICY "Users can cancel their own pending orders" ON orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Staff can update orders" ON orders FOR UPDATE
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Admin can delete orders" ON orders FOR DELETE
  USING (public.is_admin());

-- Order items: customers insert, everyone reads, staff update/delete
CREATE POLICY "Everyone can read order items" ON order_items FOR SELECT USING (true);

CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id));

CREATE POLICY "Staff can update order items" ON order_items FOR UPDATE
  USING (public.is_staff());

CREATE POLICY "Staff can delete order items" ON order_items FOR DELETE
  USING (public.is_staff());


-- ─── 4. SEED DATA ────────────────────────────────────────────

INSERT INTO categories (name, slug, image_url, banner_url, sort_order) VALUES
  ('Hot Coffee',      'hot-coffee',  NULL,                                                                      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70', 1),
  ('Cold Coffee',     'cold-coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&q=70', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=70', 2),
  ('Teas & Infusions','teas',        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&q=70',    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=70', 3),
  ('Sandwiches',      'sandwiches',  'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=200&q=70',    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=70', 4),
  ('Pastries',        'pastries',    'https://images.unsplash.com/photo-1612203985729-70726954388c?w=200&q=70', 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=600&q=70', 5),
  ('Meals',           'meals',       'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70',  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70', 6),
  ('Coolers & Juices','beverages',   'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&q=70', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=70', 7),
  ('Snacks',          'snacks',      'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&q=70', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=70', 8);

INSERT INTO menu_items (category_id, name, price, description, image_url, emoji, is_veg, is_featured, is_customizable, sort_order) VALUES
  -- Hot Coffee
  ((SELECT id FROM categories WHERE slug='hot-coffee'), 'Signature Flat White',  199, 'Double ristretto shots with velvety steamed milk. Our barista''s pride.', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=200&q=70', '☕', true,  true,  true,  1),
  ((SELECT id FROM categories WHERE slug='hot-coffee'), 'Cappuccino',            169, 'Equal parts espresso, steamed milk & silky foam.',                        NULL, '☕', true,  false, false, 2),
  ((SELECT id FROM categories WHERE slug='hot-coffee'), 'Café Americano',        149, 'Bold espresso diluted with hot water. Clean and strong.',                  NULL, '🖤', true,  false, false, 3),
  ((SELECT id FROM categories WHERE slug='hot-coffee'), 'Café Latte',            179, 'Smooth espresso with generous steamed milk and a light foam top.',         NULL, '☕', true,  false, true,  4),
  ((SELECT id FROM categories WHERE slug='hot-coffee'), 'Espresso Shot',          99, 'Intense, concentrated shot of pure coffee. For the purist.',               NULL, '⚡', true,  false, false, 5),
  -- Cold Coffee
  ((SELECT id FROM categories WHERE slug='cold-coffee'), 'Cold Brew',            229, 'Steeped 18 hours. Smooth, low-acid, naturally sweet.',                    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=70', '🧊', true, false, false, 1),
  ((SELECT id FROM categories WHERE slug='cold-coffee'), 'Iced Caramel Latte',   259, 'Espresso, cold milk, caramel drizzle over ice.',                           NULL, '🧋', true, false, true,  2),
  ((SELECT id FROM categories WHERE slug='cold-coffee'), 'Mocha Frappuccino',    279, 'Blended iced coffee with chocolate, milk and whipped cream.',              NULL, '🍫', true, false, true,  3),
  ((SELECT id FROM categories WHERE slug='cold-coffee'), 'Vietnamese Iced Coffee',249,'Strong dark roast with sweetened condensed milk over ice.',               NULL, '🇻🇳', true, false, false, 4),
  -- Teas
  ((SELECT id FROM categories WHERE slug='teas'), 'Masala Chai',                  99, 'Traditional Indian spiced tea with ginger, cardamom & cinnamon.',          NULL, '🍵', true, false, false, 1),
  ((SELECT id FROM categories WHERE slug='teas'), 'Matcha Latte',                219, 'Ceremonial grade matcha whisked with steamed oat milk.',                   NULL, '🍃', true, false, true,  2),
  ((SELECT id FROM categories WHERE slug='teas'), 'Chamomile Infusion',          149, 'Soothing chamomile flowers steeped with honey.',                           NULL, '🌼', true, false, false, 3),
  -- Sandwiches
  ((SELECT id FROM categories WHERE slug='sandwiches'), 'Grilled Pesto Panini',  279, 'Sun-dried tomato, mozzarella & basil pesto on sourdough.',               'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=200&q=70', '🥪', true,  true,  true,  1),
  ((SELECT id FROM categories WHERE slug='sandwiches'), 'Chicken Club Sandwich', 329, 'Grilled chicken, bacon, lettuce, tomato, mayo on toasted bread.',          NULL, '🥪', false, false, false, 2),
  ((SELECT id FROM categories WHERE slug='sandwiches'), 'Veggie Wrap',           219, 'Fresh vegetables, hummus, feta cheese in a whole wheat tortilla.',         NULL, '🌯', true,  false, true,  3),
  -- Pastries
  ((SELECT id FROM categories WHERE slug='pastries'), 'Butter Croissant',        129, 'Flaky, golden, freshly baked every morning.',                              NULL, '🥐', true, false, false, 1),
  ((SELECT id FROM categories WHERE slug='pastries'), 'Chocolate Lava Cake',     189, 'Warm chocolate cake with molten centre. Served with vanilla cream.',      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&q=70', '🍫', true, false, false, 2),
  ((SELECT id FROM categories WHERE slug='pastries'), 'Blueberry Muffin',        139, 'Soft, moist muffin loaded with fresh blueberries.',                        NULL, '🫐', true, false, false, 3),
  -- Meals
  ((SELECT id FROM categories WHERE slug='meals'), 'Margherita Pizza',           349, 'Classic thin crust with fresh mozzarella, tomato & basil.',                NULL, '🍕', true,  false, true,  1),
  ((SELECT id FROM categories WHERE slug='meals'), 'Chicken Alfredo Pasta',      389, 'Penne in creamy parmesan sauce with grilled chicken.',                     NULL, '🍝', false, false, false, 2),
  ((SELECT id FROM categories WHERE slug='meals'), 'Garden Bowl',                299, 'Quinoa, roasted veggies, avocado, tahini dressing.',                       NULL, '🥗', true,  true,  false, 3),
  -- Coolers
  ((SELECT id FROM categories WHERE slug='beverages'), 'Fresh Orange Juice',     179, 'Freshly squeezed Nagpur oranges. No added sugar.',                         NULL, '🍊', true, false, false, 1),
  ((SELECT id FROM categories WHERE slug='beverages'), 'Mango Smoothie',         199, 'Alphonso mango blended with yogurt and honey.',                            NULL, '🥭', true, false, false, 2),
  ((SELECT id FROM categories WHERE slug='beverages'), 'Mint Lemonade',          129, 'Chilled lemonade with fresh mint and a hint of ginger.',                   NULL, '🍋', true, false, false, 3),
  -- Snacks
  ((SELECT id FROM categories WHERE slug='snacks'), 'Cheese Garlic Toast',       149, 'Thick-cut bread, garlic butter, melted cheese. Perfect with coffee.',      NULL, '🧀', true, false, false, 1),
  ((SELECT id FROM categories WHERE slug='snacks'), 'French Fries',              129, 'Crispy golden fries with peri-peri seasoning.',                            NULL, '🍟', true, false, false, 2),
  ((SELECT id FROM categories WHERE slug='snacks'), 'Chicken Wings',             249, 'Spicy buffalo wings with ranch dipping sauce. 6 pcs.',                     NULL, '🍗', false, false, false, 3);

INSERT INTO coupons (code, type, value, min_order, description) VALUES
  ('BREW10',   'percent', 10,  300, 'Get 10% off on orders above ₹300'),
  ('FIRST50',  'flat',    50,    0, 'Flat ₹50 off on your first order'),
  ('COMBO100', 'flat',   100,  500, 'Flat ₹100 off on orders above ₹500');

INSERT INTO banners (image_url, tag, title, subtitle, sort_order) VALUES
  ('https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80', 'NEW ARRIVAL',  'Cold Brew & Beyond',   'Slow-steeped, bold, refreshing',    1),
  ('https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',   'TODAY''S PICK', 'Pastry & Desserts',    'Freshly baked every morning',       2),
  ('https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',   'COMBO DEAL',    'Sandwich + Coffee',    'Save ₹50 on any combo',             3);


-- ─── DONE ────────────────────────────────────────────────────
-- To assign roles to admin/staff users after creating them in Supabase Auth:
--
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
--   WHERE email = 'admin@brewsync.cafe';
--
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role": "staff"}'
--   WHERE email = 'staff@brewsync.cafe';
-- ============================================================
