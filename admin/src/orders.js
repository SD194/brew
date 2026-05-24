/**
 * BrewSync Admin — Order Management (Kanban Board)
 */
import { toast } from './main.js';
import { updateOrderStatus } from './api.js';
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';

const STATUS_FLOW = ['pending','confirmed','preparing','ready','served'];
const STATUS_LABELS = { pending:'New Orders',confirmed:'Confirmed',preparing:'Preparing',ready:'Ready',served:'Served' };
const STATUS_DOTS = { pending:'dot-pending',confirmed:'dot-pending',preparing:'dot-preparing',ready:'dot-ready',served:'dot-served' };
const NEXT_ACTION = { pending:'Confirm',confirmed:'Start Prep',preparing:'Mark Ready',ready:'Serve' };

export function renderOrders(container) {
  const orders = window.APP.orders;
  const columns = ['pending','confirmed','preparing','ready','served'];

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--muted)">Live Order Board</span>
      <span style="font-size:12px;color:var(--sub);margin-left:auto">${orders.length} total orders</span>
    </div>
    <div class="kanban" id="kanbanBoard">
      ${columns.map(status => {
        const col = orders.filter(o => o.status === status);
        return `
          <div class="kanban-col" data-status="${status}">
            <div class="kanban-col-head">
              <div class="kanban-col-title"><span class="dot ${STATUS_DOTS[status]}"></span>${STATUS_LABELS[status]}</div>
              <span class="kanban-count">${col.length}</span>
            </div>
            <div class="kanban-col-body">
              ${col.length === 0 ? '<div class="empty-state" style="padding:30px 10px"><div style="font-size:24px;margin-bottom:8px">📭</div><div style="font-size:11px">No orders</div></div>' : ''}
              ${col.sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).map(o => renderKanbanCard(o)).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>

    <!-- Order Detail Modal -->
    <div class="modal-overlay" id="orderModal">
      <div class="modal" id="orderModalContent" style="position:relative"></div>
    </div>
  `;
}

function renderKanbanCard(order) {
  const time = new Date(order.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const items = order.items || [];
  const itemsHtml = items.map(i => {
    const line = `${i.quantity}× ${i.name}`;
    const notes = i.notes || i.customization || '';
    return notes
      ? `<div>${escapeHtml(line)}<div style="font-size:10px;color:var(--muted);margin-top:1px">${escapeHtml(notes)}</div></div>`
      : `<div>${escapeHtml(line)}</div>`;
  }).join('');
  const nextStatus = getNextStatus(order.status);
  const shortId = order.id.slice(-4).toUpperCase();

  return `
    <div class="kanban-card" data-order-id="${escapeAttribute(order.id)}" data-order-action="view">
      <div class="kc-top">
        <span class="kc-id">#${escapeHtml(shortId)}</span>
        <span class="kc-time">${escapeHtml(time)}</span>
      </div>
      <div class="kc-table">Table ${escapeHtml(order.table_number)} · ${order.order_type === 'takeaway' ? 'Takeaway' : 'Dine-in'}</div>
      <div class="kc-items">${itemsHtml}</div>
      <div class="kc-total">
        <span>${formatCurrency(order.total)}</span>
      </div>
      ${order.status !== 'served' ? `
      <div class="kc-actions">
        ${nextStatus ? `<button class="kc-action-btn advance" data-order-id="${escapeAttribute(order.id)}" data-order-action="advance">${escapeHtml(NEXT_ACTION[order.status])} →</button>` : ''}
        ${order.status === 'pending' ? `<button class="kc-action-btn cancel" data-order-id="${escapeAttribute(order.id)}" data-order-action="cancel">✕</button>` : ''}
      </div>` : ''}
    </div>`;
}

function getNextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

export function initOrders() {
  const board = document.getElementById('kanbanBoard');
  board?.addEventListener('click', event => {
    const actionEl = event.target.closest('[data-order-action]');
    if (!actionEl) return;

    const id = actionEl.dataset.orderId || actionEl.closest('[data-order-id]')?.dataset.orderId;
    if (!id) return;

    const action = actionEl.dataset.orderAction;
    if (action === 'advance') {
      event.stopPropagation();
      advanceOrder(id);
      return;
    }
    if (action === 'cancel') {
      event.stopPropagation();
      cancelOrder(id);
      return;
    }
    if (action === 'view') showOrderById(id);
  });
}

async function advanceOrder(id) {
    const order = window.APP.orders.find(o => o.id === id);
    if (!order) return;
    const next = getNextStatus(order.status);
    if (!next) return;

    try {
      const updated = await updateOrderStatus(id, next);
      Object.assign(order, updated, { status: next });
      toast(`Order #${id.slice(-4).toUpperCase()} → ${next.toUpperCase()}`, 'success');
      renderOrders(document.getElementById('pageContainer'));
      initOrders();
    } catch (err) {
      toast(err.message || 'Unable to update order status', 'error');
    }
}

async function cancelOrder(id) {
    const order = window.APP.orders.find(o => o.id === id);
    if (!order) return;
    try {
      await updateOrderStatus(id, 'cancelled');
      order.status = 'cancelled';
      window.APP.orders = window.APP.orders.filter(o => o.id !== id);
      toast(`Order #${id.slice(-4).toUpperCase()} cancelled`, 'error');
      renderOrders(document.getElementById('pageContainer'));
      initOrders();
    } catch (err) {
      toast(err.message || 'Unable to cancel order', 'error');
    }
}

function showOrderById(id) {
  const order = window.APP.orders.find(o => o.id === id);
  if (!order) return;
  showOrderModal(order);
}

function showOrderModal(order) {
  const modal = document.getElementById('orderModal');
  const content = document.getElementById('orderModalContent');
  const time = new Date(order.created_at).toLocaleString('en-IN');
  const shortId = order.id.slice(-4).toUpperCase();

  content.innerHTML = `
    <button class="btn-icon" id="orderModalClose" style="position:absolute;top:16px;right:16px">✕</button>
    <div class="modal-title">Order #${escapeHtml(shortId)}</div>
    <div class="modal-sub">${escapeHtml(time)}</div>

    <div class="detail-row"><span class="detail-label">Table</span><span class="detail-value">${escapeHtml(order.table_number)}</span></div>
    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${order.order_type === 'takeaway' ? 'Takeaway' : 'Dine-in'}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="text-transform:uppercase">${escapeHtml(order.status)}</span></div>
    <div class="detail-row"><span class="detail-label">Customer Email</span><span class="detail-value">${escapeHtml(order.email || 'Walk-in / POS')}</span></div>

    <div style="margin:16px 0;font-weight:700;font-size:13px;color:var(--sub)">ITEMS</div>
    <div class="detail-items">
      ${(order.items||[]).map(i => `
        <div class="detail-item" style="flex-direction:column;align-items:flex-start;gap:2px">
          <div style="display:flex;justify-content:space-between;width:100%">
            <span class="detail-item-name">${escapeHtml(i.emoji||'')} ${escapeHtml(i.name)} <span class="detail-item-qty" style="color:var(--muted)">×${escapeHtml(String(i.quantity))}</span></span>
            <span style="font-weight:600;flex-shrink:0;margin-left:12px">${formatCurrency(i.price * i.quantity)}</span>
          </div>
          ${(i.notes||i.customization) ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">↳ ${escapeHtml(i.notes||i.customization)}</div>` : ''}
        </div>`).join('')}
    </div>

    <div class="detail-row"><span class="detail-label">Subtotal</span><span class="detail-value">${formatCurrency(order.subtotal)}</span></div>
    <div class="detail-row"><span class="detail-label">CGST</span><span class="detail-value">${formatCurrency(order.cgst)}</span></div>
    <div class="detail-row"><span class="detail-label">SGST</span><span class="detail-value">${formatCurrency(order.sgst)}</span></div>
    ${order.discount ? `<div class="detail-row"><span class="detail-label">Discount</span><span class="detail-value" style="color:var(--green)">-${formatCurrency(order.discount)}</span></div>` : ''}
    <div class="detail-row" style="font-weight:700;font-size:15px"><span>Total</span><span>${formatCurrency(order.total)}</span></div>

    <div style="margin-top:16px">
      <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">UPDATE STATUS</label>
      <select class="status-select" id="modalStatusSelect">
        ${STATUS_FLOW.map(s => `<option value="${escapeAttribute(s)}" ${s===order.status?'selected':''}>${escapeHtml(s.toUpperCase())}</option>`).join('')}
      </select>
      <button class="btn-primary btn-full" style="margin-top:10px" id="modalUpdateBtn">Update Status</button>
    </div>
  `;

  modal.classList.add('show');
  modal.onclick = e => { if (e.target === modal) modal.classList.remove('show'); };
  document.getElementById('orderModalClose').onclick = () => modal.classList.remove('show');

  document.getElementById('modalUpdateBtn').onclick = async () => {
    const newStatus = document.getElementById('modalStatusSelect').value;
    try {
      const updated = await updateOrderStatus(order.id, newStatus);
      Object.assign(order, updated, { status: newStatus });
      modal.classList.remove('show');
      toast(`Order #${shortId} → ${newStatus.toUpperCase()}`, 'success');
      renderOrders(document.getElementById('pageContainer'));
      initOrders();
    } catch (err) {
      toast(err.message || 'Unable to update order status', 'error');
    }
  };
}
