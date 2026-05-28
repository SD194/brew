/**
 * BrewSync Admin — Main Entry Point
 * Handles auth, routing, clock, and page orchestration.
 */
import { supabase, isConfigured } from './supabase.js';
import { fetchAdminData, fetchOrderById } from './api.js';
import { renderDashboard } from './dashboard.js';
import { renderOrders, initOrders } from './orders.js';
import { renderPOS, initPOS } from './pos.js';
import { renderMenuManager } from './menu-manager.js';
import { renderAnalytics } from './analytics.js';
import { renderStaff } from './staff.js';
import { renderSettings } from './settings.js';

// ── Global App State ──
window.APP = {
  user: null,
  role: 'admin',          // 'admin' | 'staff'
  orders: [],
  menuItems: [],
  categories: [],
  staff: [],
  currentPage: 'dashboard'
};

let clockInterval = null;
let realtimeChannel = null;
let pollInterval = null;

// ── Toast ──
export function toast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Clock ──
function updateClock() {
  const now = new Date();
  document.getElementById('topClock').textContent =
    now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) +
    '  •  ' + now.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
}

// ── Auth ──
function initAuth() {
  document.getElementById('loginBtn').onclick = handleLogin;
  document.getElementById('logoutBtn').onclick = handleLogout;
  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (!email || !pass) { errEl.textContent = 'Please enter email and password'; return; }

  if (!isConfigured()) {
    errEl.textContent = 'System not configured. Missing Supabase credentials.';
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    APP.user = data.user;
    APP.role = (data.user?.email === 'sharathnaikhelpline@gmail.com' || data.user?.app_metadata?.role !== 'staff') ? 'admin' : 'staff';
    await loadProductionData();
    showApp();
  } catch (err) {
    console.error('Login Error:', err);
    errEl.textContent = err.message || 'Login failed';
    // If we failed after auth but during loadProductionData, we should probably sign out so they aren't stuck half-logged-in
    if (APP.user && !err.message.includes('credentials')) {
      supabase.auth.signOut();
      APP.user = null;
    }
  }
}



async function loadProductionData() {
  const data = await fetchAdminData();
  APP.orders = data.orders;
  APP.menuItems = data.menuItems;
  APP.categories = data.categories;
}

// ── Polling fallback (runs alongside Realtime as a safety net) ──
// Fetches fresh orders every 8 s. Only re-renders if something changed.
async function pollOrders() {
  if (!APP.user) return;
  try {
    const data = await fetchAdminData();
    const fresh = data.orders;

    // Detect any difference: new order count or any status/payment change
    let changed = fresh.length !== APP.orders.length;
    if (!changed) {
      for (const fo of fresh) {
        const existing = APP.orders.find(o => o.id === fo.id);
        if (!existing || existing.status !== fo.status) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      // Merge: preserve full items arrays we already fetched, only overwrite scalars
      APP.orders = fresh.map(fo => {
        const old = APP.orders.find(o => o.id === fo.id);
        return old ? { ...fo, items: fo.items?.length ? fo.items : (old.items || []) } : fo;
      });
      if (APP.currentPage === 'orders' || APP.currentPage === 'dashboard') {
        navigateTo(APP.currentPage);
      }
    }
  } catch (_) { /* silent — network blip, try again next tick */ }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(pollOrders, 8000);
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}



function handleLogout() {
  stopPolling();
  APP.user = null;
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('loginScreen').style.display = '';
  supabase.auth.signOut();
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').classList.remove('hidden');

  const name = APP.user?.email?.split('@')[0] || 'Admin';
  document.getElementById('userNameSidebar').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById('userRoleSidebar').textContent = APP.role === 'admin' ? 'Administrator' : 'Staff';
  document.getElementById('userAvatarSidebar').textContent = name.charAt(0).toUpperCase();

  // Hide admin-only links for staff role
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = APP.role === 'admin' ? '' : 'none';
  });

  navigateTo(window.location.hash.slice(1) || 'dashboard');
  updateClock();
  if (!clockInterval) clockInterval = setInterval(updateClock, 30000);
  startPolling();
}

// ── Routing ──
const pages = { dashboard: renderDashboard, orders: renderOrders, pos: renderPOS, menu: renderMenuManager, analytics: renderAnalytics, staff: renderStaff, settings: renderSettings };
const titles = { dashboard:'Dashboard', orders:'Order Management', pos:'New Order (POS)', menu:'Menu Manager', analytics:'Analytics', staff:'Staff Management', settings:'Store Settings' };

export function navigateTo(page) {
  if (!pages[page]) page = 'dashboard';
  if (APP.role !== 'admin' && ['menu','analytics','staff','settings'].includes(page)) page = 'dashboard';

  APP.currentPage = page;
  window.location.hash = page;
  document.getElementById('pageTitle').textContent = titles[page];

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));

  // Render
  const container = document.getElementById('pageContainer');
  container.innerHTML = '';
  pages[page](container);

  // Post-render init
  if (page === 'orders') initOrders();
  if (page === 'pos') initPOS();
}

// ── Sidebar toggle (mobile) ──
function initSidebar() {
  document.getElementById('sidebarToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };
  document.querySelectorAll('.nav-item').forEach(n => {
    n.addEventListener('click', e => {
      e.preventDefault();
      const page = n.dataset.page;
      if (page) navigateTo(page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });
}

// ── Realtime subscription (production) ──
function initRealtime() {
  if (!isConfigured()) return;

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel('admin-orders')
    // ── Listen for new orders ──
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async payload => {
      // Wait briefly for order_items to be written (they are inserted in a
      // second query immediately after the order row, so a short delay ensures
      // fetchOrderById returns the complete order with all its items).
      await new Promise(r => setTimeout(r, 800));
      const order = await fetchOrderById(payload.new.id).catch(() => ({ ...payload.new, items: [] }));
      // Only add if not already present (guard against duplicate events)
      if (!APP.orders.find(o => o.id === order.id)) {
        APP.orders.unshift(order);
        toast(`New order #${order.id.slice(-4).toUpperCase()} · Table ${order.table_number}`, 'info');
        if (APP.currentPage === 'orders' || APP.currentPage === 'dashboard') navigateTo(APP.currentPage);
      }
    })
    // ── Listen for order status updates (from admin itself or other terminals) ──
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
      const idx = APP.orders.findIndex(o => o.id === payload.new.id);
      if (idx >= 0) {
        // Merge the updated fields but keep the full items array we already have
        APP.orders[idx] = { ...APP.orders[idx], ...payload.new, items: APP.orders[idx].items };
        if (APP.currentPage === 'orders' || APP.currentPage === 'dashboard') navigateTo(APP.currentPage);
      }
    })
    // ── Listen for order_items inserts so we can attach items to orders that
    //    arrived in APP.orders without items (race-condition safety net) ──
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, async payload => {
      const orderId = payload.new.order_id;
      const existingOrder = APP.orders.find(o => o.id === orderId);
      if (existingOrder && (!existingOrder.items || existingOrder.items.length === 0)) {
        // Re-fetch the full order so items array is populated
        const updated = await fetchOrderById(orderId).catch(() => null);
        if (updated) {
          const idx = APP.orders.findIndex(o => o.id === orderId);
          if (idx >= 0) APP.orders[idx] = updated;
          if (APP.currentPage === 'orders' || APP.currentPage === 'dashboard') navigateTo(APP.currentPage);
        }
      }
    })
    .subscribe();
}

// ── Boot ──
async function checkSession() {
  if (!isConfigured()) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session) {
      APP.user = session.user;
      APP.role = (session.user?.email === 'sharathnaikhelpline@gmail.com' || session.user?.app_metadata?.role !== 'staff') ? 'admin' : 'staff';
      await loadProductionData();
      showApp();
    }
  } catch (err) {
    console.error('Session check failed:', err);
    // Do nothing else, just stay on login screen
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  await checkSession();
  initSidebar();
  initRealtime();
});
