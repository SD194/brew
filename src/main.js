/**
 * BrewSync — Main Application Entry Point
 */
import { fetchBanners, fetchCategories, fetchMenuItems, fetchCoupons, validateCoupon, createOrder, fetchActiveOrdersForUser, fetchStoreSettings } from './api.js';
import * as Cart from './cart.js';
import * as UI from './ui.js';
import { supabase, isConfigured } from './supabase.js';
import { showSkeletons, showToast } from './animations.js';
import { showTracker, hideTracker } from './order-tracker.js';
import { appConfig } from './config.js';
import { initSession, currentTable, clearSession, currentUser } from './session.js';
import { logError } from './logger.js';
import { hasCompletedCheckoutStep, openGuestCheckout, setupAuthListeners, getOrderEmail } from './auth.js';

let TABLE_NUMBER = 1;
let categories = [];
let menuItems = [];
let coupons = [];
let vegOnly = false;
let orderType = 'dine_in';

// ── INIT ──
async function init() {
  try {
    // Show skeletons while loading
    showSkeletons();

    // Show connection status
    const statusEl = document.getElementById('connStatus');
    if (isConfigured()) {
      statusEl.textContent = '● Live';
      statusEl.style.color = 'var(--green)';
    } else {
      statusEl.textContent = '● Demo Mode';
      statusEl.style.color = '#f5a623';
    }

    // Init Session and Hydrate Cart
    const initialCart = await initSession();
    if (initialCart) Cart.hydrate(initialCart);
    TABLE_NUMBER = currentTable;

    // Update table number display
    document.getElementById('tableNum').textContent = `Table ${TABLE_NUMBER} · Dine In`;

    // Restore active session orders
    if (currentUser) {
      const activeOrders = await fetchActiveOrdersForUser(currentUser.id);
      activeOrders.forEach(o => showTracker(o, true));
    }

    // Fetch all data
    const [bannerData, catData, itemData, couponData, storeSettings] = await Promise.all([
      fetchBanners(), fetchCategories(), fetchMenuItems(), fetchCoupons(), fetchStoreSettings()
    ]);
    categories = catData;
    menuItems = itemData;
    coupons = couponData;
    
    // Apply initial online/offline status
    handleStoreOnlineStatus(storeSettings.is_online);

    // Setup realtime listener for store settings
    if (isConfigured()) {
      supabase.channel('store-settings-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, payload => {
          handleStoreOnlineStatus(payload.new.is_online);
        })
        .subscribe();
    }

    // Render everything
    UI.renderBanners(bannerData);
    UI.renderCategoryGrid(categories);
    UI.renderMenuSections(categories, menuItems, vegOnly);
    UI.renderMenuNav(categories);
    UI.renderCoupons(coupons);
    UI.setupSearch(categories, menuItems);

    // Subscribe cart changes
    Cart.subscribe(() => {
      UI.updateCartBar();
      UI.renderMenuSections(categories, menuItems, vegOnly);
      if (document.getElementById('cartSheet').classList.contains('show')) {
        UI.renderCartSheet();
      }
    });
    UI.updateCartBar();

    setupEventListeners();
    
    // Setup Auth Listeners with callback to resume payment
    setupAuthListeners(() => {
      handlePayment();
    });
    
  } catch (err) {
    logError('Customer app initialization failed:', err);
    showToast('Unable to load the menu. Please refresh and try again.', 'error');
  }
}

function handleStoreOnlineStatus(isOnline) {
  if (!isOnline) {
    document.body.classList.add('store-offline');
    document.getElementById('offlineOverlay').classList.add('show');
    // Clear cart and close sheets to prevent checking out
    Cart.clear();
    UI.closeAllSheets();
  } else {
    document.body.classList.remove('store-offline');
    document.getElementById('offlineOverlay').classList.remove('show');
  }
}

function setupEventListeners() {
  // Veg toggle
  document.getElementById('vegToggle')?.addEventListener('click', () => {
    vegOnly = !vegOnly;
    document.getElementById('vegToggle')?.classList.toggle('on', vegOnly);
    UI.renderMenuSections(categories, menuItems, vegOnly);
  });

  // Dine In / Takeout Toggle
  // ── LOGOUT BUTTON ──
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.textContent = 'Logging out...';
      logoutBtn.style.opacity = '0.5';
      await clearSession();
    });
  }

  const orderTypeBadge = document.getElementById('orderTypeBadge');
  const orderTypeLabel = document.getElementById('orderTypeLabel');
  const orderTypeMenu = document.getElementById('orderTypeMenu');
  const tableNum = document.getElementById('tableNum');
  
  if (orderTypeBadge && orderTypeMenu) {
    orderTypeBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      orderTypeMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const val = e.target.getAttribute('data-val');
        
        // Update active class
        document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        e.target.classList.add('active');
        
        orderType = val;
        if (orderType === 'takeaway') {
          orderTypeLabel.textContent = 'Takeaway';
          tableNum.textContent = `Table ${TABLE_NUMBER} · Takeaway`;
        } else {
          orderTypeLabel.textContent = 'Dine In';
          tableNum.textContent = `Table ${TABLE_NUMBER} · Dine In`;
        }
        orderTypeMenu.classList.add('hidden');
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!orderTypeMenu.contains(e.target) && !orderTypeBadge.contains(e.target)) {
        orderTypeMenu.classList.add('hidden');
      }
    });
  }

  // Search icon scroll
  document.querySelector('.search-icon')?.addEventListener('click', () => {
    document.getElementById('searchSticky').classList.toggle('open');
    if(document.getElementById('searchSticky').classList.contains('open')) {
      document.getElementById('searchInput').focus();
    }
  });

  // Float menu
  document.getElementById('floatMenu').addEventListener('click', () => UI.openSheet('menuNavSheet'));

  // Cart bar & Header Cart → open cart
  const openCartFn = () => {
    UI.renderCartSheet();
    UI.openSheet('cartSheet');
  };
  document.getElementById('cartBar').addEventListener('click', openCartFn);
  const headerCartBtn = document.getElementById('headerCartBtn');
  if (headerCartBtn) {
    headerCartBtn.addEventListener('click', openCartFn);
  }

  // Overlay close
  document.getElementById('overlayBg').addEventListener('click', () => UI.closeAllSheets());

  // Close buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => UI.closeAllSheets());
  });

  document.getElementById('cartBackBtn').addEventListener('click', () => {
    UI.closeAllSheets();
  });

  // Coupon page
  document.getElementById('couponRowBtn').addEventListener('click', () => {
    document.getElementById('couponPage').classList.add('show');
  });
  document.getElementById('couponBack').addEventListener('click', () => {
    document.getElementById('couponPage').classList.remove('show');
    document.getElementById('overlayBg').classList.add('show');
  });

  // Apply coupon
  document.getElementById('applyCouponBtn').addEventListener('click', async () => {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    const msg = document.getElementById('couponMsg');
    const coupon = await validateCoupon(code);
    if (coupon) {
      Cart.setCoupon(coupon);
      msg.style.color = 'var(--green)';
      msg.textContent = `✓ Coupon "${code}" applied!`;
      setTimeout(() => {
        document.getElementById('couponPage').classList.remove('show');
        UI.renderCartSheet();
      }, 800);
    } else {
      msg.style.color = 'var(--brand)';
      msg.textContent = 'Invalid or expired coupon code.';
    }
  });

  // Pay button
  document.getElementById('payBtn').addEventListener('click', handlePayment);

  // Order tracker close
  document.getElementById('trackerBack').addEventListener('click', () => hideTracker());
}

// ── Razorpay helper ──
function openRazorpay(amount, description, onSuccess, onCancel) {
  if (!window.Razorpay) {
    onCancel();
    showToast('Payment system offline. Please use Demo Mode.', 'error');
    return;
  }
  try {
    new window.Razorpay({
      key: appConfig.razorpayKeyId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'BrewSync Café',
      description,
      theme: { color: '#c8783c' },
      handler(response) {
        onSuccess(response.razorpay_payment_id);
      },
      modal: { ondismiss: onCancel }
    }).open();
  } catch (err) {
    console.error('Razorpay Init Error:', err);
    onCancel();
    showToast(`Payment failed: ${err.message || 'Unknown error'}`, 'error');
  }
}

async function handlePayment() {
  const summary = Cart.getCartSummary();
  if (summary.count === 0) return;

  // GUEST CHECKOUT CHECK
  if (!hasCompletedCheckoutStep()) {
    UI.closeAllSheets();
    openGuestCheckout();
    return;
  }

  const payBtn = document.getElementById('payBtn');

  function resetBtn() {
    payBtn.disabled = false;
    payBtn.innerHTML = `<span id="payBtnTotal">₹${summary.total}</span><span>PLACE ORDER →</span>`;
  }

  payBtn.disabled = true;
  payBtn.innerHTML = `<span>Opening payment…</span><span class="spinner"></span>`;

  const coupon = Cart.getCoupon();
  const baseOrder = {
    user_id: currentUser?.id || null,
    table_number: TABLE_NUMBER,
    order_type: orderType,
    status: 'pending',
    subtotal: summary.subtotal,
    discount: summary.discount,
    coupon_code: coupon?.code || null,
    cgst: summary.cgst,
    sgst: summary.sgst,
    total: summary.total,
    email: getOrderEmail(), // Store the guest email
    items: summary.items.map(([id, item]) => ({
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      notes: item.notes || null
    }))
  };

  // Simulated Payment in Demo Mode (when keys/Supabase are offline)
  if (!isConfigured()) {
    setTimeout(async () => {
      try {
        const order = await createOrder({
          ...baseOrder,
          payment_id: 'demo_pay_' + Date.now()
        });
        UI.closeAllSheets();
        Cart.clearCart();
        resetBtn();
        showTracker({ ...order, ...baseOrder });
      } catch (err) {
        resetBtn();
        showToast('Order failed. Please try again.', 'error');
        logError('Order placement failed:', err);
      }
    }, 1500);
    return;
  }

  openRazorpay(
    summary.total,
    `Table ${TABLE_NUMBER} · ${summary.count} item${summary.count > 1 ? 's' : ''}`,
    async (paymentId) => {
      // Payment succeeded → now write the order to the DB
      payBtn.innerHTML = `<span>Placing order…</span><span class="spinner"></span>`;
      try {
        const order = await createOrder({
          ...baseOrder,
          payment_id: paymentId
        });
        UI.closeAllSheets();
        Cart.clearCart();
        resetBtn();
        showTracker({ ...order, ...baseOrder });
      } catch (err) {
        resetBtn();
        showToast('Order failed. Please try again.', 'error');
        logError('Order placement failed:', err);
      }
    },
    resetBtn
  );
}

init();
