/**
 * BrewSync — Data API
 * Fetches from Supabase when configured, otherwise uses fallback data.
 */
import { supabase, isConfigured } from './supabase.js';
import {
  fallbackBanners, fallbackCategories,
  fallbackMenuItems, fallbackCoupons
} from './fallback-data.js';
import { logError, logInfo } from './logger.js';

// ── BANNERS ──
export async function fetchBanners() {
  if (!isConfigured()) return fallbackBanners;
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) { logError('Banners fetch error:', error); return fallbackBanners; }
  return data?.length ? data : fallbackBanners;
}

// ── CATEGORIES ──
export async function fetchCategories() {
  if (!isConfigured()) return fallbackCategories;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) { logError('Categories fetch error:', error); return fallbackCategories; }
  return data?.length ? data : fallbackCategories;
}

// ── MENU ITEMS ──
export async function fetchMenuItems() {
  if (!isConfigured()) return fallbackMenuItems;
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true)
    .order('sort_order');
  if (error) { logError('Menu items fetch error:', error); return fallbackMenuItems; }
  return data?.length ? data : fallbackMenuItems;
}

// ── COUPONS ──
export async function fetchCoupons() {
  if (!isConfigured()) return fallbackCoupons;
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true);
  if (error) { logError('Coupons fetch error:', error); return fallbackCoupons; }
  return data || [];
}

// ── VALIDATE COUPON ──
export async function validateCoupon(code) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) return null;

  if (!isConfigured()) {
    const coupon = fallbackCoupons.find(c => c.code === normalizedCode && c.is_active);
    return coupon || null;
  }
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data;
}

// ── CREATE ORDER ──
export async function createOrder(orderData) {
  if (!orderData?.items?.length) {
    throw new Error('Cannot create an order without items.');
  }

  if (!isConfigured()) {
    // Simulate order creation
    const fakeId = 'demo-' + Date.now();
    logInfo('Demo order created:', fakeId, orderData);
    return { id: fakeId, ...orderData };
  }

  const { items, ...orderFields } = orderData;

  // Insert order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderFields)
    .select()
    .single();

  if (orderError) {
    logError('Order creation error:', orderError);
    throw orderError;
  }

  // Insert order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes || null
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    logError('Order items error:', itemsError);
    throw itemsError;
  }

  return order;
}

// ── UPDATE ORDER STATUS ──
export async function updateOrderStatus(orderId, status) {
  if (!isConfigured()) {
    logInfo('Demo order updated:', orderId, status);
    return { id: orderId, status };
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) { logError('Order update error:', error); throw error; }
  return data;
}

// ── SUBSCRIBE TO ORDER STATUS (real-time) ──
export function subscribeToOrder(orderId, callback) {
  if (!isConfigured()) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel)
  };
}
