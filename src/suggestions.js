/**
 * BrewSync — Smart Suggestions Engine
 * Three-layer approach: category pairing, coupon nudge, time-based.
 */
import * as Cart from './cart.js';
import { escapeAttribute, escapeHtml, formatCurrency } from './sanitize.js';

// Category pairing rules: if cart has [key], suggest items from [values]
const PAIRING_RULES = {
  'hot-coffee':  ['pastries', 'snacks'],
  'cold-coffee': ['pastries', 'snacks', 'sandwiches'],
  'teas':        ['pastries', 'snacks'],
  'sandwiches':  ['cold-coffee', 'hot-coffee', 'beverages'],
  'pastries':    ['hot-coffee', 'cold-coffee', 'teas'],
  'meals':       ['beverages', 'cold-coffee'],
  'beverages':   ['snacks', 'sandwiches'],
  'snacks':      ['hot-coffee', 'cold-coffee', 'beverages']
};

// Time-based category weighting
function getTimeBoost() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return ['hot-coffee', 'pastries', 'teas'];          // Breakfast
  if (hour >= 11 && hour < 14) return ['sandwiches', 'meals'];                    // Lunch
  if (hour >= 14 && hour < 17) return ['cold-coffee', 'beverages', 'snacks'];     // Afternoon
  if (hour >= 17 && hour < 21) return ['meals', 'snacks', 'hot-coffee'];          // Evening
  return ['hot-coffee', 'cold-coffee'];                                            // Late night
}

/**
 * Get smart suggestions based on current cart contents.
 * @param {Array} menuItems - All available menu items
 * @param {Array} categories - All categories
 * @returns {{ pairings: Array, couponNudge: string|null, trending: Array }}
 */
export function getSuggestions(menuItems, categories) {
  const cart = Cart.getCart();
  const cartItemIds = new Set(Object.keys(cart));
  const cartCategorySlugs = new Set();

  // Find which categories are in cart
  Object.keys(cart).forEach(itemId => {
    const item = menuItems.find(m => m.id === itemId);
    if (item) {
      const cat = categories.find(c => c.id === item.category_id);
      if (cat) cartCategorySlugs.add(cat.slug);
    }
  });

  // 1. CATEGORY PAIRINGS
  const suggestedCategorySlugs = new Set();
  cartCategorySlugs.forEach(slug => {
    (PAIRING_RULES[slug] || []).forEach(s => suggestedCategorySlugs.add(s));
  });

  // If cart is empty, use time-based suggestions
  if (cartCategorySlugs.size === 0) {
    getTimeBoost().forEach(s => suggestedCategorySlugs.add(s));
  }

  // Get items from suggested categories, exclude what's already in cart
  const suggestedCatIds = categories
    .filter(c => suggestedCategorySlugs.has(c.slug))
    .map(c => c.id);

  let pairings = menuItems
    .filter(m => suggestedCatIds.includes(m.category_id) && !cartItemIds.has(m.id))
    .sort((a, b) => {
      // Prioritize featured items and lower prices
      if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1;
      return a.price - b.price;
    })
    .slice(0, 6);

  // Time boost: re-sort to push time-relevant items up
  const timeBoost = getTimeBoost();
  const timeCatIds = categories.filter(c => timeBoost.includes(c.slug)).map(c => c.id);
  pairings.sort((a, b) => {
    const aBoost = timeCatIds.includes(a.category_id) ? -1 : 0;
    const bBoost = timeCatIds.includes(b.category_id) ? -1 : 0;
    return aBoost - bBoost;
  });

  // 2. COUPON NUDGE
  let couponNudge = null;
  const { subtotal } = Cart.getCartSummary();
  if (subtotal > 0 && subtotal < 300) {
    const diff = 300 - subtotal;
    couponNudge = `Add ${formatCurrency(diff)} more to unlock 10% off with BREW10!`;
  } else if (subtotal >= 300 && subtotal < 500) {
    const diff = 500 - subtotal;
    couponNudge = `Add ${formatCurrency(diff)} more for ₹100 off with COMBO100!`;
  }

  // 3. TRENDING (featured + popular items)
  const trending = menuItems
    .filter(m => m.is_featured && !cartItemIds.has(m.id))
    .slice(0, 4);

  return { pairings, couponNudge, trending };
}

/**
 * Render suggestion cards as a horizontal scrollable row.
 */
export function renderSuggestionRow(items, title = 'Pairs well with your order') {
  if (!items || items.length === 0) return '';
  return `
    <div class="suggestion-section">
      <div class="suggestion-title">${title}</div>
      <div class="suggestion-scroll">
        ${items.map(item => `
          <div class="suggestion-card" data-id="${escapeAttribute(item.id)}" data-name="${escapeAttribute(item.name)}" data-price="${escapeAttribute(item.price)}">
            <div class="suggestion-img">
              ${item.image_url 
                ? `<img src="${escapeAttribute(item.image_url)}" alt="${escapeAttribute(item.name)}" loading="lazy"/>`
                : escapeHtml(item.emoji || '🍽️')}
            </div>
            <div class="suggestion-name">${escapeHtml(item.name)}</div>
            <div class="suggestion-price">${formatCurrency(item.price)}</div>
            <button class="suggestion-add-btn" data-id="${escapeAttribute(item.id)}" data-name="${escapeAttribute(item.name)}" data-price="${escapeAttribute(item.price)}">+ ADD</button>
          </div>`).join('')}
      </div>
    </div>`;
}

/**
 * Render coupon nudge banner.
 */
export function renderCouponNudge(message) {
  if (!message) return '';
  return `
    <div class="coupon-nudge">
      <span class="coupon-nudge-icon">💡</span>
      <span class="coupon-nudge-text">${escapeHtml(message)}</span>
    </div>`;
}
