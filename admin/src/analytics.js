import { escapeHtml, formatCurrency } from './sanitize.js';

/**
 * BrewSync Admin — Analytics & Reporting
 */
export function renderAnalytics(container) {
  const orders = window.APP.orders;
  const paidOrders   = orders; // all orders are paid by design
  const totalRev     = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder     = orders.length ? Math.round(totalRev / orders.length) : 0;

  // Item popularity
  const itemCounts = {};
  orders.forEach(o => (o.items || []).forEach(i => {
    itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
  }));
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = topItems[0]?.[1] || 1;

  // Category breakdown
  const catCounts = {};
  const { categories, menuItems } = window.APP;
  orders.forEach(o => (o.items || []).forEach(i => {
    const mi = menuItems.find(m => m.id === i.menu_item_id || m.name === i.name);
    const cat = mi ? categories.find(c => c.id === mi.category_id)?.name : 'Other';
    catCounts[cat || 'Other'] = (catCounts[cat || 'Other'] || 0) + i.quantity;
  }));
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;
  const catColors = ['red','blue','green','amber','red','blue','green','amber'];

  // Order status breakdown
  const statusCounts = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  // Payment method breakdown
  const onlineCount = orders.filter(o => o.payment_id && o.payment_id !== 'cash').length;
  const cashCount   = orders.filter(o => o.payment_id === 'cash').length;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon red">💰</div><div><div class="stat-value">${formatCurrency(totalRev)}</div><div class="stat-label">Total Revenue</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">📋</div><div><div class="stat-value">${orders.length}</div><div class="stat-label">Total Orders</div></div></div>
      <div class="stat-card"><div class="stat-icon green">📊</div><div><div class="stat-value">${formatCurrency(avgOrder)}</div><div class="stat-label">Avg Order Value</div></div></div>
      <div class="stat-card"><div class="stat-icon amber">💳</div><div><div class="stat-value">${onlineCount}</div><div class="stat-label">Online Payments</div></div></div>
    </div>

    <div class="analytics-grid">
      <!-- Popular Items -->
      <div class="chart-card">
        <div class="chart-title">🏆 Most Popular Items</div>
        ${topItems.map(([name, count], i) => `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(name.length > 12 ? name.slice(0,12) + '…' : name)}</div>
            <div class="bar-track">
              <div class="bar-fill ${catColors[i % catColors.length]}" style="width:${Math.round(count/maxCount*100)}%">${count}</div>
            </div>
          </div>`).join('')}
        ${!topItems.length ? '<div class="empty-state"><div class="empty-state-text">No order data yet</div></div>' : ''}
      </div>

      <!-- Order Status -->
      <div class="chart-card">
        <div class="chart-title">📊 Order Status</div>
        <div class="top-items-list">
          ${Object.entries(statusCounts).map(([status, count]) => `
            <div class="top-item-row">
              <div class="top-item-rank" style="font-size:14px">${{pending:'🟡',confirmed:'🔵',preparing:'🔵',ready:'🟢',served:'⚫',cancelled:'🔴'}[status]||'⚪'}</div>
              <div class="top-item-name" style="text-transform:capitalize">${escapeHtml(status)}</div>
              <div class="top-item-count">${count}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="analytics-grid" style="margin-top:20px">
      <!-- Category Breakdown -->
      <div class="chart-card">
        <div class="chart-title">🗂️ Sales by Category</div>
        ${catEntries.map(([name, count], i) => `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(name)}</div>
            <div class="bar-track">
              <div class="bar-fill ${catColors[i % catColors.length]}" style="width:${Math.round(count/maxCat*100)}%">${count} items</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Payment Method Breakdown -->
      <div class="chart-card">
        <div class="chart-title">💳 Payment Method</div>
        <div class="top-items-list">
          <div class="top-item-row">
            <div class="top-item-rank" style="background:var(--blue-bg);color:var(--blue)">📱</div>
            <div class="top-item-name">Online (Razorpay)</div>
            <div class="top-item-count">${onlineCount}</div>
          </div>
          <div class="top-item-row">
            <div class="top-item-rank" style="background:var(--green-bg);color:var(--green)">💵</div>
            <div class="top-item-name">Cash</div>
            <div class="top-item-count">${cashCount}</div>
          </div>
        </div>
        <div style="margin-top:20px">
          <div class="bar-row">
            <div class="bar-label">Online</div>
            <div class="bar-track">
              <div class="bar-fill blue" style="width:${Math.round(onlineCount/(onlineCount+cashCount||1)*100)}%">
                ${Math.round(onlineCount/(onlineCount+cashCount||1)*100)}%
              </div>
            </div>
          </div>
          <div class="bar-row">
            <div class="bar-label">Cash</div>
            <div class="bar-track">
              <div class="bar-fill green" style="width:${Math.round(cashCount/(onlineCount+cashCount||1)*100)}%">
                ${Math.round(cashCount/(onlineCount+cashCount||1)*100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
