/**
 * BrewSync — UI Renderer
 * Renders all dynamic sections of the page from data.
 */
import * as Cart from './cart.js';
import { flyToCart, addRipple, setupScrollReveal, showToast } from './animations.js';
import { openCustomizer } from './customizer.js';
import { getSuggestions, renderSuggestionRow, renderCouponNudge } from './suggestions.js';
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';

// Store refs for suggestions
let _categories = [];
let _menuItems = [];

// ── BANNERS ──
export function renderBanners(banners) {
  const track = document.getElementById('bannerTrack');
  const dots = document.getElementById('bannerDots');
  if (!banners?.length) {
    track.innerHTML = '';
    dots.innerHTML = '';
    return;
  }
  track.innerHTML = banners.map(b => `
    <div class="banner-slide">
      <img src="${escapeAttribute(b.image_url)}" alt="${escapeAttribute(b.title)}" loading="lazy"/>
      <div class="overlay">
        <span class="tag">${escapeHtml(b.tag)}</span>
        <h2>${escapeHtml(b.title)}</h2>
        <p>${escapeHtml(b.subtitle)}</p>
      </div>
    </div>`).join('');
  dots.innerHTML = banners.map((_, i) => `
    <div class="banner-dot${i === 0 ? ' active' : ''}" data-slide="${i}"></div>`).join('');

  let slide = 0;
  const go = (n) => {
    slide = n;
    track.style.transform = `translateX(-${n * 100}%)`;
    dots.querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === n));
  };
  dots.addEventListener('click', e => {
    const idx = e.target.dataset.slide;
    if (idx !== undefined) go(+idx);
  });
  if (banners.length > 1) setInterval(() => go((slide + 1) % banners.length), 3500);
}

// ── CATEGORY GRID ──
export function renderCategoryGrid(categories) {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = categories.map(c => {
    const hasImg = c.image_url;
    return `<div class="cat-card${hasImg ? '' : ' plain'}" data-cat="${escapeAttribute(c.slug)}">
      ${hasImg ? `<img src="${escapeAttribute(c.image_url)}" alt="${escapeAttribute(c.name)}" loading="lazy"/>` : ''}
      <div class="cat-name">${escapeHtml(c.name)}</div>
    </div>`;
  }).join('');
  grid.addEventListener('click', e => {
    const card = e.target.closest('.cat-card');
    if (card) {
      const slug = card.dataset.cat;
      const el = document.getElementById(slug);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

// ── MENU SECTIONS ──
export function renderMenuSections(categories, menuItems, vegOnly) {
  _categories = categories;
  _menuItems = menuItems;
  const container = document.getElementById('menuSections');
  container.innerHTML = categories.map(cat => {
    let items = menuItems.filter(m => m.category_id === cat.id);
    if (vegOnly) items = items.filter(m => m.is_veg);
    if (items.length === 0 && vegOnly) return '';

    return `
    <div class="cat-section" id="${escapeAttribute(cat.slug)}">
      <div class="cat-banner-wrap">
        <img class="cat-banner" src="${escapeAttribute(cat.banner_url)}" alt="${escapeAttribute(cat.name)}" loading="lazy"/>
        <div class="cat-banner-title">${escapeHtml(cat.name)}</div>
      </div>
      ${items.map(item => renderItemCard(item, cat.slug)).join('')}
    </div>`;
  }).join('');

  attachMenuListeners(container, categories);
  setupScrollReveal();
}

function renderItemCard(item, catSlug) {
  const cart = Cart.getCart();
  const inCart = cart[item.id];
  const dotClass = item.is_veg ? 'veg-dot' : 'nonveg-dot';
  const imgBlock = item.image_url
    ? `<img class="item-img" src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}" loading="lazy"/>`
    : `<div class="item-img-placeholder">${escapeHtml(item.emoji || '🍽️')}</div>`;

  let addBlock;
  if (inCart && inCart.qty > 0) {
    addBlock = `<div class="qty-control">
        <button class="qty-btn" data-id="${escapeAttribute(item.id)}" data-delta="-1">−</button>
        <span class="qty-num">${inCart.qty}</span>
        <button class="qty-btn" data-id="${escapeAttribute(item.id)}" data-delta="1">+</button>
      </div>`;
  } else if (item.is_customizable) {
    addBlock = `<button class="add-btn customizable-btn" data-id="${escapeAttribute(item.id)}" data-cat="${escapeAttribute(catSlug)}">ADD</button>
       <div class="customizable">customizable</div>`;
  } else {
    addBlock = `<button class="add-btn quick-add-btn" data-id="${escapeAttribute(item.id)}" data-name="${escapeAttribute(item.name)}" data-price="${escapeAttribute(item.price)}">
        <span class="add-btn-text">ADD</span>
        <span class="add-btn-plus">+</span>
      </button>`;
  }

  return `
  <div class="item-card${item.is_featured ? ' featured' : ''}" data-item-id="${escapeAttribute(item.id)}">
    ${item.is_featured ? '<div class="top-badge">TOP ITEM</div>' : ''}
    <div class="${dotClass}" ${item.is_featured ? 'style="margin-top:18px"' : ''}></div>
    <div class="item-info" ${item.is_featured ? 'style="margin-top:10px"' : ''}>
      <div class="item-name">${escapeHtml(item.name)}</div>
      <div class="item-price">${formatCurrency(item.price)}</div>
      <div class="item-desc">${escapeHtml(item.description)}</div>
    </div>
    <div class="item-img-wrap">
      ${imgBlock}
      <div class="add-btn-wrap">${addBlock}</div>
    </div>
  </div>`;
}

function attachMenuListeners(container, categories) {
  // Quick add buttons
  container.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { id, name, price } = btn.dataset;
      Cart.addItem(id, name, +price, id);
      flyToCart(btn);
      e.stopPropagation();
    });
  });

  // Customizable item buttons → open customizer
  container.querySelectorAll('.customizable-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = btn.dataset.id;
      const catSlug = btn.dataset.cat;
      const item = _menuItems.find(m => m.id === itemId);
      if (item) openCustomizer(item, catSlug);
      e.stopPropagation();
    });
  });

  // Qty buttons
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.changeQty(btn.dataset.id, +btn.dataset.delta);
    });
  });
}

// ── MENU NAV ──
export function renderMenuNav(categories) {
  const sheet = document.getElementById('menuNavList');
  sheet.innerHTML = categories.map(c => `
    <div class="menu-nav-item" data-cat="${escapeAttribute(c.slug)}">${escapeHtml(c.name)}</div>`).join('');
  sheet.addEventListener('click', e => {
    const item = e.target.closest('.menu-nav-item');
    if (item) {
      closeAllSheets();
      setTimeout(() => {
        const el = document.getElementById(item.dataset.cat);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  });
}

// ── CART BAR ──
export function updateCartBar() {
  const { count, subtotal } = Cart.getCartSummary();
  const bar = document.getElementById('cartBar');
  bar.classList.toggle('hidden', count === 0);
  document.getElementById('cartCount').textContent = `${count} item${count !== 1 ? 's' : ''}`;
  document.getElementById('cartTotal').textContent = formatCurrency(subtotal);

  const headerCount = document.getElementById('headerCartCount');
  if (headerCount) {
    headerCount.textContent = count;
    headerCount.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ── CART SHEET ──
export function renderCartSheet() {
  const summary = Cart.getCartSummary();
  const list = document.getElementById('cartItemsList');

  // Cart items
  let html = '';
  if (summary.items.length === 0) {
    html = `
      <div style="text-align:center;padding:40px 20px;color:var(--sub)">
        <div style="font-size:48px;margin-bottom:12px">🛒</div>
        <div style="font-weight:600;font-size:15px;color:var(--text)">Your cart is empty</div>
        <div style="font-size:12px;margin-top:4px">Add items from the menu to start your order.</div>
      </div>
    `;
  } else {
    html = summary.items.map(([id, item]) => {
      const dbItem = _menuItems.find(m => m.id === item.menu_item_id);
      const dotClass = dbItem && !dbItem.is_veg ? 'nonveg-dot' : 'veg-dot';
      return `
        <div class="cart-item-row">
          <div class="${dotClass}"></div>
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            ${item.notes ? `<div class="cart-item-sub">${escapeHtml(item.notes)}</div>` : ''}
            <div class="cart-item-price">${formatCurrency(item.price)}</div>
          </div>
          <div class="qty-control" style="border-color:var(--brand)">
            <button class="qty-btn" data-id="${escapeAttribute(id)}" data-delta="-1">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-id="${escapeAttribute(id)}" data-delta="1">+</button>
          </div>
        </div>`;
    }).join('');
  }

  // Smart suggestions in cart
  const { pairings, couponNudge } = getSuggestions(_menuItems, _categories);
  if (couponNudge) html += renderCouponNudge(couponNudge);
  if (pairings.length > 0) html += renderSuggestionRow(pairings, 'Complete your order');

  list.innerHTML = html;

  // Attach listeners
  list.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => Cart.changeQty(btn.dataset.id, +btn.dataset.delta));
  });
  list.querySelectorAll('.suggestion-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.addItem(btn.dataset.id, btn.dataset.name, +btn.dataset.price, btn.dataset.id);
      showToast(`${btn.dataset.name} added!`);
    });
  });

  // Bill
  document.getElementById('billSubtotal').textContent = formatCurrency(summary.subtotal);
  document.getElementById('billCgst').textContent = formatCurrency(summary.cgst);
  document.getElementById('billSgst').textContent = formatCurrency(summary.sgst);
  document.getElementById('billTotal').textContent = formatCurrency(summary.total);
  document.getElementById('payBtnTotal').textContent = formatCurrency(summary.total);

  const discRow = document.getElementById('discountRow');
  if (summary.discount > 0) {
    discRow.style.display = 'flex';
    document.getElementById('billDiscount').textContent = `-${formatCurrency(summary.discount)}`;
  } else {
    discRow.style.display = 'none';
  }

  // Toggle visibility of checkout panels based on empty cart state
  const isEmpty = summary.items.length === 0;
  const couponRow = document.getElementById('couponRowBtn');
  const billSection = document.querySelector('.bill-section');
  const payBtn = document.getElementById('payBtn');
  
  if (couponRow) couponRow.style.display = isEmpty ? 'none' : 'flex';
  if (billSection) billSection.style.display = isEmpty ? 'none' : 'block';
  if (payBtn) payBtn.style.display = isEmpty ? 'none' : 'flex';
}

// ── COUPONS PAGE ──
export function renderCoupons(coupons) {
  const container = document.getElementById('couponList');
  container.innerHTML = coupons.map(c => `
    <div style="margin:12px 16px;padding:16px;background:#f9f9f9;border-radius:12px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">🎉 ${escapeHtml(c.code)}</div>
      <div style="font-size:12px;color:var(--sub)">${escapeHtml(c.description)}</div>
      <div class="coupon-tap" data-code="${escapeAttribute(c.code)}" style="font-size:11px;color:var(--brand);margin-top:8px;font-weight:600;cursor:pointer">TAP TO COPY CODE</div>
    </div>`).join('');
  container.addEventListener('click', e => {
    const tap = e.target.closest('.coupon-tap');
    if (tap) document.getElementById('couponInput').value = tap.dataset.code;
  });
}

// ── SEARCH FILTER ──
export function setupSearch(categories, menuItems) {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('.cat-section').forEach(sec => {
      const cards = sec.querySelectorAll('.item-card');
      let anyVisible = false;
      cards.forEach(card => {
        const name = card.querySelector('.item-name')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.item-desc')?.textContent.toLowerCase() || '';
        const match = !q || name.includes(q) || desc.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      });
      const banner = sec.querySelector('.cat-banner-wrap');
      if (banner) banner.style.display = anyVisible ? '' : 'none';
      sec.style.display = anyVisible ? '' : 'none';
    });
  });
}

// ── SHEET HELPERS ──
export function openSheet(id) {
  document.getElementById(id).classList.add('show');
  document.getElementById('overlayBg').classList.add('show');
}
export function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet, .slide-page').forEach(s => s.classList.remove('show'));
  document.getElementById('overlayBg').classList.remove('show');
}
