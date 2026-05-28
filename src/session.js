import { supabase, isConfigured } from './supabase.js';
import { appConfig } from './config.js';

export let currentUser = null;
export let currentTable = appConfig.tableNumber;

export async function initSession() {
  if (!isConfigured()) return null;

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (session) {
    const userAgeMs = Date.now() - new Date(session.user.created_at).getTime();
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    
    if (session.user.is_anonymous && userAgeMs > SIX_HOURS) {
      console.log('Guest session expired (>6 hours). Signing out...');
      await supabase.auth.signOut();
      sessionStorage.clear();
      window.location.reload();
      return null;
    }
  }

  if (!session) {
    // No session exists: create anonymous session
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      console.error('Failed to init session:', authError);
      return null;
    }
    currentUser = authData.user;
    
    // Create new cart row linked to this anonymous user
    await supabase.from('cart_sessions').insert({
      user_id: currentUser.id,
      table_number: currentTable,
      cart_data: {}
    });
  } else {
    // Existing session
    currentUser = session.user;
    
    // Fetch their cart and table number from DB
    const { data: cartData, error: fetchError } = await supabase
      .from('cart_sessions')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
      
    if (cartData) {
      currentTable = cartData.table_number || currentTable;
      return cartData.cart_data;
    } else if (!fetchError || fetchError.code === 'PGRST116') { // not found
      // Session exists in browser, but row in DB was deleted somehow. Re-create it.
      await supabase.from('cart_sessions').insert({
        user_id: currentUser.id,
        table_number: currentTable,
        cart_data: {}
      });
    }
  }
  return {};
}

export async function syncCartToSession(cart) {
  if (!currentUser) return;
  await supabase.from('cart_sessions').update({ cart_data: cart }).eq('user_id', currentUser.id);
}

export async function clearSession() {
  if (currentUser) {
    await supabase.from('cart_sessions').delete().eq('user_id', currentUser.id);
  }
  sessionStorage.removeItem('guestEmail');
  sessionStorage.removeItem('checkoutInitiated');
  await supabase.auth.signOut();
  window.location.reload();
}
