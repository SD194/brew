/**
 * BrewSync Admin — Dashboard Overview
 */
import { navigateTo } from './main.js';
import { escapeHtml, formatCurrency } from './sanitize.js';

export function renderDashboard(container) {
  const orders = window.APP.orders;
  const pending = orders.filter(o => o.status === 'pending').length;
  const preparing = orders.filter(o => o.status === 'preparing').length;
  const ready = orders.filter(o => o.status === 'ready').length;
  const todayRevenue = orders.reduce((s, o) => s + o.total, 0);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon amber">🔔</div>
        <div><div class="stat-value">${pending}</div><div class="stat-label">Pending Orders</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">👨‍🍳</div>
        <div><div class="stat-value">${preparing}</div><div class="stat-label">Being Prepared</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div><div class="stat-value">${ready}</div><div class="stat-label">Ready to Serve</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">💰</div>
        <div><div class="stat-value">${formatCurrency(todayRevenue)}</div><div class="stat-label">Today's Revenue</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- Recent Orders -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Orders</span>
          <button class="btn-ghost btn-sm" id="viewAllOrders">View All →</button>
        </div>
        <div id="recentOrdersList"></div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header"><span class="card-title">Quick Actions</span></div>
        <div style="display:grid;gap:10px">
          <button class="btn-primary btn-full" id="quickPOS" style="padding:16px;font-size:15px">
            🧾  Create New Order (POS)
          </button>
          <button class="btn-ghost btn-full" id="quickOrders" style="padding:14px">
            📋  View Order Board
          </button>
          ${window.APP.role === 'admin' ? `
          <button class="btn-ghost btn-full" id="quickAnalytics" style="padding:14px">
            📊  View Analytics
          </button>
          <button class="btn-ghost btn-full" id="quickMenu" style="padding:14px">
            🍽️  Manage Menu
          </button>` : ''}
        </div>
      </div>
    </div>
  `;

  // Recent orders list
  const recentEl = document.getElementById('recentOrdersList');
  const recent = [...orders].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0, 6);
  if (!recent.length) {
    recentEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No orders yet</div></div>';
  } else {
    recentEl.innerHTML = recent.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
      const statusColors = { pending:'amber',confirmed:'blue',preparing:'blue',ready:'green',served:'muted',cancelled:'red' };
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:600">#${escapeHtml(o.id.slice(-4).toUpperCase())} · Table ${escapeHtml(o.table_number)}</div>
            <div style="font-size:11px;color:var(--muted)">${escapeHtml(time)} · ${escapeHtml(o.items?.length || '?')} items</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700">${formatCurrency(o.total)}</div>
            <div style="font-size:10px;color:var(--${statusColors[o.status] || 'muted'});font-weight:600;text-transform:uppercase">${escapeHtml(o.status)}</div>
          </div>
        </div>`;
    }).join('');
  }

  // Quick action handlers
  document.getElementById('viewAllOrders')?.addEventListener('click', () => navigateTo('orders'));
  document.getElementById('quickPOS')?.addEventListener('click', () => navigateTo('pos'));
  document.getElementById('quickOrders')?.addEventListener('click', () => navigateTo('orders'));
  document.getElementById('quickAnalytics')?.addEventListener('click', () => navigateTo('analytics'));
  document.getElementById('quickMenu')?.addEventListener('click', () => navigateTo('menu'));
}
