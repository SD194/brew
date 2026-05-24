/**
 * BrewSync — Animations & Micro-interactions
 * Handles fly-to-cart, skeleton loading, ripple effects, scroll reveals.
 */

// ── FLY-TO-CART ANIMATION ──
export function flyToCart(buttonEl) {
  const btn = buttonEl;
  const cartBar = document.getElementById('cartBar');
  const cartSheet = document.getElementById('cartSheet');
  const targetEl = (window.innerWidth >= 1024 && cartSheet) ? cartSheet : cartBar;
  if (!btn || !targetEl) return;

  // Create flying element
  const ghost = document.createElement('div');
  ghost.className = 'fly-ghost';
  ghost.textContent = '+1';

  const btnRect = btn.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  ghost.style.left = `${btnRect.left + btnRect.width / 2}px`;
  ghost.style.top = `${btnRect.top + btnRect.height / 2}px`;

  document.body.appendChild(ghost);

  // Animate with WAAPI
  const dx = targetRect.left + 60 - (btnRect.left + btnRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (btnRect.top + btnRect.height / 2);

  ghost.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.3}px, ${dy * 0.5 - 40}px) scale(1.2)`, opacity: 0.9, offset: 0.4 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 }
  ], {
    duration: 550,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    fill: 'forwards'
  }).onfinish = () => {
    ghost.remove();
    bounceCartBadge();
  };
}

// ── CART BADGE BOUNCE ──
export function bounceCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  badge.classList.remove('bounce');
  void badge.offsetWidth; // force reflow
  badge.classList.add('bounce');
}

// ── BUTTON RIPPLE ──
export function addRipple(e) {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 500);
}

// ── SKELETON LOADING ──
export function showSkeletons() {
  const menuSections = document.getElementById('menuSections');
  const catGrid = document.getElementById('catGrid');
  const bannerTrack = document.getElementById('bannerTrack');

  // Banner skeleton
  bannerTrack.innerHTML = `<div class="skeleton-banner"></div>`;

  // Category grid skeleton
  catGrid.innerHTML = Array(8).fill('').map(() =>
    `<div class="cat-card skeleton-card"><div class="skeleton-pulse"></div></div>`
  ).join('');

  // Menu items skeleton
  menuSections.innerHTML = Array(2).fill('').map(() => `
    <div class="cat-section">
      <div class="skeleton-cat-banner skeleton-pulse"></div>
      ${Array(3).fill('').map(() => `
        <div class="item-card">
          <div class="skeleton-dot skeleton-pulse"></div>
          <div class="item-info">
            <div class="skeleton-text skeleton-pulse" style="width:60%"></div>
            <div class="skeleton-text skeleton-pulse" style="width:30%;margin-top:8px"></div>
            <div class="skeleton-text skeleton-pulse" style="width:80%;margin-top:8px"></div>
          </div>
          <div class="skeleton-img skeleton-pulse"></div>
        </div>`).join('')}
    </div>`).join('');
}

// ── SCROLL REVEAL ──
export function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.item-card, .cat-section').forEach(el => {
    el.classList.add('reveal-target');
    observer.observe(el);
  });
}

// ── ADD BUTTON SUCCESS PULSE ──
export function pulseButton(btn) {
  btn.classList.add('pulse-success');
  setTimeout(() => btn.classList.remove('pulse-success'), 400);
}

// ── TOAST NOTIFICATION ──
let toastTimeout;
export function showToast(message, type = 'success') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast';
    document.body.appendChild(toast);
  }
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `app-toast ${type} show`;
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}
