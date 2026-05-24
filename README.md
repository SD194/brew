# BrewSync

A Vite + Supabase café ordering system with two browser apps:

- **Customer app** — the root of this repo (runs on port 3000)
- **Admin/Staff dashboard** — lives in `admin/` (runs on port 3001)

---

## Quick Start

### 1. Install dependencies

```bash
# Customer app
npm install

# Admin dashboard
npm --prefix admin install
```

### 2. Configure Supabase

Your `.env` file at the project root is already shared by both apps.
Fill in your real values from the [Supabase dashboard](https://supabase.com/dashboard) → Settings → API:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_TABLE_NUMBER=4
```

### 3. Set up the database

Run **`supabase-setup.sql`** once in the Supabase SQL Editor. It creates all tables, enables Realtime, sets all RLS policies, and seeds the initial menu data — everything in one shot.

### 4. Run locally

```bash
# Customer app  →  http://localhost:3000
npm run dev

# Admin dashboard  →  http://localhost:3001
npm run dev:admin
```

---

## Project Structure

```
brewsync/
├── src/                       Customer app modules
│   ├── main.js                App entry point
│   ├── api.js                 Supabase queries (orders, menu, coupons)
│   ├── ui.js                  Rendering helpers
│   ├── cart.js                Cart state
│   ├── order-tracker.js       Real-time order status tracker
│   ├── customizer.js          Item customization sheet
│   ├── suggestions.js         Smart upsell engine
│   ├── animations.js          Skeleton + toast helpers
│   ├── sanitize.js            XSS helpers
│   ├── fallback-data.js       Offline/demo data (mirrors DB seed)
│   ├── config.js              Env var reader
│   ├── logger.js              Dev-only console wrapper
│   └── supabase.js            Supabase client
│
├── admin/src/                 Admin/Staff dashboard modules
│   ├── main.js                Auth, routing, realtime subscription
│   ├── api.js                 Admin Supabase queries
│   ├── dashboard.js           Overview stats page
│   ├── orders.js              Kanban order board
│   ├── pos.js                 Point-of-sale (staff creates orders)
│   ├── menu-manager.js        Add/edit/toggle menu items
│   ├── analytics.js           Revenue charts
│   ├── staff.js               Staff management
│   ├── sanitize.js            XSS helpers
│   ├── fallback-data.js       Demo orders for admin dashboard
│   ├── config.js              Env var reader
│   └── supabase.js            Supabase client
│
├── index.html                 Customer app shell
├── style.css                  Customer app styles
├── admin/index.html           Admin app shell
├── admin/style.css            Admin app styles
│
├── supabase-setup.sql         DB schema + Realtime + RLS + seed data (run once)
│
├── .env                       Your local secrets (never commit)
├── package.json               Root scripts
└── vite.config.js             Customer app Vite config
```

---

## Deployment

- Deploy the root and `admin/` as separate Vite static sites.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in both deployment environments.
- **Never** expose the Supabase service role key — only the public anon key belongs in browser builds.

---

## How Customer ↔ Admin Interaction Works

1. Customer places an order → `orders` row inserted, then `order_items` rows inserted.
2. Admin's Supabase Realtime channel picks up the `INSERT` (waits 800 ms for items to land), fetches the full order, and shows it on the Kanban board.
3. Admin advances the order status → `orders` row updated.
4. Customer's order tracker is subscribed to that specific order row via Realtime and updates the progress steps live.

Both flows require `supabase-setup.sql` to have been run (enables the `supabase_realtime` publication and `REPLICA IDENTITY FULL`).

