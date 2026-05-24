import { supabase, isConfigured } from './supabase.js';

function normalizeOrder(order) {
  const orderItems = order.order_items || order.items || [];
  return {
    ...order,
    items: orderItems,
    order_items: undefined
  };
}

export async function fetchAdminData() {
  if (!isConfigured()) {
    return {
      categories: [],
      menuItems: [],
      orders: []
    };
  }

  const [categoriesResult, menuItemsResult, ordersResult] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('menu_items').select('*').order('sort_order'),
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
  ]);

  const error = categoriesResult.error || menuItemsResult.error || ordersResult.error;
  if (error) throw error;

  return {
    categories: categoriesResult.data || [],
    menuItems: menuItemsResult.data || [],
    orders: (ordersResult.data || []).map(normalizeOrder)
  };
}

export async function fetchOrderById(id) {
  if (!isConfigured()) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return normalizeOrder(data);
}

export async function createAdminOrder(orderData) {
  if (!orderData?.items?.length) {
    throw new Error('Cannot create an order without items.');
  }

  if (!isConfigured()) return orderData;

  const { items, id, ...orderFields } = orderData;
  if (id && !String(id).startsWith('pos-')) orderFields.id = id;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderFields)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes || null
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return { ...order, items };
}

export async function updateOrderStatus(id, status) {
  if (!isConfigured()) return { id, status };

  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveMenuItem(item) {
  if (!isConfigured()) return item;

  const payload = {
    name: item.name,
    price: item.price,
    emoji: item.emoji,
    category_id: item.category_id,
    description: item.description,
    is_veg: item.is_veg,
    is_featured: item.is_featured,
    is_customizable: item.is_customizable,
    is_available: item.is_available
  };

  const query = item.id && !String(item.id).startsWith('new-')
    ? supabase.from('menu_items').update(payload).eq('id', item.id).select().single()
    : supabase.from('menu_items').insert(payload).select().single();

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateMenuAvailability(id, isAvailable) {
  if (!isConfigured()) return { id, is_available: isAvailable };

  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStaff() {
  if (!isConfigured()) return [];
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'list' } });
  if (error) throw new Error(error.message || 'Failed to fetch staff');
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function createStaff(payload) {
  if (!isConfigured()) return null;
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'create', payload } });
  if (error) throw new Error(error.message || 'Failed to create staff');
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function updateStaff(payload) {
  if (!isConfigured()) return null;
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'update', payload } });
  if (error) throw new Error(error.message || 'Failed to update staff');
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function deleteStaff(id) {
  if (!isConfigured()) return null;
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'delete', payload: { id } } });
  if (error) throw new Error(error.message || 'Failed to delete staff');
  if (data.error) throw new Error(data.error);
  return data.data;
}

export async function validateCoupon(code, subtotal) {
  if (!isConfigured()) throw new Error('Database not configured');

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !coupon) throw new Error('Invalid coupon code');
  if (!coupon.is_active) throw new Error('This coupon is no longer active');
  if (subtotal < coupon.min_order) throw new Error(`Minimum order amount of ₹${coupon.min_order} required`);

  return coupon;
}
