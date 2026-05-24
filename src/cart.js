/**
 * BrewSync — Cart State Manager
 */

let cart = {};
let appliedCoupon = null;
let listeners = [];

export function getCart() { return cart; }
export function getCoupon() { return appliedCoupon; }

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() { listeners.forEach(fn => fn(cart, appliedCoupon)); }

export function addItem(id, name, price, menuItemId) {
  if (!cart[id]) cart[id] = { name, price, qty: 0, menu_item_id: menuItemId || id };
  cart[id].qty++;
  notify();
}

export function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  notify();
}

export function clearCart() {
  cart = {};
  appliedCoupon = null;
  notify();
}

export function setCoupon(coupon) {
  appliedCoupon = coupon;
  notify();
}

export function removeCoupon() {
  appliedCoupon = null;
  notify();
}

export function getCartSummary() {
  const items = Object.values(cart);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  let discount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.min_order) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round(subtotal * appliedCoupon.value / 100)
      : appliedCoupon.value;
  }

  const taxable = subtotal - discount;
  const cgst = Math.round(taxable * 0.025);
  const sgst = Math.round(taxable * 0.025);
  const total = taxable + cgst + sgst;

  return { count, subtotal, discount, cgst, sgst, total, items: Object.entries(cart) };
}
