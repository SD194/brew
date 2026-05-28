/**
 * BrewSync Admin — Point of Sale (Manual Order Entry)
 * Payment methods: Cash (instant) or Online via Razorpay.
 * Order is only written to the DB after payment is confirmed.
 */
import { toast, navigateTo } from './main.js';
import { createAdminOrder, updateOrderStatus, validateCoupon } from './api.js';
import { adminConfig } from './config.js';
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';
import { openPOSCustomizer } from './pos-customizer.js';
import { supabase } from './supabase.js';

let posCart = [];
let appliedCoupon = null;
let activeCat = 'all';

async function syncPOSCart() {
  if (!window.APP || !window.APP.user) return;
  await supabase.from('cart_sessions').upsert({
    user_id: window.APP.user.id,
    table_number: 99,
    cart_data: posCart
  }, { onConflict: 'user_id' }).catch(() => {});
}

// ── Razorpay helper ──────────────────────────────────────────────────────────
function openRazorpay(amount, tableNumber, onSuccess, onCancel) {
  if (!window.Razorpay) {
    onCancel();
    toast('Payment system offline. Please use Cash.', 'error');
    return;
  }
  try {
    new window.Razorpay({
      key: adminConfig.razorpayKeyId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'BrewSync Café',
      description: `POS Order · Table ${tableNumber}`,
      theme: { color: '#c8783c' },
      handler(response) {
        onSuccess(response.razorpay_payment_id);
      },
      modal: { ondismiss: onCancel }
    }).open();
  } catch (err) {
    console.error('Razorpay POS Error:', err);
    onCancel();
    toast(`Payment failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
export function renderPOS(container) {
  const { categories } = window.APP;

  container.innerHTML = `
    <div class="pos-layout">
      <!-- LEFT: Menu items -->
      <div class="pos-menu">
        <div class="pos-cats">
          <button class="pos-cat-btn ${activeCat === 'all' ? 'active' : ''}" data-cat="all">All</button>
          ${categories.map(c => `<button class="pos-cat-btn ${activeCat === c.id ? 'active' : ''}" data-cat="${escapeAttribute(c.id)}">${escapeHtml(c.name)}</button>`).join('')}
        </div>
        <div class="pos-items-grid" id="posItemsGrid"></div>
      </div>

      <!-- RIGHT: Cart / Bill -->
      <div class="pos-cart">
        <div class="pos-cart-header">
          <span>🧾 Current Order</span>
          <button class="btn-ghost btn-sm" id="posClearCart">Clear</button>
        </div>
        <div class="pos-cart-body" id="posCartBody"></div>
        <div class="pos-cart-footer" id="posCartFooter"></div>
      </div>
    </div>
  `;

  renderPOSItems();
  renderPOSCart();
}

function renderPOSItems() {
  const grid = document.getElementById('posItemsGrid');
  if (!grid) return;
  const { menuItems } = window.APP;
  const filtered = activeCat === 'all' ? menuItems : menuItems.filter(i => i.category_id === activeCat);
  const available = filtered.filter(i => i.is_available !== false);

  grid.innerHTML = available.map(item => {
    const inCartCount = posCart.filter(c => c.id === item.id).reduce((s, c) => s + c.qty, 0);
    return `
      <div class="pos-item-card ${inCartCount > 0 ? 'in-cart' : ''}" data-id="${escapeAttribute(item.id)}">
        <div class="pos-item-emoji">
          ${item.image_url 
            ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}" loading="lazy"/>`
            : escapeHtml(item.emoji || '🍽️')}
        </div>
        <div class="pos-item-name">${escapeHtml(item.name)}</div>
        <div class="pos-item-price">${formatCurrency(item.price)}</div>
        ${inCartCount > 0 ? `<div style="font-size:11px;color:var(--green);font-weight:600;margin-top:4px">×${inCartCount} in cart</div>` : ''}
      </div>`;
  }).join('');
}

function renderPOSCart() {
  const body   = document.getElementById('posCartBody');
  const footer = document.getElementById('posCartFooter');
  if (!body || !footer) return;

  if (!posCart.length) {
    body.innerHTML = '<div class="pos-cart-empty">🛒<br>Tap menu items to add them to the order</div>';
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = posCart.map(item => `
    <div class="pos-cart-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="pos-cart-item-info">
          <div class="pos-cart-item-name">${escapeHtml(item.emoji)} ${escapeHtml(item.name)}</div>
          <div class="pos-cart-item-price">${formatCurrency(item.price)} each</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="pos-qty">
            <button data-cartid="${escapeAttribute(item.cartId)}" data-action="dec">−</button>
            <span>${item.qty}</span>
            <button data-cartid="${escapeAttribute(item.cartId)}" data-action="inc">+</button>
          </div>
          <div style="font-weight:700;font-size:13px;width:60px;text-align:right">${formatCurrency(item.price * item.qty)}</div>
        </div>
      </div>
      ${item.notes ? `<div style="font-size:11px;color:var(--muted);background:var(--bg-secondary);padding:6px;border-radius:4px;">${escapeHtml(item.notes)}</div>` : ''}
    </div>`).join('');

  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = Math.round(subtotal * (appliedCoupon.value / 100));
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const cgst     = Math.round(taxable * 0.025);
  const sgst     = Math.round(taxable * 0.025);
  const total    = taxable + cgst + sgst;

  footer.innerHTML = `
    <div class="pos-meta-wrapper" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
      <div style="display: flex; gap: 8px;">
        <select id="posOrderType" style="flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 12px;">
          <option value="dine_in">🍽️ Dine In</option>
          <option value="takeaway">📦 Takeaway</option>
        </select>
        <input type="number" id="posTable" placeholder="Table #" min="1" max="20" value="1" style="flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 12px;"/>
      </div>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="posCouponCode" placeholder="Coupon Code" style="flex: 1; padding: 8px; background: var(--bg3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; font-size: 13px;" value="${escapeAttribute(appliedCoupon ? appliedCoupon.code : '')}"/>
        <button id="posApplyCoupon" class="btn-ghost btn-sm">Apply</button>
      </div>
      ${appliedCoupon ? `<div style="font-size:11px;color:var(--green);">Applied: ${escapeHtml(appliedCoupon.code)} - ${appliedCoupon.type === 'percent' ? appliedCoupon.value + '%' : '₹' + appliedCoupon.value} off</div>` : ''}
    </div>
    <div class="pos-bill-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    ${discountAmount > 0 ? `<div class="pos-bill-row" style="color:var(--green)"><span>Discount</span><span>-${formatCurrency(discountAmount)}</span></div>` : ''}
    <div class="pos-bill-row"><span>CGST (2.5%)</span><span>${formatCurrency(cgst)}</span></div>
    <div class="pos-bill-row"><span>SGST (2.5%)</span><span>${formatCurrency(sgst)}</span></div>
    <div class="pos-bill-row total"><span>Total</span><span>${formatCurrency(total)}</span></div>

    <!-- Payment method selection -->
    <div style="margin:12px 0 8px;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Payment Method</div>
    <div class="pos-meta" style="margin-bottom:12px">
      <button class="pos-pay-btn active" id="posCash" data-method="cash">
        💵 Cash
      </button>
      <button class="pos-pay-btn" id="posOnline" data-method="online">
        💳 Online (Razorpay)
      </button>
    </div>

    <button class="btn-primary btn-full" id="posPlaceOrder" style="font-size:14px;padding:14px">
      Place Order →
    </button>
  `;
}

// ── Init & event wiring ──────────────────────────────────────────────────────
export async function initPOS() {
  if (window.APP && window.APP.user) {
    const { data } = await supabase.from('cart_sessions').select('cart_data').eq('user_id', window.APP.user.id).single();
    if (data && Array.isArray(data.cart_data)) {
      posCart = data.cart_data;
      renderPOSCart();
      bindPOSCartActions();
    }
  }

  document.querySelectorAll('.pos-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === activeCat));
      renderPOSItems();
      bindPOSItemClicks();
    });
  });

  bindPOSItemClicks();
  bindPOSCartActions();

  document.getElementById('posClearCart')?.addEventListener('click', () => {
    posCart = [];
    appliedCoupon = null;
    syncPOSCart();
    renderPOSItems();
    renderPOSCart();
    bindPOSItemClicks();
    bindPOSCartActions();
  });
}

function bindPOSItemClicks() {
  document.querySelectorAll('.pos-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id   = card.dataset.id;
      const item = window.APP.menuItems.find(i => i.id === id);
      if (!item) return;

      if (item.is_customizable) {
        const cat = window.APP.categories.find(c => c.id === item.category_id);
        openPOSCustomizer(item, cat ? cat.slug : 'default', (itm, price, notes) => {
          addToCart(itm.id, itm.name, price, itm.emoji, notes);
        });
      } else {
        addToCart(item.id, item.name, item.price, item.emoji, '');
      }
    });
  });
}

function addToCart(id, name, price, emoji, notes) {
  const cartId = id + (notes ? '|' + notes : '');
  const existing = posCart.find(c => c.cartId === cartId);
  if (existing) {
    existing.qty++;
  } else {
    posCart.push({ id, cartId, name, price, emoji: emoji || '🍽️', qty: 1, notes });
  }
  syncPOSCart();
  renderPOSItems();
  renderPOSCart();
  bindPOSItemClicks();
  bindPOSCartActions();
}

function bindPOSCartActions() {
  document.querySelectorAll('.pos-qty button').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const cartId = btn.dataset.cartid;
      const action = btn.dataset.action;
      const item   = posCart.find(c => c.cartId === cartId);
      if (!item) return;

      if (action === 'inc') item.qty++;
      if (action === 'dec') { item.qty--; if (item.qty <= 0) posCart = posCart.filter(c => c.cartId !== cartId); }

      syncPOSCart();
      renderPOSItems();
      renderPOSCart();
      bindPOSItemClicks();
      bindPOSCartActions();
    });
  });

  // Payment method toggle
  document.querySelectorAll('.pos-pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-pay-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('posApplyCoupon')?.addEventListener('click', async () => {
    const code = document.getElementById('posCouponCode').value.trim();
    if (!code) {
      appliedCoupon = null;
      renderPOSCart();
      bindPOSCartActions();
      return;
    }
    const btn = document.getElementById('posApplyCoupon');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
      const coupon = await validateCoupon(code, subtotal);
      appliedCoupon = coupon;
      toast('Coupon applied!', 'success');
    } catch (err) {
      appliedCoupon = null;
      toast(err.message, 'error');
    } finally {
      renderPOSCart();
      bindPOSCartActions();
    }
  });

  document.getElementById('posPlaceOrder')?.addEventListener('click', placePOSOrder);
}

// ── Order placement ──────────────────────────────────────────────────────────
async function placePOSOrder() {
  if (!posCart.length) { toast('Add items to the order first', 'error'); return; }

  const orderType    = document.getElementById('posOrderType')?.value || 'dine_in';
  const table        = parseInt(document.getElementById('posTable')?.value) || 1;
  const activeMethod = document.querySelector('.pos-pay-btn.active')?.dataset.method || 'cash';

  const subtotal = posCart.reduce((s, i) => s + i.price * i.qty, 0);
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = Math.round(subtotal * (appliedCoupon.value / 100));
    } else {
      discountAmount = appliedCoupon.value;
    }
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const cgst     = Math.round(taxable * 0.025);
  const sgst     = Math.round(taxable * 0.025);
  const total    = taxable + cgst + sgst;

  const baseOrder = {
    table_number: table,
    order_type: orderType,
    status: 'pending',   // RLS only allows 'pending' on INSERT; we upgrade to 'confirmed' below
    subtotal, discount: discountAmount, coupon_code: appliedCoupon ? appliedCoupon.code : null, cgst, sgst, total,
    items: posCart.map(i => ({ menu_item_id: i.id, name: i.name, price: i.price, quantity: i.qty, emoji: i.emoji, notes: i.notes || null }))
  };

  const placeBtn = document.getElementById('posPlaceOrder');

  async function submitOrder(paymentId, paymentStatus) {
    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing…';
    try {
      const savedOrder = await createAdminOrder({
        ...baseOrder,
        payment_id: paymentId
      });
      // Immediately upgrade from 'pending' to 'confirmed' using the staff UPDATE policy
      await updateOrderStatus(savedOrder.id, 'confirmed');
      savedOrder.status = 'confirmed';
      window.APP.orders.unshift(savedOrder);
      posCart = [];
      appliedCoupon = null;
      toast(`Order placed! Table ${table} · ${formatCurrency(total)}`, 'success');
      navigateTo('orders');
    } catch (err) {
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order →';
      toast(err.message || 'Unable to place order', 'error');
    }
  }

  if (activeMethod === 'cash') {
    // Cash — place immediately, mark as paid
    await submitOrder('cash', 'paid');
  } else {
    // Online — open Razorpay, only place after payment succeeds
    placeBtn.disabled = true;
    placeBtn.textContent = 'Opening payment…';

    openRazorpay(
      total,
      table,
      async (paymentId) => {
        await submitOrder(paymentId, 'paid');
      },
      () => {
        // User closed Razorpay without paying
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order →';
        toast('Payment cancelled', 'error');
      }
    );
  }
}
