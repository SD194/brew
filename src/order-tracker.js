/**
 * BrewSync — Order Tracker
 * Full-screen order tracking with step progress, real-time updates, and ETA.
 * Uses Supabase Realtime + a 5-second polling fallback so it always updates
 * even if Realtime hasn't been enabled in the Supabase dashboard yet.
 */
import { subscribeToOrder, updateOrderStatus } from './api.js';
import { supabase, isConfigured } from './supabase.js';
import { escapeHtml, formatCurrency } from './sanitize.js';

const STEPS = [
  { key: 'pending',    label: 'Order Placed',  icon: '📋', desc: 'Your order has been received' },
  { key: 'confirmed',  label: 'Confirmed',     icon: '✅', desc: 'Kitchen has accepted your order' },
  { key: 'preparing',  label: 'Preparing',     icon: '👨‍🍳', desc: 'Your food is being prepared' },
  { key: 'ready',      label: 'Ready',         icon: '🔔', desc: 'Your order is ready for pickup!' },
  { key: 'served',     label: 'Served',        icon: '🎉', desc: 'Enjoy your meal!' }
];

let activeOrders = [];
let subscriptions = {};
let pollIntervals = {};
let currentTrackerOrderId = null;

export function showTracker(order, silent = false) {
  // If order is passed, add it to tracking
  if (order && !activeOrders.find(o => o.id === order.id)) {
    const newOrder = { ...order, status: order.status || 'pending' };
    activeOrders.push(newOrder);
    
    if (order.id && !order.id.startsWith('demo')) {
      subscriptions[order.id] = subscribeToOrder(order.id, (updated) => {
        updateOrder(order.id, updated);
      });
      startPolling(order.id);
    } else {
      simulateProgress(order.id);
    }
  }

  const orderIdToShow = order ? order.id : (currentTrackerOrderId || (activeOrders.length ? activeOrders[activeOrders.length - 1].id : null));
  if (!orderIdToShow) return;

  currentTrackerOrderId = orderIdToShow;
  renderTracker();
  renderFloatingTracker();
  
  if (!silent) {
    document.getElementById('orderTracker').classList.add('show');
  }
}

export function hideTracker() {
  document.getElementById('orderTracker').classList.remove('show');
  currentTrackerOrderId = null;
}

function updateOrder(orderId, updated) {
  const idx = activeOrders.findIndex(o => o.id === orderId);
  if (idx > -1) {
    activeOrders[idx] = { ...activeOrders[idx], ...updated };
    if (activeOrders[idx].status === 'cancelled') {
      // stop polling/sub
      stopTracking(orderId);
    }
    renderFloatingTracker();
    if (currentTrackerOrderId === orderId) {
      renderTracker();
    }
  }
}

function stopTracking(orderId) {
  if (subscriptions[orderId]) {
    subscriptions[orderId].unsubscribe();
    delete subscriptions[orderId];
  }
  if (pollIntervals[orderId]) {
    clearInterval(pollIntervals[orderId]);
    delete pollIntervals[orderId];
  }
}

// ── Polling helpers ──────────────────────────────────────────────────────────

function startPolling(orderId) {
  if (pollIntervals[orderId]) clearInterval(pollIntervals[orderId]);
  pollIntervals[orderId] = setInterval(() => pollOrder(orderId), 5000);
}

function stopPolling() {
  // handled per order in stopTracking
}

async function pollOrder(orderId) {
  const order = activeOrders.find(o => o.id === orderId);
  if (!isConfigured() || !order) return;
  if (order.status === 'served' || order.status === 'cancelled') { stopTracking(orderId); return; }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status, updated_at')
      .eq('id', orderId)
      .single();

    if (error || !data) return;

    if (data.status !== order.status) {
      updateOrder(orderId, data);
    }
  } catch (_) { /* silent — network blip */ }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

function renderFloatingTracker() {
  const floatEl = document.getElementById('activeOrdersFloat');
  // Only show non-cancelled and non-served orders in float
  const ongoing = activeOrders.filter(o => o.status !== 'served' && o.status !== 'cancelled');
  
  if (ongoing.length === 0) {
    floatEl.classList.add('hidden');
    floatEl.innerHTML = '';
    return;
  }
  
  floatEl.classList.remove('hidden');
  floatEl.innerHTML = ongoing.map(o => `
    <div class="active-order-chip ${['ready', 'served'].includes(o.status) ? 'done' : ''}" data-id="${escapeHtml(o.id)}">
      <div class="active-order-id">Order #${escapeHtml((o.id || '').slice(0, 8).toUpperCase())}</div>
      <div class="active-order-status">${escapeHtml(STEPS.find(s => s.key === o.status)?.label || o.status)}</div>
    </div>
  `).join('');

  floatEl.querySelectorAll('.active-order-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const order = activeOrders.find(o => o.id === chip.dataset.id);
      if (order) showTracker(order);
    });
  });
}

function renderTracker() {
  const content = document.getElementById('trackerContent');
  const currentOrder = activeOrders.find(o => o.id === currentTrackerOrderId);
  
  if (!currentOrder) return;

  const currentIdx = STEPS.findIndex(s => s.key === currentOrder.status);
  const eta = getETA(currentOrder.status);
  const isCancelled = currentOrder.status === 'cancelled';

  let stepsHtml = '';
  if (isCancelled) {
    stepsHtml = `
      <div class="tracker-step active done">
        <div class="tracker-step-line-wrap"><div class="tracker-step-dot" style="background:var(--brand);color:#fff">❌</div></div>
        <div class="tracker-step-info">
          <div class="tracker-step-label" style="color:var(--brand)">Order Cancelled</div>
          <div class="tracker-step-desc">This order has been cancelled.</div>
        </div>
      </div>`;
  } else {
    stepsHtml = STEPS.map((step, i) => {
      const done   = i <= currentIdx;
      const active = i === currentIdx;
      const isLast = i === STEPS.length - 1;
      return `
        <div class="tracker-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
          <div class="tracker-step-line-wrap">
            <div class="tracker-step-dot">${done ? step.icon : '○'}</div>
            ${!isLast ? `<div class="tracker-step-line ${i < currentIdx ? 'filled' : ''}"></div>` : ''}
          </div>
          <div class="tracker-step-info">
            <div class="tracker-step-label">${step.label}</div>
            <div class="tracker-step-desc">${active ? step.desc : (done ? 'Completed' : 'Pending')}</div>
          </div>
        </div>`;
    }).join('');
  }

  content.innerHTML = `
    <div class="tracker-header-card">
      <div class="tracker-order-id">Order #${escapeHtml((currentOrder.id || '').slice(0, 8).toUpperCase())}</div>
      <div class="tracker-table">Table ${escapeHtml(currentOrder.table_number || 4)}</div>
    </div>

    ${eta && !isCancelled ? `<div class="tracker-eta">
      <div class="tracker-eta-icon">⏱️</div>
      <div>
        <div class="tracker-eta-label">Estimated Time</div>
        <div class="tracker-eta-time">${escapeHtml(eta)}</div>
      </div>
    </div>` : ''}

    <div class="tracker-steps">
      ${stepsHtml}
    </div>

    ${currentOrder.status === 'served' ? `
      <div class="tracker-done-msg">
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <div style="font-weight:700;font-size:18px">Bon Appétit!</div>
        <div style="color:var(--sub);font-size:13px;margin-top:4px">We hope you enjoy your meal</div>
      </div>` : ''}

    <div class="tracker-summary">
      <div class="bill-row"><span>Items</span><span>${escapeHtml(currentOrder.items?.length || '—')} items</span></div>
      <div class="bill-row total"><span>Total</span><span>${formatCurrency(currentOrder.total || 0)}</span></div>
    </div>
    
    ${currentOrder.status === 'pending' ? `
      <button class="cancel-order-btn" id="cancelOrderBtn" data-id="${escapeHtml(currentOrder.id)}">Cancel Order</button>
    ` : ''}`;

  const cancelBtn = document.getElementById('cancelOrderBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Cancelling...';
      try {
        await updateOrderStatus(currentOrder.id, 'cancelled');
        updateOrder(currentOrder.id, { status: 'cancelled' });
      } catch (err) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Cancel Order';
      }
    });
  }
}

function getETA(status) {
  const etas = { pending: '12-15 min', confirmed: '10-12 min', preparing: '5-8 min', ready: 'Ready now!', served: null };
  return etas[status] || '10-15 min';
}

// Demo mode: auto-advance status every 4 s
function simulateProgress(orderId) {
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
  let idx = 0;
  pollIntervals[orderId] = setInterval(() => {
    idx++;
    if (idx >= statuses.length) { stopTracking(orderId); return; }
    updateOrder(orderId, { status: statuses[idx] });
  }, 4000);
}
